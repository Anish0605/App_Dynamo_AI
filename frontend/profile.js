// profile.js — Dynamo AI

let modal = null;

document.addEventListener("DOMContentLoaded", () => {
  modal = document.getElementById("profile-modal");
  if (!modal) { console.error("❌ Profile modal not found"); return; }

  document.addEventListener("click", (e) => {
    if (modal.classList.contains("hidden")) return;
    const card = modal.querySelector(".profile-card");
    const trigger = document.querySelector("[onclick='openProfile()']");
    if (!card.contains(e.target) && !trigger?.contains(e.target)) {
      modal.classList.add("hidden");
    }
  });

  const upgradeBtn = document.getElementById("upgrade-btn");
  const supportBtn  = document.getElementById("support-btn");
  const logoutBtn   = document.getElementById("logout-btn");

  if (upgradeBtn) upgradeBtn.onclick = () => { window.location.href = "https://dynamoai.in/pricing.html"; };
  if (supportBtn) supportBtn.onclick = () => { window.location.href = "https://dynamoai.in/contact.html"; };
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        if (window.handleLogout) await window.handleLogout();
        modal.classList.add("hidden");
      } catch (err) { console.error("Logout error:", err); }
    };
  }

  if (window.lucide) lucide.createIcons();
});

/* ── OPEN ── */
window.openProfile = () => {
  if (!modal) return;
  modal.classList.remove("hidden");
  loadProfileData();
  window.refreshMemoryCount?.();
  window.refreshDocCount?.();
};

/* ── LOAD DATA ── */
async function loadProfileData() {
  try {
    const user = window.appState?.supabaseUser;
    const firebaseUser = window.appState?.user;

    if (!user) {
      const name = firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "Guest";
      const email = firebaseUser?.email || "—";
      setProfileUI(name, email, "FREE");
      return;
    }

    const name  = user.full_name || firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "User";
    const email = firebaseUser?.email || user.email || "—";
    const plan  = user.plan || "free";

    setProfileUI(name, email, plan);

    // Pre-fill inputs
    const nameInput = document.getElementById("new-name-input");
    if (nameInput) nameInput.value = name;
    const emailInput = document.getElementById("new-email-input");
    if (emailInput) emailInput.value = email;

    // Refresh from Supabase (also fetch quota fields)
    if (window.supabaseClient && firebaseUser?.uid) {
      const { data } = await window.supabaseClient
        .from("users")
        .select("id, plan, full_name, email, daily_quota_used, quota_date, image_count_used, video_count_used, quota_month")
        .eq("firebase_uid", firebaseUser.uid)
        .single();

      if (data) {
        const freshName  = data.full_name || name;
        const freshEmail = firebaseUser?.email || data.email || email;
        const freshPlan  = data.plan || "free";

        // Fetch trial expiry for pro_trial users
        let trialExpiry = null;
        if ((freshPlan === "pro_trial" || freshPlan === "pro_validation") && data.id) {
          const { data: subData } = await window.supabaseClient
            .from("subscriptions")
            .select("expires_at")
            .eq("user_id", data.id)
            .eq("status", "trial_active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (subData?.expires_at) trialExpiry = subData.expires_at;
        }

        setProfileUI(freshName, freshEmail, freshPlan, trialExpiry);
        if (nameInput)  nameInput.value  = freshName;
        if (emailInput) emailInput.value = freshEmail;
        if (window.appState.supabaseUser) {
          window.appState.supabaseUser.plan           = freshPlan;
          window.appState.supabaseUser.full_name      = freshName;
          window.appState.supabaseUser.daily_quota_used = data.daily_quota_used ?? 0;
        }
        updateCreditPills(freshPlan, data);
      }
    }
  } catch (err) { console.error("❌ loadProfileData error:", err); }
}

/* ── CREDIT PILLS ── */
function updateCreditPills(plan, data) {
  const LIMITS = {
    free:           { chat: 10,  img: 0,  vid: 0  },
    plus:           { chat: 100, img: 0,  vid: 0  },
    plus_trial:     { chat: 100, img: 0,  vid: 0  },
    pro:            { chat: 300, img: 25, vid: 15 },
    pro_trial:      { chat: 300, img: 25, vid: 0  },
    pro_validation: { chat: 300, img: 25, vid: 0  },
  };
  const p = (plan || "free").toLowerCase();
  const lim = LIMITS[p] || LIMITS.free;

  // Reset today's counter if quota_date is stale
  const today = new Date().toISOString().slice(0, 10);
  const msgUsed = (data.quota_date === today) ? (data.daily_quota_used ?? 0) : 0;
  const imgUsed = data.image_count_used ?? 0;
  const vidUsed = data.video_count_used ?? 0;

  const msgPill = document.getElementById("compact-msg");
  const imgPill = document.getElementById("compact-img");
  const vidPill = document.getElementById("compact-vid");
  const bar     = document.getElementById("profile-msg-bar");

  if (msgPill) msgPill.textContent = `💬 ${msgUsed}/${lim.chat}`;
  if (imgPill) imgPill.textContent = `🖼️ ${imgUsed}/${lim.img}`;
  if (vidPill) vidPill.textContent = `🎬 ${vidUsed}/${lim.vid}`;

  if (bar) {
    const pct = lim.chat > 0 ? Math.min(100, Math.round((msgUsed / lim.chat) * 100)) : 0;
    bar.style.width = pct + "%";
    bar.style.background = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
  }
}

/* ── UI SETTER ── */
function setProfileUI(name, email, plan, trialExpiry) {
  const initials = name.substring(0, 2).toUpperCase();
  document.getElementById("profile-name").innerText   = name;
  document.getElementById("profile-avatar").innerText = initials;
  const emailEl = document.getElementById("profile-email-display");
  if (emailEl) emailEl.innerText = email;

  const planEl = document.getElementById("profile-plan");
  if (!planEl) return;

  const planLower = (plan || "free").toLowerCase();
  if (planLower === "pro_trial" || planLower === "pro_validation") {
    let expiryHtml = "";
    if (trialExpiry) {
      const expDate  = new Date(trialExpiry);
      const formatted = expDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      expiryHtml = `<span style="display:block;font-size:9px;font-weight:600;opacity:0.8;margin-top:1px;">Expires ${formatted}</span>`;
    }
    planEl.innerHTML = `PRO TRIAL${expiryHtml}`;
    planEl.style.background = "#fed7aa";
    planEl.style.color      = "#7c2d12";
  } else {
    planEl.textContent      = plan.toUpperCase();
    planEl.style.background = "";
    planEl.style.color      = "";
  }
}

/* ── ACCORDION TOGGLE ── */
window.toggleProfileEdit = (id) => {
  const form  = document.getElementById(id);
  const arrow = document.getElementById("arrow-" + id);
  if (!form) return;

  // Close all others
  ["name-edit", "email-edit", "password-edit"].forEach(otherId => {
    if (otherId !== id) {
      const el = document.getElementById(otherId);
      const ar = document.getElementById("arrow-" + otherId);
      if (el) el.classList.add("hidden");
      if (ar) ar.style.transform = "";
    }
  });

  const isOpen = !form.classList.contains("hidden");
  if (isOpen) {
    form.classList.add("hidden");
    if (arrow) arrow.style.transform = "";
  } else {
    form.classList.remove("hidden");
    if (arrow) arrow.style.transform = "rotate(90deg)";
    // Focus the input inside
    setTimeout(() => form.querySelector("input")?.focus(), 50);
  }
};

/* ── SAVE NAME ── */
window.saveProfileName = async () => {
  const input  = document.getElementById("new-name-input");
  const msgEl  = document.getElementById("name-edit-msg");
  const newName = input?.value.trim();

  if (!newName) { showMsg(msgEl, "Please enter a name.", "red"); return; }

  const firebaseUser = window.appState?.user;
  if (!firebaseUser) { showMsg(msgEl, "Not logged in.", "red"); return; }

  try {
    // Update Supabase
    const { error } = await window.supabaseClient
      .from("users")
      .update({ full_name: newName })
      .eq("firebase_uid", firebaseUser.uid);

    if (error) throw error;

    // Update Firebase displayName
    if (firebaseUser.updateProfile) {
      await firebaseUser.updateProfile({ displayName: newName });
    } else if (window.firebase?.auth) {
      await window.firebase.auth().currentUser?.updateProfile({ displayName: newName });
    }

    // Update local state
    if (window.appState.supabaseUser) window.appState.supabaseUser.full_name = newName;

    // Update sidebar & profile header
    const sidebarName = document.getElementById("user-display-name");
    if (sidebarName) sidebarName.innerText = newName;
    document.getElementById("profile-name").innerText = newName;
    document.getElementById("profile-avatar").innerText = newName.substring(0, 2).toUpperCase();

    showMsg(msgEl, "✅ Name updated!", "green");
    setTimeout(() => window.toggleProfileEdit("name-edit"), 1200);
  } catch (err) {
    console.error(err);
    showMsg(msgEl, "❌ Failed to update name.", "red");
  }
};

/* ── SAVE EMAIL ── */
window.saveProfileEmail = async () => {
  const input    = document.getElementById("new-email-input");
  const msgEl    = document.getElementById("email-edit-msg");
  const newEmail = input?.value.trim();

  if (!newEmail || !newEmail.includes("@")) { showMsg(msgEl, "Enter a valid email.", "red"); return; }

  try {
    const currentUser = window.firebase?.auth().currentUser;
    if (!currentUser) { showMsg(msgEl, "Not logged in.", "red"); return; }

    // Check provider — Google users can't change email this way
    const isGoogleUser = currentUser.providerData?.some(p => p.providerId === "google.com");
    if (isGoogleUser) {
      showMsg(msgEl, "Google accounts can't change email here.", "orange");
      return;
    }

    await currentUser.updateEmail(newEmail);

    // Update Supabase
    await window.supabaseClient
      .from("users")
      .update({ email: newEmail })
      .eq("firebase_uid", currentUser.uid);

    const emailEl = document.getElementById("profile-email-display");
    if (emailEl) emailEl.innerText = newEmail;

    showMsg(msgEl, "✅ Email updated!", "green");
    setTimeout(() => window.toggleProfileEdit("email-edit"), 1200);
  } catch (err) {
    console.error(err);
    const msg = err.code === "auth/requires-recent-login"
      ? "Please log out and log back in first."
      : "❌ Failed to update email.";
    showMsg(msgEl, msg, "red");
  }
};

/* ── SAVE PASSWORD ── */
window.saveProfilePassword = async () => {
  const input    = document.getElementById("new-password-input");
  const msgEl    = document.getElementById("password-edit-msg");
  const newPass  = input?.value.trim();

  if (!newPass || newPass.length < 6) { showMsg(msgEl, "Password must be 6+ characters.", "red"); return; }

  try {
    const currentUser = window.firebase?.auth().currentUser;
    if (!currentUser) { showMsg(msgEl, "Not logged in.", "red"); return; }

    const isGoogleUser = currentUser.providerData?.some(p => p.providerId === "google.com");
    if (isGoogleUser) {
      showMsg(msgEl, "Google accounts don't use passwords.", "orange");
      return;
    }

    await currentUser.updatePassword(newPass);
    input.value = "";
    showMsg(msgEl, "✅ Password updated!", "green");
    setTimeout(() => window.toggleProfileEdit("password-edit"), 1200);
  } catch (err) {
    console.error(err);
    const msg = err.code === "auth/requires-recent-login"
      ? "Please log out and log back in first."
      : "❌ Failed to update password.";
    showMsg(msgEl, msg, "red");
  }
};

/* ── HELPER: show message ── */
function showMsg(el, text, color) {
  if (!el) return;
  const colors = { green: "#16a34a", red: "#dc2626", orange: "#d97706" };
  el.innerText = text;
  el.style.color = colors[color] || "#333";
}
