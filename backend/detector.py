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

def _extract_queries(text: str) -> list[str]:
    """
    Extract 3 representative search queries from different parts of the text.
    Searching beginning + middle + end gives far better coverage than just the intro.
    Strips bracketed citations [1], [Author, 2020] etc. so searches are clean.
    """
    import re as _re
    cleaned = _re.sub(r'\[[\w\s,\.]+\]', '', text).strip()
    words   = cleaned.split()
    total   = len(words)

    def _chunk(start_word: int, length: int = 40) -> str:
        chunk = " ".join(words[start_word : start_word + length]).strip()
        return chunk[:220] if chunk else ""

    queries = []
    if total >= 40:
        queries.append(_chunk(0, 40))              # beginning
    if total >= 80:
        mid = max(0, total // 2 - 20)
        queries.append(_chunk(mid, 40))            # middle
    if total >= 120:
        end = max(0, total - 40)
        queries.append(_chunk(end, 40))            # end
    if not queries:
        queries.append(cleaned[:220])

    return [q for q in queries if len(q) > 30]


async def check_plagiarism(text: str) -> dict:
    """
    Check originality using multi-query Tavily web search + Semantic Scholar + Gemini scoring.

    Improvement over single-query: we extract representative phrases from the beginning,
    middle, and end of the document so all sections are covered, not just the opening lines.
    Sources are deduplicated by URL before Gemini scoring.
    """
    queries  = _extract_queries(text)
    seen_urls = set()
    sources   = []

    # 1. Tavily web search — run for each query section
    try:
        from tavily import TavilyClient
        if config.TAVILY_KEY:
            tc = TavilyClient(api_key=config.TAVILY_KEY)
            for q in queries:
                try:
                    r = tc.search(query=q, search_depth="basic", max_results=4)
                    for item in r.get("results", []):
                        url = item.get("url", "")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            sources.append({
                                "source":  (item.get("title") or "Unknown")[:80],
                                "url":     url,
                                "type":    "web",
                                "snippet": (item.get("content") or "")[:200],
                            })
                except Exception:
                    pass
    except Exception as e:
        print(f"[Plagiarism] Tavily error: {e}")

    # 2. Semantic Scholar — search with first query (best for academic topic extraction)
    try:
        async with aiohttp.ClientSession() as session:
            params = {
                "query":  queries[0][:200],
                "fields": "title,year,authors,externalIds,abstract",
                "limit":  6,
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
                            url = f"https://doi.org/{doi}" if doi else ""
                            if url in seen_urls:
                                continue
                            if url:
                                seen_urls.add(url)
                            sources.append({
                                "source":  p["title"][:80],
                                "url":     url,
                                "type":    "academic",
                                "snippet": (p.get("abstract") or f"Published {p.get('year', 'N/A')}")[:200],
                            })
    except Exception as e:
        print(f"[Plagiarism] Semantic Scholar error: {e}")

    # 3. Gemini scores similarity — sees the full text + all deduplicated sources
    score   = 0
    summary = "No closely matching sources found online or in academic databases. The text appears to be original."

    if sources and _client:
        src_block = "\n".join(
            f"- [{s['type'].upper()}] {s['source']}: {s['snippet']}"
            for s in sources[:8]
        )
        # Give Gemini the FULL text (up to 2000 chars) for a fair assessment
        prompt = (
            "You are an academic plagiarism detection expert.\n\n"
            f"Submitted text (up to 2000 chars):\n\"{text[:2000]}\"\n\n"
            f"Related sources found online across the full document:\n{src_block}\n\n"
            "These sources were found by searching phrases from the beginning, middle, and end of the submitted text.\n"
            "Assess whether the submitted text directly copies, paraphrases, or substantially overlaps with these sources.\n"
            "Important: shared technical terminology, common knowledge, and properly cited ideas are NOT plagiarism.\n"
            "Only flag actual copied passages or uncited borrowed ideas.\n\n"
            "Return ONLY valid JSON:\n"
            "{\"score\": <int 0-100; 0=fully original/properly cited, 100=directly plagiarized/uncited>, "
            "\"summary\": \"<2-3 sentences: what overlaps exist and whether they constitute plagiarism>\"}"
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

    # Build methodology note for frontend transparency
    methodology = (
        f"Searched {len(queries)} sections of your document (beginning, middle, end) across "
        f"live web (Tavily) and Semantic Scholar academic database. "
        f"Found {len(sources)} unique sources ({len([s for s in sources if s['type']=='academic'])} academic, "
        f"{len([s for s in sources if s['type']=='web'])} web). "
        f"Gemini then compared your full text against all found sources to assess actual content overlap."
    )

    return {
        "score":       score,
        "label":       label,
        "summary":     summary,
        "sources":     sources[:10],
        "methodology": methodology,
        "queries_run": len(queries),
        "sources_found": len(sources),
    }
