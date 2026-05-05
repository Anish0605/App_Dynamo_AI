// auth.js — Dynamo AI (FINAL PRO + SUPABASE SYNC)
console.log("✅ auth.js loaded");

/* --------------------------------------------------
   GLOBAL DEFAULT
-------------------------------------------------- */
window.authMode = "login";

/* --------------------------------------------------
   FIREBASE INIT
-------------------------------------------------- */
let firebaseAuth = null;

if (typeof firebase !== "undefined" && firebase.apps) {
  const firebaseConfig = {
    apiKey: "AIzaSyDcYXrbVi9mW54MMTofbxuyo4lALglkK2M",
    authDomain: "dynamo-ai-01.firebaseapp.com",
    projectId: "dynamo-ai-01",
    storageBucket: "dynamo-ai-01.firebasestorage.app",
    messagingSenderId: "1083537512306",
    appId: "1:1083537512306:web:d0e68ddb69fb5f8199efeb"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  firebaseAuth = firebase.auth();

} else {
  console.error("❌ Firebase not loaded");
}

/* --------------------------------------------------
   🔥 SYNC FIREBASE → SUPABASE
-------------------------------------------------- */
async function syncUserWithSupabase(firebaseUser) {
  try {
    if (!window.supabaseClient || !firebaseUser) return;

    const today = new Date().toISOString().split("T")[0];

    // 1. Check existing user
    const { data, error } = await window.supabaseClient
      .from("users")
      .select("*")
      .eq("firebase_uid", firebaseUser.uid)
      .single();

    let userData = data;

    // 2. Create if not exists
    if (!userData) {
      const { data: newUser, error: insertError } = await window.supabaseClient
        .from("users")
        .insert([{
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || "User",
          plan: "free",
          daily_quota_used: 0,
          quota_date: today
        }])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Supabase insert failed:", insertError);
        return;
      }

      userData = newUser;
    }

    // 2b. Patch full_name if missing in existing record
    if (userData && !userData.full_name && firebaseUser.displayName) {
      const { data: patched } = await window.supabaseClient
        .from("users")
        .update({ full_name: firebaseUser.displayName })
        .eq("id", userData.id)
        .select()
        .single();

      if (patched) userData = patched;
    }

    // 3. SAVE TO APP STATE ✅
    window.setAppUser(firebaseUser);
    await window.setSupabaseUser(userData);

    // 4. UPDATE SIDEBAR WITH REAL NAME + PLAN
    updateSidebarPlan(userData);

    console.log("✅ Supabase user synced:", userData.id);

  } catch (err) {
    console.error("❌ syncUserWithSupabase error:", err);
  }
}

/* --------------------------------------------------
   AUTH STATE (IMPORTANT FIX)
-------------------------------------------------- */
firebaseAuth?.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("🔥 Firebase user detected");

    updateAuthUI(user);
    window.setAppUser(user);

    // PostHog: identify logged-in user
    if (window.posthog) {
      window.posthog.identify(user.uid, {
        email: user.email,
        name: user.displayName || user.email?.split("@")[0] || "User"
      });
    }

    // ✅ sync user
    await syncUserWithSupabase(user);

    // ✅ FORCE REFRESH APP STATE AFTER LOGIN
    setTimeout(() => {
      console.log("🚀 Forcing app refresh after login");

      window.loadChatSidebar?.();
      window.dumpState?.();
    }, 500);

  } else {
    resetAuthUI();

    window.setAppUser(null);
    window.setSupabaseUser(null);

    // PostHog: reset on logout
    if (window.posthog) window.posthog.reset();

    window.loadChatSidebar?.();
  }
});

/* --------------------------------------------------
   SUBMIT HANDLER  — exposed as window so <form onsubmit> can call it
-------------------------------------------------- */

/* --------------------------------------------------
   REDIRECT RESULT (handles mobile Google redirect flow)
-------------------------------------------------- */
firebaseAuth?.getRedirectResult().then(result => {
  if (result && result.user) {
    console.log("✅ Google redirect auth complete");
    window.closeAuthModal?.();
  }
}).catch(err => {
  // auth/no-auth-event is expected when there's no pending redirect
  if (err.code && err.code !== "auth/no-auth-event") {
    console.error("❌ Redirect result error:", err.code, err.message);
    const errorBox = document.getElementById("auth-error");
    if (errorBox) showAuthError(errorBox, friendlyAuthError(err.code));
  }
});

/* --------------------------------------------------
   GOOGLE LOGIN  (popup on desktop, redirect on mobile)
-------------------------------------------------- */
window.signInWithGoogle = async () => {
  const errorBox = document.getElementById("auth-error");
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");

    // Mobile browsers block popups — use redirect flow instead
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    if (isMobile) {
      // Shows a loading state — page will redirect to Google then come back
      const googleBtn = document.querySelector("[onclick='window.signInWithGoogle()']");
      if (googleBtn) {
        googleBtn.disabled = true;
        googleBtn.innerHTML = `<svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Redirecting to Google…`;
      }
      await firebaseAuth.signInWithRedirect(provider);
      // Page navigates away here — getRedirectResult() handles completion on return

    } else {
      await firebaseAuth.signInWithPopup(provider);
      console.log("✅ Google popup login success");
      window.closeAuthModal();
    }

  } catch (err) {
    console.error("❌ Google login error:", err);
    if (errorBox) showAuthError(errorBox, friendlyAuthError(err.code || err.message));
    else alert(err.message);
  }
};

/* --------------------------------------------------
   LOGIN / SIGNUP
-------------------------------------------------- */
let _authSubmitting = false;

window.handleAuthSubmit = async function handleAuthSubmit() {
  if (_authSubmitting) return;
  if (!firebaseAuth) return alert("Firebase not ready");

  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;
  const name = document.getElementById("auth-name")?.value;
  const errorBox = document.getElementById("auth-error");
  const btn = document.getElementById("auth-submit");

  if (!email || !password) {
    showAuthError(errorBox, "Please enter your email and password.");
    return;
  }

  _authSubmitting = true;
  if (errorBox) { errorBox.textContent = ""; errorBox.classList.add("hidden"); }
  if (btn) { btn.disabled = true; btn.textContent = "Please wait…"; btn.style.opacity = "0.7"; }

  try {
    let userCred;

    if (window.authMode === "signup") {
      const consent = document.getElementById("auth-consent");
      if (!consent || !consent.checked) {
        showAuthError(errorBox, "Please accept Terms & Privacy Policy.");
        return;
      }

      userCred = await firebaseAuth.createUserWithEmailAndPassword(email, password);

      if (name) {
        await userCred.user.updateProfile({ displayName: name });
      }

      await userCred.user.sendEmailVerification();

      window.closeAuthModal();

      setTimeout(() => {
        alert("📩 Verification email sent. Please verify before logging in.");
      }, 400);

    } else {
      userCred = await firebaseAuth.signInWithEmailAndPassword(email, password);

      window.closeAuthModal();

      if (!userCred.user.emailVerified) {
        setTimeout(() => {
          alert("⚠️ Please verify your email before using the app.");
        }, 400);
      }
    }

  } catch (err) {
    console.error("❌ Auth error:", err);
    const msg = friendlyAuthError(err.code || err.message);
    showAuthError(errorBox, msg);
  } finally {
    _authSubmitting = false;
    if (btn) { btn.disabled = false; btn.textContent = "Continue"; btn.style.opacity = ""; }
  }
}

function showAuthError(box, msg) {
  if (!box) return;
  box.textContent = msg;
  box.classList.remove("hidden");
}

function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found":       "No account found with this email. Try signing up.",
    "auth/wrong-password":       "Incorrect password. Please try again.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/too-many-requests":    "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/invalid-credential":   "Email or password is incorrect.",
    "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
    "auth/weak-password":        "Password must be at least 6 characters.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

/* --------------------------------------------------
   PASSWORD RESET
-------------------------------------------------- */
window.resetPassword = async () => {
  const email = document.getElementById("auth-email")?.value;

  if (!email) return alert("Enter email first");

  try {
    await firebaseAuth.sendPasswordResetEmail(email, {
      url: "https://app.dynamoai.in",
      handleCodeInApp: false
    });

    alert("📩 Reset email sent");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

/* --------------------------------------------------
   LOGOUT
-------------------------------------------------- */
window.handleLogout = async () => {
  try {
    if (firebaseAuth) await firebaseAuth.signOut();
  } catch (e) {
    console.warn("signOut error:", e);
  }

  window.setAppUser(null);
  window.setSupabaseUser(null);
  resetAuthUI();

  // Clear Firebase tokens from localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith("firebase:"))
    .forEach(k => localStorage.removeItem(k));

  // Clear Firebase tokens from sessionStorage
  Object.keys(sessionStorage)
    .filter(k => k.startsWith("firebase:"))
    .forEach(k => sessionStorage.removeItem(k));

  // Delete Firebase IndexedDB so it can't re-authenticate on next load
  try {
    indexedDB.deleteDatabase("firebaseLocalStorageDb");
  } catch (e) {}

  // Reload after storage is cleared so Firebase starts fresh with no session
  window.location.reload();
};

/* --------------------------------------------------
   MODAL CONTROL
-------------------------------------------------- */
window.closeAuthModal = () => {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  // Reset inline styles that might have been set
  modal.style.cssText = "";
  // Clear form state
  _authSubmitting = false;
};

window.openAuthModal = (mode) => {
  window.authMode = mode || "login";

  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.remove("hidden");

  setTimeout(() => {
    applyAuthModeUI();
    if (window.lucide) lucide.createIcons();
    modal.scrollTop = 0;
  }, 50);
};


/* --------------------------------------------------
   TOGGLE MODE
-------------------------------------------------- */
window.toggleAuthMode = () => {
  window.authMode = window.authMode === "login" ? "signup" : "login";
  applyAuthModeUI();
};

/* --------------------------------------------------
   UI CONTROL
-------------------------------------------------- */
function applyAuthModeUI() {
  const title = document.getElementById("auth-title");
  const name = document.getElementById("auth-name");
  const phone = document.getElementById("auth-phone");
  const footerText = document.getElementById("auth-footer-text");
  const footerAction = document.getElementById("auth-footer-action");

  const forgotBox = document.getElementById("forgot-password-box");
  const gdprBox = document.getElementById("gdpr-box");

  if (window.authMode === "signup") {
    if (title) title.textContent = "Join Dynamo";

    name?.classList.remove("hidden");
    phone?.classList.remove("hidden");

    forgotBox?.classList.add("hidden");
    // gdpr-box uses "hidden flex" — remove hidden to show it as flex
    if (gdprBox) { gdprBox.classList.remove("hidden"); gdprBox.style.display = "flex"; }

    if (footerText) footerText.textContent = "Already have an account?";
    if (footerAction) footerAction.textContent = "Log in";

  } else {
    if (title) title.textContent = "Welcome Back";

    name?.classList.add("hidden");
    phone?.classList.add("hidden");

    forgotBox?.classList.remove("hidden");
    if (gdprBox) { gdprBox.classList.add("hidden"); gdprBox.style.display = ""; }

    if (footerText) footerText.textContent = "New to Dynamo?";
    if (footerAction) footerAction.textContent = "Sign up";
  }
}

/* --------------------------------------------------
   UI HELPERS
-------------------------------------------------- */
function updateAuthUI(user) {
  const name = user.displayName || user.email?.split("@")[0] || "User";
  const initials = name.substring(0, 2).toUpperCase();

  document.getElementById("user-display-name").textContent = name;
  document.getElementById("sidebar-avatar").textContent = initials;

  document.getElementById("logged-out-view")?.classList.add("hidden");
  document.getElementById("header-logout-btn")?.classList.remove("hidden");
}

function resetAuthUI() {
  document.getElementById("user-display-name").textContent = "Guest";
  document.getElementById("sidebar-avatar").textContent = "G";
  document.getElementById("sidebar-plan").textContent = "FREE";

  document.getElementById("logged-out-view")?.classList.remove("hidden");
  document.getElementById("header-logout-btn")?.classList.add("hidden");
}

function updateSidebarPlan(supabaseUser) {
  const plan = (supabaseUser?.plan || "free").toUpperCase();
  const name = supabaseUser?.full_name || window.appState?.user?.displayName || "User";
  const initials = name.substring(0, 2).toUpperCase();

  document.getElementById("sidebar-avatar").textContent = initials;
  document.getElementById("user-display-name").textContent = name;
  document.getElementById("sidebar-plan").textContent = plan;
}