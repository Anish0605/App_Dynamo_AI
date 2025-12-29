# model.py — Dynamo AI
# FINAL: Gemini Default + DeepThink v3 (Adaptive Intelligence)
# Stable • Render-safe • No external paid dependency

import google.generativeai as genai
import config

# --------------------------------------------------
# CLIENT INITIALIZATION
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
# DEEPTHINK v3 — ADAPTIVE INTELLIGENCE PROMPT
# --------------------------------------------------

def build_deepthink_prompt(base_instruction):
    return (
        base_instruction
        + "\n\nDeepThink v3 (Adaptive Intelligence) is enabled.\n\n"

        "You must dynamically adapt your response based on the topic complexity.\n\n"

        "Always follow this structure:\n\n"

        "## 1. Clear Concept Overview\n"
        "- Explain the core idea in simple, precise terms.\n"
        "- Assume the reader is intelligent but not a domain expert.\n\n"

        "## 2. How It Works (Depth Depends on Topic)\n"
        "- If the topic is technical: explain mechanisms, flow, or logic.\n"
        "- If the topic is conceptual: explain reasoning and relationships.\n"
        "- Use bullets or numbered steps where possible.\n\n"

        "## 3. Real-World Applications or Examples\n"
        "- Provide 2–4 realistic examples.\n"
        "- Prefer industry, business, education, or technology use cases.\n\n"

        "## 4. Advantages, Limitations, or Trade-offs\n"
        "- Clearly list strengths and weaknesses.\n"
        "- Avoid hype or marketing language.\n\n"

        "## 5. When This Matters (Optional but Preferred)\n"
        "- Explain why this topic is important today.\n"
        "- Connect to jobs, industry trends, or real impact.\n\n"

        "Formatting Rules:\n"
        "- Use Markdown headings (##).\n"
        "- Prefer bullet points over long paragraphs.\n"
        "- Be structured, not verbose.\n"
        "- Do NOT include diagrams unless explicitly requested.\n"
    )

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
    # BASE SYSTEM INSTRUCTION
    # -------------------------
    base_sys_instr = (
        "You are Dynamo AI. "
        + config.DYNAMO_IDENTITY
        + " Respond with professional, accurate, Markdown-formatted answers. "
        + "Avoid unnecessary fluff."
    )

    # -------------------------
    # APPLY DEEPTHINK v3 IF ENABLED
    # -------------------------
    if deep_dive:
        sys_instr = build_deepthink_prompt(base_sys_instr)
    else:
        sys_instr = base_sys_instr

    history = normalize_history(history)

    # -------------------------
    # BUILD FINAL PROMPT
    # -------------------------
    final_prompt = (
        sys_instr
        + "\n\n"
        + ("CONTEXT:\n" + context + "\n\n" if context else "")
        + "USER QUESTION:\n"
        + prompt
    )

    # -------------------------
    # GEMINI EXECUTION (SINGLE SOURCE OF TRUTH)
    # -------------------------
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(final_prompt)
        return response.text

    except Exception as e:
        return "Gemini Engine Error: " + str(e)
