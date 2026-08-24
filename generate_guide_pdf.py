"""Generate Dynamo AI How-To Guide PDF using reportlab."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

YELLOW   = colors.HexColor('#FBBF24')
YELLOW_L = colors.HexColor('#FEF3C7')
DARK     = colors.HexColor('#111827')
GRAY     = colors.HexColor('#6B7280')
GRAY_L   = colors.HexColor('#F3F4F6')
BLUE     = colors.HexColor('#2563EB')
BLUE_L   = colors.HexColor('#DBEAFE')
PURPLE   = colors.HexColor('#7C3AED')
PURPLE_L = colors.HexColor('#F3E8FF')
GREEN    = colors.HexColor('#16A34A')
GREEN_L  = colors.HexColor('#F0FDF4')
WHITE    = colors.white
BORDER   = colors.HexColor('#E5E7EB')

OUT = '/home/runner/workspace/Dynamo_AI_User_Guide.pdf'
doc = SimpleDocTemplate(OUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.5*cm, bottomMargin=1.8*cm)
W = A4[0] - 4*cm

def sty(name, **kw):
    return ParagraphStyle(name, **kw)

S_H1   = sty('H1',  fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=DARK,   spaceBefore=16, spaceAfter=6)
S_H2   = sty('H2',  fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=DARK,   spaceBefore=10, spaceAfter=4)
S_H3   = sty('H3',  fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=DARK,   spaceBefore=6,  spaceAfter=2)
S_BODY = sty('B',   fontName='Helvetica',       fontSize=10, leading=14, textColor=DARK,   spaceAfter=4,   alignment=TA_JUSTIFY)
S_SM   = sty('SM',  fontName='Helvetica',       fontSize=9,  leading=12, textColor=GRAY,   spaceAfter=2)
S_BOLD = sty('BO',  fontName='Helvetica-Bold',  fontSize=10, leading=14, textColor=DARK,   spaceAfter=2)
S_TIP  = sty('TI',  fontName='Helvetica',       fontSize=9,  leading=13, textColor=colors.HexColor('#166534'), spaceAfter=3)
S_CEN  = sty('CE',  fontName='Helvetica',       fontSize=10, leading=14, textColor=DARK,   alignment=TA_CENTER, spaceAfter=3)
S_WHI  = sty('WH',  fontName='Helvetica-Bold',  fontSize=10, leading=14, textColor=WHITE,  alignment=TA_CENTER)
S_STEP = sty('ST',  fontName='Helvetica-Bold',  fontSize=8,  leading=10, textColor=colors.HexColor('#92400E'))

def HR():
    return HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=14, spaceBefore=6)

def step_pill(n):
    p = Paragraph(f'STEP {n}', S_STEP)
    t = Table([[p]], colWidths=[2*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), YELLOW_L),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, YELLOW),
    ]))
    return t

def tip_box(text):
    t = Table([[Paragraph(f'<b>Tip:</b> {text}', S_TIP)]], colWidths=[W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GREEN_L),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEAFTER', (0,0), (0,-1), 3, GREEN),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BBF7D0')),
    ]))
    return t

def step_row(num, title, desc):
    num_sty = sty(f'N{num}x', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=WHITE, alignment=TA_CENTER)
    num_p = Paragraph(f'<b>{num}</b>', num_sty)
    num_t = Table([[num_p]], colWidths=[0.65*cm], rowHeights=[0.65*cm])
    num_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), YELLOW),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    text = [Paragraph(f'<b>{title}</b>', S_BOLD)]
    if desc:
        text.append(Paragraph(desc, S_SM))
    t = Table([[num_t, text]], colWidths=[0.9*cm, W-1.0*cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,1), (0,-1), 8),
    ]))
    return t

def feat_card(icon, title, badge, desc, bg=BLUE_L, fg=BLUE):
    badge_str = f'  <font color="#ffffff"><b> {badge} </b></font>' if badge else ''
    hdr = Paragraph(f'<b>{icon} {title}</b>{badge_str}', S_H3)
    desc_p = Paragraph(desc, S_SM)
    t = Table([[hdr], [desc_p]], colWidths=[W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), bg),
        ('BACKGROUND', (0,1), (0,1), WHITE),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    return t

def grid_table(headers, rows, col_widths):
    data = [[Paragraph(f'<b>{h}</b>', S_BOLD) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), S_SM) for c in row])
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), YELLOW_L),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, GRAY_L]),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return t

def add_header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(YELLOW)
    canvas.rect(0, A4[1]-1.1*cm, A4[0], 1.1*cm, fill=1, stroke=0)
    canvas.setFillColor(DARK)
    canvas.setFont('Helvetica-Bold', 10)
    canvas.drawString(2*cm, A4[1]-0.75*cm, 'Dynamo AI -- Complete User Guide')
    canvas.setFont('Helvetica', 9)
    canvas.drawRightString(A4[0]-2*cm, A4[1]-0.75*cm, f'Page {doc.page}')
    canvas.setFillColor(GRAY_L)
    canvas.rect(0, 0, A4[0], 0.7*cm, fill=1, stroke=0)
    canvas.setFillColor(GRAY)
    canvas.setFont('Helvetica', 8)
    canvas.drawCentredString(A4[0]/2, 0.22*cm, 'app.dynamoai.in  |  2026 Dynamo AI  |  All rights reserved')
    canvas.restoreState()

# ═══════════════════════════════════════════════════════════
story = []

# COVER
story.append(Spacer(1, 1.5*cm))
cover = Table([[
    Paragraph('<b>Dynamo AI</b>', sty('CT', fontName='Helvetica-Bold', fontSize=32, leading=38, textColor=DARK)),
]], colWidths=[W])
cover.setStyle(TableStyle([
    ('LINEBELOW', (0,0), (-1,0), 4, YELLOW),
    ('BOTTOMPADDING', (0,0), (-1,-1), 12),
]))
story.append(cover)
story.append(Paragraph('Complete User Guide', sty('CS', fontName='Helvetica', fontSize=16, leading=20, textColor=GRAY, spaceAfter=4)))
story.append(Paragraph('Step-by-step instructions for every feature -- from sign-up to advanced research tools.', sty('CD', fontName='Helvetica', fontSize=11, leading=15, textColor=GRAY, spaceAfter=20, alignment=TA_JUSTIFY)))
story.append(Spacer(1, 0.5*cm))

toc_items = [
    ('1', 'Creating Your Account (Sign Up)'),
    ('2', 'Logging In'),
    ('3', 'The Main Interface Tour'),
    ('4', 'Choosing a Mode -- Fast / DeepThink / Research / Deep Research'),
    ('5', 'The Tools Menu (gear button)'),
    ('6', 'Left Sidebar'),
    ('7', 'How to Chat'),
    ('8', 'Research Features'),
    ('9', 'Study Tools'),
    ('10', 'Create Tools'),
    ('11', 'AI Detector and Plagiarism Checker'),
    ('12', 'Your Profile'),
    ('13', 'Organising Chats and Folders'),
    ('14', 'Plan Comparison and Pricing'),
]
toc_rows = [[Paragraph('<b>Contents</b>', S_H2)]]
for num, name in toc_items:
    toc_rows.append([Paragraph(f'<b>{num}.</b>  {name}', S_BODY)])
toc_t = Table(toc_rows, colWidths=[W])
toc_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,0), YELLOW_L),
    ('BACKGROUND', (0,1), (-1,-1), WHITE),
    ('BOX', (0,0), (-1,-1), 1.5, YELLOW),
    ('LINEBELOW', (0,0), (-1,0), 1, YELLOW),
    ('LEFTPADDING', (0,0), (-1,-1), 14),
    ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(toc_t)
story.append(PageBreak())

# ── SECTION 1: SIGN UP ──────────────────────────────────────────────────────
story.append(step_pill(1))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Creating Your Account', S_H1))
story.append(Paragraph('Two ways to sign up -- Google (fastest, recommended) or email and password.', S_BODY))
story.append(Spacer(1, 0.2*cm))
story.append(step_row('1', 'Click Sign up', 'Top-right corner of the Dynamo AI homepage.'))
story.append(step_row('2', 'Choose your method', 'Google Sign Up: one tap, no password needed -- recommended for speed. Email: enter your name, email address, and create a password.'))
story.append(step_row('3', 'Free plan activated', 'Free accounts start with 10 messages per day. Upgrade anytime from your profile.'))
story.append(Spacer(1, 0.2*cm))
story.append(tip_box('Google Sign Up is fastest -- no email verification needed. Your Google name and photo import automatically.'))
story.append(HR())

# ── SECTION 2: LOG IN ───────────────────────────────────────────────────────
story.append(step_pill(2))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Logging In', S_H1))
story.append(Paragraph('Return to Dynamo AI at any time and sign back in with the same method you used to sign up.', S_BODY))
story.append(Spacer(1, 0.2*cm))
story.append(step_row('1', 'Click Log in', 'Top-right of the homepage.'))
story.append(step_row('2', 'Google login (recommended)', 'Click Continue with Google, select your account -- signed in within 2 seconds.'))
story.append(step_row('3', 'Email login', 'Enter your email and password, then click Log in. Use Forgot password if needed.'))
story.append(step_row('4', 'Your chats reload automatically', 'All previous chats, folders, memories, and documents restore instantly.'))
story.append(HR())

# ── SECTION 3: INTERFACE ────────────────────────────────────────────────────
story.append(step_pill(3))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('The Main Interface', S_H1))
story.append(Paragraph('Dynamo AI has three zones: the Sidebar (left), Chat Area (centre), and Composer Bar (bottom).', S_BODY))
story.append(Spacer(1, 0.2*cm))

zones = [
    ('Left Sidebar', BLUE_L, 'Search chats, create new chats, quick tools (Export, Smart Actions, AI Detector), chat history, folder tabs, and your account at the bottom.'),
    ('Suggestion Chips', YELLOW_L, 'Tap any chip to instantly start -- Make a study guide, Research a topic, Quiz me, Flashcards, Summarise a PDF, Create a deck.'),
    ('Composer Bar', PURPLE_L, 'Type your message, attach files (+ button), choose mode and tools (gear button), use voice (mic), and send (up-arrow button).'),
]
for label, bg, desc in zones:
    row = [[
        Paragraph(f'<b>{label}</b>', sty(f'ZL{label}', fontName='Helvetica-Bold', fontSize=10, textColor=DARK)),
        Paragraph(desc, S_SM)
    ]]
    t = Table(row, colWidths=[3.2*cm, W-3.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), bg),
        ('BACKGROUND', (1,0), (1,0), WHITE),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.15*cm))
story.append(HR())

# ── SECTION 4: MODES ────────────────────────────────────────────────────────
story.append(step_pill(4))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Choosing a Mode', S_H1))
story.append(Paragraph('Tap the + button (golden border, bottom-left of the composer) to open the Mode selector.', S_BODY))
story.append(Spacer(1, 0.2*cm))

story.append(grid_table(
    ['Mode', 'Who gets it', 'Best for'],
    [
        ['Fast Mode (default)', 'All plans (Free: lite model; Plus/Pro: Gemini 3.5-Flash)', 'Everyday questions, quick answers, general chatting.'],
        ['DeepThink Mode', 'Pro only', 'Complex analysis, essays, exam deep-dives. Forces step-by-step reasoning.'],
        ['Research Mode', 'Plus and Pro', 'Academic writing. Three-model pipeline: Claude Sonnet extracts, Gemini analyses, GPT-5.4 writes -- with live web search.'],
        ['Deep Research Agent', 'Pro only', 'Autonomous agent that browses the web and writes a full literature review (3-8 minutes).'],
    ],
    [4.5*cm, 4*cm, W-9*cm]
))
story.append(Spacer(1, 0.2*cm))
story.append(tip_box('DeepThink uses the same AI model as Fast Mode but with a special reasoning prompt. It costs daily messages, not extra money.'))
story.append(HR())

# ── SECTION 5: TOOLS MENU ───────────────────────────────────────────────────
story.append(step_pill(5))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('The Tools Menu', S_H1))
story.append(Paragraph('The gear button (next to + in the composer) opens all specialised tools.', S_BODY))
story.append(Spacer(1, 0.2*cm))

story.append(grid_table(
    ['Tool', 'Plan', 'What it does'],
    [
        ['Quick study guide', 'All', 'Generate a structured, exam-ready study guide for any topic.'],
        ['Radio Mode', 'All', 'Dynamo reads its answers aloud. Hands-free studying on the go.'],
        ['Quiz me', 'All', '5 multiple-choice questions on any subject to test yourself.'],
        ['Flashcards', 'All', 'Auto-generate spaced-repetition flip cards from any content.'],
        ['Generate Image', 'Plus/Pro', 'Describe any image -- Dynamo creates it instantly via Pollinations AI.'],
        ['Generate Video', 'Plus/Pro', 'Create short AI-animated clips from text descriptions.'],
        ['Mindmap', 'All', 'Any topic becomes an interactive, exportable mindmap.'],
        ['Flowchart', 'All', 'Describe a process in plain English and get a clean flowchart.'],
        ['Executive deck', 'All', '8-12 slide polished presentation, downloadable as PPTX.'],
    ],
    [4*cm, 2.2*cm, W-6.5*cm]
))
story.append(HR())

# ── SECTION 6: SIDEBAR ──────────────────────────────────────────────────────
story.append(step_pill(6))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Left Sidebar', S_H1))
story.append(Paragraph('Everything to stay organised -- chat history, folders, quick tools, and your account.', S_BODY))
story.append(Spacer(1, 0.2*cm))

sidebar_items = [
    ('Search chats', 'Type any keyword to instantly find a past conversation.'),
    ('New Chat', 'Start a fresh conversation. Your current chat is auto-saved.'),
    ('Export / Save', 'Download the current chat as a PDF or DOCX file.'),
    ('Smart Actions', 'Summarise or explain the last AI answer with one click.'),
    ('AI and Plagiarism', 'Open the AI detector, plagiarism checker, and humanizer tools.'),
    ('Chats tab', 'All recent chats in chronological order. Click any to open it.'),
    ('Folders tab', 'Create folders (e.g. Physics Notes) and move chats into them.'),
    ('Your account (bottom)', 'Click your name to open Profile -- manage plan, quota, memory, and documents.'),
]
for label, desc in sidebar_items:
    story.append(step_row('>', label, desc))
story.append(HR())

# ── SECTION 7: CHATTING ─────────────────────────────────────────────────────
story.append(step_pill(7))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('How to Chat', S_H1))
story.append(Paragraph('The main chat area handles questions, file analysis, formatted answers, code, citations, and more.', S_BODY))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph('<b>Typing a message</b>', S_H2))
story.append(step_row('1', 'Click the text box and type your question.', ''))
story.append(step_row('2', 'Press Enter or click the send button.', ''))
story.append(step_row('3', 'Dynamo responds with formatted markdown.', 'Headings, bullet points, code blocks, tables, and citations -- all rendered beautifully.'))

story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('<b>Uploading a file</b>', S_H2))
story.append(step_row('1', 'Click the + button, then Add photos and files.', ''))
story.append(step_row('2', 'Choose a PDF, DOCX, TXT, or image from your device.', ''))
story.append(step_row('3', 'Type your question about it.', 'e.g. Summarise this paper  or  Find the key arguments.'))
story.append(step_row('4', 'A Remember this chip appears.', 'Click it to save the file to your Document Library for future sessions.'))

story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('<b>Web Search</b>', S_H2))
story.append(step_row('1', 'Click + then toggle Web search ON.', ''))
story.append(step_row('2', 'Ask anything about current events, latest research, prices, or news.', ''))
story.append(step_row('3', 'Dynamo searches Tavily and answers with cited sources.', ''))
story.append(Spacer(1, 0.2*cm))
story.append(tip_box('Web Search can be combined with any mode -- turn it on in Research Mode for even deeper multi-model sourced reports.'))
story.append(HR())

# ── SECTION 8: RESEARCH ─────────────────────────────────────────────────────
story.append(step_pill(8))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Research Features', S_H1))
story.append(Paragraph('Four dedicated tools for academic research -- from quick reports to autonomous deep dives.', S_BODY))
story.append(Spacer(1, 0.2*cm))

research_feats = [
    ('Research Mode', 'PLUS', BLUE_L,
     'Three-stage pipeline: (1) Tavily fetches 10+ live web sources. (2) Claude Sonnet 4.5 extracts key facts and arguments. (3) Gemini analyses and synthesises. (4) GPT-5.4 writes the final report in your chosen citation format (APA 7th, MLA 9th, Chicago 17th, Harvard, IEEE, Vancouver, ACS, ASA). How to use: click + then select Research Mode, type your topic, and send.'),
    ('Deep Research Agent', 'PRO', PURPLE_L,
     'An autonomous AI agent that browses the web, evaluates sources, and produces a full literature-review-style report. Takes 3-8 minutes. Watch live progress updates in the chat. Output is a structured, cited report downloadable as DOCX. How to use: click + then Deep Research Agent, type topic, send.'),
    ('Citation Checker', 'PLUS', BLUE_L,
     'Paste your references and choose a format (APA, MLA, IEEE, Harvard, etc.). Dynamo verifies DOIs, fixes formatting errors, converts between styles, and flags broken references. Find it in the sidebar under Quick Tools then Export / Save.'),
    ('Research Watcher', 'PRO', PURPLE_L,
     'Define topics to monitor. Every 24 hours Dynamo searches the web and notifies you if genuinely new developments appear. Find it in Quick Tools then Smart Actions then Watch a topic.'),
]
for title, badge, bg, desc in research_feats:
    story.append(feat_card('', title, badge, desc, bg))
    story.append(Spacer(1, 0.2*cm))
story.append(HR())

# ── SECTION 9: STUDY TOOLS ──────────────────────────────────────────────────
story.append(step_pill(9))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Study Tools', S_H1))
story.append(Paragraph('Everything a student needs -- study guides, quizzes, flashcards, and Radio Mode.', S_BODY))
story.append(Spacer(1, 0.2*cm))

story.append(grid_table(
    ['Tool', 'How to access', 'What it does'],
    [
        ['Study Guide', 'Tools menu then Quick study guide  |  or type: Make a study guide on [topic]', 'Structured, exam-ready notes for any topic or pasted text.'],
        ['Quiz Me', 'Tools menu then Quiz me  |  or type: Quiz me on [topic]', '5 multiple-choice questions. Answers revealed after you respond.'],
        ['Flashcards', 'Tap the Flashcards chip on the homepage', 'Flip-card flashcards auto-generated from any topic or uploaded notes.'],
        ['Radio Mode', 'Tools menu then Radio mode', 'AI reads its answers aloud. Responses auto-play as natural speech.'],
    ],
    [3.5*cm, 5*cm, W-9*cm]
))
story.append(HR())

# ── SECTION 10: CREATE TOOLS ────────────────────────────────────────────────
story.append(step_pill(10))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Create Tools', S_H1))
story.append(Paragraph('Generate images, videos, mindmaps, flowcharts, and presentation decks from a text description.', S_BODY))
story.append(Spacer(1, 0.2*cm))

story.append(grid_table(
    ['Tool', 'Plan', 'Access and description'],
    [
        ['Image Generation', 'Plus/Pro', 'Tools then Generate Image  |  or type: generate an image of...  Dynamo creates it instantly.'],
        ['Video Generation', 'Plus/Pro', 'Tools then Generate Video  |  Short AI-animated clips from text descriptions.'],
        ['Mindmap', 'All', 'Tools then Mindmap  |  or type: create a mindmap on...  Interactive and exportable.'],
        ['Flowchart', 'All', 'Tools then Flowchart  |  or type: make a flowchart for...  Clean downloadable diagram.'],
        ['Executive Deck', 'All', 'Tools then Executive deck  |  or tap Create a deck chip. 8-12 slides, downloadable as PPTX.'],
        ['Summarise a PDF', 'All', 'Tap the Summarise a PDF chip, then upload your file. Get a structured key-points summary.'],
    ],
    [3.5*cm, 2*cm, W-6*cm]
))
story.append(HR())

# ── SECTION 11: AI DETECTOR ─────────────────────────────────────────────────
story.append(step_pill(11))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('AI Detector and Plagiarism Checker', S_H1))
story.append(Paragraph('In-house detection using Gemini 3.5-Flash -- no third-party API cost. Available to Plus and Pro. Access: Sidebar then AI and Plagiarism.', S_BODY))
story.append(Spacer(1, 0.2*cm))

detector_feats = [
    ('AI Text Detector', 'PLUS',
     'Paste any text and get a 0-100 AI score with a label (Human / Uncertain / AI-Generated) and 3-5 specific signals explaining the decision. Also shows a sentence-by-sentence heatmap.'),
    ('Humanizer', 'PLUS',
     'AI-generated text is rewritten to preserve meaning and academic register while adding natural hedging, varied sentences, and personal voice -- so it passes AI detection.'),
    ('Plagiarism Checker', 'PLUS',
     'Searches the web and 200M+ academic papers (Semantic Scholar). Scores true similarity 0-100%, separating common terminology from actually copied content, with source links.'),
    ('Self-Plagiarism Check', 'PLUS',
     'Submit two documents (current paper and prior work) to identify overlapping passages with a practical recommendation on what to rephrase.'),
]
for title, badge, desc in detector_feats:
    story.append(feat_card('', title, badge, desc, BLUE_L))
    story.append(Spacer(1, 0.2*cm))
story.append(HR())

# ── SECTION 12: PROFILE ─────────────────────────────────────────────────────
story.append(step_pill(12))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Your Profile', S_H1))
story.append(Paragraph('Click your name or avatar at the bottom of the left sidebar to open the Profile modal.', S_BODY))
story.append(Spacer(1, 0.2*cm))

profile_items = [
    ('Usage and Plan', 'See daily messages used vs limit, image count, and video count. Shows your current plan (Free / Plus / Pro) and an Upgrade button.'),
    ('Edit name and password', 'Update your display name or change your login password at any time.'),
    ('AI Memory (Plus)', 'View and delete the personal facts Dynamo has learned from past conversations. Memories are auto-injected into every new session.'),
    ('Document Library (Plus)', 'Upload PDFs, DOCX or TXT files permanently. Dynamo summarises them and references them in every future chat -- no re-uploading needed.'),
    ('Upgrade Plan', 'Choose Plus (399 INR/mo, 100 msg/day) or Pro (999 INR/mo, 300 msg/day). Pay via Razorpay -- cards, UPI, and wallets supported.'),
    ('Log out', 'Securely log out from the bottom of the profile modal.'),
]
for label, desc in profile_items:
    story.append(step_row('>', label, desc))
story.append(HR())

# ── SECTION 13: FOLDERS ─────────────────────────────────────────────────────
story.append(step_pill(13))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Organising Chats and Folders', S_H1))
story.append(Paragraph('Keep your research organised by grouping chats into named folders.', S_BODY))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph('<b>Creating a folder</b>', S_H2))
story.append(step_row('1', 'Click the Folders tab in the sidebar.', ''))
story.append(step_row('2', 'Click New Folder button.', ''))
story.append(step_row('3', 'Type a name such as Thesis 2026 or Physics Notes.', ''))
story.append(step_row('4', 'Press Enter to save.', ''))

story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('<b>Moving a chat into a folder</b>', S_H2))
story.append(step_row('1', 'In the Chats tab, hover over a chat.', ''))
story.append(step_row('2', 'Click the ... menu that appears.', ''))
story.append(step_row('3', 'Select Move to folder and choose your folder.', ''))
story.append(Spacer(1, 0.2*cm))
story.append(tip_box('The Chats tab always shows ALL your chats (including those inside folders) as a flat list -- great for finding recent conversations quickly.'))
story.append(HR())

# ── SECTION 14: PLAN COMPARISON ─────────────────────────────────────────────
story.append(step_pill(14))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Plan Comparison and Pricing', S_H1))
story.append(Spacer(1, 0.2*cm))

plan_headers = ['Feature', 'Free', 'Plus  399/mo', 'Pro  999/mo']
plan_rows = [
    ['Daily chat messages',    '10',           '100',              '300'],
    ['Fast Mode AI quality',   'Lite model',   'Gemini 3.5-Flash', 'Gemini 3.5-Flash'],
    ['AI Memory',              '--',           'Yes',              'Yes'],
    ['Document Library',       '--',           'Yes',              'Yes'],
    ['Research Mode',          '--',           'Yes',              'Yes'],
    ['AI Detector/Plagiarism', '--',           'Yes',              'Yes'],
    ['Image generation',       '--',           '25 per month',     '100 per month'],
    ['Video generation',       '--',           '5 per month',      '25 per month'],
    ['DeepThink Mode',         '--',           '--',               'Yes'],
    ['Deep Research Agent',    '--',           '--',               'Yes'],
    ['Research Watcher',       '--',           '--',               'Yes'],
    ['Quota reset',            'Daily midnight UTC', 'Daily midnight UTC', 'Daily midnight UTC'],
]
plan_t = Table(
    [[Paragraph(f'<b>{h}</b>', S_BOLD) for h in plan_headers]] +
    [[Paragraph(str(c), S_SM) for c in row] for row in plan_rows],
    colWidths=[5*cm, 2.5*cm, 3*cm, W-11*cm]
)
plan_t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), YELLOW_L),
    ('BACKGROUND', (2,0), (2,0), BLUE_L),
    ('BACKGROUND', (3,0), (3,0), PURPLE_L),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, GRAY_L]),
    ('BOX', (0,0), (-1,-1), 1, BORDER),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(plan_t)
story.append(Spacer(1, 0.6*cm))

cta = Table([[
    Paragraph('Ready to start? Visit app.dynamoai.in', sty('CTA', fontName='Helvetica-Bold', fontSize=14, textColor=DARK, alignment=TA_CENTER))
]], colWidths=[W])
cta.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), YELLOW),
    ('TOPPADDING', (0,0), (-1,-1), 16),
    ('BOTTOMPADDING', (0,0), (-1,-1), 16),
    ('LEFTPADDING', (0,0), (-1,-1), 12),
    ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ('BOX', (0,0), (-1,-1), 2, colors.HexColor('#D97706')),
]))
story.append(cta)

doc.build(story, onFirstPage=add_header, onLaterPages=add_header)
print(f'PDF saved: {OUT}')
