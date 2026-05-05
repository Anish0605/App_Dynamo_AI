import { useState } from "react";

const cards = [
  { front: "What is photosynthesis?", back: "The process by which green plants use sunlight, water, and CO₂ to produce oxygen and glucose." },
  { front: "What is the powerhouse of the cell?", back: "The mitochondria — they generate most of the cell's ATP through cellular respiration." },
  { front: "Define osmosis.", back: "The movement of water molecules through a semi-permeable membrane from a region of lower to higher solute concentration." },
  { front: "What is Newton's 3rd Law?", back: "For every action there is an equal and opposite reaction." },
  { front: "What is DNA?", back: "Deoxyribonucleic acid — a double-helix molecule that carries genetic information in living organisms." },
];

export default function FlashcardVariantA() {
  const [showModal, setShowModal] = useState(true);
  const [flipped, setFlipped]     = useState(false);
  const [index, setIndex]         = useState(0);
  const [known, setKnown]         = useState<Set<number>>(new Set());

  const card = cards[index];
  const progress = Math.round((known.size / cards.length) * 100);

  if (showModal) {
    return (
      <div className="min-h-screen bg-black/40 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-base">🃏</div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Flashcards</h3>
                <p className="text-[11px] text-gray-400">Flip cards to study any topic</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-sm">✕</button>
          </div>

          {/* Body */}
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
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
            <button className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-black">Cancel</button>
            <button
              onClick={() => setShowModal(false)}
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
        <div className="bg-yellow-400 text-black text-sm font-bold px-4 py-2 rounded-2xl max-w-xs">
          🃏 Flashcards: Cell Biology (medium, 5 cards)
        </div>
      </div>

      {/* Card wrapper */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>Card {index + 1} of {cards.length}</span>
          <span className="text-yellow-600">{known.size} known</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Flip card */}
        <div
          className="cursor-pointer select-none"
          onClick={() => setFlipped(f => !f)}
          style={{ perspective: "600px" }}>
          <div
            className="relative w-full rounded-2xl transition-all duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              minHeight: "180px"
            }}>
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-yellow-300"
              style={{ backfaceVisibility: "hidden" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-3">Question</div>
              <div className="text-center text-[15px] font-bold text-gray-900 leading-snug">{card.front}</div>
              <div className="mt-4 text-xs text-gray-400">Tap to reveal answer</div>
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-400"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 mb-3">Answer</div>
              <div className="text-center text-[13px] text-gray-700 leading-relaxed">{card.back}</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => { setKnown(s => { const n = new Set(s); n.delete(index); return n; }); setFlipped(false); }}
            className="flex-1 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition">
            ❌ Still Learning
          </button>
          <button
            onClick={() => { setKnown(s => new Set(s).add(index)); setFlipped(false); }}
            className="flex-1 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition">
            ✅ Got It
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 transition disabled:opacity-40"
            disabled={index === 0}>
            ← Prev
          </button>
          <button onClick={() => setFlipped(f => !f)} className="text-xs text-yellow-600 font-semibold underline">
            Flip
          </button>
          <button
            onClick={() => { setIndex(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 transition disabled:opacity-40"
            disabled={index === cards.length - 1}>
            Next →
          </button>
        </div>

        {/* Reset */}
        <button onClick={() => setShowModal(true)} className="w-full py-1.5 rounded-xl bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-500 transition">
          🔄 New Deck
        </button>
      </div>
    </div>
  );
}
