const PptxGenJS = require("pptxgenjs");

const prs = new PptxGenJS();
prs.layout = "LAYOUT_WIDE"; // 16:9

const BG = "FBF7F0";
const GREEN = "2D4A3E";
const DARK = "1A2C25";
const GOLD = "C49A2A";
const RED = "8B2020";
const LGRAY = "6B7C73";

const W = 13.33; // slide width inches
const H = 7.5;  // slide height inches

function addBorder(slide) {
  slide.addShape(prs.ShapeType.rect, { x: 0.18, y: 0.15, w: W - 0.36, h: H - 0.3, line: { color: GREEN, width: 3 }, fill: { type: "none" }, shadow: { type: "none" } });
  slide.addShape(prs.ShapeType.rect, { x: 0.32, y: 0.27, w: W - 0.64, h: H - 0.54, line: { color: GREEN, width: 0.5, transparency: 60 }, fill: { type: "none" } });
}

function addHeader(slide, rightLabel = "FDP 2026") {
  slide.addText("DYNAMO AI", { x: 0.65, y: 0.45, w: 3, h: 0.28, fontSize: 10, bold: true, color: GREEN, charSpacing: 3 });
  slide.addText("Research Platform", { x: 0.65, y: 0.72, w: 3, h: 0.22, fontSize: 8, color: GREEN, transparency: 30 });
  slide.addText(rightLabel, { x: W - 3.65, y: 0.45, w: 3, h: 0.28, fontSize: 10, bold: true, color: GREEN, align: "right" });
  slide.addText("Faculty Development Programme", { x: W - 3.65, y: 0.72, w: 3, h: 0.22, fontSize: 8, color: GREEN, transparency: 30, align: "right" });
}

function addFooter(slide, slideNum, total) {
  slide.addText("Dynamo AI · Confidential", { x: 0.65, y: H - 0.62, w: 4.5, h: 0.3, fontSize: 14, color: GREEN, transparency: 40 });
  slide.addText(`${String(slideNum).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, { x: W - 2.4, y: H - 0.62, w: 1.8, h: 0.3, fontSize: 14, color: GREEN, transparency: 40, align: "right" });
}

function addTag(slide, text, y = 1.12) {
  slide.addText(text.toUpperCase(), { x: 0.65, y, w: W - 1.3, h: 0.5, fontSize: 34, bold: true, color: GREEN, charSpacing: 1, transparency: 15 });
}

function addH2(slide, text, y = 1.82) {
  slide.addText(text, { x: 0.65, y, w: W - 1.3, h: 0.95, fontSize: 52, bold: true, color: DARK });
}

function addRule(slide, x = 0.65, y = 2.85, w = 1.8) {
  slide.addShape(prs.ShapeType.line, { x, y, w, h: 0, line: { color: GREEN, width: 0.5, transparency: 70 } });
}

const TOTAL = 29;

// ─── SLIDE 1: Title ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s);
  s.addText("FACULTY DEVELOPMENT PROGRAMME · ONE DAY", { x: 1, y: 1.55, w: W - 2, h: 0.5, fontSize: 34, bold: true, color: GREEN, charSpacing: 1, align: "center", transparency: 15 });
  s.addShape(prs.ShapeType.line, { x: 5.2, y: 2.18, w: 3, h: 0, line: { color: GREEN, width: 0.5, transparency: 70 } });
  s.addText("Research in the AI Era", { x: 0.8, y: 2.35, w: W - 1.6, h: 1.05, fontSize: 52, bold: true, color: DARK, align: "center" });
  s.addShape(prs.ShapeType.line, { x: 5.2, y: 3.62, w: 3, h: 0, line: { color: GREEN, width: 0.5, transparency: 70 } });
  s.addText("How faculty can discover, synthesise, and publish research faster using Dynamo AI", { x: 1.5, y: 3.75, w: W - 3, h: 0.55, fontSize: 14, color: GREEN, italic: true, align: "center", transparency: 15 });
  const stats = [["1 Day","Full Programme"], ["2 Parts","Theory + Practical"], ["6 Labs","Hands-On Sessions"]];
  stats.forEach(([v, l], i) => {
    const x = 3.5 + i * 2.2;
    s.addText(v, { x, y: 4.55, w: 1.8, h: 0.45, fontSize: 22, bold: true, color: DARK, align: "center" });
    s.addText(l, { x, y: 5.05, w: 1.8, h: 0.32, fontSize: 12, color: GREEN, transparency: 20, align: "center" });
  });
  addFooter(s, 1, TOTAL);
}

// ─── SLIDE 2: Day at a Glance ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Programme Structure");
  addH2(s, "The Full Day at a Glance"); addRule(s);

  const morning = [["09:00","Opening & Ice-Breaker"],["09:30","The Research Crisis — Pain Points & Data"],["10:30","Research Workflow Design & Prompt Engineering"],["11:15","Literature Review, Gap Analysis & Methodology"],["12:00","Writing, Referencing, Ethics & Integrity Tools"]];
  const afternoon = [["02:00","Platform Tour + Account Setup"],["02:15","Lab 1 — Literature Search & Gap Finding"],["03:15","Lab 2 — Drafting, Detection, Similarity & Humaniser"],["04:00","Lab 3 — Document Library & Memory"],["04:30","Deep Research Agent + Pricing + Q&A + Closing"]];

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 3.0, w: 5.7, h: 3.85, fill: { color: GREEN, transparency: 94 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("MORNING · 9:00 AM – 1:00 PM", { x: 0.85, y: 3.12, w: 5.3, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText("Theory Block", { x: 0.85, y: 3.38, w: 5.3, h: 0.32, fontSize: 16, bold: true, color: DARK });
  morning.forEach(([t, l], i) => {
    s.addText(t, { x: 0.85, y: 3.78 + i * 0.6, w: 0.85, h: 0.32, fontSize: 12, color: GREEN, italic: true, transparency: 30 });
    s.addText(l, { x: 1.72, y: 3.78 + i * 0.6, w: 4.5, h: 0.32, fontSize: 12, color: GREEN });
  });

  s.addShape(prs.ShapeType.rect, { x: 6.75, y: 3.0, w: 5.9, h: 3.85, fill: { color: GOLD, transparency: 94 }, line: { color: GOLD, width: 0.5, transparency: 75 } });
  s.addText("AFTERNOON · 2:00 PM – 5:00 PM", { x: 6.95, y: 3.12, w: 5.5, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText("Practical Block", { x: 6.95, y: 3.38, w: 5.5, h: 0.32, fontSize: 16, bold: true, color: DARK });
  afternoon.forEach(([t, l], i) => {
    s.addText(t, { x: 6.95, y: 3.78 + i * 0.6, w: 0.85, h: 0.32, fontSize: 12, color: GREEN, italic: true, transparency: 30 });
    s.addText(l, { x: 7.82, y: 3.78 + i * 0.6, w: 4.9, h: 0.32, fontSize: 12, color: GREEN });
  });
  addFooter(s, 2, TOTAL);
}

// ─── SLIDE 3: Section Divider — Part I ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s);
  s.addText("Part I", { x: 1, y: 1.6, w: W - 2, h: 1.0, fontSize: 52, bold: true, color: GOLD, italic: true, align: "center", transparency: 30 });
  addRule(s, 5.5, 2.75, 2.3);
  s.addText("Morning Theory Block", { x: 1, y: 2.9, w: W - 2, h: 0.65, fontSize: 34, bold: true, color: DARK, align: "center" });
  addRule(s, 5.5, 3.72, 2.3);
  s.addText("Building the foundation — why traditional research methods are no longer enough,\nand what the AI era demands of modern faculty", { x: 2, y: 3.9, w: W - 4, h: 0.85, fontSize: 14, color: GREEN, italic: true, align: "center", transparency: 15 });
  addFooter(s, 3, TOTAL);
}

// ─── SLIDE 4: The Research Crisis ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 1 · 9:30 AM");
  addH2(s, "The Research Crisis"); addRule(s);

  const pts = [["01.","50M+ papers on Google Scholar","Manual literature review is practically impossible at this volume."],["02.","3 biggest time-wasters","Literature search · Synthesis · Citation verification — AI removes all three."],["03.","Most faculty use AI wrong","Using ChatGPT for paraphrasing only — that's a scooter on a highway."]];
  pts.forEach(([n, title, body], i) => {
    const y = 3.05 + i * 1.15;
    s.addText(n, { x: 0.65, y, w: 0.5, h: 0.35, fontSize: 16, bold: true, color: GOLD, italic: true });
    s.addText(title, { x: 1.18, y, w: 4.9, h: 0.3, fontSize: 14, bold: true, color: DARK });
    s.addText(body, { x: 1.18, y: y + 0.36, w: 4.9, h: 0.6, fontSize: 14, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.line, { x: 6.4, y: 3.0, w: 0, h: 3.75, line: { color: GREEN, width: 0.5, transparency: 80 } });
  s.addText("ASK THE ROOM", { x: 6.65, y: 3.05, w: 5.9, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addText('"How many hours does one literature review take you today?"', { x: 6.65, y: 3.35, w: 5.9, h: 1.0, fontSize: 18, color: DARK, italic: true });
  s.addShape(prs.ShapeType.rect, { x: 6.65, y: 4.55, w: 5.9, h: 0.75, fill: { color: GREEN, transparency: 93 }, line: { color: GOLD, width: 1, transparency: 0 } });
  s.addText("By 5 PM today, you will do in 10 minutes what used to take 3 days.", { x: 6.85, y: 4.63, w: 5.5, h: 0.55, fontSize: 14, color: GREEN });
  addFooter(s, 4, TOTAL);
}

// ─── SLIDE 5: NAAC & UGC Reality ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 1 · The Institutional Pressure");
  addH2(s, "The NAAC & UGC Reality"); addRule(s);

  const pts = [["Scopus / WoS indexed papers","High weight in API calculation — most colleges are far below target."],["h-Index","Hard to build without a consistent publishing cadence."],["NAAC Grade","Grade A/A+ demands visible publication records."],["UGC CARE List","Only CARE-listed journals count toward it."]];
  pts.forEach(([label, desc], i) => {
    const y = 3.05 + i * 0.9;
    s.addShape(prs.ShapeType.ellipse, { x: 0.65, y: y + 0.1, w: 0.12, h: 0.12, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(label, { x: 0.9, y, w: 3.0, h: 0.3, fontSize: 14, bold: true, color: DARK });
    s.addText(desc, { x: 0.9, y: y + 0.34, w: 5.6, h: 0.45, fontSize: 14, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.4, y: 3.0, w: 5.2, h: 3.75, fill: { color: GOLD, transparency: 93 }, line: { color: GOLD, width: 1.5, transparency: 25 } });
  s.addText("THE OPPORTUNITY", { x: 7.6, y: 3.12, w: 4.8, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText('"AI doesn\'t replace your research.\nIt removes the friction that stops\nyou from doing it."', { x: 7.6, y: 3.4, w: 4.8, h: 1.15, fontSize: 16, color: DARK, italic: true });
  s.addShape(prs.ShapeType.line, { x: 7.6, y: 4.65, w: 4.8, h: 0, line: { color: GOLD, width: 0.5, transparency: 60 } });
  const opps = [["3–5×","Faster search"],["10 min","vs 3-day review"],["2×","More papers"]];
  opps.forEach(([v, l], i) => {
    s.addText(v, { x: 7.7 + i * 1.65, y: 4.82, w: 1.4, h: 0.45, fontSize: 20, bold: true, color: DARK, align: "center" });
    s.addText(l, { x: 7.7 + i * 1.65, y: 5.3, w: 1.4, h: 0.3, fontSize: 11, color: GREEN, transparency: 25, align: "center" });
  });
  addFooter(s, 5, TOTAL);
}

// ─── SLIDE 6: Research Workflow Design ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 2 · 10:30 AM");
  addH2(s, "Research Workflow Design"); addRule(s);

  const steps = [["01","Discover","Find relevant papers fast"],["02","Read","Summarise & extract key ideas"],["03","Synthesise","Connect themes across papers"],["04","Write","Draft assisted, not replaced"],["05","Verify","AI & plagiarism checks"]];
  steps.forEach(({ 0: n, 1: label, 2: sub }, i) => {
    const x = 0.65 + i * 2.5;
    s.addShape(prs.ShapeType.line, { x, y: 3.0, w: 2.3, h: 0, line: { color: GREEN, width: 2 } });
    s.addText(n, { x, y: 3.12, w: 2.3, h: 0.3, fontSize: 13, bold: true, color: GOLD, italic: true, align: "center" });
    s.addText(label, { x, y: 3.46, w: 2.3, h: 0.3, fontSize: 14, bold: true, color: DARK, align: "center" });
    s.addText(sub, { x, y: 3.82, w: 2.3, h: 0.55, fontSize: 11, color: GREEN, transparency: 20, align: "center" });
  });

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 4.65, w: 5.8, h: 1.35, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("ACADEMIC INTEGRITY", { x: 0.85, y: 4.78, w: 5.4, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addText("AI supports each stage — but never replaces your scholarly judgement, critical analysis, or original contribution.", { x: 0.85, y: 5.05, w: 5.4, h: 0.85, fontSize: 14, color: GREEN, transparency: 15 });

  s.addShape(prs.ShapeType.rect, { x: 6.85, y: 4.65, w: 5.8, h: 1.35, fill: { color: GOLD, transparency: 94 }, line: { color: GOLD, width: 0.5, transparency: 80 } });
  s.addText("PROMPT ENGINEERING", { x: 7.05, y: 4.78, w: 5.4, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText("Research-grade prompts are specific, scoped, and directive — not open-ended chat queries.", { x: 7.05, y: 5.05, w: 5.4, h: 0.85, fontSize: 14, color: GREEN, transparency: 15 });
  addFooter(s, 6, TOTAL);
}

// ─── SLIDE 7: Good vs Bad Prompt ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 2 · Prompt Engineering");
  addH2(s, "The Power of One Prompt"); addRule(s);

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 3.0, w: 5.6, h: 3.8, fill: { color: RED, transparency: 96 }, line: { color: RED, width: 0.5, transparency: 70 } });
  s.addText("WEAK PROMPT", { x: 0.85, y: 3.15, w: 5.2, h: 0.22, fontSize: 9, bold: true, color: RED, charSpacing: 1.5 });
  s.addText('"Explain machine learning"', { x: 0.85, y: 3.45, w: 5.2, h: 0.6, fontSize: 20, color: DARK, italic: true });
  s.addText("Generic. Returns textbook content. No research value.", { x: 0.85, y: 4.15, w: 5.2, h: 0.6, fontSize: 14, color: GREEN, transparency: 20 });

  s.addText("→", { x: 6.35, y: 3.8, w: 0.5, h: 0.5, fontSize: 22, color: GREEN, transparency: 70, align: "center" });

  s.addShape(prs.ShapeType.rect, { x: 6.9, y: 3.0, w: 5.75, h: 3.8, fill: { color: GOLD, transparency: 94 }, line: { color: GOLD, width: 2 } });
  s.addText("RESEARCH-GRADE PROMPT", { x: 7.1, y: 3.15, w: 5.35, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText('"Summarise 3 years of research on federated learning in healthcare, identify gaps, and suggest new angles"', { x: 7.1, y: 3.45, w: 5.35, h: 1.15, fontSize: 15, color: DARK, italic: true });
  s.addText("Scoped. Time-bounded. Action-oriented. Returns publishable insight.", { x: 7.1, y: 4.7, w: 5.35, h: 0.7, fontSize: 14, color: GREEN, transparency: 20 });
  addFooter(s, 7, TOTAL);
}

// ─── SLIDE 8: Which Mode for Which Task ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 2 · Choosing the Right Mode");
  addH2(s, "Which Mode for Which Task?"); addRule(s);

  const modes = [
    [GREEN, "Fast Mode", "Default", "Quick explanations · Drafting help · Domain questions", '"Explain qualitative vs. quantitative research design"'],
    [GOLD, "Research Mode", "Best for Papers", "Literature search · Multi-source synthesis · Citations", '"Find papers on blockchain in supply chain (2022–25), identify gaps"'],
    [LGRAY, "DeepThink", "Complex Problems", "Methodology critique · Structured reasoning", '"Critically evaluate mixed-methods design in education research"'],
    [DARK, "Deep Research Agent", "Autonomous", "Browses, reads & synthesises independently", '"Comprehensive review of AI in rural healthcare in India"'],
  ];
  modes.forEach(([color, mode, badge, when, example], i) => {
    const y = 3.05 + i * 0.95;
    s.addShape(prs.ShapeType.line, { x: 0.65, y, w: 0, h: 0.75, line: { color, width: 3 } });
    s.addText(mode, { x: 0.95, y: y + 0.03, w: 2.3, h: 0.3, fontSize: 14, bold: true, color: DARK });
    s.addText(badge.toUpperCase(), { x: 0.95, y: y + 0.4, w: 2.3, h: 0.22, fontSize: 9, bold: true, color, charSpacing: 1 });
    s.addText(when, { x: 3.45, y: y + 0.05, w: 4.2, h: 0.75, fontSize: 12, color: GREEN, transparency: 15 });
    s.addText(example, { x: 7.85, y: y + 0.05, w: 4.8, h: 0.75, fontSize: 12, color: DARK, italic: true, transparency: 25 });
  });
  addFooter(s, 8, TOTAL);
}

// ─── SLIDE 9: Literature Review Reimagined ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 3 · 11:15 AM");
  addH2(s, "The New Literature Review"); addRule(s);

  const old = ["Search Google Scholar manually — days","Read 30 abstracts to find 5 relevant papers","Build a synthesis table by hand","Miss key papers from adjacent fields"];
  const ai = ["Research Mode retrieves and ranks in seconds","Synthesises 20 papers into one summary","Finds research gaps automatically","Exports a full literature review draft"];

  s.addText("TRADITIONAL METHOD", { x: 0.65, y: 3.0, w: 5.4, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  old.forEach((item, i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 0.65, y: 3.42 + i * 0.68, w: 0.1, h: 0.1, fill: { color: RED, transparency: 60 }, line: { type: "none" } });
    s.addText(item, { x: 0.9, y: 3.34 + i * 0.68, w: 5.3, h: 0.5, fontSize: 14, color: GREEN, transparency: 20 });
  });

  s.addShape(prs.ShapeType.line, { x: 6.55, y: 3.0, w: 0, h: 3.7, line: { color: GREEN, width: 0.5, transparency: 85 } });

  s.addText("WITH DYNAMO AI", { x: 6.75, y: 3.0, w: 5.9, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  ai.forEach((item, i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 6.75, y: 3.42 + i * 0.68, w: 0.1, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(item, { x: 7.0, y: 3.34 + i * 0.68, w: 5.6, h: 0.5, fontSize: 14, color: GREEN });
  });
  s.addShape(prs.ShapeType.rect, { x: 6.75, y: 6.15, w: 5.85, h: 0.5, fill: { color: GOLD, transparency: 92 }, line: { color: GOLD, width: 1, transparency: 0 } });
  s.addText("Live demo during this session — bring your own research topic.", { x: 6.95, y: 6.22, w: 5.45, h: 0.38, fontSize: 12, bold: true, color: DARK });
  addFooter(s, 9, TOTAL);
}

// ─── SLIDE 10: Research Gap Analysis ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 3 · Gap Analysis Method");
  addH2(s, "Research Gap Analysis"); addRule(s);

  const gaps = [["Empirical Gap","Exists in theory but untested in a specific region, population, or sector."],["Methodological Gap","Studies exist but used weak or biased methods."],["Theoretical Gap","Competing frameworks contradict each other, unresolved."],["Temporal Gap","Studies are 5+ years old — the context has since changed."]];

  gaps.forEach(([type, desc], i) => {
    const y = 3.05 + i * 0.88;
    s.addText(type.toUpperCase(), { x: 0.65, y, w: 2.0, h: 0.5, fontSize: 12, bold: true, color: GOLD, charSpacing: 1 });
    s.addText(desc, { x: 2.75, y: y - 0.02, w: 4.5, h: 0.7, fontSize: 14, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.65, y: 3.0, w: 5.0, h: 3.75, fill: { color: GOLD, transparency: 93 }, line: { color: GOLD, width: 1.5, transparency: 25 } });
  s.addText("DYNAMO AI PROMPT", { x: 7.85, y: 3.12, w: 4.6, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText('"Based on current literature on [topic], identify 3–5 research gaps. Classify each by gap type and explain why it matters."', { x: 7.85, y: 3.42, w: 4.6, h: 1.35, fontSize: 13, color: DARK, italic: true });
  s.addShape(prs.ShapeType.line, { x: 7.85, y: 4.85, w: 4.4, h: 0, line: { color: GOLD, width: 0.5, transparency: 60 } });
  s.addText("Output includes gap type, why it matters, and recent sources.", { x: 7.85, y: 4.97, w: 4.6, h: 0.65, fontSize: 14, color: GREEN, transparency: 15 });
  addFooter(s, 10, TOTAL);
}

// ─── SLIDE 11 (NEW): Research Analysis, Methodology & Model Development ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 3 · Before You Write");
  addH2(s, "Analysis & Methodology"); addRule(s);

  const steps = [
    ["01","Frame the Question","Turn a vague interest into a precise, testable question."],
    ["02","Choose the Methodology","Use DeepThink to compare qualitative, quantitative & mixed designs."],
    ["03","Design & Test the Model","Upload a dataset to Data Analysis for stats and flagged patterns."],
  ];
  steps.forEach(([n, title, body], i) => {
    const y = 3.02 + i * 1.15;
    s.addText(n, { x: 0.65, y, w: 0.5, h: 0.35, fontSize: 15, bold: true, color: GOLD, italic: true });
    s.addText(title, { x: 1.18, y, w: 5.5, h: 0.3, fontSize: 14, bold: true, color: DARK });
    s.addText(body, { x: 1.18, y: y + 0.35, w: 5.5, h: 0.7, fontSize: 14, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.15, y: 3.0, w: 5.5, h: 1.85, fill: { color: GOLD, transparency: 93 }, line: { color: GOLD, width: 1.5, transparency: 25 } });
  s.addText("DEEPTHINK PROMPT", { x: 7.35, y: 3.1, w: 5.1, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText('"Critique whether a mixed-methods design fits microfinance\'s impact on rural women entrepreneurs, and suggest a sample size."', { x: 7.35, y: 3.38, w: 5.1, h: 1.35, fontSize: 12.5, color: DARK, italic: true });

  s.addShape(prs.ShapeType.rect, { x: 7.15, y: 5.0, w: 5.5, h: 1.7, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("DATA ANALYSIS · PRO", { x: 7.35, y: 5.12, w: 5.1, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addText("Upload a CSV or Excel dataset — get descriptive stats, correlations and outliers instantly.", { x: 7.35, y: 5.4, w: 5.1, h: 1.15, fontSize: 14, color: GREEN, transparency: 10 });
  addFooter(s, 11, TOTAL);
}

// ─── SLIDE 12: Writing, Citing & Publishing ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 4 · 12:00 PM");
  addH2(s, "Write, Cite, Publish"); addRule(s);

  const cards = [["01","Abstract & Introduction","AI drafts a first pass — you refine with domain expertise and voice."],["02","AI Plagiarism Detection","Check your draft before submission for similarity and overlap."],["03","Citation Management","Automatically verify and format citations from your session."],["04","Reviewer Responses","Structure responses to peer reviewer comments faster."]];
  cards.forEach(([n, title, body], i) => {
    const x = 0.65 + i * 3.17;
    s.addShape(prs.ShapeType.line, { x, y: 3.02, w: 2.95, h: 0, line: { color: GREEN, width: 2 } });
    s.addText(n, { x, y: 3.15, w: 2.95, h: 0.3, fontSize: 14, bold: true, color: GOLD, italic: true });
    s.addText(title, { x, y: 3.5, w: 2.95, h: 0.5, fontSize: 14, bold: true, color: DARK });
    s.addText(body, { x, y: 4.05, w: 2.95, h: 1.1, fontSize: 13, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 5.9, w: 12.0, h: 0.75, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("UGC / NAAC NOTE", { x: 0.85, y: 6.0, w: 1.9, h: 0.5, fontSize: 11, bold: true, color: GREEN, charSpacing: 1, transparency: 25 });
  s.addText("AI assistance for research is fully compliant when properly disclosed. Integrity guidelines are covered next.", { x: 2.85, y: 5.98, w: 9.6, h: 0.6, fontSize: 13, color: GREEN, transparency: 15 });
  addFooter(s, 12, TOTAL);
}

// ─── SLIDE 13 (NEW): Referencing & Citation Engine ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 4 · Referencing Done Right");
  addH2(s, "The Citation Engine"); addRule(s);

  s.addText("Wrong or fabricated references are one of the fastest ways to lose a reviewer's trust. Citation Checker verifies every reference against the real source.", { x: 0.65, y: 3.0, w: 5.9, h: 0.85, fontSize: 14, color: GREEN, transparency: 10 });

  const formats = ["APA 7th","MLA 9th","Chicago 17th","Harvard","IEEE","Vancouver","ACS","ASA"];
  s.addText("8 SUPPORTED FORMATS", { x: 0.65, y: 3.95, w: 5.9, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  formats.forEach((f, i) => {
    const x = 0.65 + (i % 4) * 1.48;
    const y = 4.25 + Math.floor(i / 4) * 0.55;
    s.addShape(prs.ShapeType.rect, { x, y, w: 1.4, h: 0.45, fill: { color: GOLD, transparency: 92 }, line: { color: GOLD, width: 1 } });
    s.addText(f, { x, y: y + 0.08, w: 1.4, h: 0.28, fontSize: 10.5, bold: true, color: DARK, align: "center" });
  });

  s.addText("Format instantly, on request, in any of the eight — no manual reformatting.", { x: 0.65, y: 5.45, w: 5.9, h: 0.55, fontSize: 13, color: GREEN, transparency: 15 });

  s.addShape(prs.ShapeType.rect, { x: 7.0, y: 3.0, w: 5.65, h: 3.7, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("WHAT IT CATCHES", { x: 7.2, y: 3.12, w: 5.25, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  const checks = ["Fabricated or hallucinated references","Author, title, or year mismatches","Missing DOI or incomplete metadata","Incorrect bibliography formatting"];
  checks.forEach((c, i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 7.2, y: 3.56 + i * 0.62, w: 0.1, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(c, { x: 7.45, y: 3.48 + i * 0.62, w: 5.0, h: 0.5, fontSize: 13, color: GREEN, transparency: 10 });
  });
  s.addShape(prs.ShapeType.rect, { x: 7.2, y: 6.15, w: 5.25, h: 0.42, fill: { color: GOLD, transparency: 90 }, line: { color: GOLD, width: 1 } });
  s.addText("Plus & Pro feature — used in Lab 2 this afternoon.", { x: 7.4, y: 6.2, w: 4.85, h: 0.32, fontSize: 11, bold: true, color: DARK });
  addFooter(s, 13, TOTAL);
}

// ─── SLIDE 14: AI Ethics & Academic Integrity ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 4 · AI Ethics & Integrity");
  addH2(s, "AI Ethics & Integrity"); addRule(s);

  const permitted = ["Using AI to search, summarise, and synthesise literature","AI-assisted drafting of abstracts and discussion sections","Checking your own writing for plagiarism before submission"];
  const notPermitted = ["Submitting AI-generated text verbatim as original research","Citing papers you have not read and verified","Using AI to fabricate data, results, or findings"];

  s.addText("WHAT IS PERMITTED", { x: 0.65, y: 3.0, w: 5.6, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  permitted.forEach((item, i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 0.65, y: 3.46 + i * 0.75, w: 0.1, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(item, { x: 0.9, y: 3.38 + i * 0.75, w: 5.3, h: 0.6, fontSize: 14, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.line, { x: 6.6, y: 3.0, w: 0, h: 3.7, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("WHAT IS NOT", { x: 6.8, y: 3.0, w: 5.85, h: 0.22, fontSize: 9, bold: true, color: RED, charSpacing: 1.5, transparency: 15 });
  notPermitted.forEach((item, i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 6.8, y: 3.46 + i * 0.75, w: 0.1, h: 0.1, fill: { color: RED, transparency: 50 }, line: { type: "none" } });
    s.addText(item, { x: 7.05, y: 3.38 + i * 0.75, w: 5.5, h: 0.6, fontSize: 14, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 6.8, y: 5.95, w: 5.85, h: 0.7, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 1.5 } });
  s.addText("Disclosure practice: \"AI tools were used for literature synthesis and draft assistance. All analysis and conclusions are the authors' own.\"", { x: 7.0, y: 6.02, w: 5.45, h: 0.58, fontSize: 11, color: GREEN, transparency: 10 });
  addFooter(s, 14, TOTAL);
}

// ─── SLIDE 15 (NEW): Plagiarism, Similarity Check & Humaniser ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 4 · Integrity Verification Tools");
  addH2(s, "Plagiarism & Humaniser"); addRule(s);

  const cards = [
    ["01","AI Text Detector","Get an AI-probability score and the writing patterns that triggered it."],
    ["02","Similarity Check","Scans the web and 200M+ papers. Returns a true similarity score, 0–100%."],
    ["03","Humaniser","Rewrites flagged text in a natural voice — then re-check to confirm the score dropped."],
  ];
  cards.forEach(([n, title, body], i) => {
    const x = 0.65 + i * 4.22;
    s.addShape(prs.ShapeType.rect, { x, y: 3.0, w: 4.0, h: 3.1, fill: { color: "FFFFFF", transparency: 100 }, line: { color: GREEN, width: 0.5, transparency: 80 } });
    s.addShape(prs.ShapeType.line, { x, y: 3.0, w: 4.0, h: 0, line: { color: GOLD, width: 3 } });
    s.addText(n, { x: x + 0.2, y: 3.14, w: 3.6, h: 0.4, fontSize: 20, bold: true, color: GOLD, italic: true, transparency: 20 });
    s.addText(title, { x: x + 0.2, y: 3.56, w: 3.6, h: 0.4, fontSize: 15, bold: true, color: DARK });
    s.addText(body, { x: x + 0.2, y: 4.0, w: 3.6, h: 1.9, fontSize: 13, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 6.28, w: 12.03, h: 0.5, fill: { color: GOLD, transparency: 93 }, line: { color: GOLD, width: 1 } });
  s.addText("Workflow: Detect → Check → Humanise → Re-check. Pro-only, demonstrated in Lab 2.", { x: 0.85, y: 6.33, w: 11.6, h: 0.4, fontSize: 12, color: GREEN, transparency: 10 });
  addFooter(s, 15, TOTAL);
}

// ─── SLIDE 16: The Publication Pipeline ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Session 4 · Choosing the Right Journal");
  addH2(s, "The Publication Pipeline"); addRule(s);

  const tiers = [[GOLD,"Tier 1","Scopus / Web of Science","High API weight","Q1 & Q2 journals. Indexed, peer-reviewed. Required for promotions."],[GREEN,"Tier 2","UGC CARE List","API eligible","UGC-approved journals for Indian faculty — Group I & II."],[LGRAY,"Tier 3","Conference Proceedings","Supplementary","IEEE, ACM, Springer — good for emerging work."]];
  tiers.forEach(([color, tier, index, badge, desc], i) => {
    const x = 0.65 + i * 4.2;
    s.addShape(prs.ShapeType.rect, { x, y: 3.0, w: 4.0, h: 3.2, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 0.5, transparency: 85 } });
    s.addShape(prs.ShapeType.line, { x, y: 3.0, w: 4.0, h: 0, line: { color, width: 3 } });
    s.addText(tier.toUpperCase(), { x: x + 0.15, y: 3.13, w: 3.7, h: 0.22, fontSize: 9, bold: true, color, charSpacing: 1.5 });
    s.addText(index, { x: x + 0.15, y: 3.4, w: 3.7, h: 0.5, fontSize: 16, bold: true, color: DARK });
    s.addText(badge.toUpperCase(), { x: x + 0.15, y: 3.95, w: 3.7, h: 0.22, fontSize: 9, bold: true, color, charSpacing: 1 });
    s.addText(desc, { x: x + 0.15, y: 4.25, w: 3.7, h: 1.0, fontSize: 12.5, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 6.4, w: 12.0, h: 0.75, fill: { color: GOLD, transparency: 93 }, line: { color: GOLD, width: 1, transparency: 0 } });
  s.addText("Tip: Ask 'Find Scopus-indexed journals in [field] that accept [topic]. List impact factor, fee, turnaround.' Research Mode does this in 30 seconds.", { x: 0.85, y: 6.47, w: 11.6, h: 0.6, fontSize: 11, color: GREEN, transparency: 10 });
  addFooter(s, 16, TOTAL);
}

// ─── SLIDE 17: Section Divider — Part II ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s);
  s.addText("Part II", { x: 1, y: 1.6, w: W - 2, h: 1.0, fontSize: 52, bold: true, color: GOLD, italic: true, align: "center", transparency: 30 });
  addRule(s, 5.5, 2.75, 2.3);
  s.addText("Afternoon Practical Block", { x: 1, y: 2.9, w: W - 2, h: 0.65, fontSize: 34, bold: true, color: DARK, align: "center" });
  addRule(s, 5.5, 3.72, 2.3);
  s.addText("Hands-on training directly in Dynamo AI — every faculty member\nworks on their own research domain in real time", { x: 2, y: 3.9, w: W - 4, h: 0.85, fontSize: 14, color: GREEN, italic: true, align: "center", transparency: 15 });
  addFooter(s, 17, TOTAL);
}

// ─── SLIDE 18: What the Practical Block Looks Like ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "2:00 PM · Setting Expectations");
  addH2(s, "The Practical Block"); addRule(s);

  const schedule = [["2:00 PM","Platform Tour","Everyone creates their account; we run the first query together."],["2:15 PM","Lab 1 — Literature Search","Run a full literature search and gap analysis on your topic."],["3:15 PM","Lab 2 — Writing & Detection","Draft an abstract, then run detector, similarity and humaniser."],["4:00 PM","Lab 3 — Document Library","Upload a PDF, query it, and save it to memory."]];
  schedule.forEach(([time, title, desc], i) => {
    const y = 3.05 + i * 0.92;
    s.addText(time, { x: 0.65, y, w: 1.0, h: 0.3, fontSize: 12, color: GOLD, italic: true, transparency: 15 });
    s.addText(title, { x: 1.72, y, w: 5.0, h: 0.3, fontSize: 14, bold: true, color: DARK });
    s.addText(desc, { x: 1.72, y: y + 0.36, w: 5.0, h: 0.5, fontSize: 13, color: GREEN, transparency: 20 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.6, y: 3.0, w: 5.05, h: 3.85, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("GROUND RULES", { x: 7.8, y: 3.12, w: 4.65, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  const rules = ["Everyone uses their own laptop / phone","Pick a real topic from your own research domain","There are no wrong questions here"];
  rules.forEach((r, i) => {
    s.addText(`${i+1}.`, { x: 7.8, y: 3.5 + i * 0.95, w: 0.35, h: 0.3, fontSize: 14, bold: true, color: GOLD, italic: true });
    s.addText(r, { x: 8.2, y: 3.5 + i * 0.95, w: 4.3, h: 0.7, fontSize: 13, color: GREEN });
  });
  addFooter(s, 18, TOTAL);
}

// ─── SLIDE 19: Introducing Dynamo AI ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "2:00 PM · Platform Walkthrough");
  addH2(s, "Introducing Dynamo AI"); addRule(s);

  s.addText("A Research Operating System — not a chatbot. Built for deep, multi-source academic work.", { x: 0.65, y: 3.0, w: 5.6, h: 0.7, fontSize: 14, color: GREEN, transparency: 10 });
  const features = ["Fast Mode — instant answers on any topic","Research Mode — multi-source synthesis","DeepThink — structured reasoning","Deep Research Agent — autonomous mining"];
  features.forEach((item, i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 0.65, y: 3.85 + i * 0.62, w: 0.1, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(item, { x: 0.9, y: 3.78 + i * 0.62, w: 5.3, h: 0.5, fontSize: 13, color: GREEN, transparency: 10 });
  });

  s.addShape(prs.ShapeType.line, { x: 6.65, y: 3.0, w: 0, h: 3.7, line: { color: GREEN, width: 0.5, transparency: 80 } });
  s.addText("FIRST 15 MINUTES", { x: 6.85, y: 3.0, w: 5.8, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  const steps = [["01","Platform tour — interface overview"],["02","Create your account"],["03","Run your first Research Mode query"],["04","Understand the difference between modes"]];
  steps.forEach(([n, t], i) => {
    s.addShape(prs.ShapeType.rect, { x: 6.85, y: 3.32 + i * 0.85, w: 5.8, h: 0.7, fill: { color: GREEN, transparency: 96 }, line: { type: "none" } });
    s.addText(n, { x: 7.05, y: 3.4 + i * 0.85, w: 0.5, h: 0.45, fontSize: 13, bold: true, color: GOLD, italic: true });
    s.addText(t, { x: 7.65, y: 3.4 + i * 0.85, w: 4.9, h: 0.5, fontSize: 13, color: GREEN });
  });
  addFooter(s, 19, TOTAL);
}

// ─── SLIDE 20: Lab 1 ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Lab 1 · 2:15 PM – 3:00 PM");
  addH2(s, "Literature Search & Gaps"); addRule(s);

  s.addText("Each participant picks their own research domain and completes three tasks:", { x: 0.65, y: 3.0, w: 6.0, h: 0.5, fontSize: 14, color: GREEN, transparency: 10 });
  const steps = [["Step 1","Run a Research Mode query on your topic"],["Step 2","Use Find Research Gaps on the result"],["Step 3","Generate a structured summary of key papers"]];
  steps.forEach(([label, desc], i) => {
    s.addShape(prs.ShapeType.rect, { x: 0.65, y: 3.65 + i * 1.05, w: 6.0, h: 0.85, fill: { color: GOLD, transparency: 95 }, line: { color: GOLD, width: 2 } });
    s.addShape(prs.ShapeType.line, { x: 0.65, y: 3.65 + i * 1.05, w: 0, h: 0.85, line: { color: GOLD, width: 3 } });
    s.addText(label, { x: 0.88, y: 3.72 + i * 1.05, w: 1.5, h: 0.3, fontSize: 13, bold: true, color: DARK });
    s.addText(desc, { x: 0.88, y: 4.05 + i * 1.05, w: 5.5, h: 0.4, fontSize: 13, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.1, y: 3.0, w: 5.55, h: 3.75, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("FACILITATOR NOTE", { x: 7.3, y: 3.12, w: 5.15, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addText('"Walk around. Help one-on-one.\nThe sale happens right here."', { x: 7.3, y: 3.42, w: 5.15, h: 0.9, fontSize: 17, color: DARK, italic: true });
  s.addText("When someone gets a great result in 3 minutes, they are already convinced. Ask them to share their screen.", { x: 7.3, y: 4.4, w: 5.15, h: 1.0, fontSize: 13, color: GREEN, transparency: 15 });
  addFooter(s, 20, TOTAL);
}

// ─── SLIDE 21: Lab 1 Output Example ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Lab 1 · What Great Output Looks Like");
  addH2(s, "A Real Gap Finding"); addRule(s);

  s.addText("THE PROMPT SENT", { x: 0.65, y: 3.0, w: 5.3, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 3.24, w: 5.3, h: 1.15, fill: { color: GREEN, transparency: 94 }, line: { color: GREEN, width: 0.5, transparency: 80 } });
  s.addText('"Based on literature on AI in rural healthcare in India, identify 3 research gaps and an angle for each."', { x: 0.85, y: 3.33, w: 4.9, h: 0.95, fontSize: 13, color: DARK, italic: true });
  s.addText("Sent in Research Mode. Returned in ~12 seconds with 8 citations.", { x: 0.65, y: 4.55, w: 5.3, h: 0.5, fontSize: 12, color: GREEN, transparency: 25 });

  const gaps = [["Gap 1","Empirical — Last-mile Connectivity","Rural telemedicine in Bihar/Odisha is unstudied. Angle: ASHA-worker-assisted AI triage in 5 PHCs."],["Gap 2","Methodological — Language Bias","NLP tools trained mostly on English/Hindi. Angle: bias audit across 6 regional languages."],["Gap 3","Temporal — Post-COVID Infrastructure","Most cited studies are 2019–21; a 2024+ reassessment is overdue."]];
  gaps.forEach(([n, title, body], i) => {
    const y = 3.0 + i * 1.22;
    s.addShape(prs.ShapeType.rect, { x: 6.35, y, w: 6.3, h: 1.1, fill: { color: GOLD, transparency: 96 }, line: { color: GOLD, width: 2 } });
    s.addShape(prs.ShapeType.line, { x: 6.35, y, w: 0, h: 1.1, line: { color: GOLD, width: 3 } });
    s.addText(n.toUpperCase(), { x: 6.55, y: y + 0.06, w: 6.0, h: 0.22, fontSize: 8, bold: true, color: GOLD, charSpacing: 1.5 });
    s.addText(title, { x: 6.55, y: y + 0.28, w: 6.0, h: 0.28, fontSize: 12.5, bold: true, color: DARK });
    s.addText(body, { x: 6.55, y: y + 0.58, w: 5.9, h: 0.5, fontSize: 11.5, color: GREEN, transparency: 15 });
  });
  addFooter(s, 21, TOTAL);
}

// ─── SLIDE 22: Lab 2 ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Lab 2 · 3:15 PM – 4:00 PM");
  addH2(s, "Draft, Detect, Verify"); addRule(s);

  const cards = [["01","Draft an Abstract","Research Writing","Draft an abstract for your own idea, then refine with your expertise."],["02","AI Detector + Similarity","Originality","See the AI probability score, then check similarity against sources."],["03","Humanise & Re-check","Verification","Run flagged sections through Humaniser, then re-check the score."],["04","Export Results","Documentation","Save your summary and download detection reports."]];
  cards.forEach(([n, title, tag, body], i) => {
    const x = 0.65 + i * 3.17;
    s.addShape(prs.ShapeType.rect, { x, y: 3.0, w: 3.05, h: 3.35, fill: { color: "FFFFFF", transparency: 100 }, line: { color: GREEN, width: 0.5, transparency: 80 } });
    s.addShape(prs.ShapeType.line, { x, y: 3.0, w: 3.05, h: 0, line: { color: GREEN, width: 3 } });
    s.addText(tag.toUpperCase(), { x: x + 0.15, y: 3.13, w: 2.75, h: 0.22, fontSize: 8, bold: true, color: GOLD, charSpacing: 1.5 });
    s.addText(`${n}. ${title}`, { x: x + 0.15, y: 3.38, w: 2.85, h: 0.55, fontSize: 13.5, bold: true, color: DARK });
    s.addText(body, { x: x + 0.15, y: 3.98, w: 2.85, h: 1.2, fontSize: 12, color: GREEN, transparency: 15 });
  });
  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 6.5, w: 12.03, h: 0.55, fill: { color: GOLD, transparency: 94 }, line: { color: GOLD, width: 1 } });
  s.addText("Real task, real research — immediate personal value for every participant.", { x: 0.85, y: 6.56, w: 11.6, h: 0.42, fontSize: 12, color: GREEN, transparency: 10 });
  addFooter(s, 22, TOTAL);
}

// ─── SLIDE 23: Deep Research Agent ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Feature Spotlight · The Autonomous Researcher");
  addH2(s, "Deep Research Agent"); addRule(s);

  s.addText("Unlike Research Mode (one query), the Deep Research Agent works independently for minutes — browsing, reading, and synthesising a full report.", { x: 0.65, y: 3.0, w: 6.4, h: 0.75, fontSize: 14, color: GREEN, transparency: 10 });
  const pts = [["01.","Breaks your topic into sub-questions"],["02.","Searches and reads sources autonomously"],["03.","Synthesises findings with citations"],["04.","Delivers a draft literature review in minutes"]];
  pts.forEach(([n, text], i) => {
    s.addText(n, { x: 0.65, y: 3.85 + i * 0.62, w: 0.5, h: 0.4, fontSize: 14, bold: true, color: GOLD, italic: true });
    s.addText(text, { x: 1.18, y: 3.85 + i * 0.62, w: 5.85, h: 0.55, fontSize: 13, color: GREEN, transparency: 10 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.45, y: 3.0, w: 5.2, h: 4.15, fill: { color: GOLD, transparency: 94 }, line: { color: GOLD, width: 2 } });
  s.addText("LIVE DEMO PROMPT", { x: 7.65, y: 3.14, w: 4.8, h: 0.22, fontSize: 9, bold: true, color: GOLD, charSpacing: 1.5 });
  s.addText('"Do a literature review on [your topic]. Include key themes, gaps, and 5 paper suggestions."', { x: 7.65, y: 3.42, w: 4.8, h: 1.15, fontSize: 14, color: DARK, italic: true });
  s.addText("Ask a volunteer to share their screen. Let the agent run.", { x: 7.65, y: 4.62, w: 4.8, h: 0.55, fontSize: 13, color: GREEN, transparency: 15 });
  s.addShape(prs.ShapeType.rect, { x: 7.65, y: 5.28, w: 4.8, h: 0.75, fill: { color: GREEN, transparency: 94 }, line: { color: GREEN, width: 0.5, transparency: 80 } });
  s.addText("AVAILABLE ON", { x: 7.85, y: 5.36, w: 4.4, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addText("Pro plan only · ₹1,799/mo", { x: 7.85, y: 5.6, w: 4.4, h: 0.35, fontSize: 13, bold: true, color: DARK });
  addFooter(s, 23, TOTAL);
}

// ─── SLIDE 24: Lab 3 ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Lab 3 · 4:00 PM – 4:30 PM");
  addH2(s, "Document Library & Memory"); addRule(s);

  const lab3 = [["Upload a PDF","Dynamo AI reads and summarises it instantly."],["Ask questions","Query it directly: findings, methodology, limitations."],["Save to Library","Remembered in every future chat — it gets smarter over time."]];
  lab3.forEach(([title, body], i) => {
    s.addShape(prs.ShapeType.ellipse, { x: 0.65, y: 3.5 + i * 0.9, w: 0.1, h: 0.1, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(title, { x: 0.9, y: 3.42 + i * 0.9, w: 5.3, h: 0.32, fontSize: 14, bold: true, color: DARK });
    s.addText(body, { x: 0.9, y: 3.78 + i * 0.9, w: 5.4, h: 0.45, fontSize: 13, color: GREEN, transparency: 15 });
  });

  s.addShape(prs.ShapeType.rect, { x: 7.0, y: 3.0, w: 5.65, h: 3.75, fill: { color: GREEN, transparency: 95 }, line: { color: GREEN, width: 0.5, transparency: 85 } });
  s.addText("AI MEMORY", { x: 7.2, y: 3.12, w: 5.25, h: 0.22, fontSize: 9, bold: true, color: GREEN, charSpacing: 1.5, transparency: 25 });
  s.addText("Every uploaded paper and personal detail is remembered — future chats use it as context automatically.", { x: 7.2, y: 3.4, w: 5.25, h: 1.0, fontSize: 13.5, color: GREEN, transparency: 10 });
  s.addShape(prs.ShapeType.line, { x: 7.2, y: 4.55, w: 5.05, h: 0, line: { color: GREEN, width: 0.5, transparency: 70 } });
  s.addText("Available on Plus & Pro plans.", { x: 7.2, y: 4.7, w: 5.25, h: 0.32, fontSize: 13, bold: true, color: DARK });
  addFooter(s, 24, TOTAL);
}

// ─── SLIDE 25 (NEW): Dynamo AI vs Other AI Tools ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "4:30 PM · Why Dynamo AI");
  addH2(s, "Dynamo AI vs. the Rest"); addRule(s);

  const header = [
    { text: "FEATURE", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: DARK }, charSpacing: 0.5 } },
    { text: "DYNAMO AI", options: { bold: true, fontSize: 11, color: DARK, fill: { color: GOLD }, charSpacing: 0.5 } },
    { text: "CHATGPT PLUS", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: DARK }, charSpacing: 0.5 } },
    { text: "GEMINI PRO", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: DARK }, charSpacing: 0.5 } },
    { text: "PERPLEXITY", options: { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: DARK }, charSpacing: 0.5 } },
  ];
  const rowsData = [
    ["Research Gap Finder", "✓ Built-in", "✗", "✗", "✗"],
    ["Persistent AI Memory", "✓ Full context", "Limited", "Project only", "✗"],
    ["AI & Plagiarism Detector", "✓ Included", "✗", "✗", "✗"],
    ["Humaniser", "✓ Included", "✗", "✗", "✗"],
    ["Citation Engine (8 formats)", "✓ Verified", "Basic", "Basic", "Basic"],
    ["Data on Indian Servers", "✓ India-first", "US servers", "US servers", "US servers"],
    ["INR Pricing / month", "₹99–1799", "₹1,999", "₹1,950", "₹1,999"],
  ];
  const rows = [header];
  rowsData.forEach((r, i) => {
    const bg = i % 2 === 0 ? "FFFFFF" : "F3EEE3";
    rows.push(r.map((cell, ci) => ({
      text: cell,
      options: {
        fontSize: 12,
        color: ci === 1 ? GREEN : (cell === "✗" ? RED : GREEN),
        bold: ci === 0 || ci === 1,
        fill: { color: ci === 1 ? "EFE3BE" : bg },
        align: ci === 0 ? "left" : "center",
      },
    })));
  });

  s.addTable(rows, { x: 0.65, y: 3.0, w: 12.03, h: 3.4, colW: [3.3, 2.5, 2.1, 2.1, 2.03], border: { type: "solid", color: "E5DCC8", pt: 0.5 }, valign: "middle", autoPage: false });

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 6.5, w: 12.03, h: 0.5, fill: { color: GREEN, transparency: 93 }, line: { type: "none" } });
  s.addText("Dynamo AI Pro is roughly 10% cheaper than ChatGPT Plus & Gemini Pro — and covers research workflows they don't.", { x: 0.85, y: 6.55, w: 11.6, h: 0.4, fontSize: 12, bold: true, color: DARK });
  addFooter(s, 25, TOTAL);
}

// ─── SLIDE 26 (NEW): Subscription Plans ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "4:30 PM · Plans & Pricing");
  addH2(s, "Subscription Plans"); addRule(s);

  const plans = [
    [GREEN, "Basic", "₹99", "/mo", "No free trial", "General users", ["10 chats / day", "Fast Mode + voice"]],
    [GOLD, "Plus", "₹799", "/mo", "7-day free trial", "Students", ["100 chats / day", "Research Mode + Memory", "8 citation formats"]],
    [DARK, "Pro", "₹1,799", "/mo", "14-day free trial", "Faculty & researchers", ["300 chats + DeepThink", "Detector, Similarity, Humaniser", "Deep Research Agent"]],
  ];
  plans.forEach(([color, name, price, period, trial, who, feats], i) => {
    const x = 0.65 + i * 4.05;
    s.addShape(prs.ShapeType.rect, { x, y: 3.0, w: 3.85, h: 3.35, fill: { color: color === GOLD ? GOLD : (color === DARK ? DARK : GREEN), transparency: color === DARK ? 90 : 94 }, line: { color, width: 0.5, transparency: 70 } });
    s.addShape(prs.ShapeType.line, { x, y: 3.05, w: 3.85, h: 0, line: { color, width: 3 } });
    s.addText(name.toUpperCase(), { x: x + 0.25, y: 3.18, w: 3.35, h: 0.28, fontSize: 12, bold: true, color: DARK, charSpacing: 1 });
    s.addText([{ text: price, options: { fontSize: 26, bold: true, color: DARK } }, { text: ` ${period}`, options: { fontSize: 12, color: GREEN } }], { x: x + 0.25, y: 3.48, w: 3.35, h: 0.45 });
    s.addText(trial, { x: x + 0.25, y: 3.93, w: 3.35, h: 0.26, fontSize: 12, bold: true, color: GREEN, transparency: 10 });
    s.addText(who, { x: x + 0.25, y: 4.2, w: 3.35, h: 0.3, fontSize: 12, italic: true, color: GREEN, transparency: 15 });
    feats.forEach((f, j) => {
      s.addShape(prs.ShapeType.ellipse, { x: x + 0.25, y: 4.68 + j * 0.38, w: 0.08, h: 0.08, fill: { color: DARK }, line: { type: "none" } });
      s.addText(f, { x: x + 0.45, y: 4.61 + j * 0.38, w: 3.15, h: 0.32, fontSize: 11.5, color: GREEN });
    });
  });

  s.addShape(prs.ShapeType.rect, { x: 0.65, y: 6.55, w: 12.03, h: 0.45, fill: { color: GOLD, transparency: 93 }, line: { color: GOLD, width: 1 } });
  s.addText("Institutions: bulk faculty licensing available — ask us at the end of today's session.", { x: 0.85, y: 6.6, w: 11.6, h: 0.35, fontSize: 12, bold: true, color: DARK });
  addFooter(s, 26, TOTAL);
}

// ─── SLIDE 27: 3 Things Monday ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Before You Leave");
  s.addText("3 Things to Do Monday", { x: 0.8, y: 1.6, w: W - 1.6, h: 1.0, fontSize: 52, bold: true, color: DARK, align: "center" });
  addRule(s, 5.5, 2.75, 2.3);

  const items = [["01","Open Dynamo AI on your topic","Run a Research Mode query, see the gaps, pick an angle — that's your abstract."],["02","Share a gap finding with a colleague","Send the gap analysis output to one colleague. That's how this spreads."],["03","Save a paper to your Library","Upload your key reference paper — every future chat will know your context."]];
  items.forEach(([n, title, body], i) => {
    const x = 0.65 + i * 4.22;
    s.addShape(prs.ShapeType.line, { x, y: 3.05, w: 4.0, h: 0, line: { color: GOLD, width: 3 } });
    s.addShape(prs.ShapeType.rect, { x, y: 3.05, w: 4.0, h: 3.7, fill: { color: "FFFFFF", transparency: 100 }, line: { color: GREEN, width: 0.5, transparency: 80 } });
    s.addText(n, { x: x + 0.2, y: 3.2, w: 3.6, h: 0.65, fontSize: 30, bold: true, color: GOLD, italic: true, transparency: 30 });
    s.addText(title, { x: x + 0.2, y: 3.92, w: 3.6, h: 0.6, fontSize: 15, bold: true, color: DARK });
    s.addText(body, { x: x + 0.2, y: 4.56, w: 3.6, h: 1.15, fontSize: 13, color: GREEN, transparency: 15 });
  });
  addFooter(s, 27, TOTAL);
}

// ─── SLIDE 28: Q&A ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s); addTag(s, "Open Floor");
  addRule(s, 5.5, 1.75, 2.3);
  s.addText("Questions & Discussion", { x: 1, y: 1.9, w: W - 2, h: 0.85, fontSize: 44, bold: true, color: DARK, align: "center" });
  addRule(s, 5.5, 2.85, 2.3);
  s.addText("No wrong questions. If you thought of it, someone else in the room did too.", { x: 2, y: 3.0, w: W - 4, h: 0.5, fontSize: 14, color: GREEN, italic: true, align: "center", transparency: 15 });

  const qas = [["How does billing work?","Basic is ₹99/mo (no trial). Plus and Pro include a free trial before any charge."],["Does it work offline?","No — it queries live sources in real time. Needs internet."],["Is my data private?","Private to your account, stored on Indian servers. We don't train on your data."],["Can students use it?","Yes — Basic and Plus suit students. Bulk college-wide licensing is available."]];
  qas.forEach(([q, a], i) => {
    const x = 0.65 + i * 3.17;
    s.addShape(prs.ShapeType.rect, { x, y: 3.65, w: 3.05, h: 2.85, fill: { color: "FFFFFF", transparency: 100 }, line: { color: GREEN, width: 0.5, transparency: 80 } });
    s.addText(q, { x: x + 0.18, y: 3.8, w: 2.7, h: 0.6, fontSize: 13.5, bold: true, color: DARK });
    s.addText(a, { x: x + 0.18, y: 4.45, w: 2.7, h: 1.0, fontSize: 12.5, color: GREEN, transparency: 20 });
  });
  addFooter(s, 28, TOTAL);
}

// ─── SLIDE 29: Thank You ───
{
  const s = prs.addSlide(); s.background = { color: BG };
  addBorder(s); addHeader(s);
  addTag(s, "Thank You", 1.3);
  addRule(s, 5.5, 1.98, 2.3);
  s.addText("Research That Took Days.", { x: 0.8, y: 2.12, w: W - 1.6, h: 0.95, fontSize: 52, bold: true, color: DARK, align: "center" });
  s.addText("Now Done in Minutes.", { x: 1, y: 3.15, w: W - 2, h: 0.6, fontSize: 34, color: GREEN, italic: true, align: "center", transparency: 15 });
  addRule(s, 5.5, 3.9, 2.3);

  const links = [["Platform","dynamoai.app"],["Pricing","Basic ₹99 · Plus ₹799 · Pro ₹1799"],["Certificate","Issued to all participants"]];
  links.forEach(([label, val], i) => {
    const x = 2.2 + i * 3.3;
    s.addText(label.toUpperCase(), { x, y: 4.15, w: 2.9, h: 0.24, fontSize: 10, bold: true, color: GREEN, charSpacing: 1.5, transparency: 30, align: "center" });
    s.addText(val, { x, y: 4.45, w: 2.9, h: 0.35, fontSize: 14, bold: true, color: DARK, align: "center" });
  });
  addFooter(s, 29, TOTAL);
}

// ─── Write file ───
prs.writeFile({ fileName: "downloads/FDP-Presentation-DynamoAI.pptx" })
  .then(() => console.log("DONE: downloads/FDP-Presentation-DynamoAI.pptx"))
  .catch(e => { console.error("ERROR:", e.message); process.exit(1); });
