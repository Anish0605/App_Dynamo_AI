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
    """

    if not tavily_client or not isinstance(query, str):
        return ""

    # 🔒 HARD LIMIT to avoid Tavily 400-char error
    safe_query = query.strip()[:350]

    try:
        search_depth = "advanced" if deep_dive else "basic"

        results = tavily_client.search(
            query=safe_query,
            search_depth=search_depth,
            max_results=5
        )

        context_lines = ["[DYNAMO WEB CONTEXT]"]

        for r in results.get("results", []):
            title = str(r.get("title", ""))[:120]
            content = str(r.get("content", ""))[:300]
            url = str(r.get("url", ""))

            if content:
                context_lines.append(
                    f"- {title}: {content} (Source: {url})"
                )

        return "\n".join(context_lines)

    except Exception as e:
        print("Search Error:", e)
        return ""
