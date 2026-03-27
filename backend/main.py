# main.py — Dynamo AI Central Router (FINAL, CLEAN)

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os

import config
import model
import search
import image
import voice
import analysis
import export
import supabase_client

from supabase_client import (get_or_create_user,get_user_by_supabase_id,create_chat,save_message,fetch_chat_messages)
from export_routes import router as export_router
from presentation_engine import build_presentation

# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app = FastAPI(title="Dynamo AI Hub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export_router)

# --------------------------------------------------
# MODELS
# --------------------------------------------------

class ChatReq(BaseModel):
    message: str
    history: list = []
    use_search: bool = True
    deep_dive: bool = False
    force_image: bool = False
    model: str = "gemini-2.0-flash"
    chat_id: str | None = None
    user_id: str | None = None
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
    
# --------------------------------------------------
# CHAT
# --------------------------------------------------

@app.post("/chat")
async def chat(
    message: str = None,
    history: str = None,
    use_search: bool = True,
    deep_dive: bool = False,
    force_image: bool = False,
    chat_id: str = None,
    user_id: str = None,
    file: UploadFile = None
):
    # Handle both FormData and JSON requests
    import json as _json
    
    # Parse history if it's a string (FormData)
    if isinstance(history, str):
        try:
            history = _json.loads(history)
        except:
            history = []
    elif not history:
        history = []

    msg_lower = (message or "").lower()

    # 🎯 FILE ANALYSIS MODE (IF FILE PROVIDED)
    if file:
        try:
            file_bytes = await file.read()
            analysis_result = analysis.process_file_universally(file_bytes, file.filename)
            
            # Build context from file analysis
            file_context = f"User uploaded: {file.filename}\n"
            file_context += f"File analysis: {analysis_result.get('content', '')[:2000]}\n"
            if message:
                file_context += f"User instruction: {message}\n"
            
            # Send to AI with file context
            response = model.get_ai_response(
                prompt=file_context,
                history=history,
                model_name="gemini-2.0-flash",
                context="",
                deep_dive=deep_dive
            )
            
            return {
                "type": "text",
                "content": response,
                "chat_id": chat_id,
                "file_analyzed": file.filename
            }
        except Exception as e:
            return {
                "type": "error",
                "content": f"File analysis failed: {str(e)}"
            }

    # 🖼 Image Detection (FLEXIBLE)
    IMAGE_KEYWORDS = [
        "create an image",
        "create a image",
        "generate an image", 
        "generate a image",
        "create image",
        "generate image",
        "draw ",
        "picture",
        "illustration",
        "visual"
    ]
    
    SINGLE_WORD_KEYWORDS = ["image", "photo", "artwork", "drawing"]
    
    is_image_prompt = (
        any(k in msg_lower for k in IMAGE_KEYWORDS) or
        any(k in msg_lower.split() for k in SINGLE_WORD_KEYWORDS) or
        force_image
    )

    # 🖼 Image (NO CHANGE)
    if is_image_prompt:
        return await image.generate_image_base64(message)

    # -------------------------
    # 🧠 1. USER HANDLING
    # -------------------------
    user = None
    if user_id:
        # user_id from frontend is always the Supabase UUID (not firebase_uid)
        user = get_user_by_supabase_id(user_id)
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
    if not chat_id and user:
        chat = create_chat(user["id"], title=(message or "New chat")[:30])
        chat_id = chat["id"] if chat else None

    # -------------------------
    # 📜 3. LOAD HISTORY
    # -------------------------
    if chat_id:
        db_messages = fetch_chat_messages(chat_id)
        history = []
        for m in db_messages:
            history.append({
                "role": m["role"],
                "content": m["content"]
            })

    # -------------------------
    # 🔍 4. SEARCH
    # -------------------------
    context = ""
    if use_search and message:
        context = search.get_web_context(message, deep_dive)

    # -------------------------
    # 🤖 5. AI RESPONSE
    # -------------------------
    response = model.get_ai_response(
        prompt=message or "hello",
        history=history,
        model_name="gemini-2.0-flash",
        context=context,
        deep_dive=deep_dive
    )

    # -------------------------
    # 💾 6. SAVE TO DB
    # -------------------------
    if chat_id:
        save_message(chat_id, "user", message or "[File uploaded]")
        save_message(chat_id, "assistant", response)
    # -------------------------
    # 🔥 6.1 INCREMENT QUOTA
    # -------------------------
    if user:
        supabase_client.increment_quota(user)
    # -------------------------
    # 📤 7. RETURN
    # -------------------------
    return {
        "type": "text",
        "content": response,
        "chat_id": chat_id
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
    import google.generativeai as genai

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
        ai_model = genai.GenerativeModel("gemini-2.0-flash")
        resp = ai_model.generate_content(slide_prompt)
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
