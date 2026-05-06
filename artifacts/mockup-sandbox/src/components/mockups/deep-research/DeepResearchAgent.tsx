import { useState, useEffect, useRef } from "react";

type Phase = "plan" | "running" | "report";

const QUERY = "Impact of CRISPR-Cas9 on cancer treatment: current clinical trials and future directions";

const PLAN_STEPS = [
  { id: 1, icon: "🗺️", label: "Map the landscape", desc: "Survey CRISPR-Cas9 cancer therapy literature and identify key research clusters", sources: ["PubMed", "OpenAlex"] },
  { id: 2, icon: "🧪", label: "Active clinical trials", desc: "Search ClinicalTrials.gov and WHO registry for Phase I/II/III CRISPR oncology trials", sources: ["ClinicalTrials.gov", "WHO ICTRP"] },
  { id: 3, icon: "📊", label: "Efficacy & safety data", desc: "Extract preliminary outcomes, adverse events, and dosing from published trial results", sources: ["PubMed", "Semantic Scholar"] },
  { id: 4, icon: "🏢", label: "Competitive pipeline", desc: "Identify Intellia, CRISPR Therapeutics, Editas and their cancer programmes", sources: ["Web", "SEC filings"] },
  { id: 5, icon: "🔭", label: "Future directions & gaps", desc: "Synthesise open research questions, delivery challenges, and 5-year expert outlook", sources: ["Nature", "Science", "Web"] },
];

const PAPERS = [
  { title: "In vivo CRISPR-Cas9 gene editing in CTX110 for B-ALL: Phase I results", authors: "Gillmore et al.", journal: "New England Journal of Medicine", year: 2023, if_score: 176.1, citations: 1842, doi: "10.1056/NEJMoa2215658", open: true, relevance: 98 },
  { title: "NTLA-2001: CRISPR-Cas9–engineered allogeneic CAR-T therapy for AML", authors: "Lu et al.", journal: "Nature Medicine", year: 2024, if_score: 82.9, citations: 743, doi: "10.1038/s41591-024-02869-1", open: true, relevance: 95 },
  { title: "Delivery challenges for in vivo CRISPR genome editing in solid tumours", authors: "Xu & Komor", journal: "Nature Reviews Cancer", year: 2024, if_score: 78.5, citations: 521, doi: "10.1038/s41568-024-00675-4", open: false, relevance: 91 },
  { title: "CRISPR screens identify cancer vulnerabilities across 1,000 cell lines", authors: "Behan et al.", journal: "Nature", year: 2023, if_score: 69.5, citations: 2104, doi: "10.1038/s41586-023-05779-1", open: true, relevance: 88 },
  { title: "Off-target effects in CRISPR-Cas9 cancer therapy: systematic review", authors: "Anzalone et al.", journal: "Cell", year: 2024, if_score: 66.9, citations: 389, doi: "10.1016/j.cell.2024.02.011", open: false, relevance: 84 },
  { title: "Lipid nanoparticle delivery of CRISPR-Cas9 mRNA in murine tumours", authors: "Rosenblum et al.", journal: "Nature Communications", year: 2023, if_score: 17.7, citations: 892, doi: "10.1038/s41467-023-37168-3", open: true, relevance: 79 },
];

const SEARCHES = [
  { query: "CRISPR-Cas9 cancer clinical trials Phase I II results 2024", source: "PubMed", type: "academic", found: 847, time: "1.2s" },
  { query: "CTX110 NTLA-5001 allogeneic CAR-T results ASH 2024", source: "ClinicalTrials.gov", type: "clinical", found: 41, time: "0.9s" },
  { query: "CRISPR oncology pipeline Intellia CRISPR Tx Editas 2025", source: "Web", type: "web", found: 312, time: "1.4s" },
  { query: "solid tumour CRISPR delivery barriers LNP AAV 2024 review", source: "Semantic Scholar", type: "academic", found: 234, time: "1.1s" },
  { query: "CRISPR cancer therapy off-target safety concerns clinical", source: "PubMed", type: "academic", found: 156, time: "0.8s" },
];

const REPORT_SECTIONS = [
  {
    heading: "Executive Summary",
    body: "CRISPR-Cas9 has rapidly progressed from a laboratory tool to a clinical-stage oncology platform. As of May 2026, **41 active trials** across 14 countries are evaluating CRISPR-based interventions in haematological malignancies and solid tumours [1][2]. Early Phase I data demonstrates manageable safety profiles with 38% complete response rates in relapsed/refractory B-ALL [1], though delivery to solid tumours remains a critical bottleneck requiring resolution before broader therapeutic applicability [3].",
    citations: [1, 2, 3]
  },
  {
    heading: "Current Clinical Landscape",
    body: "The most advanced programmes target T-cell and B-cell malignancies using allogeneic CAR-T cell engineering. **CTX110** (Intellia/CRISPR Therapeutics) reported 38% complete response in r/r B-ALL at 6-month follow-up at ASH 2024 [1]. **NTLA-5001** demonstrated durable remissions in AML with no dose-limiting toxicities at 12 months [2]. Solid tumour programmes lag haematological ones by approximately 18-24 months due to delivery inefficiency, immunogenicity concerns, and tumour microenvironment resistance [3][5].",
    citations: [1, 2, 3, 5]
  },
  {
    heading: "Competitive Pipeline",
    body: "Three companies dominate the clinical-stage CRISPR oncology landscape: **Intellia Therapeutics** (6 oncology IND filings), **CRISPR Therapeutics** (4 programmes, 2 in Phase II), and **Editas Medicine** (2 active oncology trials). Combined pipeline valuation exceeds $8.4B based on Q1 2026 market data [4]. Chinese institutions (Sichuan University, Peking University) account for 31% of all active CRISPR oncology trials globally, reflecting aggressive state-funded investment [2].",
    citations: [2, 4]
  },
  {
    heading: "Key Research Gaps",
    body: "Analysis of 847 papers identified three consensus gaps: **(1)** Scalable in vivo delivery to solid tumours — current LNP and AAV vectors achieve <5% tumour transfection efficiency [6]; **(2)** Long-term off-target safety data beyond 24 months remains absent from all published trials [5]; **(3)** Combination strategies with checkpoint inhibitors are underexplored despite strong mechanistic rationale [3]. These represent the highest-yield areas for new research investment.",
    citations: [3, 5, 6]
  },
];

function IFBadge({ score }: { score: number }) {
  const color = score > 50 ? "text-purple-400 bg-purple-400/10" : score > 20 ? "text-blue-400 bg-blue-400/10" : "text-green-400 bg-green-400/10";
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>IF {score}</span>;
}

function ReportBody({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\d+\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*")) return <em key={i} className="text-white/80 italic">{part.slice(1, -1)}</em>;
        if (/^\[\d+\]$/.test(part)) return <sup key={i} className="text-yellow-400 font-bold cursor-pointer hover:text-yellow-300 ml-0.5">{part}</sup>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function DeepResearchAgent() {
  const [phase, setPhase] = useState<Phase>("plan");
  const [runStep, setRunStep] = useState(0);
  const [searchStep, setSearchStep] = useState(0);
  const [reportStep, setReportStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [selectedPaper, setSelectedPaper] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "running") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      let step = 0;
      const planTimer = setInterval(() => {
        step++;
        setRunStep(step);
        if (step >= PLAN_STEPS.length) clearInterval(planTimer);
      }, 700);

      let s = 0;
      const searchTimer = setInterval(() => {
        s++;
        setSearchStep(s);
        if (s >= SEARCHES.length) clearInterval(searchTimer);
      }, 800);

      const reportTimer = setTimeout(() => {
        let r = 0;
        const rt = setInterval(() => {
          r++;
          setReportStep(r);
          if (r >= REPORT_SECTIONS.length) {
            clearInterval(rt);
            setTimeout(() => setPhase("report"), 600);
          }
        }, 1000);
      }, 3500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        clearInterval(planTimer);
        clearInterval(searchTimer);
        clearTimeout(reportTimer);
      };
    }
    if (phase !== "running" && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [phase]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 13 }}>

      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-yellow-400 rounded-md flex items-center justify-center text-black font-black text-xs">⚡</div>
          <span className="font-semibold text-white/80 text-xs">Dynamo AI</span>
          <span className="text-white/20 text-xs">›</span>
          <span className="text-white/50 text-xs font-medium">Deep Research Agent</span>
        </div>
        <div className="flex items-center gap-3">
          {phase === "running" && <span className="text-white/30 text-xs font-mono">{fmt(elapsed)}</span>}
          <div className="flex gap-1">
            {(["plan","running","report"] as Phase[]).map(p => (
              <button key={p} onClick={() => { setPhase(p); if(p==="running"){setRunStep(0);setSearchStep(0);setReportStep(0);setElapsed(0);} if(p==="report"){setRunStep(5);setSearchStep(5);setReportStep(4);} }}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all capitalize ${phase===p ? "bg-yellow-400 text-black" : "text-white/30 hover:text-white/60"}`}
              >{p}</button>
            ))}
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${phase==="report" ? "bg-green-500/20 text-green-400" : phase==="running" ? "bg-yellow-400/20 text-yellow-400 animate-pulse" : "bg-white/8 text-white/40"}`}>
            {phase === "plan" ? "Ready" : phase === "running" ? "Researching…" : "Complete"}
          </span>
        </div>
      </div>

      {/* ── Query bar ── */}
      <div className="px-4 py-3 bg-[#0e0e0e] border-b border-white/6 flex items-start gap-3 flex-shrink-0">
        <div className="flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1">Research Query</p>
          <p className="text-sm font-medium text-white leading-snug">{QUERY}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] bg-yellow-400/15 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded font-bold">PRO</span>
          <span className="text-[9px] text-white/25">Deep Research Max · Web + Academic</span>
        </div>
      </div>

      {/* ── Main 3-panel body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── LEFT: Plan steps / progress ── */}
        <div className="w-52 flex-shrink-0 border-r border-white/8 bg-[#0a0a0a] flex flex-col overflow-y-auto">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2.5">Research Plan</p>
            <div className="relative">
              <div className="absolute left-[9px] top-0 bottom-0 w-px bg-white/8" />
              <div className="space-y-0">
                {PLAN_STEPS.map((step, i) => {
                  const done = phase === "report" || (phase === "running" && runStep > i);
                  const active = phase === "running" && runStep === i;
                  return (
                    <div key={step.id} className="flex gap-2.5 pb-3 relative">
                      <div className={`w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center text-[9px] z-10 transition-all duration-500 ${done ? "bg-green-500 text-black" : active ? "bg-yellow-400 text-black" : "bg-white/8 text-white/25"}`}>
                        {done ? "✓" : active ? "…" : step.id}
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-[11px] font-semibold leading-tight transition-colors ${done||active ? "text-white/90" : "text-white/25"}`}>{step.icon} {step.label}</p>
                        <p className={`text-[9px] mt-0.5 leading-tight transition-colors ${done||active ? "text-white/40" : "text-white/15"}`}>{step.desc}</p>
                        {(done || active) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {step.sources.map(s => (
                              <span key={s} className="text-[8px] bg-white/6 text-white/35 px-1.5 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {(phase === "running" || phase === "report") && (
            <>
              <div className="border-t border-white/6 mx-3 my-1" />
              <div className="px-3 pb-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">Live Searches</p>
                <div className="space-y-1.5">
                  {SEARCHES.slice(0, phase === "report" ? SEARCHES.length : searchStep).map((s, i) => (
                    <div key={i} className="p-1.5 rounded-lg bg-white/3 border border-white/6">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[8px] px-1 py-0.5 rounded font-semibold ${s.type==="academic" ? "bg-blue-500/20 text-blue-400" : s.type==="clinical" ? "bg-purple-500/20 text-purple-400" : "bg-orange-500/20 text-orange-400"}`}>{s.type}</span>
                        <span className="text-[8px] text-white/30">{s.source}</span>
                      </div>
                      <p className="text-[9px] text-white/60 leading-tight line-clamp-2">{s.query}</p>
                      <p className="text-[8px] text-white/25 mt-0.5">{s.found} results · {s.time}</p>
                    </div>
                  ))}
                  {phase === "running" && searchStep < SEARCHES.length && (
                    <div className="flex items-center gap-1.5 text-[9px] text-yellow-400">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                      Searching…
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── CENTRE: Phase content ── */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">

          {/* PLAN PHASE */}
          {phase === "plan" && (
            <div className="p-6 max-w-xl">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-base">🔬</div>
                  <div>
                    <p className="text-sm font-semibold text-white">I've analysed your query</p>
                    <p className="text-[11px] text-white/40">Here's my research plan. Review and start when ready.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {PLAN_STEPS.map(step => (
                  <div key={step.id} className="p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors group">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{step.icon}</span>
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold text-white/90">{step.label}</p>
                        <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{step.desc}</p>
                        <div className="flex gap-1 mt-2">
                          {step.sources.map(s => <span key={s} className="text-[9px] bg-yellow-400/10 text-yellow-400/70 border border-yellow-400/15 px-1.5 py-0.5 rounded">{s}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl border border-white/6 bg-white/2 mb-5">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-2">Estimated scope</p>
                <div className="grid grid-cols-3 gap-3">
                  {[["~80", "Web searches"], ["~200", "Papers scanned"], ["~4 min", "Completion"]].map(([v, l]) => (
                    <div key={l} className="text-center">
                      <p className="text-base font-bold text-white">{v}</p>
                      <p className="text-[9px] text-white/35">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setPhase("running")} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>▶</span> Start Deep Research
                </button>
                <button className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                  ✏ Edit plan
                </button>
              </div>
            </div>
          )}

          {/* RUNNING PHASE */}
          {phase === "running" && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
                <span className="text-xs text-white/50 font-medium">Researching — {fmt(elapsed)}</span>
              </div>

              {REPORT_SECTIONS.slice(0, reportStep).map((section, i) => (
                <div key={i} className="mb-6 animate-pulse-once">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-yellow-400 mb-2 flex items-center gap-2">
                    <div className="w-1 h-3 bg-yellow-400 rounded-full" />
                    {section.heading}
                  </h2>
                  <p className="text-[12px] text-white/65 leading-relaxed">
                    <ReportBody text={section.body} />
                  </p>
                </div>
              ))}

              {reportStep < REPORT_SECTIONS.length && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-0.5">
                    {[0,1,2].map(i => <div key={i} className="w-1 h-3 bg-yellow-400/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
                  </div>
                  <span className="text-[11px] text-white/30">Writing {REPORT_SECTIONS[reportStep]?.heading}…</span>
                </div>
              )}
            </div>
          )}

          {/* REPORT PHASE */}
          {phase === "report" && (
            <div className="p-6 max-w-2xl">
              {/* Stats bar */}
              <div className="flex gap-4 mb-5 p-3 rounded-xl bg-white/3 border border-white/6">
                {[["6", "Papers cited"], ["5", "Searches run"], ["847", "Papers scanned"], ["4:23", "Time taken"]].map(([v, l]) => (
                  <div key={l} className="text-center flex-1">
                    <p className="text-sm font-bold text-white">{v}</p>
                    <p className="text-[9px] text-white/35">{l}</p>
                  </div>
                ))}
              </div>

              {/* Source pills */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {["PubMed", "Semantic Scholar", "ClinicalTrials.gov", "Nature", "NEJM", "Cell", "Web"].map(s => (
                  <span key={s} className="text-[9px] bg-white/5 border border-white/8 text-white/40 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>

              {/* Report sections */}
              {REPORT_SECTIONS.map((section, i) => (
                <div key={i} className="mb-6">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-yellow-400 mb-2 flex items-center gap-2">
                    <div className="w-1 h-3 bg-yellow-400 rounded-full" />
                    {section.heading}
                  </h2>
                  <p className="text-[12px] text-white/70 leading-relaxed">
                    <ReportBody text={section.body} />
                  </p>
                </div>
              ))}

              {/* References */}
              <div className="border-t border-white/8 pt-4 mb-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-3">References</p>
                <div className="space-y-1.5">
                  {PAPERS.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex gap-2 text-[10px] text-white/40 leading-relaxed hover:text-white/60 cursor-pointer transition-colors">
                      <span className="text-yellow-400 font-bold flex-shrink-0">[{i+1}]</span>
                      <span>{p.authors}. <em>{p.title}</em>. <span className="text-white/60">{p.journal}</span>, {p.year}. <span className="text-blue-400">{p.doi}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {[["⬇ Export PDF", "bg-yellow-400 text-black font-bold"], ["📄 Export Word", "bg-white/8 text-white/60 border border-white/10"], ["📋 Copy report", "bg-white/8 text-white/60 border border-white/10"], ["💬 Ask follow-up", "bg-white/8 text-white/60 border border-white/10"], ["🔍 Find gaps", "bg-white/8 text-white/60 border border-white/10"]].map(([label, cls]) => (
                  <button key={label} className={`text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 ${cls}`}>{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Academic papers panel ── */}
        <div className="w-64 flex-shrink-0 border-l border-white/8 bg-[#080808] overflow-y-auto">
          <div className="px-3 pt-3 pb-1 border-b border-white/6">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">Academic Sources</p>
              <span className="text-[9px] text-white/20">{phase === "plan" ? "preview" : `${PAPERS.length} found`}</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {["All", "Open Access", "High IF"].map(f => (
                <button key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/35 hover:bg-white/10 transition-colors">{f}</button>
              ))}
            </div>
          </div>

          <div className="p-2 space-y-2">
            {PAPERS.map((paper, i) => (
              <div key={i}
                onClick={() => setSelectedPaper(selectedPaper === i ? null : i)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${selectedPaper === i ? "border-yellow-400/40 bg-yellow-400/5" : "border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4"}`}
              >
                {/* Relevance + open access */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <IFBadge score={paper.if_score} />
                    {paper.open && <span className="text-[8px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded font-semibold">OA</span>}
                  </div>
                  <span className="text-[8px] text-white/20">{paper.relevance}% match</span>
                </div>

                {/* Title */}
                <p className="text-[10px] font-semibold text-white/85 leading-tight mb-1 line-clamp-2">{paper.title}</p>

                {/* Authors + year */}
                <p className="text-[9px] text-white/35 mb-1">{paper.authors} · {paper.year}</p>

                {/* Journal */}
                <p className="text-[9px] text-blue-400/70 italic mb-1.5 truncate">{paper.journal}</p>

                {/* Citations */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/25">📑 {paper.citations.toLocaleString()} citations</span>
                  {(phase === "report" || phase === "running") && (
                    <div className="flex gap-1">
                      <button className="text-[8px] bg-white/6 text-white/40 px-1.5 py-0.5 rounded hover:bg-white/12 transition-colors">Cite</button>
                      {paper.open && <button className="text-[8px] bg-blue-400/15 text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-400/25 transition-colors">PDF</button>}
                    </div>
                  )}
                </div>

                {/* Expanded: DOI */}
                {selectedPaper === i && (
                  <div className="mt-2 pt-2 border-t border-white/6">
                    <p className="text-[8px] text-white/25 break-all">DOI: {paper.doi}</p>
                    <div className="flex gap-1 mt-1.5">
                      <button className="text-[8px] bg-yellow-400/15 text-yellow-400 px-2 py-1 rounded font-semibold hover:bg-yellow-400/25 transition-colors">+ Add to library</button>
                      <button className="text-[8px] bg-white/6 text-white/40 px-2 py-1 rounded hover:bg-white/12 transition-colors">View abstract</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
