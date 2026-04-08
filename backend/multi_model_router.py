# multi_model_router.py — Dynamo AI Research Pipeline
# Flow: Tavily (search) → Claude (extract) → Gemini (analyze) → GPT (write paper)

import requests
import config
import search as search_module

APIMART_BASE_URL = "https://api.apimart.dev/v1"

# --------------------------------------------------
# APIMART CALL HELPER
# --------------------------------------------------

def _call_apimart(model: str, system: str, user_content: str, max_tokens: int = 2000) -> str:
    """
    Calls APIMart's OpenAI-compatible endpoint.
    Raises on failure so callers can handle gracefully.
    """
    api_key = config.APIMART_API_KEY
    if not api_key:
        raise ValueError("APIMart API key is not configured. Check APIMart_API_key in your secrets.")

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
        "temperature": 0.7
    }

    response = requests.post(
        f"{APIMART_BASE_URL}/chat/completions",
        headers=headers,
        json=payload,
        timeout=60
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"APIMart [{model}] returned {response.status_code}: {response.text[:300]}"
        )

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


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

    # ── STEP 2: Claude — extract key facts ───────────────────────────────────
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
            model="claude-sonnet-4.5",
            system=claude_system,
            user_content=claude_user,
            max_tokens=1200
        )
        print("[Research Pipeline] Claude extraction complete")
    except Exception as e:
        print(f"[Research Pipeline] Claude error: {e}")
        extracted_facts = f"Claude extraction unavailable: {e}\n\nFalling back to raw context:\n{context_block[:1000]}"

    # ── STEP 3: Gemini — deep analysis ───────────────────────────────────────
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
            model="gemini-3.1",
            system=gemini_system,
            user_content=gemini_user,
            max_tokens=1200
        )
        print("[Research Pipeline] Gemini analysis complete")
    except Exception as e:
        print(f"[Research Pipeline] Gemini error: {e}")
        analysis_insights = f"Gemini analysis unavailable: {e}"

    # ── STEP 4: GPT — write the final paper ──────────────────────────────────
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
            model="gpt-5.4",
            system=gpt_system,
            user_content=gpt_user,
            max_tokens=2000
        )
        print("[Research Pipeline] GPT paper complete")
    except Exception as e:
        print(f"[Research Pipeline] GPT error: {e}")
        # Graceful fallback: assemble from what we have
        final_report = (
            f"## Research: {query}\n\n"
            f"## Key Facts\n{extracted_facts}\n\n"
            f"## Analysis\n{analysis_insights}\n\n"
            f"## Sources\n{source_list}\n\n"
            f"_(Note: Final paper generation unavailable — {e})_"
        )

    print("[Research Pipeline] Pipeline complete")

    return {
        "type": "research",
        "content": final_report,
        "sources": sources
    }
