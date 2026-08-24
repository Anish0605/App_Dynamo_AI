// paper_download.js — Dynamo AI
// Small slide-in tab on the right edge of the screen offering a "Download .docx"
// action once Research Mode's "Write a Paper" has finished generating a paper.
// Kept separate from sources_panel.js so it doesn't interfere with source browsing.

(function () {
  const styleId = "dynamo-paper-download-styles";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = `
      #paper-download-tab {
        position: fixed;
        top: 96px;
        right: 0;
        z-index: 45;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-right: none;
        border-radius: 14px 0 0 14px;
        box-shadow: 0 8px 24px rgba(0,0,0,.12);
        padding: 14px 16px 14px 18px;
        max-width: 230px;
        transform: translateX(105%);
        transition: transform .35s ease;
      }
      #paper-download-tab.open { transform: translateX(0); }
      #paper-download-tab .pdt-title {
        font-size: 12.5px; font-weight: 800; color: #111827; margin: 0 0 4px 0;
        display: flex; align-items: center; gap: 6px;
      }
      #paper-download-tab .pdt-sub {
        font-size: 11px; color: #6b7280; margin: 0 0 10px 0; line-height: 1.4;
      }
      #paper-download-tab .pdt-btn {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        width: 100%; padding: 8px 10px; border-radius: 9px; border: none;
        background: #facc15; color: #111827; font-size: 12.5px; font-weight: 800;
        cursor: pointer;
      }
      #paper-download-tab .pdt-btn:disabled { opacity: .6; cursor: default; }
      #paper-download-tab .pdt-close {
        position: absolute; top: 6px; right: 8px; background: none; border: none;
        color: #9ca3af; font-size: 13px; cursor: pointer; line-height: 1;
      }
      @media (max-width: 640px) {
        #paper-download-tab { top: auto; bottom: 84px; right: 10px; border-radius: 14px; border-right: 1px solid #e5e7eb; }
      }
    `;
    document.head.appendChild(s);
  }

  function ensurePanel() {
    if (document.getElementById("paper-download-tab")) return;
    const el = document.createElement("div");
    el.id = "paper-download-tab";
    el.innerHTML = `
      <button class="pdt-close" onclick="window.closePaperDownloadTab()">✕</button>
      <div class="pdt-title">📄 Paper ready</div>
      <div class="pdt-sub">Download as an editable Word document to keep working on it locally.</div>
      <button id="paper-download-btn" class="pdt-btn">⬇ Download .docx</button>
    `;
    document.body.appendChild(el);
    document.getElementById("paper-download-btn").addEventListener("click", () => window._downloadPaperDocx());
  }

  let _pendingText = "";
  let _pendingTitle = "Research Paper";

  window.showPaperDownloadTab = function (text, title) {
    ensurePanel();
    _pendingText = text || "";
    _pendingTitle = title || "Research Paper";
    const el = document.getElementById("paper-download-tab");
    requestAnimationFrame(() => el.classList.add("open"));
  };

  window.closePaperDownloadTab = function () {
    const el = document.getElementById("paper-download-tab");
    if (el) el.classList.remove("open");
  };

  window._downloadPaperDocx = async function () {
    const btn = document.getElementById("paper-download-btn");
    if (!_pendingText.trim()) return;

    if (btn) { btn.disabled = true; btn.textContent = "⏳ Preparing…"; }
    try {
      const res = await window.backendFetch(`${window.BACKEND_URL || ""}/export-paper-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: _pendingText,
          title: _pendingTitle,
          user_id: window.appState?.supabaseUserId || ""
        }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const safeName = (_pendingTitle || "Research_Paper").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "Research_Paper";

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Paper Download]", err);
      alert("Download failed. Please try again.");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "⬇ Download .docx"; }
    }
  };
})();
