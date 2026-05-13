# Dynamo AI Platform

## Overview
Dynamo AI is a professional-grade Research Operating System. It combines a FastAPI backend ("The Brain") with a static HTML/JS/Tailwind CSS frontend ("The Face").

## Architecture
- **Frontend**: Static HTML/JS files served on port 5000 via Python's built-in HTTP server
- **Backend**: FastAPI (Python) API server running on port 8000 (localhost)

## Key Files
- `start.sh` — Startup script that launches both backend and frontend
- `serve_frontend.py` — Python static file server for the frontend
- `backend/main.py` — FastAPI application entry point
- `backend/config.py` — API key configuration (reads from environment variables)
- `frontend/Index.html` — Main HTML page; sets `window.BACKEND_URL` dynamically

## Environment Variables Required
- `GEMINI_API_KEY` — Google Gemini API key
- `GROQ_API_KEY` — Groq LPU API key
- `TAVILY_API_KEY` — Tavily search API key
- `SUPABASE_URL` — Supabase database URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key

## Backend Services Used
- **Groq** (Llama 3) — Fast AI inference
- **Google Gemini** — Default AI model
- **Tavily** — Web search
- **Supabase** — User data and chat history
- **Firebase** — Authentication
- **Pollinations AI** — Image generation

## AI Model Tiers (April 2026)
- **Fast Mode** (default): `gemini-3.1-flash-lite-preview` — fastest, cheapest
- **DeepThink** (`deep_dive=True`): `gemini-3-flash-preview` — built-in thinking, ~5x intelligence vs lite. `deep_dive` always wins over the default `model_name`. Falls back to lite if unavailable.
- **Research Mode** (`mode="research"`): APIMart-routed pipeline (Claude Sonnet 4.5 → Gemini 3.1 → GPT-5.4) via `multi_model_router.py` — DO NOT modify

## Composer Architecture (Split Two-Menu + Right-Side Flyouts, April 28, 2026)
Bottom input bar: textarea on top, action row below, single yellow-bordered wrapper (`frontend/Index.html` ~1364-1400).

**Action row** (left → right): `+` button · ⚙️ gear (Tools) · 🎙️ mic · (spacer) · ↑ send.

**`+` button** (`#plus-btn`, golden border) → `#plus-dropdown`:
- *Daily*: Add photos & files · Web search
- *Mode selector*: Fast (active) · Research [PLUS] · DeepThink [PRO] · **More ›** → right-side flyout `#mode-more-flyout` (Find research gaps · Deep research agent [SOON])

**⚙️ gear** (`#tools-btn`, gold dot indicator) → `#tools-dropdown`:
- *Study*: Quick study guide · Radio mode [NEW] · **More ›** → right-side flyout `#study-more-flyout` (Quiz me · Flashcards [SOON])
- *Create Anything*: Generate Image · Slides [SOON] · **More ›** → right-side flyout `#create-more-flyout` (Generate Video · Mindmaps · Flowcharts)

**ChatGPT-style flyouts**: `toggleSubMenu(id, btn)` in `ui.js` uses `position: fixed` + `getBoundingClientRect` to place flyout to the RIGHT of the parent dropdown. Parent dropdown stays open while a flyout is shown. `_closeAllFlyouts()` closes all `.menu-flyout` panels safely. Click-outside ignores clicks inside `.menu-flyout` and `.menu-more-row`.

**Mutual exclusion**: Opening `#plus-dropdown` auto-closes `#tools-dropdown` and vice versa, plus `_closeAllFlyouts()`.

**Mode sync**: `setMode(mode, btn)` updates all `[data-mode-btn]` elements. Legacy aliases: `toggleModePicker` → `togglePlus`, `closeModePicker` → `closePlus`.

**Mic** (`#mic-btn`): light-red. **Send**: yellow rounded.

**Suggestion chips** (`#hero-chips`): Make a study guide · Research a topic · Quiz me · ⚡ Flashcards · Summarise a PDF · 🎨 Create a deck.

Cache key: `ui.js?v=20260428m`. No backend restart needed (FastAPI serves frontend statically).

## Brand Asset (April 28, 2026)
New polished Dynamo bolt mark lives at `frontend/assets/dynamo-logo.png` (also mirrored in `artifacts/mockup-sandbox/public/images/dynamo-logo.png`). Used in:
- Hero (`Index.html` ~1126), Sidebar brand (~829), Auth modal (~1577).
- All references cache-busted via `?v=20260428a`.

## Sidebar Architecture (Variant C — Tabs, April 28, 2026)
Left sidebar uses a tabbed layout so Folders and Recents each get the full remaining height:
- **Tab switcher** (`#sb-tab-switcher`) sits below the Quick Tools accordions: two pill buttons (`#sb-tab-chats-btn`, `#sb-tab-folders-btn`) inside a rounded container, each with a count badge (`#sb-tab-chats-count`, `#sb-tab-folders-count`).
- **Panels** (`.sb-panel`): exactly one is visible at a time, controlled by the `.hidden` class.
  - `#sb-panel-chats` → `#history-list` (Pinned + Recent — shows ALL chats including those inside folders, so Recents is a flat backstop).
  - `#folders-section` → `#folders-list` + new-folder `+` button (rendered by `renderFolderSection`).
- **JS** (`sidebar.js`): `window.setSidebarTab(tab)` swaps `.hidden` + `.sb-tab-active`, persists choice to `localStorage("sb-tab")`. `window._updateSidebarTabCounts()` keeps badges fresh after every `loadChatSidebar` call. Initial tab restored on `DOMContentLoaded`.
- **Search** (`filterChats`) still rewrites `#history-list` so search works on the Chats tab.
- Cache: `sidebar.js?v=20260428a`.

## Tools Menu Architecture (v3 — April 28, 2026)
Compact, modern Tools dropdown defined inline in `Index.html` (~288px wide, Claude/ChatGPT style):
- **No uppercase section headers** — just thin `<div class="menu-divider">` lines between groups.
- **Modes** (mutually exclusive, show ✓ when active): Fast / DeepThink / Research (PRO)
  - Sub-row under DeepThink: "Find research gaps" — see below for behavior.
- **Sources** (toggles): Web search / Radio mode
- **Create** (prefills chat input): Image / Video / Mindmap / Flowchart / Executive deck
- **Study**: Study guide (opens modal), Quiz me
- **Coming soon**: Deep research agent (disabled placeholder)

### Find Research Gaps — actual behavior
NOT a toggle, NOT a chat-input prefill. It's a **post-reply analyser**:
1. User asks something (e.g. "explain blockchain") in DeepThink mode → gets normal answer.
2. User clicks "Find research gaps" in the Tools menu.
3. The function (`window.findResearchGaps()` in `chat.js`) takes the LAST assistant reply, sends it back to `/chat` with `use_search:true` + `deep_dive:true`, and asks Gemini to web-search recent papers and identify 3–5 gaps the original answer missed.
4. Output is a structured markdown list with: title / why it matters / what's missing / suggested angle / sources.

### Empty-state centered input (Gemini/Claude style)
- `body.chat-active` class is toggled by `hideHero()` / `showHero()` in `chat.js`.
- CSS rule `body:not(.chat-active) #input-bar { top: 50%; transform: translateY(20%); }` floats the input bar to the visual centre when chat is empty.
- Once the user sends their first message, the bar slides back to the bottom dock with a smooth transition.

### Other notes
- The 3 hero suggestion chips (AI Trends 2026 / Analyze Data / Create Image) have been removed.
- Study Guide modal sends with `smart_action:true` to bypass the quiz keyword router (the word "questions" would otherwise misroute).

Cache version: `ui.js?v=20260428c`, `chat.js?v=20260428c`
- **Edge TTS** — Text to speech
- **Razorpay** — Payment processing (Plus ₹199/mo, Pro ₹499/mo)

## Payment Integration
Razorpay integration in `backend/payments.py`. Endpoints:
- `POST /create-order` — Creates a Razorpay order (Plus/Pro plan)
- `POST /verify-payment` — Verifies HMAC-SHA256 signature, updates `users.plan`, inserts into `subscriptions`
- `POST /webhook` — Handles Razorpay async events (secondary safety net)

**Supabase migration needed** — Run this SQL in Supabase Dashboard (see `backend/init_db.sql`):
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plan TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);
```
Dashboard URL: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql/new

## Secrets Required
- `RAZORPAY_KEY_ID` — Razorpay public key
- `RAZORPAY_KEY_SECRET` — Razorpay secret key (for HMAC verification)
- `RAZORPAY_WEBHOOK_SECRET` — Razorpay webhook secret

## Quota / Freemium System

| Plan | Daily Chat | Images/Month | Videos/Month | Price |
|------|-----------|-------------|-------------|-------|
| Free | 10 | 0 | 0 | Free |
| Plus | 100 | 25 | 5 | ₹199/mo |
| Pro | 300 | 100 | 25 | ₹499/mo |

Quota enforcement is in `backend/supabase_client.py` (`check_image_quota`, `check_video_quota`, `check_user_quota`).
Image/video enforcement runs in `backend/main.py` before generation.
Frontend shows styled quota error cards with an "Upgrade Plan" link to `/pricing.html`.
Frontend `checkMessageLimit` in `chat.js` uses PLAN_LIMITS matching backend (free=10, plus=100, pro=300).

## AI Text Detector + Plagiarism Checker (May 2026)
In-house feature — no new API keys required. Uses existing Gemini + Tavily + Semantic Scholar.

- **Backend**: `backend/detector.py` — `detect_ai()` + `check_plagiarism()`
  - AI detection: Gemini analyses writing patterns, returns score 0–100 + label + signals
  - Plagiarism: Tavily web search + Semantic Scholar → Gemini scores similarity
- **Endpoints**: `POST /detect-ai` · `POST /check-plagiarism` (both in `main.py`)
- **Frontend**: `frontend/detector.js` — modal with two tabs (🤖 AI Detector / 📄 Plagiarism)
  - Results: visual score meter, colour-coded label, summary, evidence signals / sources list
- **Entry point**: Sidebar Quick Tools → "AI & Plagiarism" accordion → two sub-buttons
- Cache: `detector.js?v=20260513a`

## DrillBit Integration (Declined May 2026)
DrillBit's API was considered for plagiarism detection but declined due to cost (₹3.9–6L/year).
The in-house solution above covers the same use case using already-paid APIs.

## Document Library (May 2026)
Persistent document memory — users can save PDFs/DOCX/TXT to a per-user library; Dynamo AI injects summaries into every future chat automatically.

- **Backend**: `backend/documents.py` — summarize_document (Gemini), fetch/save/delete + format_docs_for_prompt
- **Endpoints**: `POST /save-document` · `GET /documents` · `DELETE /documents/{id}`
- **Integration**: `model.py` → `doc_context` param injected after memory in system prompt; `main.py` fetches docs alongside memories in every chat
- **Frontend**: `frontend/documents.js` — modal, doc cards, delete, _handleLibraryUpload, refreshDocCount
- **UI**: "Document Library" button in profile modal (after AI Memory); Documents modal with "Add document to library" footer upload; "Remember this" chip appears after file attach in chat
- **DB**: Requires `user_documents` table — see SQL in progress notes

## Bug Fixes (Pre-Launch - March 2026)

### Summarise Smart Action Fix
- **Root cause 1**: Backend keyword detection for flowchart (`steps`, `workflow`) / mindmap (`brainstorm`) ran on the FULL message payload including the text being summarized, causing misrouting.
- **Root cause 2**: Backend image keyword detection (`picture`, `visual`, etc.) also ran on full payload.
- **Fix**: Added `smart_action: bool = False` field to `ChatReq`. When `True`, skips all keyword routing (flowchart, mindmap, image detection). Smart action functions in `ui.js` (`smartSummarise`, `smartExplain`) now pass `smart_action: true`.
- **Root cause 3**: `loadChatHistory` in `sidebar.js` used `msg.content?.text` which only worked for `{text: "..."}` format, not plain string format. Messages sent by new backend code are plain strings, so chatHistory was populated with empty strings.
- **Fix**: Updated `sidebar.js` to handle both formats: `typeof rawContent === "string" ? rawContent : rawContent?.text`.

### Daily Quota Fix
- **Root cause**: Free test account had `plan: 'plus'` in DB (accidentally upgraded during testing), giving 100 msg/day limit instead of 10.
- **Fix**: Reset `anishkrisna6@gmail.com` plan to `free` via database update.
- **Secondary fix**: Frontend `checkMessageLimit` now uses correct limits (pro: 300, not 100).

**DB Migration Required**: The `users` table needs three new columns. Run `backend/migrate_quota_columns.sql` in the Supabase Dashboard SQL Editor.

## Development
The workflow `Start application` runs `bash start.sh` which:
1. Starts uvicorn (FastAPI) on localhost:8000
2. Starts Python static server on 0.0.0.0:5000

## Frontend API Configuration
`window.BACKEND_URL` is set dynamically in `Index.html` to use the current hostname with port 8000, allowing it to work in both dev (Replit proxy) and production environments.
