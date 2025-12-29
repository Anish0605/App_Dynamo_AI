# model.py — Dynamo AI (FINAL, GEMINI ONLY, FAST + DEEPTHINK)

import google.generativeai as genai
import config

# --------------------------------------------------
# CLIENT INITIALIZATION (SAFE)
# --------------------------------------------------

try:
    if config.GEMINI_KEY:
        genai.configure(api_key=config.GEMINI_KEY)
except Exception as e:
    print("Gemini Init Error:", e)

# --------------------------------------------------
# HISTORY NORMALIZER (JSON SAFE)
# --------------------------------------------------

def normalize_history(history):
    clean = []

    if not isinstance(history, list):
        return clean

    for m in history[-10:]:
        if (
            isinstance(m, dict)
            and m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)
        ):
            clean.append({
                "role": m["role"],
                "content": m["content"]
            })

    return clean

# --------------------------------------------------
# CORE AI ROUTER
# --------------------------------------------------

def get_ai_response(prompt, history, model_name, context="", deep_dive=False):
    msg_lower = prompt.lower()

    # -------------------------
    # IDENTITY GUARD
    # -------------------------
    if any(q in msg_lower for q in (
        "who are you",
        "your name",
        "what is your name",
        "who made you"
    )):
        return config.DYNAMO_IDENTITY

    # -------------------------
    # BASE SYSTEM PROMPT
    # -------------------------
    sys_instr = (
        "You are Dynamo AI. "
        + config.DYNAMO_IDENTITY
        + " Provide professional, research-grade answers in Markdown. "
        + "Avoid diagrams unless explicitly requested."
    )

    # -------------------------
    # DEEPTHINK MODE (Research Mode)
    # -------------------------
    if deep_dive:
        sys_instr += (
            " DeepThink mode is enabled. "
            "Structure your response strictly as:\n"
            "## 1. Conceptual Overview\n"
            "## 2. Technical / Advanced Explanation\n"
            "## 3. Practical Examples or Applications\n"
            "Use clear headings, concise bullets, and deep reasoning."
        )

    # -------------------------
    # NORMALIZE HISTORY
    # -------------------------
    history = normalize_history(history)

    # -------------------------
    # BUILD FINAL PROMPT
    # -------------------------
    final_prompt = (
        sys_instr + "\n\n"
        + ("RESEARCH CONTEXT:\n" + context + "\n\n" if context else "")
        + "CONVERSATION HISTORY:\n"
    )

    for m in history:
        final_prompt += f"{m['role'].upper()}: {m['content']}\n"

    final_prompt += "\nUSER QUERY:\n" + prompt

    # -------------------------
    # GEMINI EXECUTION (FAST + RESEARCH)
    # -------------------------
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(final_prompt)
        return response.text

    except Exception as e:
        return "Gemini Engine Error: " + str(e)
