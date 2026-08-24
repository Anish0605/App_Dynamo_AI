// utils.js — Dynamo AI (FINAL + CHAT HISTORY READY)

/* -----------------------------
   PASSWORD VISIBILITY TOGGLE
----------------------------- */
window.togglePwdVis = (inputId, btn) => {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  const svg = btn.querySelector("svg");
  if (!svg) return;
  if (show) {
    // Eye-off (slash through eye) — password is now visible
    svg.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    `;
    btn.style.color = "#374151";
  } else {
    // Eye open — password is hidden again
    svg.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    `;
    btn.style.color = "#9ca3af";
  }
};

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
   PAID-ACCESS POLICY
   Authentication remains available to everyone, but AI access requires an
   active paid/demo plan. The backend is the final authority; this gate keeps
   unpaid users from interacting with AI controls unnecessarily.
----------------------------- */
window.PAID_ACCESS_PLANS = new Set([
  "basic", "plus", "plus_trial", "pro", "pro_trial", "pro_validation"
]);

window.hasPaidAccess = (user = window.appState?.supabaseUser) => {
  if (user?.access_allowed === true) return true;
  const plan = String(user?.plan || "free").toLowerCase();
  return window.PAID_ACCESS_PLANS.has(plan);
};

window.showPaidAccessGate = () => {
  const gate = document.getElementById("paid-access-gate");
  if (gate) gate.classList.remove("hidden");
};

window.hidePaidAccessGate = () => {
  document.getElementById("paid-access-gate")?.classList.add("hidden");
};

window.updatePaidAccessGate = (user) => {
  if (user && !window.hasPaidAccess(user)) window.showPaidAccessGate();
  else window.hidePaidAccessGate();
};

window.requirePaidAccess = () => {
  const firebaseUser = window.appState?.user;
  const user = window.appState?.supabaseUser;
  if (!firebaseUser || !user) {
    window.openAuthModal?.("login");
    return false;
  }
  if (!window.hasPaidAccess(user)) {
    window.showPaidAccessGate();
    return false;
  }
  return true;
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
  } catch (err) {
    console.error("❌ Supabase init failed:", err);
  }
} else {
  console.warn("⚠️ Supabase config missing");
}

/* -----------------------------
   BACKEND CALL
----------------------------- */
window.backendAuthHeaders = async (headers = {}) => {
  const token = window.getFirebaseIdToken
    ? await window.getFirebaseIdToken().catch(() => "")
    : "";
  return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
};

window.backendFetch = async (url, options = {}) => {
  const headers = await window.backendAuthHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
};

window.callBackend = async (endpoint, payload = {}) => {
  const res = await window.backendFetch(`${window.BACKEND_URL}${endpoint}`, {
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
  window.appState.user = user || null;
};

window.setSupabaseUser = async (user) => {
  if (!user) {
    window.appState.supabaseUser = null;
    window.appState.supabaseUserId = null;
    window.hidePaidAccessGate();
    return;
  }

  // 🔥 Fetch full DB user (IMPORTANT)
  const fullUser = await loadUserData(user);

  window.appState.supabaseUser = fullUser || user;
  window.appState.supabaseUserId = fullUser?.id || null;
  window.updatePaidAccessGate(window.appState.supabaseUser);


  // ✅ Update credits dashboard
  setTimeout(() => {
    window.updateCreditsDisplay?.();
  }, 100);
};

window.setChatId = (chatId) => {
  window.appState.chatId = chatId || null;
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

  // Update compact credit pills
  const compactMsg = document.getElementById("compact-msg");
  const compactImg = document.getElementById("compact-img");
  const compactVid = document.getElementById("compact-vid");
  const msgBar     = document.getElementById("profile-msg-bar");

  if (compactMsg) compactMsg.textContent = `💬 ${msgUsed}/${limits.chat}`;
  if (compactImg) compactImg.textContent = `🖼️ ${imgUsed}/${limits.images}`;
  if (compactVid) compactVid.textContent = `🎬 ${vidUsed}/${limits.videos}`;

  if (msgBar) {
    const msgPercent = limits.chat > 0 ? (msgUsed / limits.chat) * 100 : 0;
    msgBar.style.width    = Math.min(msgPercent, 100) + "%";
    msgBar.style.background = msgPercent >= 90 ? "#ef4444" : "#22c55e";
  }

};