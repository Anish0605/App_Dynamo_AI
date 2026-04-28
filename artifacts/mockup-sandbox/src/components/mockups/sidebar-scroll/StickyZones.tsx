import { Search, Plus, Download, Sparkles, ChevronDown, Folder, MoreHorizontal, Pin } from "lucide-react";

const folders = [
  { name: "Test", count: 3, items: ["What is the impact of social m…", "write a paper on quatum compu…", "What's the difference between AI…"] },
  { name: "Research papers", count: 8 },
  { name: "Marketing", count: 5 },
  { name: "Coding", count: 12 },
];

const history = [
  "Dynamo AI in ICITIIT 26",
  "Dynamo AI Paper Topics",
  "LLM-Driven ETL for Marketing…",
  "Simple Content Re-write Task",
  "Smart LinkedIn Job Agent",
  "Product Video Creation Tips",
  "AI Video Script Ideas",
  "Startup Success vs Dynamo AI",
  "Quantum computing primer",
  "Brand voice guide draft",
  "Competitor pricing teardown",
  "Investor update Q1",
];

export function StickyZones() {
  return (
    <div className="h-screen w-full bg-white text-gray-900 flex flex-col font-sans border-r border-gray-200">

      {/* ── STICKY TOP (always visible) ── */}
      <div className="flex-none px-3 pt-3 pb-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-black font-black text-lg">⚡</span>
          </div>
          <h1 className="font-extrabold text-[15px]">Dynamo AI</h1>
        </div>
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search chats..." className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none" />
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 hover:bg-gray-50">
          <Plus className="w-3.5 h-3.5 text-yellow-500" /> New Chat
        </button>
      </div>

      {/* ── QUICK TOOLS (sticky, compact) ── */}
      <div className="flex-none px-3 py-2 border-b border-gray-100">
        <button className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-500 px-1 py-1 hover:text-gray-800">
          <span className="flex items-center gap-1.5"><Download className="w-3 h-3" /> EXPORT / SAVE</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        <button className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-500 px-1 py-1 hover:text-gray-800">
          <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> SMART ACTIONS</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* ── SCROLL ZONE 1: FOLDERS (capped, internal scroll) ── */}
      <div className="flex-none border-b border-gray-100">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[10px] font-bold tracking-wider text-gray-500">FOLDERS</span>
          <button className="text-yellow-500 text-base leading-none">+</button>
        </div>
        <div className="px-2 pb-2 overflow-y-auto" style={{ maxHeight: "180px" }}>
          {folders.map((f, i) => (
            <div key={f.name} className={`mb-1 rounded-lg ${i === 0 ? "bg-yellow-50 border border-yellow-200" : ""}`}>
              <div className="flex items-center justify-between px-2 py-1.5 text-[12px]">
                <span className="flex items-center gap-1.5">
                  {i === 0 ? <ChevronDown className="w-3 h-3" /> : <span className="w-3" />}
                  <Folder className={`w-3.5 h-3.5 ${i === 0 ? "text-yellow-600" : "text-gray-500"}`} />
                  <span className={`font-semibold ${i === 0 ? "text-gray-900" : "text-gray-700"}`}>{f.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${i === 0 ? "bg-yellow-200 text-black" : "bg-gray-100 text-gray-500"}`}>{f.count}</span>
                  <MoreHorizontal className="w-3 h-3 text-gray-400" />
                </span>
              </div>
              {i === 0 && f.items?.map(it => (
                <div key={it} className="pl-7 pr-2 py-1 text-[11px] text-gray-600 hover:bg-yellow-100/40 rounded cursor-pointer truncate">• {it}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── SCROLL ZONE 2: HISTORY (takes remaining space) ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 pt-2 pb-1 sticky top-0 bg-white">
          <span className="text-[10px] font-bold tracking-wider text-gray-500">HISTORY</span>
        </div>
        <div className="px-2 pb-2">
          {history.map((h, i) => (
            <div key={h} className="flex items-center justify-between px-2 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 rounded cursor-pointer">
              <span className="truncate">{h}</span>
              {i < 4 && <Pin className="w-3 h-3 text-gray-300 flex-none" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="flex-none flex items-center gap-2 px-3 py-3 border-t border-gray-200 bg-white">
        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold">AN</div>
        <div className="flex-1">
          <div className="text-[12px] font-bold leading-tight">Anish1</div>
          <div className="inline-block text-[9px] font-extrabold bg-yellow-400 text-black px-1.5 py-0.5 rounded">FREE</div>
        </div>
      </div>
    </div>
  );
}
