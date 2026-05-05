import { useState } from "react";

const cards = [
  { front: "What organelle produces energy for the cell?", back: "Mitochondria — generates ATP via cellular respiration.", hint: "Often called the 'powerhouse'" },
  { front: "What is the formula for photosynthesis?", back: "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂", hint: "Think: carbon + water + light" },
  { front: "What does DNA stand for?", back: "Deoxyribonucleic acid — carries genetic information.", hint: "It's a double helix" },
  { front: "What are the 4 DNA bases?", back: "Adenine (A), Thymine (T), Guanine (G), Cytosine (C)", hint: "A pairs with T, G pairs with C" },
  { front: "What is natural selection?", back: "Organisms with favourable traits survive and reproduce more, passing traits to offspring.", hint: "Darwin's key idea" },
];

export default function FlashcardVariantC() {
  const [showModal, setShowModal]     = useState(true);
  const [showHint, setShowHint]       = useState(false);
  const [revealed, setRevealed]       = useState(false);
  const [index, setIndex]             = useState(0);
  const [results, setResults]         = useState<("know" | "dontknow")[]>([]);
  const [includeHints, setIncludeHints] = useState(true);
  const [done, setDone]               = useState(false);

  const card = cards[index];
  const knowCount = results.filter(r => r === "know").length;

  const respond = (r: "know" | "dontknow") => {
    const next = [...results, r];
    setResults(next);
    setRevealed(false);
    setShowHint(false);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
  };

  if (showModal) {
    return (
      <div className="min-h-screen bg-black/40 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-base">⚡</div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Flashcards</h3>
                <p className="text-[11px] text-gray-400">Know it or don't — fast self-assessment</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-sm">✕</button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Topic</label>
              <textarea rows={2} placeholder="e.g. Cell biology, World War 2, Python basics..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-yellow-400 resize-none"
                defaultValue="Biology basics" />
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
            {/* Hint toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <div className="text-xs font-semibold text-gray-700">Include hints</div>
                <div className="text-[10px] text-gray-400">Show a small clue before revealing</div>
              </div>
              <button
                onClick={() => setIncludeHints(h => !h)}
                className={`w-10 h-5 rounded-full transition ${includeHints ? "bg-yellow-400" : "bg-gray-300"} relative`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${includeHints ? "left-5" : "left-0.5"}`} />
              </button>
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

  if (done) {
    const pct = Math.round((knowCount / cards.length) * 100);
    return (
      <div className="min-h-screen bg-gray-50 font-sans p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📖"}</div>
          <div className="text-xl font-black text-gray-900">
            {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good progress!" : "Keep practising!"}
          </div>
          <div className="text-sm text-gray-500">
            You knew <span className="font-bold text-green-600">{knowCount}</span> out of{" "}
            <span className="font-bold">{cards.length}</span> cards
          </div>
          {/* Gauge */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-2xl font-black text-yellow-500">{pct}% mastered</div>
          <div className="flex gap-2">
            <button
              onClick={() => { setIndex(0); setResults([]); setRevealed(false); setDone(false); }}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200 transition">
              🔄 Retry
            </button>
            <button onClick={() => { setIndex(0); setResults([]); setRevealed(false); setDone(false); setShowModal(true); }}
              className="flex-1 py-2 rounded-xl bg-yellow-400 text-xs font-bold text-black hover:bg-yellow-500 transition">
              New Deck
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
          ⚡ Flashcards: Biology basics (medium, 5 cards)
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
        {/* Progress dots */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-1.5">
            {cards.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition ${
                i < results.length
                  ? results[i] === "know" ? "bg-green-400" : "bg-red-400"
                  : i === index ? "bg-yellow-400 ring-2 ring-yellow-300" : "bg-gray-200"
              }`} />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-semibold">{index + 1} / {cards.length}</span>
        </div>

        {/* Stacked card effect */}
        <div className="relative" style={{ height: "220px" }}>
          {/* Stack shadows */}
          {index + 2 < cards.length && (
            <div className="absolute inset-0 top-3 mx-3 bg-gray-200 rounded-2xl" />
          )}
          {index + 1 < cards.length && (
            <div className="absolute inset-0 top-1.5 mx-1.5 bg-gray-100 rounded-2xl border border-gray-200" />
          )}

          {/* Top card */}
          <div
            className="absolute inset-0 bg-white rounded-2xl border-2 border-yellow-300 flex flex-col items-center justify-center p-5 cursor-pointer shadow-sm"
            onClick={() => setRevealed(r => !r)}>
            {!revealed ? (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2">Question</div>
                <div className="text-[15px] font-bold text-gray-900 text-center leading-snug">{card.front}</div>
                {includeHints && !showHint && (
                  <button
                    onClick={e => { e.stopPropagation(); setShowHint(true); }}
                    className="mt-3 text-[10px] font-semibold text-gray-400 hover:text-yellow-600 underline">
                    Show hint
                  </button>
                )}
                {includeHints && showHint && (
                  <div className="mt-2 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg">
                    💡 {card.hint}
                  </div>
                )}
                {!includeHints && (
                  <div className="mt-3 text-xs text-gray-400">Tap to reveal answer</div>
                )}
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">Answer</div>
                <div className="text-[13px] text-gray-700 leading-relaxed text-center">{card.back}</div>
              </>
            )}
          </div>
        </div>

        {/* Know it / Don't know */}
        {revealed ? (
          <div className="flex gap-2">
            <button onClick={() => respond("dontknow")}
              className="flex-1 py-3 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition">
              ✕ Don't know
            </button>
            <button onClick={() => respond("know")}
              className="flex-1 py-3 rounded-2xl bg-green-50 border-2 border-green-300 text-green-700 font-bold text-sm hover:bg-green-100 transition">
              ✓ Know it!
            </button>
          </div>
        ) : (
          <button onClick={() => setRevealed(true)}
            className="w-full py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm transition">
            Reveal answer
          </button>
        )}

        <button onClick={() => setShowModal(true)} className="w-full py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition">🔄 New Deck</button>
      </div>
    </div>
  );
}
