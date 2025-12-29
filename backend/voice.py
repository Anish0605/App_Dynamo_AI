# voice.py — Dynamo AI (FINAL, SAFE, CLEANUP-SAFE)

import uuid
import os
import edge_tts
from fastapi.responses import FileResponse, JSONResponse

# --------------------------------------------------
# TEXT → SPEECH (EDGE TTS)
# --------------------------------------------------

async def generate_voice_stream(text: str, voice: str = "en-IN-PrabhatNeural"):
    """
    Generates an MP3 voice output from text using Microsoft Edge TTS.
    Safe for Render, no file leaks, no API keys.
    """

    # -------------------------
    # VALIDATION
    # -------------------------
    if not isinstance(text, str) or not text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No text provided for voice output"}
        )

    # 🔒 Hard limit to prevent TTS overload / timeout
    safe_text = text.strip()[:1500]

    # Unique temp file
    temp_filename = f"voice_{uuid.uuid4()}.mp3"

    try:
        # -------------------------
        # TTS ENGINE
        # -------------------------
        communicate = edge_tts.Communicate(
            safe_text,
            voice=voice  # default: en-IN-PrabhatNeural
        )

        await communicate.save(temp_filename)

        # -------------------------
        # STREAM RESPONSE + CLEANUP
        # -------------------------
        return FileResponse(
            path=temp_filename,
            media_type="audio/mpeg",
            filename="dynamo_ai_voice.mp3",
            background=lambda: safe_delete(temp_filename)
        )

    except Exception as e:
        print("Voice Error:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Voice generation failed"}
        )

# --------------------------------------------------
# SAFE FILE CLEANUP
# --------------------------------------------------

def safe_delete(path: str):
    """
    Deletes temp audio file after response is sent.
    Prevents disk leaks on Render.
    """
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print("Voice Cleanup Error:", e)
