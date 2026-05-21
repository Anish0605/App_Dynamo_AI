"""
Dynamo AI Pitch Deck — PPTX Generator
14 slides, 16:9 widescreen, brand colors: #0a0e1a / #FFC107 / #ffffff
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import copy, os

# ── Brand tokens ──────────────────────────────────────────────────────────────
BLACK  = RGBColor(0x0a, 0x0e, 0x1a)
BLACK2 = RGBColor(0x14, 0x19, 0x2b)
YELLOW = RGBColor(0xFF, 0xC1, 0x07)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
MUTED  = RGBColor(0xAA, 0xAA, 0xBB)
GREEN  = RGBColor(0x22, 0xC5, 0x5E)
RED    = RGBColor(0xEF, 0x44, 0x44)
BLUE   = RGBColor(0x3B, 0x82, 0xF6)

W  = Inches(13.33)   # slide width  (16:9 widescreen)
H  = Inches(7.5)     # slide height

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H

BLANK = prs.slide_layouts[6]   # fully blank layout

LOGO_PATH = "attached_assets/Dynamo_AI_New_Logo_1779360398074.png"

# ── Helpers ───────────────────────────────────────────────────────────────────
def add_slide():
    sl = prs.slides.add_slide(BLANK)
    # dark background
    bg = sl.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = BLACK
    return sl

def txb(sl, text, l, t, w, h, size=18, bold=False, color=WHITE,
        align=PP_ALIGN.LEFT, wrap=True):
    """Add a text box."""
    tx = sl.shapes.add_textbox(l, t, w, h)
    tf = tx.text_frame
    tf.word_wrap = wrap
    p  = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size  = Pt(size)
    run.font.bold  = bold
    run.font.color.rgb = color
    run.font.name  = "Calibri"
    return tx

def rect(sl, l, t, w, h, fill_color=None, line_color=None, line_width=Pt(1)):
    """Add a rectangle."""
    shape = sl.shapes.add_shape(1, l, t, w, h)  # MSO_SHAPE_TYPE.RECTANGLE = 1
    if fill_color:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
    else:
        shape.fill.background()
    if line_color:
        shape.line.color.rgb = line_color
        shape.line.width     = line_width
    else:
        shape.line.fill.background()
    return shape

def header(sl, page_num, section_label=""):
    """Standard slide header: logo + section label + page number."""
    # Logo image
    if os.path.exists(LOGO_PATH):
        sl.shapes.add_picture(LOGO_PATH, Inches(0.4), Inches(0.2),
                              width=Inches(0.5), height=Inches(0.5))
    # Logo name
    txb(sl, "Dynamo AI", Inches(1.0), Inches(0.25), Inches(2), Inches(0.4),
        size=16, bold=True, color=WHITE)
    # Section label (center)
    if section_label:
        txb(sl, section_label.upper(), Inches(4), Inches(0.28), Inches(5.33), Inches(0.35),
            size=9, bold=True, color=MUTED, align=PP_ALIGN.CENTER)
    # Page number (right)
    txb(sl, f"{page_num:02d} / 14", Inches(12.3), Inches(0.28), Inches(0.9), Inches(0.35),
        size=9, bold=True, color=MUTED, align=PP_ALIGN.RIGHT)

def footer(sl):
    txb(sl, "DYNAMO AI · CONFIDENTIAL",
        Inches(0.4), Inches(7.1), Inches(4), Inches(0.28),
        size=8, color=MUTED)
    txb(sl, "app.dynamoai.in",
        Inches(9.5), Inches(7.1), Inches(3.4), Inches(0.28),
        size=8, color=MUTED, align=PP_ALIGN.RIGHT)

def section_tag(sl, label):
    """Yellow pill tag."""
    r = rect(sl, Inches(0.4), Inches(0.95), Inches(len(label)*0.11 + 0.4), Inches(0.3),
             fill_color=RGBColor(0x26, 0x1E, 0x00), line_color=RGBColor(0x80, 0x60, 0x03))
    txb(sl, f"● {label.upper()}", Inches(0.45), Inches(0.96), Inches(len(label)*0.11 + 0.3),
        Inches(0.28), size=8, bold=True, color=YELLOW)

def check(ok):
    return "✓" if ok == "y" else ("✗" if ok == "n" else "~")

def check_color(ok):
    return GREEN if ok == "y" else (RED if ok == "n" else YELLOW)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 01 — Cover
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
# Logo (big)
if os.path.exists(LOGO_PATH):
    sl.shapes.add_picture(LOGO_PATH, Inches(0.5), Inches(0.25),
                          width=Inches(0.7), height=Inches(0.7))
txb(sl, "Dynamo AI", Inches(1.3), Inches(0.3), Inches(3), Inches(0.55),
    size=20, bold=True, color=WHITE)
# Made in India
txb(sl, "🇮🇳  MADE IN INDIA", Inches(10.8), Inches(0.35), Inches(2.1), Inches(0.35),
    size=9, bold=True, color=YELLOW)
# Tag
r = rect(sl, Inches(0.5), Inches(1.55), Inches(2.8), Inches(0.33),
         fill_color=RGBColor(0x1A, 0x14, 0x00), line_color=RGBColor(0x80, 0x60, 0x03))
txb(sl, "● INCUBATOR PITCH · 2026", Inches(0.55), Inches(1.57), Inches(2.7), Inches(0.3),
    size=8, bold=True, color=YELLOW)
# Big headline
txb(sl, "Dynamo", Inches(0.5), Inches(2.0), Inches(5), Inches(1.3),
    size=90, bold=True, color=WHITE)
txb(sl, "AI", Inches(4.9), Inches(2.0), Inches(2.2), Inches(1.3),
    size=90, bold=True, color=YELLOW)
# Tagline
txb(sl, "India's Academic Workflow Platform",
    Inches(0.5), Inches(3.5), Inches(7), Inches(0.5),
    size=22, bold=False, color=WHITE)
# Sub
txb(sl, "RESEARCH  ·  WRITE  ·  CITE  ·  PRESENT",
    Inches(0.5), Inches(4.1), Inches(6), Inches(0.4),
    size=14, bold=True, color=YELLOW)
txb(sl, "All in one place. Built for India's 200,000+ PhD scholars & researchers.",
    Inches(0.5), Inches(4.65), Inches(7), Inches(0.4),
    size=13, color=MUTED)
# Footer
txb(sl, "FOUNDER: ANISH KRISNA S  ·  MS DATA SCIENCE",
    Inches(0.5), Inches(7.1), Inches(5), Inches(0.28), size=8, color=MUTED)
txb(sl, "APP.DYNAMOAI.IN", Inches(10.5), Inches(7.1), Inches(2.4), Inches(0.28),
    size=8, color=MUTED, align=PP_ALIGN.RIGHT)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 02 — Problem
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 2, "THE PROBLEM")
section_tag(sl, "THE PROBLEM")
txb(sl, "Academic work is broken.",
    Inches(0.4), Inches(1.35), Inches(9), Inches(0.75),
    size=38, bold=True, color=WHITE)
txb(sl, "Today's researchers juggle a dozen disconnected tools just to complete a single piece of academic work.",
    Inches(0.4), Inches(2.1), Inches(9), Inches(0.45), size=14, color=MUTED)

# Tools grid (6 tools)
tools = [
    ("💬", "ChatGPT", "General AI chat"),
    ("🔎", "Google Scholar", "Paper search"),
    ("📚", "Research DBs", "JSTOR · Scopus"),
    ("📋", "Citation Tools", "Zotero · Mendeley"),
    ("📝", "Word", "Writing & drafts"),
    ("📊", "PowerPoint", "Presentations"),
]
for i, (icon, name, desc) in enumerate(tools):
    col = i % 3; row = i // 3
    lft = Inches(0.4 + col * 2.45)
    top = Inches(2.65 + row * 0.85)
    r = rect(sl, lft, top, Inches(2.3), Inches(0.75),
             fill_color=RGBColor(0x12, 0x17, 0x28), line_color=RGBColor(0x2A, 0x2F, 0x48))
    txb(sl, f"{icon} {name}", lft + Inches(0.1), top + Inches(0.04), Inches(2.1), Inches(0.38),
        size=12, bold=True, color=WHITE)
    txb(sl, desc, lft + Inches(0.1), top + Inches(0.4), Inches(2.1), Inches(0.28),
        size=9, color=MUTED)

# Pain points (right side)
pains = [
    "Context switching across 6+ tools",
    "Lost productivity & wasted time",
    "Repeated effort & duplicate work",
    "Fragmented, disconnected workflow",
]
txb(sl, "THE RESULT", Inches(7.9), Inches(2.55), Inches(5), Inches(0.3),
    size=9, bold=True, color=YELLOW)
pain_box = rect(sl, Inches(7.9), Inches(2.85), Inches(5.0), Inches(2.25),
                fill_color=RGBColor(0x14, 0x10, 0x00), line_color=RGBColor(0x60, 0x45, 0x00))
for i, pain in enumerate(pains):
    txb(sl, f"✗  {pain}", Inches(8.05), Inches(2.95 + i * 0.48), Inches(4.7), Inches(0.4),
        size=13, color=WHITE)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 03 — Cost of Fragmentation
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 3, "THE COST")
section_tag(sl, "THE COST OF FRAGMENTATION")
txb(sl, "Researchers spend 30+ hours per week on manual work.",
    Inches(0.4), Inches(1.35), Inches(12), Inches(0.75), size=34, bold=True, color=WHITE)
txb(sl, "That's time stolen from actual research, insight, and innovation.",
    Inches(0.4), Inches(2.1), Inches(9), Inches(0.4), size=14, color=MUTED)

tasks = [
    ("🔍", "Searching Papers",    "8–12 hrs/wk", "Hunting databases"),
    ("📂", "Organising Findings", "4–6 hrs/wk",  "Notes & bookmarks"),
    ("✍️",  "Writing Drafts",      "10–15 hrs/wk","Manual formatting"),
    ("📋", "Formatting Citations","3–5 hrs/wk",  "APA, MLA, IEEE"),
    ("📊", "Creating Decks",      "5–8 hrs/wk",  "Slides from scratch"),
]
card_w = Inches(2.4)
for i, (icon, title, hrs, desc) in enumerate(tasks):
    lft = Inches(0.4 + i * 2.58)
    top = Inches(2.6)
    r = rect(sl, lft, top, card_w, Inches(3.6),
             fill_color=RGBColor(0x10, 0x15, 0x25), line_color=RGBColor(0x25, 0x2A, 0x40))
    txb(sl, icon,  lft + Inches(0.15), top + Inches(0.2),  Inches(0.5), Inches(0.4), size=26)
    txb(sl, title, lft + Inches(0.15), top + Inches(0.75), card_w - Inches(0.3), Inches(0.4),
        size=12, bold=True, color=WHITE)
    txb(sl, desc,  lft + Inches(0.15), top + Inches(1.2),  card_w - Inches(0.3), Inches(0.5),
        size=10, color=MUTED)
    txb(sl, "HOURS / WEEK", lft + Inches(0.15), top + Inches(2.5), card_w - Inches(0.3), Inches(0.25),
        size=8, bold=True, color=RGBColor(0xAA, 0x80, 0x10))
    txb(sl, hrs, lft + Inches(0.15), top + Inches(2.8), card_w - Inches(0.3), Inches(0.55),
        size=22, bold=True, color=YELLOW)

# Callout
r = rect(sl, Inches(0.4), Inches(6.3), Inches(12.5), Inches(0.75),
         fill_color=RGBColor(0x18, 0x14, 0x00), line_color=YELLOW)
txb(sl, "⏱  Average PhD scholar spends 1,500+ hours/year on fragmented tasks — equivalent to 9 months of full-time work.",
    Inches(0.6), Inches(6.4), Inches(12.1), Inches(0.55), size=12, color=WHITE)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 04 — Introducing Dynamo AI
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 4, "THE SOLUTION")
section_tag(sl, "INTRODUCING")
txb(sl, "One platform. Six superpowers.",
    Inches(0.4), Inches(1.35), Inches(10), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "Dynamo AI replaces 6+ disconnected tools with a single intelligent platform built for academics.",
    Inches(0.4), Inches(2.1), Inches(9.5), Inches(0.4), size=14, color=MUTED)

features = [
    ("🔬", "Research Discovery",    "Real-time search across web + Semantic Scholar"),
    ("📖", "Literature Analysis",   "Find gaps, summarise papers, surface insights"),
    ("✍️",  "Academic Writing",      "Draft & refine with DeepThink AI mode"),
    ("📋", "Citation Generation",   "Auto-format APA, MLA, IEEE, Chicago, Harvard, Vancouver"),
    ("📊", "Presentation Creation", "Mindmaps, flowcharts, decks — instantly"),
    ("🧠", "Knowledge Management",  "AI Memory + Document Library, persistent across chats"),
]
for i, (icon, title, desc) in enumerate(features):
    col = i % 3; row = i // 3
    lft = Inches(0.4 + col * 4.3)
    top = Inches(2.65 + row * 1.65)
    r = rect(sl, lft, top, Inches(4.1), Inches(1.5),
             fill_color=RGBColor(0x12, 0x17, 0x28), line_color=RGBColor(0x3A, 0x30, 0x05))
    txb(sl, f"{icon}  {title}", lft + Inches(0.15), top + Inches(0.12),
        Inches(3.8), Inches(0.45), size=14, bold=True, color=WHITE)
    txb(sl, desc, lft + Inches(0.15), top + Inches(0.65), Inches(3.8), Inches(0.7),
        size=11, color=MUTED)

txb(sl, "20+ AI capabilities  ·  3 AI model tiers  ·  6 citation formats  ·  Built for researchers",
    Inches(0.4), Inches(6.9), Inches(12.5), Inches(0.35),
    size=11, color=MUTED, align=PP_ALIGN.CENTER)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 05 — Workflow
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 5, "THE WORKFLOW")
section_tag(sl, "THE DYNAMO AI WORKFLOW")
txb(sl, "One continuous workflow — start to finish.",
    Inches(0.4), Inches(1.35), Inches(10), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "No more tab-switching. From research question to final deck — every step in one platform.",
    Inches(0.4), Inches(2.1), Inches(9.5), Inches(0.4), size=14, color=MUTED)

steps = [
    ("01", "🎯", "Define Topic"),
    ("02", "🔍", "Search"),
    ("03", "🧠", "Analyse"),
    ("04", "✍️",  "Write"),
    ("05", "📋", "Cite"),
    ("06", "📊", "Present"),
    ("07", "📂", "Store"),
]
step_w = Inches(1.6)
for i, (n, icon, title) in enumerate(steps):
    lft = Inches(0.4 + i * 1.83)
    top = Inches(2.7)
    is_first_last = i == 0 or i == len(steps)-1
    bg_c = RGBColor(0x20, 0x19, 0x00) if is_first_last else RGBColor(0x12, 0x17, 0x28)
    bd_c = YELLOW if is_first_last else RGBColor(0x25, 0x2A, 0x40)
    r = rect(sl, lft, top, step_w, Inches(2.6), fill_color=bg_c, line_color=bd_c)
    # step number badge
    nb = rect(sl, lft + Inches(0.45), top - Inches(0.18), Inches(0.7), Inches(0.28),
              fill_color=YELLOW, line_color=None)
    txb(sl, n, lft + Inches(0.45), top - Inches(0.18), Inches(0.7), Inches(0.28),
        size=8, bold=True, color=BLACK, align=PP_ALIGN.CENTER)
    txb(sl, icon,  lft + Inches(0.1), top + Inches(0.2), step_w - Inches(0.2), Inches(0.55),
        size=28, align=PP_ALIGN.CENTER)
    txb(sl, title, lft + Inches(0.1), top + Inches(0.9), step_w - Inches(0.2), Inches(0.5),
        size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # Arrow between steps
    if i < len(steps) - 1:
        txb(sl, "›", lft + step_w + Inches(0.05), top + Inches(0.9), Inches(0.25), Inches(0.5),
            size=18, bold=True, color=YELLOW, align=PP_ALIGN.CENTER)

r = rect(sl, Inches(3.5), Inches(5.7), Inches(6.3), Inches(0.45),
         fill_color=RGBColor(0x1A, 0x14, 0x00), line_color=RGBColor(0x80, 0x60, 0x03))
txb(sl, "⚡  Average time saved: 20+ hours / week per researcher",
    Inches(3.5), Inches(5.73), Inches(6.3), Inches(0.38),
    size=11, bold=True, color=YELLOW, align=PP_ALIGN.CENTER)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 06 — Product Showcase
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 6, "PRODUCT")
section_tag(sl, "PRODUCT SHOWCASE")
txb(sl, "Built. Live. Working today.",
    Inches(0.4), Inches(1.35), Inches(9), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "Six core surfaces — every academic workflow in one place.",
    Inches(0.4), Inches(2.1), Inches(8), Inches(0.4), size=14, color=MUTED)

screens = [
    ("💬", "Dashboard",      "Chat-first interface"),
    ("🔬", "Deep Research",  "Multi-model pipeline"),
    ("✍️",  "Writing",        "DeepThink mode"),
    ("📋", "Citations",      "6 academic formats"),
    ("📂", "Doc Library",    "Persistent memory"),
    ("📊", "Presentations",  "Slides & mindmaps"),
]
for i, (icon, title, desc) in enumerate(screens):
    col = i % 3; row = i // 3
    lft = Inches(0.4 + col * 4.3)
    top = Inches(2.6 + row * 1.9)
    # browser chrome bar
    chrome = rect(sl, lft, top, Inches(4.1), Inches(0.32),
                  fill_color=RGBColor(0x08, 0x0C, 0x18), line_color=RGBColor(0x25, 0x2A, 0x40))
    txb(sl, "● ● ●   app.dynamoai.in", lft + Inches(0.1), top + Inches(0.04),
        Inches(3.9), Inches(0.24), size=7, color=MUTED)
    # card body
    card = rect(sl, lft, top + Inches(0.32), Inches(4.1), Inches(1.45),
                fill_color=RGBColor(0x12, 0x17, 0x28), line_color=RGBColor(0x25, 0x2A, 0x40))
    txb(sl, f"{icon}  {title}", lft + Inches(0.15), top + Inches(0.42),
        Inches(3.8), Inches(0.42), size=13, bold=True, color=WHITE)
    txb(sl, desc, lft + Inches(0.15), top + Inches(0.9), Inches(3.8), Inches(0.3),
        size=10, color=MUTED)
    live = rect(sl, lft + Inches(0.15), top + Inches(1.32), Inches(0.7), Inches(0.25),
                fill_color=RGBColor(0x05, 0x28, 0x12), line_color=GREEN)
    txb(sl, "● LIVE", lft + Inches(0.17), top + Inches(1.33), Inches(0.65), Inches(0.22),
        size=7, bold=True, color=GREEN)

txb(sl, "🎬  Live Demo Available · app.dynamoai.in  |  📱  Try it free — no credit card required",
    Inches(0.4), Inches(7.0), Inches(12.5), Inches(0.35),
    size=11, color=MUTED, align=PP_ALIGN.CENTER)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 07 — Competitive Landscape
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 7, "COMPETITION")
section_tag(sl, "COMPETITIVE LANDSCAPE")
txb(sl, "The only end-to-end platform.",
    Inches(0.4), Inches(1.35), Inches(10), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "Existing tools solve one piece of the puzzle. Dynamo AI is the only complete academic workflow.",
    Inches(0.4), Inches(2.1), Inches(10), Inches(0.4), size=14, color=MUTED)

cols_hdr = ["Capability", "ChatGPT", "Consensus", "Elicit", "Jenni", "⚡ Dynamo AI"]
col_ws   = [3.2, 1.6, 1.6, 1.6, 1.6, 1.9]
rows_data = [
    ["Research Search",        "~", "y", "y", "n", "y"],
    ["Academic Writing",       "y", "n", "n", "y", "y"],
    ["Citation Formatting",    "~", "y", "y", "y", "y"],
    ["Document Library",       "n", "n", "n", "n", "y"],
    ["Presentation Creation",  "n", "n", "n", "n", "y"],
    ["End-to-End Workflow",    "n", "n", "n", "n", "y"],
]

# Table header
row_h = Inches(0.46)
lft0 = Inches(0.4)
top0 = Inches(2.65)
x = lft0
for j, (col_name, cw) in enumerate(zip(cols_hdr, col_ws)):
    bg = RGBColor(0x20, 0x19, 0x00) if j == 5 else RGBColor(0x14, 0x19, 0x2b)
    r = rect(sl, x, top0, Inches(cw), row_h, fill_color=bg, line_color=RGBColor(0x2A, 0x2F, 0x48))
    c = YELLOW if j == 5 else MUTED
    txb(sl, col_name, x + Inches(0.08), top0 + Inches(0.1), Inches(cw - 0.1), Inches(0.28),
        size=9, bold=True, color=c, align=PP_ALIGN.CENTER if j > 0 else PP_ALIGN.LEFT)
    x += Inches(cw)

for ri, row in enumerate(rows_data):
    top = top0 + row_h * (ri + 1)
    x = lft0
    for j, (val, cw) in enumerate(zip(row, col_ws)):
        bg = RGBColor(0x20, 0x19, 0x00) if j == 5 else (
             RGBColor(0x12, 0x17, 0x28) if ri % 2 == 0 else RGBColor(0x0E, 0x13, 0x22))
        r = rect(sl, x, top, Inches(cw), row_h, fill_color=bg, line_color=RGBColor(0x25, 0x2A, 0x40))
        if j == 0:
            txb(sl, val, x + Inches(0.1), top + Inches(0.1), Inches(cw - 0.15), Inches(0.28),
                size=12, bold=True, color=WHITE)
        else:
            sym = check(val); sym_color = check_color(val)
            txb(sl, sym, x, top + Inches(0.07), Inches(cw), Inches(0.32),
                size=14, bold=True, color=sym_color, align=PP_ALIGN.CENTER)
        x += Inches(cw)

# Callout
r = rect(sl, Inches(0.4), Inches(6.35), Inches(12.5), Inches(0.65),
         fill_color=RGBColor(0x18, 0x14, 0x00), line_color=YELLOW)
txb(sl, "💡  Dynamo AI is the only platform with a complete workflow: Search → Write → Cite → Library → Present — all under one login.",
    Inches(0.6), Inches(6.45), Inches(12.1), Inches(0.45), size=11, color=WHITE)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 08 — Why Now
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 8, "WHY NOW")
section_tag(sl, "WHY NOW")
txb(sl, "Three forces. One window.",
    Inches(0.4), Inches(1.35), Inches(9), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "The academic world is at an inflection point. Researchers need integrated AI tools — and they need them now.",
    Inches(0.4), Inches(2.1), Inches(10), Inches(0.4), size=14, color=MUTED)

trends = [
    ("📈", "01", "Explosion of Research",
     "5M+", "papers / year",
     "Global research output is doubling every 9 years. Researchers can't keep up with manual literature reviews."),
    ("🤖", "02", "AI Adoption in Academia",
     "67%", "of researchers use AI",
     "Nature 2024: AI use among researchers tripled in 18 months. But tools remain generic, not academic-specific."),
    ("⚡", "03", "Demand for Speed",
     "3×", "faster output expected",
     "Publish-or-perish pressure has intensified. Researchers need integrated tools, not 6 separate apps."),
]
for i, (icon, num, title, stat, stat_l, desc) in enumerate(trends):
    lft = Inches(0.4 + i * 4.3)
    top = Inches(2.6)
    r = rect(sl, lft, top, Inches(4.1), Inches(3.8),
             fill_color=RGBColor(0x18, 0x14, 0x00), line_color=RGBColor(0x60, 0x45, 0x00))
    txb(sl, icon, lft + Inches(0.2), top + Inches(0.2), Inches(0.6), Inches(0.55), size=30)
    txb(sl, num,  lft + Inches(3.5), top + Inches(0.2), Inches(0.5), Inches(0.4),
        size=22, color=RGBColor(0x60, 0x45, 0x03))
    txb(sl, title, lft + Inches(0.2), top + Inches(0.85), Inches(3.8), Inches(0.48),
        size=16, bold=True, color=WHITE)
    txb(sl, stat, lft + Inches(0.2), top + Inches(1.45), Inches(3.8), Inches(0.65),
        size=40, bold=True, color=YELLOW)
    txb(sl, stat_l.upper(), lft + Inches(0.2), top + Inches(2.1), Inches(3.8), Inches(0.28),
        size=9, bold=True, color=RGBColor(0xAA, 0x80, 0x10))
    txb(sl, desc, lft + Inches(0.2), top + Inches(2.5), Inches(3.7), Inches(1.0),
        size=10, color=MUTED)

txb(sl, "The market is ready. Researchers want integrated, intelligent tools — built for them, in India.",
    Inches(0.4), Inches(6.8), Inches(12.5), Inches(0.4),
    size=12, color=WHITE, align=PP_ALIGN.CENTER)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 09 — Target Market
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 9, "MARKET")
section_tag(sl, "TARGET MARKET")
txb(sl, "Built for India's academic core.",
    Inches(0.4), Inches(1.35), Inches(9), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "We start with the highest-need users and expand outwards — individuals to institutions.",
    Inches(0.4), Inches(2.1), Inches(9), Inches(0.4), size=14, color=MUTED)

tiers = [
    ("PRIMARY · NOW",    YELLOW, "The Spear-Tip",   "200K+",  "PhD scholars in India",
     ["PhD Scholars", "Research Scholars (M.Phil)"],
     "Highest workflow pain, longest research cycles, immediate value capture."),
    ("SECONDARY · 6 MO", MUTED,  "The Multipliers", "1.5M+",  "professors & researchers",
     ["University Professors", "Industry Researchers"],
     "Drive scholar adoption + open doors to institutional contracts."),
    ("FUTURE · 12-18 MO",RGBColor(0x55,0x55,0x66),"The Scale Play","1,000+","universities & R&D labs",
     ["IITs, IISc, IIMs, AIIMS", "CSIR Labs, Private R&D"],
     "Institutional contracts. 10× ACV. Multi-year deals."),
]
for i, (badge, badge_c, tier_title, stat, stat_l, items, note) in enumerate(tiers):
    lft = Inches(0.4 + i * 4.3)
    top = Inches(2.55)
    bd = YELLOW if i == 0 else RGBColor(0x30, 0x35, 0x50)
    bg = RGBColor(0x20, 0x19, 0x00) if i == 0 else RGBColor(0x12, 0x17, 0x28)
    r = rect(sl, lft, top, Inches(4.1), Inches(4.1), fill_color=bg, line_color=bd)
    nb = rect(sl, lft + Inches(0.15), top - Inches(0.18), Inches(3), Inches(0.28),
              fill_color=bg, line_color=bd)
    txb(sl, badge, lft + Inches(0.18), top - Inches(0.17), Inches(3), Inches(0.26),
        size=8, bold=True, color=badge_c)
    txb(sl, tier_title, lft + Inches(0.2), top + Inches(0.15), Inches(3.8), Inches(0.35),
        size=10, bold=True, color=badge_c)
    txb(sl, stat,   lft + Inches(0.2), top + Inches(0.58), Inches(3.8), Inches(0.65),
        size=40, bold=True, color=WHITE)
    txb(sl, stat_l, lft + Inches(0.2), top + Inches(1.25), Inches(3.8), Inches(0.28),
        size=10, color=MUTED)
    for j, item in enumerate(items):
        txb(sl, f"●  {item}", lft + Inches(0.2), top + Inches(1.65 + j*0.4),
            Inches(3.8), Inches(0.35), size=11, color=WHITE)
    note_box = rect(sl, lft + Inches(0.15), top + Inches(2.8), Inches(3.8), Inches(0.95),
                    fill_color=RGBColor(0x08, 0x0C, 0x18), line_color=RGBColor(0x25, 0x2A, 0x40))
    txb(sl, note, lft + Inches(0.25), top + Inches(2.9), Inches(3.6), Inches(0.75),
        size=10, color=MUTED)

txb(sl, "Total Addressable Market (India only): ₹2,400+ Cr annual academic productivity spend",
    Inches(0.4), Inches(7.0), Inches(12.5), Inches(0.3),
    size=10, color=MUTED, align=PP_ALIGN.CENTER)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 10 — Business Model
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 10, "BUSINESS MODEL")
section_tag(sl, "BUSINESS MODEL")
txb(sl, "Predictable revenue. Scalable margins.",
    Inches(0.4), Inches(1.35), Inches(10), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "Subscription SaaS today. Institutional licensing tomorrow. INR-priced for the Indian market.",
    Inches(0.4), Inches(2.1), Inches(10), Inches(0.4), size=14, color=MUTED)

plans = [
    ("Free Forever", "₹0", "/mo", "Acquisition layer", WHITE,
     RGBColor(0x12,0x17,0x28), RGBColor(0x30,0x35,0x50),
     ["10 AI chats / day", "Fast Mode (Gemini Flash)", "Web search + voice input",
      "AI Detector & Plagiarism", "Mindmaps & Flowcharts"]),
    ("Plus", "₹399", "/mo", "For scholars & researchers", YELLOW,
     RGBColor(0x20,0x19,0x00), YELLOW,
     ["✓ Unlimited AI chats", "✓ Research Mode (3 models)", "✓ 6-Format Citation Engine",
      "✓ Document Library", "✓ Find Research Gaps"]),
    ("Pro", "₹999", "/mo", "Power users & professors", WHITE,
     RGBColor(0x12,0x17,0x28), RGBColor(0x30,0x35,0x50),
     ["• Everything in Plus", "• DeepThink Mode", "• Deep Research Agent",
      "• Unlimited PDF uploads", "• Priority speed & support"]),
]
for i, (name, price, per, sub, txt_c, bg_c, bd_c, feats) in enumerate(plans):
    lft = Inches(0.4 + i * 4.3)
    top = Inches(2.55)
    r = rect(sl, lft, top, Inches(4.1), Inches(4.15), fill_color=bg_c, line_color=bd_c)
    if i == 1:
        nb = rect(sl, lft + Inches(1.1), top - Inches(0.18), Inches(1.9), Inches(0.28),
                  fill_color=YELLOW, line_color=None)
        txb(sl, "MOST POPULAR", lft + Inches(1.1), top - Inches(0.18), Inches(1.9), Inches(0.28),
            size=8, bold=True, color=BLACK, align=PP_ALIGN.CENTER)
    txb(sl, name,  lft + Inches(0.2), top + Inches(0.15), Inches(3.8), Inches(0.32),
        size=11, bold=True, color=txt_c)
    txb(sl, price, lft + Inches(0.2), top + Inches(0.55), Inches(3.8), Inches(0.8),
        size=48, bold=True, color=WHITE)
    txb(sl, per,   lft + Inches(1.85), top + Inches(0.85), Inches(1.0), Inches(0.3),
        size=12, color=MUTED)
    txb(sl, sub,   lft + Inches(0.2), top + Inches(1.45), Inches(3.8), Inches(0.28),
        size=10, color=MUTED)
    for j, feat in enumerate(feats):
        txb(sl, feat, lft + Inches(0.2), top + Inches(1.85 + j * 0.42),
            Inches(3.8), Inches(0.35), size=11, color=WHITE if i == 1 else RGBColor(0xCC,0xCC,0xDD))

# Future revenue
for i, (icon, lbl, val) in enumerate([
    ("🏛️", "Institutional Licensing", "₹5L–50L / year per university"),
    ("🤝", "University Partnerships",  "Embedded into curriculum"),
]):
    lft = Inches(0.4 + i * 6.6)
    top = Inches(6.9)
    r = rect(sl, lft, top, Inches(6.2), Inches(0.45),
             fill_color=RGBColor(0x18,0x14,0x00), line_color=RGBColor(0x60,0x45,0x00))
    txb(sl, f"{icon}  FUTURE · YEAR 2  —  {lbl}: {val}", lft + Inches(0.15), top + Inches(0.08),
        Inches(6.0), Inches(0.3), size=10, color=YELLOW)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 11 — Early Validation
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 11, "VALIDATION")
section_tag(sl, "EARLY VALIDATION")
txb(sl, "Real users. Real traction.",
    Inches(0.4), Inches(1.35), Inches(9), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "We're live. We have users. They're using it. Here's where we are and where we're heading.",
    Inches(0.4), Inches(2.1), Inches(9.5), Inches(0.4), size=14, color=MUTED)

# TODAY card
r = rect(sl, Inches(0.4), Inches(2.6), Inches(6.0), Inches(4.1),
         fill_color=RGBColor(0x12,0x17,0x28), line_color=RGBColor(0x30,0x35,0x50))
txb(sl, "● TODAY · LIVE", Inches(0.55), Inches(2.72), Inches(3), Inches(0.3),
    size=10, bold=True, color=GREEN)
metrics = [("10", "Beta users"), ("100%", "MVP shipped"), ("20+", "AI features live"), ("3", "Professor endorsements")]
for i, (stat, lbl) in enumerate(metrics):
    col = i % 2; row = i // 2
    ml = Inches(0.55 + col * 2.85)
    mt = Inches(3.15 + row * 0.9)
    mr = rect(sl, ml, mt, Inches(2.65), Inches(0.78),
              fill_color=RGBColor(0x0E,0x13,0x22), line_color=RGBColor(0x25,0x2A,0x40))
    txb(sl, stat, ml + Inches(0.12), mt + Inches(0.04), Inches(2.4), Inches(0.42),
        size=28, bold=True, color=YELLOW)
    txb(sl, lbl,  ml + Inches(0.12), mt + Inches(0.48), Inches(2.4), Inches(0.26),
        size=10, color=MUTED)
# Quote
qr = rect(sl, Inches(0.55), Inches(5.2), Inches(5.65), Inches(0.9),
          fill_color=RGBColor(0x08,0x0C,0x18), line_color=YELLOW)
txb(sl, '"Saves me 2 hours per literature review. The citation engine alone is worth it."',
    Inches(0.7), Inches(5.3), Inches(5.4), Inches(0.5), size=11, color=WHITE)
txb(sl, "— PhD Scholar, Anna University",
    Inches(0.7), Inches(5.82), Inches(5.4), Inches(0.25), size=9, color=MUTED)

# NEXT 90 DAYS card
r = rect(sl, Inches(6.8), Inches(2.6), Inches(6.1), Inches(4.1),
         fill_color=RGBColor(0x18,0x14,0x00), line_color=YELLOW)
txb(sl, "● NEXT 90 DAYS", Inches(6.95), Inches(2.72), Inches(3), Inches(0.3),
    size=10, bold=True, color=YELLOW)
next_items = [
    ("50",   "Beta users onboarded",   "Scaling from 10 → 50 active researchers"),
    ("5+",   "Video testimonials",     "Professor + PhD scholar validation videos"),
    ("100",  "Paid users target",      "First ₹1L+ MRR from organic conversion"),
    ("3",    "University pilots",      "Initial institutional conversations"),
]
for i, (stat, lbl, desc) in enumerate(next_items):
    top = Inches(3.15 + i * 0.88)
    txb(sl, stat, Inches(6.95), top, Inches(0.9), Inches(0.4), size=22, bold=True, color=YELLOW)
    txb(sl, lbl,  Inches(7.95), top, Inches(4.8), Inches(0.3), size=12, bold=True, color=WHITE)
    txb(sl, desc, Inches(7.95), top + Inches(0.32), Inches(4.8), Inches(0.3), size=9, color=MUTED)
    if i < 3:
        rect(sl, Inches(6.95), top + Inches(0.82), Inches(5.8), Inches(0.02),
             fill_color=RGBColor(0x30,0x28,0x00))
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 12 — Roadmap
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 12, "ROADMAP")
section_tag(sl, "THE ROADMAP")
txb(sl, "From MVP to market leader — in 18 months.",
    Inches(0.4), Inches(1.35), Inches(10), Inches(0.75), size=38, bold=True, color=WHITE)
txb(sl, "A focused, milestone-driven plan from where we are today to a category-defining position.",
    Inches(0.4), Inches(2.1), Inches(10), Inches(0.4), size=14, color=MUTED)

phases = [
    ("Phase 1", "Q2–Q3 2026",       "Validate & Refine",  GREEN,
     ["100 paid users (₹1L+ MRR)", "5+ video testimonials", "Product-market fit signals", "Feature prioritisation"]),
    ("Phase 2", "Q4 2026 – Q1 2027","Scale & Expand",     YELLOW,
     ["Mobile apps (iOS + Android)", "First 3 university pilots", "1,000 paid users (₹10L+ MRR)", "Hindi language support"]),
    ("Phase 3", "Q2–Q4 2027",       "Institutional Play", BLUE,
     ["10,000+ active users", "10+ institutional contracts", "Team scale to 15", "Series A fundraising"]),
]
for i, (phase, q, title, color, items) in enumerate(phases):
    lft = Inches(0.4 + i * 4.3)
    top = Inches(2.6)
    r = rect(sl, lft, top, Inches(4.1), Inches(4.1),
             fill_color=RGBColor(0x12,0x17,0x28), line_color=color)
    r.line.width = Pt(2)
    txb(sl, phase, lft + Inches(0.2), top + Inches(0.15), Inches(2), Inches(0.3),
        size=10, bold=True, color=color)
    txb(sl, q, lft + Inches(2.2), top + Inches(0.15), Inches(1.75), Inches(0.3),
        size=9, color=MUTED, align=PP_ALIGN.RIGHT)
    txb(sl, title, lft + Inches(0.2), top + Inches(0.55), Inches(3.8), Inches(0.42),
        size=16, bold=True, color=WHITE)
    for j, item in enumerate(items):
        txb(sl, f"›  {item}", lft + Inches(0.2), top + Inches(1.15 + j * 0.65),
            Inches(3.8), Inches(0.5), size=12, color=RGBColor(0xCC,0xCC,0xDD))
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 13 — Founder
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 13, "FOUNDER")
section_tag(sl, "WHO'S BUILDING THIS")
txb(sl, "Built by someone who lived the problem.",
    Inches(0.4), Inches(1.35), Inches(10), Inches(0.75), size=38, bold=True, color=WHITE)

# Founder card (left)
r = rect(sl, Inches(0.4), Inches(2.55), Inches(3.8), Inches(4.3),
         fill_color=RGBColor(0x18,0x14,0x00), line_color=YELLOW)
# Avatar placeholder
av = rect(sl, Inches(1.4), Inches(2.75), Inches(1.8), Inches(1.8),
          fill_color=RGBColor(0x50,0x3C,0x00), line_color=YELLOW)
txb(sl, "AK", Inches(1.4), Inches(2.85), Inches(1.8), Inches(1.5),
    size=42, bold=True, color=BLACK, align=PP_ALIGN.CENTER)
txb(sl, "Anish Krisna S", Inches(0.55), Inches(4.65), Inches(3.5), Inches(0.45),
    size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
txb(sl, "Founder & CEO", Inches(0.55), Inches(5.15), Inches(3.5), Inches(0.3),
    size=10, bold=True, color=YELLOW, align=PP_ALIGN.CENTER)
rect(sl, Inches(0.55), Inches(5.55), Inches(3.5), Inches(0.02),
     fill_color=RGBColor(0x40,0x30,0x00))
txb(sl, "EDUCATION: MS in Data Science", Inches(0.55), Inches(5.65), Inches(3.5), Inches(0.28),
    size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
txb(sl, "EXPERIENCE: 11 Years cross-functional", Inches(0.55), Inches(5.98), Inches(3.5), Inches(0.28),
    size=9, bold=True, color=YELLOW, align=PP_ALIGN.CENTER)

# Skills (right)
skills = [("📊", "Analytics", "Data-driven product decisions"),
          ("📣", "Marketing",  "Brand, growth & demand gen"),
          ("🛠️", "Product",    "End-to-end product building")]
for i, (icon, skill, desc) in enumerate(skills):
    lft = Inches(4.6 + i * 2.95)
    r = rect(sl, lft, Inches(2.6), Inches(2.75), Inches(1.6),
             fill_color=RGBColor(0x12,0x17,0x28), line_color=RGBColor(0x25,0x2A,0x40))
    txb(sl, icon, lft + Inches(0.15), Inches(2.75), Inches(0.55), Inches(0.5), size=24)
    txb(sl, skill, lft + Inches(0.15), Inches(3.35), Inches(2.5), Inches(0.35),
        size=13, bold=True, color=WHITE)
    txb(sl, desc, lft + Inches(0.15), Inches(3.75), Inches(2.5), Inches(0.3),
        size=9, color=MUTED)

# Mission quote
qr = rect(sl, Inches(4.6), Inches(4.45), Inches(8.75), Inches(1.5),
          fill_color=RGBColor(0x18,0x14,0x00), line_color=YELLOW)
txb(sl, "MISSION", Inches(4.75), Inches(4.58), Inches(5), Inches(0.25),
    size=9, bold=True, color=YELLOW)
txb(sl, '"Build the operating system for academic work — so India\'s brightest minds spend their time on insight, not on busywork."',
    Inches(4.75), Inches(4.9), Inches(8.4), Inches(0.9), size=13, color=WHITE)

txb(sl, "Founded Dynamo AI after seeing first-hand how fragmented academic tools were stealing thousands of hours from researchers across India.",
    Inches(4.6), Inches(6.1), Inches(8.75), Inches(0.55), size=11, color=MUTED)
footer(sl)


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDE 14 — The Ask
# ═══════════════════════════════════════════════════════════════════════════════
sl = add_slide()
header(sl, 14, "THE ASK")
section_tag(sl, "WHAT WE NEED FROM YOU")
txb(sl, "Let's build India's academic operating system — together.",
    Inches(0.4), Inches(1.35), Inches(11), Inches(0.75), size=34, bold=True, color=WHITE)
txb(sl, "We have the product, the vision, and early traction. We're looking for the right partners to scale.",
    Inches(0.4), Inches(2.1), Inches(10), Inches(0.4), size=14, color=MUTED)

asks = [
    ("🎓", "Mentorship",            "Strategic guidance from founders who've scaled SaaS in India"),
    ("🚀", "Incubation",            "Workspace, infrastructure, and ecosystem support"),
    ("🏛️", "Academic Partnerships", "Warm intros to universities & research institutions"),
    ("🧪", "Pilot Institutions",    "3–5 partner institutions for institutional MVP"),
    ("🧭", "Strategic Guidance",    "Go-to-market, hiring, and fundraising playbooks"),
]
for i, (icon, title, desc) in enumerate(asks):
    lft = Inches(0.4 + i * 2.58)
    top = Inches(2.65)
    r = rect(sl, lft, top, Inches(2.4), Inches(2.8),
             fill_color=RGBColor(0x18,0x14,0x00), line_color=RGBColor(0x60,0x45,0x00))
    txb(sl, icon, lft + Inches(0.1), top + Inches(0.2), Inches(2.2), Inches(0.55),
        size=28, align=PP_ALIGN.CENTER)
    txb(sl, title, lft + Inches(0.1), top + Inches(0.9), Inches(2.2), Inches(0.38),
        size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    txb(sl, desc, lft + Inches(0.1), top + Inches(1.35), Inches(2.2), Inches(1.1),
        size=9, color=MUTED, align=PP_ALIGN.CENTER)

# CTA
r = rect(sl, Inches(0.4), Inches(5.85), Inches(12.5), Inches(0.85),
         fill_color=RGBColor(0x20,0x19,0x00), line_color=YELLOW)
txb(sl, "LET'S TALK", Inches(0.6), Inches(5.92), Inches(2), Inches(0.28),
    size=9, bold=True, color=YELLOW)
txb(sl, "Try it live · See the product · Then decide.",
    Inches(0.6), Inches(6.22), Inches(5), Inches(0.35), size=16, bold=True, color=WHITE)
txb(sl, "Demo: app.dynamoai.in", Inches(8.5), Inches(5.95), Inches(3.9), Inches(0.28),
    size=11, color=WHITE)
txb(sl, "Email: anish@dynamoai.in", Inches(8.5), Inches(6.28), Inches(3.9), Inches(0.28),
    size=11, color=WHITE)

txb(sl, "⚡   THANK YOU   ⚡",
    Inches(0), Inches(7.0), Inches(13.33), Inches(0.38),
    size=20, bold=True, color=YELLOW, align=PP_ALIGN.CENTER)

# ── Save ──────────────────────────────────────────────────────────────────────
out = "Dynamo_AI_Pitch_Deck.pptx"
prs.save(out)
print(f"✅ Saved: {out}  ({os.path.getsize(out)//1024} KB)")
