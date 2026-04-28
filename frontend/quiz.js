// quiz.js — Dynamo AI Interactive Quiz Engine (ADVANCED)
console.log("quiz.js loaded");

/* ==================================================
   STATE
================================================== */
let quizState = {
  score: 0,
  total: 0,
  time: 0,
  timer: null
};

/* ==================================================
   TIMER
================================================== */
function startTimer(displayEl) {
  quizState.time = 0;

  quizState.timer = setInterval(() => {
    quizState.time++;
    displayEl.innerText = `⏱ ${quizState.time}s`;
  }, 1000);
}

function stopTimer() {
  clearInterval(quizState.timer);
}

/* ==================================================
   LEADERBOARD (LOCAL STORAGE)
================================================== */
function saveScore(score, total, time) {
  const entry = {
    score,
    total,
    time,
    date: new Date().toLocaleString()
  };

  const data = JSON.parse(localStorage.getItem("dynamo_quiz_lb") || "[]");
  data.push(entry);

  // sort best score first, then time
  data.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time - b.time;
  });

  localStorage.setItem("dynamo_quiz_lb", JSON.stringify(data.slice(0, 10)));
}

function renderLeaderboard(container) {
  const data = JSON.parse(localStorage.getItem("dynamo_quiz_lb") || "[]");

  const lb = document.createElement("div");
  lb.className = "mt-4 p-3 bg-white rounded-lg shadow text-sm";

  lb.innerHTML = `
    <div class="font-bold mb-2">🏆 Leaderboard</div>
    ${
      data.length === 0
        ? "<div>No scores yet</div>"
        : data.map((d, i) => `
          <div>
            ${i + 1}. ${d.score}/${d.total} — ${d.time}s
          </div>
        `).join("")
    }
  `;

  container.appendChild(lb);
}

/* ==================================================
   MAIN QUIZ RENDER
================================================== */
window.renderQuiz = (quiz) => {
  quizState = {
    score: 0,
    total: quiz.length,
    time: 0,
    timer: null
  };

  const chat = document.getElementById("chat-messages");

  const wrapper = document.createElement("div");
  wrapper.className = "bg-gray-100 p-4 rounded-xl mb-4 space-y-4";

  // HEADER (Score + Timer)
  const header = document.createElement("div");
  header.className = "flex justify-between text-sm font-semibold";

  const scoreEl = document.createElement("div");
  scoreEl.innerText = `Score: 0/${quiz.length}`;

  const timerEl = document.createElement("div");

  header.appendChild(scoreEl);
  header.appendChild(timerEl);

  wrapper.appendChild(header);

  startTimer(timerEl);

  let answeredCount = 0;

  quiz.forEach((q, i) => {
    const qDiv = document.createElement("div");

    qDiv.innerHTML = `
      <div class="font-semibold mb-2">Q${i + 1}: ${q.question}</div>
      <div class="options space-y-1">
        ${q.options.map((opt, idx) => `
          <button 
            class="quiz-option block w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-200"
            data-correct="${q.answer === idx}"
            data-index="${idx}"
          >
            ${opt}
          </button>
        `).join("")}
      </div>
      <div class="result text-sm mt-2 hidden"></div>
    `;

    const buttons = qDiv.querySelectorAll(".quiz-option");
    const result = qDiv.querySelector(".result");

    buttons.forEach(btn => {
      btn.onclick = () => {
        if (qDiv.classList.contains("answered")) return;

        qDiv.classList.add("answered");
        answeredCount++;

        const isCorrect = btn.dataset.correct === "true";

        if (isCorrect) quizState.score++;

        scoreEl.innerText = `Score: ${quizState.score}/${quiz.length}`;

        buttons.forEach(b => {
          b.disabled = true;

          if (b.dataset.correct === "true") {
            b.classList.add("bg-green-200");
          } else {
            b.classList.add("bg-red-100");
          }
        });

        // Build explanation block (always show; reveals correct answer if wrong)
        const correctOption = q.options[q.answer] ?? "";
        const explanationText = (q.explanation || "").trim();

        const headerHTML = isCorrect
          ? `<div class="font-semibold text-green-700">✅ Correct!</div>`
          : `<div class="font-semibold text-red-700">❌ Not quite. Correct answer: <span class="underline">${correctOption}</span></div>`;

        const explanationHTML = explanationText
          ? `<div class="mt-1.5 text-gray-700 leading-relaxed">
               <span class="font-semibold text-gray-900">💡 Why:</span> ${explanationText}
             </div>`
          : "";

        result.classList.remove("hidden");
        result.className = `result text-sm mt-2 p-3 rounded-lg border ${
          isCorrect
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`;
        result.innerHTML = headerHTML + explanationHTML;

        // FINISHED QUIZ
        if (answeredCount === quiz.length) {
          stopTimer();

          const finish = document.createElement("div");
          finish.className = "mt-3 p-3 bg-white rounded-lg";

          finish.innerHTML = `
            <div class="font-bold">🎉 Quiz Completed!</div>
            <div>Score: ${quizState.score}/${quiz.length}</div>
            <div>Time: ${quizState.time}s</div>
          `;

          wrapper.appendChild(finish);

          saveScore(quizState.score, quiz.length, quizState.time);
          renderLeaderboard(wrapper);
        }
      };
    });

    wrapper.appendChild(qDiv);
  });

  /* ---------------- RESET BUTTON ---------------- */
  const resetBtn = document.createElement("button");
  resetBtn.innerText = "🔄 Reset Quiz";
  resetBtn.className = "mt-3 px-4 py-2 bg-yellow-400 rounded-lg";

  resetBtn.onclick = () => {
    stopTimer();
    wrapper.remove();
    window.renderQuiz(quiz);
  };

  wrapper.appendChild(resetBtn);

  chat.appendChild(wrapper);

  chat.scrollTo({
    top: chat.scrollHeight,
    behavior: "smooth"
  });
};