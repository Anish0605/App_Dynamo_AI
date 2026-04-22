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

    for m in history[-20:]:
        if (
            isinstance(m, dict)
            and m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)
        ):
            clean.append({"role": m["role"], "content": m["content"]})
    return clean


# --------------------------------------------------
# CORE AI ROUTER
# --------------------------------------------------


def get_ai_response(
    prompt, history, model_name, context="", deep_dive=False, memories=None
):
    msg_lower = prompt.lower()

    # -------------------------
    # IDENTITY GUARD
    # -------------------------
    if any(
        q in msg_lower
        for q in ("who are you", "your name", "what is your name", "who made you")
    ):
        return config.DYNAMO_IDENTITY

    history = normalize_history(history)

    # -------------------------
    # SYSTEM PROMPT (BASE)
    # -------------------------
    sys_prompt = (
        "You are Dynamo AI, an advanced research and reasoning system. "
        + config.DYNAMO_IDENTITY
        + " Respond in a clear, natural, and helpful way. "
        "Use structure only when it improves clarity. Avoid rigid formats."
    )

    # -------------------------
    # DEEPTHINK v3 (ADAPTIVE - CLEAN)
    # -------------------------
    if deep_dive:
        sys_prompt += (
            "\n\nDeepThink v3 is enabled.\n"
            "Provide deeper reasoning, structured insights, and clear explanations.\n"
            "Adapt the response style naturally based on the question.\n"
            "Use headings, bullet points, or sections ONLY when helpful.\n"
            "DO NOT force any fixed format like executive summaries.\n"
        )

    # -------------------------
    # MEMORY INJECTION
    # -------------------------
    if memories:
        from memory import format_for_prompt

        mem_block = format_for_prompt(memories)
        if mem_block:
            sys_prompt += (
                "\n\nWhat you remember about this user:\n"
                + mem_block
                + "\nUse this context naturally — don't announce it unless directly relevant."
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
        resolved_model = model_name if model_name else "gemini-2.0-flash"
        gemini_model = genai.GenerativeModel(resolved_model)
        response = gemini_model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return "Gemini Engine Error: " + str(e)
