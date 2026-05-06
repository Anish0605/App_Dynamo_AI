import { useState, useEffect } from "react";

const QUERY = "Impact of CRISPR-Cas9 on cancer treatment: current clinical trials and future directions";

const PLAN_STEPS = [
  { id: 1, label: "Map the landscape", desc: "Survey existing CRISPR-Cas9 cancer therapy literature and identify key research clusters" },
  { id: 2, label: "Active clinical trials", desc: "Search ClinicalTrials.gov and WHO registry for ongoing Phase I/II/III CRISPR oncology trials" },
  { id: 3, label: "Efficacy & safety data", desc: "Extract preliminary outcomes, adverse events, and dosing data from published trial results" },
  { id: 4, label: "Competitive pipeline", desc: "Identify biotech companies (Intellia, CRISPR Therapeutics, Editas) and their cancer programs" },
  { id: 5, label: "Future directions & gaps", desc: "Synthesise open research questions, delivery challenges, and 5-year outlook from expert commentary" },
];

const SEARCHES = [
  { query: "CRISPR-Cas9 cancer clinical trials 2024 2025 phase results", source: "nature.com", title: "In vivo CRISPR base editing of PCSK9 durably lowers cholesterol…", time: "2s ago", done: true },
  { query: "ClinicalTrials.gov CRISPR oncology active recruiting 2025", source: "clinicaltrials.gov", title: "A Phase 1 Study of CTX110 in Subjects With Relapsed…", time: "5s ago", done: true },
  { query: "Intellia Therapeutics CRISPR cancer program pipeline update", source: "intelliatx.com", title: "Intellia Pipeline — Oncology Programs Update Q1 2025", time: "9s ago", done: true },
  { query: "CRISPR delivery challenges in vivo tumour specificity 2025", source: "cell.com", title: "Advances and challenges in in vivo delivery of CRISPR…", time: "12s ago", done: false },
];

const REPORT_CHUNKS = [
  {
    heading: "Executive Summary",
    text: "CRISPR-Cas9 has rapidly progressed from a laboratory curiosity to a clinical-stage oncology platform. As of May 2026, 41 active trials across 14 countries are investigating CRISPR-based interventions in haematological malignancies and solid tumours. Early Phase I data indicates manageable safety profiles, though delivery to solid tumours remains a critical bottleneck.",
  },
  {
    heading: "Current Clinical Landscape",
    text: "The most advanced programmes target T-cell malignancies (CTX110, NTLA-5001) and haematological cancers via CAR-T cell engineering. CTX110 (Intellia/CRISPR Tx) reported 38% complete response in r/r B-ALL at 6-month follow-up (ASH 2024). Solid tumour programmes lag by ~2 years, hampered by delivery inefficiency and immunogenicity.",
  },
];

const SOURCE_PILLS = [
  "nature.com", "nejm.org", "clinicaltrials.gov",
  "cell.com", "science.org", "intelliatx.com", "crisprtherapeutics.com"
];

type Phase = "idle" | "planning" | "searching" | "writing" | "done";

export function DeepResearchAgent() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [activePlan, setActivePlan] = useState(0);
  const [activeSearch, setActiveSearch] = useState(0);
  const [reportChunks, setReportChunks] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("planning");
      setStarted(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [started]);

  useEffect(() => {
    if (phase === "planning") {
      let step = 0;
      const t = setInterval(() => {
        step++;
        setActivePlan(step);
        if (step >= PLAN_STEPS.length) {
          clearInterval(t);
          setTimeout(() => setPhase("searching"), 500);
        }
      }, 500);
      return () => clearInterval(t);
    }
    if (phase === "searching") {
      let s = 0;
      const t = setInterval(() => {
        s++;
        setActiveSearch(s);
        if (s >= SEARCHES.length - 1) {
          clearInterval(t);
          setTimeout(() => setPhase("writing"), 800);
        }
      }, 900);
      return () => clearInterval(t);
    }
    if (phase === "writing") {
      let c = 0;
      const t = setInterval(() => {
        c++;
        setReportChunks(c);
        if (c >= REPORT_CHUNKS.length) {
          clearInterval(t);
          setTimeout(() => setPhase("done"), 400);
        }
      }, 1200);
      return () => clearInterval(t);
    }
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white font-sans flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#141414]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">⚡</span>
          </div>
          <span className="font-semibold text-sm text-white/90">Dynamo AI</span>
          <span className="text-white/30 mx-1">·</span>
          <span className="text-xs text-white/40">Deep Research Agent</span>
        </div>
        <div className="flex items-center gap-3">
          {started && (
            <span className="text-xs text-white/40 font-mono">{formatTime(elapsed)}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            phase === "done" ? "bg-green-500/20 text-green-400" :
            phase === "idle" ? "bg-white/10 text-white/40" :
            "bg-yellow-400/20 text-yellow-400"
          }`}>
            {phase === "idle" ? "Ready" : phase === "planning" ? "Planning..." : phase === "searching" ? "Searching..." : phase === "writing" ? "Synthesising..." : "Complete"}
          </span>
        </div>
      </div>

      {/* Query bar */}
      <div className="px-5 py-4 border-b border-white/8 bg-[#111]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">Research Query</p>
        <p className="text-base font-medium text-white leading-snug">{QUERY}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] bg-yellow-400/15 text-yellow-400 px-2 py-0.5 rounded-full font-semibold">PRO</span>
          <span className="text-[10px] text-white/30">Deep Research Max · Web + Document Library</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — Plan + Searches */}
        <div className="w-72 flex-shrink-0 border-r border-white/8 flex flex-col overflow-y-auto bg-[#0e0e0e]">

          {/* Research Plan */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">Research Plan</p>
            <div className="space-y-2">
              {PLAN_STEPS.map((step, i) => {
                const done = activePlan > i;
                const active = phase === "planning" && activePlan === i;
                return (
                  <div key={step.id} className={`flex gap-2.5 p-2 rounded-lg transition-all duration-300 ${active ? "bg-yellow-400/10 border border-yellow-400/30" : done ? "opacity-70" : "opacity-25"}`}>
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${done ? "bg-green-500 text-black" : active ? "bg-yellow-400 text-black animate-pulse" : "bg-white/10 text-white/40"}`}>
                      {done ? "✓" : step.id}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/90 leading-tight">{step.label}</p>
                      <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/8 mx-4 my-2" />

          {/* Live Searches */}
          <div className="px-4 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">Web Searches</p>
            <div className="space-y-2">
              {SEARCHES.slice(0, activeSearch + (phase === "searching" || phase === "writing" || phase === "done" ? 1 : 0)).map((s, i) => {
                const isActive = !s.done && phase === "searching";
                return (
                  <div key={i} className={`p-2 rounded-lg border transition-all ${isActive ? "border-yellow-400/40 bg-yellow-400/5" : "border-white/6 bg-white/3"}`}>
                    <div className="flex items-start gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center ${isActive ? "bg-yellow-400 animate-spin" : "bg-green-500"}`}>
                        {isActive ? (
                          <div className="w-1.5 h-1.5 border border-black border-t-transparent rounded-full" />
                        ) : (
                          <span className="text-black text-[8px] font-bold">✓</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-white/50 truncate">{s.source}</p>
                        <p className="text-[10px] text-white/80 leading-tight mt-0.5 line-clamp-2">{s.title}</p>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/25 mt-1.5 pl-5">{s.time}</p>
                  </div>
                );
              })}
              {(phase === "idle" || phase === "planning") && (
                <p className="text-[10px] text-white/20 italic">Searches will appear here…</p>
              )}
            </div>
          </div>
        </div>

        {/* Right panel — Report */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {(phase === "idle" || phase === "planning") && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔬</span>
                </div>
                <p className="text-sm text-white/40">Building research plan…</p>
              </div>
            </div>
          )}

          {(phase === "searching") && reportChunks === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="flex gap-1.5 justify-center mb-4">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-sm text-white/40">Searching {SEARCHES.length} sources…</p>
              </div>
            </div>
          )}

          {(phase === "writing" || phase === "done" || reportChunks > 0) && (
            <div className="p-6 max-w-2xl">

              {/* Sources used */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {SOURCE_PILLS.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white/6 border border-white/10 text-white/50 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>

              {/* Report sections */}
              {REPORT_CHUNKS.slice(0, reportChunks).map((chunk, i) => (
                <div key={i} className="mb-6 animate-fade-in">
                  <h2 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-yellow-400 rounded-full inline-block" />
                    {chunk.heading}
                  </h2>
                  <p className="text-sm text-white/75 leading-relaxed">{chunk.text}</p>
                </div>
              ))}

              {/* Typing indicator */}
              {phase === "writing" && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                  <span className="text-xs text-white/30">Writing…</span>
                </div>
              )}

              {/* Done state */}
              {phase === "done" && (
                <div className="mt-6 pt-5 border-t border-white/8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-black text-[10px] font-bold">✓</span>
                    </div>
                    <span className="text-sm font-medium text-green-400">Research complete</span>
                    <span className="text-xs text-white/30">· {formatTime(elapsed)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-1.5 text-xs bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors">
                      <span>⬇</span> Export PDF
                    </button>
                    <button className="flex items-center gap-1.5 text-xs bg-white/8 text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/12 transition-colors border border-white/10">
                      <span>📋</span> Copy report
                    </button>
                    <button className="flex items-center gap-1.5 text-xs bg-white/8 text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/12 transition-colors border border-white/10">
                      <span>💬</span> Ask follow-up
                    </button>
                    <button className="flex items-center gap-1.5 text-xs bg-white/8 text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/12 transition-colors border border-white/10">
                      <span>🔍</span> Find research gaps
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
