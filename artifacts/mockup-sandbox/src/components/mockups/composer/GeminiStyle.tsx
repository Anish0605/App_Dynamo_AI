import { useState } from "react";
import {
  Plus, Mic, ArrowUp, ChevronDown, SlidersHorizontal,
  Paperclip, Image as ImageIcon, FolderOpen, Link2, BookOpen,
  Zap, Lightbulb, FlaskConical, Headphones, Sparkles, FileText,
  Layers, Search,
} from "lucide-react";

type OpenMenu = "none" | "plus" | "tools";

export function GeminiStyle() {
  const [open, setOpen] = useState<OpenMenu>("none");
  const [mode, setMode] = useState<"fast" | "deep" | "research">("fast");

  const modeLabel = mode === "fast" ? "Fast" : mode === "deep" ? "DeepThink" : "Research";

  return (
    <div className="min-h-screen bg-[#fafaf9] p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-[680px]">
        <h2 className="text-2xl font-bold text-center mb-6 text-[#0a0a09]">How can I help you?</h2>

        {/* Composer */}
        <div className="relative">
          {/* + Menu (Attachments) */}
          {open === "plus" && (
            <div className="absolute bottom-[calc(100%+10px)] left-0 z-30 w-[260px] rounded-2xl border border-[#e8e8e6] bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <MenuRow icon={<Paperclip className="w-4 h-4" />} label="Add photos & files" />
              <MenuRow icon={<ImageIcon className="w-4 h-4" />} label="Photos" />
              <MenuRow icon={<FolderOpen className="w-4 h-4" />} label="From Drive" />
              <MenuRow icon={<Link2 className="w-4 h-4" />} label="From URL" />
              <div className="my-1 h-px bg-[#f0f0ee]" />
              <MenuRow icon={<BookOpen className="w-4 h-4" />} label="NotebookLM" muted />
            </div>
          )}

          {/* Tools Menu (Modes + Actions) */}
          {open === "tools" && (
            <div className="absolute bottom-[calc(100%+10px)] left-[64px] z-30 w-[280px] rounded-2xl border border-[#e8e8e6] bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <SectionLabel>Mode</SectionLabel>
              <MenuRow icon={<Zap className="w-4 h-4" />} label="Fast" active={mode === "fast"} onClick={() => setMode("fast")} />
              <MenuRow icon={<Lightbulb className="w-4 h-4" />} label="DeepThink" active={mode === "deep"} onClick={() => setMode("deep")} />
              <MenuRow icon={<FlaskConical className="w-4 h-4" />} label="Research plus" tag="PRO" active={mode === "research"} onClick={() => setMode("research")} />
              <div className="my-1 h-px bg-[#f0f0ee]" />
              <SectionLabel>Tools</SectionLabel>
              <MenuRow icon={<Search className="w-4 h-4" />} label="Web search" />
              <MenuRow icon={<BookOpen className="w-4 h-4" />} label="Quick Study Guide" tag="NEW" />
              <MenuRow icon={<Headphones className="w-4 h-4" />} label="Radio mode" />
              <MenuRow icon={<Sparkles className="w-4 h-4" />} label="Generate image" />
              <MenuRow icon={<FileText className="w-4 h-4" />} label="Slides (PPTX)" tag="NEW" />
              <MenuRow icon={<Layers className="w-4 h-4" />} label="More" chev />
            </div>
          )}

          {/* Outer ring */}
          <div className="rounded-[28px] border-2 border-[#facc15] bg-white px-2.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            {/* Top row: textarea */}
            <div className="px-2 pt-1.5 pb-1">
              <div className="text-[15px] text-[#9ca3af]">Ask Dynamo anything...</div>
            </div>

            {/* Bottom row: + | Tools | spacer | Mode | mic | send */}
            <div className="flex items-center gap-2 px-1 pt-1">
              {/* + with golden yellow border */}
              <button
                onClick={() => setOpen(open === "plus" ? "none" : "plus")}
                className="h-9 w-9 flex items-center justify-center rounded-full border-2 border-[#facc15] bg-white text-[#0a0a09] hover:bg-[#fffbe6] transition shrink-0"
                title="Add files"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>

              {/* Tools pill */}
              <button
                onClick={() => setOpen(open === "tools" ? "none" : "tools")}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-[#f3f3f1] text-[#3a3a38] text-sm font-medium hover:bg-[#ebebe9] transition shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Tools</span>
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Mode pill */}
              <button className="h-9 px-3 inline-flex items-center gap-1 rounded-full text-sm font-semibold text-[#3a3a38] hover:bg-[#f3f3f1] transition shrink-0">
                <span>{modeLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Mic — light-red highlight */}
              <button
                title="Voice input"
                className="h-9 w-9 flex items-center justify-center rounded-full bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca] transition shrink-0"
              >
                <Mic className="w-4 h-4" strokeWidth={2.4} />
              </button>

              {/* Send */}
              <button
                title="Send"
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#facc15] hover:bg-[#eab308] text-black shadow shrink-0"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion chips — DeepThink + topic REMOVED */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <Chip>📚 Make a study guide</Chip>
          <Chip>🔬 Research a topic</Chip>
          <Chip>🧩 Quiz me</Chip>
          <Chip>📄 Summarise a PDF</Chip>
        </div>

        <p className="text-center text-[11px] text-[#9ca3af] mt-6">
          Variant A · "+" has golden border · "Tools" sits next to it · mic in light red · "DeepThink + topic" removed
        </p>
      </div>
    </div>
  );
}

function MenuRow({
  icon, label, tag, active, muted, chev, onClick,
}: { icon: React.ReactNode; label: string; tag?: string; active?: boolean; muted?: boolean; chev?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition " +
        (active ? "bg-[#fffbe6] text-[#0a0a09] font-semibold" : "text-[#3a3a38] hover:bg-[#f6f6f4]") +
        (muted ? " opacity-60" : "")
      }
    >
      <span className={active ? "text-[#eab308]" : "text-[#9ca3af]"}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {tag && (
        <span className={
          "text-[9px] font-bold px-1.5 py-0.5 rounded " +
          (tag === "PRO" ? "bg-[#0a0a09] text-[#facc15]" : "bg-[#fef3c7] text-[#92400e]")
        }>{tag}</span>
      )}
      {chev && <span className="text-[#9ca3af]">›</span>}
      {active && <span className="text-[#eab308] text-xs">✓</span>}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">{children}</div>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-3.5 py-1.5 rounded-full bg-white border border-[#e8e8e6] text-[12.5px] text-[#3a3a38] hover:bg-[#fffbe6] hover:border-[#facc15] transition">
      {children}
    </button>
  );
}
