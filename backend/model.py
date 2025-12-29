# model.py — Dynamo AI (FINAL)
# Gemini default for Fast + Research (DeepThink v3)

import google.generativeai as genai
import config

# --------------------------------------------------
# CLIENT INIT
# --------------------------------------------------

try:
    if config.GEMINI_KEY:
        genai.configure(api_key=config.GEMINI_KEY)
except Exception as e:
    print("Gemini Init Error:", e)

# --------------------------------------------------
# HISTORY NORMALIZER
# --------------------------------------------------

def normalize_history(history):
    clean = []
    if not isinstance(history, list):
        return clean

    for m in history[-8:]:
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

    history = normalize_history(history)

    # -------------------------
    # SYSTEM PROMPT (BASE)
    # -------------------------
    sys_prompt = (
        "You are Dynamo AI, an advanced research and reasoning system. "
        + config.DYNAMO_IDENTITY +
        " Respond in clear Markdown. Be precise, factual, and structured."
    )

    # -------------------------
    # DEEPTHINK v3 (ADAPTIVE)
    # -------------------------
    if deep_dive:
        sys_prompt += (
            "\n\nDeepThink v3 is enabled.\n"
            "Adapt your depth based on complexity.\n"
            "Always respond in this structure:\n"
            "## Executive Summary\n"
            "## Core Concepts\n"
            "## Deep Technical Analysis\n"
            "## Real-world Applications\n"
            "## Key Takeaways\n"
            "\nWhen useful, think in terms of slide sections."
        )

    # -------------------------
    # FULL PROMPT
    # -------------------------
    full_prompt = sys_prompt

    if context:
        full_prompt += "\n\nResearch Context:\n" + context

    for m in history:
        full_prompt += f"\n\n{m['role'].upper()}: {m['content']}"

    full_prompt += "\n\nUSER: " + prompt + "\nASSISTANT:"

    # -------------------------
    # GEMINI EXECUTION
    # -------------------------
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return "Gemini Engine Error: " + str(e)
