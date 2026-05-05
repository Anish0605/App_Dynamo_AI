import { useState } from "react";

const STYLES = [
  { id: "academic",  label: "Academic",  emoji: "🎓", desc: "Research-grade, citation-aware" },
  { id: "business",  label: "Business",  emoji: "💼", desc: "Executive, data-driven" },
  { id: "pitch",     label: "Pitch",     emoji: "🚀", desc: "Startup, story-led" },
  { id: "minimal",   label: "Minimal",   emoji: "◻︎",  desc: "Clean, text-first" },
];

const LENGTHS = [
  { id: "short",    label: "Short",    slides: "6 slides",   desc: "Key points only" },
  { id: "standard", label: "Standard", slides: "10 slides",  desc: "Full story arc" },
  { id: "deep",     label: "Deep",     slides: "15+ slides", desc: "Complete deep-dive" },
];

export default function DeckInput() {
  const [style,   setStyle]   = useState("academic");
  const [length,  setLength]  = useState("standard");
  const [source,  setSource]  = useState<"text" | "pdf">("text");
  const [topic,   setTopic]   = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center text-lg">📊</div>
            <div>
              <h2 className="text-white font-bold text-base">Research Deck Generator</h2>
              <p className="text-slate-400 text-xs">Turn your research into a professional presentation</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Source toggle */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Source</label>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 text-xs font-bold">
              <button
                onClick={() => setSource("text")}
                className={`flex-1 py-2 rounded-lg transition ${source === "text" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                ✍️ Topic / notes
              </button>
              <button
                onClick={() => setSource("pdf")}
                className={`flex-1 py-2 rounded-lg transition ${source === "pdf" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                📄 Upload PDF / paper
              </button>
            </div>
          </div>

          {/* Input area */}
          {source === "text" ? (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Topic / Research Question</label>
              <textarea
                rows={3}
                placeholder="e.g. The impact of CRISPR gene editing on rare disease treatment — research paper, 2024..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-slate-400 resize-none leading-relaxed"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Research Paper</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-slate-400 transition cursor-pointer">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Drop PDF here or click to upload</div>
                <div className="text-xs text-gray-400">Supports academic papers, reports, thesis documents</div>
                <button className="mt-3 px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition">
                  Browse files
                </button>
              </div>
            </div>
          )}

          {/* Style picker */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Deck Style</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`text-left p-3 rounded-xl border-2 transition ${
                    style === s.id
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="text-base mb-0.5">{s.emoji}</div>
                  <div className={`text-xs font-bold ${style === s.id ? "text-gray-900" : "text-gray-700"}`}>{s.label}</div>
                  <div className="text-[10px] text-gray-400">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Length picker */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Deck Length</label>
            <div className="flex gap-2">
              {LENGTHS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLength(l.id)}
                  className={`flex-1 py-2.5 px-2 rounded-xl border-2 text-center transition ${
                    length === l.id
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}>
                  <div className={`text-xs font-bold ${length === l.id ? "text-white" : "text-gray-800"}`}>{l.label}</div>
                  <div className={`text-[10px] mt-0.5 ${length === l.id ? "text-slate-300" : "text-gray-400"}`}>{l.slides}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Audience (optional) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Audience <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
            <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-slate-400">
              <option>Research peers / PhD committee</option>
              <option>Conference audience</option>
              <option>University faculty</option>
              <option>Executive / leadership</option>
              <option>General audience</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-0 flex gap-2">
          <button className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          <button className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2">
            <span>Plan my deck</span>
            <span className="text-base">→</span>
          </button>
        </div>

        {/* Powered-by note */}
        <div className="px-6 pb-4 text-center text-[10px] text-gray-400">
          AI plans the structure first — you review before generating
        </div>
      </div>
    </div>
  );
}
