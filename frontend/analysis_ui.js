// analysis_ui.js — Dynamo AI (PHASE-2 + RADIO MODE)
console.log("analysis_ui.js loaded");

let lastAnalysisData = null;
let lastAnalyzedFile = null;

// Initialize file input handler immediately (not in DOMContentLoaded)
const fileInput = document.getElementById("analyze-file-input");
if (fileInput) {
  window.openAnalyzeFile = () => {
    fileInput.value = "";
    fileInput.click();
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    window.isAnalyzingFile = true;

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${window.BACKEND_URL}/analyze-data`, {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error("Analyze failed");

      const data = await res.json();
      lastAnalysisData = data;
      lastAnalyzedFile = file.name;

      renderAnalysis(data);

      // 🔊 RADIO MODE AUTO-PLAY
      if (window.dynamoUI?.audio?.radioMode && data?.content) {
        window.playRadioFromAnalysis?.(data.content);
      }

    } catch (err) {
      console.error(err);
    } finally {
      window.isAnalyzingFile = false;
    }
  });
} else {
  console.warn("analyze-file-input element not found");
}

/* --------------------------------------------------
   ANALYSIS RENDER (UNCHANGED)
-------------------------------------------------- */
function renderAnalysis(data) {
  if (!data || !data.type) return;

  if (data.type === "text") {
    window.renderAssistantMessage?.(
      `<div class="whitespace-pre-wrap">${marked.parse(data.content || "")}</div>`,
      data.content
    );
  }
}
