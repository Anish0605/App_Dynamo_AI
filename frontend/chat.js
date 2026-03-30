// chat.js — Dynamo AI (FINAL PRODUCTION READY 🚀 + SEARCH + AUDIO + SMART AI)

console.log("chat.js loaded");
console.log("chat.js fully loaded ✅");
/* ---------------- DOM ---------------- */
const chatContainer = document.getElementById("chat-messages");
const heroSection = document.getElementById("hero-section");
const chatInput = document.getElementById("chat-input");

/* ---------------- STATE ---------------- */
window.chatHistory = [];
window.isAnalyzingFile = false;
let lastChatType = null;
let currentChatId = null;

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
  return /(create|generate|draw|image|picture|illustration|visual|art)/i.test(text);
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
}

function showHero() {
  if (heroSection) heroSection.style.display = "flex";
}

window.hideHero = hideHero;
window.showHero = showHero;

function scrollToBottom() {
  chatContainer?.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: "smooth"
  });
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

  const { data, error } = await supabaseClient
    .from("chats")
    .insert({
      user_id: userId, // ✅ always correct user
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
}

async function saveMessage(role, text) {
  const chatId = await ensureChat(text);
  if (!chatId) return;

  await supabaseClient.from("messages").insert({
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

/* =========================================================
   LIMIT
========================================================= */

async function checkMessageLimit() {
  const user = window.appState?.supabaseUser;

  if (!user) {
    return { allowed: false };
  }

  const plan = user.plan || "free";

  let limit = 10;

  if (plan === "plus" || plan === "pro") {
    limit = 100;
  }

  const used = user.daily_quota_used || 0;

  if (used >= limit) {
    return {
      allowed: false,
      message: `⚠️ You have reached your daily limit of ${limit} messages.`
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
  
  console.log("🎙️ Starting radio mode interview:", filename);
  
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
  
  // Allow sending if there's a message OR a pending file
  const hasFile = window.pendingUploadFile && window.pendingUploadFile.size > 0;
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
    const fileLabel = isRadioMode ? `📎 Discussing: ${window.pendingUploadFile.name}` : `📎 Analyzing: ${window.pendingUploadFile.name}`;
    renderUserMessage(fileLabel);
  }

  // 🔒 LOGIN CHECK
  if (!userId) {
    renderAssistantMessage("🔒 Please login / sign up to use DynamoAI.");
    window.isSending = false;
    return;
  }

  chatInput.value = "";

  const limit = await checkMessageLimit();
  if (!limit.allowed) {
    renderAssistantMessage(limit.message || "⚠️ Daily limit reached.");
    window.isSending = false;
    window.pendingUploadFile = null;
    window.clearUploadFile?.();
    return;
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
    const cleanHistory = window.chatHistory
      .slice(-15)
      .filter(msg => {
        const content = msg.content || "";
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
    // If file is attached, use FormData for analysis/dialogue
    else if (hasFile) {
      const fd = new FormData();
      fd.append("file", window.pendingUploadFile);
      fd.append("message", msg);
      fd.append("history", JSON.stringify(cleanHistory));
      fd.append("use_search", isRadioMode ? "false" : "true");
      fd.append("deep_dive", isRadioMode ? "false" : "true");
      fd.append("chat_id", currentChatId || "");
      fd.append("user_id", window.appState?.supabaseUserId || "");
      
      res = await fetch(`${window.BACKEND_URL}/chat-with-file`, {
        method: "POST",
        body: fd
      }).then(r => r.json());
      
      // Clear file after sending
      window.pendingUploadFile = null;
      window.clearUploadFile?.();
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
        message: isQuiz ? buildQuizPrompt(msg) : msg,
        history: cleanHistory,
        use_search: isSearchMode,
        deep_dive: isDeepMode,
        force_image: forceImage,
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
              console.log("Share cancelled");
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
        let cleanText = res.content.trim();

        cleanText = cleanText
          .replace(/```json/g, "")
          .replace(/```/g, "");

        const start = cleanText.indexOf("{");
        const end = cleanText.lastIndexOf("}");

        if (start !== -1 && end !== -1) {
          cleanText = cleanText.slice(start, end + 1);
        }

        const parsed = JSON.parse(cleanText);

        window.renderQuiz(parsed.quiz);
        
        // ✅ Don't save quiz to chatHistory - it contaminates context
        window.chatHistory.push({ role: "assistant", content: "[Quiz rendered]" });

        return; // ✅ CRITICAL FIX (STOP DOUBLE RESPONSE)

      } catch (e) {
        console.warn("Quiz parse failed");
      }
    }

    // ---------------- SINGLE RESPONSE (FIX) ----------------
    // Sources only show in Research Mode + Web Search combo
    const showSources = (window.dynamoUI?.model === 'research' && window.dynamoUI?.tools?.has('search')) || false;
    const sources = showSources ? (res.sources || []) : [];
    const msgDiv = renderAssistantMessage(res.content || "", res.content, true, sources);

    // 🔁 Generate follow-ups after response renders (async, non-blocking)
    const lastUserMsg = window.chatHistory.filter(m => m.role === "user").slice(-1)[0]?.content || "";
    if (lastUserMsg && res.content) {
      setTimeout(() => generateFollowUps(lastUserMsg, res.content, msgDiv), 800);
    }
  } catch (e) {
  console.error("Chat error:", e);
  hideThinking();
  renderAssistantMessage("⚠️ Something went wrong. Please try again.");
} finally {
  window.isSending = false;
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
      console.log("🎙️ Auto-playing AI response in radio mode");
      readAloud(text, playBtn);
    }, 500);
  }

  window.chatHistory.push({ role: "assistant", content: text });
  if (save) saveMessage("assistant", text);

  return div;
}
window.renderAssistantMessage = renderAssistantMessage;

/* =========================================================
   🔁 FOLLOW-UPS (Perplexity-style)
========================================================= */

async function generateFollowUps(userQuestion, aiResponse, parentDiv) {
  if (!userQuestion || !aiResponse || !parentDiv) return;

  try {
    const res = await fetch(`${window.BACKEND_URL}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userQuestion, response: aiResponse })
    });
    const data = await res.json();
    const questions = data?.follow_ups;
    if (!questions || questions.length === 0) return;

    const bubbleWrapper = parentDiv.querySelector(".assistant-msg-wrapper");
    if (!bubbleWrapper) return;

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
      btn.innerHTML = `
        <span class="mt-0.5 text-gray-400 group-hover:text-yellow-500 text-base leading-none select-none">↳</span>
        <span class="leading-snug">${q}</span>
      `;
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

window.sendFromInputWithText = async (text) => {
  if (!chatInput) return;
  chatInput.value = text;
  await window.sendFromInput();
};

/* =========================================================
   AUTO LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const checkUser = setInterval(() => {
    if (window.appState?.supabaseUserId) {
      console.log("User ready → loading chats");
      window.loadChatSidebar();
      clearInterval(checkUser);
    }
  }, 300);
});
}