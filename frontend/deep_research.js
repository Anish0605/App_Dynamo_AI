// deep_research.js — Dynamo AI Deep Research Agent UI v3
// Fixes: save-to-library endpoint, ask-follow-up chat-input ID,
//        add edit + download, live activity log, timer sync

(function () {
  "use strict";

  let _pollTimer  = null;
  let _currentJob = null;
  let _elapsed    = 0;
  let _timerTick  = null;
  let _rawReport  = "";
  let _editMode   = false;

  // ── Open / Close ───────────────────────────────────────────────────────────

  window.openDeepResearch = function (prefill) {
    const modal = document.getElementById("deep-research-modal");
    if (!modal) return;
    _resetUI();
    if (prefill) {
      const inp = document.getElementById("dr-query-input");
      if (inp) inp.value = prefill;
    }
    modal.classList.remove("hidden");
    document.getElementById("dr-query-input")?.focus();
  };

  window.closeDeepResearch = function () {
    document.getElementById("deep-research-modal")?.classList.add("hidden");
    _stopPoll();
    _stopTimer();
  };

  // ── Start Research ─────────────────────────────────────────────────────────

  window.startDeepResearch = async function () {
    const query = document.getElementById("dr-query-input")?.value?.trim();
    if (!query) { _showToast("Please enter a research topic."); return; }

    const firebaseUser = window.appState?.user;
    const supabaseUser = window.appState?.supabaseUser;

    if (!firebaseUser) {
      _showToast("Please sign in to use Deep Research.");
      return;
    }

    if (!supabaseUser || supabaseUser.plan !== "pro") {
      _showToast("Deep Research is a Pro feature. Please upgrade.");
      return;
    }

    // Populate running phase query label
    const rq = document.getElementById("dr-running-query");
    if (rq) rq.textContent = `"${query}"`;

    _showPhase("running");
    _startTimer();
    _clearActivityLog();
    _addActivity("🧠 Analysing research scope and intent…");
    _setStage("Initialising agent…");

    try {
      const res = await fetch(`${window.BACKEND_URL || ""}/deep-research/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          query,
          user_id:  supabaseUser.id,
          use_max:  document.getElementById("dr-use-max")?.checked || false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to start research.");
      }

      const data = await res.json();
      _currentJob = data.job_id;
      _pollStatus();
    } catch (err) {
      _setStage("Error: " + err.message);
      _showPhase("error");
      const errEl = document.getElementById("dr-error-msg");
      if (errEl) errEl.textContent = err.message;
      _stopTimer();
    }
  };

  // ── Polling ────────────────────────────────────────────────────────────────

  function _pollStatus() {
    if (!_currentJob) return;
    let lastMsg = "";

    _pollTimer = setInterval(async () => {
      try {
        const res  = await fetch(`${window.BACKEND_URL || ""}/deep-research/status/${_currentJob}`);
        const data = await res.json();

        if (data.progress_msg && data.progress_msg !== lastMsg) {
          lastMsg = data.progress_msg;
          _setStage(data.progress_msg);
          _addActivity(_decorateMsg(data.progress_msg, data.status));
        }

        // Show live tool calls / searches if present
        if (data.activity && Array.isArray(data.activity)) {
          data.activity.forEach(a => {
            if (!_seenActivity.has(a)) {
              _seenActivity.add(a);
              _addActivity(a);
            }
          });
        }

        if (data.status === "complete") {
          _stopPoll();
          _stopTimer();
          _rawReport = data.report || "";
          _renderReport(data);
          _showPhase("report");
          if (data.fallback) {
            document.getElementById("dr-fallback-badge")?.classList.remove("hidden");
          }
          _addActivity("✅ Research complete — report ready");
        } else if (data.status === "error") {
          _stopPoll();
          _stopTimer();
          _showPhase("error");
          const errEl = document.getElementById("dr-error-msg");
          if (errEl) errEl.textContent = data.error || "An error occurred.";
        }
      } catch (e) {
        console.warn("[DeepResearch] Poll error:", e);
      }
    }, 3000);
  }

  const _seenActivity = new Set();

  function _decorateMsg(msg, status) {
    if (status === "complete")                       return "✅ " + msg;
    if (/plan|scope|intent/i.test(msg))              return "📋 " + msg;
    if (/search|scan|web|crawl/i.test(msg))          return "🔍 " + msg;
    if (/extract|read|paper|source/i.test(msg))      return "📄 " + msg;
    if (/analys|evaluat/i.test(msg))                 return "🧬 " + msg;
    if (/gap|miss|blind/i.test(msg))                 return "🔭 " + msg;
    if (/synth|combin|integrat/i.test(msg))          return "⚗️ " + msg;
    if (/writ|draft|report|format/i.test(msg))       return "✍️ " + msg;
    return "⚡ " + msg;
  }

  function _stopPoll() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    _seenActivity.clear();
  }

  // ── Timer ──────────────────────────────────────────────────────────────────

  function _startTimer() {
    _elapsed = 0;
    const el = document.getElementById("dr-running-timer");
    if (el) el.textContent = "0:00";
    _timerTick = setInterval(() => {
      _elapsed++;
      const el2 = document.getElementById("dr-running-timer");
      if (el2) el2.textContent = _fmtTime(_elapsed);
    }, 1000);
  }

  function _stopTimer() {
    if (_timerTick) { clearInterval(_timerTick); _timerTick = null; }
  }

  function _fmtTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── Activity Log ───────────────────────────────────────────────────────────

  function _addActivity(msg) {
    const log = document.getElementById("dr-activity-log");
    if (!log) return;
    const el = document.createElement("div");
    el.style.cssText = "padding:5px 0;font-size:12px;color:rgba(255,255,255,.5);line-height:1.5;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:flex-start;gap:8px;";
    const ts = document.createElement("span");
    ts.style.cssText = "color:rgba(255,255,255,.2);font-size:10px;white-space:nowrap;margin-top:2px;font-family:monospace;";
    ts.textContent = _fmtTime(_elapsed);
    const txt = document.createElement("span");
    txt.textContent = msg;
    el.appendChild(ts);
    el.appendChild(txt);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function _clearActivityLog() {
    const log = document.getElementById("dr-activity-log");
    if (log) log.innerHTML = "";
    _seenActivity.clear();
  }

  function _setStage(msg) {
    const el = document.getElementById("dr-running-stage");
    if (el) el.textContent = msg;
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────

  function _showPhase(phase) {
    ["plan", "running", "report", "error"].forEach(p => {
      const el = document.getElementById(`dr-phase-${p}`);
      if (el) el.classList.toggle("hidden", p !== phase);
    });
  }

  function _resetUI() {
    _currentJob = null;
    _rawReport  = "";
    _editMode   = false;
    _stopPoll();
    _stopTimer();
    _showPhase("plan");
    const inp = document.getElementById("dr-query-input");
    if (inp) inp.value = "";
    const timer = document.getElementById("dr-running-timer");
    if (timer) timer.textContent = "0:00";
    _setStage("Ready to begin…");
    _clearActivityLog();
    const report = document.getElementById("dr-report-content");
    if (report) report.innerHTML = "";
    document.getElementById("dr-fallback-badge")?.classList.add("hidden");
    const errEl = document.getElementById("dr-error-msg");
    if (errEl) errEl.textContent = "";
  }

  // ── Report Rendering ───────────────────────────────────────────────────────

  function _renderReport(data) {
    const container = document.getElementById("dr-report-content");
    if (!container) return;
    _rawReport  = data.report || "";
    _editMode   = false;
    container.innerHTML = _markdownToHtml(_rawReport);

    // Update report meta
    const fin = document.getElementById("dr-report-elapsed");
    if (fin && data.elapsed) fin.textContent = _fmtTime(data.elapsed);

    // Reset edit button label
    const editBtn = document.getElementById("dr-edit-btn");
    if (editBtn) { editBtn.textContent = "Edit"; editBtn.style.color = ""; }
  }

  function _markdownToHtml(md) {
    return md
      .replace(/^## (.+)$/gm,  '<h2 class="dr-h2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="dr-h3">$1</h3>')
      .replace(/^# (.+)$/gm,   '<h1 class="dr-h1">$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,     '<em>$1</em>')
      .replace(/\[(\d+)\]/g, '<sup class="dr-cite">[$1]</sup>')
      .replace(/^---+$/gm,   '<hr class="dr-hr">')
      .replace(/^- (.+)$/gm, '<li class="dr-li">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, s => `<ul class="dr-ul">${s}</ul>`)
      .replace(/\n\n+/g, '</p><p class="dr-p">')
      .replace(/^(?!<[h|u|p|l|h])/gm, '<p class="dr-p">') + '</p>';
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  window.drCopyReport = function () {
    const text = _getReportText();
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => _showToast("Report copied to clipboard ✓"))
      .catch(() => _showToast("Copy failed — please select and copy manually."));
  };

  window.drSaveToLibrary = async function (btn) {
    const user = window.appState?.supabaseUser;
    if (!user) { _showToast("Please sign in to save to library."); return; }

    const text = _getReportText();
    if (!text) { _showToast("No report to save."); return; }

    const queryEl  = document.getElementById("dr-query-input");
    const filename = `Deep Research — ${(queryEl?.value || "Report").slice(0, 60)}.txt`;

    if (btn) { const orig = btn.textContent; btn.textContent = "Saving…"; btn.disabled = true;
      try {
        const res  = await fetch(`${window.BACKEND_URL || ""}/save-document-text`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ user_id: user.id, filename, text }),
        });
        const data = await res.json();
        if (data.success) {
          _showToast("Saved to Document Library ✓");
          btn.textContent = "Saved ✓";
          if (typeof window.refreshDocCount === "function") window.refreshDocCount();
        } else {
          _showToast("Save failed: " + (data.error || "unknown error"));
          btn.textContent = orig;
        }
      } catch (e) {
        _showToast("Save failed: " + e.message);
        btn.textContent = orig;
      } finally {
        btn.disabled = false;
      }
    }
  };

  window.drSendToChat = function () {
    const queryEl = document.getElementById("dr-query-input");
    const text    = _getReportText();
    const summary = (text || "").slice(0, 1000);
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.value = `Based on this deep research report on "${queryEl?.value || "the topic"}":\n\n${summary}\n\nMy follow-up question: `;
      chatInput.dispatchEvent(new Event("input"));
      chatInput.style.height = "";
      chatInput.style.height = chatInput.scrollHeight + "px";
      chatInput.focus();
    }
    window.closeDeepResearch();
  };

  window.drEditReport = function (btn) {
    const container = document.getElementById("dr-report-content");
    if (!container) return;

    _editMode = !_editMode;

    if (_editMode) {
      // Escape for textarea display
      const escaped = _rawReport.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      container.innerHTML = `<textarea id="dr-edit-textarea"
        style="width:100%;min-height:520px;background:rgba(255,255,255,.04);border:1px solid rgba(250,204,21,.35);
               border-radius:14px;padding:20px;font-size:13.5px;color:rgba(255,255,255,.88);
               line-height:1.85;font-family:ui-monospace,monospace;resize:vertical;outline:none;
               box-sizing:border-box;caret-color:#facc15;">${escaped}</textarea>`;
      if (btn) { btn.textContent = "Save edits"; btn.style.color = "#facc15"; }
    } else {
      // Save edits → re-render
      const ta = document.getElementById("dr-edit-textarea");
      if (ta) _rawReport = ta.value;
      container.innerHTML = _markdownToHtml(_rawReport);
      if (btn) { btn.textContent = "Edit"; btn.style.color = ""; }
    }
  };

  window.drDownloadReport = function () {
    const text = _getReportText();
    if (!text) { _showToast("No report to download."); return; }
    const queryEl = document.getElementById("dr-query-input");
    const topic   = (queryEl?.value || "Research Report").slice(0, 50).replace(/[^\w\s-]/g, "").trim();
    const blob    = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href = url; a.download = `${topic}.md`; a.click();
    URL.revokeObjectURL(url);
    _showToast("Report downloaded as .md ✓");
  };

  window.drNewResearch = function () {
    _resetUI();
    document.getElementById("dr-query-input")?.focus();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _getReportText() {
    if (_editMode) {
      return document.getElementById("dr-edit-textarea")?.value || _rawReport;
    }
    return _rawReport;
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  function _showToast(msg) {
    const t = document.createElement("div");
    t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(10,10,20,.95);color:#fff;font-size:12px;padding:10px 20px;border-radius:999px;z-index:9999;box-shadow:0 4px 24px rgba(0,0,0,.4);white-space:nowrap;";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  console.log("deep_research.js v3 loaded ✅");
})();
