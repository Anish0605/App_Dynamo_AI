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
    const score     = Math.max(0, Math.min(100, r.score || 50));
    const humanPct  = 100 - score;          // flip: show "human probability"
    const label     = r.label       || "Mixed";
    const conf      = r.confidence  || "Medium";
    const sigs      = r.signals     || [];
    const summ      = r.summary     || "";

    // Verdict banner config
    let bannerEmoji, bannerText, bannerSub;
    if (score <= 25) {
      bannerEmoji = "✅";
      bannerText  = "Appears Human-Written";
      bannerSub   = "Very few signs of AI generation detected in this text.";
    } else if (score <= 50) {
      bannerEmoji = "🟡";
      bannerText  = "Mostly Human-Written";
      bannerSub   = "Some patterns are consistent with AI, but overall leans human.";
    } else if (score <= 75) {
      bannerEmoji = "⚠️";
      bannerText  = "Likely AI-Generated";
      bannerSub   = "Multiple patterns suggest this text may have been AI-assisted or generated.";
    } else {
      bannerEmoji = "🔴";
      bannerText  = "Strongly AI-Generated";
      bannerSub   = "This text shows clear hallmarks of AI-generated writing.";
    }

    const { color, bgCol, bdCol } = _scoreTheme(score, 70, 40);

    // What this means — researcher-specific guidance
    let guidance = "";
    if (score <= 25) {
      guidance = "This text is suitable for academic submission. The writing patterns are consistent with authentic human authorship.";
    } else if (score <= 50) {
      guidance = "This text is likely acceptable for academic submission, though a few sections may warrant review. Check the signals below for specific areas.";
    } else if (score <= 75) {
      guidance = "This text may not meet academic integrity standards. Review the flagged signals below and consider rewriting those sections in your own voice.";
    } else {
      guidance = "This text is unlikely to pass an academic integrity review. Substantial rewriting in your own voice is strongly recommended before submission.";
    }

    const el = document.getElementById("ai-result");
    el.innerHTML = `
      <!-- ① VERDICT BANNER -->
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:16px 18px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <!-- Left: verdict text -->
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
              <span style="font-size:18px;line-height:1;">${bannerEmoji}</span>
              <span style="font-size:15px;font-weight:800;color:${color};">${bannerText}</span>
            </div>
            <p style="font-size:12px;color:#4b5563;margin:0;line-height:1.5;">${bannerSub}</p>
          </div>
          <!-- Right: human % (the number that actually makes sense) -->
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:32px;font-weight:900;color:${color};font-family:monospace;line-height:1;">${humanPct}%</div>
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-top:2px;">Human</div>
          </div>
        </div>

        <!-- Progress bar: human % left, AI % right -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:#9ca3af;margin-bottom:5px;">
            <span>Human ←</span>
            <span>Confidence: ${_esc(conf)}</span>
            <span>→ AI</span>
          </div>
          <div style="background:#e5e7eb;border-radius:999px;height:10px;overflow:hidden;position:relative;">
            <!-- Human portion (green from left) -->
            <div style="position:absolute;left:0;top:0;width:${humanPct}%;height:100%;background:#22c55e;border-radius:999px 0 0 999px;transition:width .7s ease;"></div>
            <!-- AI portion (red from right) -->
            <div style="position:absolute;right:0;top:0;width:${score}%;height:100%;background:${color};border-radius:0 999px 999px 0;opacity:0.7;transition:width .7s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:#9ca3af;margin-top:4px;">
            <span>${humanPct}% Human</span>
            <span>${score}% AI</span>
          </div>
        </div>
      </div>

      <!-- ② WHAT THIS MEANS FOR YOUR RESEARCH -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">What this means for your submission</div>
        <p style="font-size:12.5px;color:#334155;line-height:1.6;margin:0;">${guidance}</p>
      </div>

      <!-- ③ GEMINI'S FULL EXPLANATION -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">Detailed analysis</div>
        <p style="font-size:12.5px;color:#334155;line-height:1.6;margin:0;">${_esc(summ)}</p>
      </div>

      <!-- ④ SPECIFIC SIGNALS FOUND -->
      ${sigs.length ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;">Specific patterns detected (${sigs.length})</div>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px;">
          ${sigs.map((s, i) => `
          <li style="display:flex;gap:9px;align-items:flex-start;">
            <span style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:${score >= 70 ? '#fee2e2' : score >= 40 ? '#fef3c7' : '#dcfce7'};color:${color};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;">${i+1}</span>
            <span style="font-size:12.5px;color:#374151;line-height:1.5;">${_esc(s)}</span>
          </li>`).join("")}
        </ul>
      </div>` : ""}
    `;
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
    const summ    = r.summary || "";
    const sources = r.sources || [];

    const origPct = 100 - score; // originality %

    const { color, bgCol, bdCol } = _scoreTheme(score, 65, 35);

    // Verdict wording
    let bannerEmoji, bannerText, bannerSub, guidance;
    if (score <= 15) {
      bannerEmoji = "✅"; bannerText = "Highly Original";
      bannerSub   = "No significant matching content found online or in academic databases.";
      guidance    = "This text appears to be original work and should be safe to submit. Standard citation practices still apply for referenced ideas.";
    } else if (score <= 35) {
      bannerEmoji = "🟡"; bannerText = "Mostly Original";
      bannerSub   = "Minor matches found — likely common phrases or properly shared knowledge.";
      guidance    = "The level of similarity is within acceptable range for most academic institutions. Review the matched sources below to confirm all cited material is properly referenced.";
    } else if (score <= 65) {
      bannerEmoji = "⚠️"; bannerText = "Moderate Similarity";
      bannerSub   = "Significant matching content detected — requires careful review.";
      guidance    = "This level of similarity may raise concerns during academic submission. Check the matched sources below and ensure all borrowed content is properly quoted and cited.";
    } else {
      bannerEmoji = "🔴"; bannerText = "High Similarity — Review Required";
      bannerSub   = "Substantial matching content found online or in published papers.";
      guidance    = "This text is likely to be flagged for plagiarism. Significant rewriting and/or proper citation of all matched sources is required before submission.";
    }

    // Separate academic vs web sources — academic first for researchers
    const academic = sources.filter(s => s.type === "academic");
    const web      = sources.filter(s => s.type === "web");

    function _sourceCard(s) {
      return `
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:11px 14px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap;">
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;
              background:${s.type === "academic" ? "#eff6ff" : "#f0fdf4"};
              color:${s.type === "academic" ? "#1d4ed8" : "#16a34a"};">
              ${s.type === "academic" ? "📚 Academic Paper" : "🌐 Web Source"}
            </span>
            ${s.url ? `<a href="${_esc(s.url)}" target="_blank" rel="noopener"
              style="font-size:11px;color:#6b7280;text-decoration:underline;">↗ Open</a>` : ""}
          </div>
          <div style="font-size:12.5px;font-weight:600;color:#1f2937;margin-bottom:4px;">${_esc(s.source)}</div>
          <div style="font-size:11px;color:#6b7280;line-height:1.5;">${_esc(s.snippet)}</div>
          ${s.type === "academic" && s.url ? `
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9;">
            <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;">Quick APA-style ref: </span>
            <span style="font-size:11px;color:#475569;font-style:italic;">${_esc(s.source)}. ${s.url.includes("doi.org") ? s.url : ""}</span>
          </div>` : ""}
        </div>`;
    }

    const academicBlock = academic.length ? `
      <div style="margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#1d4ed8;margin-bottom:7px;">
          📚 Academic Matches (${academic.length}) — Semantic Scholar
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;">${academic.map(_sourceCard).join("")}</div>
      </div>` : "";

    const webBlock = web.length ? `
      <div>
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#16a34a;margin-bottom:7px;">
          🌐 Web Matches (${web.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;">${web.map(_sourceCard).join("")}</div>
      </div>` : "";

    const el = document.getElementById("plag-result");
    el.innerHTML = `
      <!-- ① VERDICT BANNER -->
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:16px 18px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
              <span style="font-size:18px;line-height:1;">${bannerEmoji}</span>
              <span style="font-size:15px;font-weight:800;color:${color};">${bannerText}</span>
            </div>
            <p style="font-size:12px;color:#4b5563;margin:0;line-height:1.5;">${bannerSub}</p>
          </div>
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:32px;font-weight:900;color:${color};font-family:monospace;line-height:1;">${score}%</div>
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;margin-top:2px;">Similarity</div>
          </div>
        </div>
        <div style="margin-top:12px;">
          <div style="background:#e5e7eb;border-radius:999px;height:10px;overflow:hidden;position:relative;">
            <div style="position:absolute;left:0;top:0;width:${origPct}%;height:100%;background:#22c55e;border-radius:999px 0 0 999px;transition:width .7s ease;"></div>
            <div style="position:absolute;right:0;top:0;width:${score}%;height:100%;background:${color};border-radius:0 999px 999px 0;opacity:0.75;transition:width .7s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:#9ca3af;margin-top:4px;">
            <span>${origPct}% Original</span><span>${score}% Similar</span>
          </div>
        </div>
      </div>

      <!-- ② WHAT THIS MEANS -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">What this means for your submission</div>
        <p style="font-size:12.5px;color:#334155;line-height:1.6;margin:0;">${guidance}</p>
      </div>

      <!-- ③ GEMINI ANALYSIS -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">Detailed analysis</div>
        <p style="font-size:12.5px;color:#334155;line-height:1.6;margin:0;">${_esc(summ)}</p>
      </div>

      <!-- ④ SOURCES (Academic first, then web) -->
      ${(academic.length || web.length) ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px;">
          Matching Sources Found (${sources.length})
        </div>
        ${academicBlock}
        ${webBlock}
      </div>` : ""}
    `;
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
