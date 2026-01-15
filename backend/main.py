# app_main.py — Dynamo AI Central Router (FINAL, CLEAN)

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

    # 🖼 Image
    if any(k in msg_lower for k in IMAGE_KEYWORDS):
        return await image.generate_image_base64(req.message)

    # 🔍 Search
    context = ""
    if req.use_search:
        context = search.get_web_context(req.message, req.deep_dive)

    # 🧠 AI
    response = model.get_ai_response(
        prompt=req.message,
        history=req.history,
        model_name=req.model,
        context=context,
        deep_dive=req.deep_dive
    )

    return {
        "type": "text",
        "content": response
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
