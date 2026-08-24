/* ================================================================
   deck.js — Research Deck Generator
   Flow: Input → AI plans outline → User reviews → Generate PPTX
   ================================================================ */

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
window._deckOutline      = null;   // Stores the planned outline from AI
window._deckSourceMode   = "text"; // "text" | "file"
window._deckExtractedText = "";    // Text extracted from uploaded file
window._deckFileTitle     = "";    // Filename used as fallback topic
window._deckBlobUrl      = null;   // Object URL for generated PPTX

// ----------------------------------------------------------------
// STYLE RADIO CARD WIRING (runs after DOM ready)
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".deck-style-option");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      // Update visual state
      cards.forEach(c => c.classList.remove("ds-selected"));
      card.classList.add("ds-selected");

      // Sync hidden select so planDeck() can read it
      const val = card.dataset.val;
      const sel = document.getElementById("deck-style");
      if (sel) sel.value = val;

      // Also tick the radio
      const radio = card.querySelector("input[type=radio]");
      if (radio) radio.checked = true;
    });
  });

  // Mark default selected
  const defaultCard = document.querySelector('.deck-style-option[data-val="academic"]');
  if (defaultCard) defaultCard.classList.add("ds-selected");
});

// ----------------------------------------------------------------
// OPEN / CLOSE
// ----------------------------------------------------------------
window.openDeckModal = function () {
  if (!window.requirePaidAccess?.()) return;
  const modal = document.getElementById("deck-modal");
  if (!modal) return;
  _deckShowStep(1);
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

window.closeDeckModal = function () {
  const modal = document.getElementById("deck-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  window._deckOutline       = null;
  window._deckExtractedText = "";
  window._deckFileTitle     = "";
  if (window._deckBlobUrl) { URL.revokeObjectURL(window._deckBlobUrl); window._deckBlobUrl = null; }
  // Reset file input
  const fi = document.getElementById("deck-file-input");
  if (fi) fi.value = "";
  const status = document.getElementById("deck-file-status");
  if (status) { status.textContent = ""; status.classList.add("hidden"); }
  const nameLbl = document.getElementById("deck-file-name");
  if (nameLbl) nameLbl.textContent = "Drop file here or click to browse";
};

// ----------------------------------------------------------------
// SOURCE TOGGLE (text ↔ file upload)
// ----------------------------------------------------------------
window.deckSwitchSource = function (mode) {
  window._deckSourceMode = mode;

  const textPanel = document.getElementById("deck-src-text-panel");
  const filePanel = document.getElementById("deck-src-file-panel");
  const textBtn   = document.getElementById("deck-src-text-btn");
  const fileBtn   = document.getElementById("deck-src-file-btn");

  const activeClass   = ["bg-white", "dark:bg-gray-700", "shadow", "text-gray-900", "dark:text-white"];
  const inactiveClass = ["text-gray-500"];

  if (mode === "text") {
    textPanel?.classList.remove("hidden");
    filePanel?.classList.add("hidden");
    textBtn?.classList.add(...activeClass);
    textBtn?.classList.remove(...inactiveClass);
    fileBtn?.classList.remove(...activeClass);
    fileBtn?.classList.add(...inactiveClass);
  } else {
    textPanel?.classList.add("hidden");
    filePanel?.classList.remove("hidden");
    fileBtn?.classList.add(...activeClass);
    fileBtn?.classList.remove(...inactiveClass);
    textBtn?.classList.remove(...activeClass);
    textBtn?.classList.add(...inactiveClass);
  }
};

// ----------------------------------------------------------------
// FILE SELECTION + EXTRACTION
// ----------------------------------------------------------------
window.deckFileSelected = async function (input) {
  const file = input.files?.[0];
  if (!file) return;

  const nameLbl  = document.getElementById("deck-file-name");
  const status   = document.getElementById("deck-file-status");
  const dropZone = document.getElementById("deck-drop-zone");

  if (nameLbl) nameLbl.textContent = file.name;
  if (status) {
    status.textContent = "Extracting text…";
    status.className = "mt-2 text-[11px] rounded-lg px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-semibold";
    status.classList.remove("hidden");
  }
  if (dropZone) dropZone.classList.add("border-yellow-400");

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", window.appState?.supabaseUserId || "");

    const res = await window.backendFetch(`${window.BACKEND_URL}/deck/extract`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Extraction failed");
    const data = await res.json();

    window._deckExtractedText = data.text || "";
    window._deckFileTitle     = file.name.replace(/\.[^.]+$/, ""); // strip extension

    if (status) {
      status.textContent = `✓ Text extracted — ${Math.round(window._deckExtractedText.length / 5)} words ready`;
      status.className = "mt-2 text-[11px] rounded-lg px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold";
    }
    if (dropZone) dropZone.classList.replace("border-yellow-400", "border-green-400");

  } catch (err) {
    console.error("File extraction error:", err);
    window._deckExtractedText = "";
    if (status) {
      status.textContent = "Could not extract text. Try a different file.";
      status.className = "mt-2 text-[11px] rounded-lg px-3 py-2 bg-red-50 text-red-600 font-semibold";
    }
  }
};

function _deckShowStep(n) {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`deck-step-${i}`);
    if (el) el.classList.toggle("hidden", i !== n);
  });
}

// ----------------------------------------------------------------
// STEP 1 → STEP 2: Plan the deck
// ----------------------------------------------------------------
window.planDeck = async function () {
  const style    = document.getElementById("deck-style")?.value || "academic";
  const length   = document.getElementById("deck-length")?.value || "standard";
  const audience = document.getElementById("deck-audience")?.value || "Research peers";

  // Determine topic and source_text based on mode
  let topic       = "";
  let source_text = "";

  if (window._deckSourceMode === "file") {
    if (!window._deckExtractedText) {
      const status = document.getElementById("deck-file-status");
      if (status) {
        status.textContent = "Please upload a file first.";
        status.className = "mt-2 text-[11px] rounded-lg px-3 py-2 bg-red-50 text-red-600 font-semibold";
        status.classList.remove("hidden");
      }
      return;
    }
    topic       = window._deckFileTitle || "Research Paper";
    source_text = window._deckExtractedText;
  } else {
    topic = document.getElementById("deck-topic")?.value?.trim();
    if (!topic) {
      document.getElementById("deck-topic")?.focus();
      return;
    }
  }

  // Show loading state
  const btn = document.getElementById("deck-plan-btn");
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<svg class="animate-spin w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg> Planning your deck…`;

  try {
    const res = await window.backendFetch(`${window.BACKEND_URL}/deck/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        style,
        length,
        audience,
        source_text,
        user_id: window.appState?.supabaseUserId || ""
      })
    });

    if (!res.ok) throw new Error("Plan failed");
    const outline = await res.json();
    window._deckOutline = outline;

    _deckRenderOutline(outline);
    _deckShowStep(2);

  } catch (err) {
    console.error("Deck plan error:", err);
    btn.disabled  = false;
    btn.innerHTML = orig;
    alert("Could not plan the deck. Please try again.");
  }
};

// ----------------------------------------------------------------
// RENDER OUTLINE (Step 2)
// ----------------------------------------------------------------

const TYPE_BADGES = {
  title:      { bg: "#e2e8f0", text: "#334155", label: "Title" },
  thesis:     { bg: "#dbeafe", text: "#1d4ed8", label: "Thesis" },
  background: { bg: "#f3e8ff", text: "#7e22ce", label: "Background" },
  evidence:   { bg: "#dcfce7", text: "#15803d", label: "Evidence" },
  chart:      { bg: "#ffedd5", text: "#c2410c", label: "Chart" },
  comparison: { bg: "#fce7f3", text: "#be185d", label: "Comparison" },
  quote:      { bg: "#fef9c3", text: "#854d0e", label: "Quote" },
  conclusion: { bg: "#1e293b", text: "#ffffff", label: "Conclusion" },
};

function _deckBadge(type) {
  const t = TYPE_BADGES[type] || { bg: "#f1f5f9", text: "#475569", label: type };
  return `<span style="background:${t.bg};color:${t.text};font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">${t.label}</span>`;
}

function _deckRenderOutline(outline) {
  const title = document.getElementById("deck-outline-title");
  if (title) title.textContent = outline.title || "Untitled Deck";

  const count = document.getElementById("deck-outline-count");
  if (count) count.textContent = `${(outline.slides || []).length} slides · ${outline.style || "academic"} style`;

  const list  = document.getElementById("deck-outline-list");
  if (!list)  return;

  list.innerHTML = (outline.slides || []).map((slide, i) => {
    const desc       = _deckSlideDesc(slide);
    const isTitle    = slide.type === "title";
    const actionBtns = isTitle ? "" : `
      <div style="display:flex;gap:3px;flex-shrink:0;align-self:center;">
        <button onclick="window.deckEditSlide(${i})" title="Edit heading"
          style="font-size:13px;padding:4px 7px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#9ca3af;line-height:1;transition:all .1s;"
          onmouseover="this.style.background='#f9fafb';this.style.borderColor='#d1d5db';this.style.color='#374151'"
          onmouseout="this.style.background='#fff';this.style.borderColor='#e5e7eb';this.style.color='#9ca3af'">✏️</button>
        <button onclick="window.deckDeleteSlide(${i})" title="Remove slide"
          style="font-size:13px;padding:4px 7px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#9ca3af;line-height:1;transition:all .1s;"
          onmouseover="this.style.background='#fef2f2';this.style.borderColor='#fecaca';this.style.color='#ef4444'"
          onmouseout="this.style.background='#fff';this.style.borderColor='#e5e7eb';this.style.color='#9ca3af'">✕</button>
      </div>`;

    return `
      <div class="deck-outline-row" data-index="${i}"
        style="display:flex;align-items:flex-start;gap:10px;
          background:#fff;border:1px solid #e5e7eb;border-radius:12px;
          padding:12px 14px;transition:border-color .15s;">
        <div style="width:24px;height:24px;border-radius:8px;background:#f3f4f6;
          color:#6b7280;font-size:11px;font-weight:700;display:flex;
          align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
          ${i + 1}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
            ${_deckBadge(slide.type)}
            <span class="deck-slide-heading" data-index="${i}" style="font-size:12px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;">${slide.heading || ""}</span>
          </div>
          <p style="font-size:11px;color:#6b7280;margin:0;line-height:1.5;">${desc}</p>
        </div>
        ${actionBtns}
      </div>`;
  }).join("");
}

// ----------------------------------------------------------------
// SLIDE EDIT / DELETE (Step 2 actions)
// ----------------------------------------------------------------
window.deckDeleteSlide = function (i) {
  if (!window._deckOutline?.slides) return;
  if (window._deckOutline.slides.length <= 1) return; // keep at least 1
  window._deckOutline.slides.splice(i, 1);
  _deckRenderOutline(window._deckOutline);
};

window.deckEditSlide = function (i) {
  const row = document.querySelector(`.deck-outline-row[data-index="${i}"]`);
  if (!row) return;
  const headingEl = row.querySelector('.deck-slide-heading');
  if (!headingEl) return;

  const original = window._deckOutline.slides[i].heading || "";
  const input    = document.createElement("input");
  input.type     = "text";
  input.value    = original;
  input.style.cssText = "font-size:12px;font-weight:600;color:#111827;border:1.5px solid #facc15;border-radius:6px;padding:2px 8px;width:100%;background:#fefce8;outline:none;max-width:260px;";

  headingEl.replaceWith(input);
  input.focus();
  input.select();

  const save = () => {
    const newText = input.value.trim() || original;
    window._deckOutline.slides[i].heading = newText;
    const span = document.createElement("span");
    span.className     = "deck-slide-heading";
    span.dataset.index = i;
    span.style.cssText = "font-size:12px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;";
    span.textContent   = newText;
    input.replaceWith(span);
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = original; input.blur(); }
  });
};

function _deckSlideDesc(slide) {
  if (slide.type === "title")      return slide.subheading || "Opening title slide";
  if (slide.type === "thesis")     return slide.thesis ? slide.thesis.slice(0, 120) + "…" : "Central research claim";
  if (slide.type === "evidence")   return (slide.bullets || []).slice(0, 2).join(" · ") + (slide.citation ? ` — ${slide.citation.slice(0, 60)}` : "");
  if (slide.type === "chart")      return `Chart: ${(slide.chart?.labels || []).join(", ")}`;
  if (slide.type === "comparison") return `${slide.left?.label || "Option A"} vs ${slide.right?.label || "Option B"}`;
  if (slide.type === "quote")      return slide.quote ? `"${slide.quote.slice(0, 100)}…"` : "Expert quote";
  return (slide.bullets || []).slice(0, 2).join(" · ") || "Slide content";
}

// ----------------------------------------------------------------
// STEP 2 → STEP 3: Generate PPTX
// ----------------------------------------------------------------
window.generateDeck = async function () {
  if (!window._deckOutline) return;

  const btn  = document.getElementById("deck-generate-btn");
  const orig = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = `<svg class="animate-spin w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg> Building your deck…`;

  try {
    const res = await window.backendFetch(`${window.BACKEND_URL}/deck/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...window._deckOutline,
        user_id: window.appState?.supabaseUserId || ""
      })
    });

    if (!res.ok) throw new Error("Generate failed");
    const blob = await res.blob();

    // Store blob URL — actual download triggered by button in step 3
    if (window._deckBlobUrl) URL.revokeObjectURL(window._deckBlobUrl);
    window._deckBlobUrl = URL.createObjectURL(blob);

    const slideCount = (window._deckOutline.slides || []).length;
    const style      = window._deckOutline.style || "academic";

    // Populate step 3 done screen
    const titleEl = document.getElementById("deck-done-title");
    if (titleEl) titleEl.textContent = window._deckOutline.title || "Your Deck";

    const badgesEl = document.getElementById("deck-done-badges");
    if (badgesEl) badgesEl.innerHTML = `
      <span style="background:#f0fdf4;color:#15803d;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid #bbf7d0;">${slideCount} slides</span>
      <span style="background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid #bfdbfe;">${style.charAt(0).toUpperCase()+style.slice(1)} style</span>
      <span style="background:#faf5ff;color:#7e22ce;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid #e9d5ff;">PPTX ready</span>`;

    _deckShowStep(3);

  } catch (err) {
    console.error("Deck generate error:", err);
    btn.disabled  = false;
    btn.innerHTML = orig;
    alert("Could not generate the deck. Please try again.");
  }
};

// ----------------------------------------------------------------
// STEP 3: Download PPTX (called by button)
// ----------------------------------------------------------------
window.deckDownloadPptx = function () {
  if (!window._deckBlobUrl) return;
  const safeTitle = (window._deckOutline?.title || "DynamoAI_Deck")
    .replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  const a    = document.createElement("a");
  a.href     = window._deckBlobUrl;
  a.download = `${safeTitle}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ----------------------------------------------------------------
// BACK BUTTON
// ----------------------------------------------------------------
window.deckGoBack = function () {
  _deckShowStep(1);
};
