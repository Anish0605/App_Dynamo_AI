// ui.js — Dynamo AI (FINAL, CLEAN, STABLE + EXECUTIVE DECK)
console.log("ui.js loaded");

/* --------------------------------------------------
   GLOBAL UI STATE
-------------------------------------------------- */
window.dynamoUI = {
  model: "gemini-3.1-flash-lite", // Fast Mode
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
   MODEL SELECTION (legacy, kept for backwards compat)
-------------------------------------------------- */
window.selectModel = (modelId, btn) => {
  window.dynamoUI.model = modelId;
  document.querySelectorAll("[data-model-btn]").forEach(b => b.classList.remove("active"));
  btn?.classList.add("active");

  if (modelId === 'research') {
    if (!window.dynamoUI.tools.has('search')) {
      window.dynamoUI.tools.add('search');
      const searchBtn = document.querySelector('[data-tool-btn="search"]');
      searchBtn?.classList.add('active');
    }
  }
  console.log("✅ Model selected:", modelId);
};

/* --------------------------------------------------
   🆕 SET MODE — fast / deep / research (mutually exclusive)
-------------------------------------------------- */
window.setMode = (mode, btn) => {
  // Reset thinking state
  window.dynamoUI.tools.delete('deep');
  window.dynamoUI.model = 'gemini-3.1-flash-lite';

  if (mode === 'deep') {
    window.dynamoUI.tools.add('deep');
  } else if (mode === 'research') {
    window.dynamoUI.model = 'research';
    if (!window.dynamoUI.tools.has('search')) {
      window.dynamoUI.tools.add('search');
      document.querySelector('[data-tool-btn="search"]')?.classList.add('active');
    }
  }

  // Update visual state — only one mode button can be active
  document.querySelectorAll('[data-mode-btn]').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  // Refresh dependent UI (gap-finder badge etc.)
  window.updateGapFinderBtn?.();

  console.log("🎯 Mode set:", mode, "| tools:", [...window.dynamoUI.tools], "| model:", window.dynamoUI.model);
};

/* --------------------------------------------------
   🆕 RUN CREATE — image / video / mindmap / flowchart / quiz
   Prefills the chat input with a properly-worded prompt
   so existing backend keyword routing kicks in.
-------------------------------------------------- */
window.runCreate = (kind) => {
  const input = qs("chat-input");
  if (!input) return;

  const prompts = {
    image:     "Create an image of ",
    video:     "Create a video of ",
    mindmap:   "Create a mindmap of ",
    flowchart: "Create a flowchart for ",
    quiz:      "Quiz me on "
  };

  const prefix = prompts[kind] || "";
  input.value = prefix;
  input.focus();
  input.style.height = "";
  input.style.height = input.scrollHeight + "px";

  // Place caret at end
  input.setSelectionRange(prefix.length, prefix.length);

  // Close dropdown
  qs("tools-dropdown")?.classList.add("hidden");

  console.log("🎨 Create:", kind);
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
  window.updateGapFinderBtn?.();
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
window.smartSummarise = async () => {
  const text = window.getLastAssistantMessage?.();
  if (!text) return alert("No AI response yet.");
  
  // Send directly to backend, avoiding image detection
  const chatInput = document.getElementById("chat-input");
  if (chatInput) chatInput.value = "";
  
  window.renderUserMessage(`Summarise: ${text.slice(0, 100)}...`);
  
  try {
    const payload = {
      message: `Please provide a clear and concise summary of the following text:\n\n${text.slice(0, 3000)}`,
      history: window.chatHistory.slice(-10),
      use_search: false,
      deep_dive: false,
      force_image: false,
      smart_action: true,
      chat_id: window.appState?.chatId,
      user_id: window.appState?.supabaseUserId
    };
    
    const res = await window.callBackend("/chat", payload);
    if (res?.content) window.renderAssistantMessage(res.content);
  } catch (err) {
    console.error("Summarise error:", err);
    window.renderAssistantMessage("Failed to summarise.");
  }
};

window.smartExplain = async () => {
  const text = window.getLastAssistantMessage?.();
  if (!text) return alert("No AI response yet.");
  
  // Send directly to backend, avoiding image detection
  const chatInput = document.getElementById("chat-input");
  if (chatInput) chatInput.value = "";
  
  window.renderUserMessage(`Explain: ${text.slice(0, 100)}...`);
  
  try {
    const payload = {
      message: `Please explain this in simple terms that anyone can understand:\n\n${text.slice(0, 3000)}`,
      history: window.chatHistory.slice(-10),
      use_search: false,
      deep_dive: false,
      force_image: false,
      smart_action: true,
      chat_id: window.appState?.chatId,
      user_id: window.appState?.supabaseUserId
    };
    
    const res = await window.callBackend("/chat", payload);
    if (res?.content) window.renderAssistantMessage(res.content);
  } catch (err) {
    console.error("Explain error:", err);
    window.renderAssistantMessage("Failed to explain.");
  }
};

/* --------------------------------------------------
   📚 STUDY GUIDE FLOW (modal → structured prompt)
-------------------------------------------------- */
window.openStudyGuideModal = () => {
  qs("tools-dropdown")?.classList.add("hidden");
  const modal = qs("study-guide-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  setTimeout(() => qs("study-guide-topic")?.focus(), 50);
  window.lucide?.createIcons();
};

window.closeStudyGuideModal = () => {
  qs("study-guide-modal")?.classList.add("hidden");
};

window.submitStudyGuide = async () => {
  const topicEl = qs("study-guide-topic");
  const skipEl  = qs("study-guide-skip-basics");
  const topic   = (topicEl?.value || "").trim();
  if (!topic) {
    topicEl?.focus();
    return;
  }
  const skipBasics = !!skipEl?.checked;
  window.closeStudyGuideModal();

  // Build a structured study-guide prompt
  const skipLine = skipBasics
    ? "I'm already familiar with the fundamentals. SKIP basic introductions and definitions of common terms — focus on advanced concepts, edge cases, and nuanced applications.\n\n"
    : "";

  const fullPrompt =
`Generate a comprehensive study guide on: ${topic}

${skipLine}Format the response in EXACTLY these four sections, in this order, using the headings shown:

📌 KEY CONCEPTS
List 5 main ideas with a 1-2 sentence explanation each.

📖 DEFINITIONS
Define 5-8 key terms with clear, concise definitions.

💡 EXAMPLES
Provide 3 real-world applications, case studies, or worked examples.

❓ PRACTICE QUESTIONS
Write 5 questions to test understanding. After each question, give the answer indented underneath.

Use clean markdown. Be thorough but concise.`;

  // Reset modal fields
  if (topicEl) topicEl.value = "";
  if (skipEl)  skipEl.checked = false;

  // Show user a clean preview message in chat (NOT the long structured prompt)
  const userLabel = `📚 Study guide: ${topic}${skipBasics ? "  (advanced)" : ""}`;
  window.renderUserMessage?.(userLabel);

  // Send DIRECTLY to backend with smart_action:true to bypass:
  //   • quiz keyword detection (the word "questions" would otherwise trigger quiz)
  //   • image keyword detection
  //   • mindmap/flowchart routing
  // We also enable deep_dive so the new gemini-3-flash-preview kicks in for deeper output.
  window.showThinking?.();
  try {
    const payload = {
      message: fullPrompt,
      history: (window.chatHistory || []).slice(-10),
      use_search: false,
      deep_dive: true,
      force_image: false,
      smart_action: true,
      chat_id: window.appState?.chatId,
      user_id: window.appState?.supabaseUserId
    };
    const res = await window.callBackend("/chat", payload);
    window.hideThinking?.();
    if (res?.content) {
      window.renderAssistantMessage?.(res.content);
    } else {
      window.renderAssistantMessage?.("Sorry, study guide generation failed. Please try again.");
    }
  } catch (err) {
    console.error("📚 Study Guide error:", err);
    window.hideThinking?.();
    window.renderAssistantMessage?.("Sorry, study guide generation failed. Please try again.");
  }
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

/* --------------------------------------------------
   MOBILE SIDEBAR TOGGLE
-------------------------------------------------- */
window.toggleMobileSidebar = (show) => {
  const sidebar = document.getElementById("main-sidebar");
  const overlay = document.getElementById("mobile-overlay");
  
  if (!sidebar || !overlay) return;
  
  if (show) {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0");
    overlay.classList.remove("hidden");
  } else {
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0");
    overlay.classList.add("hidden");
  }
};
