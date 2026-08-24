// flashcard.js — Dynamo AI Flashcard Engine (Variant C + B pip row)

window.renderFlashcard = (cards) => {
  const chat = document.getElementById("chat-messages");
  if (!chat || !Array.isArray(cards) || cards.length === 0) return;

  const includeHints = window._fcIncludeHints !== false;

  let index    = 0;
  let revealed = false;
  let showHint = false;
  const results = []; // "know" | "dontknow" per card

  /* ── Outer wrapper ── */
  const wrapper = document.createElement("div");
  wrapper.className = "fc-wrapper";
  wrapper.style.cssText = [
    "background:#fff",
    "border:1px solid #e5e7eb",
    "border-radius:20px",
    "box-shadow:0 2px 12px rgba(0,0,0,0.07)",
    "padding:16px",
    "margin-bottom:16px",
    "max-width:480px",
    "width:100%",
    "box-sizing:border-box",
    "font-family:inherit"
  ].join(";");

  /* ── Pip row (Variant B's deck-map) ── */
  const pipRow = document.createElement("div");
  pipRow.style.cssText = "display:flex;gap:5px;margin-bottom:10px;";

  const updatePips = () => {
    pipRow.innerHTML = "";
    cards.forEach((_, i) => {
      const pip = document.createElement("div");
      pip.style.cssText = [
        "flex:1",
        "height:6px",
        "border-radius:999px",
        "cursor:pointer",
        "transition:all 0.2s",
        i < results.length
          ? results[i] === "know"
            ? "background:#4ade80;"
            : "background:#f87171;"
          : i === index
            ? "background:#facc15;outline:2px solid #fde68a;outline-offset:1px;"
            : "background:#e5e7eb;"
      ].join(";");
      pip.title = `Card ${i + 1}`;
      pip.onclick = () => {
        // Allow navigation to answered cards or current
        if (i <= results.length) {
          index    = i;
          revealed = i < results.length; // show revealed state for answered cards
          showHint = false;
          renderCard();
        }
      };
      pipRow.appendChild(pip);
    });
  };

  /* ── Counter row ── */
  const counterRow = document.createElement("div");
  counterRow.style.cssText = "display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:#9ca3af;margin-bottom:10px;";

  const updateCounter = () => {
    const know = results.filter(r => r === "know").length;
    counterRow.innerHTML = `
      <span>Card ${index + 1} / ${cards.length}</span>
      <span style="color:#16a34a">${know} known · ${results.length - know} learning</span>
    `;
  };

  /* ── Card area ── */
  const cardArea = document.createElement("div");
  cardArea.style.cssText = "position:relative;height:190px;margin-bottom:12px;cursor:pointer;";
  cardArea.onclick = () => {
    if (!revealed) { revealed = true; showHint = false; renderCard(); }
  };

  /* ── Action row ── */
  const actionRow = document.createElement("div");

  /* ── Respond helper ── */
  const respond = (result) => {
    // Update existing result if navigating back, else push
    if (index < results.length) {
      results[index] = result;
    } else {
      results.push(result);
    }
    revealed = false;
    showHint = false;
    // Advance to next unanswered card
    let next = results.length; // first unanswered
    if (next >= cards.length) {
      // All answered — show completion
      index = cards.length;
    } else {
      index = next;
    }
    renderCard();
  };

  /* ── Completion screen ── */
  const showCompletion = () => {
    const know = results.filter(r => r === "know").length;
    const pct  = Math.round((know / cards.length) * 100);
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📖";
    const msg   = pct >= 80 ? "Excellent!" : pct >= 50 ? "Good progress!" : "Keep practising!";

    wrapper.innerHTML = "";
    const done = document.createElement("div");
    done.style.cssText = "text-align:center;padding:16px 8px;";
    done.innerHTML = `
      <div style="font-size:2.5rem;margin-bottom:8px">${emoji}</div>
      <div style="font-size:1.1rem;font-weight:900;color:#111;margin-bottom:4px">${msg}</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:12px">
        You knew <strong style="color:#16a34a">${know}</strong> out of <strong>${cards.length}</strong> cards
      </div>
      <div style="background:#f3f4f6;border-radius:999px;height:10px;overflow:hidden;margin-bottom:8px;">
        <div style="background:#facc15;height:100%;width:${pct}%;border-radius:999px;transition:width 0.6s ease;"></div>
      </div>
      <div style="font-size:1.4rem;font-weight:900;color:#eab308;margin-bottom:16px">${pct}% mastered</div>
    `;

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;";

    const retryBtn = document.createElement("button");
    retryBtn.style.cssText = "flex:1;padding:10px;border-radius:14px;background:#f3f4f6;color:#374151;font-size:12px;font-weight:700;border:none;cursor:pointer;";
    retryBtn.innerHTML = "🔄 Retry deck";
    retryBtn.onmouseenter = () => retryBtn.style.background = "#e5e7eb";
    retryBtn.onmouseleave = () => retryBtn.style.background = "#f3f4f6";
    retryBtn.onclick = () => { wrapper.remove(); window.renderFlashcard(cards); };

    btnRow.appendChild(retryBtn);
    done.appendChild(btnRow);
    wrapper.appendChild(done);
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  };

  /* ── Main render function ── */
  const renderCard = () => {
    if (index >= cards.length && results.length === cards.length) {
      showCompletion();
      return;
    }

    const card = cards[Math.min(index, cards.length - 1)];

    updatePips();
    updateCounter();

    /* Stack layers */
    cardArea.innerHTML = "";

    if (index + 2 < cards.length) {
      const l2 = document.createElement("div");
      l2.style.cssText = "position:absolute;inset:0;top:10px;left:10px;right:10px;background:#e5e7eb;border-radius:16px;";
      cardArea.appendChild(l2);
    }
    if (index + 1 < cards.length) {
      const l1 = document.createElement("div");
      l1.style.cssText = "position:absolute;inset:0;top:5px;left:5px;right:5px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:16px;";
      cardArea.appendChild(l1);
    }

    /* Top card */
    const topCard = document.createElement("div");
    topCard.style.cssText = revealed
      ? "position:absolute;inset:0;background:#f0fdf4;border:2px solid #86efac;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,0.06);"
      : "position:absolute;inset:0;background:#fff;border:2px solid #fde68a;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,0.06);";

    if (!revealed) {
      const label = document.createElement("div");
      label.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#f59e0b;margin-bottom:8px;";
      label.textContent = "Question";

      const question = document.createElement("div");
      question.style.cssText = "font-size:15px;font-weight:700;color:#111;text-align:center;line-height:1.4;";
      question.textContent = card.front;

      topCard.appendChild(label);
      topCard.appendChild(question);

      if (includeHints && card.hint) {
        if (!showHint) {
          const hintBtn = document.createElement("button");
          hintBtn.style.cssText = "margin-top:12px;font-size:11px;color:#9ca3af;text-decoration:underline;background:none;border:none;cursor:pointer;padding:0;";
          hintBtn.textContent = "Show hint";
          hintBtn.onclick = (e) => { e.stopPropagation(); showHint = true; renderCard(); };
          topCard.appendChild(hintBtn);
        } else {
          const hintBox = document.createElement("div");
          hintBox.style.cssText = "margin-top:10px;font-size:11px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:5px 12px;border-radius:8px;text-align:center;";
          hintBox.innerHTML = `💡 ${card.hint}`;
          topCard.appendChild(hintBox);
        }
      } else if (!includeHints || !card.hint) {
        const tapHint = document.createElement("div");
        tapHint.style.cssText = "margin-top:12px;font-size:11px;color:#9ca3af;";
        tapHint.textContent = "Tap to reveal answer";
        topCard.appendChild(tapHint);
      }
    } else {
      const label = document.createElement("div");
      label.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#16a34a;margin-bottom:8px;";
      label.textContent = "Answer";

      const answer = document.createElement("div");
      answer.style.cssText = "font-size:13px;color:#374151;text-align:center;line-height:1.5;";
      answer.textContent = card.back;

      topCard.appendChild(label);
      topCard.appendChild(answer);
    }

    cardArea.appendChild(topCard);

    /* Action buttons */
    actionRow.innerHTML = "";

    if (!revealed) {
      const revBtn = document.createElement("button");
      revBtn.style.cssText = "width:100%;padding:12px;border-radius:16px;background:#facc15;color:#0a0a09;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:background 0.15s;";
      revBtn.textContent = "Reveal answer";
      revBtn.onmouseenter = () => revBtn.style.background = "#eab308";
      revBtn.onmouseleave = () => revBtn.style.background = "#facc15";
      revBtn.onclick = () => { revealed = true; showHint = false; renderCard(); };
      actionRow.appendChild(revBtn);
    } else {
      const pair = document.createElement("div");
      pair.style.cssText = "display:flex;gap:8px;";

      const dontBtn = document.createElement("button");
      dontBtn.style.cssText = "flex:1;padding:12px;border-radius:16px;background:#fef2f2;border:2px solid #fca5a5;color:#dc2626;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s;";
      dontBtn.innerHTML = "✕&nbsp;Don't know";
      dontBtn.onmouseenter = () => dontBtn.style.background = "#fee2e2";
      dontBtn.onmouseleave = () => dontBtn.style.background = "#fef2f2";
      dontBtn.onclick = () => respond("dontknow");

      const knowBtn = document.createElement("button");
      knowBtn.style.cssText = "flex:1;padding:12px;border-radius:16px;background:#f0fdf4;border:2px solid #86efac;color:#16a34a;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s;";
      knowBtn.innerHTML = "✓&nbsp;Know it!";
      knowBtn.onmouseenter = () => knowBtn.style.background = "#dcfce7";
      knowBtn.onmouseleave = () => knowBtn.style.background = "#f0fdf4";
      knowBtn.onclick = () => respond("know");

      pair.appendChild(dontBtn);
      pair.appendChild(knowBtn);
      actionRow.appendChild(pair);
    }
  };

  /* ── Assemble ── */
  wrapper.appendChild(pipRow);
  wrapper.appendChild(counterRow);
  wrapper.appendChild(cardArea);
  wrapper.appendChild(actionRow);
  chat.appendChild(wrapper);

  renderCard();
  chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
};
