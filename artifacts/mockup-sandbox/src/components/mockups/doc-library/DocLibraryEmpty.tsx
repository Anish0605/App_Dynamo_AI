export default function DocLibraryEmpty() {
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
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* BODY — empty state */}
        <div className="px-5 py-8 flex flex-col items-center justify-center text-center min-h-[380px]">
          <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">No saved documents yet</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Upload a PDF or document in chat<br/>and click <span className="font-semibold text-yellow-600">"Remember this"</span> to save it here.<br/>
            Dynamo will reference it in every future chat.
          </p>

          <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
              <span className="italic text-gray-500 text-[11px]">Works with PDF, DOCX, TXT</span>
            </div>
          </div>
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
