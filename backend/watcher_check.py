"""
watcher_check.py — Check a research topic for new developments and email the user.
Uses Tavily for recent news + Gemini to judge noteworthiness, then sends via Brevo.
"""

import config
import brevo


def check_topic(topic: str, user_email: str, user_name: str) -> dict:
    """
    Search for recent news on `topic`, evaluate with Gemini, and send an email if noteworthy.
    Returns {"notified": bool, "summary": str, "sources": list, "noteworthy": bool}
    """
    sources = _search_recent(topic)
    if not sources:
        return {"notified": False, "noteworthy": False, "summary": "No recent results found.", "sources": []}

    evaluation = _evaluate(topic, sources)
    noteworthy = evaluation.get("noteworthy", False)
    summary = evaluation.get("summary", "")

    notified = False
    if noteworthy and user_email:
        notified = brevo.send_watch_alert(
            to_email=user_email,
            to_name=user_name or "",
            topic=topic,
            summary=summary,
            sources=sources,
        )

    return {
        "notified": notified,
        "noteworthy": noteworthy,
        "summary": summary,
        "sources": sources[:5],
    }


def _search_recent(topic: str) -> list:
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=config.TAVILY_KEY)
        resp = client.search(
            query=f"latest research news {topic} 2025 2026",
            search_depth="advanced",
            max_results=6,
            include_answer=False,
        )
        results = resp.get("results", [])
        return [{"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")[:400]} for r in results]
    except Exception as e:
        print(f"Tavily search failed: {e}")
        return []


def _evaluate(topic: str, sources: list) -> dict:
    try:
        import google.genai as genai
        client = genai.Client(api_key=config.GEMINI_KEY)

        snippets = "\n\n".join(
            f"[{i+1}] {s['title']}\n{s['content']}" for i, s in enumerate(sources)
        )

        prompt = f"""You are a research analyst for Dynamo AI. A user is watching the topic: "{topic}".

Below are recent web search results about this topic. Evaluate whether there are any significant new developments worth alerting the user about.

Search results:
{snippets}

Respond in this exact JSON format (no markdown fences):
{{
  "noteworthy": true or false,
  "summary": "2-4 sentence summary of the most important new development. Be specific and cite what's new. If not noteworthy, explain briefly why."
}}

Be selective — only mark as noteworthy if there is a genuinely new paper, breakthrough, policy change, or major event in the last few weeks. Routine news or rephrasing of old content = not noteworthy."""

        model = "gemini-2.5-flash-preview-04-17"
        resp = client.models.generate_content(model=model, contents=prompt)
        text = resp.text.strip()

        import json, re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"noteworthy": False, "summary": "Could not evaluate results."}
    except Exception as e:
        print(f"Gemini evaluation failed: {e}")
        return {"noteworthy": False, "summary": "Evaluation failed."}
