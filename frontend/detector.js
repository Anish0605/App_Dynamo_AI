// detector.js — Dynamo AI v2
// AI Detector + Plagiarism Checker — two fully separate modals
// File upload: TXT (frontend), PDF/DOCX (backend /extract-text)

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────────────────

  window.openAiDetectorModal = function () {
    _open("ai-detector-modal");
  };

  window.closeAiDetectorModal = function () {
    _close("ai-detector-modal");
  };

  window.openPlagiarismModal = function () {
    _open("plagiarism-modal");
  };

  window.closePlagiarismModal = function () {
    _close("plagiarism-modal");
  };

  // Legacy compatibility (sidebar used openDetectorModal(tab))
  window.openDetectorModal = function (tab) {
    if (tab === "plag") window.openPlagiarismModal();
    else window.openAiDetectorModal();
  };
  window.closeDetectorModal = function () {
    _close("ai-detector-modal");
    _close("plagiarism-modal");
  };

  function _open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    if (window.lucide) window.lucide.createIcons();
  }

  function _close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    // Only unlock scroll when both modals are closed
    if (
      document.getElementById("ai-detector-modal")?.classList.contains("hidden") &&
      document.getElementById("plagiarism-modal")?.classList.contains("hidden")
    ) {
      document.body.style.overflow = "";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FILE UPLOAD — shared handler for both modals
  // ─────────────────────────────────────────────────────────────────────────

  window.handleDetectorFile = async function (inputEl, textareaId, statusId, counterId) {
    const file = inputEl?.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    _setStatus(statusId, `⏳ Reading ${file.name}…`, "info");

    try {
      let text = "";

      if (ext === "txt" || ext === "md") {
        // Handle on frontend — no backend needed
        text = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsText(file);
        });

      } else if (ext === "pdf" || ext === "docx" || ext === "doc") {
        // Send to backend for extraction
        const formData = new FormData();
        formData.append("file", file);
        const base = window.BACKEND_URL || "";
        const resp  = await fetch(`${base}/extract-text`, {
          method: "POST",
          body:   formData,
        });
        if (!resp.ok) throw new Error(`Server error ${resp.status}`);
        const data = await resp.json();
        text = data.text || "";

      } else {
        _setStatus(statusId, "⚠️ Unsupported file type. Use TXT, PDF, or DOCX.", "warn");
        return;
      }

      const textarea = document.getElementById(textareaId);
      if (textarea) {
        textarea.value = text.slice(0, 12000);
        _updateCount(textareaId, counterId);
      }
      _setStatus(statusId, `✅ ${file.name} loaded (${_wc(text)} words)`, "ok");

    } catch (err) {
      _setStatus(statusId, "⚠️ Could not read file: " + err.message, "error");
    }
    // Reset so the same file can be re-selected
    inputEl.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LIVE WORD / CHAR COUNT
  // ─────────────────────────────────────────────────────────────────────────

  window.updateDetCount = _updateCount;

  function _updateCount(textareaId, counterId) {
    const ta  = document.getElementById(textareaId);
    const cnt = document.getElementById(counterId);
    if (!ta || !cnt) return;
    const words = _wc(ta.value);
    const chars = ta.value.length;
    cnt.textContent = `${words} words · ${chars} chars`;
  }

  function _wc(str) {
    return (str || "").trim().split(/\s+/).filter(Boolean).length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI DETECTOR — analyse
  // ─────────────────────────────────────────────────────────────────────────

  window.runAiDetect = async function () {
    const text = (document.getElementById("ai-text-input")?.value || "").trim();
    if (text.length < 50) {
      _setStatus("ai-status", "⚠️ Please paste at least 50 characters of text.", "warn");
      return;
    }

    const btn = document.getElementById("ai-analyse-btn");
    _setBtnLoading(btn, "Analysing…");
    _setStatus("ai-status", "🔍 Analysing writing patterns…", "info");
    document.getElementById("ai-result").classList.add("hidden");

    try {
      const res = await window.callBackend("/detect-ai", { text });
      _renderAiResult(res);
      _setStatus("ai-status", "", "");
    } catch (err) {
      _setStatus("ai-status", "⚠️ Detection failed: " + err.message, "error");
    } finally {
      _setBtnDone(btn, "Analyse Text");
    }
  };

  function _renderAiResult(r) {
    const score = Math.max(0, Math.min(100, r.score || 50));
    const label = r.label       || "Mixed";
    const conf  = r.confidence  || "Medium";
    const sigs  = r.signals     || [];
    const summ  = r.summary     || "";

    const { color, bgCol, bdCol } = _scoreTheme(score, 70, 40);

    const el = document.getElementById("ai-result");
    el.innerHTML = `
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:18px 20px;">

        <!-- Score row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:13px;font-weight:800;color:${color};">${_esc(label)}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Confidence: ${_esc(conf)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:30px;font-weight:900;color:${color};font-family:monospace;line-height:1;">${score}</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;">/ 100 AI score</div>
          </div>
        </div>

        <!-- Bar -->
        <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;margin-bottom:6px;">
          <div style="width:${score}%;height:100%;background:${color};border-radius:999px;transition:width .6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-bottom:14px;font-weight:600;">
          <span>Human</span><span>Mixed</span><span>AI</span>
        </div>

        <!-- Summary -->
        <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:${sigs.length ? 14 : 0}px;">${_esc(summ)}</p>

        <!-- Signals -->
        ${sigs.length ? `
        <div style="border-top:1px solid ${bdCol};padding-top:12px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px;">Evidence Signals</div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px;">
            ${sigs.map(s => `<li style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:#4b5563;">
              <span style="color:${color};flex-shrink:0;margin-top:1px;">›</span><span>${_esc(s)}</span>
            </li>`).join("")}
          </ul>
        </div>` : ""}
      </div>`;
    el.classList.remove("hidden");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAGIARISM — check
  // ─────────────────────────────────────────────────────────────────────────

  window.runPlagCheck = async function () {
    const text = (document.getElementById("plag-text-input")?.value || "").trim();
    if (text.length < 80) {
      _setStatus("plag-status", "⚠️ Please paste at least 80 characters of text.", "warn");
      return;
    }

    const btn = document.getElementById("plag-check-btn");
    _setBtnLoading(btn, "Checking…");
    _setStatus("plag-status", "🔍 Searching web & 200M+ academic papers…", "info");
    document.getElementById("plag-result").classList.add("hidden");

    try {
      const res = await window.callBackend("/check-plagiarism", { text });
      _renderPlagResult(res);
      _setStatus("plag-status", "", "");
    } catch (err) {
      _setStatus("plag-status", "⚠️ Check failed: " + err.message, "error");
    } finally {
      _setBtnDone(btn, "Check Originality");
    }
  };

  function _renderPlagResult(r) {
    const score   = Math.max(0, Math.min(100, r.score   || 0));
    const label   = r.label   || "Low Risk";
    const summ    = r.summary || "";
    const sources = r.sources || [];

    const { color, bgCol, bdCol } = _scoreTheme(score, 65, 35);

    const srcHtml = sources.length ? `
      <div style="margin-top:14px;border-top:1px solid ${bdCol};padding-top:14px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:8px;">
          Matching Sources (${sources.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;">
          ${sources.map(s => `
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:${s.type === "academic" ? "#eff6ff" : "#f0fdf4"};color:${s.type === "academic" ? "#1d4ed8" : "#16a34a"};">${s.type === "academic" ? "Academic" : "Web"}</span>
                ${s.url ? `<a href="${_esc(s.url)}" target="_blank" rel="noopener" style="font-size:11px;color:#6b7280;text-decoration:underline;">↗ Open source</a>` : ""}
              </div>
              <div style="font-size:12px;font-weight:600;color:#1f2937;margin-bottom:3px;">${_esc(s.source)}</div>
              <div style="font-size:11px;color:#6b7280;line-height:1.5;">${_esc(s.snippet)}</div>
            </div>`).join("")}
        </div>
      </div>` : "";

    const el = document.getElementById("plag-result");
    el.innerHTML = `
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:18px 20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:13px;font-weight:800;color:${color};">${_esc(label)}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Similarity score</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:30px;font-weight:900;color:${color};font-family:monospace;line-height:1;">${score}%</div>
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;">matched online</div>
          </div>
        </div>
        <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;margin-bottom:6px;">
          <div style="width:${score}%;height:100%;background:${color};border-radius:999px;transition:width .6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-bottom:14px;font-weight:600;">
          <span>Original</span><span>Moderate</span><span>Plagiarised</span>
        </div>
        <p style="font-size:13px;color:#374151;line-height:1.6;">${_esc(summ)}</p>
        ${srcHtml}
      </div>`;
    el.classList.remove("hidden");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  function _scoreTheme(score, highT, midT) {
    const color = score >= highT ? "#ef4444" : score >= midT ? "#f59e0b" : "#22c55e";
    const bgCol = score >= highT ? "#fef2f2" : score >= midT ? "#fffbeb" : "#f0fdf4";
    const bdCol = score >= highT ? "#fecaca" : score >= midT ? "#fde68a" : "#bbf7d0";
    return { color, bgCol, bdCol };
  }

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function _setStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === "error" ? "#ef4444" : type === "warn" ? "#f59e0b" : type === "ok" ? "#22c55e" : "#6b7280";
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

  // Close modals on backdrop click
  document.addEventListener("DOMContentLoaded", () => {
    ["ai-detector-modal", "plagiarism-modal"].forEach(id => {
      document.getElementById(id)?.addEventListener("click", function (e) {
        if (e.target === this) {
          _close(id);
        }
      });
    });
  });

  console.log("detector.js v2 loaded ✅");
})();
