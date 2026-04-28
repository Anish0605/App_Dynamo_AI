# ⚡ Dynamo AI — The Research Operating System

> **"Power Your Curiosity."**
> Built in India. Priced for India. Designed for students, researchers, and thinkers.

**Live → [app.dynamoai.in](https://app.dynamoai.in)**

---

## What is Dynamo AI?

Dynamo AI is a professional-grade AI Research Operating System — not just a chatbot. It combines a high-performance FastAPI backend with a clean, responsive frontend to deliver a unified workspace for research, learning, and knowledge work.

Unlike general-purpose AI tools, Dynamo AI is built specifically for **students and researchers**: it remembers you across sessions, runs multi-model research pipelines, finds gaps in existing literature, formats citations automatically, and exports professional-grade documents.

---

## Core Features

### 🧠 AI Memory Bank
Persistent, cross-session memory. Dynamo AI remembers your subject, preferences, projects, and working style — permanently. You never repeat yourself. Live memory count badge shows exactly what it knows about you.

### 🔬 Research Mode — Multi-Model Pipeline
A 3-model pipeline that produces full academic papers from a single topic:
1. **Live web search** (Tavily) — fetches current, sourced information
2. **Claude Sonnet 4.5** — extracts key findings, statistics, and evidence
3. **Gemini 3.1** — identifies themes, gaps, and contradictions
4. **GPT-5.4** — writes a structured academic paper with in-text citations and a full reference list

Supports **6 citation formats out of the box**: APA 7th · MLA · Chicago · Harvard · IEEE · Vancouver

### 🔍 Find Research Gaps (Deep Think Mode)
Surface what hasn't been written yet. Paste any topic and Dynamo AI runs a deep analysis to find unexplored angles, contradictions in existing literature, and future research directions. Built for dissertation introductions, grant proposals, and original research.

### 🤔 DeepThink v3
A deeper reasoning mode for complex questions. Same Gemini model — enhanced system prompt — producing structured breakdowns, multiple perspectives, and thorough explanations rather than quick answers.

### 📄 Document Intelligence
Upload any PDF and ask questions directly. Summarise sections, extract specific evidence, cross-reference claims, and understand long papers in seconds.

### 📁 Folders
Organise chat history by project, subject, or paper. Create folders with one click, move chats via the `···` menu, expand/collapse in the sidebar. Your research stays structured, not buried in a scroll.

### 📤 Export to PDF / Word
Convert any research session into a formatted document instantly — no copy-pasting.

### 🎙️ Voice Mode
Real-time speech-to-text using Whisper v3. Think out loud, dictate a paragraph, or ask questions hands-free.

### 👁️ Vision — Image Analysis
Analyse images, diagrams, screenshots, and charts directly in the chat window.

### 🎨 Image & Video Generation
AI image generation and video generation (Runway) built into the research workspace.

### 🌐 Live Web Search
Autonomous agentic search via Tavily API for real-time, sourced, current information.

### 🛠️ Smart Actions
One-click tools: Summarise, Explain Simply, Translate, Bullet Points, Export/Save — applied to any chat.

---

## Model Routing — What Runs Where

| Mode | Model | API |
|---|---|---|
| Fast Chat | Gemini 3.1 Flash Lite Preview | Google Gemini (direct) |
| DeepThink v3 | Gemini 3.1 Flash Lite Preview + enhanced prompt | Google Gemini (direct) |
| Research — Extract | Claude Sonnet 4.5 → Gemini fallback | APIMart |
| Research — Analyze | Gemini 3.1 → Gemini fallback | APIMart |
| Research — Write | GPT-5.4 → Gemini fallback | APIMart |
| Vision | Gemini Flash Vision | Google Gemini (direct) |
| Voice | Whisper v3 | Groq |

---

## Tech Stack

### Backend (The Brain)
| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) + Uvicorn |
| Primary AI | Gemini 3.1 Flash Lite Preview (Google Gemini API) |
| Research Pipeline | APIMart — Claude Sonnet 4.5 / Gemini 3.1 / GPT-5.4 |
| Web Search | Tavily API |
| Voice | Whisper v3 via Groq |
| Image Generation | Pollinations / Stability AI |
| Video Generation | Runway API |
| Database | Supabase (PostgreSQL) |
| Auth | Firebase + Supabase |
| Payments | Razorpay |
| Analytics | PostHog |
| Email | Brevo |

### Frontend (The Face)
| Layer | Technology |
|---|---|
| Core | HTML5 + Vanilla JavaScript |
| Styling | Tailwind CSS |
| Markdown | Marked.js |
| Icons | Lucide Icons |

---

## Database Schema

```
users          — id, firebase_uid, email, plan, quota_used, quota_date
chats          — id, user_id, title, is_starred, folder_id, created_at
messages       — id, chat_id, role, content, content_type, created_at
folders        — id, user_id, name, created_at
user_memories  — id, user_id, content, category, created_at
subscriptions  — id, user_id, plan, razorpay_order_id, status, expires_at
```

---

## Architecture

```
User
 ↓
Frontend (HTML/JS — static)
 ↓
FastAPI Backend (Python — Uvicorn)
 ↓
┌─────────────────────────────────────────┐
│              Mode Router                │
├───────────┬──────────────┬──────────────┤
│ Fast Chat │ DeepThink v3 │ Research Mode│
│           │              │              │
│ Gemini    │ Gemini +     │ APIMart      │
│ Flash     │ Deep Prompt  │ 3-Model      │
│ Lite      │              │ Pipeline     │
└───────────┴──────────────┴──────────────┘
 ↓
Supabase (Users · Chats · Messages · Memory · Folders)
```

---

## Pricing

| Plan | Price | What's Included |
|---|---|---|
| Free | ₹0/month | Core AI chat, web search, basic tools |
| Pro | ₹199/month | All models, Research Mode, Memory, Folders, Export, Vision, Image & Video Gen |

---

## Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/Anish0605/App_Dynamo_AI
cd App_Dynamo_AI

# 2. Install backend deps
cd backend
pip install -r requirements.txt

# 3. Set environment variables in .env
GEMINI_API_KEY=your_key
TAVILY_API_KEY=your_key
APIMART_API_KEY=your_key
GROQ_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
FIREBASE_PROJECT_ID=your_project_id
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

# 4. Run backend
uvicorn main:app --host 0.0.0.0 --port 5000
```

Frontend is static HTML/JS — serve the `frontend/` directory with any static server or open `frontend/Index.html` directly.

---

## Changelog — April 2026

| Feature | Description |
|---|---|
| 📁 Folders | Organise chat history by project/subject — create, rename, delete, move chats |
| 🧠 Memory Visibility | Live count badge on AI Memory — updates on add/delete/clear |
| 🔍 Research Gap Finder | Deep Think mode to surface unexplored research angles |
| 📝 Citation Formats | APA 7, MLA, Chicago, Harvard, IEEE, Vancouver in Research Mode |
| 🤔 DeepThink v3 | Adaptive deep reasoning mode — structured, multi-perspective answers |
| 🔐 Login UX | Fixed duplicate event listener, added loading state, friendly error messages |

---

## Built By

**Anish Krisna** — [@Anish0605](https://github.com/Anish0605)

Made in India 🇮🇳 · For students, researchers, and thinkers everywhere.

---

*Dynamo AI — The Research Operating System · [app.dynamoai.in](https://app.dynamoai.in)*
