const MOCK_DOCS = [
  {
    id: "1",
    filename: "Transformer Architecture — Attention Is All You Need.pdf",
    summary: "Landmark 2017 paper introducing the Transformer model, replacing RNNs with self-attention. Foundational for BERT, GPT, and all modern LLMs.",
    topics: "machine learning, NLP, deep learning",
    key_terms: "self-attention, multi-head attention, positional encoding, encoder-decoder",
    ext: "PDF",
    size: "348 KB",
    date: "May 4, 2026",
    extColor: "bg-red-100 text-red-700",
  },
  {
    id: "2",
    filename: "Organic Chemistry — Chapter 8 Notes.docx",
    summary: "Lecture notes covering nucleophilic substitution (SN1 and SN2), elimination reactions, and stereochemistry with worked examples.",
    topics: "organic chemistry, reaction mechanisms",
    key_terms: "SN1, SN2, E1, E2, carbocation, stereochemistry, leaving group",
    ext: "DOCX",
    size: "124 KB",
    date: "May 3, 2026",
    extColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "3",
    filename: "Q1 2026 Revenue Report — Acme Corp.pdf",
    summary: "Internal quarterly report showing ₹4.2Cr ARR, 34% YoY growth, churn at 2.1%, and expansion revenue up 18% driven by enterprise segment.",
    topics: "finance, business metrics, SaaS",
    key_terms: "ARR, MRR, churn rate, expansion revenue, CAC, LTV",
    ext: "PDF",
    size: "892 KB",
    date: "May 1, 2026",
    extColor: "bg-red-100 text-red-700",
  },
  {
    id: "4",
    filename: "startup-pitch-deck.txt",
    summary: "Rough pitch notes for Series A: market sizing (₹800Cr TAM), competitive moat, 18-month roadmap, and key hiring plan.",
    topics: "entrepreneurship, fundraising, product",
    key_terms: "TAM, Series A, runway, product-market fit, ARR milestones",
    ext: "TXT",
    size: "18 KB",
    date: "Apr 28, 2026",
    extColor: "bg-gray-100 text-gray-600",
  },
];

export default function DocLibraryFilled() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden font-sans">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Document Library</h3>
              <p className="text-[11px] text-gray-400">Dynamo remembers these across all sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">4 docs</span>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* BODY — doc list */}
        <div className="px-4 py-3 max-h-[460px] overflow-y-auto divide-y divide-gray-50">
          {MOCK_DOCS.map((doc) => (
            <div key={doc.id} className="flex items-start gap-3 py-3 group">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{doc.filename}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{doc.summary}</p>
                <p className="text-[11px] text-yellow-600 mt-1 font-medium">{doc.topics}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${doc.extColor}`}>{doc.ext}</span>
                  <span className="text-[10px] text-gray-400">{doc.size}</span>
                  <span className="text-[10px] text-gray-400">{doc.date}</span>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <label className="flex items-center gap-2 text-xs font-semibold text-yellow-700 cursor-pointer px-3 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            Add document to library
          </label>
          <p className="text-[11px] text-gray-400">PDF, DOCX, TXT</p>
        </div>
      </div>
    </div>
  );
}
