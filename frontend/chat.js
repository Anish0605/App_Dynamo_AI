// chat.js — Dynamo AI (FINAL PRODUCTION READY 🚀 + SEARCH + AUDIO + SMART AI)

/* ---------------- DOM ---------------- */
const chatContainer = document.getElementById("chat-messages");
const heroSection = document.getElementById("hero-section");
const chatInput = document.getElementById("chat-input");

/* ---------------- STATE ---------------- */
window.chatHistory = [];
window.isAnalyzingFile = false;
let lastChatType = null;
let currentChatId = null;

function getPendingUploadFiles() {
  if (Array.isArray(window.pendingUploadFiles) && window.pendingUploadFiles.length) {
    return window.pendingUploadFiles;
  }
  return window.pendingUploadFile ? [window.pendingUploadFile] : [];
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name || "file"}`));
    reader.readAsDataURL(file);
  });
}

/* ---------------- KEYBOARD SHORTCUTS ---------------- */
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    // Send message on Enter (but allow Shift+Enter for new line)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      window.sendFromInput();
    }
  });
}

/* ---------------- IMAGE INTENT ---------------- */
function isImagePrompt(text) {
  // Use word boundary for short words like "art" to avoid matching "article", "partial", etc.
  return /(create|generate|draw|image|picture|illustration|visual|\bart\b)/i.test(text);
}

/* ---------------- RESEARCH PAPER INTENT ---------------- */
function isResearchPaperPrompt(text) {
  return /(write.*research paper|research paper on|academic paper|write.*paper on|write.*journal|write.*article on|literature review|write.*thesis|write.*dissertation|generate.*paper|create.*research paper)/i.test(text);
}

/* ---------------- CITATION FORMAT PICKER ---------------- */
const CITATION_FORMATS = [
  { code: "IEEE",     label: "IEEE",        desc: "Engineering, CS, IT",          tag: "🇮🇳 Most used in IITs/NITs", color: "#0066CC" },
  { code: "APA7",     label: "APA 7th",     desc: "Psychology, MBA, Education",   tag: "🇮🇳 IIMs, TISS, Social Sci.", color: "#D4380D" },
  { code: "MLA",      label: "MLA 9th",     desc: "Humanities, Literature",        tag: "Arts & Languages",            color: "#7B3F00" },
  { code: "Harvard",  label: "Harvard",     desc: "Management, Sciences",          tag: "UK/India Business Schools",   color: "#A61C00" },
  { code: "Vancouver",label: "Vancouver",   desc: "Medicine, Life Sciences",       tag: "Medical Colleges, MBBS/MD",   color: "#006400" },
  { code: "Chicago",  label: "Chicago",     desc: "History, Social Sciences",      tag: "JNU, History Depts",          color: "#4A235A" },
  { code: "Springer", label: "Springer",    desc: "Springer Journals, Maths",      tag: "Springer Publications",       color: "#CC6600" },
  { code: "ACS",      label: "ACS",         desc: "Chemistry, Biochemistry",       tag: "Chemical Sciences",           color: "#1A5276" }
];

function showCitationPickerBubble() {
  return new Promise((resolve) => {
    hideHero();

    const wrapper = document.createElement("div");
    wrapper.id = "citation-picker-bubble";
    wrapper.className = "flex justify-start mb-4";

    const formatCards = CITATION_FORMATS.map(f => `
      <button
        data-format="${f.code}"
        style="
          background: #1a1a1a;
          border: 1.5px solid #333;
          border-radius: 10px;
          padding: 10px 12px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          min-width: 140px;
        "
        onmouseover="this.style.borderColor='${f.color}'; this.style.background='#222';"
        onmouseout="this.style.borderColor='#333'; this.style.background='#1a1a1a';"
      >
        <div style="font-weight:700; font-size:13px; color:#EAB308; margin-bottom:3px;">${f.label}</div>
        <div style="font-size:11px; color:#ccc; margin-bottom:4px;">${f.desc}</div>
        <div style="font-size:10px; color:#888; font-style:italic;">${f.tag}</div>
      </button>
    `).join("");

    wrapper.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #111 0%, #181818 100%);
        border: 1px solid #EAB308;
        border-radius: 14px;
        padding: 18px 20px;
        max-width: 560px;
      ">
        <div style="font-weight:700; color:#EAB308; font-size:14px; margin-bottom:4px;">
          📑 Choose Citation Format
        </div>
        <div style="color:#aaa; font-size:12px; margin-bottom:14px;">
          Select the citation style for your research paper
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${formatCards}
        </div>
        <div style="margin-top:12px; font-size:11px; color:#666;">
          Not sure? Choose <strong style="color:#EAB308;">IEEE</strong> for engineering · <strong style="color:#EAB308;">APA 7th</strong> for social sciences · <strong style="color:#EAB308;">Vancouver</strong> for medical
        </div>
      </div>
    `;

    chatContainer.appendChild(wrapper);
    scrollToBottom();

    wrapper.querySelectorAll("[data-format]").forEach(btn => {
      btn.addEventListener("click", () => {
        wrapper.remove();
        resolve(btn.dataset.format);
      });
    });
  });
}

/* ---------------- VIDEO INTENT ---------------- */
function isVideoPrompt(text) {
  return /(generate.*video|create.*video|make.*video|video of|video about|cinematic|short video|animate|animation|generate animation)/i.test(text);
}

/* ---------------- QUIZ INTENT ---------------- */
function isQuizPrompt(text) {
  return /(quiz|mcq|multiple choice|test me|questions)/i.test(text);
}

/* ---------------- QUIZ PROMPT ---------------- */
function buildQuizPrompt(userText) {
  return `
Create an interactive multiple-choice quiz.

STRICT RULES:
- Return ONLY valid JSON
- No markdown

{
  "quiz": [
    {
      "question": "string",
      "options": ["a","b","c","d"],
      "answer": 0,
      "explanation": "string"
    }
  ]
}

User request:
${userText}
`;
}

/* ---------------- HELPERS ---------------- */
function hideHero() {
  if (heroSection) heroSection.style.display = "none";
  // Mark body as "chat active" so the input bar slides from centre to bottom dock
  document.body.classList.add("chat-active");
}

function showHero() {
  if (heroSection) heroSection.style.display = "flex";
  // Re-enter empty state — input bar floats to vertical centre
  document.body.classList.remove("chat-active");
}

window.hideHero = hideHero;
window.showHero = showHero;

function scrollToBottom() {
  const chatArea = document.getElementById("chat-area");
  if (chatArea) {
    setTimeout(() => {
      chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: "smooth"
      });
    }, 50);
  }
}

/* =========================================================
   🔥 SUPABASE CORE
========================================================= */

  async function ensureChat(firstMessage) {
  const userId = window.appState?.supabaseUserId;

  // 🔒 BLOCK IF NOT LOGGED IN
  if (!userId) {
    console.warn("User not logged in → chat blocked");
    return null;
  }

  // ✅ reuse existing chat
  if (window.appState.chatId && window.chatHistory.length > 0) {
    return window.appState.chatId;
  }

  if (currentChatId) {
    window.setChatId(currentChatId);
    return currentChatId;
  }

  if (window._creatingChatPromise) {
    return window._creatingChatPromise;
  }

  window._creatingChatPromise = (async () => {
    const { data, error } = await supabaseClient
      .from("chats")
      .insert({
        user_id: userId,
        title: firstMessage?.slice(0, 40) || "New Chat",
        is_starred: false
      })
      .select()
      .single();

    if (error) {
      console.error("Chat create error:", error);
      return null;
    }

    window.setChatId(data.id);
    return data.id;
  })();

  try {
    return await window._creatingChatPromise;
  } finally {
    window._creatingChatPromise = null;
  }
}

async function saveMessage(role, text) {
  const history = window.chatHistory || [];
  const last = history[history.length - 1];
  if (last && last.role === role && last.content === text) return;
  const chatId = await ensureChat(text);
  if (!chatId) return;

  await window.supabaseClient.from("messages").insert({
    chat_id: chatId,
    role,
    content: { text },
    content_type: "text"
  });
}

/* =========================================================
   THINKING
========================================================= */

let thinkingEl = null;

function showThinking() {
  thinkingEl = document.createElement("div");
  thinkingEl.className = "text-yellow-500 text-sm italic px-4 my-2";
  thinkingEl.innerText = "Thinking...";
  chatContainer.appendChild(thinkingEl);
}

function hideThinking() {
  thinkingEl?.remove();
}
window.showThinking = showThinking;
window.hideThinking = hideThinking;

/* =========================================================
   LIMIT
========================================================= */

async function checkMessageLimit() {
  let user = window.appState?.supabaseUser;

  if (!user) {
    return { allowed: false };
  }

  // ✅ REFRESH USER DATA FROM BACKEND (triggers daily quota reset)
  if (user.id) {
    try {
      const res = await window.callBackend("/get-user", { user_id: user.id });

      if (res && !res.error) {
        user = res;
        // Update appState to latest user data with reset applied
        window.appState.supabaseUser = user;
      }
    } catch (err) {
      console.warn("⚠️ Could not refresh user quota:", err);
      // Continue with stale data if refresh fails
    }
  }

  const plan = user.plan || "free";

  // Must match backend PLAN_LIMITS in supabase_client.py
  const PLAN_LIMITS = {
    free: 10,
    plus: 100,
    plus_trial: 100,
    pro: 300,
    pro_trial: 300,
    pro_validation: 300
  };

  const limit = PLAN_LIMITS[plan] ?? 10;
  const used = user.daily_quota_used || 0;

  if (used >= limit) {
    return {
      allowed: false,
      message: `⚠️ You have reached your daily limit of ${limit} messages. ${plan === "free" ? "Upgrade to Plus for 100 messages/day." : "Your limit resets tomorrow."}`
    };
  }

  return { allowed: true };
}

/* =========================================================
   🎙️ RADIO MODE INTERVIEW (AUTO-TRIGGER WITH FILE)
========================================================= */
window.triggerRadioModeInterview = async (filename) => {
  if (!filename || !window.pendingUploadFile) return;
  
  // Build an interview-style prompt (for /chat-with-file endpoint to use)
  const interviewPrompt = `You have just received a document. Act as a professional interviewer conducting an interview. Ask me conversational, engaging questions to understand the content of this document better. Start with your first question, as if you're interviewing me about it. Make it conversational, not analytical.`;
  
  
  // Show user's action - set the input value to trigger the send
  chatInput.value = interviewPrompt;
  
  // Trigger send which will use /chat-with-file endpoint with the special prompt
  await window.sendFromInput();
};

/* =========================================================
   🚀 SEND MESSAGE (FIXED - NO DUPLICATES)
========================================================= */
window.sendFromInput = async () => {
    if (window.isSending) return;
    window.isSending = true;
  const msg = chatInput.value.trim();
  const pendingFiles = getPendingUploadFiles();
  
  // Allow sending if there's a message OR a pending file
  const hasFile = pendingFiles.length > 0;
  if (!msg && !hasFile) {
    window.isSending = false;
    return;
  }

  // Check if radio mode is active
  const isRadioMode = window.dynamoUI && window.dynamoUI.tools && window.dynamoUI.tools.has('radio');

  const isVideoReq = !hasFile && isVideoPrompt(msg);

  const userId = window.appState?.supabaseUserId;

  // ✅ ALWAYS SHOW USER MESSAGE
  if (msg) renderUserMessage(msg);
  // In radio mode, show file indicator differently (no "Analyzing" - just "File loaded")
  if (hasFile) {
    const fileLabel = pendingFiles.length === 1
      ? (isRadioMode
        ? `📎 Discussing: ${pendingFiles[0].name}`
        : `📎 Analyzing: ${pendingFiles[0].name}`)
      : `📎 Analyzing ${pendingFiles.length} files:\n${pendingFiles.map(file => `• ${file.name}`).join("\n")}`;
    renderUserMessage(fileLabel);
  }

  // 🔒 LOGIN CHECK
  if (!userId) {
    renderAssistantMessage("🔒 Please login / sign up to use DynamoAI.");
    window.isSending = false;
    return;
  }
  if (!window.hasPaidAccess?.()) {
    window.showPaidAccessGate?.();
    window.isSending = false;
    return;
  }

  chatInput.value = "";
  chatInput.style.height = "";

  // ── Deep Research Agent mode intercept ──────────────────────────────────────
  if (window._drModeActive) {
    window.isSending = false;
    window.deactivateDeepResearchMode();
    window.runDeepResearchInChat(msg);
    return;
  }
  // ── end intercept ──────────────────────────────────────────────────────────

  const limit = await checkMessageLimit();
  if (!limit.allowed) {
    renderAssistantMessage(limit.message || "⚠️ Daily limit reached.");
    window.isSending = false;
    window.pendingUploadFile = null;
    window.clearUploadFile?.();
    return;
  }

  // 📑 Citation Format — Research Mode only
  // Path A: user came via "Write a Paper ›" flyout (format pre-set)
  // Path B: user typed a paper-sounding prompt manually → show picker bubble
  let selectedCitationFormat = "";
  const isResearchModeNow = window.dynamoUI?.model === "research";
  if (window._paperCitationFormat) {
    selectedCitationFormat = window._paperCitationFormat;
    window._paperCitationFormat = null;
    window.clearWritePaper?.();
  } else if (isResearchModeNow && !hasFile && !isVideoReq && isResearchPaperPrompt(msg)) {
    window.isSending = false; // Release lock while user picks format
    selectedCitationFormat = await showCitationPickerBubble();
    window.isSending = true;  // Re-acquire lock
  }

  // 🎬 Video loading bubble (premium feel)
  let videoLoadingEl = null;
  if (isVideoReq) {
    videoLoadingEl = document.createElement("div");
    videoLoadingEl.className = "flex justify-start mb-4";
    videoLoadingEl.innerHTML = `
      <div class="video-loading-bubble">
        <div class="video-loading-title">
          🎬 Creating cinematic video...
        </div>
        <div class="video-loading-sub">This may take ~30 seconds. Sit tight!</div>
        <div class="dynamo-spinner"></div>
      </div>
    `;
    chatContainer.appendChild(videoLoadingEl);
    scrollToBottom();
  } else {
    showThinking();
  }

  try {
    // Filter out quiz/json content from history to prevent contamination
    const cleanHistory = (window.chatHistory || [])
      .slice(-15)
      .filter(msg => {
        // Always coerce content to string — DB may return parsed JSON objects
        // (saveMessage stores {text:"..."} format; coercing prevents TypeError)
        const content = String(msg.content || "");
        // Skip empty messages
        if (!content.trim()) return false;
        // Skip structured data (quiz JSON, analysis JSON, etc)
        const isStructuredData = content.trim().startsWith("{") &&
          (content.includes("quiz") || content.includes("analysis") || content.includes("questions"));
        return !isStructuredData;
      })
      .slice(-10);

    let res;

    // 🎬 Video request — dedicated endpoint
    if (isVideoReq) {
      res = await window.callBackend("/generate-video", {
        message: msg,
        duration: 5,
        user_id: window.appState?.supabaseUserId
      });
      videoLoadingEl?.remove();
    }
    // If file(s) are attached — keep the original single-file contract and
    // use the additive batch route only when more than one file is selected.
    else if (hasFile) {
      let safeHistory = [];
      try { safeHistory = cleanHistory; } catch (_) {}
      const encodedFiles = await Promise.all(
        pendingFiles.map(async file => ({
          file_data: await readFileAsBase64(file),
          file_name: file.name || "upload",
          file_type: file.type || "application/octet-stream"
        }))
      );
      const filePayload = pendingFiles.length === 1
        ? {
            ...encodedFiles[0],
            message: msg,
            history: safeHistory,
            chat_id: currentChatId || "",
            user_id: window.appState?.supabaseUserId || ""
          }
        : {
            files: encodedFiles,
            message: msg,
            history: safeHistory,
            chat_id: currentChatId || "",
            user_id: window.appState?.supabaseUserId || ""
          };
      const fileEndpoint = pendingFiles.length === 1 ? "/chat-with-file" : "/chat-with-files";
      try {
        const rawResp = await window.backendFetch(`${window.BACKEND_URL}${fileEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filePayload)
        });
        if (!rawResp.ok) {
          const errText = await rawResp.text().catch(() => `HTTP ${rawResp.status}`);
          console.error(`${fileEndpoint} server error:`, rawResp.status, errText);
          throw new Error(`Server returned ${rawResp.status}: ${errText.slice(0, 200)}`);
        }
        res = await rawResp.json();
      } finally {
        window.pendingUploadFile = null;
        window.clearUploadFile?.();
      }
    }
    else {
      // Regular JSON send (no file)
      const isSearchMode = window.dynamoUI?.tools?.has('search') || false;
      const isDeepMode = window.dynamoUI?.tools?.has('deep') || window.dynamoUI?.model === 'research' || false;
      const isResearchMode = window.dynamoUI?.model === 'research' || false;
      const isQuiz = isQuizPrompt(msg);

      // Don't force image if it's a quiz request or in Research Mode (prioritize quiz/sources)
      const forceImage = !isQuiz && isImagePrompt(msg) && !isResearchMode;

      const payload = {
        message: isQuiz ? buildQuizPrompt(msg) : (isResearchMode ? `${msg}\n\n${window.getResearchModeInstruction(msg)}` : msg),
        history: cleanHistory,
        use_search: isSearchMode || isResearchMode,
        deep_dive: isDeepMode && !isResearchMode,
        force_image: forceImage,
        mode: isResearchMode ? "research" : "chat",
        citation_format: selectedCitationFormat || "",
        chat_id: currentChatId,
        user_id: window.appState?.supabaseUserId
      };

      res = await window.callBackend("/chat", payload);
    }

    if (res?.chat_id) {
      currentChatId = res.chat_id;
    }

    // Hide the right loader
    if (isVideoReq) {
      videoLoadingEl?.remove();
    } else {
      hideThinking();
    }

    // ✅ Increment local quota count so frontend check stays accurate
    if (window.appState?.supabaseUser) {
      window.appState.supabaseUser.daily_quota_used = (window.appState.supabaseUser.daily_quota_used || 0) + 1;
      // ✅ Update credits dashboard
      window.updateCreditsDisplay?.();
    }

    // ---------------- VIDEO ----------------
    if (res?.type === "video" && res.url) {
      hideHero();

      const div = document.createElement("div");
      div.className = "flex justify-start mb-4";
      div.innerHTML = `
        <div class="flex flex-col gap-2" style="max-width:480px;">
          <video
            src="${res.url}"
            controls
            autoplay
            muted
            style="max-width:100%; border-radius:12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);"
          ></video>
          <div class="flex gap-2">
            <a href="${res.url}" download="dynamo-video-${Date.now()}.mp4"
              class="text-xs text-yellow-500 hover:underline flex items-center gap-1">
              ⬇️ Download Video
            </a>
          </div>
        </div>
      `;
      chatContainer.appendChild(div);
      scrollToBottom();

      window.chatHistory.push({ role: "assistant", content: "[Video Generated]" });
      if (window.appState?.supabaseUserId) saveMessage("assistant", "[Video Generated]");
      return;
    }

    if (res?.type === "video") {
      renderAssistantMessage("⚠️ Video generation failed. Please try again.");
      return;
    }

    // ---------------- QUOTA ERRORS ----------------
    if (res?.type === "error" && res?.code) {
      hideHero();
      const errorMessages = {
        no_image_free: {
          title: "Images require a paid plan",
          body: "Free users cannot generate images. Upgrade to Plus to get 25 images/month."
        },
        image_quota_exceeded: {
          title: "Monthly image limit reached",
          body: "You've used all your image generations for this month. Upgrade to Pro for 100 images/month."
        },
        no_video_free: {
          title: "Videos require a paid plan",
          body: "Free users cannot generate videos. Upgrade to Plus to get 5 videos/month."
        },
        video_quota_exceeded: {
          title: "Monthly video limit reached",
          body: "You've used all your video generations for this month. Upgrade to Pro for 25 videos/month."
        }
      };

      const info = errorMessages[res.code] || {
        title: "Limit reached",
        body: "You have reached your usage limit."
      };

      const div = document.createElement("div");
      div.className = "flex justify-start mb-4";
      div.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #1a1200 0%, #221a00 100%);
          border: 1px solid #EAB308;
          border-radius: 14px;
          padding: 16px 20px;
          max-width: 400px;
        ">
          <div style="font-weight:700; color:#EAB308; font-size:14px; margin-bottom:6px;">
            ${info.title}
          </div>
          <div style="color:#e5e5e5; font-size:13px; margin-bottom:14px; line-height:1.5;">
            ${info.body}
          </div>
          <a href="/pricing.html" style="
            display: inline-block;
            background: #EAB308;
            color: #111;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 18px;
            border-radius: 8px;
            text-decoration: none;
            transition: opacity 0.2s;
          " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            Upgrade Plan
          </a>
        </div>
      `;
      chatContainer.appendChild(div);
      scrollToBottom();
      return;
    }

    // ---------------- IMAGE ----------------
    if (res?.type === "image_v2" && res.content) {
      hideHero();
      
      const div = document.createElement("div");
      div.className = "flex justify-start mb-4";
      
      const imageHtml = `
        <div class="flex items-start gap-2">
          <div class="relative inline-block group">
            <img src="${res.content}" class="rounded-lg shadow-lg max-w-md" id="generated-image"/>
            
            <!-- Image Controls (Bottom Right) -->
            <div class="absolute bottom-3 right-3 bg-black/70 rounded-lg p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <!-- Download Button -->
              <button class="download-img-btn p-2 hover:bg-white/20 rounded transition" title="Download">
                <i data-lucide="download" class="w-5 h-5 text-white"></i>
              </button>
              
              <!-- Share Button -->
              <button class="share-img-btn p-2 hover:bg-white/20 rounded transition" title="Share">
                <i data-lucide="share-2" class="w-5 h-5 text-white"></i>
              </button>
              
              <!-- Thumb Up -->
              <button class="thumb-up-btn p-2 hover:bg-green-500/30 rounded transition" title="Good">
                <i data-lucide="thumbs-up" class="w-5 h-5 text-white"></i>
              </button>
              
              <!-- Thumb Down -->
              <button class="thumb-down-btn p-2 hover:bg-red-500/30 rounded transition" title="Not good">
                <i data-lucide="thumbs-down" class="w-5 h-5 text-white"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      
      div.innerHTML = imageHtml;
      chatContainer.appendChild(div);
      scrollToBottom();
      
      // Add to chat history
      window.chatHistory.push({ role: "assistant", content: "[Image Generated]" });
      if (saveMessage && window.appState?.supabaseUserId) {
        saveMessage("assistant", "[Image Generated]");
      }
      
      // Setup event listeners
      setTimeout(() => {
        lucide.createIcons();
        
        const downloadBtn = div.querySelector(".download-img-btn");
        const shareBtn = div.querySelector(".share-img-btn");
        const thumbUpBtn = div.querySelector(".thumb-up-btn");
        const thumbDownBtn = div.querySelector(".thumb-down-btn");
        
        downloadBtn?.addEventListener("click", () => {
          const link = document.createElement("a");
          link.href = res.content;
          link.download = `dynamo-ai-image-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          downloadBtn.classList.add("scale-110");
          setTimeout(() => downloadBtn.classList.remove("scale-110"), 200);
        });
        
        shareBtn?.addEventListener("click", async () => {
          const shareData = {
            title: "Check out this AI-generated image from Dynamo AI!",
            text: msg
          };
          
          if (navigator.share) {
            try {
              await navigator.share(shareData);
            } catch (err) {
            }
          } else {
            shareBtn.classList.add("scale-110");
            setTimeout(() => shareBtn.classList.remove("scale-110"), 200);
          }
        });
        
        thumbUpBtn?.addEventListener("click", () => {
          thumbUpBtn.classList.add("bg-green-500/50", "scale-110");
          thumbDownBtn?.classList.remove("bg-red-500/50", "scale-110");
          setTimeout(() => thumbUpBtn.classList.remove("scale-110"), 200);
        });
        
        thumbDownBtn?.addEventListener("click", () => {
          thumbDownBtn.classList.add("bg-red-500/50", "scale-110");
          thumbUpBtn?.classList.remove("bg-green-500/50", "scale-110");
          setTimeout(() => thumbDownBtn.classList.remove("scale-110"), 200);
        });
      }, 50);
      
      return;
    }

    if (res?.type === "image_v2") {
      renderAssistantMessage("⚠️ Image generation temporarily unavailable.");
      return;
    }

    // ---------------- FLOWCHART ----------------
    if (res?.type === "flowchart" && Array.isArray(res.nodes) && res.nodes.length > 0) {
      hideHero();
      
      try {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.padding = "20px";
        container.style.gap = "10px";
        container.id = "flowchart-container-" + Date.now();

        res.nodes.forEach((node, index) => {
          const box = document.createElement("div");
          box.innerText = node.label || node.id || "Step";
          box.style.padding = "10px 15px";
          box.style.border = "2px solid #EAB308";
          box.style.borderRadius = "8px";
          box.style.margin = "10px";
          box.style.background = "#111";
          box.style.color = "#fff";
          box.style.fontWeight = "500";
          box.style.minWidth = "150px";
          box.style.textAlign = "center";

          container.appendChild(box);

          if (index < res.nodes.length - 1) {
            const arrow = document.createElement("div");
            arrow.innerText = "↓";
            arrow.style.fontSize = "20px";
            arrow.style.color = "#EAB308";
            arrow.style.lineHeight = "1";
            container.appendChild(arrow);
          }
        });

        const div = document.createElement("div");
        div.className = "flex justify-start mb-4";
        
        // Wrapper for flowchart and download button
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.gap = "10px";
        
        wrapper.appendChild(container);
        
        // Download button
        const downloadBtn = document.createElement("button");
        downloadBtn.className = "text-xs text-yellow-500 hover:underline flex items-center gap-1";
        downloadBtn.innerHTML = "⬇️ Download Flowchart";
        downloadBtn.style.padding = "8px 12px";
        downloadBtn.style.border = "1px solid #EAB308";
        downloadBtn.style.borderRadius = "6px";
        downloadBtn.style.background = "transparent";
        downloadBtn.style.color = "#EAB308";
        downloadBtn.style.cursor = "pointer";
        downloadBtn.style.fontSize = "12px";
        downloadBtn.style.fontWeight = "500";
        downloadBtn.style.transition = "all 0.2s";
        
        downloadBtn.addEventListener("mouseover", () => {
          downloadBtn.style.background = "#EAB308";
          downloadBtn.style.color = "#111";
        });
        
        downloadBtn.addEventListener("mouseout", () => {
          downloadBtn.style.background = "transparent";
          downloadBtn.style.color = "#EAB308";
        });
        
        downloadBtn.addEventListener("click", async () => {
          try {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = "⏳ Generating...";
            
            // Use html2canvas or canvas API
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const nodeHeight = 60;
            const nodeWidth = 200;
            const padding = 40;
            const totalHeight = res.nodes.length * nodeHeight + (res.nodes.length - 1) * 30 + padding * 2;
            
            canvas.width = nodeWidth + padding * 2;
            canvas.height = totalHeight;
            
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            let yPos = padding;
            res.nodes.forEach((node, index) => {
              ctx.fillStyle = "#111";
              ctx.strokeStyle = "#EAB308";
              ctx.lineWidth = 2;
              ctx.fillRect(padding, yPos, nodeWidth, nodeHeight);
              ctx.strokeRect(padding, yPos, nodeWidth, nodeHeight);
              
              ctx.fillStyle = "#fff";
              ctx.font = "bold 14px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              const label = node.label || node.id || "Step";
              ctx.fillText(label, padding + nodeWidth / 2, yPos + nodeHeight / 2);
              
              yPos += nodeHeight;
              
              if (index < res.nodes.length - 1) {
                ctx.fillStyle = "#EAB308";
                ctx.font = "20px Arial";
                ctx.fillText("↓", padding + nodeWidth / 2, yPos + 15);
                yPos += 30;
              }
            });
            
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `flowchart-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = "⬇️ Download Flowchart";
          } catch (e) {
            console.error("Download error:", e);
            downloadBtn.innerHTML = "❌ Download failed";
            downloadBtn.disabled = false;
            setTimeout(() => {
              downloadBtn.innerHTML = "⬇️ Download Flowchart";
            }, 2000);
          }
        });
        
        wrapper.appendChild(downloadBtn);
        div.appendChild(wrapper);
        chatContainer.appendChild(div);
        scrollToBottom();

        window.chatHistory.push({ role: "assistant", content: "[Flowchart Generated]" });
        if (window.appState?.supabaseUserId) saveMessage("assistant", "[Flowchart Generated]");
        return;
      } catch (e) {
        console.error("Flowchart render error:", e);
        renderAssistantMessage("⚠️ Error rendering flowchart. Please try again.");
        return;
      }
    }

    // ---------------- MINDMAP ----------------
    if (res?.type === "mindmap" && res.root) {
      hideHero();
      
      try {
        const container = document.createElement("div");
        container.style.padding = "20px";
        container.style.background = "#111";
        container.style.borderRadius = "8px";
        container.id = "mindmap-container-" + Date.now();

        function createNode(node, level = 0) {
          const el = document.createElement("div");
          el.style.marginLeft = (level * 30) + "px";
          el.style.padding = "8px 0";

          const label = document.createElement("div");
          label.innerText = (level === 0 ? "🎯 " : "→ ") + (node.label || "Node");
          label.style.fontWeight = level === 0 ? "bold" : "500";
          label.style.fontSize = level === 0 ? "16px" : "14px";
          label.style.color = level === 0 ? "#EAB308" : "#fff";
          label.style.padding = "5px";
          label.style.borderRadius = "4px";
          label.style.backgroundColor = level === 0 ? "#1a1a1a" : "transparent";

          el.appendChild(label);

          if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => {
              el.appendChild(createNode(child, level + 1));
            });
          }

          return el;
        }

        container.appendChild(createNode(res.root));

        const div = document.createElement("div");
        div.className = "flex justify-start mb-4";
        
        // Wrapper for mindmap and download button
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.gap = "10px";
        
        wrapper.appendChild(container);
        
        // Download button
        const downloadBtn = document.createElement("button");
        downloadBtn.className = "text-xs text-yellow-500 hover:underline flex items-center gap-1";
        downloadBtn.innerHTML = "⬇️ Download Mindmap";
        downloadBtn.style.padding = "8px 12px";
        downloadBtn.style.border = "1px solid #EAB308";
        downloadBtn.style.borderRadius = "6px";
        downloadBtn.style.background = "transparent";
        downloadBtn.style.color = "#EAB308";
        downloadBtn.style.cursor = "pointer";
        downloadBtn.style.fontSize = "12px";
        downloadBtn.style.fontWeight = "500";
        downloadBtn.style.transition = "all 0.2s";
        
        downloadBtn.addEventListener("mouseover", () => {
          downloadBtn.style.background = "#EAB308";
          downloadBtn.style.color = "#111";
        });
        
        downloadBtn.addEventListener("mouseout", () => {
          downloadBtn.style.background = "transparent";
          downloadBtn.style.color = "#EAB308";
        });
        
        downloadBtn.addEventListener("click", async () => {
          try {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = "⏳ Generating...";
            
            // Count total leaf nodes (widest row) to correctly size canvas width
            function countLeaves(node) {
              if (!node.children || node.children.length === 0) return 1;
              return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
            }

            function getTreeDepth(node) {
              if (!node.children || node.children.length === 0) return 1;
              return 1 + Math.max(...node.children.map(getTreeDepth));
            }

            const totalLeaves = countLeaves(res.root);
            const treeDepth = getTreeDepth(res.root);

            const nodeHeight = 50;
            const nodeWidth = 200;
            const horizontalSpacing = 260;  // space per leaf node
            const verticalSpacing = 110;
            const padding = 80;

            // Canvas sized to fit ALL leaf nodes across + guaranteed landscape
            let canvasWidth = Math.max(1400, totalLeaves * horizontalSpacing + padding * 2);
            let canvasHeight = Math.max(500, treeDepth * verticalSpacing + padding * 2);

            // Guarantee landscape (width always > height)
            if (canvasWidth < canvasHeight * 1.4) {
              canvasWidth = Math.ceil(canvasHeight * 1.4);
            }
            
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // White background for better clarity
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // drawNode uses leaf-proportional layout so every node gets enough room
            // startX/endX define the horizontal band this subtree owns
            function drawNode(node, startX, endX, y, level = 0) {
              const centerX = (startX + endX) / 2;
              const nodeH = nodeHeight;
              const nodeW = nodeWidth;

              // Draw children first (so lines appear behind boxes)
              if (node.children && Array.isArray(node.children) && node.children.length > 0) {
                const childY = y + verticalSpacing;
                const myLeaves = countLeaves(node);

                let curX = startX;
                node.children.forEach(child => {
                  const childLeaves = countLeaves(child);
                  // Give this child a band proportional to its leaf share
                  const bandWidth = (childLeaves / myLeaves) * (endX - startX);
                  const childCenterX = curX + bandWidth / 2;

                  // Draw connecting line
                  ctx.strokeStyle = "#EAB308";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(centerX, y + nodeH);
                  ctx.lineTo(childCenterX, childY);
                  ctx.stroke();

                  drawNode(child, curX, curX + bandWidth, childY, level + 1);
                  curX += bandWidth;
                });
              }

              // Draw node box
              ctx.fillStyle = level === 0 ? "#EAB308" : "#f0f0f0";
              ctx.strokeStyle = "#EAB308";
              ctx.lineWidth = 2;
              const bx = centerX - nodeW / 2;
              ctx.fillRect(bx, y, nodeW, nodeH);
              ctx.strokeRect(bx, y, nodeW, nodeH);

              // Draw label (wrap if too long)
              ctx.fillStyle = level === 0 ? "#111" : "#222";
              ctx.font = (level === 0 ? "bold 15px" : "14px") + " Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              const label = node.label || "Node";
              const maxChars = 24;
              const displayLabel = label.length > maxChars ? label.substring(0, maxChars - 3) + "..." : label;
              ctx.fillText(displayLabel, centerX, y + nodeH / 2);
            }

            drawNode(res.root, padding, canvasWidth - padding, padding);
            
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `mindmap-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = "⬇️ Download Mindmap";
          } catch (e) {
            console.error("Mindmap download error:", e);
            downloadBtn.innerHTML = "❌ Download failed";
            downloadBtn.disabled = false;
            setTimeout(() => {
              downloadBtn.innerHTML = "⬇️ Download Mindmap";
            }, 2000);
          }
        });
        
        wrapper.appendChild(downloadBtn);
        div.appendChild(wrapper);
        chatContainer.appendChild(div);
        scrollToBottom();

        window.chatHistory.push({ role: "assistant", content: "[Mindmap Generated]" });
        if (window.appState?.supabaseUserId) saveMessage("assistant", "[Mindmap Generated]");
        return;
      } catch (e) {
        console.error("Mindmap render error:", e);
        renderAssistantMessage("⚠️ Error rendering mindmap. Please try again.");
        return;
      }
    }

    // ---------------- QUIZ ----------------
    if (res.content && res.content.includes('"quiz"')) {
      try {
        let cleanText = res.content.trim()
          .replace(/```json/gi, "")
          .replace(/```/g, "");

        const start = cleanText.indexOf("{");
        const end   = cleanText.lastIndexOf("}");
        if (start !== -1 && end !== -1) cleanText = cleanText.slice(start, end + 1);

        const parsed = JSON.parse(cleanText);

        if (parsed.quiz && Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
          window.renderQuiz(parsed.quiz);

          // Save placeholder to DB so history shows something
          if (window.appState?.supabaseUserId) saveMessage("assistant", "[Quiz rendered]");

          // Don't add raw JSON to context
          window.chatHistory.push({ role: "assistant", content: "[Quiz rendered]" });

          return;
        }
      } catch (e) {
        console.warn("Quiz parse failed:", e.message);
        // Fall through — raw JSON renders as text; we still save it below
      }
    }

    // ---------------- SINGLE RESPONSE (FIX) ----------------
    const data = res;
    if (data?.type === "research") {
      // Clean raw text before parsing
      const rawText = (data.content || "")
        .replace(/^---+\s*$/gm, "")
        .replace(/^#{1,6}\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Use marked for full markdown → HTML conversion
      const parsedHtml = (typeof marked !== "undefined")
        ? marked.parse(rawText)
        : rawText.replace(/\n/g, "<br>");

      const wrapper = document.createElement("div");
      wrapper.className = "research-output";
      wrapper.innerHTML = parsedHtml;

      // Add sources badge button if sources are available
      if (data.sources?.length > 0) {
        const srcRow = document.createElement("div");
        srcRow.className = "research-sources-row";
        const srcBtn = document.createElement("button");
        srcBtn.className = "research-sources-badge";
        srcBtn.innerHTML = `🔗 ${data.sources.length} Sources Retrieved`;
        const capturedSources = data.sources;
        const capturedMsg = msg;
        srcBtn.addEventListener("click", () => window.openSourcesPanel(capturedSources, capturedMsg));
        srcRow.appendChild(srcBtn);
        wrapper.appendChild(srcRow);
      }

      chatContainer.appendChild(wrapper);
      scrollToBottom();
      window.chatHistory.push({ role: "assistant", content: data.content || "" });
      if (window.appState?.supabaseUserId) saveMessage("assistant", data.content || "");

      // "Write a Paper" (Research Mode) — offer a .docx download once the paper is ready
      if (data.is_paper && data.content) {
        window.showPaperDownloadTab?.(data.content, msg || "Research Paper");
      }

      // Auto-humanize note — this paper was auto-rewritten before being returned
      if (data.auto_humanized) {
        const ah = data.auto_humanized;
        const note = ah.verified_human === false
          ? `Note: this paper was auto-rewritten for natural, human-sounding prose, but still scored ${ah.verification_score}% AI-likelihood on our own detector — review before submitting.`
          : `This paper was auto-rewritten for natural, human-sounding prose (scored ${ah.verification_score}% AI-likelihood).`;
        const noteEl = document.createElement("div");
        noteEl.className = "research-humanize-note";
        noteEl.style.cssText = "font-size:12px;color:" + (ah.verified_human === false ? "#b45309" : "#6b7280") + ";font-style:italic;margin-top:8px;padding:0 2px;";
        noteEl.textContent = "ℹ️ " + note;
        wrapper.appendChild(noteEl);

        // Persist the note as its own message so it survives a reload
        // (sidebar.js's loadChatHistory re-renders any assistant text as a normal bubble).
        const noteText = "ℹ️ " + note;
        window.chatHistory.push({ role: "assistant", content: noteText });
        if (window.appState?.supabaseUserId) saveMessage("assistant", noteText);
      }
      return;
    }

    // Sources: show whenever web search is active and sources returned
    const isSearchActive = window.dynamoUI?.tools?.has('search') || false;
    const showSources = isSearchActive && (res.sources?.length > 0);
    const sources = showSources ? (res.sources || []) : [];
    renderAssistantMessage(res.content || "", res.content, true, sources);

    // Auto-open sources panel for Fast Mode + Web Search (non-research)
    if (isSearchActive && sources.length > 0) {
      setTimeout(() => window.openSourcesPanel(sources, msg), 600);
    }

    // 🔁 Follow-ups — only in DeepThink mode
    const isDeepThinkActive = window.dynamoUI?.tools?.has('deep') || false;
    if (isDeepThinkActive && msg && res.content) {
      // Wait for DOM to settle, then find the last bubble directly
      setTimeout(() => {
        const allWrappers = chatContainer.querySelectorAll(".assistant-msg-wrapper");
        const lastWrapper = allWrappers[allWrappers.length - 1];
        if (lastWrapper) {
          generateFollowUps(msg, res.content, lastWrapper);
        }
      }, 300);
    }
  } catch (e) {
    console.error("Chat error:", e);
    hideThinking();
    renderAssistantMessage(`⚠️ Error: ${e?.message || String(e)}. Please screenshot this and report it.`);
  } finally {
    window.isSending = false;
  }
};

/* =========================================================
   💬 RENDER (WITH SAFE STREAMING)
========================================================= */

function typeText(element, text, speed = 10) {
  let i = 0;
  element.innerHTML = "";

  let isTyping = true;

  function typing() {
    if (!isTyping) return;

    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    }
  }

  typing();

  return () => {
    isTyping = false;
  };
}
// ---------------- USER MESSAGE ----------------
function renderUserMessage(text, save = true) {
  hideHero();

  const div = document.createElement("div");
  div.className = "flex justify-end mb-4";

  div.innerHTML = `
    <div style="background:#EAB330;" class="text-black px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow">
      ${text}
    </div>
  `;

  chatContainer.appendChild(div);
  scrollToBottom();

  window.chatHistory.push({ role: "user", content: text });
  if (save && window.appState?.supabaseUserId) {
  saveMessage("user", text);
}
}
window.renderUserMessage = renderUserMessage;

function appendChatHistoryOnce(role, content) {
  const history = window.chatHistory || [];
  const last = history[history.length - 1];
  if (last && last.role === role && last.content === content) return false;
  history.push({ role, content });
  window.chatHistory = history;
  return true;
}

// ---------------- ASSISTANT MESSAGE ----------------
function renderAssistantMessage(html, rawText = "", save = true, sources = []) {
  hideHero();

  const div = document.createElement("div");
  div.className = "flex justify-start mb-4";

  div.innerHTML = `
    <div class="flex items-start gap-2">

      <div class="bg-gray-100 dark:bg-gray-700 dark:text-white dark:border dark:border-gray-600 px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow assistant-msg-wrapper">
        <div class="assistant-msg"></div>
        <div class="sources-badge-container"></div>
      </div>

      <div class="flex flex-col gap-1 mt-1">
        <button class="play-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-50 dark:hover:bg-gray-800 text-yellow-400 hover:text-yellow-500 transition" title="Play audio">
          <i data-lucide="play" class="w-4 h-4"></i>
        </button>
        <button class="download-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-50 dark:hover:bg-gray-800 text-yellow-400 hover:text-yellow-500 transition" title="Download audio">
          <i data-lucide="download" class="w-4 h-4"></i>
        </button>
      </div>

    </div>
  `;

  chatContainer.appendChild(div);

  const messageBox = div.querySelector(".assistant-msg");
  const sourcesBadgeContainer = div.querySelector(".sources-badge-container");

  const text = rawText || html || "";

  const stopTyping = typeText(messageBox, text);

  setTimeout(() => {
    stopTyping();
    try {
      messageBox.innerHTML = marked.parse(text);
    } catch {
      messageBox.innerText = text;
    }

    // 🔗 SOURCES BADGE (Perplexity-style) — show after text renders
    if (sources && sources.length > 0) {
      const query = window.chatHistory
        .filter(m => m.role === "user")
        .slice(-1)[0]?.content || "";

      const badge = document.createElement("button");
      badge.className = [
        "inline-flex items-center gap-1.5 mt-3 px-3 py-1.5",
        "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40",
        "border border-blue-200 dark:border-blue-700 rounded-full",
        "text-xs font-semibold text-blue-700 dark:text-blue-300",
        "transition-all duration-150 group"
      ].join(" ");

      badge.innerHTML = `
        <span class="flex -space-x-1 mr-0.5">
          ${sources.slice(0, 3).map(s => {
            const domain = (() => { try { return new URL(s.url || "").hostname.replace(/^www\./, ""); } catch { return ""; } })();
            return domain
              ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" class="w-3.5 h-3.5 rounded-full border border-white dark:border-gray-800" alt="">`
              : `<span class="w-3.5 h-3.5 rounded-full bg-blue-300 border border-white dark:border-gray-800"></span>`;
          }).join("")}
        </span>
        <span>${sources.length} source${sources.length !== 1 ? "s" : ""}</span>
        <i data-lucide="chevron-right" class="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform"></i>
      `;

      badge.addEventListener("click", () => {
        window.openSourcesPanel(sources, query);
      });

      sourcesBadgeContainer.appendChild(badge);
      if (window.lucide) window.lucide.createIcons();
    }

    // ── Trust Layer: per-message Verify button ───────────────────────────────
    // Shows a subtle shield button on every substantive reply.
    // Clicking fetches Semantic Scholar papers and cross-checks key claims inline.
    const isSubstantive = text.length > 150
      && !text.startsWith("⚠️")
      && !text.startsWith("🔒")
      && !text.startsWith("💡")
      && !/^\[(Image|Video|Flowchart|Mindmap|Quiz)/.test(text);

    if (isSubstantive) {
      // Snapshot the triggering user question now (before more messages arrive)
      const lastUserQ = [...(window.chatHistory || [])]
        .reverse()
        .find(m => m.role === "user" && m.content?.length > 3)
        ?.content?.slice(0, 200) || "";

      const vBtn = document.createElement("button");
      vBtn.className = "trust-verify-btn";
      vBtn.style.cssText = [
        "display:inline-flex;align-items:center;gap:5px;margin-top:8px;",
        "padding:4px 10px;background:transparent;",
        "border:1px solid #e5e7eb;border-radius:999px;",
        "font-size:11px;font-weight:600;color:#9ca3af;cursor:pointer;transition:all .15s;",
      ].join("");
      vBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verify`;
      vBtn.addEventListener("mouseover", () => {
        if (!vBtn.disabled && !vBtn.dataset.verified) {
          vBtn.style.borderColor = "#3b82f6"; vBtn.style.color = "#3b82f6";
        }
      });
      vBtn.addEventListener("mouseout", () => {
        if (!vBtn.disabled && !vBtn.dataset.verified) {
          vBtn.style.borderColor = "#e5e7eb"; vBtn.style.color = "#9ca3af";
        }
      });

      const vPanel = document.createElement("div");
      vPanel.className = "trust-panel";
      vPanel.style.cssText = [
        "display:none;margin-top:10px;padding:12px 14px;",
        "background:#f8faff;border:1px solid #dbeafe;",
        "border-radius:12px;font-size:12px;line-height:1.7;",
      ].join("");

      sourcesBadgeContainer.appendChild(vBtn);
      sourcesBadgeContainer.appendChild(vPanel);
      vBtn.addEventListener("click", () => window.verifyMessage(vBtn, vPanel, text, lastUserQ));
    }

  }, Math.min(800, text.length * 5));

  lucide.createIcons();

  const playBtn = div.querySelector(".play-btn");
  const downloadBtn = div.querySelector(".download-btn");

  // 🔊 PLAY AUDIO (SAFE)
  playBtn?.addEventListener("click", () => {
    if (!text) return;
    playBtn.classList.add("scale-110");
    readAloud(text, playBtn);
    setTimeout(() => playBtn.classList.remove("scale-110"), 200);
  });

  // ⬇️ DOWNLOAD AUDIO (FIXED)
  downloadBtn?.addEventListener("click", () => {
    if (!text) return;
    window.downloadAudio(text);
  });

  scrollToBottom();

  // 🎙️ AUTO-PLAY AUDIO IN RADIO MODE
  if (window.dynamoUI?.tools?.has('radio') && text && typeof readAloud === 'function') {
    setTimeout(() => {
      readAloud(text, playBtn);
    }, 500);
  }

  appendChatHistoryOnce("assistant", text);
  if (save) saveMessage("assistant", text);

  return div;
}
window.renderAssistantMessage = renderAssistantMessage;

/* =========================================================
   🔁 FOLLOW-UPS (Perplexity-style)
========================================================= */

async function generateFollowUps(userQuestion, aiResponse, bubbleWrapper) {
  if (!userQuestion || !aiResponse || !bubbleWrapper) return;

  try {
    const res = await window.backendFetch(`${window.BACKEND_URL}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userQuestion,
          response: aiResponse,
          user_id: window.appState?.supabaseUserId || ""
        })
    });
    const data = await res.json();
    const questions = data?.follow_ups;
    if (!questions || questions.length === 0) return;

    const section = document.createElement("div");
    section.className = "mt-4 pt-3 border-t border-gray-200 dark:border-gray-600";

    section.innerHTML = `
      <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 tracking-wide uppercase">Follow-ups</p>
      <div class="follow-up-list flex flex-col gap-1.5"></div>
    `;

    const list = section.querySelector(".follow-up-list");
    questions.forEach(q => {
      const btn = document.createElement("button");
      btn.className = [
        "flex items-start gap-2 text-left text-sm w-full",
        "py-2 px-0 border-b border-gray-100 dark:border-gray-700",
        "text-gray-700 dark:text-gray-300 hover:text-yellow-500 dark:hover:text-yellow-400",
        "transition-colors duration-150 group last:border-b-0"
      ].join(" ");
      
      const arrow = document.createElement("span");
      arrow.className = "mt-0.5 text-gray-400 group-hover:text-yellow-500 text-base leading-none select-none";
      arrow.textContent = "↳";
      
      const text = document.createElement("span");
      text.className = "leading-snug";
      text.textContent = q;
      
      btn.appendChild(arrow);
      btn.appendChild(text);
      
      btn.addEventListener("click", () => {
        if (typeof window.sendFromInputWithText === "function") {
          window.sendFromInputWithText(q);
        }
      });
      list.appendChild(btn);
    });

    bubbleWrapper.appendChild(section);
    scrollToBottom();
  } catch {
    // Silently ignore — follow-ups are optional
  }
}
window.generateFollowUps = generateFollowUps;

/* =========================================================
   ➕ NEW CHAT
========================================================= */

window.startNewChat = () => {
  window.setChatId(null);
  currentChatId = null;   // ✅ ADD THIS
  window.chatHistory = [];
  window.pendingUploadFile = null;
  window.pendingUploadFiles = [];
  window.clearUploadFile?.();
  chatContainer.innerHTML = "";
  showHero();
  window.loadChatSidebar();
};

/* =========================================================
   🧠 SMART ACTIONS HELPERS
========================================================= */

window.getLastAssistantMessage = () => {
  const assistantMsgs = window.chatHistory.filter(m => m.role === "assistant");
  return assistantMsgs.length ? assistantMsgs[assistantMsgs.length - 1].content : null;
};

window.RESEARCH_MODE_RULE = {
  purpose: "Research Mode produces a research response, not a paper by default.",
  behavior: [
    "Collect sources and evidence first.",
    "Summarize findings in a structured answer.",
    "Show citations and references when available.",
    "Only generate a formal article or paper if the user explicitly asks to write one.",
    "Do not infer 'write a paper' from a general research request.",
    "If the user asks to research, answer as a researcher; if the user asks to write, draft as a writer."
  ],
  outputOrder: [
    "1. Direct answer",
    "2. Key findings",
    "3. Evidence or citations",
    "4. Caveats / limitations",
    "5. Optional next steps"
  ]
};

window.getResearchModeInstruction = (message = "") => {
  const text = String(message).trim();
  const writeIntent = /(write|draft|generate|compose|create).*(paper|article|essay|report)|research paper|academic article|literature review/i.test(text);
  if (writeIntent) {
    return "Write a formal paper/article using the gathered sources and citations.";
  }
  return "Research this topic, gather sources, summarize findings, cite evidence, and do not write a formal paper/article unless explicitly asked.";
};

window.sendFromInputWithText = async (text) => {
  if (!chatInput) return;
  chatInput.value = text;
  await window.sendFromInput();
};

/* =========================================================
   FIND RESEARCH GAPS
========================================================= */

window.updateGapFinderBtn = () => {
  const btn   = document.getElementById("gap-finder-btn");
  const badge = document.getElementById("gap-finder-badge");
  if (!btn) return;

  const isDeep = window.dynamoUI?.tools?.has("deep") || false;

  if (isDeep) {
    btn.style.border       = "1.5px solid #EAB308";
    btn.style.color        = "#EAB308";
    btn.style.opacity      = "1";
    btn.style.cursor       = "pointer";
    btn.style.background   = "rgba(234,179,8,0.06)";
    btn.style.boxShadow    = "0 0 10px rgba(234,179,8,0.12)";
    btn.title              = "Find unexplored research angles";
    if (badge) { badge.style.background = "#EAB308"; badge.style.color = "#000"; }
  } else {
    btn.style.border       = "1.5px solid #2a2a2a";
    btn.style.color        = "#666";
    btn.style.opacity      = "0.45";
    btn.style.cursor       = "not-allowed";
    btn.style.background   = "transparent";
    btn.style.boxShadow    = "none";
    btn.title              = "Enable DeepThink to use this";
    if (badge) { badge.style.background = "#2a2a2a"; badge.style.color = "#666"; }
  }
};

window.findResearchGaps = async () => {
  // Pro-only gate
  const supa = window.appState?.supabaseUser;
  if (!supa) {
    renderAssistantMessage("🔒 Please **log in** to use Find Research Gaps.");
    return;
  }
  const plan = (supa.plan || "free").toLowerCase();
  if (plan !== "pro" && plan !== "pro_trial" && plan !== "pro_validation") {
    renderAssistantMessage("🔒 **Find Research Gaps** is a **Pro** feature. [Upgrade to Pro →](/pricing.html)");
    return;
  }

  const isDeep = window.dynamoUI?.tools?.has("deep") || false;
  if (!isDeep) return;

  const userId = window.appState?.supabaseUserId;
  if (!userId) {
    renderAssistantMessage("🔒 Please log in to use this feature.");
    return;
  }

  const lastReply = [...(window.chatHistory || [])]
    .reverse()
    .find(m => m.role === "assistant" && m.content && m.content.length > 50);

  if (!lastReply) {
    renderAssistantMessage("💡 Send a message first, then click Find Research Gaps to analyse the response.");
    return;
  }

  renderUserMessage("🔍 Find Research Gaps");
  showThinking();

  try {
    const res = await window.callBackend("/chat", {
      // Ask Gemini to act as a research analyst on the previous reply,
      // AND to web-search recent literature so the gaps are grounded in
      // *actual* unexplored territory — not just the model's prior beliefs.
      message: `You are a research analyst with web-search access.

CONTEXT — previous answer the user received:
"""
${lastReply.content.slice(0, 4000)}
"""

YOUR TASK:
1. Use web search to find recent (2024-2026) academic papers, reports, and discussions on this topic.
2. Compare what the previous answer covered against what is being actively studied right now.
3. Identify 3–5 SIGNIFICANT RESEARCH GAPS — unexplored angles, contested findings, or underrepresented perspectives that the previous answer MISSED or glossed over.

OUTPUT FORMAT (markdown):
For each gap, use this structure:

### Gap N: <Clear title>
**Why it matters:** 1–2 sentences on real-world impact.
**What's missing:** 1–2 sentences on what remains unstudied or contested.
**Suggested angle:** 1 concrete research question or experiment.

End with a "📚 Sources" section listing the URLs you actually used.`,
      history: [],
      use_search: true,        // ← critical: actually web-search to find real gaps
      deep_dive: true,         // ← uses gemini-3-flash-preview
      force_image: false,
      mode: "chat",
      citation_format: "inline",
      chat_id: currentChatId,
      user_id: userId
    });

    hideThinking();

    if (res?.chat_id) currentChatId = res.chat_id;

    const reply = res?.reply || res?.content || "";
    if (reply) {
      renderAssistantMessage(reply);
      window.chatHistory.push({ role: "assistant", content: reply });
    } else {
      renderAssistantMessage("⚠️ Could not identify research gaps. Please try again.");
    }
  } catch (err) {
    hideThinking();
    renderAssistantMessage("⚠️ Error finding research gaps. Please try again.");
    console.error("[Gap Finder]", err);
  }
};

/* =========================================================
   🔬 TRUST LAYER — verify any chat message against papers
=========================================================
   Called when the user clicks the "Verify" shield button on an
   assistant bubble. Hits the same /deep-research/verify-papers
   endpoint used by the Deep Research "Verify with Papers" button.
   Results render INLINE inside that message — no new chat bubble.
========================================================= */

window.verifyMessage = async function (btn, panel, rawText, userQuery) {
  const userId = window.appState?.supabaseUserId;
  if (!userId) {
    btn.style.color = "#ef4444"; btn.textContent = "Sign in to verify";
    return;
  }

  // If already verified — toggle panel open/close
  if (btn.dataset.verified) {
    if (panel.style.display === "none") {
      panel.style.display = "block";
      btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verified · hide`;
    } else {
      panel.style.display = "none";
      btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verified · show`;
    }
    return;
  }

  // Start verification
  btn.disabled = true;
  btn.style.opacity = "0.65";
  btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Verifying…`;

  panel.style.display = "block";
  panel.innerHTML = `<span style="color:#6b7280;font-style:italic;">🔬 Fetching papers from Semantic Scholar and cross-checking claims…</span>`;

  try {
    const res = await window.callBackend("/deep-research/verify-papers", {
      query:          userQuery || rawText.slice(0, 120),
      report_excerpt: rawText.slice(0, 4000),
      user_id:        userId,
    });

    const verif = res?.verification || "";
    if (verif) {
      try   { panel.innerHTML = marked.parse(verif); }
      catch { panel.innerText = verif; }
      if (window.lucide) window.lucide.createIcons();
    } else {
      panel.innerHTML = `<span style="color:#9ca3af;">No papers found for this topic on Semantic Scholar.</span>`;
    }

    // Mark as done — button becomes a toggle
    btn.dataset.verified = "1";
    btn.style.color        = "#16a34a";
    btn.style.borderColor  = "#86efac";
    btn.style.background   = "#f0fdf4";
    btn.style.opacity      = "1";
    btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verified · hide`;

  } catch (err) {
    panel.innerHTML = `<span style="color:#ef4444;">⚠️ Verification failed: ${err.message}</span>`;
    btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Retry`;
    btn.style.opacity = "1";
    btn.disabled = false;
    return;
  }

  btn.disabled = false;
};

/* =========================================================
   DATA ANALYSIS FEATURE  (Tools ⚙️ → Data Analysis)
   Completely separate from existing file upload / chat-with-file.
   Only these functions are new — nothing above is touched.
========================================================= */

window.openDataAnalysis = function () {
  const userId = window.appState?.supabaseUserId;
  if (!userId) {
    renderAssistantMessage("🔒 Please log in to use Data Analysis.");
    return;
  }

  const _daUser = window.appState?.supabaseUser;
  const _daPlan = (_daUser?.plan || "free").toLowerCase();
  const isPro = _daPlan === "pro" || _daPlan === "pro_trial" || _daPlan === "pro_validation";
  if (!isPro) {
    renderAssistantMessage(
      "🔒 **Data Analysis** is a **Pro** feature.\n\n" +
      "Unlock full spreadsheet analysis — charts, quartiles, outlier detection, and AI-powered insights.\n\n" +
      "[Upgrade to Pro →](/pricing.html)"
    );
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,.xlsx,.xls";
  input.style.display = "none";
  document.body.appendChild(input);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    document.body.removeChild(input);
    if (!file) return;

    hideHero();

    // ── Step 1: Show "what do you want to know?" card ────────────
    const promptCardId = "da-prompt-card-" + Date.now();
    const promptCard = document.createElement("div");
    promptCard.className = "flex justify-start mb-4";
    promptCard.id = promptCardId;
    promptCard.innerHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;
                  padding:18px 20px;max-width:560px;width:100%;
                  box-shadow:0 1px 6px rgba(0,0,0,0.07);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
          <span style="font-size:20px;">📂</span>
          <div>
            <div style="color:#0f172a;font-weight:700;font-size:14px;">${file.name}</div>
            <div style="color:#94a3b8;font-size:11px;">${(file.size / 1024).toFixed(0)} KB · CSV / Excel</div>
          </div>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;color:#475569;font-size:12px;font-weight:600;margin-bottom:6px;">
            What would you like to know?
            <span style="color:#94a3b8;font-weight:400;"> (optional — leave blank for full analysis)</span>
          </label>
          <textarea id="da-q-${promptCardId}"
            placeholder="e.g. Which stocks performed best? · What are the key trends? · Summarise my P&L · Show me outliers…"
            style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;
                   font-size:13px;resize:vertical;min-height:76px;outline:none;color:#0f172a;
                   background:#f8fafc;font-family:inherit;line-height:1.5;box-sizing:border-box;"
            onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey))document.getElementById('da-go-${promptCardId}').click()"
          ></textarea>
          <div style="color:#94a3b8;font-size:10px;margin-top:3px;">Ctrl+Enter to start</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="da-go-${promptCardId}"
            style="background:#eab308;color:#0f172a;font-weight:700;font-size:13px;
                   padding:9px 22px;border-radius:9px;border:none;cursor:pointer;
                   display:inline-flex;align-items:center;gap:6px;"
            onmouseover="this.style.background='#ca8a04'"
            onmouseout="this.style.background='#eab308'">
            📈 Analyse →
          </button>
          <button onclick="document.getElementById('${promptCardId}').remove()"
            style="background:transparent;color:#94a3b8;font-size:12px;padding:9px 14px;
                   border:1px solid #e2e8f0;border-radius:9px;cursor:pointer;font-weight:500;"
            onmouseover="this.style.color='#475569'"
            onmouseout="this.style.color='#94a3b8'">Cancel</button>
        </div>
      </div>`;

    chatContainer.appendChild(promptCard);
    scrollToBottom();
    setTimeout(() => document.getElementById(`da-q-${promptCardId}`)?.focus(), 80);

    // ── Step 2: On submit → run analysis ─────────────────────────
    document.getElementById(`da-go-${promptCardId}`).addEventListener("click", async () => {
      const question = (document.getElementById(`da-q-${promptCardId}`)?.value || "").trim();
      promptCard.remove();

      renderUserMessage(`📊 Data Analysis: ${file.name}${question ? `\n\n"${question}"` : ""}`);

      const loadingEl = document.createElement("div");
      loadingEl.className = "flex justify-start mb-4";
      loadingEl.innerHTML = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;
                    padding:16px 20px;max-width:380px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <div style="color:#d97706;font-weight:700;font-size:13px;margin-bottom:6px;">📈 Analysing your data…</div>
          <div style="color:#94a3b8;font-size:12px;margin-bottom:12px;">
            Reading rows · computing quartiles · detecting outliers · generating chart
          </div>
          <div class="dynamo-spinner"></div>
        </div>`;
      chatContainer.appendChild(loadingEl);
      scrollToBottom();

      try {
        const fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result.split(",")[1]) || "");
          reader.onerror = () => reject(new Error("File read failed"));
          reader.readAsDataURL(file);
        });

        const res = await window.backendFetch(`${window.BACKEND_URL}/data-analysis-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_data: fileBase64,
            file_name: file.name,
            message:   question,
            user_id:   userId,
          }),
        }).then(r => r.json());

        loadingEl.remove();

        if (!res || res.type !== "data_analysis") {
          renderAssistantMessage(res?.content || "⚠️ Analysis failed. Please try again.");
          return;
        }

        _renderDataAnalysisResult(res);

      } catch (err) {
        loadingEl.remove();
        renderAssistantMessage(`⚠️ Data analysis error: ${err.message}`);
      }
    });
  });

  input.click();
};

function _renderDataAnalysisResult(res) {
  const filename = res.filename || "data";
  const st = res.stats || {};

  // ── KPI cards ────────────────────────────────────────────────────
  let kpiHtml = "";
  if (st.sum !== undefined) {
    const fmt = v => {
      if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + "M";
      if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + "K";
      return v.toFixed(2);
    };
    const kpis = [
      { icon: "📋", val: (res.rowCount || 0).toLocaleString(), lbl: "Rows Analysed" },
      { icon: "∑",  val: fmt(st.sum),  lbl: "Total Sum" },
      { icon: "🎯", val: st.win_rate !== undefined ? st.win_rate.toFixed(1) + "%" : "—", lbl: "Win Rate" },
      { icon: "📊", val: st.mean !== undefined ? fmt(st.mean) : "—", lbl: "Average" },
    ];
    kpiHtml = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        ${kpis.map(k => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
                      padding:12px 8px;text-align:center;">
            <div style="font-size:20px;margin-bottom:4px;">${k.icon}</div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;">${k.val}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${k.lbl}</div>
          </div>`).join("")}
      </div>`;
  }

  // ── Table preview ────────────────────────────────────────────────
  let tableHtml = "";
  const cols = (res.table?.columns || []).slice(0, 8);
  const rows = (res.table?.rows   || []).slice(0, 5);
  if (cols.length) {
    const thCells = cols.map(c =>
      `<th style="padding:7px 10px;background:#f1f5f9;color:#475569;text-align:left;
                  border-bottom:2px solid #e2e8f0;white-space:nowrap;font-size:11px;
                  font-weight:600;">${c}</th>`
    ).join("");
    const bodyRows = rows.map((row, ri) =>
      `<tr style="background:${ri % 2 === 0 ? "#fff" : "#f8fafc"}">
        ${cols.map((_, i) =>
          `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155;
                      font-size:11px;white-space:nowrap;max-width:150px;
                      overflow:hidden;text-overflow:ellipsis;">${row[i] ?? ""}</td>`
        ).join("")}
       </tr>`
    ).join("");
    const extra = (res.table.columns?.length || 0) > 8
      ? `<div style="color:#94a3b8;font-size:10px;margin-top:5px;">
           +${res.table.columns.length - 8} more columns hidden</div>` : "";
    tableHtml = `
      <div style="margin-bottom:16px;">
        <div style="color:#64748b;font-size:10px;font-weight:700;margin-bottom:6px;
                    text-transform:uppercase;letter-spacing:.06em;">
          📋 Data Preview — first 5 of ${res.rowCount} rows
        </div>
        <div style="overflow-x:auto;border-radius:8px;border:1px solid #e2e8f0;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>${thCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
        ${extra}
      </div>`;
  }

  // ── Chart ────────────────────────────────────────────────────────
  const chartHtml = res.chart
    ? `<div style="margin-bottom:16px;">
         <div style="color:#64748b;font-size:10px;font-weight:700;margin-bottom:6px;
                     text-transform:uppercase;letter-spacing:.06em;">📈 Visual Analysis</div>
         <img src="${res.chart}"
              style="width:100%;border-radius:10px;display:block;border:1px solid #e2e8f0;"
              alt="Data Analysis Chart" />
       </div>`
    : "";

  // ── Download + hint ──────────────────────────────────────────────
  let downloadHtml = "";
  if (res.downloadCsv) {
    const safeName = filename.replace(/\.[^.]+$/, "");
    downloadHtml = `
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;
                  display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <a href="data:text/csv;base64,${res.downloadCsv}"
           download="${safeName}_summary.csv"
           style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;
                  border:1px solid #86efac;color:#16a34a;padding:8px 16px;
                  border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;"
           onmouseover="this.style.background='#dcfce7'"
           onmouseout="this.style.background='#f0fdf4'">
          ⬇️ Download Summary CSV
        </a>
        <span style="color:#94a3b8;font-size:11px;">💬 Type a follow-up question below to dig deeper</span>
      </div>`;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "flex justify-start mb-4";
  wrapper.innerHTML = `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;
                padding:20px 22px;max-width:800px;width:100%;
                box-shadow:0 1px 8px rgba(0,0,0,0.07);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;
                  padding-bottom:14px;border-bottom:2px solid #f1f5f9;">
        <span style="font-size:22px;">📈</span>
        <div>
          <div style="color:#0f172a;font-weight:700;font-size:15px;">Data Analysis Report</div>
          <div style="color:#64748b;font-size:11px;">${filename} · ${res.rowCount} rows analysed</div>
        </div>
      </div>
      ${kpiHtml}
      ${tableHtml}
      ${chartHtml}
      <div style="color:#64748b;font-size:10px;font-weight:700;margin-bottom:10px;
                  text-transform:uppercase;letter-spacing:.06em;">🤖 AI Analysis</div>
      <div class="da-analysis-text"
           style="color:#1e293b;font-size:14px;line-height:1.8;"></div>
      ${downloadHtml}
    </div>`;

  chatContainer.appendChild(wrapper);

  const textEl = wrapper.querySelector(".da-analysis-text");
  if (textEl) {
    if (window.renderMarkdown) {
      textEl.innerHTML = window.renderMarkdown(res.content || "");
    } else {
      textEl.innerHTML = (res.content || "")
        .replace(/^## (.+)$/gm,
          '<h3 style="color:#0f172a;font-size:14px;font-weight:700;margin:16px 0 6px;' +
          'padding-bottom:5px;border-bottom:1px solid #f1f5f9;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>')
        .replace(/^- (.+)$/gm, '<li style="margin:4px 0 4px 18px;color:#1e293b;">$1</li>')
        .replace(/\n\n/g, "<br>")
        .replace(/\n/g, "<br>");
    }
  }

  scrollToBottom();
  window.chatHistory.push({ role: "assistant", content: "[Data Analysis Complete]" });
  if (window.appState?.supabaseUserId) saveMessage("assistant", "[Data Analysis Complete]");
}

/* =========================================================
   AUTO LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const checkUser = setInterval(() => {
    if (window.appState?.supabaseUserId) {
      window.loadChatSidebar();
      clearInterval(checkUser);
    }
  }, 300);
});