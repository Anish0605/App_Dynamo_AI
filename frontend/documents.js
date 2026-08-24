// documents.js — Dynamo AI Persistent Document Library

/* =====================================================
   OPEN / CLOSE
===================================================== */
window.openDocumentsModal = async () => {
  const modal = document.getElementById("documents-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  await loadDocuments();
};

window.closeDocumentsModal = () => {
  const modal = document.getElementById("documents-modal");
  if (modal) modal.classList.add("hidden");
};

/* =====================================================
   LOAD & RENDER
===================================================== */
async function loadDocuments() {
  const container = document.getElementById("doc-list");
  const emptyState = document.getElementById("doc-empty");
  const userId = window.appState?.supabaseUserId;

  if (!container) return;

  if (!userId) {
    container.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-center py-8">
      <div class="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  `;
  if (emptyState) emptyState.classList.add("hidden");

  try {
    const res = await window.backendFetch(`/documents?user_id=${userId}`);
    const data = await res.json();
    const docs = data.documents || [];

    container.innerHTML = "";
    updateDocCount(docs.length);

    if (docs.length === 0) {
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    docs.forEach(doc => container.appendChild(buildDocItem(doc)));
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-red-400 text-center py-4">Failed to load documents.</p>`;
  }
}

/* =====================================================
   BUILD A SINGLE DOC CARD
===================================================== */
function buildDocItem(doc) {
  const date = doc.upload_date
    ? new Date(doc.upload_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const size = doc.file_size_kb ? `${doc.file_size_kb} KB` : "";
  const ext = (doc.filename || "").split(".").pop().toUpperCase();

  const extColors = { PDF: "bg-red-100 text-red-700", DOCX: "bg-blue-100 text-blue-700", TXT: "bg-gray-100 text-gray-600" };
  const extColor = extColors[ext] || "bg-gray-100 text-gray-600";

  const item = document.createElement("div");
  item.id = `doc-${doc.id}`;
  item.className = "flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 group";
  item.innerHTML = `
    <div class="mt-0.5 w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center shrink-0">
      <i data-lucide="file-text" class="w-4 h-4 text-yellow-600 dark:text-yellow-400"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">${escapeHtml(doc.filename || "Untitled")}</p>
      ${doc.summary ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">${escapeHtml(doc.summary)}</p>` : ""}
      ${doc.topics ? `<p class="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">${escapeHtml(doc.topics)}</p>` : ""}
      <div class="flex items-center gap-2 mt-1.5">
        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${extColor}">${ext}</span>
        ${size ? `<span class="text-[10px] text-gray-400">${size}</span>` : ""}
        <span class="text-[10px] text-gray-400">${date}</span>
      </div>
    </div>
    <button
      onclick="window.deleteDocument('${doc.id}')"
      class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 mt-0.5"
      title="Remove from library"
    >
      <i data-lucide="trash-2" class="w-3.5 h-3.5 text-red-400"></i>
    </button>
  `;
  return item;
}

/* =====================================================
   DELETE A DOCUMENT
===================================================== */
window.deleteDocument = async (docId) => {
  const userId = window.appState?.supabaseUserId;
  if (!userId || !docId) return;
  if (!confirm("Remove this document from your library? The AI will no longer remember it.")) return;

  try {
    const res = await window.backendFetch(`/documents/${docId}?user_id=${userId}`, { method: "DELETE" });
    if (res.ok) {
      document.getElementById(`doc-${docId}`)?.remove();
      const remaining = document.querySelectorAll("[id^='doc-']").length;
      updateDocCount(remaining);
      if (remaining === 0) {
        document.getElementById("doc-empty")?.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Delete document error:", err);
  }
};

/* =====================================================
   SAVE CURRENT DOCUMENT  (called from "Remember this" button)
===================================================== */
window.saveCurrentDocument = async (file) => {
  const userId = window.appState?.supabaseUserId;
  if (!userId) {
    alert("Please log in to save documents to your library.");
    return;
  }
  if (!file) {
    alert("No document to save.");
    return;
  }

  const btn = document.getElementById("remember-doc-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin w-3 h-3 mr-1 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Saving…`;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const res = await window.backendFetch("/save-document", { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      if (btn) {
        btn.innerHTML = `✅ Saved to library`;
        btn.style.background = "#22c55e";
        btn.style.color = "white";
        btn.disabled = true;
      }
      updateDocCount((window._docCount || 0) + 1);
    } else {
      if (btn) { btn.disabled = false; btn.innerHTML = `💾 Remember this document`; }
      alert(data.error || "Failed to save document.");
    }
  } catch (err) {
    console.error("Save document error:", err);
    if (btn) { btn.disabled = false; btn.innerHTML = `💾 Remember this document`; }
  }
};

/* =====================================================
   COUNT BADGE
===================================================== */
window._docCount = 0;

function updateDocCount(count) {
  window._docCount = count;
  const badge = document.getElementById("doc-count-badge");
  if (badge) {
    badge.textContent = count > 0 ? count : "";
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }
}

window.refreshDocCount = async () => {
  const userId = window.appState?.supabaseUserId;
  if (!userId) return;
  try {
    const res = await window.backendFetch(`/documents?user_id=${userId}`);
    const data = await res.json();
    updateDocCount((data.documents || []).length);
  } catch (_) {}
};

/* =====================================================
   LIBRARY UPLOAD (from modal footer "Add document")
===================================================== */
window._handleLibraryUpload = async (input) => {
  const file = input?.files?.[0];
  if (!file) return;

  const label = document.querySelector("label[for='library-file-input']");
  const originalLabel = label ? label.innerHTML : "";
  if (label) {
    label.innerHTML = `<svg class="animate-spin w-3 h-3 mr-1.5 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Saving…`;
  }

  const userId = window.appState?.supabaseUserId;
  if (!userId) {
    alert("Please log in to save documents.");
    if (label) label.innerHTML = originalLabel;
    input.value = "";
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const res = await window.backendFetch("/save-document", { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      if (label) {
        label.innerHTML = `✅ Saved!`;
        setTimeout(() => { label.innerHTML = originalLabel; }, 2000);
      }
      input.value = "";
      await loadDocuments();
    } else {
      if (label) label.innerHTML = originalLabel;
      input.value = "";
      alert(data.error || "Failed to save document.");
    }
  } catch (err) {
    console.error("Library upload error:", err);
    if (label) label.innerHTML = originalLabel;
    input.value = "";
  }
};

/* =====================================================
   HELPERS
===================================================== */
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
