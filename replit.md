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
| Pro | 100 | 100 | 25 | ₹499/mo |

Quota enforcement is in `backend/supabase_client.py` (`check_image_quota`, `check_video_quota`, `check_user_quota`).
Image/video enforcement runs in `backend/main.py` before generation.
Frontend shows styled quota error cards with an "Upgrade Plan" link to `/pricing.html`.

**DB Migration Required**: The `users` table needs three new columns. Run `backend/migrate_quota_columns.sql` in the Supabase Dashboard SQL Editor.

## Development
The workflow `Start application` runs `bash start.sh` which:
1. Starts uvicorn (FastAPI) on localhost:8000
2. Starts Python static server on 0.0.0.0:5000

## Frontend API Configuration
`window.BACKEND_URL` is set dynamically in `Index.html` to use the current hostname with port 8000, allowing it to work in both dev (Replit proxy) and production environments.
