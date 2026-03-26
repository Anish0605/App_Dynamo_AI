// utils.js — Dynamo AI (FINAL + CHAT HISTORY READY)
console.log("✅ utils.js loaded");

/* -----------------------------
   GLOBAL APP STATE
----------------------------- */
window.appState = {
    
  user: null,
  supabaseUser: null,
  supabaseUserId: null,
  chatId: null,
};
/* -----------------------------
   🔥 LOAD FULL USER (PLAN FIX)
----------------------------- */
async function loadUserData(user) {
  if (!user || !window.supabaseClient) return null;

  try {
    const { data, error } = await window.supabaseClient
      .from("users")
      .select("*")
      .eq("firebase_uid", user.id)
      .single();

    if (error) {
      console.warn("⚠️ User fetch failed:", error);
      return null;
    }

    console.log("✅ Full user loaded:", data);
    return data;

  } catch (err) {
    console.error("❌ loadUserData error:", err);
    return null;
  }
}
/* -----------------------------
   SUPABASE CLIENT
----------------------------- */
if (
  window.SUPABASE_URL_PUBLIC &&
  window.SUPABASE_ANON_KEY &&
  window.supabase
) {
  try {
    window.supabaseClient = supabase.createClient(
      window.SUPABASE_URL_PUBLIC,
      window.SUPABASE_ANON_KEY
    );
    console.log("✅ Supabase client ready");
  } catch (err) {
    console.error("❌ Supabase init failed:", err);
  }
} else {
  console.warn("⚠️ Supabase config missing");
}

/* -----------------------------
   BACKEND CALL
----------------------------- */
window.callBackend = async (endpoint, payload = {}) => {
  const res = await fetch(`${window.BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return await res.json();
};

/* -----------------------------
   STATE HELPERS
----------------------------- */
window.setAppUser = (user) => {
  console.log("🧠 setAppUser called:", user);
  window.appState.user = user || null;
};

window.setSupabaseUser = async (user) => {
  if (!user) {
    window.appState.supabaseUser = null;
    window.appState.supabaseUserId = null;
    return;
  }

  // 🔥 Fetch full DB user (IMPORTANT)
  const fullUser = await loadUserData(user);

  window.appState.supabaseUser = fullUser || user;
  window.appState.supabaseUserId = fullUser?.id || null;

  console.log("🧠 Supabase User Set (FULL):", fullUser);
};

window.setChatId = (chatId) => {
  window.appState.chatId = chatId || null;
  console.log("💬 Active Chat ID:", chatId);
};

/* -----------------------------
   🔥 ENSURE CHAT (CORE LOGIC)
----------------------------- */
window.ensureChat = async () => {
  try {
    const userId = window.appState.supabaseUserId;

    if (!userId) {
      console.warn("⚠️ No user for chat");
      return null;
    }

    // If already exists
    if (window.appState.chatId) {
      return window.appState.chatId;
    }

    // Create new chat
    const { data, error } = await supabaseClient
      .from("chats")
      .insert({
        user_id: userId,
        title: "New Chat"
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Chat create failed:", error);
      return null;
    }

    window.setChatId(data.id);
    console.log("✅ Chat created:", data.id);

    return data.id;

  } catch (err) {
    console.error("❌ ensureChat error:", err);
    return null;
  }
};

/* -----------------------------
   🔥 GET USER CHATS (FUTURE UI)
----------------------------- */
window.getUserChats = async () => {
  try {
    const userId = window.appState.supabaseUserId;
    if (!userId) return [];

    const { data, error } = await supabaseClient
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Fetch chats failed:", error);
      return [];
    }

    return data;

  } catch (err) {
    console.error("❌ getUserChats error:", err);
    return [];
  }
};

/* -----------------------------
   DEBUG
----------------------------- */
window.dumpState = () => {
  console.group("🧠 Dynamo App State");
  console.table(window.appState);
  console.groupEnd();
};

/* -----------------------------
   LOGIN CHECK (DEBUG)
----------------------------- */
setTimeout(() => {
  if (!window.appState.supabaseUserId) {
    console.warn("⚠️ No Supabase user yet (login not completed)");
  }
}, 3000);