// deep_research.js — Dynamo AI Deep Research Agent v4 (in-chat, standard layout)
// No separate modal — runs inside the main chat area like Find Research Gaps

(function () {
  "use strict";

  let _pollTimer    = null;
  let _timerTick    = null;
  let _elapsed      = 0;
  let _rawReport    = "";
  let _editMode     = false;
  let _currentJob   = null;
  let _cardId       = null;
  let _seenActivity = new Set();

  // ── Mode Activation ─────────────────────────────────────────────────────────
  // Called when user picks "Deep Research Agent" from the menu

  window.openDeepResearch = function (prefill) {
    window._drModeActive = true;
    _showBanner();
    const inp = document.getElementById("chat-input");
    if (inp) {
      inp.placeholder = "Type your research topic and press Enter...";
      inp.focus();
      if (prefill) { inp.value = prefill; inp.dispatchEvent(new Event("input")); }
    }
    window._closeAllFlyouts?.();
    window.closePlus?.();
  };

  // Kept for backwards compat (close button on old modal)
  window.closeDeepResearch = window.deactivateDeepResearchMode = function () {
    window._drModeActive = false;
    _removeBanner();
    const inp = document.getElementById("chat-input");
    if (inp) inp.placeholder = "Ask Dynamo anything...";
  };

  function _showBanner() {
    _removeBanner();
    // Insert banner above the input bar textarea
    const inputBar = document.getElementById("input-bar");
    if (!inputBar) return;
    const b = document.createElement("div");
    b.id = "dr-mode-banner";
    b.style.cssText = [
      "display:flex;align-items:center;gap:8px;",
      "padding:8px 14px;margin-bottom:8px;",
      "background:#fefce8;border:1px solid #fef08a;border-radius:12px;",
    ].join("");
    b.innerHTML = `
      <span style="font-size:16px;flex-shrink:0;">🤖</span>
      <span style="font-size:12px;font-weight:600;color:#92400e;flex:1;line-height:1.4;">
        <strong>Deep Research Agent</strong> — 6 targeted searches · gap analysis · full cited report · ~4–8 min
      </span>
      <button onclick="window.deactivateDeepResearchMode()"
        style="font-size:12px;color:#9ca3af;background:none;border:none;cursor:pointer;padding:2px 8px;border-radius:6px;"
        onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#9ca3af'">✕</button>
    `;
    inputBar.insertBefore(b, inputBar.firstChild);
  }

  function _removeBanner() { document.getElementById("dr-mode-banner")?.remove(); }

  // ── Entry point called by chat.js sendFromInput ─────────────────────────────

  window.runDeepResearchInChat = async function (query) {
    const supa = window.appState?.supabaseUser;
    if (!supa || supa.plan !== "pro") {
      window.renderAssistantMessage?.(
        "⚠️ **Deep Research Agent** is a Pro feature. [Upgrade your plan →](/pricing.html)"
      );
      return;
    }

    // Reset state
    _rawReport = ""; _editMode = false; _elapsed = 0;
    _currentJob = null; _seenActivity.clear();
    _cardId = "drc-" + Date.now();

    _injectCard(_cardId, query);
    _startTimer(_cardId);

    try {
      const res = await fetch(`${window.BACKEND_URL || ""}/deep-research/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query, user_id: supa.id, use_max: false }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Failed to start.");
      }
      const d = await res.json();
      _currentJob = d.job_id;
      _poll(_cardId, query);
    } catch (err) {
      _stopTimer();
      _cardError(_cardId, err.message);
    }
  };

  // ── Agent card HTML ──────────────────────────────────────────────────────────

  function _injectCard(id, query) {
    const chat = document.getElementById("chat-messages");
    if (!chat) return;
    if (typeof window.hideHero === "function") window.hideHero();

    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = "flex justify-start mb-6";
    wrap.innerHTML = `
      <div style="width:100%;max-width:740px;" class="rounded-2xl overflow-hidden border border-yellow-200 dark:border-yellow-800/40 bg-white dark:bg-gray-800 shadow-sm">

        <!-- Header -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-yellow-100 dark:border-yellow-900/30"
             style="background:linear-gradient(135deg,#fefce8,#fef9c3);">
          <div style="width:34px;height:34px;background:#facc15;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;">🤖</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#92400e;">Deep Research Agent · PRO</div>
            <div style="font-size:13px;font-weight:600;color:#1c1917;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${_esc(query)}"</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:13px;font-weight:700;font-family:monospace;color:#78716c;" id="${id}-timer">0:00</div>
            <div style="font-size:11px;color:#d97706;font-weight:500;" id="${id}-stage">Starting…</div>
          </div>
        </div>

        <!-- Progress panel -->
        <div id="${id}-progress" style="padding:14px 16px 16px;background:#fafaf9;border-bottom:1px solid #f3f4f6;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:8px;">Agent activity</div>
          <div id="${id}-log" style="display:flex;flex-direction:column;gap:2px;max-height:140px;overflow-y:auto;scrollbar-width:thin;"></div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:6px;">
            <div id="${id}-dot" style="width:7px;height:7px;border-radius:50%;background:#facc15;animation:pulse 1.5s infinite;flex-shrink:0;"></div>
            <span style="font-size:11px;color:#9ca3af;">Running — typically 4–8 minutes. You can browse other chats.</span>
          </div>
        </div>

        <!-- Report panel (hidden until done) -->
        <div id="${id}-report" style="display:none;padding:24px 20px 28px;">
          <div id="${id}-actions" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #f3f4f6;"></div>
          <div id="${id}-content" style="font-size:14px;line-height:1.8;color:#1f2937;" class="prose dark:prose-invert max-w-none"></div>
        </div>

        <!-- Error panel -->
        <div id="${id}-error" style="display:none;padding:20px 16px;color:#ef4444;font-size:13px;text-align:center;background:#fef2f2;"></div>

      </div>
    `;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
  }

  // ── Polling ──────────────────────────────────────────────────────────────────

  function _poll(id, query) {
    let lastMsg = "";
    _pollTimer = setInterval(async () => {
      try {
        const r = await fetch(`${window.BACKEND_URL || ""}/deep-research/status/${_currentJob}`);
        const d = await r.json();

        if (d.progress_msg && d.progress_msg !== lastMsg) {
          lastMsg = d.progress_msg;
          const el = document.getElementById(`${id}-stage`);
          if (el) el.textContent = d.progress_msg;
        }

        (d.activity || []).forEach(a => {
          if (!_seenActivity.has(a)) { _seenActivity.add(a); _logItem(id, a); }
        });

        if (d.status === "complete") {
          _stopPoll(); _stopTimer();
          _rawReport = d.report || "";
          _showReport(id, query, d);
        } else if (d.status === "error") {
          _stopPoll(); _stopTimer();
          _cardError(id, d.error || "Research failed.");
        }
      } catch (e) { console.warn("[DR] Poll error:", e); }
    }, 3000);
  }

  function _stopPoll() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

  // ── Timer ────────────────────────────────────────────────────────────────────

  function _startTimer(id) {
    _elapsed = 0;
    _timerTick = setInterval(() => {
      _elapsed++;
      const el = document.getElementById(`${id}-timer`);
      if (el) el.textContent = _fmt(_elapsed);
    }, 1000);
  }
  function _stopTimer() { if (_timerTick) { clearInterval(_timerTick); _timerTick = null; } }
  function _fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

  // ── Activity log ─────────────────────────────────────────────────────────────

  function _logItem(id, msg) {
    const log = document.getElementById(`${id}-log`);
    if (!log) return;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:7px;align-items:flex-start;padding:2px 0;border-bottom:1px solid #f9fafb;";
    row.innerHTML = `
      <span style="font-size:10px;color:#9ca3af;font-family:monospace;white-space:nowrap;flex-shrink:0;margin-top:1px;">${_fmt(_elapsed)}</span>
      <span style="font-size:12px;color:#4b5563;line-height:1.4;">${_esc(msg)}</span>
    `;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  // ── Report display ───────────────────────────────────────────────────────────

  function _showReport(id, query, data) {
    document.getElementById(`${id}-progress`)?.style.setProperty("display", "none");
    document.getElementById(`${id}-report`)?.style.setProperty("display", "block");

    const dot   = document.getElementById(`${id}-dot`);
    const stage = document.getElementById(`${id}-stage`);
    const timer = document.getElementById(`${id}-timer`);
    if (dot)   { dot.style.background = "#22c55e"; dot.style.animation = "none"; }
    if (stage) { stage.textContent = "Complete ✓"; stage.style.color = "#16a34a"; }
    if (timer && data.elapsed) timer.textContent = _fmt(data.elapsed);

    // Action buttons
    const q = _escAttr(query);
    const actions = document.getElementById(`${id}-actions`);
    if (actions) {
      actions.innerHTML = `
        <button id="${id}-edit-btn" onclick="window.drEdit('${id}')" style="${_btn()}">Edit</button>
        <button onclick="window.drDownload('${id}','${q}')" style="${_btn()}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:3px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download .md
        </button>
        <button onclick="window.drCopy('${id}')" style="${_btn()}">Copy</button>
        <button id="${id}-save-btn" onclick="window.drSave('${id}','${q}')" style="${_btn()}">Save to library</button>
        <button onclick="window.drFollowUp('${id}','${q}')" style="${_btn()}">Ask a follow-up →</button>
        <button id="${id}-paper-btn" onclick="window.drWritePaper('${id}','${q}')"
          style="font-size:12px;font-weight:700;color:#000;background:#facc15;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Draft Academic Paper
        </button>
        ${data.fallback ? `<span style="font-size:11px;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;padding:4px 10px;border-radius:999px;font-weight:600;display:inline-flex;align-items:center;">Enhanced mode</span>` : ""}
      `;
    }

    // Render markdown report
    const content = document.getElementById(`${id}-content`);
    if (content) {
      try { content.innerHTML = marked.parse(_rawReport); }
      catch { content.innerHTML = _mdFallback(_rawReport); }
    }

    // Push to chat history so follow-ups have context
    window.chatHistory?.push({ role: "assistant", content: `[Deep Research Report on: ${query}]\n\n${_rawReport}` });

    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function _cardError(id, msg) {
    document.getElementById(`${id}-progress`)?.style.setProperty("display", "none");
    const e = document.getElementById(`${id}-error`);
    if (e) { e.style.display = "block"; e.innerHTML = `❌ ${_esc(msg)}`; }
    const s = document.getElementById(`${id}-stage`);
    if (s) { s.textContent = "Error"; s.style.color = "#ef4444"; }
  }

  // ── Per-card actions ─────────────────────────────────────────────────────────

  window.drEdit = function (id) {
    _editMode = !_editMode;
    const btn     = document.getElementById(`${id}-edit-btn`);
    const content = document.getElementById(`${id}-content`);
    if (!content) return;
    if (_editMode) {
      const safe = _rawReport.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      content.innerHTML = `<textarea id="${id}-ta" style="width:100%;min-height:420px;border:1.5px solid #facc15;border-radius:10px;padding:14px;font-size:13px;line-height:1.8;font-family:ui-monospace,monospace;outline:none;resize:vertical;box-sizing:border-box;color:#1f2937;">${safe}</textarea>`;
      if (btn) btn.textContent = "Save edits";
    } else {
      const ta = document.getElementById(`${id}-ta`);
      if (ta) _rawReport = ta.value;
      try { content.innerHTML = marked.parse(_rawReport); } catch { content.innerHTML = _mdFallback(_rawReport); }
      if (btn) btn.textContent = "Edit";
    }
  };

  window.drDownload = function (id, query) {
    const text = _editMode ? (document.getElementById(`${id}-ta`)?.value || _rawReport) : _rawReport;
    if (!text) return;
    const fname = (query || "Research-Report").slice(0, 50).replace(/[^\w\s-]/g, "").trim() + ".md";
    const a = Object.assign(document.createElement("a"), {
      href:     URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" })),
      download: fname,
    });
    a.click(); URL.revokeObjectURL(a.href);
    _toast("Downloaded as .md ✓");
  };

  window.drCopy = function (id) {
    const text = _editMode ? (document.getElementById(`${id}-ta`)?.value || _rawReport) : _rawReport;
    navigator.clipboard.writeText(text).then(() => _toast("Copied ✓")).catch(() => _toast("Copy failed"));
  };

  window.drSave = async function (id, query) {
    const user = window.appState?.supabaseUser;
    if (!user) { _toast("Please sign in to save."); return; }
    const text = _editMode ? (document.getElementById(`${id}-ta`)?.value || _rawReport) : _rawReport;
    if (!text) { _toast("No report to save."); return; }
    const btn  = document.getElementById(`${id}-save-btn`);
    if (btn) { btn.textContent = "Saving…"; btn.disabled = true; }
    try {
      const r = await fetch(`${window.BACKEND_URL || ""}/save-document-text`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ user_id: user.id, filename: `Deep Research — ${(query || "Report").slice(0, 60)}.txt`, text }),
      });
      const d = await r.json();
      if (d.success) {
        _toast("Saved to Document Library ✓");
        if (btn) btn.textContent = "Saved ✓";
        window.refreshDocCount?.();
      } else {
        _toast("Save failed: " + (d.error || "error"));
        if (btn) { btn.textContent = "Save to library"; btn.disabled = false; }
      }
    } catch (e) {
      _toast("Save: " + e.message);
      if (btn) { btn.textContent = "Save to library"; btn.disabled = false; }
    }
  };

  window.drFollowUp = function (id, query) {
    const inp = document.getElementById("chat-input");
    if (inp) {
      inp.value = `Follow-up on my deep research about "${query}": `;
      inp.dispatchEvent(new Event("input"));
      inp.style.height = ""; inp.style.height = inp.scrollHeight + "px";
      inp.focus();
    }
  };

  // ── Draft Academic Paper ─────────────────────────────────────────────────────
  // Takes the completed Deep Research report and generates a structured
  // academic paper (Abstract → Introduction → Lit Review → Discussion → Conclusion → References)
  // using DeepThink-level model. Result appears as a new chat message.

  window.drWritePaper = async function (id, query) {
    const report = _editMode
      ? (document.getElementById(`${id}-ta`)?.value || _rawReport)
      : _rawReport;

    if (!report || report.length < 100) {
      _toast("No research report available to draft from."); return;
    }

    const userId = window.appState?.supabaseUserId;
    if (!userId) { _toast("Please sign in to use this feature."); return; }

    // Disable button to prevent double-click
    const btn = document.getElementById(`${id}-paper-btn`);
    if (btn) { btn.textContent = "Drafting…"; btn.disabled = true; btn.style.opacity = "0.6"; }

    // Show user bubble + thinking indicator in the chat
    window.renderUserMessage?.(
      `✍️ Draft an academic paper from my Deep Research on: "${query || "this topic"}"`
    );
    window.showThinking?.();

    // Scroll chat into view
    const chat = document.getElementById("chat-messages");
    if (chat) chat.scrollTop = chat.scrollHeight;

    const prompt =
`You are an expert academic writer. I have just completed a deep research investigation.
Using the research report below as your ONLY source material, write a complete, well-structured academic paper.

━━━ RESEARCH REPORT ━━━
${report.slice(0, 7000)}
━━━ END REPORT ━━━

Write the academic paper now using this exact structure. Every section must be substantive — no placeholders.

---

# [Insert a clear academic paper title]

## Abstract
(150–200 words) Summarise the topic, key findings, implications, and limitations in one paragraph.

## 1. Introduction
- Background and context of the topic
- Why this matters (significance)
- The central research question this paper addresses
- Brief overview of the paper structure

## 2. Literature Review
- Synthesise what is known about this topic from the research
- Organise thematically, not as a list
- Note agreements and contradictions between sources
- Cite sources as [Author/Source, Year] inline

## 3. Analysis & Discussion
- Present the key findings from the research in depth
- Discuss patterns, implications, and what they mean
- Address complexity — avoid oversimplification
- Compare multiple perspectives where relevant

## 4. Conclusion
- Summarise the main argument and key takeaways
- State limitations of this research
- Suggest 2–3 specific directions for future research

## References
- List every source cited in the paper, formatted consistently
- Include URLs where available from the research report

Rules:
- Use formal, academic English throughout
- Every claim must trace back to the research report — no hallucination
- Citations must appear inline as [Source, Year] where used
- Minimum 1,200 words total`;

    try {
      const res = await window.callBackend("/chat", {
        message:       prompt,
        history:       [],
        use_search:    false,
        deep_dive:     true,        // DeepThink model — best reasoning
        force_image:   false,
        mode:          "chat",
        smart_action:  true,        // Skip keyword routing
        user_id:       userId,
      });

      window.hideThinking?.();

      const reply = res?.reply || res?.content || "";
      if (reply) {
        window.renderAssistantMessage?.(reply, reply, true, []);
        window.chatHistory?.push({ role: "assistant", content: reply });
      } else {
        window.renderAssistantMessage?.("⚠️ Could not generate the academic paper. Please try again.");
      }
    } catch (err) {
      window.hideThinking?.();
      window.renderAssistantMessage?.("⚠️ Error drafting paper: " + err.message);
      console.error("[DR WritePaper]", err);
    } finally {
      if (btn) { btn.textContent = "Draft Academic Paper"; btn.disabled = false; btn.style.opacity = "1"; }
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function _btn(type) {
    if (type === "yellow") return "font-size:12px;font-weight:700;color:#000;background:#facc15;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;";
    return "font-size:12px;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;padding:7px 12px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;";
  }

  function _esc(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function _escAttr(s) {
    return String(s || "").replace(/'/g,"\\'").replace(/"/g,"&quot;").slice(0,120);
  }

  function _mdFallback(md) {
    return md
      .replace(/^## (.+)$/gm,'<h2 style="font-size:15px;font-weight:700;margin:18px 0 6px;">$1</h2>')
      .replace(/^### (.+)$/gm,'<h3 style="font-size:14px;font-weight:600;margin:12px 0 4px;">$1</h3>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:800;margin:0 0 10px;">$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/\[(\d+)\]/g,'<sup style="color:#2563eb;font-size:10px;">[$1]</sup>')
      .replace(/^- (.+)$/gm,'<li style="margin:3px 0;">$1</li>')
      .replace(/(<li.*<\/li>\n?)+/g,s=>`<ul style="padding-left:18px;margin:8px 0;">${s}</ul>`)
      .replace(/\n\n+/g,'</p><p style="margin:8px 0;line-height:1.8;">')+' </p>';
  }

  function _toast(msg) {
    const t = document.createElement("div");
    t.style.cssText="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(10,10,20,.9);color:#fff;font-size:12px;padding:9px 20px;border-radius:999px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap;";
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  // Backwards-compat stubs
  window.startDeepResearch = window.drNewResearch = window.drCopyReport = () => {};
  window.drSaveToLibrary   = (btn) => window.drSave(_cardId, "");
  window.drDownloadReport  = ()    => window.drDownload(_cardId, "");
  window.drEditReport      = (btn) => window.drEdit(_cardId);
  window.drSendToChat      = ()    => window.drFollowUp(_cardId, "");

  console.log("deep_research.js v4 (in-chat) loaded ✅");
})();
