# app_main.py — Dynamo AI Central Router (FINAL & LOCKED)

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

# -------------------------
# INTERNAL MODULE IMPORTS
# -------------------------
import config
import model
import search
import image
import voice
import analysis
import export
import supabase_client

# Routers & Engines
from export_routes import router as export_router
from presentation_engine import build_presentation

# -------------------------
# APP INITIALIZATION
# -------------------------
app = FastAPI(title="Dynamo AI Hub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten later
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# ROUTERS
# -------------------------
app.include_router(export_router)   # /export/pdf | /export/word | /export/ppt

@app.post("/generate-ppt-smart")
async def generate_ppt(payload: dict):
    """
    Smart presentation generation (Gemini / DeepSeek → PPT)
    """
    return build_presentation(payload)

# -------------------------
# REQUEST MODELS
# -------------------------
class ChatReq(BaseModel):
    message: str
    history: list = []
    use_search: bool = True
    deep_dive: bool = False
    model: str = "gemini-2.0-flash"  # Fast Mode default

# -------------------------
# HEALTH CHECK
# -------------------------
@app.get("/")
async def health():
    return {
        "status": "online",
        "identity": "Dynamo AI"
    }

# -------------------------
# CHAT ENDPOINT
# -------------------------
@app.post("/chat")
async def chat(req: ChatReq):
    msg_lower = req.message.lower()

    # -------------------------
    # IMAGE GENERATION
    # -------------------------
    if any(k in msg_lower for k in ["generate image", "create image"]):
        prompt = (
            req.message.split("of")[-1].strip()
            if "of" in msg_lower
            else req.message
        )
        return await image.generate_image_base64(prompt)

    # -------------------------
    # SEARCH CONTEXT
    # -------------------------
    context = ""
    if req.use_search:
        context = search.get_web_context(
            req.message,
            req.deep_dive
        )

    # -------------------------
    # AI RESPONSE (🔥 FIXED)
    # -------------------------
    response = model.get_ai_response(
        prompt=req.message,
        history=req.history,
        model_name=req.model,
        context=context,
        deep_dive=req.deep_dive   # ✅ THIS WAS THE CRITICAL FIX
    )

    return {
        "type": "text",
        "content": response
    }

# -------------------------
# FILE ANALYSIS
# -------------------------
@app.post("/analyze-data")
async def analyze_data(file: UploadFile = File(...)):
    contents = await file.read()
    return analysis.process_file_universally(
        contents,
        file.filename
    )

# -------------------------
# RADIO / AUDIO
# -------------------------
@app.post("/generate-radio")
async def radio(req: ChatReq):
    return await voice.generate_voice_stream(req.message)

# -------------------------
# ENTRY POINT
# -------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
