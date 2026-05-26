// citation_checker.js — Dynamo AI
// Full Citation Checker modal — Version A (approved design)
// Plan gate: Plus & Pro only
// Supports: paste text/bibliography OR upload PDF/DOCX/LaTeX

(function () {
  "use strict";

  const FORMATS = ["APA 7th", "IEEE", "MLA 9th", "Harvard", "Vancouver", "Chicago"];

  // ── Plan gate ──────────────────────────────────────────────────────────────

  function _requirePlusOrPro() {
    const supa = window.appState?.supabaseUser;
    if (!supa) { window.openAuthModal?.("login"); return false; }
    const plan = (supa.plan || "free").toLowerCase();
    if (plan === "free") { _showUpgradeGate(); return false; }
    return true;
  }

  function _showUpgradeGate() {
    const el = document.createElement("div");
    el.id = "_cc-upgrade-gate";
    el.style.cssText = "position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;";
    el.innerHTML = `
      <div style="background:#fff;border-radius:20px;max-width:380px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="font-size:38px;margin-bottom:12px;">🔒</div>
        <h3 style="font-size:17px;font-weight:900;color:#111;margin:0 0 8px 0;">Citation Checker is a Plus &amp; Pro feature</h3>
        <p style="font-size:13px;color:#6b7280;line-height:1.65;margin:0 0 22px 0;">
          Upgrade to verify citations, fix formatting errors, and check DOIs — starting at <strong>₹199/mo</strong>.
        </p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="/pricing.html" style="display:block;padding:12px 16px;background:#facc15;color:#111;font-weight:800;font-size:14px;border-radius:12px;text-decoration:none;">⚡ See Plans &amp; Upgrade</a>
          <button onclick="document.getElementById('_cc-upgrade-gate').remove()" style="padding:10px;background:transparent;border:1px solid #e5e7eb;color:#9ca3af;font-size:13px;font-weight:600;border-radius:12px;cursor:pointer;">Maybe later</button>
        </div>
      </div>`;
    el.addEventListener("click", e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
  }

  // ── Modal open / close ─────────────────────────────────────────────────────

  window.openCitationChecker = function () {
    if (!_requirePlusOrPro()) return;
    if (document.getElementById("_cc-modal")) return;

    const modal = document.createElement("div");
    modal.id = "_cc-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;";

    modal.innerHTML = `
<div id="_cc-box" style="background:#fff;border-radius:20px;width:100%;max-width:1020px;height:90vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.28);font-family:'Inter',sans-serif;">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;background:#fff;">
    <div style="width:34px;height:34px;border-radius:10px;background:#facc15;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">⚡</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:800;font-size:14px;color:#111;">Dynamo AI — Citation Checker</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:1px;">Verify APA, IEEE, MLA, Harvard &amp; more · Powered by Dynamo AI</div>
    </div>
    <span style="font-size:11px;background:#fef9c3;color:#854d0e;font-weight:700;padding:4px 10px;border-radius:99px;border:1px solid #fde68a;">PLUS</span>
    <button id="_cc-close" style="margin-left:8px;width:28px;height:28px;border:none;background:#f3f4f6;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>
  </div>

  <!-- Body: two panels -->
  <div style="display:flex;flex:1;overflow:hidden;">

    <!-- LEFT PANEL -->
    <div id="_cc-left" style="width:44%;border-right:1px solid #f0f0f0;display:flex;flex-direction:column;padding:16px;gap:12px;overflow-y:auto;background:#fff;">

      <!-- Format pills -->
      <div>
        <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;margin-bottom:7px;">Citation Format</div>
        <div id="_cc-formats" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
      </div>

      <!-- Upload zone -->
      <div>
        <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;margin-bottom:7px;">Upload Document</div>
        <label id="_cc-upload-label" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:2px dashed #e5e7eb;background:#f9fafb;cursor:pointer;transition:border-color .2s,background .2s;">
          <div style="width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">📄</div>
          <div style="flex:1;min-width:0;">
            <div id="_cc-upload-name" style="font-size:12px;font-weight:600;color:#374151;">Upload PDF, DOCX or LaTeX</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">We'll extract your citations automatically</div>
          </div>
          <span style="font-size:10px;font-weight:700;color:#d1d5db;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">or paste below</span>
          <input id="_cc-file" type="file" accept=".pdf,.doc,.docx,.tex,.bib" style="display:none;" />
        </label>
      </div>

      <!-- Text areas -->
      <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;flex-direction:column;flex:1;">
          <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px;">Your Text (with in-text citations)</div>
          <textarea id="_cc-text" placeholder="Paste your academic text here..." style="flex:1;width:100%;min-height:140px;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:12px;color:#374151;resize:none;outline:none;background:#f9fafb;line-height:1.6;box-sizing:border-box;" onfocus="this.style.borderColor='#facc15'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;flex:1;">
          <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px;">Bibliography / References</div>
          <textarea id="_cc-bib" placeholder="Paste your bibliography or references list here..." style="flex:1;width:100%;min-height:100px;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:12px;color:#374151;resize:none;outline:none;background:#f9fafb;line-height:1.6;box-sizing:border-box;" onfocus="this.style.borderColor='#facc15'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
        </div>
      </div>

      <!-- Check button -->
      <button id="_cc-check-btn" style="width:100%;padding:12px;border-radius:12px;background:#facc15;color:#111;font-weight:800;font-size:13px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s;">
        ✅ Check Citations
      </button>

      <!-- What Dynamo AI does -->
      <div style="background:#f9fafb;border-radius:12px;padding:12px;border:1px solid #f0f0f0;">
        <div style="font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;margin-bottom:10px;">What Dynamo AI does</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            ["1","Parse","Reads every in-text citation and bibliography entry from your document"],
            ["2","Match","Cross-checks each in-text reference against your bibliography — catches missing entries and year mismatches"],
            ["3","Verify","Pings live databases (Crossref, Semantic Scholar) to confirm DOIs are real and papers exist"],
            ["4","Fix","Applies your chosen style rules and suggests exact corrected text for each issue"]
          ].map(([n,l,d]) => `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:20px;height:20px;border-radius:50%;background:#facc15;color:#111;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${n}</div>
            <div style="font-size:11px;line-height:1.55;color:#6b7280;"><strong style="color:#374151;">${l} — </strong>${d}</div>
          </div>`).join("")}
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <div id="_cc-right" style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fafafa;">

      <!-- Empty state -->
      <div id="_cc-empty" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;gap:12px;">
        <div style="font-size:48px;">📋</div>
        <div style="font-weight:700;font-size:14px;color:#6b7280;">Paste your text and references,<br/>then click Check Citations</div>
        <div style="font-size:12px;color:#d1d5db;">Supports APA, IEEE, MLA, Harvard, Vancouver, Chicago</div>
      </div>

      <!-- Loading state -->
      <div id="_cc-loading" style="flex:1;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;padding:32px;">
        <div style="font-size:40px;" id="_cc-spin">🔍</div>
        <div style="font-weight:700;font-size:14px;color:#6b7280;">Analysing citations…</div>
        <div id="_cc-steps" style="display:flex;flex-direction:column;gap:6px;"></div>
      </div>

      <!-- Results -->
      <div id="_cc-results" style="flex:1;display:none;flex-direction:column;overflow:hidden;">

        <!-- Score bar -->
        <div style="background:#fff;border-bottom:1px solid #f0f0f0;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-shrink:0;">
          <div style="position:relative;width:62px;height:62px;flex-shrink:0;">
            <svg viewBox="0 0 56 56" width="62" height="62" style="transform:rotate(-90deg);">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" stroke-width="6"/>
              <circle id="_cc-arc" cx="28" cy="28" r="22" fill="none" stroke="#facc15" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${2*Math.PI*22}" stroke-dashoffset="${2*Math.PI*22}" style="transition:stroke-dashoffset .8s ease,stroke .6s ease;"/>
            </svg>
            <div id="_cc-score-num" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#111;">—</div>
          </div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-weight:800;font-size:13px;color:#111;">Citation Health:</span>
              <span id="_cc-score-label" style="font-weight:800;font-size:13px;"></span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;font-size:11px;" id="_cc-counts"></div>
          </div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;background:#fff;border-bottom:1px solid #f0f0f0;padding:0 18px;flex-shrink:0;">
          <button id="_cc-tab-issues" onclick="window._ccSetTab('issues')" style="padding:10px 14px;font-size:11px;font-weight:800;border:none;background:transparent;cursor:pointer;border-bottom:2px solid #facc15;color:#111;margin-bottom:-1px;">Issues</button>
          <button id="_cc-tab-sources" onclick="window._ccSetTab('sources')" style="padding:10px 14px;font-size:11px;font-weight:800;border:none;background:transparent;cursor:pointer;border-bottom:2px solid transparent;color:#9ca3af;margin-bottom:-1px;">Source Verification</button>
        </div>

        <!-- Issues list -->
        <div id="_cc-issues-panel" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>

        <!-- Sources panel -->
        <div id="_cc-sources-panel" style="flex:1;overflow-y:auto;padding:12px;display:none;flex-direction:column;gap:8px;">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Dynamo AI verifies that each cited source is real and accessible via Crossref.</div>
        </div>
      </div>
    </div>
  </div>
</div>`;

    document.body.appendChild(modal);

    // Close handlers
    document.getElementById("_cc-close").addEventListener("click", _close);
    modal.addEventListener("click", e => { if (e.target === modal) _close(); });
    document.addEventListener("keydown", _onKey);

    // Build format pills
    let _format = "APA 7th";
    const fmtRow = document.getElementById("_cc-formats");
    FORMATS.forEach(f => {
      const btn = document.createElement("button");
      btn.textContent = f;
      btn.dataset.fmt = f;
      _applyFmtStyle(btn, f === _format);
      btn.addEventListener("click", () => {
        _format = f;
        document.querySelectorAll("[data-fmt]").forEach(b => _applyFmtStyle(b, b.dataset.fmt === _format));
      });
      fmtRow.appendChild(btn);
    });

    // Upload handler
    const fileInput = document.getElementById("_cc-file");
    const uploadLabel = document.getElementById("_cc-upload-label");
    uploadLabel.addEventListener("mouseenter", () => { uploadLabel.style.borderColor = "#facc15"; uploadLabel.style.background = "#fefce8"; });
    uploadLabel.addEventListener("mouseleave", () => { uploadLabel.style.borderColor = "#e5e7eb"; uploadLabel.style.background = "#f9fafb"; });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      document.getElementById("_cc-upload-name").textContent = file.name;
      if (file.name.endsWith(".txt") || file.name.endsWith(".bib")) {
        const txt = await file.text();
        document.getElementById("_cc-text").value = txt;
        return;
      }
      // Use existing /extract-text for PDF/DOCX
      const fd = new FormData();
      fd.append("file", file);
      try {
        const r = await fetch(`${window.BACKEND_URL || ""}/extract-text`, { method: "POST", body: fd });
        const data = await r.json();
        if (data.text) document.getElementById("_cc-text").value = data.text;
        else alert("Could not extract text from this file.");
      } catch (err) {
        alert("Upload failed — please paste your text manually.");
      }
    });

    // Check button
    document.getElementById("_cc-check-btn").addEventListener("click", () => {
      const text = document.getElementById("_cc-text").value.trim();
      const bib = document.getElementById("_cc-bib").value.trim();
      if (!text && !bib) { alert("Please paste your text or bibliography first."); return; }
      _runCheck(text, bib, _format);
    });

    // Tab state
    window._ccSetTab = (tab) => {
      const isIssues = tab === "issues";
      document.getElementById("_cc-issues-panel").style.display = isIssues ? "flex" : "none";
      document.getElementById("_cc-sources-panel").style.display = isIssues ? "none" : "flex";
      document.getElementById("_cc-tab-issues").style.borderBottomColor = isIssues ? "#facc15" : "transparent";
      document.getElementById("_cc-tab-issues").style.color = isIssues ? "#111" : "#9ca3af";
      document.getElementById("_cc-tab-sources").style.borderBottomColor = isIssues ? "transparent" : "#facc15";
      document.getElementById("_cc-tab-sources").style.color = isIssues ? "#9ca3af" : "#111";
    };

    console.log("citation_checker.js modal opened ✅");
  };

  function _applyFmtStyle(btn, active) {
    btn.style.cssText = `padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;border:1px solid ${active ? "#facc15" : "#e5e7eb"};background:${active ? "#fef9c3" : "transparent"};color:${active ? "#854d0e" : "#6b7280"};cursor:pointer;transition:all .15s;`;
  }

  async function _runCheck(text, bib, format) {
    const STEPS = [
      "Parsing in-text citations",
      "Matching with bibliography",
      "Verifying DOIs via Crossref",
      `Checking ${format} rules`,
    ];

    document.getElementById("_cc-empty").style.display = "none";
    document.getElementById("_cc-results").style.display = "none";

    const loadEl = document.getElementById("_cc-loading");
    loadEl.style.display = "flex";
    const stepsEl = document.getElementById("_cc-steps");
    stepsEl.innerHTML = "";
    STEPS.forEach((s, i) => {
      const d = document.createElement("div");
      d.style.cssText = "font-size:11px;color:#9ca3af;display:flex;align-items:center;justify-content:center;gap:8px;";
      d.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#fbbf24;display:inline-block;animation:pulse 1.2s ease-in-out infinite;animation-delay:${i*0.3}s;"></span>${s}`;
      stepsEl.appendChild(d);
    });

    const supa = window.appState?.supabaseUser;
    const userId = supa?.id || "";

    let data;
    try {
      const r = await fetch(`${window.BACKEND_URL || ""}/check-citations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, bibliography: bib, format, user_id: userId })
      });
      data = await r.json();
    } catch (err) {
      loadEl.style.display = "none";
      document.getElementById("_cc-empty").style.display = "flex";
      alert("Citation check failed — please try again.");
      return;
    }

    loadEl.style.display = "none";
    _renderResults(data, format);
  }

  let _fixedIds = new Set();

  function _renderResults(data, format) {
    _fixedIds = new Set();
    const score = data.score ?? 0;
    const issues = data.issues ?? [];
    const sources = data.sources ?? [];

    // Show results panel
    document.getElementById("_cc-results").style.display = "flex";
    window._ccSetTab("issues");

    // Score ring
    const arc = document.getElementById("_cc-arc");
    const circumference = 2 * Math.PI * 22;
    const offset = circumference * (1 - score / 100);
    arc.style.strokeDashoffset = offset;
    const scoreColor = score >= 80 ? "#22c55e" : score >= 50 ? "#facc15" : "#ef4444";
    arc.style.stroke = scoreColor;
    document.getElementById("_cc-score-num").textContent = score;
    const label = score >= 80 ? "Good" : score >= 50 ? "Needs work" : "Poor";
    const lblEl = document.getElementById("_cc-score-label");
    lblEl.textContent = label;
    lblEl.style.color = scoreColor;

    // Counts
    const errors = issues.filter(i => i.type === "error").length;
    const warnings = issues.filter(i => i.type === "warning").length;
    const infos = issues.filter(i => i.type === "info").length;
    document.getElementById("_cc-counts").innerHTML = `
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;"></span><b style="color:#374151;">${errors}</b> <span style="color:#9ca3af;">errors</span></span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:7px;height:7px;border-radius:50%;background:#facc15;display:inline-block;"></span><b style="color:#374151;">${warnings}</b> <span style="color:#9ca3af;">warnings</span></span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:7px;height:7px;border-radius:50%;background:#60a5fa;display:inline-block;"></span><b style="color:#374151;">${infos}</b> <span style="color:#9ca3af;">info</span></span>`;

    // Tab label
    document.getElementById("_cc-tab-issues").textContent = `Issues (${issues.length})`;

    // Issues list
    const panel = document.getElementById("_cc-issues-panel");
    panel.innerHTML = "";
    if (issues.length === 0) {
      panel.innerHTML = `<div style="text-align:center;padding:40px 20px;"><div style="font-size:36px;margin-bottom:10px;">🎉</div><div style="font-weight:800;font-size:14px;color:#16a34a;">All citations look correct!</div><div style="font-size:12px;color:#9ca3af;margin-top:6px;">Your ${format} citations passed all checks.</div></div>`;
    } else {
      issues.forEach(issue => _renderIssueCard(panel, issue));
    }

    // Sources list
    const srcPanel = document.getElementById("_cc-sources-panel");
    // Keep the header line, rebuild the rest
    srcPanel.innerHTML = `<div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">Dynamo AI verifies that each cited source is real and accessible via Crossref.</div>`;
    if (sources.length === 0) {
      srcPanel.innerHTML += `<div style="font-size:12px;color:#d1d5db;text-align:center;padding:20px;">No sources to verify.</div>`;
    } else {
      sources.forEach(src => {
        const statusEmoji = src.status === "verified" ? "✅" : src.status === "warning" ? "⚠️" : "❌";
        const statusBg = src.status === "verified" ? "#f0fdf4" : src.status === "warning" ? "#fefce8" : "#fef2f2";
        const statusBorder = src.status === "verified" ? "#bbf7d0" : src.status === "warning" ? "#fde68a" : "#fecaca";
        const badgeBg = src.status === "verified" ? "#dcfce7" : src.status === "warning" ? "#fef9c3" : "#fee2e2";
        const badgeColor = src.status === "verified" ? "#166534" : src.status === "warning" ? "#854d0e" : "#991b1b";
        const d = document.createElement("div");
        d.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid ${statusBorder};background:${statusBg};font-size:11px;`;
        d.innerHTML = `<span style="font-size:16px;flex-shrink:0;">${statusEmoji}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(src.ref)}</div>
            <div style="color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(src.journal || "")}</div>
            ${src.doi ? `<div style="color:#3b82f6;margin-top:1px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(src.doi)}</div>` : ""}
          </div>
          <span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:${badgeBg};color:${badgeColor};white-space:nowrap;">${src.status}</span>`;
        srcPanel.appendChild(d);
      });
    }
  }

  function _renderIssueCard(panel, issue, isFixed = false) {
    const TYPE = {
      error:   { bg: "#fef2f2", border: "#fecaca", badge_bg: "#fee2e2", badge_color: "#991b1b", dot: "#ef4444", icon: "✖" },
      warning: { bg: "#fefce8", border: "#fde68a", badge_bg: "#fef9c3", badge_color: "#854d0e", dot: "#facc15", icon: "⚠" },
      info:    { bg: "#eff6ff", border: "#bfdbfe", badge_bg: "#dbeafe", badge_color: "#1e40af", dot: "#60a5fa", icon: "ℹ" },
    };
    const c = TYPE[issue.type] || TYPE.info;
    const card = document.createElement("div");
    card.id = `_cc-issue-${issue.id}`;
    card.style.cssText = `border-radius:12px;border:1px solid ${c.border};background:${c.bg};overflow:hidden;`;

    card.innerHTML = `
      <button style="width:100%;display:flex;align-items:flex-start;gap:10px;padding:11px 13px;background:transparent;border:none;cursor:pointer;text-align:left;" onclick="_ccToggleIssue(${issue.id})">
        <span style="width:20px;height:20px;border-radius:50%;background:${c.dot};color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${c.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:800;color:#111;">${_esc(issue.title)}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:${c.badge_bg};color:${c.badge_color};">${issue.type}</span>
          </div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(issue.location || "")}</div>
        </div>
        <span style="color:#d1d5db;font-size:11px;flex-shrink:0;" id="_cc-chev-${issue.id}">▼</span>
      </button>
      <div id="_cc-detail-${issue.id}" style="display:none;padding:0 13px 12px 13px;border-top:1px solid ${c.border};">
        <p style="font-size:12px;color:#374151;margin:10px 0 8px 0;line-height:1.6;">${_esc(issue.detail)}</p>
        <div style="background:#fff;border:1px dashed #d1d5db;border-radius:9px;padding:9px 11px;margin-bottom:10px;">
          <div style="font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Suggested Fix</div>
          <p style="font-size:11px;color:#374151;margin:0;line-height:1.65;">${_esc(issue.fix)}</p>
        </div>
        <button onclick="_ccApplyFix(${issue.id})" style="padding:7px 14px;border-radius:9px;background:#111;color:#fff;font-size:11px;font-weight:800;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;">✓ Apply Fix</button>
      </div>`;

    panel.appendChild(card);
  }

  window._ccToggleIssue = function (id) {
    const detail = document.getElementById(`_cc-detail-${id}`);
    const chev = document.getElementById(`_cc-chev-${id}`);
    const open = detail.style.display === "block";
    detail.style.display = open ? "none" : "block";
    chev.textContent = open ? "▼" : "▲";
  };

  window._ccApplyFix = function (id) {
    _fixedIds.add(id);
    const card = document.getElementById(`_cc-issue-${id}`);
    if (!card) return;
    card.style.transition = "opacity .3s";
    card.style.opacity = "0";
    setTimeout(() => {
      card.remove();
      // Update counts in header
      const remaining = document.getElementById("_cc-issues-panel")?.querySelectorAll('[id^="_cc-issue-"]').length || 0;
      const tabBtn = document.getElementById("_cc-tab-issues");
      if (tabBtn) tabBtn.textContent = `Issues (${remaining})`;
      // Bump score visually
      const numEl = document.getElementById("_cc-score-num");
      const arc = document.getElementById("_cc-arc");
      if (numEl && arc) {
        const cur = parseInt(numEl.textContent) || 0;
        const next = Math.min(100, cur + 15);
        numEl.textContent = next;
        const circumference = 2 * Math.PI * 22;
        arc.style.strokeDashoffset = circumference * (1 - next / 100);
        const col = next >= 80 ? "#22c55e" : next >= 50 ? "#facc15" : "#ef4444";
        arc.style.stroke = col;
        const lbl = document.getElementById("_cc-score-label");
        if (lbl) { lbl.textContent = next >= 80 ? "Good" : next >= 50 ? "Needs work" : "Poor"; lbl.style.color = col; }
      }
      if (remaining === 0) {
        const panel = document.getElementById("_cc-issues-panel");
        if (panel) panel.innerHTML = `<div style="text-align:center;padding:40px 20px;"><div style="font-size:36px;margin-bottom:10px;">🎉</div><div style="font-weight:800;font-size:14px;color:#16a34a;">All issues resolved!</div><div style="font-size:12px;color:#9ca3af;margin-top:6px;">Your citations look great.</div></div>`;
      }
    }, 300);
  };

  function _close() {
    document.getElementById("_cc-modal")?.remove();
    document.removeEventListener("keydown", _onKey);
  }

  function _onKey(e) { if (e.key === "Escape") _close(); }

  function _esc(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  console.log("citation_checker.js loaded ✅");
})();
