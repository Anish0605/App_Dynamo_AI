# voice.py — Dynamo AI (RADIO MODE PHASE-1, STABLE)

import uuid
import os
import json
import edge_tts
from fastapi.responses import FileResponse, JSONResponse
import model

# --------------------------------------------------
# RADIO MODE: TEXT → DIALOGUE → SPEECH
# --------------------------------------------------

async def generate_voice_stream(prompt: str):
    """
    Converts input text into a 2-person radio dialogue
    and generates a single MP3 audio using Edge TTS.
    """

    if not isinstance(prompt, str) or not prompt.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No text provided for radio mode"}
        )

    # -------------------------
    # STEP 1: CREATE DIALOGUE
    # -------------------------
    system_prompt = f"""
Convert the topic below into a short, engaging
two-person radio conversation.

Rules (STRICT):
- Return ONLY valid JSON
- No markdown, no explanations
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

    # -------------------------
    # STEP 2: BUILD CLEAN SCRIPT
    # -------------------------
    script_parts = []
    for turn in data.get("dialogue", []):
        speaker = turn.get("speaker", "Speaker")
        text = turn.get("text", "")
        script_parts.append(f"{speaker}: {text}")

    full_script = " ".join(script_parts)

    # Safety limit for TTS
    safe_script = full_script[:1500]

    # -------------------------
    # STEP 3: EDGE TTS
    # -------------------------
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
