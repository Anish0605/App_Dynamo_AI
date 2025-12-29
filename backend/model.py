# model.py — Dynamo AI (FINAL, GEMINI DEFAULT + DEEPSEEK FOR DEEPDIVE)

import google.generativeai as genai
from openai import OpenAI
import config

# --------------------------------------------------
# CLIENT INITIALIZATION (SAFE)
# --------------------------------------------------

deepseek_client = None

try:
    # Gemini (default fast model)
    if config.GEMINI_KEY:
        genai.configure(api_key=config.GEMINI_KEY)

    # DeepSeek (used only for DeepDive)
    if config.DEEPSEEK_API_KEY:
        deepseek_client = OpenAI(
            api_key=config.DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )

except Exception as e:
    print("AI Client Initialization Error:", e)

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
    if any(q in msg_lower for q in [
        "who are you",
        "your name",
        "what is your name",
        "who made you"
    ]):
        return config.DYNAMO_IDENTITY

    # -------------------------
    # BASE SYSTEM INSTRUCTION
    # -------------------------
    sys_instr = (
        "You are Dynamo AI. "
        + config.DYNAMO_IDENTITY
        + " Provide professional, research-grade answers in Markdown. "
        + "Avoid diagrams unless explicitly requested."
    )

    # -------------------------
    # DEEPDIVE INSTRUCTIONS
    # -------------------------
    if deep_dive:
        sys_instr += (
            " DeepDive mode is enabled. "
            "Structure your response as:\n"
            "## 1. Conceptual Overview\n"
            "## 2. Technical / Advanced Explanation\n"
            "## 3. Practical Examples or Applications\n"
            "Be detailed, precise, and analytical."
        )

    history = normalize_history(history)

    # ==================================================
    # 🔥 DEEPSEEK ROUTE (ONLY WHEN DEEPDIVE = TRUE)
    # ==================================================
    if deep_dive and deepseek_client:
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
            response = deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                temperature=0.3
            )
            return response.choices[0].message.content

        except Exception as e:
            return "DeepSeek Engine Error: " + str(e)

    # ==================================================
    # ⚡ GEMINI DEFAULT ROUTE (FAST)
    # ==================================================
    try:
        full_prompt = (
            sys_instr + "\n\n"
            + "CONTEXT:\n" + context + "\n\n"
            + "USER QUERY:\n" + prompt
        )

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(full_prompt)
        return response.text

    except Exception as e:
        return "Gemini Engine Error: " + str(e)
