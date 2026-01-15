# voice.py — Dynamo AI (RADIO + READ-ALOUD)

import uuid
import os
import json
import edge_tts
from fastapi.responses import FileResponse, JSONResponse
import model

# --------------------------------------------------
# 🔊 SIMPLE READ-ALOUD (SINGLE VOICE)
# --------------------------------------------------

async def generate_simple_voice(text: str):
    """
    Converts plain text into a single-voice MP3.
    Used for READ ALOUD + DOWNLOAD.
    """

    if not isinstance(text, str) or not text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No text provided for audio export"}
        )

    safe_text = text.strip()[:2000]  # slightly higher for downloads
    temp_filename = f"audio_{uuid.uuid4()}.mp3"

    try:
        communicate = edge_tts.Communicate(
            safe_text,
            voice="en-IN-PrabhatNeural"
        )

        await communicate.save(temp_filename)

        return FileResponse(
            path=temp_filename,
            media_type="audio/mpeg",
            filename="dynamo_ai_audio.mp3",
            background=lambda: safe_delete(temp_filename)
        )

    except Exception as e:
        print("Read-aloud TTS Error:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Audio export failed"}
        )


# --------------------------------------------------
# 🎧 RADIO MODE (UNCHANGED)
# --------------------------------------------------

async def generate_voice_stream(prompt: str):
    """
    Converts input text into a 2-person radio dialogue
    and generates a single MP3 audio.
    """

    if not isinstance(prompt, str) or not prompt.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No text provided for radio mode"}
        )

    system_prompt = f"""
Convert the topic below into a short, engaging
two-person radio conversation.

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- Format EXACTLY like:

{{
  "dialogue": [
    {{ "speaker": "Host", "text": "..." }},
    {{ "speaker": "Expert", "text": "..." }}
  ]
}}

Topic:
{prompt}
"""

    try:
        response = model.get_ai_response(
            prompt=system_prompt,
            history=[],
            model_name="gemini-2.0-flash"
        )
        data = json.loads(response)

    except Exception as e:
        print("Dialogue generation error:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate radio dialogue"}
        )

    script = " ".join(
        f"{d.get('speaker')}: {d.get('text')}"
        for d in data.get("dialogue", [])
    )

    safe_script = script[:1500]
    temp_filename = f"radio_{uuid.uuid4()}.mp3"

    try:
        communicate = edge_tts.Communicate(
            safe_script,
            voice="en-IN-PrabhatNeural"
        )
        await communicate.save(temp_filename)

        return FileResponse(
            path=temp_filename,
            media_type="audio/mpeg",
            filename="dynamo_radio.mp3",
            background=lambda: safe_delete(temp_filename)
        )

    except Exception as e:
        print("Radio TTS Error:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Radio audio generation failed"}
        )


# --------------------------------------------------
# SAFE FILE CLEANUP
# --------------------------------------------------

def safe_delete(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print("Cleanup Error:", e)
