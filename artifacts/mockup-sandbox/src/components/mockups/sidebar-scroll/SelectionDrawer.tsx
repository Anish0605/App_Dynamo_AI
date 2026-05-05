import { Search, Plus, Download, Sparkles, ChevronDown, Folder, MoreHorizontal, Pin, SquareCheckBig, Trash2 } from "lucide-react";

const folders = [
  { name: "Pink", count: 2, items: ["Study guide: carbon dating (a…", "hello"] },
  { name: "Red", count: 2, items: ["quiz me on html and inline css", "Write a research paper on quan"] },
];

const history = [
  "Research the economic an...",
  "Investigate the peer-revie...",
  "Write a paper on the impa...",
  "Dynamo AI in ICITIIT 26",
  "Product Video Creation Tips",
  "AI Video Script Ideas",
  "Quantum computing primer",
  "Brand voice guide draft",
  "Competitor pricing teardown",
  "Investor update Q1",
];

export default function SelectionDrawer() {
  return (
    <div className="h-screen w-full bg-white text-gray-900 flex flex-col font-sans border-r border-gray-200 overflow-hidden">
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-3 pt-2 pb-2 sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-gray-500">SELECT CHATS</span>
            <button className="text-[10px] font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">2 selected</button>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-yellow-400 text-black text-[11px] font-bold py-2 flex items-center justify-center gap-1.5">
              <SquareCheckBig className="w-3.5 h-3.5" /> Select all
            </button>
            <button className="flex-1 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold py-2 flex items-center justify-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        <div className="px-2 py-2 space-y-1">
          {history.map((h, i) => (
            <div key={h} className={`flex items-center gap-2 px-2 py-2 rounded-xl border ${i === 2 || i === 3 ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-100"}`}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${i === 2 || i === 3 ? "bg-yellow-400 border-yellow-400" : "border-gray-300"}`}>
                {i === 2 || i === 3 ? <span className="text-[10px] text-black font-bold">✓</span> : null}
              </div>
              <span className="flex-1 text-[12px] text-gray-700 truncate">{h}</span>
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
            </div>
          ))}
        </div>

        <div className="px-3 pt-3 pb-1 sticky top-[86px] bg-white z-10 border-t border-gray-100">
          <button className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-gray-500 hover:text-gray-900">
            <ChevronDown className="w-3 h-3" /> FOLDERS (2)
          </button>
        </div>
        <div className="px-2 pb-2 space-y-2">
          {folders.map((f) => (
            <div key={f.name} className="rounded-xl bg-yellow-50 border border-yellow-100 overflow-hidden">
              <div className="flex items-center justify-between px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                  <Folder className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-[12px] font-semibold text-gray-800">{f.name}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-200 text-black">{f.count}</span>
              </div>
              <div className="px-2 pb-2 space-y-1">
                {f.items.map((it) => (
                  <div key={it} className="pl-7 pr-2 py-1.5 text-[11px] text-gray-600 bg-white rounded-lg truncate">
                    • {it}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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