# main.py — Dynamo AI Central Router (FINAL, CLEAN)

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
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

from supabase_client import (get_or_create_user,create_chat,save_message,fetch_chat_messages)
from export_routes import router as export_router
from presentation_engine import build_presentation

# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------

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
    model: str = "gemini-2.0-flash"
    chat_id: str | None = None
    user_id: str | None = None
# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/")
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
    
# --------------------------------------------------
# CHAT
# --------------------------------------------------

@app.post("/chat")
async def chat(req: ChatReq):

    msg_lower = req.message.lower()

    IMAGE_KEYWORDS = [
        "create an image",
        "generate an image",
        "create image",
        "generate image",
        "draw",
        "picture",
        "illustration",
        "visual"
    ]

    # 🖼 Image (NO CHANGE)
    if any(k in msg_lower for k in IMAGE_KEYWORDS):
        return await image.generate_image_base64(req.message)

    #  Video (ADD RECENTLY)
    VIDEO_KEYWORDS = [
    "create video",
    "generate video",
    "make video",
    "animation",
    "video"
    ]

    if any(k in msg_lower for k in VIDEO_KEYWORDS):
    import video
    return await video.generate_video(req.message)
    # FLOWCHART (ADDED NOW)
    FLOWCHART_KEYWORDS = [
        "flowchart",
        "process flow",
        "workflow",
        "steps"
        ]

    if any(k in msg_lower for k in FLOWCHART_KEYWORDS):
    import flowchart
    return flowchart.generate_flowchart(req.message)    
    
    # -------------------------
    # 🧠 1. USER HANDLING
    # -------------------------
    user = None
    if req.user_id:
        user = get_or_create_user(req.user_id)
    # -------------------------
    # 🚫 1.1 QUOTA CHECK (ADD HERE)
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
    if req.use_search:
        context = search.get_web_context(req.message, req.deep_dive)

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
    # 🔥 6.1 INCREMENT QUOTA (ADD HERE)
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
    return build_presentation(payload)

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
# SERVER
# --------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(
        "app_main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
