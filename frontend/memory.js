// memory.js — Dynamo AI (AI Memory UI)
console.log("memory.js loaded");

/* =====================================================
   OPEN MEMORY MODAL
===================================================== */
window.openMemoryModal = async () => {
  const modal = document.getElementById("memory-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  await loadMemories();
};

/* =====================================================
   CLOSE MEMORY MODAL
===================================================== */
window.closeMemoryModal = () => {
  const modal = document.getElementById("memory-modal");
  if (modal) modal.classList.add("hidden");
};

/* =====================================================
   LOAD & RENDER MEMORIES
===================================================== */
async function loadMemories() {
  const container = document.getElementById("memory-list");
  const emptyState = document.getElementById("memory-empty");
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
    const res = await fetch(`/memory?user_id=${userId}`);
    const data = await res.json();
    const memories = data.memories || [];

    container.innerHTML = "";

    if (memories.length === 0) {
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    memories.forEach(mem => {
      const item = buildMemoryItem(mem);
      container.appendChild(item);
    });

  } catch (err) {
    container.innerHTML = `<p class="text-sm text-red-400 text-center py-4">Failed to load memories.</p>`;
  }
}

/* =====================================================
   BUILD SINGLE MEMORY ITEM
===================================================== */
function buildMemoryItem(mem) {
  const CATEGORY_COLORS = {
    personal:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    preference: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    goal:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    fact:       "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  };

  const color = CATEGORY_COLORS[mem.category] || CATEGORY_COLORS.fact;
  const date = mem.created_at ? new Date(mem.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "";

  const item = document.createElement("div");
  item.className = "flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 group";
  item.id = `mem-${mem.id}`;

  item.innerHTML = `
    <div class="mt-0.5 w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
      <i data-lucide="brain" class="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm text-gray-800 dark:text-gray-200 leading-snug">${escapeHtml(mem.content)}</p>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}">${mem.category || "fact"}</span>
        <span class="text-[10px] text-gray-400">${date}</span>
      </div>
    </div>
    <button
      onclick="window.deleteMemory('${mem.id}')"
      class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
      title="Forget this"
    >
      <i data-lucide="x" class="w-3.5 h-3.5 text-red-400"></i>
    </button>
  `;

  if (typeof lucide !== "undefined") {
    lucide.createIcons({ context: item });
  }

  return item;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/* =====================================================
   DELETE ONE MEMORY
===================================================== */
window.deleteMemory = async (memoryId) => {
  try {
    await fetch(`/memory/${memoryId}`, { method: "DELETE" });
    const el = document.getElementById(`mem-${memoryId}`);
    if (el) el.remove();

    // Show empty state if no more items
    const container = document.getElementById("memory-list");
    const emptyState = document.getElementById("memory-empty");
    if (container && container.children.length === 0 && emptyState) {
      emptyState.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Delete memory error:", err);
  }
};

/* =====================================================
   CLEAR ALL MEMORIES
===================================================== */
window.clearAllMemories = async () => {
  const userId = window.appState?.supabaseUserId;
  if (!userId) return;

  if (!confirm("Clear all memories? Dynamo AI will forget everything about you.")) return;

  try {
    await fetch(`/memory?user_id=${userId}`, { method: "DELETE" });
    const container = document.getElementById("memory-list");
    if (container) container.innerHTML = "";
    const emptyState = document.getElementById("memory-empty");
    if (emptyState) emptyState.classList.remove("hidden");
  } catch (err) {
    console.error("Clear memories error:", err);
  }
};

/* =====================================================
   CLOSE ON OUTSIDE CLICK
===================================================== */
let _memoryModalJustOpened = false;

const _origOpen = window.openMemoryModal;
window.openMemoryModal = async (...args) => {
  _memoryModalJustOpened = true;
  setTimeout(() => { _memoryModalJustOpened = false; }, 50);
  return _origOpen(...args);
};

document.addEventListener("click", (e) => {
  if (_memoryModalJustOpened) return;
  const modal = document.getElementById("memory-modal");
  const inner = document.getElementById("memory-modal-inner");
  if (modal && !modal.classList.contains("hidden") && inner && !inner.contains(e.target)) {
    window.closeMemoryModal();
  }
});
