// audio_engine.js — Dynamo AI (FINAL, STABLE AUDIO)

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
================================================== */
window.downloadAudio = async (text) => {
  if (!text) return;

  try {
    // Use relative URL or fallback to current origin
    const backendUrl = window.BACKEND_URL || '';
    const url = `${backendUrl}/export-audio`;
    
    
    const res = await window.backendFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        user_id: window.appState?.supabaseUserId || ""
      })
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
  } catch (err) {
    console.error("❌ Audio download error:", err);
    alert("Failed to download audio. Check console for details.");
  }
};

/* ==================================================
   🎤 VOICE INPUT (RECORD & TRANSCRIBE)
================================================== */
window.voiceState = {
  recording: false,
  mediaRecorder: null,
  audioChunks: [],
  stream: null
};

window.startVoice = async () => {
  const micBtn = document.getElementById("mic-btn");
  if (!micBtn) return;

  // Toggle recording
  if (window.voiceState.recording) {
    // Stop recording
    stopVoiceRecording();
    return;
  }

  // Start recording
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.voiceState.stream = stream;
    window.voiceState.audioChunks = [];

    const mediaRecorder = new MediaRecorder(stream);
    window.voiceState.mediaRecorder = mediaRecorder;
    window.voiceState.recording = true;

    // Update button visual
    micBtn.classList.add("animate-pulse", "bg-red-500/70");
    micBtn.innerHTML = '<i data-lucide="mic-off" class="w-5 h-5 text-white"></i>';
    lucide.createIcons();

    mediaRecorder.ondataavailable = (event) => {
      window.voiceState.audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(window.voiceState.audioChunks, { type: "audio/wav" });
      await processVoiceInput(audioBlob);
    };

    mediaRecorder.start();
  } catch (err) {
    console.error("❌ Mic error:", err);
    alert("Microphone access denied. Please allow microphone permissions.");
  }
};

async function stopVoiceRecording() {
  const micBtn = document.getElementById("mic-btn");
  
  if (window.voiceState.mediaRecorder && window.voiceState.recording) {
    window.voiceState.mediaRecorder.stop();
    window.voiceState.recording = false;

    // Stop all tracks
    if (window.voiceState.stream) {
      window.voiceState.stream.getTracks().forEach(t => t.stop());
    }

    // Reset button
    if (micBtn) {
      micBtn.classList.remove("animate-pulse", "bg-red-500/70");
      micBtn.innerHTML = '<i data-lucide="mic" class="w-5 h-5 text-red-600 dark:text-red-400"></i>';
      lucide.createIcons();
    }

  }
}

async function processVoiceInput(audioBlob) {
  try {
    const fd = new FormData();
    fd.append("audio", audioBlob, "voice.wav");

    const backendUrl = window.BACKEND_URL || '';
    const res = await window.backendFetch(`${backendUrl}/transcribe-audio`, {
      method: "POST",
      body: (() => {
        fd.append("user_id", window.appState?.supabaseUserId || "");
        return fd;
      })()
    });

    if (!res.ok) throw new Error("Transcription failed");

    const data = await res.json();
    const transcript = data.text || data.transcription || "";

    if (transcript && transcript.trim()) {
      const chatInput = document.getElementById("chat-input");
      if (chatInput) {
        chatInput.value = transcript;
        chatInput.style.height = "";
        chatInput.style.height = chatInput.scrollHeight + "px";
        chatInput.focus();
        
        // Auto-send after short delay
        setTimeout(() => {
          window.sendFromInput();
        }, 300);
      }
    } else {
      alert("Could not transcribe audio. Please try again.");
    }
  } catch (err) {
    console.error("❌ Voice processing error:", err);
    alert("Voice transcription failed. Check console for details.");
  }
}
