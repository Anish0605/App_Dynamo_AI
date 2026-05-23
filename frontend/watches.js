// watches.js — Research Watcher modal
// Manages topic watches from profile modal and Deep Research "Notify Me" button

(function () {
  const B = () => window.BACKEND_URL || "";
  let _modal = null;
  let _view = "list"; // "list" | "add"
  let _watches = [];
  let _prefillTopic = "";

  // ── Inject modal HTML once ────────────────────────────────────────────────

  function _injectModal() {
    if (document.getElementById("watches-modal")) return;
    const el = document.createElement("div");
    el.id = "watches-modal";
    el.style.cssText = `
      display:none;position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
      align-items:center;justify-content:center;
    `;
    el.innerHTML = `
      <div id="watches-inner" style="
        background:#111;border:1px solid #2a2a2a;border-radius:16px;
        width:90%;max-width:480px;max-height:85vh;overflow:hidden;
        display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.7);
      ">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 16px;border-bottom:1px solid #1e1e1e;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">🔔</span>
            <div>
              <div style="font-size:15px;font-weight:700;color:#fff;" id="watches-title">Research Watcher</div>
              <div style="font-size:12px;color:#666;" id="watches-subtitle">Get notified when a topic has new developments</div>
            </div>
          </div>
          <button onclick="window.closeWatchesModal()" style="
            background:none;border:none;color:#666;font-size:20px;cursor:pointer;
            width:32px;height:32px;display:flex;align-items:center;justify-content:center;
            border-radius:8px;transition:background 0.15s;
          " onmouseover="this.style.background='#1e1e1e'" onmouseout="this.style.background='none'">✕</button>
        </div>

        <!-- Body -->
        <div id="watches-body" style="flex:1;overflow-y:auto;padding:16px 20px 20px;"></div>

        <!-- Footer -->
        <div id="watches-footer" style="padding:12px 20px;border-top:1px solid #1e1e1e;"></div>
      </div>
    `;
    el.addEventListener("click", (e) => {
      if (e.target === el) window.closeWatchesModal();
    });
    document.body.appendChild(el);
    _modal = el;
  }

  // ── Render: List view ─────────────────────────────────────────────────────

  function _renderList() {
    _view = "list";
    const body = document.getElementById("watches-body");
    const footer = document.getElementById("watches-footer");
    document.getElementById("watches-title").textContent = "Research Watcher";
    document.getElementById("watches-subtitle").textContent = "Get notified when a topic has new developments";

    if (!_watches.length) {
      body.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
          <div style="font-size:40px;margin-bottom:12px;">🔔</div>
          <div style="color:#fff;font-weight:600;font-size:15px;margin-bottom:6px;">No watches yet</div>
          <div style="color:#555;font-size:13px;line-height:1.5;">
            Watch a research topic and Dynamo AI will alert you when there are new papers, breakthroughs, or major discussions.
          </div>
        </div>
      `;
    } else {
      body.innerHTML = _watches.map(w => `
        <div style="
          background:#1a1a1a;border:1px solid #252525;border-radius:12px;
          padding:14px 16px;margin-bottom:10px;
          display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
        ">
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${_esc(w.topic)}">
              ${_esc(w.topic)}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="
                font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;
                ${w.is_active
                  ? "background:#052e16;color:#4ade80;border:1px solid #14532d;"
                  : "background:#1c1c1c;color:#555;border:1px solid #2a2a2a;"}
              ">${w.is_active ? "Active" : "Paused"}</span>
              <span style="font-size:11px;color:#555;">
                ${w.frequency === "daily" ? "Daily checks" : "Weekly checks"}
              </span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button onclick="window._watchToggle('${w.id}',${!w.is_active})" title="${w.is_active ? "Pause" : "Resume"}" style="
              background:#1e1e1e;border:1px solid #2a2a2a;color:#aaa;
              width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;
              display:flex;align-items:center;justify-content:center;
            ">${w.is_active ? "⏸" : "▶"}</button>
            <button onclick="window._watchDelete('${w.id}')" title="Delete" style="
              background:#1e1e1e;border:1px solid #2a2a2a;color:#ef4444;
              width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;
              display:flex;align-items:center;justify-content:center;
            ">✕</button>
          </div>
        </div>
      `).join("");
    }

    footer.innerHTML = `
      <button onclick="window._watchesShowAdd()" style="
        width:100%;background:#facc15;color:#000;border:none;
        padding:11px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;
      ">+ Watch a new topic</button>
    `;
  }

  // ── Render: Add view ──────────────────────────────────────────────────────

  function _renderAdd(prefill = "") {
    _view = "add";
    const body = document.getElementById("watches-body");
    const footer = document.getElementById("watches-footer");
    document.getElementById("watches-title").textContent = "Watch a topic";
    document.getElementById("watches-subtitle").textContent = "We'll scan for new research and alert you";

    body.innerHTML = `
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;color:#888;font-weight:600;display:block;margin-bottom:6px;">TOPIC</label>
        <input id="watch-topic-input" type="text" placeholder="e.g. AI alignment, Quantum error correction…"
          value="${_esc(prefill)}"
          style="
            width:100%;box-sizing:border-box;
            background:#1a1a1a;border:1px solid #2a2a2a;color:#fff;
            padding:11px 14px;border-radius:10px;font-size:14px;outline:none;
          "
          onfocus="this.style.borderColor='#facc15'" onblur="this.style.borderColor='#2a2a2a'"
        />
      </div>
      <div>
        <label style="font-size:12px;color:#888;font-weight:600;display:block;margin-bottom:8px;">CHECK FREQUENCY</label>
        <div style="display:flex;gap:8px;">
          <button id="freq-weekly" onclick="window._watchSelectFreq('weekly')" style="
            flex:1;padding:9px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;
            background:#facc15;color:#000;border:2px solid #facc15;transition:all 0.15s;
          ">Weekly</button>
          <button id="freq-daily" onclick="window._watchSelectFreq('daily')" style="
            flex:1;padding:9px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;
            background:#1a1a1a;color:#888;border:2px solid #2a2a2a;transition:all 0.15s;
          ">Daily <span style="font-size:10px;color:#facc15;font-weight:700;">PRO</span></button>
        </div>
      </div>
      <div id="watch-err" style="display:none;color:#f87171;font-size:12px;margin-top:10px;"></div>
    `;

    footer.innerHTML = `
      <div style="display:flex;gap:8px;">
        <button onclick="window._renderList()" style="
          flex:1;background:#1a1a1a;color:#aaa;border:1px solid #2a2a2a;
          padding:11px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;
        ">Back</button>
        <button id="watch-save-btn" onclick="window._watchSave()" style="
          flex:2;background:#facc15;color:#000;border:none;
          padding:11px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;
        ">Start watching</button>
      </div>
    `;

    setTimeout(() => {
      const inp = document.getElementById("watch-topic-input");
      if (inp) { inp.focus(); if (prefill) inp.select(); }
    }, 50);
  }

  // ── Frequency selector ────────────────────────────────────────────────────

  let _freq = "weekly";
  window._watchSelectFreq = function (f) {
    _freq = f;
    ["weekly", "daily"].forEach(k => {
      const btn = document.getElementById(`freq-${k}`);
      if (!btn) return;
      if (k === f) {
        btn.style.background = "#facc15"; btn.style.color = "#000"; btn.style.borderColor = "#facc15";
      } else {
        btn.style.background = "#1a1a1a"; btn.style.color = "#888"; btn.style.borderColor = "#2a2a2a";
      }
    });
  };

  // ── Save new watch ────────────────────────────────────────────────────────

  window._watchSave = async function () {
    const topic = (document.getElementById("watch-topic-input")?.value || "").trim();
    const err = document.getElementById("watch-err");
    if (!topic) {
      if (err) { err.textContent = "Please enter a topic."; err.style.display = "block"; }
      return;
    }
    const user = window._supabaseUser;
    if (!user) {
      if (err) { err.textContent = "Please log in first."; err.style.display = "block"; }
      return;
    }

    const plan = user.plan || "free";
    if (_freq === "daily" && plan === "free") {
      if (err) { err.textContent = "Daily checks require a Pro plan."; err.style.display = "block"; }
      return;
    }

    const btn = document.getElementById("watch-save-btn");
    if (btn) { btn.textContent = "Saving…"; btn.disabled = true; }

    try {
      const res = await fetch(`${B()}/watches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, topic, frequency: _freq }),
      });
      const data = await res.json();
      if (data.watch) {
        _watches.unshift(data.watch);
        _updateWatchBadge();
        _renderList();
      } else {
        throw new Error("No watch returned");
      }
    } catch (e) {
      console.error(e);
      if (err) { err.textContent = "Failed to save. Please try again."; err.style.display = "block"; }
      if (btn) { btn.textContent = "Start watching"; btn.disabled = false; }
    }
  };

  // ── Delete watch ──────────────────────────────────────────────────────────

  window._watchDelete = async function (id) {
    const user = window._supabaseUser;
    if (!user) return;
    _watches = _watches.filter(w => w.id !== id);
    _updateWatchBadge();
    _renderList();
    fetch(`${B()}/watches/${id}?user_id=${encodeURIComponent(user.id)}`, { method: "DELETE" }).catch(() => {});
  };

  // ── Toggle watch ──────────────────────────────────────────────────────────

  window._watchToggle = async function (id, newState) {
    const user = window._supabaseUser;
    if (!user) return;
    _watches = _watches.map(w => w.id === id ? { ...w, is_active: newState } : w);
    _renderList();
    fetch(`${B()}/watches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, is_active: newState }),
    }).catch(() => {});
  };

  // ── Show add form ─────────────────────────────────────────────────────────

  window._watchesShowAdd = function (prefill = "") {
    _freq = "weekly";
    _renderAdd(prefill);
  };

  window._renderList = _renderList;

  // ── Badge update ──────────────────────────────────────────────────────────

  function _updateWatchBadge() {
    const badge = document.getElementById("watches-count-badge");
    if (!badge) return;
    const active = _watches.filter(w => w.is_active).length;
    if (active > 0) {
      badge.textContent = active;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }

  // ── Load watches from backend ─────────────────────────────────────────────

  async function _loadWatches() {
    const user = window._supabaseUser;
    if (!user) return;
    try {
      const res = await fetch(`${B()}/watches?user_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      _watches = data.watches || [];
      _updateWatchBadge();
    } catch (e) {
      console.warn("watches load failed", e);
    }
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  window.openWatchesModal = function (prefillTopic = "") {
    _injectModal();
    _prefillTopic = prefillTopic;
    _freq = "weekly";
    _modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    _loadWatches().then(() => {
      if (prefillTopic) {
        _renderAdd(prefillTopic);
      } else {
        _renderList();
      }
    });
  };

  window.closeWatchesModal = function () {
    if (_modal) { _modal.style.display = "none"; }
    document.body.style.overflow = "";
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && _modal?.style.display === "flex") {
      window.closeWatchesModal();
    }
  });

  // ── Load badge on user ready ──────────────────────────────────────────────

  const _origSetAppUser = window.setAppUser;
  window.setAppUser = function (user) {
    if (_origSetAppUser) _origSetAppUser(user);
    if (user) setTimeout(_loadWatches, 800);
  };

  // ── HTML escape helper ────────────────────────────────────────────────────

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  console.log("watches.js loaded ✅");
})();
