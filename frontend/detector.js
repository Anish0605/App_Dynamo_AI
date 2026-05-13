// detector.js — Dynamo AI
// In-house AI Text Detector + Plagiarism Checker
// Powered by Gemini + Tavily + Semantic Scholar (no extra API keys)

(function () {
  "use strict";

  // ── Open / Close ────────────────────────────────────────────────────────────

  window.openDetectorModal = function (tab) {
    const modal = document.getElementById("detector-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    _switchTab(tab || "ai");
    if (window.lucide) window.lucide.createIcons();
  };

  window.closeDetectorModal = function () {
    const modal = document.getElementById("detector-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  };

  // ── Tab switching ────────────────────────────────────────────────────────────

  function _switchTab(tab) {
    document.getElementById("det-tab-ai").classList.toggle("det-tab-active", tab === "ai");
    document.getElementById("det-tab-plag").classList.toggle("det-tab-active", tab === "plag");
    document.getElementById("det-pane-ai").classList.toggle("hidden", tab !== "ai");
    document.getElementById("det-pane-plag").classList.toggle("hidden", tab !== "plag");
  }

  window.detSwitchTab = _switchTab;

  // ── AI Detection ─────────────────────────────────────────────────────────────

  window.runAiDetect = async function () {
    const text = (document.getElementById("det-ai-input")?.value || "").trim();
    if (text.length < 50) {
      _setStatus("det-ai-status", "⚠️ Please paste at least 50 characters of text.", "warn");
      return;
    }

    const btn = document.getElementById("det-ai-btn");
    _setBtnLoading(btn, "Analysing…");
    _setStatus("det-ai-status", "🔍 Analysing writing patterns…", "info");
    document.getElementById("det-ai-result").classList.add("hidden");

    try {
      const res = await window.callBackend("/detect-ai", { text });
      _renderAiResult(res);
    } catch (err) {
      _setStatus("det-ai-status", "⚠️ Detection failed: " + err.message, "error");
    } finally {
      _setBtnDone(btn, "Analyse Text");
    }
  };

  function _renderAiResult(r) {
    const score = Math.max(0, Math.min(100, r.score || 50));
    const label = r.label || "Mixed";
    const conf  = r.confidence || "Medium";
    const sigs  = r.signals  || [];
    const summ  = r.summary  || "";

    // color based on score
    const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
    const bgCol = score >= 70 ? "#fef2f2" : score >= 40 ? "#fffbeb" : "#f0fdf4";
    const bdCol = score >= 70 ? "#fecaca" : score >= 40 ? "#fde68a" : "#bbf7d0";

    const el = document.getElementById("det-ai-result");
    el.innerHTML = `
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:18px 20px;">

        <!-- Score row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:13px;font-weight:800;color:${color};">${label}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Confidence: ${conf}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:900;color:${color};font-family:monospace;">${score}</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;">AI score / 100</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;margin-bottom:14px;">
          <div style="width:${score}%;height:100%;background:${color};border-radius:999px;transition:width .6s;"></div>
        </div>

        <!-- Scale labels -->
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-bottom:14px;font-weight:600;">
          <span>Human Written</span><span>Mixed</span><span>AI Generated</span>
        </div>

        <!-- Summary -->
        <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:${sigs.length ? 14 : 0}px;">${_esc(summ)}</p>

        <!-- Signals -->
        ${sigs.length ? `
        <div style="border-top:1px solid ${bdCol};padding-top:12px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:8px;">Evidence Signals</div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px;">
            ${sigs.map(s => `<li style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:#4b5563;">
              <span style="color:${color};margin-top:1px;flex-shrink:0;">›</span>
              <span>${_esc(s)}</span>
            </li>`).join("")}
          </ul>
        </div>` : ""}
      </div>
    `;
    el.classList.remove("hidden");
    document.getElementById("det-ai-status").textContent = "";
  }

  // ── Plagiarism Checker ────────────────────────────────────────────────────────

  window.runPlagCheck = async function () {
    const text = (document.getElementById("det-plag-input")?.value || "").trim();
    if (text.length < 80) {
      _setStatus("det-plag-status", "⚠️ Please paste at least 80 characters of text.", "warn");
      return;
    }

    const btn = document.getElementById("det-plag-btn");
    _setBtnLoading(btn, "Checking…");
    _setStatus("det-plag-status", "🔍 Searching web and academic databases…", "info");
    document.getElementById("det-plag-result").classList.add("hidden");

    try {
      const res = await window.callBackend("/check-plagiarism", { text });
      _renderPlagResult(res);
    } catch (err) {
      _setStatus("det-plag-status", "⚠️ Check failed: " + err.message, "error");
    } finally {
      _setBtnDone(btn, "Check Originality");
    }
  };

  function _renderPlagResult(r) {
    const score   = Math.max(0, Math.min(100, r.score || 0));
    const label   = r.label  || "Low Risk";
    const summ    = r.summary || "";
    const sources = r.sources || [];

    const color = score >= 65 ? "#ef4444" : score >= 35 ? "#f59e0b" : "#22c55e";
    const bgCol = score >= 65 ? "#fef2f2" : score >= 35 ? "#fffbeb" : "#f0fdf4";
    const bdCol = score >= 65 ? "#fecaca" : score >= 35 ? "#fde68a" : "#bbf7d0";

    const el = document.getElementById("det-plag-result");
    el.innerHTML = `
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:18px 20px;margin-bottom:${sources.length ? 12 : 0}px;">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:13px;font-weight:800;color:${color};">${_esc(label)}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Similarity score</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:900;color:${color};font-family:monospace;">${score}%</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;">match found</div>
          </div>
        </div>

        <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;margin-bottom:14px;">
          <div style="width:${score}%;height:100%;background:${color};border-radius:999px;transition:width .6s;"></div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-bottom:14px;font-weight:600;">
          <span>Original</span><span>Moderate</span><span>Plagiarised</span>
        </div>

        <p style="font-size:13px;color:#374151;line-height:1.6;">${_esc(summ)}</p>
      </div>

      ${sources.length ? `
      <div style="margin-top:4px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:8px;">
          Matching Sources Found (${sources.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${sources.map(s => `
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:${s.type==='academic'?'#eff6ff':'#f0fdf4'};color:${s.type==='academic'?'#1d4ed8':'#16a34a'};">${s.type === "academic" ? "Academic" : "Web"}</span>
                ${s.url ? `<a href="${_esc(s.url)}" target="_blank" style="font-size:11px;color:#6b7280;text-decoration:underline;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">↗ Open</a>` : ""}
              </div>
              <div style="font-size:12px;font-weight:600;color:#1f2937;margin-bottom:3px;">${_esc(s.source)}</div>
              <div style="font-size:11px;color:#6b7280;line-height:1.5;">${_esc(s.snippet)}</div>
            </div>
          `).join("")}
        </div>
      </div>` : ""}
    `;
    el.classList.remove("hidden");
    document.getElementById("det-plag-status").textContent = "";
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function _setStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === "error" ? "#ef4444" : type === "warn" ? "#f59e0b" : "#6b7280";
  }

  function _setBtnLoading(btn, label) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.65";
    btn.textContent = label;
  }

  function _setBtnDone(btn, label) {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.textContent = label;
  }

  // Close on backdrop click
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("detector-modal")?.addEventListener("click", function (e) {
      if (e.target === this) window.closeDetectorModal();
    });
  });

  console.log("detector.js loaded ✅");
})();
