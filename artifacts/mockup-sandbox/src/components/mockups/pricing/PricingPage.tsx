import { useState } from "react";

const CheckIcon = ({ color = "text-green-500" }: { color?: string }) => (
  <svg className={`w-4 h-4 shrink-0 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ZapIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

type Plan = "free" | "plus" | "pro";

const features: {
  label: string;
  category?: string;
  free: string | boolean | null;
  plus: string | boolean | null;
  pro: string | boolean | null;
}[] = [
  { label: "Messages per day", free: "10 / day", plus: "100 / day", pro: "300 / day" },
  { label: "Fast Mode (Gemini Flash)", free: true, plus: true, pro: true },
  { label: "DeepThink Mode", free: null, plus: null, pro: true },
  { label: "Research Mode", free: null, plus: true, pro: true },
  { label: "Web Search", free: null, plus: true, pro: true },
  { label: "Voice Input", free: true, plus: true, pro: true },
  { label: "Text-to-Speech", free: null, plus: true, pro: true },
  { label: "PDF & File Uploads", free: null, plus: "10 / month", pro: "Unlimited" },
  { label: "Export (PDF & Word)", free: null, plus: true, pro: true },
  { label: "Export (PowerPoint)", free: null, plus: null, pro: true },
  { label: "AI Memory", free: null, plus: true, pro: true },
  { label: "Quick Study Circle – Full Guide", free: null, plus: true, pro: true },
  { label: "Quick Study Circle – Advanced Only", free: null, plus: null, pro: true },
  { label: "Quiz Me", free: null, plus: true, pro: true },
  { label: "Flashcards", free: null, plus: null, pro: true },
  { label: "Radio Mode", free: null, plus: null, pro: true },
  { label: "Mindmaps & Flowcharts", free: null, plus: true, pro: true },
  { label: "All 8 Citation Formats", free: null, plus: true, pro: true },
  { label: "Find Research Gaps", free: null, plus: true, pro: true },
  { label: "Image Generation", free: null, plus: "25 / month", pro: "100 / month" },
  { label: "Video Generation", free: null, plus: "5 / month", pro: "25 / month" },
  { label: "Priority Response Speed", free: null, plus: null, pro: true },
  { label: "Early Access to New Features", free: null, plus: null, pro: true },
];

const competitors = [
  { name: "ChatGPT Plus", logo: "🤖", price: "₹1,650/mo", highlight: false },
  { name: "Claude Pro", logo: "🔮", price: "₹1,700/mo", highlight: false },
  { name: "Gemini Advanced", logo: "💎", price: "₹1,950/mo", highlight: false },
  { name: "Dynamo AI Pro", logo: "⚡", price: "₹999/mo", highlight: true },
];

function CellValue({ value }: { value: string | boolean | null }) {
  if (value === null) return <XIcon />;
  if (value === true) return <CheckIcon />;
  return <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">{value}</span>;
}

export default function PricingPage() {
  const [dark, setDark] = useState(false);
  const [annual, setAnnual] = useState(false);

  const plusPrice = annual ? "₹319" : "₹399";
  const proPrice = annual ? "₹799" : "₹999";
  const plusPeriod = annual ? "/mo · billed ₹3,829/yr" : "/mo";
  const proPeriod = annual ? "/mo · billed ₹9,589/yr" : "/mo";

  return (
    <div className={dark ? "dark" : ""}>
      <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen font-sans">

        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center shadow-lg">
                  <ZapIcon size={18} />
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Dynamo AI</span>
              </div>
              <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Home</a>
                <a href="#" className="px-3 py-1 bg-yellow-400 text-black rounded-full font-medium text-sm">Pricing</a>
              </nav>
              <div className="flex items-center gap-3">
                <button onClick={() => setDark(!dark)} className="p-2 text-gray-500 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-xs">
                  {dark ? "☀️" : "🌙"}
                </button>
                <button className="text-sm font-medium text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">Log in</button>
                <button className="px-4 py-2 text-sm font-bold bg-black dark:bg-yellow-400 text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-yellow-300 transition shadow-sm">Sign up</button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Hero */}
          <section className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <ZapIcon size={12} />
              Made in India · Built for thinkers
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Plans built for students, researchers<br className="hidden md:block" /> & professionals
            </h1>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base">
              Start free. Upgrade when you're ready for more power.
            </p>

            {/* Annual toggle */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={`text-sm font-medium ${!annual ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-yellow-400" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${annual ? "left-7" : "left-1"}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                Annual <span className="text-green-600 dark:text-green-400 font-bold text-xs ml-1">Save 20%</span>
              </span>
            </div>
          </section>

          {/* Plan Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-10">

            {/* Free */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
              <div className="mb-5">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Free</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">₹0</span>
                  <span className="text-sm text-gray-400 mb-1">/forever</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">No credit card required</div>
              </div>

              {/* Who it's for */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-5">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Who it's for</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Curious users exploring AI for the first time — try it, no commitment.</div>
              </div>

              <ul className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300 flex-1">
                <li className="flex items-center gap-2.5"><CheckIcon /><span><strong className="text-gray-800 dark:text-white">10 messages</strong> / day</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon />Fast Mode (Gemini Flash)</li>
                <li className="flex items-center gap-2.5"><CheckIcon />Basic Voice Input</li>
                <li className="flex items-center gap-2.5 text-gray-400"><XIcon /><span>Research Mode</span></li>
                <li className="flex items-center gap-2.5 text-gray-400"><XIcon /><span>DeepThink</span></li>
                <li className="flex items-center gap-2.5 text-gray-400"><XIcon /><span>File / PDF Uploads</span></li>
                <li className="flex items-center gap-2.5 text-gray-400"><XIcon /><span>Image or Video Generation</span></li>
                <li className="flex items-center gap-2.5 text-gray-400"><XIcon /><span>AI Memory</span></li>
              </ul>

              <div className="mt-6">
                <div className="w-full text-center py-2.5 text-sm font-medium text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl">Current Plan</div>
              </div>
            </div>

            {/* Plus — Featured */}
            <div className="bg-black text-white rounded-2xl shadow-2xl border-2 border-yellow-400 p-6 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide shadow">
                Most Popular
              </div>
              <div className="mb-5">
                <div className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-2">Plus</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold">{plusPrice}</span>
                  <span className="text-sm text-gray-400 mb-1">{plusPeriod}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Full AI suite — no DeepThink</div>
              </div>

              {/* Who it's for */}
              <div className="bg-white/10 rounded-xl p-3 mb-5">
                <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-1">Who it's for</div>
                <div className="text-sm text-gray-200">Students, researchers & lifelong learners who need Research Mode, citations, study tools, and PDF analysis.</div>
              </div>

              <ul className="space-y-2.5 text-sm text-gray-200 flex-1">
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" /><span><strong className="text-white">100 messages</strong> / day</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Fast Mode + Research Mode</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Web Search</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Voice + Text-to-Speech</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />PDF & File Uploads <span className="text-gray-400 text-xs">(10/mo)</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />PDF + Word Export</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />AI Memory</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Quick Study Circle – Full Guide</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Quiz Me + Mindmaps</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />All 8 Citation Formats</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Image Generation <span className="text-gray-400 text-xs">(25/mo)</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-yellow-400" />Video Generation <span className="text-gray-400 text-xs">(5/mo)</span></li>
                <li className="flex items-center gap-2.5 text-gray-500"><XIcon /><span>DeepThink Mode</span></li>
              </ul>

              <div className="mt-6">
                <button className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition active:scale-95 text-sm">
                  Upgrade to Plus
                </button>
                <p className="text-center text-xs text-gray-500 mt-2">Cancel anytime · Instant access</p>
              </div>
            </div>

            {/* Pro */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 dark:bg-purple-900/20 rounded-full -translate-x-4 -translate-y-16 pointer-events-none" />
              <div className="mb-5 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Pro</div>
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">All Features</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{proPrice}</span>
                  <span className="text-sm text-gray-400 mb-1">{proPeriod}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Everything — including DeepThink</div>
              </div>

              {/* Who it's for */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 mb-5 border border-purple-100 dark:border-purple-800">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">Who it's for</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Professionals, power researchers & founders who need DeepThink, advanced study modes, bulk media generation & priority speed.</div>
              </div>

              <ul className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300 flex-1">
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" /><span><strong className="text-gray-800 dark:text-white">300 messages</strong> / day</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" /><span className="font-semibold text-gray-800 dark:text-white">DeepThink Mode</span> <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold ml-1">PRO ONLY</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Fast Mode + Research Mode</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Unlimited PDF & File Uploads</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />PDF + Word + PowerPoint Export</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />AI Memory</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Study Circle – Full Guide + Advanced</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Flashcards + Radio Mode</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Image Generation <span className="text-gray-400 text-xs">(100/mo)</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Video Generation <span className="text-gray-400 text-xs">(25/mo)</span></li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Priority Response Speed</li>
                <li className="flex items-center gap-2.5"><CheckIcon color="text-purple-500" />Early Access to New Features</li>
              </ul>

              <div className="mt-6">
                <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition active:scale-95 text-sm">
                  Upgrade to Pro
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">Cancel anytime · Priority support</p>
              </div>
            </div>

          </section>

          {/* Feature Comparison Table */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-10 overflow-x-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Full feature comparison</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Every feature, clearly compared — no hidden limits.</p>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left border-b-2 border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-gray-500 dark:text-gray-400 font-semibold w-1/2">Feature</th>
                  <th className="pb-3 text-center text-gray-500 dark:text-gray-400 font-semibold">Free</th>
                  <th className="pb-3 text-center text-yellow-600 dark:text-yellow-400 font-bold">Plus ₹399</th>
                  <th className="pb-3 text-center text-purple-600 dark:text-purple-400 font-bold">Pro ₹999</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i} className={`border-t border-gray-50 dark:border-gray-700/60 ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-700/20"}`}>
                    <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{f.label}</td>
                    <td className="py-3 text-center flex justify-center">
                      <CellValue value={f.free} />
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        {f.plus === true ? <CheckIcon color="text-yellow-500" /> : <CellValue value={f.plus} />}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        {f.pro === true ? <CheckIcon color="text-purple-500" /> : <CellValue value={f.pro} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Competitor Comparison */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Why Dynamo AI?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">World-class AI — at a fraction of what global tools charge.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {competitors.map((c) => (
                <div key={c.name} className={`rounded-xl p-4 text-center border-2 transition-all ${c.highlight ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg scale-105" : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"}`}>
                  <div className="text-3xl mb-2">{c.logo}</div>
                  <div className={`font-bold text-sm mb-1 ${c.highlight ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>{c.name}</div>
                  <div className={`font-extrabold text-lg ${c.highlight ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400 line-through text-base"}`}>{c.price}</div>
                  {c.highlight && <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-bold">Save up to 66%</div>}
                  {!c.highlight && <div className="mt-2 text-xs text-red-400 font-medium">1.7–2× more</div>}
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Dynamo AI Pro is <strong className="text-gray-800 dark:text-white">40% cheaper than ChatGPT Plus</strong> — with India-first features no global tool offers.
            </p>
          </section>

          {/* Bottom CTA */}
          <section className="text-center py-10 px-6 bg-black dark:bg-gray-800 rounded-2xl border border-gray-800">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ZapIcon size={24} />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Start free. Upgrade anytime.</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              No commitment. No credit card for Free plan. Cancel Plus or Pro anytime — your data stays safe.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition text-sm">
                Get Plus — ₹399/mo
              </button>
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition text-sm">
                Try Free First
              </button>
            </div>
          </section>

        </main>

        <footer className="mt-10 pb-8 text-center text-xs text-gray-400 dark:text-gray-600">
          Made in India 🇮🇳 · Dynamo AI 2026 · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Privacy</a>
        </footer>

      </div>
    </div>
  );
}
