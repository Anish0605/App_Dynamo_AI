# voice.py — Dynamo AI (RADIO + READ-ALOUD | FINAL)

import uuid
import os
import json
import edge_tts
from fastapi.responses import FileResponse, JSONResponse
import model

# --------------------------------------------------
# 🔊 READ-ALOUD / DOWNLOAD (SINGLE VOICE)
# --------------------------------------------------

async def generate_simple_voice(text: str):
    """
    Converts plain text into a single-voice MP3.
    Used for:
    - Read aloud
    - Audio download
    """

    if not isinstance(text, str) or not text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No text provided for audio export"}
        )

    safe_text = text.strip()[:2000]  # safe limit for Edge TTS
    filename = f"audio_{uuid.uuid4()}.mp3"

    try:
        communicate = edge_tts.Communicate(
            safe_text,
            voice="en-IN-PrabhatNeural"
        )

        await communicate.save(filename)

        return FileResponse(
            path=filename,
            media_type="audio/mpeg",
            filename="dynamo_ai_audio.mp3",
            background=lambda: safe_delete(filename)
        )

    except Exception as e:
        print("Read-aloud TTS Error:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Audio generation failed"}
        )


# --------------------------------------------------
# 🎧 RADIO MODE (TWO-PERSON DIALOGUE)
# --------------------------------------------------

async def generate_voice_stream(prompt: str):
    """
    Converts text into a two-person radio dialogue
    and generates ONE continuous MP3.
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

    # -------------------------
    # STEP 1: GENERATE DIALOGUE
    # -------------------------
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

    # -------------------------
    # STEP 2: BUILD SCRIPT
    # -------------------------
    script_parts = []
    for turn in data.get("dialogue", []):
        speaker = turn.get("speaker", "Speaker")
        text = turn.get("text", "")
        script_parts.append(f"{speaker}: {text}")

    full_script = " ".join(script_parts)
    safe_script = full_script[:1500]

    filename = f"radio_{uuid.uuid4()}.mp3"

    # -------------------------
    # STEP 3: TTS
    # -------------------------
    try:
        communicate = edge_tts.Communicate(
            safe_script,
            voice="en-IN-PrabhatNeural"
        )

        await communicate.save(filename)

        return FileResponse(
            path=filename,
            media_type="audio/mpeg",
            filename="dynamo_radio.mp3",
            background=lambda: safe_delete(filename)
        )

    except Exception as e:
        print("Radio TTS Error:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Radio audio generation failed"}
        )


# --------------------------------------------------
# 🧹 SAFE FILE CLEANUP
# --------------------------------------------------

def safe_delete(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print("Cleanup Error:", e)
