# multi_model_router.py — Dynamo AI Research Pipeline
# Flow: Tavily (search) → Claude (extract) → Gemini (analyze) → GPT (write paper)
# APIMart is tried first; Gemini is used as reliable fallback for each stage.

import requests
import config
import search as search_module

APIMART_BASE_URL = "https://api.apimart.ai/v1"

# Print key status at import time so it shows in startup logs
def _startup_check():
    key = config.APIMART_API_KEY
    if key:
        print(f"[APIMart] Key loaded ✅ — starts with: {key[:8]}...")
    else:
        print("[APIMart] ❌ Key NOT loaded — check APIMART_API_KEY secret")

_startup_check()


# --------------------------------------------------
# GEMINI FALLBACK (always available)
# --------------------------------------------------

def _call_gemini(system: str, user_content: str, max_tokens: int = 2000) -> str:
    """Direct Gemini call using the existing GEMINI_KEY. Always available."""
    import google.generativeai as genai
    genai.configure(api_key=config.GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash-lite")
    full_prompt = f"{system}\n\n{user_content}"
    response = model.generate_content(full_prompt)
    return response.text.strip()


# --------------------------------------------------
# APIMART CALL HELPER (with Gemini fallback)
# --------------------------------------------------

def _call_apimart(model: str, system: str, user_content: str, max_tokens: int = 2000) -> str:
    """
    Tries APIMart first. Falls back to Gemini if APIMart fails.
    Raises only if BOTH fail.
    """
    api_key = config.APIMART_API_KEY

    # ── Attempt APIMart ───────────────────────────────────────────────────────
    if api_key:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_content}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "stream": False
        }
        try:
            response = requests.post(
                f"{APIMART_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code == 200:
                data = response.json()
                print(f"[APIMart] ✅ {model} responded OK")
                return data["choices"][0]["message"]["content"].strip()
            else:
                print(f"[APIMart] ⚠️ {model} returned {response.status_code} — falling back to Gemini")
        except Exception as e:
            print(f"[APIMart] ⚠️ {model} connection error: {e} — falling back to Gemini")
    else:
        print(f"[APIMart] ⚠️ No API key — using Gemini for {model} stage")

    # ── Gemini fallback ───────────────────────────────────────────────────────
    print(f"[Research Pipeline] Using Gemini fallback for {model} stage")
    return _call_gemini(system, user_content, max_tokens)


# --------------------------------------------------
# RESEARCH PIPELINE
# --------------------------------------------------

def research_pipeline(query: str) -> dict:
    """
    Multi-model research pipeline:
    1. Tavily   → fetch live web sources
    2. Claude   → extract and synthesise key facts from sources
    3. Gemini   → deep analysis and critical insights
    4. GPT      → write the final structured research paper

    Falls back to Gemini for any stage where APIMart fails.

    Returns:
        {
            "type": "research",
            "content": <structured report string>,
            "sources": [{"title": ..., "url": ..., "snippet": ...}, ...]
        }
    """
    print("RESEARCH MODE TRIGGERED")
    print(f"[Research Pipeline] Query: {query}")

    # ── STEP 1: Tavily search ─────────────────────────────────────────────────
    sources = []
    raw_context = ""
    try:
        sources = search_module.get_sources(query, deep_dive=True)
        raw_context = search_module.get_web_context(query, deep_dive=True)
        print(f"[Research Pipeline] Tavily returned {len(sources)} sources")
    except Exception as e:
        print(f"[Research Pipeline] Tavily error: {e}")
        raw_context = ""
        sources = []

    context_block = raw_context if raw_context else "No live web context available."

    # ── STEP 2: Claude stage — extract key facts ──────────────────────────────
    claude_system = (
        "You are a meticulous research analyst. "
        "Given web search results, extract the most important facts, data points, "
        "quotes, and findings relevant to the query. "
        "Be concise and factual. Use bullet points."
    )
    claude_user = (
        f"Research query: {query}\n\n"
        f"Web search context:\n{context_block}\n\n"
        "Extract the key facts and findings."
    )

    extracted_facts = ""
    try:
        extracted_facts = _call_apimart(
            model="claude-opus-4-6",
            system=claude_system,
            user_content=claude_user,
            max_tokens=1200
        )
        print("[Research Pipeline] Extraction stage complete")
    except Exception as e:
        print(f"[Research Pipeline] Extraction stage failed entirely: {e}")
        extracted_facts = context_block[:2000]

    # ── STEP 3: Gemini stage — deep analysis ─────────────────────────────────
    gemini_system = (
        "You are a strategic analyst and domain expert. "
        "Given extracted research facts, provide deep analytical insights, "
        "identify patterns, implications, and gaps. "
        "Think critically and add expert perspective."
    )
    gemini_user = (
        f"Research query: {query}\n\n"
        f"Extracted facts:\n{extracted_facts}\n\n"
        "Provide deep analysis, insights, and expert commentary."
    )

    analysis_insights = ""
    try:
        analysis_insights = _call_apimart(
            model="gemini-2.0-flash",
            system=gemini_system,
            user_content=gemini_user,
            max_tokens=1200
        )
        print("[Research Pipeline] Analysis stage complete")
    except Exception as e:
        print(f"[Research Pipeline] Analysis stage failed entirely: {e}")
        analysis_insights = "Analysis unavailable."

    # ── STEP 4: GPT stage — write the final paper ─────────────────────────────
    source_list = "\n".join(
        [f"- {s.get('title', 'Untitled')} ({s.get('url', '')})" for s in sources[:8]]
    ) if sources else "No sources available."

    gpt_system = (
        "You are an expert academic research writer. "
        "Write a clear, well-structured research report using the provided facts and analysis. "
        "Use this exact structure:\n"
        "## Title\n"
        "## Abstract\n"
        "## Key Findings\n"
        "## Analysis & Insights\n"
        "## Conclusion\n"
        "## Sources\n\n"
        "Be professional, insightful, and thorough. Avoid filler content."
    )
    gpt_user = (
        f"Research query: {query}\n\n"
        f"Extracted facts:\n{extracted_facts}\n\n"
        f"Expert analysis:\n{analysis_insights}\n\n"
        f"Sources:\n{source_list}\n\n"
        "Write the full structured research paper now."
    )

    final_report = ""
    try:
        final_report = _call_apimart(
            model="gpt-4o",
            system=gpt_system,
            user_content=gpt_user,
            max_tokens=2000
        )
        print("[Research Pipeline] Writing stage complete")
    except Exception as e:
        print(f"[Research Pipeline] Writing stage failed entirely: {e}")
        final_report = (
            f"## Research: {query}\n\n"
            f"## Key Facts\n{extracted_facts}\n\n"
            f"## Analysis\n{analysis_insights}\n\n"
            f"## Sources\n{source_list}"
        )

    print("[Research Pipeline] Pipeline complete ✅")

    return {
        "type": "research",
        "content": final_report,
        "sources": sources
    }
