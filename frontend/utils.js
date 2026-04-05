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
    const firebaseUid = user.firebase_uid || user.uid || user.id;
    const { data, error } = await window.supabaseClient
      .from("users")
      .select("*")
      .eq("firebase_uid", firebaseUid)
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

  // ✅ Update credits dashboard
  setTimeout(() => {
    window.updateCreditsDisplay?.();
  }, 100);
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

    const { data, error } = await window.supabaseClient
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

/* -----------------------------
   CREDITS DASHBOARD UPDATE
----------------------------- */
window.updateCreditsDisplay = () => {
  const user = window.appState?.supabaseUser;
  if (!user) return;

  const plan = user.plan || "free";
  const PLAN_LIMITS = {
    free: { chat: 10, images: 0, videos: 0 },
    plus: { chat: 100, images: 25, videos: 5 },
    pro: { chat: 300, images: 100, videos: 25 }
  };

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const msgUsed = user.daily_quota_used || 0;
  const imgUsed = user.image_count_used || 0;
  const vidUsed = user.video_count_used || 0;

  const planNames = { free: "Free", plus: "Plus", pro: "Pro" };
  const displayPlan = planNames[plan] || "Free";

  // Update counts in profile modal
  const profileMsgCount = document.getElementById("profile-msg-count");
  const profileImgCount = document.getElementById("profile-img-count");
  const profileVidCount = document.getElementById("profile-vid-count");

  if (profileMsgCount) {
    profileMsgCount.textContent = `${msgUsed}/${limits.chat}`;
    profileImgCount.textContent = `${imgUsed}/${limits.images}`;
    profileVidCount.textContent = `${vidUsed}/${limits.videos}`;

    // Update progress bars in profile
    const msgPercent = limits.chat > 0 ? (msgUsed / limits.chat) * 100 : 0;
    const imgPercent = limits.images > 0 ? (imgUsed / limits.images) * 100 : 0;
    const vidPercent = limits.videos > 0 ? (vidUsed / limits.videos) * 100 : 0;

    document.getElementById("profile-msg-bar").style.width = Math.min(msgPercent, 100) + "%";
    document.getElementById("profile-img-bar").style.width = Math.min(imgPercent, 100) + "%";
    document.getElementById("profile-vid-bar").style.width = Math.min(vidPercent, 100) + "%";

    // Update bar colors based on usage
    const msgBar = document.getElementById("profile-msg-bar");
    const imgBar = document.getElementById("profile-img-bar");
    const vidBar = document.getElementById("profile-vid-bar");

    msgBar.className = msgPercent >= 90 ? "h-full bg-red-500 rounded-full transition-all duration-300" : "h-full bg-green-500 rounded-full transition-all duration-300";
    imgBar.className = imgPercent >= 90 ? "h-full bg-red-500 rounded-full transition-all duration-300" : "h-full bg-blue-500 rounded-full transition-all duration-300";
    vidBar.className = vidPercent >= 90 ? "h-full bg-red-500 rounded-full transition-all duration-300" : "h-full bg-purple-500 rounded-full transition-all duration-300";
  }

  console.log("✅ Credits dashboard updated");
};