import { useState } from "react";

const SLIDE_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  title:      { bg: "bg-slate-100",  text: "text-slate-700",  label: "Title" },
  thesis:     { bg: "bg-blue-100",   text: "text-blue-700",   label: "Thesis" },
  background: { bg: "bg-purple-100", text: "text-purple-700", label: "Background" },
  evidence:   { bg: "bg-green-100",  text: "text-green-700",  label: "Evidence" },
  chart:      { bg: "bg-orange-100", text: "text-orange-700", label: "Chart" },
  comparison: { bg: "bg-pink-100",   text: "text-pink-700",   label: "Comparison" },
  quote:      { bg: "bg-amber-100",  text: "text-amber-700",  label: "Quote" },
  conclusion: { bg: "bg-slate-800",  text: "text-white",      label: "Conclusion" },
};

const OUTLINE = [
  {
    type: "title",
    heading: "CRISPR Gene Editing in Rare Disease Treatment",
    desc: "Title slide with authors, institution, year",
    editable: false,
  },
  {
    type: "thesis",
    heading: "Research Question & Hypothesis",
    desc: "Central claim: targeted CRISPR edits reduce disease burden by 40–60%",
    editable: true,
  },
  {
    type: "background",
    heading: "State of Rare Disease Treatment (2020–2024)",
    desc: "Current limitations, patient population, treatment gap overview",
    editable: true,
  },
  {
    type: "evidence",
    heading: "Clinical Trial Results — Phase II",
    desc: "n=142, 18-month follow-up. Key: 52% symptom reduction (p<0.001)",
    editable: true,
  },
  {
    type: "chart",
    heading: "Efficacy vs. Control — Bar Chart",
    desc: "Visual comparison: CRISPR group vs. standard of care across 3 cohorts",
    editable: true,
  },
  {
    type: "comparison",
    heading: "CRISPR vs. Existing Gene Therapies",
    desc: "2-column comparison: cost, precision, off-target risk, scalability",
    editable: true,
  },
  {
    type: "quote",
    heading: "Expert Consensus",
    desc: "Pull quote from Nature Medicine review + supporting citation",
    editable: true,
  },
  {
    type: "evidence",
    heading: "Safety Profile & Limitations",
    desc: "Off-target effects, delivery challenges, ethical considerations",
    editable: true,
  },
  {
    type: "conclusion",
    heading: "Implications & Next Steps",
    desc: "Phase III roadmap, regulatory pathway, funding landscape",
    editable: true,
  },
];

export default function DeckOutline() {
  const [slides, setSlides] = useState(OUTLINE);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const removeSlide = (i: number) => setSlides(prev => prev.filter((_, idx) => idx !== i));

  const generate = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center text-sm">📋</div>
            <h2 className="text-sm font-bold text-gray-900">Deck Outline</h2>
            <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">AI Generated</span>
          </div>
          <p className="text-xs text-gray-500">
            Review your deck structure before generating. Reorder, remove, or add slides.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-900">{slides.length} slides</div>
          <div className="text-[10px] text-gray-400">Standard depth</div>
        </div>
      </div>

      {/* Slide list */}
      <div className="space-y-2 mb-4">
        {slides.map((slide, i) => {
          const typeStyle = SLIDE_TYPE_COLORS[slide.type] || SLIDE_TYPE_COLORS.title;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex gap-3 items-start hover:border-gray-300 transition group">
              {/* Number */}
              <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                    {typeStyle.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 truncate">{slide.heading}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{slide.desc}</p>
              </div>

              {/* Actions */}
              {slide.editable && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <button className="text-[10px] text-gray-400 hover:text-gray-700 px-1.5 py-1 rounded-lg hover:bg-gray-100">✏️</button>
                  <button
                    onClick={() => removeSlide(i)}
                    className="text-[10px] text-gray-400 hover:text-red-500 px-1.5 py-1 rounded-lg hover:bg-red-50">✕</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add slide */}
        <button className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 transition">
          + Add slide
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(SLIDE_TYPE_COLORS).map(([key, val]) => (
          <span key={key} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${val.bg} ${val.text}`}>
            {val.label}
          </span>
        ))}
      </div>

      {/* Generate button */}
      {!done ? (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Generating your deck...
            </>
          ) : (
            <> 📊 Generate PPTX from outline </>
          )}
        </button>
      ) : (
        <div className="text-center py-4 bg-green-50 rounded-xl border border-green-200">
          <div className="text-2xl mb-1">🎉</div>
          <div className="text-sm font-bold text-green-800 mb-1">Deck ready!</div>
          <div className="text-xs text-green-600 mb-3">9 slides · Academic style · PPTX</div>
          <button className="px-6 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition">
            ⬇ Download PPTX
          </button>
        </div>
      )}
    </div>
  );
}
