# main.py — Dynamo AI Central Router (FINAL, CLEAN)

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os

import asyncio
import traceback
import config
import model
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

from supabase_client import (get_or_create_user,get_user_by_supabase_id,create_chat,save_message,fetch_chat_messages)
from export_routes import router as export_router
from presentation_engine import build_presentation, build_smart_presentation
from payments import router as payments_router
import detector as detector_module

# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app = FastAPI(title="Dynamo AI Hub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.dynamoai.in","https://dynamoai.in"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export_router)
app.include_router(payments_router)

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
    model: str = "gemini-3.1-flash-lite-preview"
    mode: str = "chat"  # "chat" | "research" — explicit mode flag
    chat_id: str | None = None
    user_id: str | None = None
    smart_action: bool = False  # True = skip keyword routing (Summarise, Explain, etc.)
    citation_format: str = ""   # e.g. "IEEE", "APA7", "MLA", "Harvard", "Vancouver", "Chicago", "Springer", "ACS"
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
    user = supabase_client.get_user_by_supabase_id(req.user_id)
    
    if not user:
        return {"error": "User not found"}
    
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "plan": user.get("plan"),
        "daily_quota_used": user.get("daily_quota_used", 0),
        "quota_date": user.get("quota_date"),
        "image_count_used": user.get("image_count_used", 0),
        "video_count_used": user.get("video_count_used", 0),
        "quota_month": user.get("quota_month")
    }
    
# --------------------------------------------------
# CHAT
# --------------------------------------------------

@app.post("/flashcard")
async def generate_flashcard(req: FlashcardReq):
    user = None
    if req.user_id:
        user = get_user_by_supabase_id(req.user_id)
        if user and not supabase_client.check_user_quota(user):
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

    msg_lower = req.message.lower()

    # ── Keyword routing (ALL gated by smart_action) ──────────────────────────────
    # smart_action=True bypasses every keyword router — used by DR follow-ups,
    # Draft Academic Paper, Summarise, Explain, Find Research Gaps, etc.
    # This prevents a 6,000-word research report (full of words like "video",
    # "steps", "workflow", "brainstorm") from triggering the wrong handler.

    if not req.smart_action:

        # 📊 Flowchart Detection
        FLOWCHART_KEYWORDS = ["flowchart", "process flow", "workflow", "steps"]
        if any(k in msg_lower for k in FLOWCHART_KEYWORDS):
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
    user = None
    if req.user_id:
        user = get_user_by_supabase_id(req.user_id)

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
        print(f"RESEARCH MODE TRIGGERED | citation_format={req.citation_format or 'none'}")
        # Fetch web context first for the research pipeline
        research_web_context = ""
        research_sources = []
        try:
            research_web_context = search.get_web_context(req.message, deep_dive=True)
            research_sources = search.get_sources(req.message, deep_dive=True)
        except Exception as e:
            print(f"[Research] Web search failed: {e}")

        try:
            paper_content = multi_model_router.research_pipeline(
                topic=req.message,
                web_context=research_web_context,
                citation_format=req.citation_format
            )
            result = {
                "type": "research",
                "content": paper_content,
                "sources": research_sources
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
        doc_context=doc_context
    )

    # -------------------------
    # 💾 6. SAVE TO DB
    # -------------------------
    if chat_id:
        save_message(chat_id, "user", req.message)
        save_message(chat_id, "assistant", response)

    # -------------------------
    # 🧠 6.5 EXTRACT MEMORIES (background)
    # -------------------------
    if user:
        def _extract_and_save():
            try:
                new_memories = memory_module.extract_memories(req.message, response)
                if new_memories:
                    memory_module.save_memories(supabase_client.supabase, user["id"], new_memories)
            except Exception as e:
                print(f"Background memory extraction error: {e}")
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, _extract_and_save)

    # -------------------------
    # 🔥 6.6 INCREMENT QUOTA
    # -------------------------
    if user:
        supabase_client.increment_quota(user)
    # -------------------------
    # 📤 7. RETURN
    # -------------------------
    return {
        "type": "text",
        "content": response,
        "chat_id": chat_id,
        "sources": sources if req.use_search else []
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

@app.post("/follow-ups")
async def follow_ups(req: FollowUpReq):
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
            model="gemini-3.1-flash-lite-preview",
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
    docs = documents_module.fetch_documents(supabase_client.supabase, user_id)
    return {"documents": docs}

@app.delete("/documents/{doc_id}")
async def delete_document_ep(doc_id: str):
    ok = documents_module.delete_document(supabase_client.supabase, doc_id)
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

@app.post("/chat-with-file")
async def chat_with_file(
    file: UploadFile = File(...),
    message: str = Form(""),
    user_id: str = Form(""),
    chat_id: str = Form(""),
    history: str = Form("[]")
):
    import json as _json

    try:
        parsed_history = _json.loads(history)
    except Exception:
        parsed_history = []

    try:
        file_bytes = await file.read()
        analysis_result = analysis.process_file_universally(file_bytes, file.filename)

        file_content = analysis_result.get("content", "")[:3000]
        user_instruction = message.strip() if message.strip() else "Summarize this document."

        combined_prompt = (
            f"The user uploaded a file: {file.filename}\n\n"
            f"File content:\n{file_content}\n\n"
            f"User instruction: {user_instruction}"
        )

        response = model.get_ai_response(
            prompt=combined_prompt,
            history=parsed_history,
            model_name="gemini-3.1-flash-lite-preview",
            context="",
            deep_dive=False
        )

        return {
            "type": "text",
            "content": response,
            "chat_id": chat_id or None,
            "file_analyzed": file.filename
        }
    except Exception as e:
        return {
            "type": "error",
            "content": f"File analysis failed: {str(e)}"
        }

# --------------------------------------------------
# 🎤 SPEECH-TO-TEXT (VOICE TRANSCRIPTION)
# --------------------------------------------------

@app.post("/transcribe-audio")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Convert audio to text using Google Cloud Speech-to-Text or fallback.
    """
    try:
        from google import genai as _genai
        from google.genai import types as _gtypes
        import base64

        # Read audio file
        audio_bytes = await audio.read()
        _gclient = _genai.Client(api_key=config.GEMINI_KEY)

        # Ask Gemini to transcribe
        response = _gclient.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=[
                _gtypes.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
                "Please transcribe this audio to text. Return ONLY the transcribed text, no explanations."
            ]
        )
        
        return {
            "text": response.text.strip(),
            "status": "success"
        }
    except Exception as e:
        return {
            "text": "",
            "status": "error",
            "error": str(e)
        }

# --------------------------------------------------
# FILE ANALYSIS
# --------------------------------------------------

@app.post("/analyze-data")
async def analyze_data(file: UploadFile = File(...)):
    contents = await file.read()
    return analysis.process_file_universally(contents, file.filename)

# --------------------------------------------------
# PPT
# --------------------------------------------------

@app.post("/generate-ppt-smart")
async def generate_ppt(payload: dict):
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
            model="gemini-3.1-flash-lite-preview",
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

@app.post("/deck/extract")
async def deck_extract(file: UploadFile = File(...)):
    """
    Extracts raw text from a PDF or Word document for use as deck source material.
    Returns { text: "..." }
    """
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
    return await voice.generate_voice_stream(req.message)

# --------------------------------------------------
# ⬇️ AUDIO EXPORT
# --------------------------------------------------

@app.post("/export-audio")
async def export_audio(req: ChatReq):
    """
    Downloads AI response as MP3 (single voice).
    """
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
    # Fetch user and enforce video quota
    user = None
    if req.user_id:
        user = get_user_by_supabase_id(req.user_id)

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

@app.post("/detect-ai")
async def detect_ai_endpoint(req: DetectorReq):
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    return await detector_module.detect_ai(req.text)

@app.post("/check-plagiarism")
async def check_plagiarism_endpoint(req: DetectorReq):
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    return await detector_module.check_plagiarism(req.text)

@app.post("/extract-text")
async def extract_text_endpoint(file: UploadFile = File(...)):
    """Extract plain text from TXT, PDF, or DOCX uploads for the detector modals."""
    from fastapi import HTTPException
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

        return {"text": text[:15000], "chars": len(text)}

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
    return await detector_module.detect_ai_sentences(req.text)


@app.post("/humanize")
async def humanize_endpoint(req: DetectorReq):
    """Rewrite AI-generated text to read as authentically human-written."""
    if not req.text.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    return await detector_module.humanize_text(req.text)


class SelfPlagReq(BaseModel):
    text_a: str
    text_b: str

@app.post("/check-self-plagiarism")
async def check_self_plagiarism_endpoint(req: SelfPlagReq):
    """Compare two documents for self-plagiarism / content overlap."""
    if not req.text_a.strip() or not req.text_b.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Both documents must contain text.")
    return await detector_module.check_self_plagiarism(req.text_a, req.text_b)


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
    job_id = await dr_module.start_research(
        query=req.query.strip(),
        user_id=req.user_id,
        use_max=req.use_max,
    )
    return {"job_id": job_id, "status": "starting"}

@app.get("/deep-research/status/{job_id}")
async def deep_research_status(job_id: str):
    from fastapi import HTTPException
    job = dr_module.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
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
            model="gemini-3-flash-preview",
            contents=prompt,
        )
    )
    return {"verification": resp.text}

# --------------------------------------------------
# SAVE DOCUMENT (plain text — used by Deep Research)
# --------------------------------------------------

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
