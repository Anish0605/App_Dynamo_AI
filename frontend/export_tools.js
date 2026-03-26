// export_tools.js — Dynamo AI (REAL EXPORT WIRED)
console.log("export_tools.js loaded");

/* --------------------------------------------------
   COLLECT CHAT HISTORY (JSON SAFE)
-------------------------------------------------- */
function collectChatHistory() {
  const history = window.chatHistory;
  if (!history || history.length === 0) return [];

  return history.map(m => ({
    role: m.role,
    content: { text: m.content || "" }
  }));
}

/* --------------------------------------------------
   CORE EXPORT HANDLER
-------------------------------------------------- */
async function exportChat(type) {
  const messages = collectChatHistory();

  if (!messages.length) {
    alert("No content to export yet.");
    return;
  }

  try {
    const res = await fetch(
      `${window.BACKEND_URL}/export/${type}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      }
    );

    if (!res.ok) {
      throw new Error(`Export failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
      type === "pdf"  ? "DynamoAI_Report.pdf"  :
      type === "word" ? "DynamoAI_Report.docx" :
                        "DynamoAI_Report.pptx";

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Export error:", err);
    alert("Export failed. Please try again.");
  }
}

/* --------------------------------------------------
   EXPOSE TO HTML (NO HTML CHANGE NEEDED)
-------------------------------------------------- */
window.downloadPdfReport = () => exportChat("pdf");
window.downloadWordReport = () => exportChat("word");
window.downloadPptReport = () => exportChat("ppt");
