// analysis_ui.js — Dynamo AI (CHATGPT-STYLE FILE UPLOAD + RADIO MODE AWARE)
console.log("analysis_ui.js loaded");

let lastAnalysisData = null;
let lastAnalyzedFile = null;

// Store pending file for ChatGPT-style UX (upload → type → send)
window.pendingUploadFile = null;

// ===== RADIO MODE CHECK =====
function isRadioModeActive() {
  return window.dynamoUI && window.dynamoUI.tools && window.dynamoUI.tools.has('radio');
}

// Initialize file input handler immediately (not in DOMContentLoaded)
const fileInput = document.getElementById("analyze-file-input");
if (fileInput) {
  window.openAnalyzeFile = () => {
    fileInput.value = "";
    fileInput.click();
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    // Store file for later send (ChatGPT style)
    window.pendingUploadFile = file;
    
    // Check radio mode status
    const radioModeActive = isRadioModeActive();
    console.log("📎 File ready:", file.name, "| Radio mode:", radioModeActive);
    console.log("🔍 Debug - dynamoUI.tools:", [...(window.dynamoUI?.tools || [])]);
    
    // If radio mode is active, show chip and AUTO-SEND initial prompt
    if (radioModeActive) {
      console.log("🎧 Radio mode active - initiating dialogue with file");
      showUploadChip(file.name, true); // true = radio mode
      
      // Auto-trigger the initial question prompt after a short delay
      setTimeout(async () => {
        console.log("🎙️ Triggering radio mode interview for:", file.name);
        if (window.triggerRadioModeInterview) {
          await window.triggerRadioModeInterview(file.name);
        } else {
          console.error("❌ triggerRadioModeInterview function not found!");
        }
      }, 500);
    } else {
      // Normal mode: show chip and optional analysis buttons
      showUploadChip(file.name, false);
    }
  });
} else {
  console.warn("analyze-file-input element not found");
}

// Show file attachment chip
function showUploadChip(filename, isRadioMode = false) {
  let chipContainer = document.getElementById("file-chip-container");
  
  if (!chipContainer) {
    const inputArea = document.querySelector('[class*="input"]');
    chipContainer = document.createElement("div");
    chipContainer.id = "file-chip-container";
    chipContainer.className = "flex flex-wrap gap-2 mb-2 px-4";
    // Insert before the main input row
    const mainInput = document.querySelector('[class*="border-2"][class*="border-yellow"]');
    if (mainInput?.parentElement) {
      mainInput.parentElement.insertBefore(chipContainer, mainInput);
    }
  }
  
  // Clear old chips
  chipContainer.innerHTML = "";
  
  // Create chip
  const chip = document.createElement("div");
  chip.className = "flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm text-gray-700 dark:text-gray-300 border border-blue-300 dark:border-blue-700";
  chip.innerHTML = `
    <i data-lucide="paperclip" class="w-4 h-4"></i>
    <span>${filename}</span>
    <button onclick="window.clearUploadFile()" class="ml-1 hover:text-red-500">
      <i data-lucide="x" class="w-3 h-3"></i>
    </button>
  `;
  
  chipContainer.appendChild(chip);
  
  // Only show analysis suggestions if NOT in radio mode
  if (!isRadioMode) {
    const suggestionDiv = document.createElement("div");
    suggestionDiv.className = "flex flex-wrap gap-2 mb-2 px-4";
    suggestionDiv.innerHTML = `
      <button onclick="window.suggestAnalyzeFile('${filename}')" class="px-3 py-1.5 bg-yellow-300 dark:bg-yellow-600 text-gray-900 dark:text-white rounded-full text-sm font-medium hover:bg-yellow-400 dark:hover:bg-yellow-500 transition">
        📊 Analysis my resume
      </button>
    `;
    chipContainer.parentElement?.insertBefore(suggestionDiv, chipContainer.nextSibling);
  }
  
  lucide.createIcons();
}

// Clear uploaded file
window.clearUploadFile = () => {
  window.pendingUploadFile = null;
  const chipContainer = document.getElementById("file-chip-container");
  if (chipContainer) chipContainer.innerHTML = "";
  console.log("📎 File cleared");
};

/* --------------------------------------------------
   ANALYSIS RENDER
-------------------------------------------------- */
function renderAnalysis(data) {
  if (!data || !data.type) return;

  if (data.type === "text") {
    window.renderAssistantMessage?.(
      `<div class="whitespace-pre-wrap">${marked.parse(data.content || "")}</div>`,
      data.content
    );
  }
}
