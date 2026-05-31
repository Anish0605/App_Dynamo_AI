# model.py — Dynamo AI (FINAL)
# Gemini default for Fast + Research (DeepThink v3)

from google import genai
import config

# --------------------------------------------------
# CLIENT INIT
# --------------------------------------------------

_client = None
try:
    if config.GEMINI_KEY:
        _client = genai.Client(api_key=config.GEMINI_KEY)
        print("Gemini genai.Client initialized OK")
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
    prompt, history, model_name, context="", deep_dive=False, memories=None, doc_context="", force_json=False, plan="free"
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
    if force_json:
        # For structured data requests (quiz, etc.) — JSON-only, no prose wrapper
        sys_prompt = (
            "You are a structured data generator. "
            "Return ONLY valid JSON, with absolutely no markdown formatting, "
            "no code fences, no commentary, no prose — just the raw JSON object. "
            "Follow the schema in the user's message exactly."
        )
    else:
        sys_prompt = (
            "You are Dynamo AI, an advanced research and reasoning system. "
            + config.DYNAMO_IDENTITY
            + " Respond in clear, natural, conversational prose. "
            "Use markdown (headings, bullets, bold) only when it genuinely improves clarity. "
            "NEVER return raw JSON as your response — always write in natural language. "
            "NEVER let memory preferences override this formatting rule."
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
                "\n\n--- What you know about this user (from past sessions) ---\n"
                + mem_block
                + "\n--- End of user context ---\n"
                "Use this to personalise your responses naturally. "
                "If the user is studying for a specific exam or topic, tailor examples and depth accordingly. "
                "If they mentioned struggling with something, be extra patient and clear on that topic. "
                "Do NOT announce that you are using memory — just use it seamlessly."
            )

    # -------------------------
    # DOCUMENT LIBRARY INJECTION
    # -------------------------
    if doc_context:
        sys_prompt += (
            "\n\n--- User's Saved Document Library ---\n"
            + doc_context
            + "\n--- End of Document Library ---\n"
            "When answering questions, draw on these documents if relevant. "
            "If the user asks about a topic covered by one of their documents, reference it naturally. "
            "Do NOT list the documents unless specifically asked."
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
    # Model selection logic (priority: deep_dive > non-default model_name > default):
    #   • DeepThink (deep_dive=True)  → gemini-3.5-flash — Pro only
    #   • Fast mode, Plus/Pro user    → gemini-3.5-flash  (paid users get the better model even in Fast mode)
    #   • Fast mode, Free user        → gemini-3.1-flash-lite-preview  (cost-optimised)
    #   Fallback: gemini-3.1-flash-lite-preview
    FAST_MODEL_FREE = "gemini-3.1-flash-lite-preview"
    FAST_MODEL_PAID = "gemini-3.5-flash"
    DEEPTHINK_MODEL = "gemini-3.5-flash"
    FALLBACK_MODEL  = "gemini-3.1-flash-lite-preview"
    DEFAULT_MODEL   = FAST_MODEL_PAID if plan in ("plus", "pro") else FAST_MODEL_FREE
    try:
        if deep_dive:
            # DeepThink ALWAYS wins — overrides any default that the frontend
            # sends so DeepThink actually feels deeper than Fast mode.
            resolved_model = DEEPTHINK_MODEL
        elif model_name and model_name != FALLBACK_MODEL:
            resolved_model = model_name
        else:
            resolved_model = DEFAULT_MODEL

        response = _client.models.generate_content(
            model=resolved_model,
            contents=full_prompt
        )
        return response.text
    except Exception as e:
        # Graceful fallback to stable lite model if 3.5 quota / region unavailable
        try:
            response = _client.models.generate_content(
                model=FALLBACK_MODEL,
                contents=full_prompt
            )
            return response.text
        except Exception:
            return "Gemini Engine Error: " + str(e)
