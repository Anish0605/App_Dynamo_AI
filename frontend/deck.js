/* ================================================================
   deck.js — Research Deck Generator
   Flow: Input → AI plans outline → User reviews → Generate PPTX
   ================================================================ */

// ----------------------------------------------------------------
// STATE
// ----------------------------------------------------------------
window._deckOutline = null;   // Stores the planned outline from AI

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
  window._deckOutline = null;
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
  const topic    = document.getElementById("deck-topic")?.value?.trim();
  const style    = document.getElementById("deck-style")?.value || "academic";
  const length   = document.getElementById("deck-length")?.value || "standard";
  const audience = document.getElementById("deck-audience")?.value || "Research peers";

  if (!topic) {
    document.getElementById("deck-topic")?.focus();
    return;
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
    const res = await fetch(`${window.BACKEND_URL}/deck/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, style, length, audience, source_text: "" })
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
    const desc = _deckSlideDesc(slide);
    return `
      <div class="deck-outline-row" data-index="${i}" style="
        display:flex;align-items:flex-start;gap:10px;
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
            <span style="font-size:12px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;">${slide.heading || ""}</span>
          </div>
          <p style="font-size:11px;color:#6b7280;margin:0;line-height:1.5;">${desc}</p>
        </div>
      </div>`;
  }).join("");
}

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
    const res = await fetch(`${window.BACKEND_URL}/deck/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(window._deckOutline)
    });

    if (!res.ok) throw new Error("Generate failed");
    const blob = await res.blob();

    // Trigger download
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    const safeTitle = (window._deckOutline.title || "DynamoAI_Deck")
      .replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    a.download = `${safeTitle}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success step
    const infoEl = document.getElementById("deck-done-info");
    if (infoEl) {
      infoEl.textContent =
        `${(window._deckOutline.slides || []).length} slides · ${window._deckOutline.style || "academic"} style`;
    }
    _deckShowStep(3);

  } catch (err) {
    console.error("Deck generate error:", err);
    btn.disabled  = false;
    btn.innerHTML = orig;
    alert("Could not generate the deck. Please try again.");
  }
};

// ----------------------------------------------------------------
// BACK BUTTON
// ----------------------------------------------------------------
window.deckGoBack = function () {
  _deckShowStep(1);
};
