import { useState } from "react";

const cards = [
  { term: "Mitosis", def: "Cell division producing two genetically identical daughter cells; used for growth and repair." },
  { term: "Meiosis", def: "Cell division producing four genetically diverse haploid cells; used in sexual reproduction." },
  { term: "Photosynthesis", def: "Conversion of light energy into chemical energy (glucose) using CO₂ and H₂O in chloroplasts." },
  { term: "ATP", def: "Adenosine triphosphate — the primary energy currency of all living cells." },
  { term: "Osmosis", def: "Passive movement of water across a semi-permeable membrane from low to high solute concentration." },
];

type Status = "unseen" | "learning" | "known";

export default function FlashcardVariantB() {
  const [showModal, setShowModal]   = useState(true);
  const [flipped, setFlipped]       = useState(false);
  const [index, setIndex]           = useState(0);
  const [statuses, setStatuses]     = useState<Status[]>(cards.map(() => "unseen"));
  const [format, setFormat]         = useState<"term-def" | "qa">("term-def");

  const card    = cards[index];
  const status  = statuses[index];
  const knownN  = statuses.filter(s => s === "known").length;
  const learnN  = statuses.filter(s => s === "learning").length;

  const mark = (s: Status) => {
    setStatuses(prev => { const n = [...prev]; n[index] = s; return n; });
    setFlipped(false);
    if (index < cards.length - 1) setIndex(i => i + 1);
  };

  const bgForStatus: Record<Status, string> = {
    unseen:   "bg-gray-100",
    learning: "bg-red-100",
    known:    "bg-green-100"
  };

  if (showModal) {
    return (
      <div className="min-h-screen bg-black/40 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-base">📚</div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Flashcards</h3>
                <p className="text-[11px] text-gray-400">Spaced-repetition study deck</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-sm">✕</button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Topic</label>
              <textarea rows={2} placeholder="e.g. Cell biology, World War 2, Python basics..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-yellow-400 resize-none"
                defaultValue="Cell Biology" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Difficulty</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-yellow-400">
                  <option>Easy</option>
                  <option selected>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Cards</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-yellow-400">
                  <option selected>5</option>
                  <option>10</option>
                  <option>15</option>
                  <option>20</option>
                </select>
              </div>
            </div>
            {/* Extra: Format toggle */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Card Format</label>
              <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5 text-xs font-bold">
                <button
                  onClick={() => setFormat("term-def")}
                  className={`flex-1 py-1.5 rounded-lg transition ${format === "term-def" ? "bg-white shadow text-black" : "text-gray-500"}`}>
                  Term / Definition
                </button>
                <button
                  onClick={() => setFormat("qa")}
                  className={`flex-1 py-1.5 rounded-lg transition ${format === "qa" ? "bg-white shadow text-black" : "text-gray-500"}`}>
                  Q &amp; A
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
            <button className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-black">Cancel</button>
            <button onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black text-sm font-bold rounded-xl transition">
              Generate cards
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 flex flex-col">
      {/* User bubble */}
      <div className="flex justify-end mb-4">
        <div className="bg-yellow-400 text-black text-sm font-bold px-4 py-2 rounded-2xl">
          📚 Flashcards: Cell Biology (medium, 5 cards)
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
        {/* Deck mini-map */}
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              onClick={() => { setIndex(i); setFlipped(false); }}
              className={`flex-1 h-2 rounded-full cursor-pointer transition ${
                i === index ? "ring-2 ring-yellow-400" : ""
              } ${bgForStatus[statuses[i]]}`} />
          ))}
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-xs font-semibold text-gray-500">
          <span>Card {index + 1}/{cards.length}</span>
          <span className="flex gap-3">
            <span className="text-red-500">{learnN} learning</span>
            <span className="text-green-600">{knownN} known</span>
          </span>
        </div>

        {/* Card */}
        <div className="cursor-pointer" onClick={() => setFlipped(f => !f)} style={{ perspective: "600px" }}>
          <div
            className="relative rounded-2xl transition-all duration-500 min-h-[200px]"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            {/* Front — Term */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-gray-200"
              style={{ backfaceVisibility: "hidden" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Term</div>
              <div className="text-2xl font-black text-gray-900 text-center">{card.term}</div>
              <div className="mt-3 text-xs text-gray-400">Tap to see definition</div>
            </div>
            {/* Back — Definition */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-300"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 mb-2">Definition</div>
              <div className="text-[13px] text-gray-700 leading-relaxed text-center">{card.def}</div>
            </div>
          </div>
        </div>

        {/* Status buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => mark("learning")}
            className="py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition">
            ❌ Learning
          </button>
          <button onClick={() => setFlipped(f => !f)}
            className="py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition">
            🔄 Flip
          </button>
          <button onClick={() => mark("known")}
            className="py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition">
            ✅ Known
          </button>
        </div>

        {/* Nav */}
        <div className="flex gap-2">
          <button onClick={() => { setIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
            className="flex-1 py-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-200 transition">← Prev</button>
          <button onClick={() => { setIndex(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
            className="flex-1 py-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-200 transition">Next →</button>
        </div>

        <button onClick={() => setShowModal(true)} className="w-full py-1.5 rounded-xl bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-500 transition">🔄 New Deck</button>
      </div>
    </div>
  );
}
