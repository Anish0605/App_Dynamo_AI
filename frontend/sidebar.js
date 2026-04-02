// sidebar.js — Dynamo AI (IMPROVED UX)
console.log("sidebar.js loaded");

/* =========================================================
   LOAD SIDEBAR
========================================================= */

window.loadChatSidebar = async () => {
  const userId = window.appState.supabaseUserId;
  const box = document.getElementById("history-list");
  if (!box) return;

  if (!userId) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2 py-1">Login to see chats</div>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("is_starred", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Sidebar load error:", error);
    box.innerHTML = `<div class="text-xs text-red-400 px-2 py-1">Failed to load chats</div>`;
    return;
  }

  window.allChats = data || [];
  box.innerHTML = "";

  if (!data || data.length === 0) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2 py-1">No recent chats</div>`;
    return;
  }

  const pinned = data.filter(c => c.is_starred);
  const recent = data.filter(c => !c.is_starred);

  if (pinned.length > 0) {
    box.appendChild(sectionLabel("Pinned"));
    pinned.forEach(chat => renderSidebarItem(chat, box));
  }

  if (recent.length > 0) {
    if (pinned.length > 0) {
      box.appendChild(sectionLabel("Recent"));
    }
    recent.forEach(chat => renderSidebarItem(chat, box));
  }
};

/* =========================================================
   SEARCH FILTER
========================================================= */

window.filterChats = (query) => {
  const box = document.getElementById("history-list");
  if (!box) return;

  const filtered = (window.allChats || []).filter(chat =>
    (chat.title || "").toLowerCase().includes(query.toLowerCase())
  );

  box.innerHTML = "";

  if (filtered.length === 0) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2 py-1">No chats found</div>`;
    return;
  }

  filtered.forEach(chat => renderSidebarItem(chat, box));
};

/* =========================================================
   SECTION LABEL
========================================================= */

function sectionLabel(text) {
  const el = document.createElement("div");
  el.className = "text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 pt-3 pb-1 select-none";
  el.textContent = text;
  return el;
}

/* =========================================================
   SVG ICONS
========================================================= */

function iconPin(filled) {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </svg>`;
}

function iconPencil() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
  </svg>`;
}

function iconTrash() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>`;
}

function iconSparkle() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.91 3.57a1 1 0 0 0-.36 1.12L17.5 20l-4.91-3.57a1 1 0 0 0-1.18 0L6.5 20l1.88-5.86a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69Z"/>
  </svg>`;
}

/* =========================================================
   RENDER ITEM
========================================================= */

function renderSidebarItem(chat, box) {
  const isActive = window.appState.chatId === chat.id;

  const wrapper = document.createElement("div");
  wrapper.className = [
    "group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150",
    isActive
      ? "bg-yellow-100 dark:bg-yellow-900/30 shadow-sm"
      : "hover:bg-gray-200 dark:hover:bg-gray-700/70"
  ].join(" ");

  /* --- Pin badge (visible when pinned) --- */
  if (chat.is_starred) {
    const badge = document.createElement("span");
    badge.className = "flex-shrink-0 text-yellow-500";
    badge.innerHTML = iconPin(true);
    wrapper.appendChild(badge);
  }

  /* --- Title --- */
  const title = document.createElement("div");
  title.className = [
    "flex-1 text-[13px] font-semibold truncate",
    isActive
      ? "text-yellow-700 dark:text-yellow-300"
      : "text-gray-800 dark:text-gray-100"
  ].join(" ");
  title.innerText = chat.title || "New Chat";
  title.onclick = async () => {
    window.setChatId(chat.id);
    await window.loadChatHistory();
    await window.loadChatSidebar();
  };

  /* --- Action buttons --- */
  const actions = document.createElement("div");
  actions.className = "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0";

  /* Pin / Unpin */
  const pinBtn = makeActionBtn(
    iconPin(chat.is_starred),
    chat.is_starred ? "Unpin" : "Pin",
    chat.is_starred
      ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
      : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20",
    async (e) => {
      e.stopPropagation();
      await window.supabaseClient.from("chats").update({ is_starred: !chat.is_starred }).eq("id", chat.id);
      window.loadChatSidebar();
    }
  );

  /* Rename */
  const renameBtn = makeActionBtn(
    iconPencil(),
    "Rename",
    "text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30",
    (e) => {
      e.stopPropagation();
      startInlineRename(title, chat, wrapper);
    }
  );

  /* Smart AI Rename */
  const smartBtn = makeActionBtn(
    iconSparkle(),
    "Smart Rename",
    "text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30",
    async (e) => {
      e.stopPropagation();
      await smartRename(chat, title);
    }
  );

  /* Delete */
  const delBtn = makeActionBtn(
    iconTrash(),
    "Delete",
    "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30",
    async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this chat?")) return;
      await window.supabaseClient.from("messages").delete().eq("chat_id", chat.id);
      await window.supabaseClient.from("chats").delete().eq("id", chat.id);
      if (window.appState.chatId === chat.id) {
        window.setChatId(null);
        const chatContainer = document.getElementById("chat-messages");
        if (chatContainer) chatContainer.innerHTML = "";
        if (typeof showHero === "function") showHero();
      }
      window.loadChatSidebar();
    }
  );

  actions.appendChild(pinBtn);
  actions.appendChild(renameBtn);
  actions.appendChild(smartBtn);
  actions.appendChild(delBtn);

  wrapper.appendChild(title);
  wrapper.appendChild(actions);
  box.appendChild(wrapper);
}

/* =========================================================
   ACTION BUTTON HELPER
========================================================= */

function makeActionBtn(iconHtml, tooltip, colorClass, onClick) {
  const btn = document.createElement("button");
  btn.title = tooltip;
  btn.className = `p-1.5 rounded-lg transition-all duration-150 ${colorClass}`;
  btn.innerHTML = iconHtml;
  btn.onclick = onClick;
  return btn;
}

/* =========================================================
   INLINE RENAME
========================================================= */

function startInlineRename(titleEl, chat, wrapper) {
  const currentTitle = chat.title || "New Chat";

  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTitle;
  input.className = "flex-1 text-[13px] font-semibold bg-white dark:bg-gray-800 border border-yellow-400 rounded-lg px-2 py-0.5 outline-none text-gray-800 dark:text-gray-100 w-full";

  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const save = async () => {
    const newTitle = input.value.trim() || currentTitle;
    await window.supabaseClient.from("chats").update({ title: newTitle }).eq("id", chat.id);
    chat.title = newTitle;
    titleEl.innerText = newTitle;
    input.replaceWith(titleEl);
    const idx = (window.allChats || []).findIndex(c => c.id === chat.id);
    if (idx !== -1) window.allChats[idx].title = newTitle;
  };

  const cancel = () => {
    input.replaceWith(titleEl);
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", save); cancel(); }
  });
}

/* =========================================================
   SMART AI RENAME
========================================================= */

async function smartRename(chat, titleEl) {
  titleEl.innerText = "Renaming…";
  titleEl.classList.add("opacity-50");

  try {
    const { data: messages } = await supabaseClient
      .from("messages")
      .select("role, content")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true })
      .limit(4);

    if (!messages || messages.length === 0) {
      titleEl.innerText = chat.title || "New Chat";
      titleEl.classList.remove("opacity-50");
      return;
    }

    const preview = messages
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${(m.content?.text || "").slice(0, 80)}`)
      .join("\n");

    const prompt = `Given this chat snippet, write a concise title (max 5 words, no quotes):\n\n${preview}`;

    const res = await window.callBackend("/chat", {
      message: prompt,
      model: "gemini-3.1-flash-lite",
      tools: [],
      history: []
    });

    const newTitle = (res?.reply || "").trim().replace(/^["']|["']$/g, "").slice(0, 50) || chat.title || "New Chat";

    await window.supabaseClient.from("chats").update({ title: newTitle }).eq("id", chat.id);
    chat.title = newTitle;
    titleEl.innerText = newTitle;

    const idx = (window.allChats || []).findIndex(c => c.id === chat.id);
    if (idx !== -1) window.allChats[idx].title = newTitle;

  } catch (err) {
    console.error("❌ Smart rename error:", err);
    titleEl.innerText = chat.title || "New Chat";
  }

  titleEl.classList.remove("opacity-50");
}

/* =========================================================
   LOAD CHAT HISTORY (MESSAGES)
========================================================= */

window.loadChatHistory = async () => {
  const chatId = window.appState.chatId;
  if (!chatId) return;

  const { data } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  const chatContainer = document.getElementById("chat-messages");
  if (!chatContainer) return;

  chatContainer.innerHTML = "";
  window.chatHistory = [];

  data?.forEach(msg => {
    // Handle both storage formats: plain string OR {text: "..."} JSON object
    const rawContent = msg.content;
    const text = (typeof rawContent === "string" ? rawContent : rawContent?.text) || "";
    if (!text) return; // skip empty messages
    if (msg.role === "user") {
      window.renderUserMessage(text, false);
    } else {
      window.renderAssistantMessage(marked.parse(text), text, false);
    }
  });

  if (typeof window.hideHero === "function") window.hideHero();
};

/* =========================================================
   SEARCH INPUT LISTENER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("chat-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    if (!value) {
      window.loadChatSidebar();
    } else {
      window.filterChats(value);
    }
  });
});
