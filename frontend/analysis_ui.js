// analysis_ui.js — Dynamo AI (CHATGPT-STYLE FILE UPLOAD + RADIO MODE AWARE)

let lastAnalysisData = null;
let lastAnalyzedFile = null;

// Store pending files for ChatGPT-style UX (upload → type → send).
// pendingUploadFile remains for the existing single-file/radio integrations.
window.pendingUploadFile = null;
window.pendingUploadFiles = [];

window.FILE_UPLOAD_LIMITS = Object.freeze({
  maxFiles: 5,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024
});

function canUseMultipleFileUpload() {
  const user = window.appState?.supabaseUser;
  const plan = (user?.plan || "free").toLowerCase();
  // access_allowed on a Free account is reserved for the approved demo path.
  // The backend remains the final authority for this entitlement.
  return ["plus", "plus_trial", "pro", "pro_trial", "pro_validation"].includes(plan)
    || (plan === "free" && user?.access_allowed === true);
}

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

  fileInput.multiple = true;
  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;

    if (files.length > 1 && !canUseMultipleFileUpload()) {
      window.renderAssistantMessage?.(
        "🔒 Multiple-file analysis is available on Plus and Pro plans, including active trials. " +
        '<a href="/pricing.html" class="text-yellow-600 hover:underline">View plans and upgrade</a>.'
      );
      fileInput.value = "";
      return;
    }

    const limits = window.FILE_UPLOAD_LIMITS;
    const tooMany = files.length > limits.maxFiles;
    const tooLarge = files.find(file => file.size > limits.maxFileBytes);
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (tooMany || tooLarge || totalBytes > limits.maxTotalBytes) {
      const reason = tooMany
        ? `You can attach up to ${limits.maxFiles} files at a time.`
        : tooLarge
          ? `"${tooLarge.name}" is larger than 25 MB.`
          : "The selected files are larger than the 100 MB total limit.";
      window.renderAssistantMessage?.(`⚠️ ${reason}`);
      fileInput.value = "";
      return;
    }

    // Store files for later send (ChatGPT style)
    window.pendingUploadFiles = files;
    window.pendingUploadFile = files.length === 1 ? files[0] : null;
    
    // Check radio mode status
    const radioModeActive = isRadioModeActive();
    
    // Radio interview remains a single-file flow. Multiple files wait for
    // the user's prompt instead of silently choosing one file.
    if (radioModeActive && files.length === 1) {
      showUploadChip(files, true); // true = radio mode
      
      // Auto-trigger the initial question prompt after a short delay
      setTimeout(async () => {
        if (window.triggerRadioModeInterview) {
          await window.triggerRadioModeInterview(files[0].name);
        } else {
          console.error("❌ triggerRadioModeInterview function not found!");
        }
      }, 500);
    } else {
      // Normal mode: show chip and optional analysis buttons
      showUploadChip(files, false);
    }
  });
} else {
  console.warn("analyze-file-input element not found");
}

// Show file attachment chips
function showUploadChip(files, isRadioMode = false) {
  files = Array.isArray(files) ? files : [files];
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
  
  files.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm text-gray-700 dark:text-gray-300 border border-blue-300 dark:border-blue-700";
    chip.innerHTML = `
      <i data-lucide="paperclip" class="w-4 h-4"></i>
      <span></span>
      <button type="button" class="ml-1 hover:text-red-500">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
    `;
    chip.querySelector("span").textContent = file.name;
    const removeButton = chip.querySelector("button");
    removeButton.setAttribute("aria-label", `Remove ${file.name}`);
    removeButton.addEventListener("click", () => {
      window.removePendingUploadFile(index);
    });
    chipContainer.appendChild(chip);
  });

  // "Remember this document" button (shown after file is attached, not radio mode)
  if (!isRadioMode && files.length === 1) {
    const remBtn = document.createElement("button");
    remBtn.id = "remember-doc-btn";
    remBtn.title = "Save this document to your library so Dynamo remembers it forever";
    remBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-yellow-400 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition";
    remBtn.innerHTML = `<i data-lucide="bookmark-plus" class="w-3.5 h-3.5"></i> Remember this`;
    remBtn.onclick = () => window.saveCurrentDocument?.(files[0]);
    chipContainer.appendChild(remBtn);
  }
  
  lucide.createIcons();
}

// Remove one pending file without disturbing the remaining attachments.
window.removePendingUploadFile = (index) => {
  const files = Array.isArray(window.pendingUploadFiles)
    ? [...window.pendingUploadFiles]
    : (window.pendingUploadFile ? [window.pendingUploadFile] : []);
  if (index < 0 || index >= files.length) return;

  files.splice(index, 1);
  window.pendingUploadFiles = files;
  window.pendingUploadFile = files.length === 1 ? files[0] : null;
  if (files.length) {
    showUploadChip(files, isRadioModeActive() && files.length === 1);
  } else {
    window.clearUploadFile();
  }
};

// Clear uploaded file
window.clearUploadFile = () => {
  window.pendingUploadFile = null;
  window.pendingUploadFiles = [];
  if (fileInput) fileInput.value = "";
  const chipContainer = document.getElementById("file-chip-container");
  if (chipContainer) chipContainer.innerHTML = "";
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
