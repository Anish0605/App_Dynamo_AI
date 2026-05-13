# detector.py — Dynamo AI
# In-house AI Text Detector + Plagiarism Checker
# Uses: Gemini (analysis & scoring), Tavily (web search), Semantic Scholar (academic)

import asyncio
import aiohttp
import json
import re
from google import genai
import config

_client = genai.Client(api_key=config.GEMINI_KEY) if config.GEMINI_KEY else None

# ─────────────────────────────────────────────────────────────────────────────
# AI DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

_AI_PROMPT = """\
You are a forensic linguist and expert AI text detector specialising in academic and research writing.

IMPORTANT CALIBRATION FOR ACADEMIC TEXT:
PhD theses, research papers, and academic writing naturally use structured language, formal transitions,
and hedged claims — this is normal academic convention and does NOT indicate AI generation on its own.
Do not penalise text for being well-structured, formal, or using discipline-standard phrases like
"This study demonstrates", "The results indicate", or "As noted by [Author]".

True AI-generation signals in academic writing:
- Perfectly uniform paragraph lengths with no variation
- Generic, topic-agnostic observations that could apply to ANY paper in any field
- Lists of clichéd transitions used back-to-back with no logical connection
- Complete absence of any personal research voice, hesitation, or domain-specific nuance
- Overly comprehensive coverage with no emphasis — treats all points as equally important
- No references to specific data, numbers, observations, or experimental quirks
- Suspiciously balanced "on one hand / on the other hand" framing throughout
- Absence of citations where a human academic would naturally cite

Human academic writing signals:
- Specific data, measurements, experimental observations, or domain jargon used naturally
- Personal hedging ("we believe", "our data suggest", "it is possible that")
- Uneven emphasis — humans stress what they care about
- Citations, footnotes, or references to named prior work
- Occasional sentence that is longer or more convoluted than ideal
- Disciplinary voice consistent with the field (e.g. passive voice in chemistry is normal)

Return ONLY a valid JSON object with this exact structure:
{
  "score": <integer 0-100; 0=definitely human, 100=definitely AI>,
  "label": "<exactly one of: Human Written | Likely Human | Mixed | Likely AI | AI Generated>",
  "confidence": "<Low|Medium|High>",
  "signals": [<list of 3-5 SHORT specific evidence strings quoting or closely paraphrasing actual phrases FROM the text>],
  "summary": "<2-3 sentences plain English verdict — explain what specific patterns led to this conclusion>"
}

TEXT TO ANALYZE:
"""


async def detect_ai(text: str) -> dict:
    if not _client:
        return _err("AI detector not available — Gemini not configured.")
    loop = asyncio.get_event_loop()
    try:
        resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=_AI_PROMPT + text[:4000],
            )
        )
        match = re.search(r'\{.*\}', resp.text.strip(), re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"[Detector] AI detection error: {e}")
    return _err("Analysis failed. Please try again.")


def _err(msg: str) -> dict:
    return {
        "score": 50, "label": "Mixed", "confidence": "Low",
        "signals": [msg], "summary": msg,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PLAGIARISM CHECKER
# ─────────────────────────────────────────────────────────────────────────────

async def check_plagiarism(text: str) -> dict:
    """Check originality using Tavily web search + Semantic Scholar + Gemini scoring."""
    query   = text[:250].strip()
    sources = []

    # 1. Tavily web search for matching online content
    try:
        from tavily import TavilyClient
        if config.TAVILY_KEY:
            tc = TavilyClient(api_key=config.TAVILY_KEY)
            r  = tc.search(query=query[:350], search_depth="advanced", max_results=6)
            for item in r.get("results", []):
                if item.get("url"):
                    sources.append({
                        "source":  (item.get("title") or "Unknown")[:80],
                        "url":     item.get("url", ""),
                        "type":    "web",
                        "snippet": (item.get("content") or "")[:200],
                    })
    except Exception as e:
        print(f"[Plagiarism] Tavily error: {e}")

    # 2. Semantic Scholar for academic paper matches
    try:
        async with aiohttp.ClientSession() as session:
            params = {
                "query":  query[:200],
                "fields": "title,year,authors,externalIds,abstract",
                "limit":  5,
            }
            async with session.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params=params,
                headers={"User-Agent": "DynamoAI/1.0"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for p in data.get("data", []):
                        if p.get("title"):
                            doi = (p.get("externalIds") or {}).get("DOI", "")
                            sources.append({
                                "source":  p["title"][:80],
                                "url":     f"https://doi.org/{doi}" if doi else "",
                                "type":    "academic",
                                "snippet": (p.get("abstract") or f"Published {p.get('year', 'N/A')}")[:200],
                            })
    except Exception as e:
        print(f"[Plagiarism] Semantic Scholar error: {e}")

    # 3. Gemini scores similarity against found sources
    score   = 0
    summary = "No closely matching sources found online. The text appears to be original."

    if sources and _client:
        src_block = "\n".join(
            f"- [{s['type'].upper()}] {s['source']}: {s['snippet']}"
            for s in sources[:6]
        )
        prompt = (
            "You are a plagiarism detection expert.\n\n"
            f"Submitted text (first 600 chars):\n\"{text[:600]}\"\n\n"
            f"Potential matching sources found online:\n{src_block}\n\n"
            "Based on the content overlap between the submitted text and these sources, "
            "provide an originality assessment.\n"
            "Return ONLY valid JSON: "
            "{\"score\": <int 0-100; 0=fully original, 100=directly plagiarized>, "
            "\"summary\": \"<2-3 sentence plain-English assessment>\"}"
        )
        loop = asyncio.get_event_loop()
        try:
            resp = await loop.run_in_executor(
                None,
                lambda: _client.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=prompt,
                )
            )
            match = re.search(r'\{.*\}', resp.text.strip(), re.DOTALL)
            if match:
                parsed  = json.loads(match.group())
                score   = max(0, min(100, int(parsed.get("score", 0))))
                summary = parsed.get("summary", summary)
        except Exception as e:
            print(f"[Plagiarism] Gemini scoring error: {e}")

    if score > 65:
        label = "High Risk"
    elif score > 35:
        label = "Moderate Risk"
    else:
        label = "Low Risk — Original"

    return {
        "score":   score,
        "label":   label,
        "summary": summary,
        "sources": sources[:8],
    }
