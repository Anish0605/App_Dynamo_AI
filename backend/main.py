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
import video
import supabase_client
import flowchart
import mindmap

from supabase_client import (get_or_create_user,get_user_by_supabase_id,create_chat,save_message,fetch_chat_messages)
from export_routes import router as export_router
from presentation_engine import build_presentation
from payments import router as payments_router

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
app.include_router(payments_router)

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
async def chat(req: ChatReq):

    msg_lower = req.message.lower()

    # 📊 Flowchart Detection (CHECK FIRST)
    FLOWCHART_KEYWORDS = [
        "flowchart",
        "process flow",
        "workflow",
        "steps"
    ]

    if any(k in msg_lower for k in FLOWCHART_KEYWORDS):
        return flowchart.generate_flowchart(req.message)

    # 🧠 Mindmap Detection
    MINDMAP_KEYWORDS = [
        "mindmap",
        "mind map",
        "idea map",
        "brainstorm"
    ]

    if any(k in msg_lower for k in MINDMAP_KEYWORDS):
        return mindmap.generate_mindmap(req.message)

    # 🧩 Quiz Detection (MUST BE BEFORE IMAGE)
    QUIZ_KEYWORDS = ["quiz", "mcq", "multiple choice", "test me", "questions", "exam"]
    is_quiz_request = any(k in msg_lower for k in QUIZ_KEYWORDS)
    
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
        (any(k in msg_lower for k in IMAGE_KEYWORDS) or
        any(k in msg_lower.split() for k in SINGLE_WORD_KEYWORDS) or
        req.force_image) and not is_quiz_request  # Don't generate image if quiz requested
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
            return {"type": "error", "code": "no_image_free"}
        if not supabase_client.check_image_quota(user):
            return {"type": "error", "code": "image_quota_exceeded"}
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
    # 🔍 4. SEARCH
    # -------------------------
    context = ""
    sources = []
    if req.use_search:
        context = search.get_web_context(req.message, req.deep_dive)
        sources = search.get_sources(req.message, req.deep_dive)

    # -------------------------
    # 🤖 5. AI RESPONSE
    # -------------------------
    response = model.get_ai_response(
        prompt=req.message,
        history=history,
        model_name=req.model,
        context=context,
        deep_dive=req.deep_dive
    )

    # -------------------------
    # 💾 6. SAVE TO DB
    # -------------------------
    if chat_id:
        save_message(chat_id, "user", req.message)
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
        "chat_id": chat_id,
        "sources": sources if req.use_search else []
    }

# --------------------------------------------------
# FOLLOW-UPS ENDPOINT
# --------------------------------------------------

class FollowUpReq(BaseModel):
    message: str
    response: str

@app.post("/follow-ups")
async def follow_ups(req: FollowUpReq):
    import google.generativeai as genai
    import config as cfg
    import json
    import re
    genai.configure(api_key=cfg.GEMINI_KEY)
    prompt = (
        f"User asked: {req.message}\n\n"
        f"AI answered: {req.response[:500]}\n\n"
        "List 4 short follow-up questions the user might ask next.\n"
        "Rules: Return ONLY a valid JSON array of 4 strings. No markdown. No explanation.\n"
        "Output format: [\"Question 1?\", \"Question 2?\", \"Question 3?\", \"Question 4?\"]"
    )
    try:
        m = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        r = m.generate_content(prompt)
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
# CHAT WITH FILE (FormData — separate endpoint)
# --------------------------------------------------

@app.post("/chat-with-file")
async def chat_with_file(
    file: UploadFile = File(...),
    message: str = "",
    user_id: str = "",
    chat_id: str = "",
    history: str = "[]"
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
            model_name="gemini-2.0-flash",
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
        import google.generativeai as genai
        
        # Read audio file
        audio_bytes = await audio.read()
        
        # Use Gemini's audio understanding (free & fast)
        genai.configure(api_key=config.GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        # Convert audio to base64
        import base64
        audio_b64 = base64.b64encode(audio_bytes).decode()
        
        # Ask Gemini to transcribe
        response = model.generate_content([
            "Please transcribe this audio to text. Return ONLY the transcribed text, no explanations.",
            {
                "mime_type": "audio/wav",
                "data": audio_b64
            }
        ])
        
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
        return {"type": "error", "code": "no_video_free"}
    if not supabase_client.check_video_quota(user):
        return {"type": "error", "code": "video_quota_exceeded"}

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
