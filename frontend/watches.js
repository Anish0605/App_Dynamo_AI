// watches.js — Research Watcher (light theme, matches AI Memory / Document Library)

(function () {
  const B = () => window.BACKEND_URL || "";
  let _watches = [];
  let _freq = "weekly";

  // ── Open / Close ──────────────────────────────────────────────────────────

  window.openWatchesModal = function (prefillTopic = "") {
    const modal = document.getElementById("watches-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
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
    const modal = document.getElementById("watches-modal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
  };

  // Click-outside to close
  document.addEventListener("click", (e) => {
    const modal = document.getElementById("watches-modal");
    const inner = document.getElementById("watches-modal-inner");
    if (modal && !modal.classList.contains("hidden") && inner && !inner.contains(e.target)) {
      window.closeWatchesModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.closeWatchesModal();
  });

  // ── Render: List ──────────────────────────────────────────────────────────

  function _renderList() {
    _setHeader("Research Watcher", "Get notified when a topic has new developments");
    const body = document.getElementById("watches-body");
    const footer = document.getElementById("watches-footer");
    if (!body || !footer) return;

    if (!_watches.length) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;">
          <div style="width:48px;height:48px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <p style="font-size:14px;font-weight:600;color:#374151;margin:0 0 6px;">No watches yet</p>
          <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:0;">Watch a research topic and Dynamo AI<br>will alert you when there are new papers,<br>breakthroughs, or major discussions.</p>
        </div>`;
    } else {
      body.innerHTML = _watches.map((w, i) => {
        const isLast = i === _watches.length - 1;
        const activeStyle = w.is_active
          ? "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;"
          : "background:#f9fafb;color:#9ca3af;border:1px solid #e5e7eb;";
        return `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;${isLast ? "" : "border-bottom:1px solid #f3f4f6;"}">
          <div style="width:32px;height:32px;border-radius:50%;background:#fef9c3;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${_esc(w.topic)}">${_esc(w.topic)}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;${activeStyle}">${w.is_active ? "Active" : "Paused"}</span>
              <span style="font-size:11px;color:#9ca3af;">${w.frequency === "daily" ? "Daily checks" : "Weekly checks"}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <button id="check-btn-${w.id}" onclick="window._watchCheck('${w.id}')" title="Check now" style="
              background:#f9fafb;border:1px solid #e5e7eb;color:#6b7280;
              width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px;
              display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#fef9c3';this.style.borderColor='#fde047'" onmouseout="this.style.background='#f9fafb';this.style.borderColor='#e5e7eb'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-4.5"/></svg>
            </button>
            <button onclick="window._watchToggle('${w.id}',${!w.is_active})" title="${w.is_active ? "Pause" : "Resume"}" style="
              background:#f9fafb;border:1px solid #e5e7eb;color:#6b7280;
              width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px;
              display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">
              ${w.is_active
                ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                : `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`}
            </button>
            <button onclick="window._watchDelete('${w.id}')" title="Delete" style="
              background:#f9fafb;border:1px solid #e5e7eb;color:#ef4444;
              width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px;
              display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#fef2f2';this.style.borderColor='#fecaca'" onmouseout="this.style.background='#f9fafb';this.style.borderColor='#e5e7eb'">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>`;
      }).join("");
    }

    footer.innerHTML = `
      <button onclick="window._watchesShowAdd()" style="
        width:100%;background:#facc15;color:#000;border:none;
        padding:10px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:6px;
      " onmouseover="this.style.background='#eab308'" onmouseout="this.style.background='#facc15'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Watch a new topic
      </button>`;
  }

  window._renderList = _renderList;

  // ── Render: Add ───────────────────────────────────────────────────────────

  function _renderAdd(prefill = "") {
    _setHeader("Watch a topic", "We'll scan for new research and alert you");
    _freq = "weekly";
    const body = document.getElementById("watches-body");
    const footer = document.getElementById("watches-footer");
    if (!body || !footer) return;

    body.innerHTML = `
      <div style="margin-bottom:16px;">
        <label style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.05em;display:block;margin-bottom:6px;">TOPIC</label>
        <input id="watch-topic-input" type="text" placeholder="e.g. AI alignment, Quantum error correction…"
          value="${_esc(prefill)}"
          style="width:100%;box-sizing:border-box;background:#fff;border:1.5px solid #e5e7eb;color:#111827;
            padding:10px 14px;border-radius:9px;font-size:14px;outline:none;"
          onfocus="this.style.borderColor='#facc15';this.style.boxShadow='0 0 0 3px rgba(250,204,21,0.15)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"
        />
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.05em;display:block;margin-bottom:8px;">CHECK FREQUENCY</label>
        <div style="display:flex;gap:8px;">
          <button id="freq-weekly" onclick="window._watchSelectFreq('weekly')" style="
            flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
            background:#facc15;color:#000;border:2px solid #facc15;">Weekly</button>
          <button id="freq-daily" onclick="window._watchSelectFreq('daily')" style="
            flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
            background:#fff;color:#9ca3af;border:2px solid #e5e7eb;">
            Daily&nbsp;<span style="font-size:10px;color:#ca8a04;font-weight:700;">PRO</span>
          </button>
        </div>
      </div>
      <div id="watch-err" style="display:none;color:#ef4444;font-size:12px;margin-top:10px;"></div>`;

    footer.innerHTML = `
      <div style="display:flex;gap:8px;">
        <button onclick="window._renderList()" style="
          flex:1;background:#fff;color:#374151;border:1.5px solid #e5e7eb;
          padding:10px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;"
          onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">Back</button>
        <button id="watch-save-btn" onclick="window._watchSave()" style="
          flex:2;background:#facc15;color:#000;border:none;
          padding:10px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;"
          onmouseover="this.style.background='#eab308'" onmouseout="this.style.background='#facc15'">Start watching</button>
      </div>`;

    setTimeout(() => {
      const inp = document.getElementById("watch-topic-input");
      if (inp) { inp.focus(); if (prefill) inp.select(); }
    }, 50);
  }

  window._watchesShowAdd = function (prefill = "") { _renderAdd(prefill); };

  // ── Frequency selector ────────────────────────────────────────────────────

  window._watchSelectFreq = function (f) {
    _freq = f;
    const weekly = document.getElementById("freq-weekly");
    const daily  = document.getElementById("freq-daily");
    if (!weekly || !daily) return;
    if (f === "weekly") {
      weekly.style.cssText += ";background:#facc15;color:#000;border-color:#facc15;";
      daily.style.cssText  += ";background:#fff;color:#9ca3af;border-color:#e5e7eb;";
    } else {
      daily.style.cssText   += ";background:#facc15;color:#000;border-color:#facc15;";
      weekly.style.cssText  += ";background:#fff;color:#9ca3af;border-color:#e5e7eb;";
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

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
    if (_freq === "daily" && (user.plan === "free")) {
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
      if (err) { err.textContent = "Failed to save. Please try again."; err.style.display = "block"; }
      if (btn) { btn.textContent = "Start watching"; btn.disabled = false; }
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  window._watchDelete = async function (id) {
    const user = window._supabaseUser;
    if (!user) return;
    _watches = _watches.filter(w => w.id !== id);
    _updateWatchBadge();
    _renderList();
    fetch(`${B()}/watches/${id}?user_id=${encodeURIComponent(user.id)}`, { method: "DELETE" }).catch(() => {});
  };

  // ── Toggle pause/resume ───────────────────────────────────────────────────

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

  // ── Check now (triggers Brevo if noteworthy) ──────────────────────────────

  window._watchCheck = async function (id) {
    const user = window._supabaseUser;
    if (!user) return;
    const btn = document.getElementById(`check-btn-${id}`);
    if (btn) { btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-4.5"/></svg>`; btn.disabled = true; }

    try {
      const res = await fetch(`${B()}/watches/${id}/check?user_id=${encodeURIComponent(user.id)}`, { method: "POST" });
      const data = await res.json();
      _showCheckResult(data);
    } catch (e) {
      _showCheckResult({ error: "Check failed. Please try again." });
    } finally {
      if (btn) {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-4.5"/></svg>`;
        btn.disabled = false;
      }
    }
  };

  function _showCheckResult(data) {
    const existing = document.getElementById("watch-check-result");
    if (existing) existing.remove();

    const body = document.getElementById("watches-body");
    if (!body) return;

    const div = document.createElement("div");
    div.id = "watch-check-result";

    if (data.error) {
      div.style.cssText = "background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:13px;color:#dc2626;";
      div.textContent = data.error;
    } else if (data.noteworthy && data.notified) {
      div.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-bottom:12px;";
      div.innerHTML = `<p style="font-size:12px;font-weight:700;color:#16a34a;margin:0 0 4px;">📬 Alert sent to your email!</p><p style="font-size:12px;color:#374151;margin:0;line-height:1.5;">${_esc(data.summary)}</p>`;
    } else if (data.noteworthy && !data.notified) {
      div.style.cssText = "background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:12px 14px;margin-bottom:12px;";
      div.innerHTML = `<p style="font-size:12px;font-weight:700;color:#ca8a04;margin:0 0 4px;">🔔 Something's new — but email sending failed.</p><p style="font-size:12px;color:#374151;margin:0;line-height:1.5;">${_esc(data.summary)}</p>`;
    } else {
      div.style.cssText = "background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:12px;";
      div.innerHTML = `<p style="font-size:12px;font-weight:700;color:#6b7280;margin:0 0 4px;">No significant updates yet.</p><p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">${_esc(data.summary)}</p>`;
    }

    body.insertBefore(div, body.firstChild);
  }

  // ── Load from backend ─────────────────────────────────────────────────────

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

  // ── Badge ─────────────────────────────────────────────────────────────────

  function _updateWatchBadge() {
    const badge = document.getElementById("watches-count-badge");
    if (!badge) return;
    const active = _watches.filter(w => w.is_active).length;
    badge.textContent = active;
    badge.style.display = active > 0 ? "inline-flex" : "none";
  }

  // ── Hook into setAppUser to load badge on login ───────────────────────────

  const _origSetAppUser = window.setAppUser;
  window.setAppUser = function (user) {
    if (_origSetAppUser) _origSetAppUser(user);
    if (user) setTimeout(_loadWatches, 900);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _setHeader(title, subtitle) {
    const t = document.getElementById("watches-title");
    const s = document.getElementById("watches-subtitle");
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;
  }

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  console.log("watches.js loaded ✅");
})();
