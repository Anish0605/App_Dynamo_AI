# Dynamo AI — Pro Trial Cost Optimisation
**Implemented:** June 18, 2026

---

## What Was Done

Five backend changes were made to reduce API costs for `pro_validation` (14-day trial) users without degrading the core experience. No frontend UI changes were needed — all controls are server-side.

---

## Change 1 — Image Quota Reduced (25/month) + Video Disabled

**File:** `backend/supabase_client.py`

| Plan | Before | After |
|------|--------|-------|
| `pro_validation` — Images/month | 100 | **25** |
| `pro_validation` — Videos/month | 25 | **0** |

**Why:** Video generation (Runway ML) costs ₹40–80 per video. At 25 free videos that was a potential ₹1,000–2,000 exposure per trial user. Image generation (DALL-E 3) costs ₹3–6 per image — capped at 25 to match the Plus plan tier. Full Pro quota (100 images, 25 videos) is restored only for paying `pro` subscribers.

---

## Change 2 — Deep Research Agent Capped at 3 Searches

**Files:** `backend/deep_research.py`, `backend/main.py`

Trial users running the Deep Research Agent now trigger **3 search angles** instead of 6. The user's plan is passed from the `/deep-research/start` endpoint through to the job runner, where the cap is applied before searches execute.

| | Pro | Pro Trial |
|---|---|---|
| Search angles | 6 | **3** |
| Tavily API calls | 6 | **3** |
| APIMart multi-model calls | Up to 6 | **Up to 3** |
| Estimated cost per run | ₹15–25 | **₹7–12** |

**What the trial user still gets:** A complete research report with overview, current data, and key players — just without the deeper "challenges", "recent developments", and "future outlook" angles.

---

## Change 3 — Response Length Capped at 1,500 Tokens

**File:** `backend/model.py`

For all chat responses sent to `pro_validation` users, `max_output_tokens: 1500` is passed to the Gemini API. Paying Pro users have no cap (Gemini defaults to 8,192 tokens).

| | Pro | Pro Trial |
|---|---|---|
| Max output tokens | 8,192 (default) | **1,500** |
| Estimated token cost saving | — | **~40–60% per message** |

**Why 1,500:** This is enough for a thorough, multi-paragraph response on any research topic. Very long verbatim outputs (full essays, large tables) are truncated, but the quality of reasoning is unchanged.

---

## Change 4 — Cheaper Model for Fast Mode (Trial Only)

**File:** `backend/model.py`

| Mode | Pro | Pro Trial |
|---|---|---|
| Fast mode (default) | `gemini-3.5-flash` | **`gemini-3.1-flash-lite-preview`** |
| DeepThink mode | `gemini-3.5-flash` | `gemini-3.5-flash` *(unchanged)* |
| Fallback | `gemini-3.1-flash-lite-preview` | `gemini-3.1-flash-lite-preview` |

**Why:** `gemini-3.1-flash-lite` is ~4× cheaper per token than `gemini-3.5-flash`. The difference in Fast mode output quality is minimal for most research queries. DeepThink deliberately keeps the full model — that is the signature Pro feature trial users need to evaluate.

---

## Change 5 — trial_mode Flag in Backend

**File:** `backend/model.py`

A single `IS_TRIAL` boolean flag (`plan == "pro_validation"`) was introduced to gate all trial-specific behaviour. This makes future additions simple — any new cost control just checks `IS_TRIAL`.

```python
IS_TRIAL = (plan == "pro_validation")
```

All four trial optimisations (model selection, token cap, search cap, quota limits) branch off this single check.

---

## Estimated Cost Saving Per Trial User

| Usage pattern | Old cost (₹) | New cost (₹) | Saving |
|---|---|---|---|
| Heavy user (300 msgs + 25 images + 10 deep research) | ₹1,200–1,800 | **₹150–250** | ~85% |
| Average user (100 msgs + 10 images + 3 deep research) | ₹300–500 | **₹50–80** | ~83% |
| Light user (30 msgs, no images/video) | ₹80–120 | **₹15–25** | ~80% |

---

## What Trial Users Still Get (Full Access)

- ✅ DeepThink mode (full `gemini-3.5-flash`)
- ✅ Research Mode (APIMart multi-model pipeline)
- ✅ Deep Research Agent (3 searches, complete report)
- ✅ 25 image generations/month
- ✅ 300 messages/day
- ✅ AI Memory, Document Library, Citation Checker
- ✅ AI & Plagiarism Detector
- ✅ Research Watcher, Flowcharts, Mindmaps, Study Guide

---

## What Was NOT Changed

- Abuse detection was not implemented (per your instruction)
- No frontend changes — all gating is server-side and cannot be bypassed
- Paying `pro` and `plus` subscribers are completely unaffected
