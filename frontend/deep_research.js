// deep_research.js — Dynamo AI Deep Research Agent UI
// v1.0 — Phase 1 (Gemini Interactions API)

(function () {
  "use strict";

  let _pollTimer  = null;
  let _currentJob = null;
  let _elapsed    = 0;
  let _timerTick  = null;

  // ── Open / Close ────────────────────────────────────────────────────────────

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

  // ── Start Research ───────────────────────────────────────────────────────────

  window.startDeepResearch = async function () {
    const query = document.getElementById("dr-query-input")?.value?.trim();
    if (!query) { _showToast("Please enter a research topic."); return; }

    const useMax = document.getElementById("dr-use-max")?.checked;
    const user   = window.appUser;

    if (!user) {
      _showToast("Please sign in to use Deep Research.");
      return;
    }

    if (user.plan !== "pro") {
      _showToast("Deep Research is a Pro feature. Please upgrade your plan.");
      return;
    }

    _showPhase("running");
    _startTimer();
    _setStatus("planning", "Building research plan…");

    try {
      const res = await fetch(`${window.BACKEND_URL || ""}/deep-research/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          query,
          user_id:  user.id,
          use_max:  useMax || false,
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
      _setStatus("error", err.message);
      _showPhase("error");
      _stopTimer();
    }
  };

  // ── Polling ──────────────────────────────────────────────────────────────────

  function _pollStatus() {
    if (!_currentJob) return;
    _pollTimer = setInterval(async () => {
      try {
        const res  = await fetch(`${window.BACKEND_URL || ""}/deep-research/status/${_currentJob}`);
        const data = await res.json();

        _setStatus(data.status, data.progress_msg || "");

        if (data.status === "complete") {
          _stopPoll();
          _stopTimer();
          _renderReport(data);
          _showPhase("report");
        } else if (data.status === "error") {
          _stopPoll();
          _stopTimer();
          _showPhase("error");
          _setStatus("error", data.error || "An error occurred.");
        }
      } catch (e) {
        console.warn("[DeepResearch] Poll error:", e);
      }
    }, 3000);
  }

  function _stopPoll() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  // ── Timer ────────────────────────────────────────────────────────────────────

  function _startTimer() {
    _elapsed   = 0;
    _timerTick = setInterval(() => {
      _elapsed++;
      const el = document.getElementById("dr-elapsed");
      if (el) el.textContent = _fmtTime(_elapsed);
    }, 1000);
  }

  function _stopTimer() {
    if (_timerTick) { clearInterval(_timerTick); _timerTick = null; }
  }

  function _fmtTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────

  function _showPhase(phase) {
    ["plan", "running", "report", "error"].forEach(p => {
      const el = document.getElementById(`dr-phase-${p}`);
      if (el) el.classList.toggle("hidden", p !== phase);
    });
  }

  function _setStatus(status, msg) {
    const el     = document.getElementById("dr-status-msg");
    const dot    = document.getElementById("dr-status-dot");
    const colors = { planning: "bg-yellow-400", researching: "bg-blue-400",
                     complete:  "bg-green-400",  error:       "bg-red-400",
                     starting:  "bg-yellow-400" };
    if (el)  el.textContent = msg;
    if (dot) { dot.className = `w-2 h-2 rounded-full ${colors[status] || "bg-white/30"} ${status !== "complete" && status !== "error" ? "animate-pulse" : ""}`; }

    // Animate plan steps
    _updatePlanSteps(status);
  }

  const PLAN_STEPS = [
    { id: "dr-step-1", label: "Map the landscape",      threshold: "planning"     },
    { id: "dr-step-2", label: "Search web & academic",  threshold: "researching"  },
    { id: "dr-step-3", label: "Extract key insights",   threshold: "researching"  },
    { id: "dr-step-4", label: "Identify research gaps", threshold: "researching"  },
    { id: "dr-step-5", label: "Synthesise & write",     threshold: "complete"     },
  ];

  const STATUS_RANK = { starting: 0, planning: 1, researching: 2, complete: 3, error: 3 };

  function _updatePlanSteps(status) {
    const rank = STATUS_RANK[status] || 0;
    PLAN_STEPS.forEach((step, i) => {
      const el = document.getElementById(step.id);
      if (!el) return;
      const stepRank = STATUS_RANK[step.threshold] || 0;
      const done     = rank > stepRank || (rank === stepRank && rank > 0);
      const active   = rank === stepRank && rank > 0;
      el.className   = `dr-step ${done ? "done" : active ? "active" : "pending"}`;
    });
  }

  function _resetUI() {
    _currentJob = null;
    _stopPoll();
    _stopTimer();
    _showPhase("plan");
    const inp = document.getElementById("dr-query-input");
    if (inp) inp.value = "";
    const el = document.getElementById("dr-elapsed");
    if (el)  el.textContent = "0:00";
    _setStatus("starting", "Ready to start research");
    const report = document.getElementById("dr-report-content");
    if (report) report.innerHTML = "";
    const badge = document.getElementById("dr-fallback-badge");
    if (badge) badge.classList.add("hidden");
  }

  // ── Report Rendering ─────────────────────────────────────────────────────────

  function _renderReport(data) {
    const container = document.getElementById("dr-report-content");
    if (!container) return;

    const raw = data.report || "";
    container.innerHTML = _markdownToHtml(raw);

    // Show fallback badge if needed
    if (data.fallback) {
      document.getElementById("dr-fallback-badge")?.classList.remove("hidden");
    }

    // Update elapsed
    const el = document.getElementById("dr-elapsed");
    if (el && data.elapsed) el.textContent = _fmtTime(data.elapsed);
  }

  function _markdownToHtml(md) {
    return md
      .replace(/^## (.+)$/gm, '<h2 class="dr-h2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="dr-h3">$1</h3>')
      .replace(/^# (.+)$/gm, '<h1 class="dr-h1">$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[(\d+)\]/g, '<sup class="dr-cite">[$1]</sup>')
      .replace(/^---+$/gm, '<hr class="dr-hr">')
      .replace(/^- (.+)$/gm, '<li class="dr-li">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, s => `<ul class="dr-ul">${s}</ul>`)
      .replace(/\n\n+/g, '</p><p class="dr-p">')
      .replace(/^(?!<[h|u|p|l|h])/gm, '<p class="dr-p">')
      + '</p>';
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  window.drCopyReport = function () {
    const el = document.getElementById("dr-report-content");
    if (!el) return;
    navigator.clipboard.writeText(el.innerText)
      .then(() => _showToast("Report copied to clipboard"))
      .catch(() => _showToast("Copy failed — please select and copy manually."));
  };

  window.drSaveToLibrary = async function () {
    const user = window.appUser;
    if (!user) { _showToast("Please sign in to save to library."); return; }

    const reportEl = document.getElementById("dr-report-content");
    const queryEl  = document.getElementById("dr-query-input");
    if (!reportEl) return;

    const text     = reportEl.innerText;
    const filename = `Deep Research — ${queryEl?.value?.slice(0, 60) || "Report"}.txt`;

    try {
      const res = await fetch(`${window.BACKEND_URL || ""}/save-document`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: user.id, filename, text }),
      });
      if (res.ok) {
        _showToast("Saved to Document Library ✓");
        if (typeof window.refreshDocCount === "function") window.refreshDocCount();
      } else {
        _showToast("Save failed — please try again.");
      }
    } catch (e) {
      _showToast("Save failed: " + e.message);
    }
  };

  window.drSendToChat = function () {
    const reportEl = document.getElementById("dr-report-content");
    const queryEl  = document.getElementById("dr-query-input");
    if (!reportEl) return;
    const summary = reportEl.innerText.slice(0, 800);
    const inp = document.getElementById("user-input") || document.querySelector("textarea");
    if (inp) {
      inp.value = `Based on this deep research report on "${queryEl?.value}":\n\n${summary}\n\nPlease `;
      inp.focus();
    }
    window.closeDeepResearch();
  };

  window.drNewResearch = function () {
    _resetUI();
    document.getElementById("dr-query-input")?.focus();
  };

  // ── Toast ────────────────────────────────────────────────────────────────────

  function _showToast(msg) {
    const t = document.createElement("div");
    t.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-4 py-2 rounded-full z-[200] shadow-xl";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  console.log("deep_research.js loaded ✅");
})();
