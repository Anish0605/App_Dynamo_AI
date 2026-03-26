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
    const payload = {
      message: isQuizPrompt(msg) ? buildQuizPrompt(msg) : msg,
      history: window.chatHistory.slice(-10),
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

    // ---------------- IMAGE ----------------
    if (res?.type === "image_v2" && res.content) {
      renderAssistantMessage(`<img src="${res.content}" class="rounded-lg"/>`);
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

// ---------------- ASSISTANT MESSAGE ----------------
function renderAssistantMessage(html, rawText = "", save = true) {
  hideHero();

  const div = document.createElement("div");
  div.className = "flex justify-start mb-4";

  // ✅ SINGLE message box (FIXED)
  div.innerHTML = `
    <div class="flex items-start gap-2">

      <div class="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow assistant-msg">
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