# flashcard.py — Dynamo AI Flashcard Engine

import json
import re
import model


def build_flashcard_prompt(topic: str, difficulty: str, count: int) -> str:
    return f"""Create exactly {count} flashcards on the topic: {topic}

Difficulty: {difficulty}

STRICT RULES:
- Return ONLY valid JSON — no markdown, no explanation, no code fences
- Each card must have: front (question or term), back (answer or definition), hint (short clue, max 8 words)
- "front" should be a concise question or key term
- "back" should be a clear, complete answer or definition
- "hint" should be a short nudge that helps recall without giving the answer away

Return format:
{{
  "flashcards": [
    {{
      "front": "string",
      "back": "string",
      "hint": "string"
    }}
  ]
}}

Topic: {topic}
Difficulty: {difficulty}
Count: {count}"""


def generate_flashcards(topic: str, difficulty: str = "medium", count: int = 5) -> dict:
    prompt = build_flashcard_prompt(topic, difficulty, count)

    raw = model.get_ai_response(
        prompt=prompt,
        history=[],
        model_name="gemini-3.1-flash-lite-preview",
        context="",
        deep_dive=False
    )

    try:
        clean = raw.strip()
        clean = re.sub(r"^```(?:json)?", "", clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r"```$", "", clean).strip()
        parsed = json.loads(clean)
        cards = parsed.get("flashcards", [])
        if cards and isinstance(cards, list):
            # Sanitise — ensure all three fields exist
            sanitised = []
            for c in cards:
                if isinstance(c, dict) and c.get("front") and c.get("back"):
                    sanitised.append({
                        "front": str(c.get("front", "")).strip(),
                        "back":  str(c.get("back",  "")).strip(),
                        "hint":  str(c.get("hint",  "")).strip()
                    })
            if sanitised:
                return {"type": "flashcard", "cards": sanitised}
    except Exception as e:
        print(f"[FLASHCARD] JSON parse failed: {e}\nRaw: {raw[:400]}")

    return {"type": "error", "content": "Flashcard generation failed. Please try again."}
