// sidebar.js — Dynamo AI (IMPROVED UX)
console.log("sidebar.js loaded");

/* =========================================================
   MULTI-SELECT STATE
========================================================= */

window._selectMode = false;
window._selectedChatIds = new Set();

window.toggleSelectMode = () => {
  window._selectMode = !window._selectMode;
  window._selectedChatIds.clear();

  const btn  = document.getElementById("sb-select-btn");
  const bar  = document.getElementById("sb-select-bar");
  const cnt  = document.getElementById("sb-select-count");

  if (btn)  btn.textContent  = window._selectMode ? "Cancel" : "Select";
  if (bar)  bar.classList.toggle("hidden", !window._selectMode);
  if (cnt)  cnt.textContent  = "0";

  // Re-render so checkboxes appear / disappear
  const box = document.getElementById("history-list");
  if (!box) return;
  const all    = window.allChats || [];
  const pinned = all.filter(c => c.is_starred);
  const recent = all.filter(c => !c.is_starred);
  box.innerHTML = "";
  if (pinned.length > 0) {
    box.appendChild(sectionLabel("Pinned"));
    pinned.forEach(chat => renderSidebarItem(chat, box));
  }
  if (recent.length > 0) {
    if (pinned.length > 0) box.appendChild(sectionLabel("Recent"));
    recent.forEach(chat => renderSidebarItem(chat, box));
  }
  if (all.length === 0) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2 py-1">No recent chats</div>`;
  }
};

window.selectAllChats = () => {
  const all = window.allChats || [];
  all.forEach(c => window._selectedChatIds.add(c.id));
  const cnt = document.getElementById("sb-select-count");
  if (cnt) cnt.textContent = String(window._selectedChatIds.size);
  // Tick all checkboxes
  document.querySelectorAll(".sb-chat-checkbox").forEach(cb => { cb.checked = true; });
};

window.deleteSelectedChats = async () => {
  const ids = [...window._selectedChatIds];
  if (ids.length === 0) return;
  if (!confirm(`Delete ${ids.length} chat${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;

  for (const id of ids) {
    await window.supabaseClient.from("messages").delete().eq("chat_id", id);
    await window.supabaseClient.from("chats").delete().eq("id", id);
    if (window.appState.chatId === id) {
      window.setChatId(null);
      const chatContainer = document.getElementById("chat-messages");
      if (chatContainer) chatContainer.innerHTML = "";
      if (typeof showHero === "function") showHero();
    }
  }

  // Exit select mode and reload
  window._selectMode = false;
  window._selectedChatIds.clear();
  await window.loadChatSidebar();
};

/* =========================================================
   LOAD SIDEBAR
========================================================= */

window.allFolders = [];

window.loadChatSidebar = async () => {
  // Always exit select mode on reload so stale checkboxes don't persist
  if (window._selectMode) {
    window._selectMode = false;
    window._selectedChatIds.clear();
    const btn = document.getElementById("sb-select-btn");
    const bar = document.getElementById("sb-select-bar");
    if (btn) btn.textContent = "Select";
    if (bar) bar.classList.add("hidden");
  }

  const userId = window.appState.supabaseUserId;
  const box = document.getElementById("history-list");
  if (!box) return;

  if (!userId) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2 py-1">Login to see chats</div>`;
    window.allChats = [];
    window.allFolders = [];
    renderFolderSection([], []);
    window._updateSidebarTabCounts?.();
    return;
  }

  const [chatRes, folderRes] = await Promise.all([
    supabaseClient
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("is_starred", { ascending: false })
      .order("created_at", { ascending: false }),
    fetch(`/folders?user_id=${userId}`).then(r => r.json()).catch(() => ({ folders: [] }))
  ]);

  if (chatRes.error) {
    console.error("❌ Sidebar load error:", chatRes.error);
    box.innerHTML = `<div class="text-xs text-red-400 px-2 py-1">Failed to load chats</div>`;
    return;
  }

  window.allChats = chatRes.data || [];
  window.allFolders = folderRes.folders || [];

  // Render folders section
  renderFolderSection(window.allFolders, window.allChats);

  // CHATS TAB: show ALL chats (incl those inside folders) so user has a flat
  // recents list — folders are organisation, not silos. Matches Variant C UX.
  const all = window.allChats;
  box.innerHTML = "";

  if (all.length === 0) {
    box.innerHTML = `<div class="text-xs text-gray-400 px-2 py-1">No recent chats</div>`;
    window._updateSidebarTabCounts?.();
    return;
  }

  const pinned = all.filter(c => c.is_starred);
  const recent = all.filter(c => !c.is_starred);

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

  window._updateSidebarTabCounts?.();
};

/* =========================================================
   SIDEBAR TAB SWITCHER (Chats / Folders) — Variant C
========================================================= */

window.setSidebarTab = (tab) => {
  if (tab !== "chats" && tab !== "folders") tab = "chats";
  const chatsPanel   = document.getElementById("sb-panel-chats");
  const foldersPanel = document.getElementById("folders-section");
  const chatsBtn     = document.getElementById("sb-tab-chats-btn");
  const foldersBtn   = document.getElementById("sb-tab-folders-btn");
  if (!chatsPanel || !foldersPanel || !chatsBtn || !foldersBtn) return;

  chatsPanel.classList.toggle("hidden",   tab !== "chats");
  foldersPanel.classList.toggle("hidden", tab !== "folders");
  chatsBtn.classList.toggle("sb-tab-active",   tab === "chats");
  foldersBtn.classList.toggle("sb-tab-active", tab === "folders");
  chatsBtn.setAttribute("aria-selected",   String(tab === "chats"));
  foldersBtn.setAttribute("aria-selected", String(tab === "folders"));

  try { localStorage.setItem("sb-tab", tab); } catch (_) {}
};

window._updateSidebarTabCounts = () => {
  const chatsCount  = (window.allChats   || []).length;
  const foldersCnt  = (window.allFolders || []).length;
  const c1 = document.getElementById("sb-tab-chats-count");
  const c2 = document.getElementById("sb-tab-folders-count");
  if (c1) c1.textContent = String(chatsCount);
  if (c2) c2.textContent = String(foldersCnt);
};

// Init tab on first load (default chats, restore from localStorage)
document.addEventListener("DOMContentLoaded", () => {
  let initial = "chats";
  try { initial = localStorage.getItem("sb-tab") || "chats"; } catch (_) {}
  window.setSidebarTab(initial);
  window._updateSidebarTabCounts();
});

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
  const isActive   = window.appState.chatId === chat.id;
  const selectMode = !!window._selectMode;
  const isChecked  = window._selectedChatIds.has(chat.id);

  const wrapper = document.createElement("div");
  wrapper.className = [
    "group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150",
    isActive && !selectMode
      ? "bg-yellow-100 dark:bg-yellow-900/30 shadow-sm"
      : selectMode && isChecked
        ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"
        : "hover:bg-gray-200 dark:hover:bg-gray-700/70"
  ].join(" ");

  /* --- SELECT MODE: checkbox on left --- */
  if (selectMode) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "sb-chat-checkbox flex-shrink-0 w-4 h-4 accent-yellow-400 cursor-pointer";
    cb.checked = isChecked;
    cb.onclick = (e) => {
      e.stopPropagation();
      if (cb.checked) {
        window._selectedChatIds.add(chat.id);
      } else {
        window._selectedChatIds.delete(chat.id);
      }
      // Update count badge
      const cnt = document.getElementById("sb-select-count");
      if (cnt) cnt.textContent = String(window._selectedChatIds.size);
      // Update row highlight
      wrapper.className = wrapper.className.replace(
        /bg-yellow-50[^\s]*/g, ""
      );
      if (cb.checked) {
        wrapper.classList.add("bg-yellow-50", "dark:bg-yellow-900/20", "border", "border-yellow-300");
      }
    };
    // Clicking the whole row also toggles
    wrapper.onclick = () => cb.click();
    wrapper.appendChild(cb);
  }

  /* --- Pin badge (visible when pinned, normal mode only) --- */
  if (chat.is_starred && !selectMode) {
    const badge = document.createElement("span");
    badge.className = "flex-shrink-0 text-yellow-500 text-xs";
    badge.innerHTML = "📌";
    wrapper.appendChild(badge);
  }

  /* --- Title --- */
  const title = document.createElement("div");
  title.className = [
    "flex-1 text-[13px] font-semibold truncate",
    isActive && !selectMode
      ? "text-yellow-700 dark:text-yellow-300"
      : "text-gray-800 dark:text-gray-100"
  ].join(" ");
  title.innerText = chat.title || "New Chat";

  if (!selectMode) {
    title.onclick = async () => {
      window.setChatId(chat.id);
      await window.loadChatHistory();
      await window.loadChatSidebar();
    };
  }

  wrapper.appendChild(title);

  /* --- Three-dot menu button (hidden in select mode) --- */
  if (!selectMode) {
    const menuBtn = document.createElement("button");
    menuBtn.className = "flex-shrink-0 text-yellow-500 font-bold text-lg hover:text-yellow-600 dark:hover:text-yellow-400 p-1 cursor-pointer";
    menuBtn.innerHTML = "⋯";
    menuBtn.title = "Options";
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      showChatMenu(e, chat, title, wrapper);
    };
    wrapper.appendChild(menuBtn);
  }

  box.appendChild(wrapper);
}

/* =========================================================
   CHAT MENU POPUP
========================================================= */

function showChatMenu(e, chat, titleEl, wrapperEl) {
  // Remove any existing popup
  const existing = document.getElementById("chat-menu-popup");
  if (existing) existing.remove();

  const isDark = document.documentElement.classList.contains("dark");

  // Popup container
  const popup = document.createElement("div");
  popup.id = "chat-menu-popup";
  Object.assign(popup.style, {
    position: "fixed",
    zIndex: "9999",
    minWidth: "200px",
    background: isDark ? "#1e1e2e" : "#ffffff",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    boxShadow: isDark
      ? "0 24px 48px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 24px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)",
    overflow: "hidden",
    animation: "popupFadeIn 0.15s ease-out",
    padding: "6px"
  });

  // Inject animation keyframes once
  if (!document.getElementById("chat-popup-style")) {
    const style = document.createElement("style");
    style.id = "chat-popup-style";
    style.textContent = `
      @keyframes popupFadeIn {
        from { opacity: 0; transform: translateY(6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }
    `;
    document.head.appendChild(style);
  }

  // Position ABOVE the button
  const rect = e.target.getBoundingClientRect();
  popup.style.right = (window.innerWidth - rect.right) + "px";

  // Helper to build a menu item
  function makeMenuItem({ iconSvg, label, hoverBg, color, borderBottom, onClick }) {
    const item = document.createElement("button");
    Object.assign(item.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      width: "100%",
      padding: "10px 14px",
      background: "transparent",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      color: color || (isDark ? "#e2e8f0" : "#1a1a2e"),
      transition: "background 0.15s ease, color 0.15s ease",
      textAlign: "left",
    });
    if (borderBottom) item.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)";

    item.innerHTML = `
      <span style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}">
        ${iconSvg}
      </span>
      <span>${label}</span>
    `;

    item.onmouseenter = () => { item.style.background = hoverBg; };
    item.onmouseleave = () => { item.style.background = "transparent"; };
    item.onclick = (e2) => { e2.stopPropagation(); onClick(); };
    return item;
  }

  // Pin / Unpin
  const pinIcon = chat.is_starred
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`;

  const renameIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;

  const deleteIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

  const pinItem = makeMenuItem({
    iconSvg: pinIcon,
    label: chat.is_starred ? "Unpin" : "Pin",
    hoverBg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)",
    color: isDark ? "#fcd34d" : "#b45309",
    borderBottom: true,
    onClick: async () => {
      await window.supabaseClient.from("chats").update({ is_starred: !chat.is_starred }).eq("id", chat.id);
      popup.remove();
      window.loadChatSidebar();
    }
  });

  const renameItem = makeMenuItem({
    iconSvg: renameIcon,
    label: "Rename",
    hoverBg: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)",
    color: isDark ? "#93c5fd" : "#1d4ed8",
    borderBottom: true,
    onClick: () => {
      popup.remove();
      startInlineRename(titleEl, chat, wrapperEl);
    }
  });

  const deleteItem = makeMenuItem({
    iconSvg: deleteIcon,
    label: "Delete",
    hoverBg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
    color: "#ef4444",
    borderBottom: false,
    onClick: async () => {
      popup.remove();
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
  });

  // Move to Folder icon
  const folderIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

  const moveItem = makeMenuItem({
    iconSvg: folderIcon,
    label: "Move to Folder",
    hoverBg: isDark ? "rgba(217,119,6,0.12)" : "rgba(217,119,6,0.08)",
    color: isDark ? "#fbbf24" : "#b45309",
    borderBottom: true,
    onClick: () => {
      popup.remove();
      showFolderSubmenu(e, chat);
    }
  });

  popup.appendChild(pinItem);
  popup.appendChild(renameItem);
  popup.appendChild(moveItem);
  popup.appendChild(deleteItem);
  document.body.appendChild(popup);

  // Position after appending so height is known
  const popupH = popup.offsetHeight || 140;
  popup.style.top = (rect.top - popupH - 8) + "px";

  // Close on outside click
  const closeHandler = (e2) => {
    if (!popup.contains(e2.target) && e2.target !== e.target) {
      popup.remove();
      document.removeEventListener("click", closeHandler);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 100);
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

/* =========================================================
   FOLDERS — RENDER SECTION
========================================================= */

function renderFolderSection(folders, allChats) {
  const list = document.getElementById("folders-list");
  if (!list) return;

  list.innerHTML = "";

  if (folders.length === 0) {
    const hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;color:#9ca3af;padding:2px 4px 6px;";
    hint.textContent = "No folders yet — press + to create one";
    list.appendChild(hint);
    return;
  }

  folders.forEach(folder => {
    const chatsInFolder = allChats.filter(c => c.folder_id === folder.id);
    list.appendChild(renderFolderItem(folder, chatsInFolder));
  });
}

function renderFolderItem(folder, chats) {
  const isDark = document.documentElement.classList.contains("dark");
  const wrap = document.createElement("div");
  const isOpen = (window._folderOpenState || {})[folder.id] !== false; // default open

  // Row
  const row = document.createElement("div");
  row.className = "group flex items-center gap-1.5 px-2 py-2 rounded-xl cursor-pointer select-none transition-all";
  row.style.cssText = isOpen
    ? "background:rgba(234,179,8,0.08);"
    : "hover:background:#f9fafb;";

  row.innerHTML = `
    <span class="folder-chevron text-gray-400 text-[10px] transition-transform duration-200 ${isOpen ? "rotate-90 !text-yellow-600" : ""}" style="transform:${isOpen ? "rotate(90deg)" : "rotate(0deg)"};">›</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isOpen ? "#d97706" : "#9ca3af"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    <span class="flex-1 text-[12.5px] font-semibold truncate ${isOpen ? "text-yellow-700 dark:text-yellow-400" : "text-gray-700 dark:text-gray-200"}">${escHtml(folder.name)}</span>
    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOpen ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}">${chats.length}</span>
    <button class="folder-opts opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white text-sm leading-none transition" title="Folder options">⋯</button>
  `;

  // Chats container
  const chatsEl = document.createElement("div");
  chatsEl.style.cssText = `padding-left:22px;overflow:hidden;transition:max-height 0.2s ease;max-height:${isOpen ? "600px" : "0px"};`;

  if (chats.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-[11px] text-gray-400 dark:text-gray-500 px-2 py-1.5 italic";
    empty.textContent = "No chats yet";
    chatsEl.appendChild(empty);
  } else {
    chats.forEach(chat => {
      const chatRow = document.createElement("div");
      chatRow.className = [
        "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[12px] font-medium truncate transition-all",
        window.appState.chatId === chat.id
          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60"
      ].join(" ");
      chatRow.innerHTML = `
        <span style="width:5px;height:5px;border-radius:50%;background:${window.appState.chatId === chat.id ? "#d97706" : "#d1d5db"};flex-shrink:0;display:inline-block;"></span>
        <span class="truncate flex-1">${escHtml(chat.title || "New Chat")}</span>
      `;
      chatRow.onclick = async () => {
        window.setChatId(chat.id);
        await window.loadChatHistory();
        await window.loadChatSidebar();
      };
      chatsEl.appendChild(chatRow);
    });
  }

  // Toggle on row click
  row.onclick = (e) => {
    if (e.target.closest(".folder-opts")) return;
    window._folderOpenState = window._folderOpenState || {};
    const nowOpen = chatsEl.style.maxHeight === "0px";
    window._folderOpenState[folder.id] = nowOpen;
    chatsEl.style.maxHeight = nowOpen ? "600px" : "0px";
    const chevron = row.querySelector(".folder-chevron");
    if (chevron) chevron.style.transform = nowOpen ? "rotate(90deg)" : "rotate(0deg)";
  };

  // Folder options button (rename / delete)
  const optsBtn = row.querySelector(".folder-opts");
  if (optsBtn) {
    optsBtn.onclick = (e) => {
      e.stopPropagation();
      showFolderMenu(e, folder);
    };
  }

  wrap.appendChild(row);
  wrap.appendChild(chatsEl);
  return wrap;
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

/* =========================================================
   FOLDER MENU (rename / delete)
========================================================= */

function showFolderMenu(e, folder) {
  const existing = document.getElementById("folder-menu-popup");
  if (existing) existing.remove();

  const isDark = document.documentElement.classList.contains("dark");
  const popup = document.createElement("div");
  popup.id = "folder-menu-popup";
  Object.assign(popup.style, {
    position: "fixed", zIndex: "9999", minWidth: "160px",
    background: isDark ? "#1e1e2e" : "#ffffff",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "12px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
    padding: "5px", animation: "popupFadeIn 0.15s ease-out"
  });

  const mkItem = (label, color, onClick) => {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      display: "flex", alignItems: "center", gap: "10px",
      width: "100%", padding: "9px 12px", background: "transparent",
      border: "none", borderRadius: "8px", cursor: "pointer",
      fontSize: "13px", fontWeight: "600", color: color || (isDark ? "#e2e8f0" : "#1a1a2e"),
      textAlign: "left"
    });
    btn.textContent = label;
    btn.onmouseenter = () => btn.style.background = isDark ? "rgba(255,255,255,0.07)" : "#f9fafb";
    btn.onmouseleave = () => btn.style.background = "transparent";
    btn.onclick = (ev) => { ev.stopPropagation(); popup.remove(); onClick(); };
    return btn;
  };

  popup.appendChild(mkItem("Rename", isDark ? "#93c5fd" : "#1d4ed8", async () => {
    const newName = prompt("Rename folder:", folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;
    await fetch(`/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() })
    });
    window.loadChatSidebar();
  }));

  popup.appendChild(mkItem("Delete Folder", "#ef4444", async () => {
    if (!confirm(`Delete folder "${folder.name}"? Chats inside will move back to History.`)) return;
    await fetch(`/folders/${folder.id}`, { method: "DELETE" });
    window.loadChatSidebar();
  }));

  document.body.appendChild(popup);
  const rect = e.target.getBoundingClientRect();
  popup.style.left = rect.left + "px";
  popup.style.top = (rect.bottom + 4) + "px";

  setTimeout(() => {
    document.addEventListener("click", function h(ev2) {
      if (!popup.contains(ev2.target)) { popup.remove(); document.removeEventListener("click", h); }
    });
  }, 100);
}

/* =========================================================
   FOLDER SUBMENU — pick folder for a chat
========================================================= */

function showFolderSubmenu(e, chat) {
  const existing = document.getElementById("folder-sub-popup");
  if (existing) existing.remove();

  const isDark = document.documentElement.classList.contains("dark");
  const popup = document.createElement("div");
  popup.id = "folder-sub-popup";
  Object.assign(popup.style, {
    position: "fixed", zIndex: "9999", minWidth: "190px",
    background: isDark ? "#1e1e2e" : "#ffffff",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
    padding: "5px", animation: "popupFadeIn 0.15s ease-out"
  });

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;padding:6px 12px 4px;";
  hdr.textContent = "Move to…";
  popup.appendChild(hdr);

  const mkRow = (label, icon, onClick) => {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      display: "flex", alignItems: "center", gap: "9px",
      width: "100%", padding: "9px 12px", background: "transparent",
      border: "none", borderRadius: "8px", cursor: "pointer",
      fontSize: "12.5px", fontWeight: "600",
      color: isDark ? "#e2e8f0" : "#1a1a2e", textAlign: "left"
    });
    btn.innerHTML = `${icon}<span class="truncate">${escHtml(label)}</span>`;
    btn.onmouseenter = () => btn.style.background = isDark ? "rgba(217,119,6,0.12)" : "rgba(217,119,6,0.06)";
    btn.onmouseleave = () => btn.style.background = "transparent";
    btn.onclick = (ev) => { ev.stopPropagation(); popup.remove(); onClick(); };
    return btn;
  };

  const folderSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

  const folders = window.allFolders || [];

  // Current folder (if any) — show "Remove from folder" option
  if (chat.folder_id) {
    const removeBtn = mkRow("Remove from folder", `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`, async () => {
      await fetch(`/chats/${chat.id}/folder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: null })
      });
      window.loadChatSidebar();
    });
    removeBtn.style.color = "#9ca3af";
    popup.appendChild(removeBtn);

    if (folders.length > 0) {
      const div = document.createElement("div");
      div.style.cssText = "height:1px;background:rgba(0,0,0,0.06);margin:3px 6px;";
      popup.appendChild(div);
    }
  }

  if (folders.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "font-size:12px;color:#9ca3af;padding:8px 12px;";
    empty.textContent = "No folders yet";
    popup.appendChild(empty);
  } else {
    folders.forEach(f => {
      if (f.id === chat.folder_id) return; // skip current folder
      popup.appendChild(mkRow(f.name, folderSvg, async () => {
        await fetch(`/chats/${chat.id}/folder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_id: f.id })
        });
        window.loadChatSidebar();
      }));
    });
  }

  // New folder option
  const divider = document.createElement("div");
  divider.style.cssText = "height:1px;background:rgba(0,0,0,0.06);margin:3px 6px;";
  popup.appendChild(divider);

  popup.appendChild(mkRow("New Folder", `<span style="font-weight:800;color:#9ca3af;font-size:14px;line-height:1;width:13px;text-align:center;flex-shrink:0;">+</span>`, async () => {
    const name = prompt("New folder name:");
    if (!name || !name.trim()) return;
    const userId = window.appState.supabaseUserId;
    const res = await fetch("/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, name: name.trim() })
    });
    const data = await res.json();
    if (data.folder) {
      await fetch(`/chats/${chat.id}/folder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: data.folder.id })
      });
    }
    window.loadChatSidebar();
  }));

  document.body.appendChild(popup);

  const rect = e.target.getBoundingClientRect();
  const popH = popup.offsetHeight || 200;
  popup.style.right = (window.innerWidth - rect.right) + "px";
  popup.style.top = Math.max(8, rect.top - popH - 4) + "px";

  setTimeout(() => {
    document.addEventListener("click", function h(ev2) {
      if (!popup.contains(ev2.target)) { popup.remove(); document.removeEventListener("click", h); }
    });
  }, 100);
}

/* =========================================================
   CREATE FOLDER (+ button)
========================================================= */

window.createFolderPrompt = async () => {
  const name = prompt("New folder name:");
  if (!name || !name.trim()) return;
  const userId = window.appState.supabaseUserId;
  if (!userId) return;
  await fetch("/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, name: name.trim() })
  });
  window.loadChatSidebar();
};
