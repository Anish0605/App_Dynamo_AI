# search.py — Dynamo AI (FINAL, SAFE, RENDER-STABLE)

from tavily import TavilyClient
import config

# --------------------------------------------------
# INITIALIZE CLIENT SAFELY
# --------------------------------------------------

tavily_client = None

if config.TAVILY_KEY:
    try:
        tavily_client = TavilyClient(api_key=config.TAVILY_KEY)
    except Exception as e:
        print("Tavily Init Error:", e)

# --------------------------------------------------
# WEB CONTEXT FETCHER (SAFE)
# --------------------------------------------------

def get_web_context(query, deep_dive=False):
    """
    Fetches live web context for the AI.
    Always fails silently.

    Research Mode (deep_dive=True) pulls a much wider net of results — and a longer
    excerpt from each — than a normal chat lookup, so Gemini has enough raw material
    to write answers with the depth/breadth of a dedicated research tool rather than
    a quick 5-source summary.
    """

    if not tavily_client or not isinstance(query, str):
        return ""

    # 🔒 HARD LIMIT to avoid Tavily 400-char error
    safe_query = query.strip()[:350]

    try:
        search_depth = "advanced" if deep_dive else "basic"
        max_results = 25 if deep_dive else 5
        snippet_len = 600 if deep_dive else 300

        results = tavily_client.search(
            query=safe_query,
            search_depth=search_depth,
            max_results=max_results
        )

        context_lines = ["[DYNAMO WEB CONTEXT]"]

        for r in results.get("results", []):
            title = str(r.get("title", ""))[:120]
            content = str(r.get("content", ""))[:snippet_len]
            url = str(r.get("url", ""))

            if content:
                context_lines.append(
                    f"- {title}: {content} (Source: {url})"
                )

        return "\n".join(context_lines)

    except Exception as e:
        print("Search Error:", e)
        return ""


def get_sources(query, deep_dive=False):
    """
    Fetches sources for research mode (returns structured JSON)
    Returns list of {title, url, snippet}

    deep_dive (Research Mode / Deep Research) surfaces up to 25 sources instead of
    10, so the sources panel — and the material behind the written answer — is on
    par with what a dedicated research tool like Perplexity shows.
    """
    if not tavily_client or not isinstance(query, str):
        return []

    safe_query = query.strip()[:350]

    try:
        search_depth = "advanced" if deep_dive else "basic"
        max_results = 25 if deep_dive else 10
        results = tavily_client.search(
            query=safe_query,
            search_depth=search_depth,
            max_results=max_results
        )

        sources = []
        for r in results.get("results", []):
            sources.append({
                "title": str(r.get("title", ""))[:150],
                "url": str(r.get("url", "")),
                "snippet": str(r.get("content", ""))[:300]
            })

        return sources

    except Exception as e:
        print("Sources fetch error:", e)
        return []
