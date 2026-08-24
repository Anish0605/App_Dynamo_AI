# main.py — Dynamo AI Central Router (FINAL, CLEAN)

from fastapi import FastAPI, UploadFile, File, Form
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse
import uvicorn
import os
import json

import asyncio
import traceback
import config
import model
import re
import memory as memory_module
import documents as documents_module
import search
import image
import voice
import analysis
import export
import video
import supabase_client
import flowchart
import mindmap
import multi_model_router
import flashcard as flashcard_module
import deck_engine
import watches as watches_module
import watcher_check
import watcher_scheduler
import citation_checker as citation_checker_module

from supabase_client import (get_or_create_user,get_user_by_supabase_id,create_chat,save_message,fetch_chat_messages)
from export_routes import router as export_router
from presentation_engine import build_presentation, build_smart_presentation
from payments import router as payments_router
from trial import router as trial_router
from admin_dashboard import router as admin_dashboard_router
from fap import router as fap_router
import detector as detector_module
import pitch_export
import pitch_screenshot
import request_auth

BATCH_MAX_FILES = 5
BATCH_MAX_FILE_BYTES = 25 * 1024 * 1024
BATCH_MAX_TOTAL_BYTES = 100 * 1024 * 1024
# JSON/base64 expands raw file bytes by roughly one third. The small extra
# allowance covers the request metadata while the decoded limit remains 100 MB.
BATCH_MAX_REQUEST_BYTES = ((BATCH_MAX_TOTAL_BYTES + 2) // 3) * 4 + (1024 * 1024)


class BatchUploadBodyLimitMiddleware:
    """Reject oversized batch bodies before FastAPI parses their JSON/base64."""

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] != "http"
            or scope.get("method") != "POST"
            or scope.get("path") != "/chat-with-files"
        ):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    await JSONResponse(
                        {"detail": "The combined upload payload is too large."},
                        status_code=413,
                    )(scope, receive, send)
                    return
            except ValueError:
                await JSONResponse(
                    {"detail": "Invalid Content-Length header."},
                    status_code=400,
                )(scope, receive, send)
                return

        messages = []
        received_bytes = 0
        while True:
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_bytes:
                    await JSONResponse(
                        {"detail": "The combined upload payload is too large."},
                        status_code=413,
                    )(scope, receive, send)
                    return
            messages.append(message)
            if message["type"] != "http.request" or not message.get("more_body", False):
                break

        async def replay_receive():
            if messages:
                return messages.pop(0)
            return {"type": "http.disconnect"}

        await self.app(scope, replay_receive, send)

# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app = FastAPI(title="Dynamo AI Hub")
app.add_middleware(BatchUploadBodyLimitMiddleware, max_bytes=BATCH_MAX_REQUEST_BYTES)

@app.on_event("startup")
async def _startup():
    watcher_scheduler.start()

@app.on_event("shutdown")
async def _shutdown():
    watcher_scheduler.stop()


@app.middleware("http")
async def firebase_auth_context(request, call_next):
    """Attach verified Firebase identity to the current request."""
    authorization = request.headers.get("authorization", "")
    token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else None
    auth_tokens = request_auth.begin_request(token)
    try:
        return await call_next(request)
    finally:
        request_auth.end_request(auth_tokens)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.dynamoai.in","https://dynamoai.in"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export_router)
app.include_router(payments_router)
app.include_router(trial_router)
app.include_router(admin_dashboard_router)
app.include_router(fap_router)

# --------------------------------------------------
# MODELS
# --------------------------------------------------

class FlashcardReq(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 5
    user_id: str | None = None
    chat_id: str | None = None

class ChatReq(BaseModel):
    message: str
    history: list = []
    use_search: bool = True
    deep_dive: bool = False
    force_image: bool = False
    model: str = "gemini-3.5-flash-lite"
    mode: str = "chat"  # "chat" | "research" — explicit mode flag
    chat_id: str | None = None
    user_id: str | None = None
    smart_action: bool = False  # True = skip keyword routing (Summarise, Explain, etc.)
    citation_format: str = ""   # e.g. "IEEE", "APA7", "MLA", "Harvard", "Vancouver", "Chicago", "Springer", "ACS"
    humanize_output: bool = False  # True = auto-run the humanizer on the final long-form output before returning


PAID_ACCESS_MESSAGE = (
    "Paid access is required to use Dynamo AI. "
    "Please choose a plan at /pricing.html."
)

PLUS_PRO_PLANS = frozenset({
    "plus",
    "plus_trial",
    "pro",
    "pro_trial",
    "pro_validation",
})


def require_paid_user(user_id: str, feature: str = "Dynamo AI"):
    """Fail closed for anonymous, missing, and Free accounts.

    Firebase authentication remains separate from this check: users can still
    sign up and log in, but only active paid/demo accounts may consume AI
    services.
    """
    user = request_auth.require_authenticated_user(
        user_id,
        supabase_client.get_user_by_firebase_uid,
    )
    if not supabase_client.has_paid_access(user):
        raise HTTPException(
            status_code=403,
            detail=f"{feature} requires an active paid plan. Visit /pricing.html to upgrade.",
        )
    # Approved demos retain unrestricted product access even if their stored
    # plan is free. Use an effective Pro tier for downstream feature gates
    # without changing the persisted account plan.
    if supabase_client.is_demo_account(user) and (user.get("plan") or "").lower() == "free":
        user = {**user, "plan": "pro"}
    return user


def require_plus_or_pro_user(user_id: str, feature: str = "This feature"):
    """Allow only Plus/Pro plans and their trials for premium features."""
    user = require_paid_user(user_id, feature)
    plan = (user.get("plan") or "free").lower()
    if plan not in PLUS_PRO_PLANS:
        raise HTTPException(
            status_code=403,
            detail=(
                f"{feature} is available on Plus and Pro plans, including active "
                "trials. Visit /pricing.html to upgrade."
            ),
        )
    return user


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "online",
        "identity": "Dynamo AI",
        "audio": {
            "read_aloud": True,
            "radio_mode": True,
            "export": True
        }
    }

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "Index.html"))

@app.get("/features.html")
async def serve_features():
    return FileResponse(os.path.join(FRONTEND_DIR, "features.html"))

@app.get("/pricing.html")
async def serve_pricing():
    return FileResponse(os.path.join(FRONTEND_DIR, "pricing.html"))

@app.get("/guide.html")
async def serve_guide():
    return FileResponse(os.path.join(FRONTEND_DIR, "guide.html"))

@app.get("/invite-pro-trial")
async def serve_invite_trial():
    return FileResponse(os.path.join(FRONTEND_DIR, "invite-pro-trial.html"))

@app.get("/partner-signup")
async def serve_partner_signup():
    return FileResponse(os.path.join(FRONTEND_DIR, "partner-signup.html"))

@app.get("/partner-dashboard")
async def serve_partner_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "partner-dashboard.html"))

@app.get("/partner-admin")
async def serve_partner_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "partner-admin.html"))

# --------------------------------------------------
# SITEMAP FOR GOOGLE SEARCH CONSOLE
# --------------------------------------------------

@app.get("/sitemap.xml")
async def sitemap():
    """Sitemap for app.dynamoai.in for Google Search Console"""
    from datetime import datetime
    
    sitemap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://app.dynamoai.in/</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://app.dynamoai.in/features.html</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://app.dynamoai.in/pricing.html</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://app.dynamoai.in/guide.html</loc>
    <lastmod>{datetime.utcnow().strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>"""
    
    from fastapi.responses import Response
    return Response(content=sitemap_xml, media_type="application/xml")

# --------------------------------------------------
# GET FRESH USER (WITH QUOTA RESET)
# --------------------------------------------------

class GetUserReq(BaseModel):
    user_id: str

@app.post("/get-user")
async def get_user_fresh(req: GetUserReq):
    """Get fresh user data with daily quota reset applied."""
    user = request_auth.require_authenticated_user(
        req.user_id,
        supabase_client.get_user_by_firebase_uid,
    )
    
    if not user:
        return {"error": "User not found"}
    
    trial_expires_at = None
    if user.get("plan") in ("pro_trial", "pro_validation") and supabase_client.supabase and user.get("id"):
        try:
            sub_res = supabase_client.supabase \
                .table("subscriptions") \
                .select("expires_at") \
                .eq("user_id", user["id"]) \
                .eq("status", "trial_active") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            if sub_res.data:
                trial_expires_at = sub_res.data[0].get("expires_at")
        except Exception:
            pass

    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "plan": user.get("plan"),
        "access_allowed": supabase_client.has_paid_access(user),
        "daily_quota_used": user.get("daily_quota_used", 0),
        "quota_date": user.get("quota_date"),
        "image_count_used": user.get("image_count_used", 0),
        "video_count_used": user.get("video_count_used", 0),
        "quota_month": user.get("quota_month"),
        "trial_expires_at": trial_expires_at,
    }
    
# --------------------------------------------------
# CHAT
# --------------------------------------------------

@app.post("/flashcard")
async def generate_flashcard(req: FlashcardReq):
    user = require_paid_user(req.user_id, "Flashcards")
    if not supabase_client.check_user_quota(user):
        return {"type": "error", "content": "⚠️ You have reached your daily limit."}

    result = flashcard_module.generate_flashcards(req.topic, req.difficulty, req.count)

    if req.chat_id and result.get("type") == "flashcard":
        save_message(req.chat_id, "user",
                     f"Create {req.count} {req.difficulty} flashcards on: {req.topic}")
        save_message(req.chat_id, "assistant",
                     f"[Flashcard deck: {req.topic} — {len(result['cards'])} cards]")

    if user:
        supabase_client.increment_quota(user)

    result["chat_id"] = req.chat_id
    return result


@app.post("/chat")
async def chat(req: ChatReq):
    # This check must happen before keyword routing because routes such as
    # video, flowchart, and mindmap can otherwise bypass the normal chat gate.
    user = require_paid_user(req.user_id)

    msg_lower = req.message.lower()

    # ── Keyword routing (ALL gated by smart_action) ──────────────────────────────
    # smart_action=True bypasses every keyword router — used by DR follow-ups,
    # Draft Academic Paper, Summarise, Explain, Find Research Gaps, etc.
    # This prevents a 6,000-word research report (full of words like "video",
    # "steps", "workflow", "brainstorm") from triggering the wrong handler.

    if not req.smart_action:

        # 📊 Flowchart Detection
        # Only route explicit diagram requests. Broad terms such as "workflow"
        # and "steps" commonly appear inside research questions and abstracts;
        # routing those messages to the JSON-only flowchart parser causes the
        # normal prose response to be rejected as "invalid format".
        flowchart_intent = bool(re.search(
            r"\b(flowchart|flow diagram|process flow|workflow diagram)\b",
            msg_lower,
        ))
        if flowchart_intent:
            try:
                return flowchart.generate_flowchart(req.message)
            except BaseException as e:
                print(f"[FLOWCHART ERROR] {type(e).__name__}: {e}")
                traceback.print_exc()
                return {"type": "text", "content": "Flowchart generation failed. Please try again."}

        # 🧠 Mindmap Detection
        MINDMAP_KEYWORDS = ["mindmap", "mind map", "idea map", "brainstorm"]
        if any(k in msg_lower for k in MINDMAP_KEYWORDS):
            try:
                return mindmap.generate_mindmap(req.message)
            except BaseException as e:
                print(f"[MINDMAP ERROR] {type(e).__name__}: {e}")
                traceback.print_exc()
                return {"type": "text", "content": "Mindmap generation failed. Please try again."}

        # 🎬 Video Detection
        VIDEO_KEYWORDS = ["create video", "generate video", "make video", "animation", "video"]
        if any(k in msg_lower for k in VIDEO_KEYWORDS):
            try:
                import video
                return await video.generate_video(req.message)
            except BaseException as e:
                print(f"[VIDEO ERROR] {type(e).__name__}: {e}")
                traceback.print_exc()
                return {"type": "text", "content": "Video generation failed. Please try again."}

    # 🧩 Quiz Detection (used only to gate image generation below)
    QUIZ_KEYWORDS = ["quiz", "mcq", "multiple choice", "test me", "questions", "exam"]
    is_quiz_request = (not req.smart_action) and any(k in msg_lower for k in QUIZ_KEYWORDS)

    # 🖼 Image Detection
    IMAGE_KEYWORDS = [
        "create an image", "create a image", "generate an image", "generate a image",
        "create image", "generate image", "draw ", "picture", "illustration", "visual"
    ]
    SINGLE_WORD_KEYWORDS = ["image", "photo", "artwork", "drawing"]
    is_image_prompt = (
        not req.smart_action and
        (any(k in msg_lower for k in IMAGE_KEYWORDS) or
         any(k in msg_lower.split() for k in SINGLE_WORD_KEYWORDS) or
         req.force_image) and not is_quiz_request
    )    
    
    # -------------------------
    # 🧠 1. USER HANDLING
    # -------------------------
    # 🖼 Image — check plan & quota before generating
    if is_image_prompt:
        plan = user.get("plan", "free") if user else "free"
        if plan == "free":
            return {
                "type": "text",
                "content": "🔒 Image generation is available on **Plus** and **Pro** plans.\n\nFree users get **10 messages/day** but image generation requires an upgrade. [View Plans](/pricing.html)"
            }
        if not supabase_client.check_image_quota(user):
            return {
                "type": "text",
                "content": "📊 You've used all your image generations for this month. Upgrade to **Pro** for 100 images/month. [View Plans](/pricing.html)"
            }
        result = await image.generate_image_base64(req.message)
        if result.get("type") == "image_v2":
            supabase_client.increment_image_quota(user)
        return result
    # -------------------------
    # 🚫 1.1 QUOTA CHECK
    # -------------------------
    if user:
        if not supabase_client.check_user_quota(user):
            return {
                "type": "error",
                "content": "⚠️ You have reached your daily limit."
        }

    # -------------------------
    # 🔒 1.2 PRO FEATURE GATE — DeepThink & Find Research Gaps (backend enforcement)
    # Frontend already blocks non-Pro users; this prevents direct API calls bypassing the UI.
    # -------------------------
    if req.deep_dive:
        _plan = (user.get("plan", "free") if user else "free").lower()
        if _plan not in ("pro", "pro_trial", "pro_validation"):
            return {
                "type": "text",
                "content": "🔒 **DeepThink** and **Find Research Gaps** are **Pro-only** features.\n\n[Upgrade to Pro →](/pricing.html)"
            }

    # -------------------------
    # 💬 2. CHAT HANDLING
    # -------------------------
    chat_id = req.chat_id

    if not chat_id and user:
        chat = create_chat(user["id"], title=req.message[:30])
        chat_id = chat["id"] if chat else None

    # -------------------------
    # 📜 3. LOAD HISTORY
    # -------------------------
    history = []

    if chat_id:
        db_messages = fetch_chat_messages(chat_id)

        for m in db_messages:
            history.append({
                "role": m["role"],
                "content": m["content"]
            })

    # -------------------------
    # 🧠 3.5 LOAD MEMORIES + DOCUMENTS
    # -------------------------
    memories = []
    if user:
        memories = memory_module.fetch_memories(supabase_client.supabase, user["id"])

    saved_docs = []
    if user:
        saved_docs = documents_module.fetch_documents(supabase_client.supabase, user["id"])

    # -------------------------
    # 🔬 4. RESEARCH MODE — multi-model pipeline
    # -------------------------
    is_research_mode = (req.mode == "research")

    if is_research_mode:
        # Gate: Plus/Pro only — free users cannot use Research Mode
        _research_plan = (user.get("plan", "free") if user else "free").lower()
        if _research_plan not in ("plus", "pro", "pro_trial", "pro_validation"):
            return {
                "type": "error",
                "content": "🔒 **Research Mode** is available on **Plus** and **Pro** plans.\n\nUpgrade to unlock Research Mode, AI Memory, PDF uploads, and much more. [View Plans](/pricing.html)"
            }

        has_citation = bool(req.citation_format and req.citation_format.strip())
        print(f"[Research] mode={'PAPER' if has_citation else 'CHAT'} | citation={req.citation_format or 'none'}")

        # Fetch web context — used by both branches
        research_web_context = ""
        research_sources = []
        try:
            research_web_context = search.get_web_context(req.message, deep_dive=True)
            research_sources = search.get_sources(req.message, deep_dive=True)
        except Exception as e:
            print(f"[Research] Web search failed: {e}")

        if has_citation:
            # ── Branch B: Write a Paper ── APIMart multi-model pipeline (unchanged)
            try:
                paper_content = multi_model_router.research_pipeline(
                    topic=req.message,
                    web_context=research_web_context,
                    citation_format=req.citation_format
                )
                humanized_note = None
                try:
                    h = await detector_module.humanize_text(paper_content)
                    if h.get("ok") and h.get("humanized"):
                        paper_content = h["humanized"]
                        humanized_note = {
                            "verified_human": h.get("verified_human"),
                            "verification_score": h.get("verification_score"),
                        }
                except Exception as e:
                    print(f"[Research Pipeline] Auto-humanize skipped due to error: {e}")

                result = {
                    "type": "research",
                    "content": paper_content,
                    "sources": research_sources,
                    "auto_humanized": humanized_note,
                    "is_paper": True,
                }
            except Exception as e:
                print(f"[Research Pipeline] Fatal error: {e}")
                import traceback; traceback.print_exc()
                result = {
                    "type": "research",
                    "content": (
                        f"## Research Error\n\n"
                        f"The research pipeline encountered an error: **{e}**\n\n"
                        f"Please check your APIMart API key and try again."
                    ),
                    "sources": []
                }
        else:
            # ── Branch A: Research Chat ── Deep Tavily search + Gemini DeepThink
            # Returns a thorough conversational answer backed by live web data.
            doc_context = documents_module.format_docs_for_prompt(saved_docs) if saved_docs else ""
            response = model.get_ai_response(
                prompt=req.message,
                history=history,
                model_name=req.model or "",
                context=research_web_context,
                deep_dive=True,
                memories=memories,
                doc_context=doc_context
            )
            result = {
                "type": "chat",
                "content": response,
                "sources": research_sources
            }

        # Increment quota and save message for research mode too
        if user:
            supabase_client.increment_quota(user)
        if chat_id:
            save_message(chat_id, "user", req.message)
            save_message(chat_id, "assistant", result.get("content", ""))

        result["chat_id"] = chat_id
        return result

    # -------------------------
    # 🔍 5. SEARCH (non-research modes)
    # -------------------------
    context = ""
    sources = []
    if req.use_search:
        context = search.get_web_context(req.message, req.deep_dive)
        sources = search.get_sources(req.message, req.deep_dive)

    # -------------------------
    # 🤖 6. AI RESPONSE
    # -------------------------
    doc_context = documents_module.format_docs_for_prompt(saved_docs) if saved_docs else ""

    response = model.get_ai_response(
        prompt=req.message,
        history=history,
        model_name=req.model,
        context=context,
        deep_dive=req.deep_dive,
        memories=memories,
        doc_context=doc_context,
        force_json=is_quiz_request,
        plan=(user.get("plan", "free") if user else "free"),
    )

    # -------------------------
    # 💾 6. SAVE TO DB (user message now; assistant message saved after auto-humanize below)
    # -------------------------
    if chat_id:
        save_message(chat_id, "user", req.message)

    # -------------------------
    # 🧠 6.5 EXTRACT MEMORIES (background — smart two-layer filter)
    #
    # Layer 1 — Social blocklist (exact full-message match, zero cost):
    #   Instantly skips greetings and filler: "hi", "good morning", "thanks", etc.
    #
    # Layer 2 — Personal signal regex (no length gate):
    #   Catches ANY message with real personal context regardless of length.
    #   "I failed NEET" (13 chars) → EXTRACT ✅
    #   "what is photosynthesis" (no signal) → SKIP ✅
    #   "hi" (social) → SKIP ✅
    # -------------------------
    import re as _re

    _SOCIAL_BLOCKLIST = {
        "hi", "hello", "hey", "hii", "hiii", "yo",
        "good morning", "good evening", "good night", "good afternoon",
        "morning", "evening",
        "thanks", "thank you", "thank you so much", "thanks a lot",
        "thx", "ty", "tysm",
        "ok", "okay", "ok thanks", "okay thanks", "ok got it", "okay got it",
        "sure", "sure thing", "alright", "got it", "noted", "understood",
        "yes", "no", "nope", "yep", "yeah", "nah",
        "great", "perfect", "awesome", "cool", "nice", "good", "excellent",
        "wow", "amazing", "interesting", "hmm", "haha", "lol", "😊", "👍",
        "sounds good", "makes sense", "agreed", "exactly", "correct",
        "bye", "goodbye", "see you", "see ya", "later", "cya",
        "what", "what?", "how", "why", "when", "where",
    }

    _PERSONAL_SIGNAL_RE = _re.compile(
        r"""
        \b(
            i['']m \s          |  # I'm studying, I'm preparing
            i \s am \s         |  # I am a student
            i \s need          |  # I need help
            i \s want          |  # I want to learn
            i \s have          |  # I have an exam
            i \s study         |  # I study at
            i \s struggle      |  # I struggle with
            i \s fail(ed)?     |  # I failed / I fail
            i \s find \s it    |  # I find it hard
            i \s don['']t \s understand |
            i \s prefer        |  # I prefer
            i \s use \s        |  # I use
            i['']m \s preparing|  # I'm preparing for
            i \s am \s preparing|
            i \s scored        |  # I scored 80%
            i \s got           |  # I got rejected
            i \s joined        |  # I joined a course
            help \s me \b      |  # help me understand
            teach \s me \b     |  # teach me
            my \s exam         |  # my exam is next week
            my \s course       |  # my course covers
            my \s college      |  # my college
            my \s university   |
            my \s degree       |  # my degree is
            my \s goal         |  # my goal is
            my \s name \s is   |  # my name is
            my \s subject      |  # my subject
            my \s teacher      |
            my \s professor    |
            (hard|difficult|tough|challenging|confusing) \s for \s me \b |  # hard for me / difficult for me
            i['']m \s in \s (year|class|grade|sem|semester) |
            i \s am \s in \s (year|class|grade|sem|semester)
        )
        """,
        _re.IGNORECASE | _re.VERBOSE,
    )

    def _should_extract_memory(msg: str) -> bool:
        stripped = msg.strip().lower()
        # Layer 1 — pure social phrase? skip immediately
        if stripped in _SOCIAL_BLOCKLIST:
            return False
        # Layer 2 — does it contain real personal context?
        return bool(_PERSONAL_SIGNAL_RE.search(msg))

    if user and user.get("plan", "free") != "free" and _should_extract_memory(req.message):
        def _extract_and_save():
            try:
                new_memories = memory_module.extract_memories(req.message, response)
                if new_memories:
                    memory_module.save_memories(supabase_client.supabase, user["id"], new_memories)
            except Exception as e:
                print(f"Background memory extraction error: {e}")
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, _extract_and_save)
    else:
        print(f"[Memory] Skipped — no personal context detected: '{req.message[:60]}'")

    # -------------------------
    # 🔥 6.6 INCREMENT QUOTA
    # -------------------------
    if user:
        supabase_client.increment_quota(user)
    # -------------------------
    # 📤 7. AUTO-HUMANIZE (long-form writing features only, e.g. Draft Academic Paper)
    # -------------------------
    auto_humanized = None
    if req.humanize_output and response:
        try:
            h = await detector_module.humanize_text(response)
            if h.get("ok") and h.get("humanized"):
                response = h["humanized"]
                auto_humanized = {
                    "verified_human": h.get("verified_human"),
                    "verification_score": h.get("verification_score"),
                }
        except Exception as e:
            print(f"[Chat] Auto-humanize skipped due to error: {e}")

    if chat_id:
        save_message(chat_id, "assistant", response)

    # -------------------------
    # 📤 8. RETURN
    # -------------------------
    return {
        "type": "text",
        "content": response,
        "chat_id": chat_id,
        "sources": sources if req.use_search else [],
        "auto_humanized": auto_humanized,
    }

# --------------------------------------------------
# TEST APIMART CONNECTIVITY
# --------------------------------------------------

@app.get("/test-apimart")
async def test_apimart():
    """Quick diagnostic endpoint to verify APIMart key + URL are working."""
    import config as cfg
    key = cfg.APIMART_API_KEY
    if not key:
        return {"status": "error", "reason": "APIMART_API_KEY is not set in secrets"}

    import requests as req_lib
    url = f"{multi_model_router.APIMART_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": "claude-opus-4-6",
        "messages": [{"role": "user", "content": "Say hello in one word."}],
        "max_tokens": 10
    }
    try:
        r = req_lib.post(url, headers=headers, json=payload, timeout=15)
        return {
            "status": "ok" if r.status_code == 200 else "error",
            "http_status": r.status_code,
            "url": url,
            "key_prefix": key[:8] + "...",
            "response_preview": r.text[:300]
        }
    except Exception as e:
        return {"status": "connection_error", "url": url, "error": str(e)}

# --------------------------------------------------
# FOLLOW-UPS ENDPOINT
# --------------------------------------------------

class FollowUpReq(BaseModel):
    message: str
    response: str
    user_id: str = ""

@app.post("/follow-ups")
async def follow_ups(req: FollowUpReq):
    require_paid_user(req.user_id, "Follow-up suggestions")
    from google import genai as _genai
    import config as cfg
    import json
    import re
    _gclient = _genai.Client(api_key=cfg.GEMINI_KEY)
    prompt = (
        f"User asked: {req.message}\n\n"
        f"AI answered: {req.response[:500]}\n\n"
        "List 4 short follow-up questions the user might ask next.\n"
        "Rules: Return ONLY a valid JSON array of 4 strings. No markdown. No explanation.\n"
        "Output format: [\"Question 1?\", \"Question 2?\", \"Question 3?\", \"Question 4?\"]"
    )
    try:
        r = _gclient.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )
        text = r.text.strip()
        # Find JSON array in the response (handles markdown code fences too)
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            text = match.group(0)
        questions = json.loads(text)
        if isinstance(questions, list):
            questions = [str(q).strip() for q in questions if q][:4]
        else:
            questions = []
        print(f"✅ Follow-ups generated: {questions}")
        return {"follow_ups": questions}
    except Exception as e:
        print(f"❌ Follow-ups error: {e}")
        return {"follow_ups": []}

# --------------------------------------------------
# MEMORY ENDPOINTS
# --------------------------------------------------

@app.get("/memory")
async def get_memories(user_id: str):
    mems = memory_module.fetch_memories(supabase_client.supabase, user_id)
    return {"memories": mems}

@app.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    ok = memory_module.delete_memory(supabase_client.supabase, memory_id)
    return {"success": ok}

@app.delete("/memory")
async def clear_memories(user_id: str):
    ok = memory_module.clear_all_memories(supabase_client.supabase, user_id)
    return {"success": ok}

# --------------------------------------------------
# DOCUMENT LIBRARY ENDPOINTS
# --------------------------------------------------

@app.get("/documents")
async def get_documents(user_id: str):
    user = request_auth.require_authenticated_user(
        user_id,
        supabase_client.get_user_by_firebase_uid,
    )
    docs = documents_module.fetch_documents(supabase_client.supabase, user["id"])
    return {"documents": docs}

@app.delete("/documents/{doc_id}")
async def delete_document_ep(doc_id: str, user_id: str):
    user = request_auth.require_authenticated_user(
        user_id,
        supabase_client.get_user_by_firebase_uid,
    )
    ok = documents_module.delete_document(
        supabase_client.supabase,
        doc_id,
        user_id=user["id"],
    )
    return {"success": ok}

@app.post("/save-document")
async def save_document_ep(
    file: UploadFile = File(...),
    user_id: str = Form(""),
):
    """
    Receives an uploaded file, extracts text, generates AI summary,
    and saves it permanently to the user's document library.
    """
    import pdf as pdf_module
    if not user_id:
        return {"success": False, "error": "Not logged in"}

    try:
        require_paid_user(user_id, "Document Library")
        file_bytes = await file.read()
        file_size_kb = len(file_bytes) // 1024

        # Extract text from PDF/DOCX/TXT
        text = pdf_module.extract_intel(file_bytes, file.filename or "upload")

        if not text or len(text.strip()) < 50:
            return {"success": False, "error": "Could not extract text from this file."}

        # AI summarization
        doc_data = documents_module.summarize_document(text, file.filename or "upload")

        # Fetch internal user ID
        user = get_user_by_supabase_id(user_id)
        if not user:
            return {"success": False, "error": "User not found"}

        saved = documents_module.save_document(
            supabase=supabase_client.supabase,
            user_id=user["id"],
            filename=file.filename or "upload",
            summary=doc_data["summary"],
            key_terms=doc_data["key_terms"],
            topics=doc_data["topics"],
            file_size_kb=file_size_kb,
        )

        if saved:
            return {"success": True, "document": saved}
        else:
            return {"success": False, "error": "Failed to save document."}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

# --------------------------------------------------
# FOLDERS
# --------------------------------------------------

class FolderCreate(BaseModel):
    user_id: str
    name: str

class FolderRename(BaseModel):
    name: str

class ChatFolderMove(BaseModel):
    folder_id: str | None = None

@app.get("/folders")
async def list_folders(user_id: str):
    sb = supabase_client.supabase
    res = sb.table("folders").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
    return {"folders": res.data or []}

@app.post("/folders")
async def create_folder(req: FolderCreate):
    sb = supabase_client.supabase
    res = sb.table("folders").insert({"user_id": req.user_id, "name": req.name.strip()}).execute()
    if res.data:
        return {"folder": res.data[0]}
    raise HTTPException(status_code=400, detail="Failed to create folder")

@app.patch("/folders/{folder_id}")
async def rename_folder(folder_id: str, req: FolderRename):
    sb = supabase_client.supabase
    res = sb.table("folders").update({"name": req.name.strip()}).eq("id", folder_id).execute()
    return {"success": bool(res.data)}

@app.delete("/folders/{folder_id}")
async def delete_folder(folder_id: str):
    sb = supabase_client.supabase
    sb.table("chats").update({"folder_id": None}).eq("folder_id", folder_id).execute()
    sb.table("folders").delete().eq("id", folder_id).execute()
    return {"success": True}

@app.patch("/chats/{chat_id}/folder")
async def move_chat_to_folder(chat_id: str, req: ChatFolderMove):
    sb = supabase_client.supabase
    res = sb.table("chats").update({"folder_id": req.folder_id}).eq("id", chat_id).execute()
    return {"success": bool(res.data)}

# --------------------------------------------------
# CHAT WITH FILE (FormData — separate endpoint)
# --------------------------------------------------

class FileUploadReq(BaseModel):
    file_data: str
    file_name: str = "upload"
    file_type: str = "application/octet-stream"
    message: str = ""
    history: list = []
    chat_id: str = ""
    user_id: str = ""

@app.post("/chat-with-file")
async def chat_with_file(req: FileUploadReq):
    import base64 as _b64
    import traceback as _tb

    print(f"[chat-with-file] user_id={req.user_id!r} filename={req.file_name!r} chat_id={req.chat_id!r}")

    try:
        user = require_paid_user(req.user_id, "File analysis")
        user_plan = user.get("plan", "free")

        file_bytes = _b64.b64decode(req.file_data)
        print(f"[chat-with-file] decoded {len(file_bytes)} bytes")

        analysis_result = analysis.process_file_universally(file_bytes, req.file_name)
        print(f"[chat-with-file] analysis type={analysis_result.get('type')} error={analysis_result.get('error')}")

        file_content = analysis_result.get("content", "")[:6000]
        user_instruction = req.message.strip() if req.message.strip() else "Summarize this document."

        combined_prompt = (
            f"The user uploaded a file: {req.file_name}\n\n"
            f"File content:\n{file_content}\n\n"
            f"User instruction: {user_instruction}"
        )

        response = model.get_ai_response(
            prompt=combined_prompt,
            history=req.history,
            model_name="",
            context="",
            deep_dive=False,
            plan=user_plan
        )

        print(f"[chat-with-file] AI responded, length={len(response or '')}")

        return {
            "type": "text",
            "content": response or "I've read the file but couldn't generate a response. Please try again.",
            "chat_id": req.chat_id or None,
            "file_analyzed": req.file_name
        }
    except HTTPException:
        raise
    except Exception as e:
        _tb.print_exc()
        print(f"[chat-with-file] ERROR: {e}")
        return {
            "type": "text",
            "content": f"⚠️ Sorry, I couldn't process that file. Error: {str(e)}"
        }


# --------------------------------------------------
# CHAT WITH MULTIPLE FILES (ADDITIVE BATCH ENDPOINT)
# --------------------------------------------------

BATCH_SUPPORTED_EXTENSIONS = (
    ".csv", ".xlsx", ".xls", ".pdf", ".docx", ".txt",
    ".png", ".jpg", ".jpeg", ".webp",
)


class BatchFileItem(BaseModel):
    file_data: str
    file_name: str = "upload"
    file_type: str = "application/octet-stream"


class BatchFileUploadReq(BaseModel):
    files: list[BatchFileItem] = Field(default_factory=list)
    message: str = ""
    history: list = Field(default_factory=list)
    chat_id: str = ""
    user_id: str = ""


def _decode_batch_file(file_item: BatchFileItem) -> bytes:
    """Decode a client file payload without accepting arbitrary oversized data."""
    import base64 as _b64

    encoded = (file_item.file_data or "").strip()
    if encoded.startswith("data:") and "," in encoded:
        encoded = encoded.split(",", 1)[1]
    max_encoded_bytes = ((BATCH_MAX_FILE_BYTES + 2) // 3) * 4
    if len(encoded) > max_encoded_bytes:
        raise ValueError("The file exceeds the 25 MB per-file limit.")
    try:
        return _b64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError("The file data is not valid base64.") from exc


def _batch_result_context(analysis_result: dict) -> str:
    """Turn the existing analyzer's different result shapes into model context."""
    context_parts = []
    if analysis_result.get("content"):
        context_parts.append(str(analysis_result["content"]))
    if analysis_result.get("insight"):
        context_parts.append(f"Analysis note: {analysis_result['insight']}")
    if analysis_result.get("columns"):
        context_parts.append(
            "Columns: " + ", ".join(str(column) for column in analysis_result["columns"])
        )
    if analysis_result.get("rows"):
        context_parts.append(
            "Rows preview:\n" + json.dumps(analysis_result["rows"][:10], ensure_ascii=False)
        )
    return "\n\n".join(context_parts).strip()[:6000]


def _batch_failure_reason(analysis_result: dict, context: str) -> str | None:
    if analysis_result.get("error"):
        return str(analysis_result["error"])[:240]
    if context:
        return None
    return "No readable content was extracted from this file."


@app.post("/chat-with-files")
async def chat_with_files(req: BatchFileUploadReq):
    """Analyze a small batch while preserving the established single-file route."""
    import traceback as _tb

    user = require_plus_or_pro_user(req.user_id, "Multiple-file analysis")
    if not supabase_client.check_user_quota(user):
        return {
            "type": "error",
            "content": "⚠️ You have reached your daily limit.",
        }

    if not req.files:
        raise HTTPException(status_code=400, detail="Please attach at least one file.")
    if len(req.files) > BATCH_MAX_FILES:
        raise HTTPException(
            status_code=413,
            detail=f"You can attach up to {BATCH_MAX_FILES} files at a time.",
        )

    decoded_files = []
    preflight_failures = []
    total_bytes = 0
    for file_item in req.files:
        file_name = os.path.basename(file_item.file_name or "upload")
        extension = os.path.splitext(file_name.lower())[1]
        if extension not in BATCH_SUPPORTED_EXTENSIONS:
            preflight_failures.append({
                "file_name": file_name,
                "status": "failed",
                "error": (
                    "Unsupported file type. Use PDF, DOCX, TXT, CSV, Excel, "
                    "or image files."
                ),
            })
            continue
        try:
            file_bytes = _decode_batch_file(file_item)
        except ValueError as exc:
            preflight_failures.append({
                "file_name": file_name,
                "status": "failed",
                "error": str(exc)[:240],
            })
            continue
        total_bytes += len(file_bytes)
        if total_bytes > BATCH_MAX_TOTAL_BYTES:
            raise HTTPException(
                status_code=413,
                detail="The combined file size exceeds the 100 MB total limit.",
            )
        if len(file_bytes) > BATCH_MAX_FILE_BYTES:
            preflight_failures.append({
                "file_name": file_name,
                "status": "failed",
                "error": "The file exceeds the 25 MB per-file limit.",
            })
            continue
        decoded_files.append((file_name, file_item.file_type, file_bytes))

    print(
        f"[chat-with-files] user_id={req.user_id!r} "
        f"files={len(decoded_files)} chat_id={req.chat_id!r} "
        f"bytes={total_bytes}"
    )

    file_results = list(preflight_failures)
    context_sections = []
    for file_name, file_type, file_bytes in decoded_files:
        try:
            analysis_result = analysis.process_file_universally(file_bytes, file_name)
            file_context = _batch_result_context(analysis_result)
            failure_reason = _batch_failure_reason(analysis_result, file_context)
            if failure_reason:
                file_results.append({
                    "file_name": file_name,
                    "status": "failed",
                    "error": failure_reason,
                })
                continue
            file_results.append({
                "file_name": file_name,
                "status": "processed",
                "type": analysis_result.get("type", "text"),
            })
            context_sections.append(
                f"===== FILE: {file_name} =====\n{file_context}"
            )
        except Exception as exc:
            _tb.print_exc()
            file_results.append({
                "file_name": file_name,
                "status": "failed",
                "error": f"Analysis failed: {str(exc)[:200]}",
            })

    processed_files = [
        result["file_name"]
        for result in file_results
        if result["status"] == "processed"
    ]
    failed_files = [
        result for result in file_results if result["status"] == "failed"
    ]

    if not context_sections:
        failure_summary = "\n".join(
            f"- {item['file_name']}: {item['error']}" for item in failed_files
        )
        return {
            "type": "text",
            "content": (
                "⚠️ I couldn't extract usable content from any of the attached files.\n\n"
                f"{failure_summary}"
            ),
            "chat_id": req.chat_id or None,
            "processed_files": [],
            "failed_files": failed_files,
            "file_results": file_results,
        }

    user_instruction = req.message.strip() or "Summarize and compare the attached files."
    combined_prompt = (
        "The user uploaded multiple files for one request. Analyze only the file "
        "content provided below. Keep each file's identity clear, compare or "
        "connect them when useful, and do not claim that a failed file was read.\n\n"
        + "\n\n".join(context_sections)
        + f"\n\nUser instruction: {user_instruction}"
    )
    if failed_files:
        combined_prompt += (
            "\n\nFiles that could not be processed:\n"
            + "\n".join(
                f"- {item['file_name']}: {item['error']}" for item in failed_files
            )
        )

    try:
        response = model.get_ai_response(
            prompt=combined_prompt,
            history=req.history,
            model_name="",
            context="",
            deep_dive=False,
            plan=user.get("plan", "free"),
        )
        supabase_client.increment_quota(user)
    except Exception as exc:
        _tb.print_exc()
        print(f"[chat-with-files] AI ERROR: {exc}")
        return {
            "type": "text",
            "content": "⚠️ I processed the files but couldn't generate a response. Please try again.",
            "chat_id": req.chat_id or None,
            "processed_files": processed_files,
            "failed_files": failed_files,
            "file_results": file_results,
        }

    status_note = ""
    if failed_files:
        status_note = "\n\n" + "\n".join(
            f"⚠️ {item['file_name']}: {item['error']}" for item in failed_files
        )
    return {
        "type": "text",
        "content": (response or "I've read the files but couldn't generate a response.") + status_note,
        "chat_id": req.chat_id or None,
        "processed_files": processed_files,
        "failed_files": failed_files,
        "file_results": file_results,
    }

# --------------------------------------------------
# 🎤 SPEECH-TO-TEXT (VOICE TRANSCRIPTION)
# --------------------------------------------------

@app.post("/transcribe-audio")
async def transcribe_audio(
    audio: UploadFile = File(...),
    user_id: str = Form(""),
):
    """
    Convert audio to text using Google Cloud Speech-to-Text or fallback.
    """
    try:
        require_paid_user(user_id, "Voice input")
        from google import genai as _genai
        from google.genai import types as _gtypes
        import base64

        # Read audio file
        audio_bytes = await audio.read()
        _gclient = _genai.Client(api_key=config.GEMINI_KEY)

        # Ask Gemini to transcribe
        response = _gclient.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[
                _gtypes.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
                "Please transcribe this audio to text. Return ONLY the transcribed text, no explanations."
            ]
        )
        
        return {
            "text": response.text.strip(),
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        return {
            "text": "",
            "status": "error",
            "error": str(e)
        }

# --------------------------------------------------
# FILE ANALYSIS (legacy — unchanged)
# --------------------------------------------------

@app.post("/analyze-data")
async def analyze_data(
    file: UploadFile = File(...),
    user_id: str = Form(""),
):
    require_paid_user(user_id, "File analysis")
    contents = await file.read()
    return analysis.process_file_universally(contents, file.filename)


# --------------------------------------------------
# DATA ANALYSIS CHAT (new — Tools → Data Analysis)
# Separate from /chat-with-file. Only handles CSV/XLSX.
# --------------------------------------------------

class DataAnalysisReq(BaseModel):
    file_data: str          # base64-encoded file bytes
    file_name: str = "data.csv"
    message:   str = ""
    user_id:   str = ""

@app.post("/data-analysis-chat")
async def data_analysis_chat(req: DataAnalysisReq):
    import base64 as _b64
    import traceback as _tb

    try:
        require_paid_user(req.user_id, "Data Analysis")
        file_bytes = _b64.b64decode(req.file_data)

        result = analysis.analyze_spreadsheet_deep(file_bytes, req.file_name)

        if "error" in result:
            return {"type": "text", "content": f"⚠️ {result['error']}"}

        user_q = req.message.strip() or "Perform a comprehensive, professional data analysis of this dataset."

        system_prompt = (
            "You are a world-class quantitative data analyst — think Julius AI or a senior quant at Goldman Sachs. "
            "The user has uploaded a spreadsheet. You have been given the REAL extracted data: exact column names, "
            "actual row values, comprehensive statistics (mean, median, std dev, quartiles, IQR), "
            "top and bottom performers with their exact names and values, and outliers. "
            "Use ONLY the real numbers and names provided. NEVER use placeholders like [value], [name], [insert x], etc.\n\n"
            "Structure your response EXACTLY with these markdown headings (use emojis as shown):\n\n"
            "## 📊 Executive Summary\n"
            "2-3 sentences: what this dataset contains and the single most critical finding.\n\n"
            "## 🔍 Key Findings\n"
            "6-8 specific bullet points — each must cite at least one real number from the data.\n\n"
            "## 🏆 Top Performers\n"
            "List the top 5 entries by name and exact value. For each, write one sentence on why they stand out.\n\n"
            "## ⚠️ Areas of Concern\n"
            "List the 3-5 worst performers or outliers by exact name and value. Explain the risk or implication.\n\n"
            "## 📈 Statistical Deep Dive\n"
            "Cover: distribution shape (symmetric/skewed?), spread (is std dev large vs mean?), "
            "concentration (do top 20% dominate the total?), outlier impact, and any notable pattern.\n\n"
            "## 💡 Strategic Recommendations\n"
            "Give 4-5 specific, actionable recommendations that reference actual names and numbers from the data.\n\n"
            "Be direct, insightful, and specific. No generic filler sentences."
        )

        full_prompt = (
            f"User question: {user_q}\n\n"
            f"=== REAL DATASET (use these exact values) ===\n"
            f"{result['summary_text']}\n"
            f"=== END DATA ==="
        )

        text_response = model.get_ai_response(
            prompt=full_prompt,
            history=[],
            model_name="",
            context=system_prompt,
            deep_dive=True,
            plan="pro",
        )

        return {
            "type":        "data_analysis",
            "content":     text_response or "Analysis complete.",
            "chart":       result.get("chart_b64"),
            "table":       result.get("table_preview"),
            "downloadCsv": result.get("download_csv_b64"),
            "rowCount":    result.get("row_count", 0),
            "filename":    result.get("filename", req.file_name),
            "stats":       result.get("stats", {}),
            "outliers":    result.get("outliers", []),
        }

    except HTTPException:
        raise
    except Exception as e:
        _tb.print_exc()
        return {"type": "text", "content": f"⚠️ Data analysis failed: {str(e)[:200]}"}

# --------------------------------------------------
# PPT
# --------------------------------------------------

@app.post("/generate-ppt-smart")
async def generate_ppt(payload: dict):
    require_paid_user(payload.get("user_id", ""), "Presentation generation")
    import json as _json
    import re as _re
    from google import genai as _genai
    _gclient = _genai.Client(api_key=config.GEMINI_KEY)

    messages = payload.get("messages", [])
    title = payload.get("title", "Executive Briefing")
    theme = payload.get("theme", "executive")

    # Build conversation transcript
    transcript = "\n".join(
        f"{m.get('role','').upper()}: {m.get('content','')}"
        for m in messages
        if m.get("content")
    )

    # Ask AI to convert transcript into slides JSON
    slide_prompt = f"""You are a professional presentation designer.
Convert the following AI conversation into a structured executive deck.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "title": "{title}",
  "theme": "{theme}",
  "slides": [
    {{
      "type": "content",
      "heading": "Slide Title",
      "bullets": ["Point 1", "Point 2", "Point 3"]
    }}
  ]
}}

Rules:
- 4 to 7 slides
- Each slide must have 3-5 clear bullet points
- Extract the key insights, answers, and facts from the conversation
- Use professional executive language

CONVERSATION:
{transcript[:3000]}
"""

    try:
        resp = _gclient.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=slide_prompt
        )
        raw = resp.text.strip()

        # Strip markdown code fences if present
        raw = _re.sub(r"^```[a-z]*\n?", "", raw).rstrip("```").strip()

        slides_payload = _json.loads(raw)
        slides_payload["theme"] = theme
        return build_presentation(slides_payload)

    except Exception as e:
        # Fallback: build a single-slide summary PPT
        fallback = {
            "title": title,
            "theme": theme,
            "slides": [
                {
                    "type": "content",
                    "heading": "Conversation Summary",
                    "bullets": [
                        m.get("content", "")[:120]
                        for m in messages
                        if m.get("role") == "assistant"
                    ][:5]
                }
            ]
        }
        return build_presentation(fallback)

# --------------------------------------------------
# 📊 SMART RESEARCH DECK  (new pipeline)
# --------------------------------------------------

class DeckPlanReq(BaseModel):
    topic:       str
    style:       str  = "academic"   # academic | business | pitch | minimal
    length:      str  = "standard"   # short | standard | deep
    audience:    str  = "Research peers"
    source_text: str  = ""           # paste from PDF / notes
    user_id:      str = ""

@app.post("/deck/extract")
async def deck_extract(
    file: UploadFile = File(...),
    user_id: str = Form(""),
):
    """
    Extracts raw text from a PDF or Word document for use as deck source material.
    Returns { text: "..." }
    """
    require_paid_user(user_id, "Research Deck")
    import pdf as pdf_module
    contents = await file.read()
    text = pdf_module.extract_intel(contents, file.filename or "upload.pdf")
    return {"text": text[:5000], "filename": file.filename}

@app.post("/deck/plan")
async def deck_plan(req: DeckPlanReq):
    """
    Step 1: AI generates a structured deck outline JSON.
    Client reviews it before generating the PPTX.
    """
    require_paid_user(req.user_id, "Research Deck")
    try:
        outline = await deck_engine.plan_deck(
            topic       = req.topic,
            style       = req.style,
            length      = req.length,
            audience    = req.audience,
            source_text = req.source_text,
        )
        return outline
    except Exception as e:
        import traceback as _tb
        print("Deck plan error:", _tb.format_exc())
        return {"error": str(e), "slides": []}

@app.post("/deck/generate")
async def deck_generate(payload: dict):
    """
    Step 2: Renders the approved outline JSON into a PPTX file.
    Payload is the full outline dict returned by /deck/plan.
    """
    require_paid_user(payload.get("user_id", ""), "Research Deck")
    return build_smart_presentation(payload)

# --------------------------------------------------
# 🔊 READ-ALOUD / STREAM
# --------------------------------------------------

@app.post("/generate-radio")
async def generate_radio(req: ChatReq):
    """
    Used for:
    - Read aloud playback
    - Radio mode playback
    """
    require_paid_user(req.user_id, "Radio Mode")
    return await voice.generate_voice_stream(req.message)

# --------------------------------------------------
# ⬇️ AUDIO EXPORT
# --------------------------------------------------

@app.post("/export-audio")
async def export_audio(req: ChatReq):
    """
    Downloads AI response as MP3 (single voice).
    """
    require_paid_user(req.user_id, "Audio export")
    return await voice.generate_simple_voice(req.message)

# --------------------------------------------------
# 🎬 VIDEO GENERATION
# --------------------------------------------------

class VideoReq(BaseModel):
    message: str
    duration: int = 5
    user_id: str | None = None

@app.post("/generate-video")
async def generate_video(req: VideoReq):
    """
    Generate a short cinematic video using Runway Gen-3 Turbo.
    Duration locked at 5s for cost control.
    """
    # Fetch user and enforce paid access + video quota
    user = require_paid_user(req.user_id, "Video generation")

    plan = user.get("plan", "free") if user else "free"
    if plan == "free":
        return {
            "type": "text",
            "content": "🔒 Video generation is available on **Plus** and **Pro** plans.\n\nFree users get **10 messages/day** but video generation requires an upgrade. [View Plans](/pricing.html)"
        }
    if not supabase_client.check_video_quota(user):
        return {
            "type": "text",
            "content": "📊 You've used all your video generations for this month. Upgrade to **Pro** for 25 videos/month. [View Plans](/pricing.html)"
        }

    print(f"🎬 Video request: {req.message[:50]}...")
    print(f"🎬 Runway API Key configured: {bool(config.RUNWAY_API_KEY)}")
    result = await video.generate_video(
        prompt=req.message,
        duration=min(req.duration, 5)   # Hard cap at 5s
    )
    print(f"🎬 Video result: {result.get('type')}")
    if result.get("type") == "video":
        supabase_client.increment_video_quota(user)
    return result

# --------------------------------------------------
# DEEP RESEARCH AGENT
# --------------------------------------------------

# --------------------------------------------------
# AI DETECTOR + PLAGIARISM CHECKER
# --------------------------------------------------

class DetectorReq(BaseModel):
    text: str
    user_id: str = ""

def _check_detector_plan(user_id: str):
    """Returns True if allowed (Pro/pro_trial only), raises 403 otherwise."""
    _u = require_paid_user(user_id, "AI Detector & Plagiarism Checker")
    _plan = (_u.get("plan", "free") or "free").lower()
    if _plan not in ("pro", "pro_trial", "pro_validation"):
        raise HTTPException(
            status_code=403,
            detail="AI Detector & Plagiarism Checker is a Pro-only feature. Visit /pricing.html to upgrade."
        )

@app.post("/detect-ai")
async def detect_ai_endpoint(req: DetectorReq):
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    _check_detector_plan(req.user_id)
    return await detector_module.detect_ai(req.text)

@app.post("/check-plagiarism")
async def check_plagiarism_endpoint(req: DetectorReq):
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    _check_detector_plan(req.user_id)
    return await detector_module.check_plagiarism(req.text)

@app.post("/extract-text")
async def extract_text_endpoint(
    file: UploadFile = File(...),
    user_id: str = Form(""),
):
    """Extract plain text from TXT, PDF, or DOCX uploads for the detector modals."""
    require_paid_user(user_id, "Text extraction")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    content = await file.read()

    try:
        if ext in ("txt", "md"):
            text = content.decode("utf-8", errors="ignore")

        elif ext == "pdf":
            import pdfplumber, io
            text_parts = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text_parts.append(t)
            text = "\n\n".join(text_parts)

        elif ext in ("docx", "doc"):
            import docx, io
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

        # Return the FULL extracted text — the AI Detector, Plagiarism Checker, and
        # Self-Plagiarism Checker all chunk arbitrarily long documents on the backend,
        # so truncating here silently dropped the back half of longer uploads.
        return {"text": text, "chars": len(text)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@app.post("/detect-ai-heatmap")
async def detect_ai_heatmap_endpoint(req: DetectorReq):
    """Sentence-level AI detection for heatmap visualisation."""
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    _check_detector_plan(req.user_id)
    return await detector_module.detect_ai_sentences(req.text)


@app.post("/humanize")
async def humanize_endpoint(req: DetectorReq):
    """Rewrite AI-generated text to read as authentically human-written."""
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    _check_detector_plan(req.user_id)
    return await detector_module.humanize_text(req.text)


class SelfPlagReq(BaseModel):
    text_a: str
    text_b: str
    user_id: str = ""

@app.post("/check-self-plagiarism")
async def check_self_plagiarism_endpoint(req: SelfPlagReq):
    """Compare two documents for self-plagiarism / content overlap."""
    if not req.text_a.strip() or not req.text_b.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Both documents must contain text.")
    _check_detector_plan(req.user_id)
    # Always returns 200 with a structured result, even on timeout (see `error`/`timed_out`
    # fields), so the frontend can show a clear message instead of a generic network error.
    return await detector_module.check_self_plagiarism(req.text_a, req.text_b)


class CitationCheckReq(BaseModel):
    text: str = ""
    bibliography: str = ""
    format: str = "APA 7th"
    user_id: str = ""

class StartPaperReq(BaseModel):
    user_id: str = ""

@app.post("/start-paper")
async def start_paper(req: StartPaperReq):
    if not req.user_id:
        return {"ok": False, "error": "auth"}

    user = require_paid_user(req.user_id, "Write a Paper")
    plan = user.get("plan", "free").lower()
    if plan == "free":
        return {"ok": False, "error": "upgrade"}

    user = supabase_client._apply_monthly_reset(user)
    allowed, used, limit = supabase_client.check_paper_quota(user)

    if not allowed:
        return {
            "ok": False,
            "error": "quota",
            "used": used,
            "limit": limit,
            "plan": plan
        }

    supabase_client.increment_paper_quota(user)
    return {"ok": True, "used": used + 1, "limit": limit, "plan": plan}


@app.post("/check-citations")
async def check_citations_endpoint(req: CitationCheckReq):
    if not req.text.strip() and not req.bibliography.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Provide text or bibliography to check.")
    require_paid_user(req.user_id, "Citation Checker")
    import config as _cfg
    from google import genai as _genai
    client = _genai.Client(api_key=_cfg.GEMINI_KEY)
    return await citation_checker_module.check_citations(req.text, req.bibliography, req.format, client)


import deep_research as dr_module

class DeepResearchStartReq(BaseModel):
    query:    str
    user_id:  str = ""   # Optional — empty string if not yet fully loaded on client
    use_max:  bool = False

@app.post("/deep-research/start")
async def deep_research_start(req: DeepResearchStartReq):
    if not req.query.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # ── Backend paid access + Pro gate ──
    _dr_user = require_paid_user(req.user_id, "Deep Research Agent")
    _dr_plan = (_dr_user.get("plan", "free") if _dr_user else "free").lower()

    if _dr_plan not in ("pro", "pro_trial", "pro_validation"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Deep Research Agent is a Pro-only feature.")

    job_id = await dr_module.start_research(
        query=req.query.strip(),
        user_id=req.user_id,
        use_max=req.use_max,
        user_plan=_dr_plan,
    )
    return {"job_id": job_id, "status": "starting"}

@app.get("/deep-research/status/{job_id}")
async def deep_research_status(job_id: str):
    from fastapi import HTTPException
    job = dr_module.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    require_paid_user(job.get("user_id", ""), "Deep Research Agent")
    dr_module.cleanup_old_jobs()
    return {
        "job_id":       job_id,
        "status":       job["status"],
        "progress_msg": job.get("progress_msg", ""),
        "elapsed":      job.get("elapsed", 0),
        "report":       job.get("report"),
        "error":        job.get("error"),
        "fallback":     job.get("fallback", False),
        "query":        job.get("query", ""),
        "activity":     job.get("activity", []),
    }

# --------------------------------------------------
# VERIFY WITH PAPERS — cross-check report vs Semantic Scholar
# --------------------------------------------------

class VerifyPapersReq(BaseModel):
    query:          str
    report_excerpt: str
    user_id:        str

@app.post("/deep-research/verify-papers")
async def verify_papers_endpoint(req: VerifyPapersReq):
    require_paid_user(req.user_id, "Research verification")
    import asyncio
    loop = asyncio.get_event_loop()

    papers = await dr_module._fetch_semantic_scholar(req.query)
    if not papers:
        return {"verification": (
            "## 🔬 Evidence Check\n\n"
            "No papers found on Semantic Scholar for this topic. "
            "This may be a very recent, niche, or emerging area with limited indexed literature.\n\n"
            "Try searching Google Scholar or PubMed directly for primary sources."
        )}

    # Format papers for the prompt
    papers_text = ""
    for i, p in enumerate(papers[:6], 1):
        title    = (p.get("title") or "Unknown")[:120]
        year     = p.get("year") or "N/A"
        abstract = (p.get("abstract") or "No abstract available.")[:350]
        authors  = p.get("authors") or []
        first    = authors[0].get("name", "Unknown") if authors else "Unknown"
        doi      = (p.get("externalIds") or {}).get("DOI", "")
        url_text = f" · doi.org/{doi}" if doi else ""
        papers_text += f"\n[P{i}] **{title}** — {first} ({year}){url_text}\n{abstract}\n"

    prompt = f"""You are a rigorous academic fact-checker. Your job is to cross-reference key claims in a research report against real peer-reviewed papers.

━━━ RESEARCH REPORT EXCERPT ━━━
{req.report_excerpt[:4000]}
━━━ END EXCERPT ━━━

━━━ REAL PAPERS FROM SEMANTIC SCHOLAR ━━━
{papers_text}
━━━ END PAPERS ━━━

Instructions:
1. Extract the 5 most important factual claims from the report (concrete, verifiable statements — not vague assertions)
2. For each claim, check whether any of the [P1]–[P{len(papers[:6])}] papers support, contradict, or partially support it
3. Output EXACTLY in this markdown format:

## 🔬 Evidence Check — Verified with Semantic Scholar

*{len(papers)} papers retrieved · {len(papers[:6])} analysed*

| # | Claim from Report | Status | Supporting Paper |
|---|---|---|---|
| 1 | [concise claim, max 18 words] | ✅ Supported | [Paper title, year] |
| 2 | [claim] | ⚠️ Partial | [Paper title, year] — [one reason it only partially matches] |
| 3 | [claim] | ❓ Not in papers | — |

### 📋 Verdict
[2–3 sentences on overall evidence quality. Mention the strongest supporting paper. Flag any critical claim that lacks backing.]

### 🔍 Most Relevant Papers
- **[Paper title]** ([Year]) — [one line: why it strengthens or complicates the report]

Rules: Be precise. Only cite [P1]–[P{len(papers[:6])}] — no invented references. Keep claims concise."""

    resp = await loop.run_in_executor(
        None,
        lambda: _client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
        )
    )
    return {"verification": resp.text}

# --------------------------------------------------
# SAVE DOCUMENT (plain text — used by Deep Research)
# --------------------------------------------------

class ExportPaperDocxReq(BaseModel):
    text:  str
    title: str = "Research Paper"
    user_id: str = ""

@app.post("/export-paper-docx")
async def export_paper_docx(req: ExportPaperDocxReq):
    """Convert a generated paper/report (markdown) into an editable .docx download."""
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No text to export.")
    require_paid_user(req.user_id, "Paper export")
    return export.markdown_to_docx(req.text, req.title)


class SaveTextDocReq(BaseModel):
    user_id: str
    filename: str
    text:     str

@app.post("/save-document-text")
async def save_document_text(req: SaveTextDocReq):
    """Save plain text (e.g. a deep research report) directly to the document library."""
    if not req.user_id or not req.text.strip():
        return {"success": False, "error": "Missing user_id or text"}
    try:
        require_paid_user(req.user_id, "Document Library")
        doc_data = documents_module.summarize_document(req.text, req.filename)
        user     = get_user_by_supabase_id(req.user_id)
        if not user:
            return {"success": False, "error": "User not found"}
        file_size_kb = max(1, len(req.text.encode()) // 1024)
        saved = documents_module.save_document(
            supabase     = supabase_client.supabase,
            user_id      = user["id"],
            filename     = req.filename,
            summary      = doc_data["summary"],
            key_terms    = doc_data["key_terms"],
            topics       = doc_data["topics"],
            file_size_kb = file_size_kb,
        )
        if saved:
            return {"success": True, "document": saved}
        return {"success": False, "error": "Failed to save document."}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"success": False, "error": str(e)}

# --------------------------------------------------
# PITCH DECK DOWNLOAD
# --------------------------------------------------

PPTX_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Dynamo_AI_Pitch_Deck.pptx")
SLIDE12_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Dynamo_AI_Slide12_Market.pptx")

@app.get("/download/pitch-deck")
def download_pitch_deck():
    if not os.path.exists(PPTX_PATH):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Pitch deck not found")
    return FileResponse(
        path=PPTX_PATH,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="Dynamo_AI_Pitch_Deck.pptx",
        headers={"Content-Disposition": "attachment; filename=Dynamo_AI_Pitch_Deck.pptx"},
    )

@app.get("/download/slide12-market")
def download_slide12():
    if not os.path.exists(SLIDE12_PATH):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Slide 12 not found")
    return FileResponse(
        path=SLIDE12_PATH,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="Dynamo_AI_Slide12_Market.pptx",
        headers={"Content-Disposition": "attachment; filename=Dynamo_AI_Slide12_Market.pptx"},
    )

# --------------------------------------------------
# RESEARCH WATCHER ENDPOINTS
# --------------------------------------------------

class WatchCreateReq(BaseModel):
    user_id: str
    topic: str
    frequency: str = "weekly"

class WatchToggleReq(BaseModel):
    user_id: str
    is_active: bool

@app.get("/watches")
async def get_watches_ep(user_id: str):
    user = require_paid_user(user_id, "Research Watcher")
    if (user.get("plan") or "").lower() not in ("pro", "pro_trial", "pro_validation"):
        raise HTTPException(status_code=403, detail="Research Watcher is a Pro-only feature.")
    w = watches_module.get_watches(supabase_client.supabase, user["id"])
    return {"watches": w}

@app.post("/watches")
async def create_watch_ep(req: WatchCreateReq):
    user = require_paid_user(req.user_id, "Research Watcher")
    if (user.get("plan") or "").lower() not in ("pro", "pro_trial", "pro_validation") and not supabase_client.is_demo_account(user):
        raise HTTPException(status_code=403, detail="Research Watcher is a Pro-only feature.")
    w = watches_module.create_watch(supabase_client.supabase, req.user_id, req.topic, req.frequency)
    return {"watch": w}

@app.delete("/watches/{watch_id}")
async def delete_watch_ep(watch_id: str, user_id: str):
    user = require_paid_user(user_id, "Research Watcher")
    if (user.get("plan") or "").lower() not in ("pro", "pro_trial", "pro_validation"):
        raise HTTPException(status_code=403, detail="Research Watcher is a Pro-only feature.")
    watches_module.delete_watch(supabase_client.supabase, watch_id, user["id"])
    return {"success": True}

@app.patch("/watches/{watch_id}")
async def toggle_watch_ep(watch_id: str, req: WatchToggleReq):
    user = require_paid_user(req.user_id, "Research Watcher")
    if (user.get("plan") or "").lower() not in ("pro", "pro_trial", "pro_validation"):
        raise HTTPException(status_code=403, detail="Research Watcher is a Pro-only feature.")
    w = watches_module.toggle_watch(supabase_client.supabase, watch_id, user["id"], req.is_active)
    return {"watch": w}

@app.post("/watches/{watch_id}/check")
async def check_watch_ep(watch_id: str, user_id: str):
    user = require_paid_user(user_id, "Research Watcher")
    if (user.get("plan") or "").lower() not in ("pro", "pro_trial", "pro_validation") and not supabase_client.is_demo_account(user):
        raise HTTPException(status_code=403, detail="Research Watcher is a Pro-only feature.")
    user_id = user["id"]
    watch_list = watches_module.get_watches(supabase_client.supabase, user_id)
    watch = next((w for w in watch_list if w["id"] == watch_id), None)
    if not watch:
        return {"error": "Watch not found"}
    user = supabase_client.supabase.table("users").select("email,full_name").eq("id", user_id).single().execute()
    email = user.data.get("email", "") if user.data else ""
    name = user.data.get("full_name", "") if user.data else ""
    result = watcher_check.check_topic(watch["topic"], email, name)
    # Always stamp last_checked_at after manual check too
    watches_module.mark_checked(supabase_client.supabase, watch_id)
    return result

# ─── PITCH DECK DOWNLOADS ────────────────────────────────────────────
@app.get("/download/investor-deck.pptx")
async def download_investor_deck():
    from fastapi.responses import Response
    data = pitch_export.build_investor_pptx()
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": 'attachment; filename="Dynamo_AI_Investor_Deck.pptx"'},
    )

@app.get("/download/investor-deck-visual.pptx")
async def download_investor_deck_visual():
    """Screenshot-based PPTX — pixel-perfect match of the canvas slides."""
    from fastapi.responses import Response
    data = await pitch_screenshot.build_image_pptx()
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": 'attachment; filename="Dynamo_AI_Investor_Deck_Visual.pptx"'},
    )

@app.get("/download/investor-deck.pdf")
async def download_investor_deck_pdf():
    """Screenshot-based PDF — pixel-perfect match of the canvas slides."""
    from fastapi.responses import Response
    data = await pitch_screenshot.build_pdf()
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Dynamo_AI_Investor_Deck.pdf"'},
    )

# STATIC FILES (frontend — must come last)
# --------------------------------------------------

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=False), name="frontend")

# --------------------------------------------------
# SERVER
# --------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
