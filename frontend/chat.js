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

/* ---------------- IMAGE INTENT ---------------- */
function isImagePrompt(text) {
  return /(create|generate|draw|image|picture|illustration|visual|art)/i.test(text);
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

  if (plan === "plus") {
    limit = 100; // or Infinity if you want
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
   🚀 SEND MESSAGE (FIXED - NO DUPLICATES)
========================================================= */
window.sendFromInput = async () => {
    if (window.isSending) return;
    window.isSending = true;
  const msg = chatInput.value.trim();
  if (!msg) {
  window.isSending = false;
  return;
}

  const userId = window.appState?.supabaseUserId;

  // ✅ ALWAYS SHOW USER MESSAGE
  renderUserMessage(msg);

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
    return;
  }

  showThinking();

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

    const payload = {
      message: isQuizPrompt(msg) ? buildQuizPrompt(msg) : msg,
      history: cleanHistory,
      use_search: true,
      deep_dive: true,
      force_image: isImagePrompt(msg),
      chat_id: currentChatId,
      user_id: window.appState?.supabaseUserId
    };

    const res = await window.callBackend("/chat", payload);

    if (res?.chat_id) {
      currentChatId = res.chat_id;
    }

    hideThinking();

    // ✅ Increment local quota count so frontend check stays accurate
    if (window.appState?.supabaseUser) {
      window.appState.supabaseUser.daily_quota_used = (window.appState.supabaseUser.daily_quota_used || 0) + 1;
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
    renderAssistantMessage(res.content || "", res.content);
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
function renderAssistantMessage(html, rawText = "", save = true) {
  hideHero();

  const div = document.createElement("div");
  div.className = "flex justify-start mb-4";

  // ✅ SINGLE message box (FIXED)
  div.innerHTML = `
    <div class="flex items-start gap-2">

      <div class="bg-gray-100 dark:bg-gray-700 dark:text-white dark:border dark:border-gray-600 px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow assistant-msg">
      </div>

      <div class="flex flex-col gap-1 mt-1">
        <button class="play-btn text-yellow-400 hover:text-yellow-500 transition">
          <i data-lucide="play"></i>
        </button>
        <button class="download-btn text-yellow-400 hover:text-yellow-500 transition">
          <i data-lucide="download"></i>
        </button>
      </div>

    </div>
  `;

  chatContainer.appendChild(div);

  // ✅ USE SAME BOX (NO DOUBLE BOX)
  const messageBox = div.querySelector(".assistant-msg");

  const text = rawText || html || "";

  const stopTyping = typeText(messageBox, text);

    setTimeout(() => {
  stopTyping(); // 🔥 STOP typing loop

  try {
    messageBox.innerHTML = marked.parse(text);
  } catch {
    messageBox.innerText = text;
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

    setTimeout(() => {
      playBtn.classList.remove("scale-110");
    }, 200);
  });

  // ⬇️ DOWNLOAD AUDIO (FIXED)
  downloadBtn?.addEventListener("click", () => {
    if (!text) return;
    window.downloadAudio(text);
  });

  scrollToBottom();

  window.chatHistory.push({ role: "assistant", content: text });
  if (save) saveMessage("assistant", text);
}
window.renderAssistantMessage = renderAssistantMessage;

/* =========================================================
   ➕ NEW CHAT
========================================================= */

window.startNewChat = () => {
  window.setChatId(null);
  currentChatId = null;   // ✅ ADD THIS
  window.chatHistory = [];
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