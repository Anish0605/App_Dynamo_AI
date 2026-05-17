# Dynamo AI — Changelog & Release Notes

> **India's AI Research Operating System** — Built for researchers, PhD scholars, and professors.
> Live at: [app.dynamoai.in](https://app.dynamoai.in)

---

## v2.5 — May 2026 · "Research Integrity Update"

### New Features

#### 🔍 AI Text Detector + Plagiarism Checker (In-House)
- Fully in-house tool — no third-party API subscription needed (declined DrillBit at ₹3.9–6L/year)
- **AI Detection**: Gemini analyses writing patterns → returns score 0–100 + label + evidence signals
- **Plagiarism Check**: Tavily web search + Semantic Scholar → Gemini scores similarity against sources
- Visual score meter, colour-coded labels, evidence list, and cited sources
- Accessible from Sidebar Quick Tools → "AI & Plagiarism" accordion
- Two tabs: 🤖 AI Detector / 📄 Plagiarism Checker
- Backend: `backend/detector.py` — `detect_ai()` + `check_plagiarism()`
- Frontend: `frontend/detector.js` (v=20260513a)
- Endpoints: `POST /detect-ai` · `POST /check-plagiarism`

#### 📂 Document Library — Persistent Document Memory
- Users save PDFs, DOCX, and TXT files to a per-user library
- Dynamo AI automatically injects document summaries into every future chat — no re-uploading ever
- Summarisation powered by Gemini; stored in new `user_documents` Supabase table
- "Remember this" chip appears after file attach in chat
- "Document Library" button added to profile modal
- Backend: `backend/documents.py` — `summarize_document()`, fetch/save/delete, `format_docs_for_prompt()`
- Frontend: `frontend/documents.js` — modal, doc cards, delete, `_handleLibraryUpload`, `refreshDocCount`
- Endpoints: `POST /save-document` · `GET /documents` · `DELETE /documents/{id}`
- System prompt injection: `backend/model.py` → `doc_context` param injected after memory

---

## v2.4 — April 28, 2026 · "Composer + Sidebar Architecture Overhaul"

### New Features

#### ⚙️ Composer Architecture v3 (Split Two-Menu + Right-Side Flyouts)
- New bottom input bar: textarea on top, action row below — matches Claude/ChatGPT UX patterns
- **`+` button** → Plus dropdown: Daily tools (file upload, web search) + Mode selector (Fast · Research · DeepThink · More ›)
- **⚙️ Gear button** → Tools dropdown: Study tools + Create tools + flyouts for each category
- ChatGPT-style right-side flyouts using `position: fixed` + `getBoundingClientRect`
- Mutual exclusion: opening `+` auto-closes ⚙️ and vice versa
- `toggleSubMenu(id, btn)` + `_closeAllFlyouts()` in `ui.js`

#### 🔍 Find Research Gaps (Post-Reply Analyser)
- **NOT** a chat prefill — it's a post-reply academic analyser (unique feature)
- Takes the LAST assistant reply, sends to `/chat` with `use_search:true` + `deep_dive:true`
- Searches recent papers and identifies 3–5 knowledge gaps with: title / why it matters / what's missing / suggested angle / sources
- `window.findResearchGaps()` in `chat.js`

#### 🗂️ Sidebar Architecture — Variant C (Tabs)
- Two-tab layout: **Chats** (Pinned + Recent flat list) and **Folders** (organised projects)
- Tab switcher with count badges; persisted to `localStorage("sb-tab")`
- `window.setSidebarTab(tab)` + `window._updateSidebarTabCounts()` in `sidebar.js`
- Folders: create, rename, move chats — backed by `migrate_folders.sql`

#### 🆕 New Brand Identity
- Polished Dynamo bolt mark at `frontend/assets/dynamo-logo.png`
- Cache-busted references via `?v=20260428a`

#### 🌟 Tools Menu v3
- Compact, modern dropdown (~288px wide)
- Modes (mutually exclusive, shows ✓ when active): Fast / DeepThink / Research [PRO]
- Sources toggles: Web search / Radio mode
- Create prefills: Image / Video / Mindmap / Flowchart / Executive deck
- Study: Study guide (modal) / Quiz me

#### 💡 Empty-State Centred Input (Gemini/Claude style)
- `body.chat-active` class toggled by `hideHero()` / `showHero()`
- Input bar floats to visual centre when chat is empty, slides to bottom on first message

---

## v2.3 — April 2026 · "Research Power Features"

### New Features

#### 📚 Citation Engine (Research Mode)
- 6 academic citation formats: APA 7, MLA, Chicago, Harvard, IEEE, Vancouver
- Automatically applied in Research Mode responses
- Implemented in `backend/multi_model_router.py`

#### 🧠 DeepThink v3
- Advanced reasoning using Gemini with chain-of-thought system prompts
- Structured, multi-perspective answers for complex academic questions
- ~5× intelligence vs Fast mode

#### 💳 Razorpay Payment Integration
- `POST /create-order` — creates Razorpay order (Plus/Pro plan)
- `POST /verify-payment` — HMAC-SHA256 signature verification, updates `users.plan`
- `POST /webhook` — async Razorpay event handler (secondary safety net)
- Plus: ₹199/mo · Pro: ₹499/mo

#### 📊 Quota / Freemium System
| Plan | Daily Chats | Images/Month | Videos/Month | Price |
|------|------------|-------------|-------------|-------|
| Free | 10 | 0 | 0 | Free |
| Plus | 100 | 25 | 5 | ₹199/mo |
| Pro | 300 | 100 | 25 | ₹499/mo |

- Enforcement in `backend/supabase_client.py`
- Frontend `checkMessageLimit` in `chat.js`
- Styled quota error cards with "Upgrade Plan" link

#### 🗂️ Chat Folders
- Create folders, rename, move chats into folders
- DB migration: `backend/migrate_folders.sql`

#### 🧠 AI Memory — Live Count Badge
- Memory bank count badge that updates in real-time
- DB migration: `backend/migrate_memory.sql`

---

## v2.2 — March 2026 · "Pre-Launch Fixes"

### Bug Fixes

- **Smart Action Keyword Bypass**: Added `smart_action: bool = False` to `ChatReq`. When `True`, skips all keyword routing (flowchart, mindmap, image). Fixes misrouting of Summarise and Explain Simply actions
- **Chat History Format Fix**: `loadChatHistory` in `sidebar.js` now handles both plain string and `{text: "..."}` message formats
- **Daily Quota Fix**: Frontend `checkMessageLimit` now uses correct plan limits (pro: 300, plus: 100, free: 10)

---

## Core Architecture

| Layer | Tech |
|-------|------|
| Frontend | Static HTML + Tailwind CSS + Vanilla JS |
| Backend | FastAPI (Python) on port 8000 |
| AI Models | Gemini 2.0 Flash (fast) · Gemini Pro (deep) · Claude Sonnet + GPT (research pipeline) |
| Database | Supabase (PostgreSQL) |
| Auth | Firebase |
| Search | Tavily API |
| Payments | Razorpay |
| TTS | Edge TTS |
| Images | Pollinations AI |
| Hosting | Replit → app.dynamoai.in |

---

## Contact

- Website: [app.dynamoai.in](https://app.dynamoai.in)
- Email: support@dynamoai.in
- Phone: +91 7200316800
- GitHub: [github.com/Anish0605/App_Dynamo_AI](https://github.com/Anish0605/App_Dynamo_AI)

---

*Dynamo AI — Proudly Made in India 🇮🇳 · Empowering Indian Academic Research*
