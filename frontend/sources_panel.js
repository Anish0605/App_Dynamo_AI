// sources_panel.js — Dynamo AI (Perplexity-style Source Citations)
console.log("sources_panel.js loaded");

/* Inject line-clamp CSS if not present */
(function() {
  const styleId = "dynamo-sources-styles";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = `
      .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      #sources-drawer { will-change: transform; }
    `;
    document.head.appendChild(s);
  }
})();

/* ==================================================
   SOURCES PANEL STATE
================================================== */
let currentSources = [];
let currentQuery = "";

/* ==================================================
   INJECT PANEL INTO DOM (ONCE)
================================================== */
function ensureSourcesPanelExists() {
  if (document.getElementById("sources-panel")) return;

  const panel = document.createElement("div");
  panel.id = "sources-panel";
  panel.innerHTML = `
    <div id="sources-overlay" onclick="window.closeSourcesPanel()"
      class="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] opacity-0 pointer-events-none transition-opacity duration-300">
    </div>
    <div id="sources-drawer"
      class="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[360px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out border-l border-gray-200 dark:border-gray-700">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
            <i data-lucide="globe" class="w-4 h-4 text-black"></i>
          </div>
          <div>
            <div id="sources-count-title" class="text-sm font-bold text-gray-900 dark:text-white">Sources</div>
            <div id="sources-query-preview" class="text-xs text-gray-400 truncate max-w-[220px]"></div>
          </div>
        </div>
        <button onclick="window.closeSourcesPanel()"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Source List -->
      <div id="sources-list" class="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 text-center">
        Sources retrieved via live web search
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  if (window.lucide) window.lucide.createIcons();
}

/* ==================================================
   OPEN PANEL
================================================== */
window.openSourcesPanel = (sources, query = "") => {
  ensureSourcesPanelExists();

  currentSources = sources || [];
  currentQuery = query || "";

  const drawer = document.getElementById("sources-drawer");
  const overlay = document.getElementById("sources-overlay");
  const countTitle = document.getElementById("sources-count-title");
  const queryPreview = document.getElementById("sources-query-preview");
  const list = document.getElementById("sources-list");

  if (!drawer || !overlay || !list) return;

  // Set header
  countTitle.textContent = `${currentSources.length} Sources`;
  queryPreview.textContent = currentQuery.length > 50 ? currentQuery.slice(0, 50) + "…" : currentQuery;

  // Render source cards
  list.innerHTML = "";
  currentSources.forEach((src, index) => {
    const domain = extractDomain(src.url || "");
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : "";
    const displayDomain = domain || "source";

    const card = document.createElement("a");
    card.href = src.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = [
      "flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800",
      "hover:bg-yellow-50 dark:hover:bg-gray-800 hover:border-yellow-200 dark:hover:border-yellow-700",
      "transition-all duration-150 cursor-pointer group no-underline"
    ].join(" ");

    card.innerHTML = `
      <div class="flex-shrink-0 mt-0.5">
        <div class="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
          ${faviconUrl
            ? `<img src="${faviconUrl}" alt="${displayDomain}" class="w-5 h-5 object-contain"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
            : ""}
          <div class="w-full h-full items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 ${faviconUrl ? "hidden" : "flex"}">
            ${displayDomain.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate">${displayDomain}</span>
          <span class="text-[10px] text-gray-300 dark:text-gray-600">•</span>
          <span class="text-[10px] text-gray-300 dark:text-gray-600 font-medium">${index + 1}</span>
        </div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors line-clamp-2">
          ${escapeHtml(src.title || "Untitled Source")}
        </div>
        <div class="text-[12px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
          ${escapeHtml(src.snippet || "")}
        </div>
      </div>
      <div class="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <i data-lucide="external-link" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"></i>
      </div>
    `;

    list.appendChild(card);
  });

  // Slide in
  requestAnimationFrame(() => {
    overlay.classList.remove("opacity-0", "pointer-events-none");
    overlay.classList.add("opacity-100");
    drawer.classList.remove("translate-x-full");
    if (window.lucide) window.lucide.createIcons();
  });
};

/* ==================================================
   CLOSE PANEL
================================================== */
window.closeSourcesPanel = () => {
  const drawer = document.getElementById("sources-drawer");
  const overlay = document.getElementById("sources-overlay");
  if (!drawer || !overlay) return;

  drawer.classList.add("translate-x-full");
  overlay.classList.add("opacity-0", "pointer-events-none");
  overlay.classList.remove("opacity-100");
};

/* ==================================================
   HELPERS
================================================== */
function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ==================================================
   ESC KEY TO CLOSE
================================================== */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.closeSourcesPanel();
});
