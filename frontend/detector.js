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
    document.getElementById("ai-post-actions")?.classList.remove("hidden");
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
    const score       = Math.max(0, Math.min(100, r.score   || 0));
    const summ        = r.summary      || "";
    const sources     = r.sources      || [];
    const methodology = r.methodology  || "";
    const queriesRun  = r.queries_run  || 1;
    const srcFound    = r.sources_found || sources.length;

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

      <!-- ④ HOW IS THIS CALCULATED — transparency box -->
      <details style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:11px 14px;margin-bottom:10px;cursor:pointer;">
        <summary style="font-size:11px;font-weight:700;color:#0369a1;list-style:none;display:flex;align-items:center;gap:6px;user-select:none;">
          <span>ℹ️</span>
          <span>How is this score calculated?</span>
          <span style="margin-left:auto;font-size:10px;color:#7dd3fc;">tap to expand</span>
        </summary>
        <div style="margin-top:10px;border-top:1px solid #bae6fd;padding-top:10px;">
          <p style="font-size:12px;color:#0c4a6e;line-height:1.7;margin:0 0 8px 0;">
            <strong>Step 1 — Multi-section search:</strong> We extract phrases from
            <strong>${queriesRun} section${queriesRun > 1 ? "s" : ""}</strong> of your document
            (beginning${queriesRun > 1 ? ", middle" : ""}${queriesRun > 2 ? ", and end" : ""})
            and search them independently. This ensures all parts of your paper are checked,
            not just the opening paragraph.
          </p>
          <p style="font-size:12px;color:#0c4a6e;line-height:1.7;margin:0 0 8px 0;">
            <strong>Step 2 — Database search:</strong> Each phrase is searched against the
            <strong>live web</strong> (Tavily) and <strong>Semantic Scholar</strong> (200M+ academic papers).
            Results are deduplicated. Found <strong>${srcFound} unique sources</strong> in total.
          </p>
          <p style="font-size:12px;color:#0c4a6e;line-height:1.7;margin:0 0 8px 0;">
            <strong>Step 3 — AI similarity assessment:</strong> Gemini reads your full text
            alongside all found sources and judges whether overlaps represent actual plagiarism
            (direct copying / uncited borrowing) vs. common knowledge or properly cited content.
          </p>
          <p style="font-size:11px;color:#0369a1;line-height:1.6;margin:0;padding:8px 10px;background:#e0f2fe;border-radius:8px;">
            ⚠️ <strong>Limitation:</strong> This is a probabilistic estimate based on publicly
            available content. It does not check subscription-gated journals, university thesis
            databases (e.g. ProQuest), or your institution's internal Turnitin database.
            Use this as a pre-submission self-check, not a replacement for institutional plagiarism tools.
          </p>
        </div>
      </details>

      <!-- ⑤ SOURCES (Academic first, then web) -->
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
    document.getElementById("plag-post-actions")?.classList.remove("hidden");
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

  // ─────────────────────────────────────────────────────────────────────────
  // SENTENCE HEATMAP
  // ─────────────────────────────────────────────────────────────────────────

  window.runHeatmapAnalysis = async function () {
    const text = (document.getElementById("ai-text-input")?.value || "").trim();
    if (!text) return;

    const btn       = document.getElementById("ai-heatmap-btn");
    const sectionEl = document.getElementById("ai-heatmap-section");
    const outputEl  = document.getElementById("ai-heatmap-output");

    sectionEl.classList.remove("hidden");
    _setStatus("ai-heatmap-status", "Analysing sentences… this may take 15–25 s", "");
    if (btn) { btn.disabled = true; btn.textContent = "Analysing…"; }
    outputEl.innerHTML = "";

    try {
      const res       = await window.callBackend("/detect-ai-heatmap", { text });
      const sentences = res.sentences || [];

      if (!sentences.length) {
        _setStatus("ai-heatmap-status", "Could not analyse sentences. Add more text and try again.", "error");
        if (btn) { btn.disabled = false; btn.textContent = "🌡️ Sentence Heatmap"; }
        return;
      }

      _setStatus("ai-heatmap-status", res.truncated ? "⚠️ Only the first ~3 500 characters were analysed" : "", res.truncated ? "warn" : "");

      outputEl.innerHTML = sentences.map(item => {
        const s  = item.score;
        const bg = s <= 30 ? `rgba(220,252,231,${0.4 + s / 75})`
                 : s <= 65 ? `rgba(254,249,195,${0.5 + (s - 30) / 70})`
                           : `rgba(254,226,226,${0.5 + (s - 65) / 70})`;
        const bd    = s <= 30 ? "#86efac" : s <= 65 ? "#fde047" : "#fca5a5";
        const label = s <= 30 ? "Human" : s <= 65 ? "Mixed" : "AI";
        return `<span title="AI score: ${s}% — ${label}" style="background:${bg};border-bottom:2px solid ${bd};border-radius:3px;padding:1px 2px;margin:1px;display:inline;cursor:help;">${_esc(item.s)} </span>`;
      }).join("");

      if (btn) { btn.disabled = false; btn.textContent = "🌡️ Sentence Heatmap"; }

    } catch (e) {
      _setStatus("ai-heatmap-status", "Error loading heatmap. Please try again.", "error");
      if (btn) { btn.disabled = false; btn.textContent = "🌡️ Sentence Heatmap"; }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PLAGIARISM MODE TOGGLE
  // ─────────────────────────────────────────────────────────────────────────

  window.switchPlagMode = function (mode) {
    const originPane = document.getElementById("plag-origin-pane");
    const selfPane   = document.getElementById("plag-self-pane");
    const originBtn  = document.getElementById("plag-mode-origin-btn");
    const selfBtn    = document.getElementById("plag-mode-self-btn");

    if (mode === "origin") {
      originPane?.classList.remove("hidden");
      selfPane?.classList.add("hidden");
      if (originBtn) { originBtn.style.background = "#fff"; originBtn.style.color = "#2563eb"; originBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,.1)"; }
      if (selfBtn)   { selfBtn.style.background = "transparent"; selfBtn.style.color = "#9ca3af"; selfBtn.style.boxShadow = "none"; }
    } else {
      originPane?.classList.add("hidden");
      selfPane?.classList.remove("hidden");
      if (selfBtn)   { selfBtn.style.background = "#fff"; selfBtn.style.color = "#4f46e5"; selfBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,.1)"; }
      if (originBtn) { originBtn.style.background = "transparent"; originBtn.style.color = "#9ca3af"; originBtn.style.boxShadow = "none"; }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SELF-PLAGIARISM — file upload handler
  // ─────────────────────────────────────────────────────────────────────────

  window.handleSelfFile = async function (input, side) {
    const file = input.files?.[0];
    if (!file) return;
    const textAreaId = `self-text-${side}`;
    const countId    = `self-count-${side}`;
    _setStatus("selfplag-status", `Loading ${file.name}…`, "");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp     = await fetch(`${window.BACKEND_URL || ""}/extract-text`, { method: "POST", body: formData });
      const json     = await resp.json();
      const extracted = json.text || json.content || "";
      document.getElementById(textAreaId).value = extracted;
      window.updateDetCount(textAreaId, countId);
      _setStatus("selfplag-status", `✓ ${file.name} loaded`, "ok");
    } catch (e) {
      _setStatus("selfplag-status", "Error reading file. Try pasting the text instead.", "error");
    }
    input.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SELF-PLAGIARISM — run comparison
  // ─────────────────────────────────────────────────────────────────────────

  window.runSelfPlagCheck = async function () {
    const textA = (document.getElementById("self-text-a")?.value || "").trim();
    const textB = (document.getElementById("self-text-b")?.value || "").trim();

    if (!textA || !textB) {
      _setStatus("selfplag-status", "Please provide both documents to compare.", "error");
      return;
    }
    if (textA.split(/\s+/).length < 30 || textB.split(/\s+/).length < 30) {
      _setStatus("selfplag-status", "Each document needs at least 30 words for a meaningful comparison.", "warn");
      return;
    }

    const btn = document.getElementById("self-compare-btn");
    _setBtnLoading(btn, "Comparing…");
    _setStatus("selfplag-status", "Analysing documents for overlap… (15–25 s)", "");
    document.getElementById("selfplag-result")?.classList.add("hidden");
    document.getElementById("selfplag-post-actions")?.classList.add("hidden");

    try {
      const res = await window.callBackend("/check-self-plagiarism", { text_a: textA, text_b: textB });
      _renderSelfPlagResult(res);
      document.getElementById("selfplag-post-actions")?.classList.remove("hidden");
      _setStatus("selfplag-status", "", "");
    } catch (e) {
      _setStatus("selfplag-status", "Error during comparison. Please try again.", "error");
    } finally {
      _setBtnDone(btn, "Compare Documents");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SELF-PLAGIARISM — render result
  // ─────────────────────────────────────────────────────────────────────────

  function _renderSelfPlagResult(r) {
    const score          = Math.max(0, Math.min(100, r.score || 0));
    const overlaps       = r.overlaps       || [];
    const summary        = r.summary        || "";
    const recommendation = r.recommendation || "";
    const origPct        = 100 - score;

    const { color, bgCol, bdCol } = _scoreTheme(score, 60, 30);

    let bannerText, bannerEmoji, bannerSub;
    if (score >= 60) {
      bannerText = "High Overlap Detected";
      bannerEmoji = "🔴";
      bannerSub   = "Substantial shared content found. Disclosure or citation of prior work may be required.";
    } else if (score >= 30) {
      bannerText = "Moderate Overlap";
      bannerEmoji = "🟡";
      bannerSub   = "Some shared passages or ideas detected. Consider paraphrasing or citing prior work.";
    } else {
      bannerText = "Low Overlap — Largely Distinct";
      bannerEmoji = "✅";
      bannerSub   = "The two documents appear substantially different. No significant self-plagiarism risk detected.";
    }

    const overlapList = overlaps.length
      ? `<ul style="margin:0;padding:0 0 0 18px;">${overlaps.map(o =>
          `<li style="font-size:12px;color:#374151;line-height:1.7;margin-bottom:3px;">${_esc(o)}</li>`).join("")}</ul>`
      : `<p style="font-size:12px;color:#6b7280;margin:0;">No specific overlapping phrases identified.</p>`;

    const el = document.getElementById("selfplag-result");
    el.innerHTML = `
      <!-- VERDICT BANNER -->
      <div style="background:${bgCol};border:1.5px solid ${bdCol};border-radius:14px;padding:16px 18px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
              <span style="font-size:18px;">${bannerEmoji}</span>
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
            <div style="position:absolute;left:0;top:0;width:${origPct}%;height:100%;background:#22c55e;border-radius:999px 0 0 999px;"></div>
            <div style="position:absolute;right:0;top:0;width:${score}%;height:100%;background:${color};border-radius:0 999px 999px 0;opacity:0.75;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:#9ca3af;margin-top:4px;">
            <span>${origPct}% Distinct</span><span>${score}% Overlap</span>
          </div>
        </div>
      </div>

      <!-- OVERLAPPING CONTENT -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;">Overlapping Content Found</div>
        ${overlapList}
      </div>

      <!-- ANALYSIS + RECOMMENDATION -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">Analysis</div>
        <p style="font-size:12.5px;color:#334155;line-height:1.6;margin:0 0 ${recommendation ? '8px' : '0'} 0;">${_esc(summary)}</p>
        ${recommendation ? `<p style="font-size:12px;color:#1d4ed8;line-height:1.6;margin:0;padding:8px 10px;background:#eff6ff;border-radius:8px;"><strong>Recommendation:</strong> ${_esc(recommendation)}</p>` : ""}
      </div>

      <!-- DISCLAIMER -->
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:11px 14px;">
        <p style="font-size:11px;color:#92400e;margin:0;line-height:1.6;">
          ⚠️ <strong>Note:</strong> This comparison is limited to the two documents you provided. It does not check your full publication history or any external database. Discuss borderline cases with your supervisor or institution.
        </p>
      </div>
    `;
    el.classList.remove("hidden");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PDF EXPORT — shared print-window builder
  // ─────────────────────────────────────────────────────────────────────────

  function _buildPrintWindow(title, icon, accentColor, bodyHTML) {
    const now = new Date().toLocaleString();
    const win = window.open("", "_blank", "width=860,height=720");
    if (!win) { alert("Allow pop-ups for this site to export PDF."); return; }
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${icon} ${title} — Dynamo AI</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 36px 28px; color: #111; font-size: 13px; line-height: 1.55; }
  .dyn-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${accentColor}; padding-bottom: 14px; margin-bottom: 22px; }
  .dyn-brand  { font-size: 19px; font-weight: 900; color: ${accentColor}; }
  .dyn-sub    { font-size: 11px; color: #9ca3af; margin-top: 3px; }
  .dyn-meta   { font-size: 11px; color: #9ca3af; text-align: right; line-height: 1.6; }
  .dyn-footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #d1d5db; text-align: center; }
  details { display: none !important; }
  @media print { body { padding: 20px; } button { display: none !important; } }
</style>
</head><body>
  <div class="dyn-header">
    <div>
      <div class="dyn-brand">${icon} Dynamo AI — ${title}</div>
      <div class="dyn-sub">Research-grade Academic Tools · Powered by Google Gemini</div>
    </div>
    <div class="dyn-meta">Generated: ${now}<br>For academic self-assessment only</div>
  </div>
  ${bodyHTML}
  <div class="dyn-footer">
    This report is a probabilistic estimate for educational use only — not a legal or institutional determination of plagiarism or AI authorship.<br>
    Dynamo AI · Powered by Google Gemini
  </div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 700);
  }

  window.exportAiReport = function () {
    const resultEl  = document.getElementById("ai-result");
    if (!resultEl || resultEl.classList.contains("hidden")) {
      alert("Run the AI Detector first to generate a report."); return;
    }
    const excerpt    = (document.getElementById("ai-text-input")?.value || "").trim().substring(0, 150);
    const heatSect   = document.getElementById("ai-heatmap-section");
    const heatOutput = document.getElementById("ai-heatmap-output");
    const hasHeat    = heatSect && !heatSect.classList.contains("hidden") && heatOutput?.innerHTML;

    const body = `
      ${excerpt ? `<p style="font-size:11.5px;color:#6b7280;font-style:italic;border-left:3px solid #e5e7eb;padding-left:12px;margin-bottom:18px;"><strong>Submitted text (excerpt):</strong> "${_esc(excerpt)}…"</p>` : ""}
      ${resultEl.innerHTML}
      ${hasHeat ? `<div style="margin-top:16px;"><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#7c3aed;margin-bottom:8px;">Sentence-Level Heatmap</div><div style="font-size:12.5px;line-height:1.9;border:1px solid #e9d5ff;border-radius:8px;padding:12px;">${heatOutput.innerHTML}</div></div>` : ""}
    `;
    _buildPrintWindow("AI Detection Report", "🤖", "#7c3aed", body);
  };

  window.exportPlagReport = function () {
    const resultEl = document.getElementById("plag-result");
    if (!resultEl || resultEl.classList.contains("hidden")) {
      alert("Run the Plagiarism Checker first to generate a report."); return;
    }
    const excerpt = (document.getElementById("plag-text-input")?.value || "").trim().substring(0, 150);
    const body = `
      ${excerpt ? `<p style="font-size:11.5px;color:#6b7280;font-style:italic;border-left:3px solid #e5e7eb;padding-left:12px;margin-bottom:18px;"><strong>Submitted text (excerpt):</strong> "${_esc(excerpt)}…"</p>` : ""}
      ${resultEl.innerHTML}
    `;
    _buildPrintWindow("Plagiarism Check Report", "📄", "#2563eb", body);
  };

  window.exportSelfPlagReport = function () {
    const resultEl = document.getElementById("selfplag-result");
    if (!resultEl || resultEl.classList.contains("hidden")) {
      alert("Run the Self-Plagiarism comparison first."); return;
    }
    _buildPrintWindow("Self-Plagiarism Report", "🔁", "#4f46e5", resultEl.innerHTML);
  };

  console.log("detector.js v3 loaded ✅");
})();
