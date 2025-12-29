# model.py — Dynamo AI (FINAL, DEEPDIVE-AWARE, RENDER-SAFE)

import google.generativeai as genai
from groq import Groq
import config

# --------------------------------------------------
# CLIENT INIT
# --------------------------------------------------

groq_client = None

try:
    if config.GEMINI_KEY:
        genai.configure(api_key=config.GEMINI_KEY)

    if config.GROQ_KEY:
        groq_client = Groq(api_key=config.GROQ_KEY)

except Exception as e:
    print("AI Client Initialization Error:", e)

# --------------------------------------------------
# GROQ MODEL MAP
# --------------------------------------------------

GROQ_MODEL_MAP = {
    "llama3": "llama3-8b-8192",
    "llama3-8b": "llama3-8b-8192",
    "llama3-70b": "llama3-70b-8192"
}

# --------------------------------------------------
# HISTORY NORMALIZER
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

    # Identity guard
    if any(q in msg_lower for q in [
        "who are you",
        "your name",
        "what is your name",
        "who made you"
    ]):
        return config.DYNAMO_IDENTITY

    # Base system instruction
    sys_instr = (
        "You are Dynamo AI. " +
        config.DYNAMO_IDENTITY + " " +
        "Provide professional, research-grade answers in Markdown. "
        "Avoid diagrams unless explicitly requested."
    )

    # 🔥 DeepDive behavior
    if deep_dive:
        sys_instr += (
            " When DeepDive mode is enabled, structure your response as:\n"
            "1. Conceptual overview\n"
            "2. Technical / advanced explanation\n"
            "3. Practical examples or applications\n"
            "Use clear Markdown headings."
        )

    history = normalize_history(history)

    # -------------------------
    # GROQ (LLAMA3)
    # -------------------------
    if groq_client and "llama3" in model_name.lower():
        groq_model = GROQ_MODEL_MAP.get(
            model_name.lower(),
            "llama3-8b-8192"
        )

        messages = [{"role": "system", "content": sys_instr}]

        if context:
            messages.append({
                "role": "system",
                "content": "Research Context:\n" + context
            })

        for m in history:
            messages.append(m)

        messages.append({
            "role": "user",
            "content": prompt
        })

        try:
            completion = groq_client.chat.completions.create(
                model=groq_model,
                messages=messages
            )
            return completion.choices[0].message.content
        except Exception as e:
            return "Groq Engine Error: " + str(e)

    # -------------------------
    # GEMINI (DEFAULT)
    # -------------------------
    try:
        full_prompt = (
            sys_instr + "\n\n"
            "CONTEXT:\n" + context + "\n\n"
            "USER QUERY:\n" + prompt
        )

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(full_prompt)
        return response.text

    except Exception as e:
        return "Gemini Engine Error: " + str(e)
