import { useState } from "react";

export default function DocFileChip() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRemember = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 1200);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-6 font-sans">
      <div className="w-[440px] flex flex-col gap-3">

        {/* Context label */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Chat input — after file is attached
        </p>

        {/* The chat input wrapper (simplified) */}
        <div className="bg-white rounded-2xl border-2 border-yellow-400 shadow-lg p-3 flex flex-col gap-2">

          {/* File chip row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* File chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-sm text-gray-700 border border-blue-200">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/>
              </svg>
              <span className="text-xs font-medium">Transformer-Paper.pdf</span>
              <button className="ml-0.5 text-gray-400 hover:text-red-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Remember this button */}
            {!saved ? (
              <button
                onClick={handleRemember}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
                    </svg>
                    Remember this
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white">
                ✅ Saved to library
              </div>
            )}
          </div>

          {/* Fake input */}
          <div className="px-1 text-sm text-gray-400">Summarise the key findings from this paper</div>

          {/* Action row */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border border-yellow-400 flex items-center justify-center">
                <span className="text-yellow-600 font-bold text-sm">+</span>
              </div>
              <div className="w-7 h-7 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Explainer note */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow-50 rounded-xl border border-yellow-200">
          <svg className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
          </svg>
          <p className="text-[11px] text-yellow-800 leading-relaxed">
            <span className="font-semibold">Remember this</span> saves an AI-generated summary to your library. Dynamo will know this document in every future chat — no need to re-upload.
          </p>
        </div>

        {/* Profile button mockup showing the badge */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-1">
          Profile menu — with doc count badge
        </p>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">AI Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">12</span>
              <span className="text-gray-400 text-sm">›</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer bg-yellow-50/40">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
              </svg>
              <span className="text-sm font-semibold text-gray-800">Document Library</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">4</span>
              <span className="text-gray-400 text-sm">›</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
