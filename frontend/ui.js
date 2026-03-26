// ui.js — Dynamo AI (FINAL, CLEAN, STABLE + EXECUTIVE DECK)
console.log("ui.js loaded");

/* --------------------------------------------------
   GLOBAL UI STATE
-------------------------------------------------- */
window.dynamoUI = {
  model: "gemini-2.0-flash", // Fast Mode
  tools: new Set()
};

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */
const qs = (id) => document.getElementById(id);

/* --------------------------------------------------
   LEFT SIDEBAR DROPDOWNS
-------------------------------------------------- */
window.toggleSidebarMenu = (menuId) => {
  const menu = qs(menuId);
  if (!menu) {
    console.warn("Sidebar menu not found:", menuId);
    return;
  }

  menu.classList.toggle("hidden");

  const arrow = qs(`arrow-${menuId}`);
  if (arrow) arrow.classList.toggle("rotate-180");
};

/* --------------------------------------------------
   TOOLS DROPDOWN (BOTTOM BAR)
-------------------------------------------------- */
window.toggleTools = (e) => {
  e?.stopPropagation();
  qs("tools-dropdown")?.classList.toggle("hidden");
};

document.addEventListener("click", (e) => {
  const dropdown = qs("tools-dropdown");
  const btn = qs("tools-btn");
  if (!dropdown || !btn) return;

  if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});

/* --------------------------------------------------
   MODEL SELECTION
-------------------------------------------------- */
window.selectModel = (modelId, btn) => {
  window.dynamoUI.model = modelId;

  document
    .querySelectorAll("[data-model-btn]")
    .forEach(b => b.classList.remove("active"));

  btn?.classList.add("active");

  console.log("✅ Model selected:", modelId);
};

/* --------------------------------------------------
   TOOL TOGGLE (Search / DeepThink)
-------------------------------------------------- */
window.toggleTool = (tool, btn) => {
  if (window.dynamoUI.tools.has(tool)) {
    window.dynamoUI.tools.delete(tool);
    btn?.classList.remove("active");
  } else {
    window.dynamoUI.tools.add(tool);
    btn?.classList.add("active");
  }

  console.log("🧰 Active tools:", [...window.dynamoUI.tools]);
};

/* --------------------------------------------------
   🌙 DARK MODE
-------------------------------------------------- */
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.theme = theme;

  const icon = qs("theme-icon");
  if (icon) {
    icon.setAttribute(
      "data-lucide",
      theme === "dark" ? "sun" : "moon"
    );
  }

  window.lucide?.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  const saved =
    localStorage.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  applyTheme(saved);

  qs("theme-toggle-btn")?.addEventListener("click", () => {
    applyTheme(
      document.documentElement.classList.contains("dark")
        ? "light"
        : "dark"
    );
  });
});

/* --------------------------------------------------
   SMART ACTIONS
-------------------------------------------------- */
window.smartSummarise = () => {
  const text = window.getLastAssistantMessage?.();
  if (!text) return alert("No AI response yet.");
  window.sendFromInputWithText(`Summarise clearly:\n\n${text}`);
};

window.smartExplain = () => {
  const text = window.getLastAssistantMessage?.();
  if (!text) return alert("No AI response yet.");
  window.sendFromInputWithText(`Explain simply:\n\n${text}`);
};

/* --------------------------------------------------
   📊 CREATE EXECUTIVE DECK (SMART ACTION)
-------------------------------------------------- */
window.createExecutiveDeck = async () => {
  if (!window.chatHistory || window.chatHistory.length === 0) {
    alert("No conversation available to create a deck.");
    return;
  }

  try {
    const payload = {
      title: "Executive Briefing",
      theme: "executive", // light | dark | executive
      messages: window.chatHistory,
      deep_think: window.dynamoUI.tools.has("deep")
    };

    console.log("📊 Creating Executive Deck:", payload);

    const res = await fetch(
      `${window.BACKEND_URL}/generate-ppt-smart`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      throw new Error("Presentation generation failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "DynamoAI_Executive_Deck.pptx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error("❌ Executive Deck Error:", err);
    alert("Failed to create executive deck.");
  }
};
