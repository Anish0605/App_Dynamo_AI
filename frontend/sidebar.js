// sidebar.js — Dynamo AI (CHAT HISTORY + SEARCH + ACTIONS)
console.log("sidebar.js loaded");

/* =========================================================
   ⭐ LOAD SIDEBAR
========================================================= */

window.loadChatSidebar = async () => {
  const userId = window.appState.supabaseUserId;

  const box = document.getElementById("history-list");
  if (!box) return;

  // 🔒 Not logged in
  if (!userId) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2">Login to see chats</div>`;
    return;
  }

  const { data } = await supabaseClient
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("is_starred", { ascending: false })
    .order("created_at", { ascending: false });

  window.allChats = data || [];

  box.innerHTML = "";

  if (!data || data.length === 0) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2">No recent chats...</div>`;
    return;
  }

  data.forEach(chat => renderSidebarItem(chat));
};

/* =========================================================
   🔍 SEARCH
========================================================= */

window.filterChats = (query) => {
  const box = document.getElementById("history-list");
  if (!box) return;

  const filtered = window.allChats.filter(chat =>
    (chat.title || "").toLowerCase().includes(query.toLowerCase())
  );

  box.innerHTML = "";

  if (filtered.length === 0) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2">No chats found</div>`;
    return;
  }

  filtered.forEach(chat => renderSidebarItem(chat));
};

/* =========================================================
   🧱 SIDEBAR ITEM
========================================================= */

function renderSidebarItem(chat) {
  const box = document.getElementById("history-list");

  const wrapper = document.createElement("div");
  const isActive = window.appState.chatId === chat.id;

  wrapper.className = `
    group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer
    ${isActive ? "bg-yellow-100" : "hover:bg-gray-100"}
  `;

  const title = document.createElement("div");
  title.className = "text-[13px] truncate";
  title.innerText = chat.title || "New Chat";

  title.onclick = async () => {
    window.setChatId(chat.id);
    await window.loadChatHistory();
    await window.loadChatSidebar();
  };

  /* ACTIONS */
  const actions = document.createElement("div");
  actions.className = "flex gap-2 opacity-0 group-hover:opacity-100";

  /* ⭐ STAR */
  const star = document.createElement("button");
  star.innerText = chat.is_starred ? "⭐" : "☆";

  star.onclick = async (e) => {
    e.stopPropagation();

    await supabaseClient
      .from("chats")
      .update({ is_starred: !chat.is_starred })
      .eq("id", chat.id);

    window.loadChatSidebar();
  };

  /* ❌ DELETE */
  const del = document.createElement("button");
  del.innerText = "✕";

  del.onclick = async (e) => {
    e.stopPropagation();

    if (!confirm("Delete this chat?")) return;

    await supabaseClient.from("messages").delete().eq("chat_id", chat.id);
    await supabaseClient.from("chats").delete().eq("id", chat.id);

    if (window.appState.chatId === chat.id) {
      window.setChatId(null);

      const chatContainer = document.getElementById("chat-messages");
      if (chatContainer) chatContainer.innerHTML = "";

      if (typeof showHero === "function") showHero();
    }

    window.loadChatSidebar();
  };

  actions.appendChild(star);
  actions.appendChild(del);

  wrapper.appendChild(title);
  wrapper.appendChild(actions);

  box.appendChild(wrapper);
}

/* =========================================================
   📜 LOAD CHAT HISTORY
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
    const text = msg.content?.text || "";

    if (msg.role === "user") {
      renderUserMessage(text, false);
    } else {
      renderAssistantMessage(marked.parse(text), text, false);
    }
  });

  if (typeof hideHero === "function") hideHero();
};

/* =========================================================
   🔍 CONNECT SEARCH INPUT
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