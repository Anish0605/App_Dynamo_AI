// audio_engine.js — Dynamo AI (FINAL, STABLE AUDIO)
console.log("audio_engine.js loaded");

/* ==================================================
   GLOBAL AUDIO SESSION (ONLY ONE ALLOWED)
================================================== */
window.dynamoTTS = {
  utterance: null,
  text: "",
  btn: null,
  state: "idle" // idle | playing | paused
};

/* ==================================================
   LOAD VOICES (Chrome Safe)
================================================== */
function loadVoices() {
  window.dynamoTTS.voices = speechSynthesis.getVoices();
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

/* ==================================================
   STOP EVERYTHING (INTERNAL)
================================================== */
function stopAllAudio() {
  speechSynthesis.cancel();

  if (window.dynamoTTS.btn) {
    window.dynamoTTS.btn.innerHTML = '<i data-lucide="play"></i>';
    lucide.createIcons();
    window.dynamoTTS.btn.classList.remove("animate-pulse");
  }

  window.dynamoTTS = {
    utterance: null,
    text: "",
    btn: null,
    state: "idle"
  };
}

/* ==================================================
   ▶️ PLAY / ⏸ PAUSE / ▶️ RESUME
================================================== */
window.readAloud = (text, btn) => {
  if (!text || !window.speechSynthesis) return;

  // NEW BUTTON CLICKED → STOP OLD AUDIO
  if (window.dynamoTTS.btn && window.dynamoTTS.btn !== btn) {
    stopAllAudio();
  }

  // START
  if (window.dynamoTTS.state === "idle") {
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith("en")) || voices[0];

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1;

    utter.onend = () => {
      btn.innerHTML = '<i data-lucide="play"></i>';
      lucide.createIcons();
      btn.classList.remove("animate-pulse");
      window.dynamoTTS.state = "idle";
    };

    window.dynamoTTS = {
      utterance: utter,
      text,
      btn,
      state: "playing"
    };

    btn.innerHTML = '<i data-lucide="pause"></i>';
    lucide.createIcons();
    btn.classList.add("animate-pulse");

    speechSynthesis.speak(utter);
    return;
  }

  // PAUSE
  if (window.dynamoTTS.state === "playing") {
    speechSynthesis.pause();
    window.dynamoTTS.state = "paused";
    btn.innerHTML = '<i data-lucide="play"></i>';
    lucide.createIcons();
    btn.classList.remove("animate-pulse");
    return;
  }

  // RESUME
  if (window.dynamoTTS.state === "paused") {
    speechSynthesis.resume();
    window.dynamoTTS.state = "playing";
    btn.innerHTML = '<i data-lucide="pause"></i>';
    lucide.createIcons();
    btn.classList.add("animate-pulse");
  }
};

/* ==================================================
   🔁 DOUBLE CLICK → RESTART
================================================== */
window.restartReadAloud = (btn) => {
  if (!window.dynamoTTS.text) return;

  stopAllAudio();

  setTimeout(() => {
    window.readAloud(window.dynamoTTS.text, btn);
  }, 120);
};

/* ==================================================
   ⬇️ DOWNLOAD AUDIO (BACKEND EDGE-TTS)
   (NEW — SAFE ADDITION)
================================================== */
window.downloadAudio = async (text) => {
  if (!text) return;

  try {
    // Use relative URL or fallback to current origin
    const backendUrl = window.BACKEND_URL || '';
    const url = `${backendUrl}/export-audio`;
    
    console.log("📥 Downloading audio from:", url);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Audio export failed (${res.status}): ${errText}`);
    }

    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objUrl;
    a.download = "dynamo_ai_audio.mp3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(objUrl), 100);
    console.log("✅ Audio downloaded successfully");
  } catch (err) {
    console.error("❌ Audio download error:", err);
    alert("Failed to download audio. Check console for details.");
  }
};
