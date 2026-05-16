import { useState } from "react";

/* ── tiny icons ── */
const BotIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);
const SparkleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const DownloadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const CopyIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const SAMPLE_TEXT = `Title: The Autonomous Paradigm: Assessing the Integration and Implications of Agentic AI in Higher Education

Abstract
The emergence of Agentic AI—defined as systems capable of autonomous, goal-oriented reasoning and multi-step task execution—marks a significant evolution from the prompt-response paradigm of Large Language Models (LLMs). This research paper examines the theoretical and practical deployment of agentic systems within higher education contexts, with particular attention to pedagogical implications, academic integrity, and institutional readiness.`;

const HUMANIZED_TEXT = `Over the past few years, AI has gone from answering simple questions to actually planning and carrying out multi-step tasks on its own. This shift—from basic chatbots to what researchers are calling "agentic" systems—is starting to reshape how students and educators interact with technology in universities.

In this paper, I look at what this change means in practice: how these more capable AI tools are being used in academic settings, the real questions they raise about academic integrity, and whether institutions are actually ready to handle them. Rather than treating this as a distant, theoretical concern, I want to ground the discussion in what's already happening in classrooms and research labs today.`;

type View = "input" | "result" | "humanized";

export default function AIDetectorMockup() {
  const [tab, setTab] = useState<"detect" | "plagiarism">("detect");
  const [view, setView] = useState<View>("result");
  const [text, setText] = useState(SAMPLE_TEXT);
  const [humanizing, setHumanizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const score = 22; // Human %
  const isAI = score < 50;

  const handleHumanize = () => {
    setHumanizing(true);
    setTimeout(() => { setHumanizing(false); setView("humanized"); }, 1800);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const barHumanWidth  = `${score}%`;
  const barAIWidth     = `${100 - score}%`;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-6 pt-10" style={{fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,sans-serif'}}>
      {/* Modal */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow">
              <BotIcon />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base leading-tight">AI Text Detector</div>
              <div className="text-xs text-gray-400">Gemini-powered writing analysis · Free</div>
            </div>
          </div>
          <button className="text-gray-300 hover:text-gray-500 transition text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-1">
          {(["detect", "plagiarism"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-semibold pb-3 mr-6 border-b-2 transition-colors ${tab === t ? "border-violet-500 text-violet-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              {t === "detect" ? "🤖 AI Detector" : "📄 Plagiarism Checker"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[680px] overflow-y-auto">

          {/* Upload / paste input */}
          {view === "input" ? (
            <>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                <div className="text-gray-300 text-3xl mb-2">⬆</div>
                <div className="text-sm font-semibold text-gray-500">Upload file</div>
                <div className="text-xs text-gray-400 mt-0.5">TXT · PDF · DOCX · MD</div>
              </div>
              <p className="text-center text-xs text-gray-400">or paste text</p>
              <textarea
                className="w-full h-36 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Paste your text here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                onClick={() => setView("result")}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition text-sm"
              >
                Analyse Text
              </button>
            </>
          ) : (
            <>
              {/* Score card */}
              {view === "result" && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="font-extrabold text-red-600 text-base">Strongly AI-Generated</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-red-600">{score}%</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Human</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">This text shows clear hallmarks of AI-generated writing.</div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>Human ←</span>
                    <span className="font-semibold text-gray-600">Confidence: High</span>
                    <span>→ AI</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-400 rounded-l-full transition-all" style={{width: barHumanWidth}} />
                    <div className="h-full bg-red-400 rounded-r-full transition-all" style={{width: barAIWidth}} />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1 text-gray-400">
                    <span>{score}% Human</span>
                    <span>{100 - score}% AI</span>
                  </div>
                </div>
              )}

              {/* Humanized result card */}
              {view === "humanized" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="font-extrabold text-green-700 text-base">Humanized ✓</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-green-600">87%</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Human</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>Human ←</span>
                    <span className="font-semibold text-gray-600">Confidence: High</span>
                    <span>→ AI</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-400 rounded-l-full" style={{width: "87%"}} />
                    <div className="h-full bg-red-300 rounded-r-full" style={{width: "13%"}} />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1 text-gray-400">
                    <span>87% Human</span>
                    <span>13% AI</span>
                  </div>
                </div>
              )}

              {/* Result text sections */}
              {view === "result" && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">What this means for your submission</div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      This text is unlikely to pass an academic integrity review. Substantial rewriting in your own voice is strongly recommended before submission.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detailed analysis</div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      The text follows the 'perfectly optimised' template characteristic of advanced LLMs, using standard academic transitions and a highly balanced 'promise vs. peril' narrative structure.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Specific patterns detected (5)</div>
                    {[
                      `"The emergence of... marks a significant evolution from" (Classic LLM structural opening)`,
                      `"investigates the promise and peril of this transition" (Standard AI binary framing)`,
                      `"Utilizing a systematic synthesis of current literature" (Generic process-oriented transition)`,
                    ].map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                        <span className="text-xs text-gray-600">{p}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Humanized text display */}
              {view === "humanized" && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Humanized Content</div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 transition font-medium"
                    >
                      <CopyIcon />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{HUMANIZED_TEXT}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-1 space-y-2">
                {/* Humanize button — always visible until humanized */}
                {view === "result" && (
                  <button
                    onClick={handleHumanize}
                    disabled={humanizing}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold rounded-xl transition active:scale-95 text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                  >
                    {humanizing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                        Humanizing content…
                      </>
                    ) : (
                      <><SparkleIcon /> Humanize Content</>
                    )}
                  </button>
                )}

                {/* Export buttons row */}
                <div className={`grid gap-2 ${view === "humanized" ? "grid-cols-2" : "grid-cols-2"}`}>
                  <button className="py-2.5 text-xs font-semibold text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition flex items-center justify-center gap-1.5">
                    🌡 Sentence Heatmap
                  </button>
                  <button className="py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                    📄 Export PDF
                  </button>
                </div>

                {/* Export humanized — only shown after humanizing */}
                {view === "humanized" && (
                  <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition active:scale-95 text-sm flex items-center justify-center gap-2">
                    <DownloadIcon /> Export Humanized Content
                  </button>
                )}

                {view === "humanized" && (
                  <button
                    onClick={() => setView("result")}
                    className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    ← Back to detection results
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer nav */}
        {view !== "input" && (
          <div className="border-t border-gray-100 px-5 py-3 flex gap-2">
            <button
              onClick={() => setView("input")}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              ← Analyse new text
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-3 pointer-events-none">
        <span className="bg-black/70 text-white text-[10px] px-3 py-1.5 rounded-full font-medium">
          {view === "result" ? "Results view — click ✨ Humanize to see next state" : view === "humanized" ? "Humanized view — Export button now visible" : "Input view"}
        </span>
      </div>
    </div>
  );
}
