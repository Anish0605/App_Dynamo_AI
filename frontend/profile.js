// profile.js — Dynamo AI (FINAL PRO VERSION)
console.log("✅ profile.js loaded");

/* -------------------------
   GLOBAL REFS
------------------------- */
let modal = null;
let closeBtn = null;

/* -------------------------
   INIT
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  modal = document.getElementById("profile-modal");
  closeBtn = document.getElementById("profile-close");

  if (!modal || !closeBtn) {
    console.error("❌ Profile modal elements not found");
    return;
  }

  /* -------------------------
     CLOSE
  ------------------------- */
  closeBtn.onclick = () => modal.classList.add("hidden");

  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  /* -------------------------
     BUTTONS
  ------------------------- */

  const upgradeBtn = document.getElementById("upgrade-btn");
  const guideBtn = document.getElementById("guide-btn");
  const supportBtn = document.getElementById("support-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (upgradeBtn) {
    upgradeBtn.onclick = () => {
      window.location.href = "https://dynamoai.in/pricing.html";
    };
  }

  if (guideBtn) {
    guideBtn.onclick = () => {
      window.location.href = "https://dynamoai.in/guide.html";
    };
  }

  if (supportBtn) {
    supportBtn.onclick = () => {
      window.location.href = "mailto:support@dynamoai.in";
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        if (window.handleLogout) {
          await window.handleLogout();
        }
        modal.classList.add("hidden");
      } catch (err) {
        console.error("Logout error:", err);
      }
    };
  }

  /* -------------------------
     ICONS
  ------------------------- */
  if (window.lucide) lucide.createIcons();
});

/* -------------------------
   OPEN PROFILE
------------------------- */
window.openProfile = () => {
  if (!modal) return;

  modal.classList.remove("hidden");
  loadProfileData();
};

/* -------------------------
   LOAD PROFILE DATA
------------------------- */
async function loadProfileData() {
  try {
    const user = window.appState?.supabaseUser;

    /* -------------------------
       GUEST MODE
    ------------------------- */
    if (!user) {
      setProfileUI("Guest", "G", "FREE");
      return;
    }

    /* -------------------------
       USE LOCAL DATA (FAST)
    ------------------------- */
    const firebaseUser = window.appState?.user;
    const name = user.full_name || firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "User";
    const initials = name.substring(0, 2).toUpperCase();
    const plan = (user.plan || "free").toUpperCase();

    setProfileUI(name, initials, plan);

    /* -------------------------
       OPTIONAL REFRESH FROM DB
    ------------------------- */
    if (window.supabaseClient) {
      const { data } = await window.supabaseClient
        .from("users")
        .select("plan, full_name")
        .eq("id", user.id)
        .single();

      if (data) {
        const freshName = data.full_name || name;
        const freshInitials = freshName.substring(0, 2).toUpperCase();
        const freshPlan = (data.plan || "free").toUpperCase();

        setProfileUI(freshName, freshInitials, freshPlan);
      }
    }

  } catch (err) {
    console.error("❌ loadProfileData error:", err);
  }
}

/* -------------------------
   UI SETTER (CLEAN)
------------------------- */
function setProfileUI(name, initials, plan) {
  document.getElementById("profile-name").innerText = name;
  document.getElementById("profile-avatar").innerText = initials;
  document.getElementById("profile-plan").innerText = plan;
}