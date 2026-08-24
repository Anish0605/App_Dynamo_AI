# detector.py — Dynamo AI
# In-house AI Text Detector + Plagiarism Checker
# Uses: Gemini (analysis & scoring), Tavily (web search), Semantic Scholar (academic),
#       Crossref (publisher metadata)

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


_CHUNK_SIZE = 4000  # chars per chunk sent to Gemini — matches the model's reliable analysis window

_LABEL_THRESHOLDS = [
    (20, "Human Written"),
    (40, "Likely Human"),
    (60, "Mixed"),
    (80, "Likely AI"),
    (101, "AI Generated"),
]


def _score_to_label(score: float) -> str:
    for ceiling, label in _LABEL_THRESHOLDS:
        if score < ceiling:
            return label
    return "AI Generated"


def _split_into_chunks(text: str, chunk_size: int = _CHUNK_SIZE) -> list[str]:
    """
    Split the full article into ~chunk_size character pieces so every part of a
    long document gets analyzed, not just the first page. Breaks on paragraph
    boundaries where possible so a chunk doesn't cut a sentence in half.
    """
    text = text.strip()
    if len(text) <= chunk_size:
        return [text] if text else []

    paragraphs = re.split(r'\n\s*\n', text)
    chunks, current = [], ""
    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) <= chunk_size:
            current = candidate
            continue
        if current:
            chunks.append(current)
        if len(para) <= chunk_size:
            current = para
        else:
            # a single paragraph longer than chunk_size — hard-slice it
            for i in range(0, len(para), chunk_size):
                chunks.append(para[i:i + chunk_size])
            current = ""
    if current:
        chunks.append(current)
    return chunks


async def _detect_chunk(chunk: str, attempt: int = 0) -> dict | None:
    """Run AI-detection on a single chunk. Retries once on failure before giving up."""
    loop = asyncio.get_event_loop()
    try:
        resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=_AI_PROMPT + chunk,
            )
        )
        match = re.search(r'\{.*\}', resp.text.strip(), re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            parsed["score"] = max(0, min(100, int(parsed.get("score", 50))))
            return parsed
    except Exception as e:
        print(f"[Detector] AI detection chunk error (attempt {attempt}): {e}")
    if attempt == 0:
        return await _detect_chunk(chunk, attempt=1)
    return None


async def detect_ai(text: str) -> dict:
    if not _client:
        return _err("AI detector not available — Gemini not configured.")

    chunks = _split_into_chunks(text)
    if not chunks:
        return _err("Analysis failed. Please try again.")

    results = await asyncio.gather(*[_detect_chunk(c) for c in chunks])
    valid = [(len(c), r) for c, r in zip(chunks, results) if r]

    if not valid:
        return _err("Analysis failed. Please try again.")

    total_len = sum(length for length, _ in valid)
    weighted_score = sum(length * r["score"] for length, r in valid) / total_len

    confidence_rank = {"Low": 0, "Medium": 1, "High": 2}
    scores = [r["score"] for _, r in valid]
    score_spread = max(scores) - min(scores)
    if len(valid) == 1:
        confidence = valid[0][1].get("confidence", "Medium")
    elif score_spread > 40:
        # sections disagree strongly on whether they're AI-written — lower confidence overall
        confidence = "Low"
    else:
        confidences = [confidence_rank.get(r.get("confidence", "Medium"), 1) for _, r in valid]
        avg_conf = sum(confidences) / len(confidences)
        confidence = "High" if avg_conf >= 1.5 else ("Medium" if avg_conf >= 0.5 else "Low")

    # pull signals from the highest-scoring (most AI-like) chunks first, dedup, cap at 5
    ranked_chunks = sorted(valid, key=lambda pair: pair[1]["score"], reverse=True)
    signals, seen = [], set()
    for _, r in ranked_chunks:
        for s in r.get("signals", []):
            if s not in seen:
                seen.add(s)
                signals.append(s)
            if len(signals) >= 5:
                break
        if len(signals) >= 5:
            break

    label = _score_to_label(weighted_score)
    if len(valid) > 1:
        flagged = sum(1 for _, r in valid if r["score"] >= 60)
        coverage_note = (
            f" Full article analyzed across {len(valid)} sections"
            f"{f' ({len(chunks) - len(valid)} could not be analyzed)' if len(valid) < len(chunks) else ''}"
            f"; {flagged} of {len(valid)} section(s) showed AI-like patterns."
        )
        summary = (ranked_chunks[0][1].get("summary", "") + coverage_note).strip()
    else:
        summary = valid[0][1].get("summary", "")

    return {
        "score": round(weighted_score),
        "label": label,
        "confidence": confidence,
        "signals": signals or ["No specific signals extracted."],
        "summary": summary,
        "chunks_analyzed": len(valid),
        "chunks_total": len(chunks),
    }


_HUMANIZE_PROMPT = """\
You are a skilled academic editor specialising in natural, authentic scholarly writing.

Your task: rewrite the text below so it reads as genuinely human-written while preserving ALL of the original meaning, facts, arguments, citations, and academic level.

Rules:
1. Keep every core idea, argument, data point, citation, and domain-specific term intact
2. Vary sentence length — mix short direct statements with longer, more developed ones
3. Add natural hedging where appropriate ("We believe…", "Our data suggest…", "It seems…")
4. Replace generic AI filler phrases (e.g. "It is important to note", "This study aims to") with more grounded, specific language
5. Introduce the subtle imperfections of human writing — a parenthetical aside, a slightly colloquial phrase, a sentence that trails off into a qualifier
6. Preserve the original academic register; do NOT make it informal or casual
7. Do NOT add new facts, figures, or claims not in the original
8. Do NOT include any preamble, explanation, or meta-commentary — return ONLY the rewritten text

ORIGINAL TEXT:
"""

_HUMANIZE_CHUNK_SIZE = 6000  # chars per Gemini call — matches the model's reliable rewrite window

_HUMANIZE_RETRY_PROMPT = """\
You are a skilled academic editor. The rewrite below was just flagged by an AI detector for these reasons:
{signals}

Revise it further to address those specific signals — vary sentence rhythm more, cut any remaining generic
filler, add sharper hedging/voice — while preserving every fact, argument, citation, and the academic register.
Do NOT add new facts. Return ONLY the revised text, no preamble.

TEXT TO REVISE:
"""


async def _humanize_chunk(chunk: str, attempt: int = 0) -> str | None:
    """Rewrite a single chunk. Retries once on failure/empty response."""
    loop = asyncio.get_event_loop()
    try:
        resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=_HUMANIZE_PROMPT + chunk,
            )
        )
        out = (resp.text or "").strip()
        if out:
            return out
    except Exception as e:
        print(f"[Humanizer] chunk error (attempt {attempt}): {e}")
    if attempt == 0:
        return await _humanize_chunk(chunk, attempt=1)
    return None


async def humanize_text(text: str) -> dict:
    """
    Rewrite AI-generated text to read as authentically human-written.

    Handles articles of any length by chunking, retries a chunk once on failure,
    and then re-checks its own output against the AI detector — if the rewrite
    still reads as AI-like, it runs one more targeted revision pass before
    returning, so the result the user gets back has actually been verified.
    """
    if not _client:
        return {"ok": False, "error": "Humanizer not available — Gemini not configured."}

    chunks = _split_into_chunks(text, chunk_size=_HUMANIZE_CHUNK_SIZE)
    if not chunks:
        return {"ok": False, "error": "No text to humanize."}

    results = await asyncio.gather(*[_humanize_chunk(c) for c in chunks])
    if any(r is None for r in results):
        return {"ok": False, "error": "Humanization failed on part of the document. Please try again."}

    humanized = "\n\n".join(results).strip()
    if not humanized:
        return {"ok": False, "error": "Humanizer returned an empty response. Please try again."}

    # Verify the rewrite actually reads as human before handing it back.
    verification = await detect_ai(humanized)
    verify_score = verification.get("score", 50)

    if verify_score >= 60:
        # Still reads as AI-like — run one targeted revision pass using the detector's own signals.
        signals_text = "\n".join(f"- {s}" for s in verification.get("signals", [])) or "- Generic phrasing and uniform rhythm"
        retry_chunks = _split_into_chunks(humanized, chunk_size=_HUMANIZE_CHUNK_SIZE)

        async def _revise(chunk: str) -> str | None:
            loop = asyncio.get_event_loop()
            try:
                resp = await loop.run_in_executor(
                    None,
                    lambda: _client.models.generate_content(
                        model="gemini-3.6-flash",
                        contents=_HUMANIZE_RETRY_PROMPT.format(signals=signals_text) + chunk,
                    )
                )
                return (resp.text or "").strip() or None
            except Exception as e:
                print(f"[Humanizer] revision pass error: {e}")
                return None

        revised_results = await asyncio.gather(*[_revise(c) for c in retry_chunks])
        if all(revised_results):
            revised = "\n\n".join(revised_results).strip()
            revised_check = await detect_ai(revised)
            # Only keep the revision if it actually improved the score.
            if revised_check.get("score", 100) < verify_score:
                humanized = revised
                verification = revised_check
                verify_score = revised_check.get("score", verify_score)

    return {
        "ok": True,
        "humanized": humanized,
        "verified_human": verify_score < 60,
        "verification_score": verify_score,
        "verification_label": verification.get("label", ""),
    }


def _err(msg: str) -> dict:
    return {
        "score": 50, "label": "Mixed", "confidence": "Low",
        "signals": [msg], "summary": msg,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PLAGIARISM CHECKER
# ─────────────────────────────────────────────────────────────────────────────

_PLAG_SECTION_SIZE = 3000  # chars per section — each section gets its own search + judgement
_CROSSREF_MAX_CONCURRENCY = 4  # keep public Crossref traffic polite on large documents
_CROSSREF_TIMEOUT_SECONDS = 10
_PLAG_MIN_MATCH_WORDS = 8  # shorter runs are usually shared terminology, not evidence
_PLAG_MAX_SOURCE_WORDS = 80000


def _queries_for_section(section: str) -> list[str]:
    """Pull distinctive phrases for exact-match web discovery."""
    cleaned = re.sub(r'\[[\w\s,\.]+\]', '', section).strip()
    words = cleaned.split()
    total = len(words)
    if total < 15:
        return []

    # Search distinctive sentence fragments, not broad 40-word paragraphs.
    # Quoted phrases make the search engine look for the actual wording.
    sentences = re.split(r'(?<=[.!?])\s+', cleaned)
    candidates = []
    for sentence in sentences:
        sentence_words = sentence.split()
        if len(sentence_words) >= 10:
            candidates.append(" ".join(sentence_words[:16]))
            if len(sentence_words) >= 26:
                middle = max(0, len(sentence_words) // 2 - 8)
                candidates.append(" ".join(sentence_words[middle:middle + 16]))

    if not candidates:
        candidates = [
            " ".join(words[:16]),
            " ".join(words[max(0, total // 2 - 8):max(0, total // 2 - 8) + 16]),
        ]

    unique = []
    seen = set()
    for phrase in candidates:
        phrase = re.sub(r'\s+', ' ', phrase).strip().strip('"')
        key = phrase.lower()
        if len(phrase) >= 40 and key not in seen:
            seen.add(key)
            unique.append(phrase[:220])
        if len(unique) >= 2:
            break
    return unique


async def _tavily_search(query: str) -> list[dict]:
    if not config.TAVILY_KEY:
        return []
    loop = asyncio.get_event_loop()
    try:
        from tavily import TavilyClient
        tc = TavilyClient(api_key=config.TAVILY_KEY)
        # Ask Tavily for the actual public page text. Search snippets alone
        # are not evidence of copying and caused the old Gemini-only scorer
        # to produce confident-looking false zeros.
        exact_query = f'"{query.strip().strip(chr(34))}"'
        r = await loop.run_in_executor(
            None,
            lambda: tc.search(
                query=exact_query,
                search_depth="advanced",
                max_results=5,
                exact_match=True,
                include_raw_content="text",
            ),
        )
        return [
            {
                "source":  (item.get("title") or "Unknown")[:80],
                "url":     item.get("url", ""),
                "type":    "web",
                "snippet": (item.get("content") or "")[:240],
                "_raw_content": (item.get("raw_content") or "").strip()[:_PLAG_MAX_SOURCE_WORDS * 8],
            }
            for item in r.get("results", []) if item.get("url")
        ]
    except Exception as e:
        print(f"[Plagiarism] Tavily error: {e}")
        return []


async def _semantic_scholar_search(query: str) -> list[dict]:
    try:
        async with aiohttp.ClientSession() as session:
            params = {"query": query[:200], "fields": "title,year,authors,externalIds,abstract", "limit": 4}
            async with session.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params=params,
                headers={"User-Agent": "DynamoAI/1.0"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()
                out = []
                for p in data.get("data", []):
                    if not p.get("title"):
                        continue
                    doi = (p.get("externalIds") or {}).get("DOI", "")
                    out.append({
                        "source":  p["title"][:80],
                        "url":     f"https://doi.org/{doi}" if doi else "",
                        "type":    "academic",
                        "snippet": (p.get("abstract") or f"Published {p.get('year', 'N/A')}")[:200],
                    })
                return out
    except Exception as e:
        print(f"[Plagiarism] Semantic Scholar error: {e}")
        return []


_crossref_semaphore = asyncio.Semaphore(_CROSSREF_MAX_CONCURRENCY)


async def _crossref_search(query: str) -> list[dict]:
    """Search Crossref's free publisher metadata index for works matching a section."""
    try:
        async with _crossref_semaphore:
            params = {
                "query.bibliographic": query[:200],
                "rows": 4,
                "select": "DOI,title,URL,abstract,published",
            }
            headers = {
                "User-Agent": "DynamoAI/1.0 (https://dynamoai.in)",
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.crossref.org/works",
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=_CROSSREF_TIMEOUT_SECONDS),
                ) as resp:
                    if resp.status != 200:
                        return []
                    data = await resp.json()

            out = []
            for item in (data.get("message") or {}).get("items", []):
                titles = item.get("title") or []
                title = str(titles[0]).strip() if titles else ""
                if not title:
                    continue

                doi = str(item.get("DOI") or "").strip()
                # Prefer the canonical DOI URL when available so the same
                # work returned by Semantic Scholar is deduplicated cleanly.
                url = f"https://doi.org/{doi}" if doi else str(item.get("URL") or "").strip()
                if not url:
                    continue

                abstract = str(item.get("abstract") or "")
                # Crossref abstracts may contain JATS/XML markup; keep the
                # existing short-snippet contract safe for the frontend/LLM.
                snippet = re.sub(r"<[^>]+>", " ", abstract)
                snippet = re.sub(r"\s+", " ", snippet).strip()
                if not snippet:
                    published = item.get("published", {}).get("date-parts", [[]])
                    year = published[0][0] if published and published[0] else "N/A"
                    snippet = f"Publisher metadata record · Published {year}"

                out.append({
                    "source": title[:80],
                    "url": url,
                    "type": "crossref",
                    "snippet": snippet[:200],
                })
            return out
    except Exception as e:
        print(f"[Plagiarism] Crossref error: {e}")
        return []


def _text_tokens(text: str) -> list[str]:
    """Normalize text for deterministic comparison while retaining technical words."""
    return re.findall(r"[a-z0-9]+(?:['’-][a-z0-9]+)?", (text or "").lower())


def _remove_reference_section(text: str) -> tuple[str, int]:
    """Exclude a trailing bibliography from prose-similarity scoring."""
    if not text:
        return "", 0

    heading_pattern = re.compile(
        r"(?im)^[ \t]*(?:(?:\d+(?:\.\d+)*)[.)]?[ \t]+)?"
        r"(?:references|bibliography|works cited|literature cited)[ \t]*:?[ \t]*$"
    )
    heading = heading_pattern.search(text)
    if not heading:
        return text, 0

    body = text[:heading.start()].rstrip()
    excluded_words = max(0, len(_text_tokens(text)) - len(_text_tokens(body)))
    return body, excluded_words


def _best_public_overlap(submitted: str, public_text: str) -> dict | None:
    """
    Find the longest exact contiguous passage shared by submitted text and a
    fetched public page. This is intentionally deterministic: an LLM never
    invents the similarity percentage.
    """
    submitted_tokens = _text_tokens(submitted)
    source_tokens = _text_tokens(public_text)[:_PLAG_MAX_SOURCE_WORDS]
    n = _PLAG_MIN_MATCH_WORDS
    if len(submitted_tokens) < n or len(source_tokens) < n:
        return None

    positions = {}
    for index in range(len(source_tokens) - n + 1):
        gram = tuple(source_tokens[index:index + n])
        # Common phrases can occur thousands of times. A small sample is
        # sufficient to find the longest run without quadratic work.
        if len(positions.get(gram, ())) < 8:
            positions.setdefault(gram, []).append(index)

    best = None
    for submitted_index in range(len(submitted_tokens) - n + 1):
        gram = tuple(submitted_tokens[submitted_index:submitted_index + n])
        for source_index in positions.get(gram, []):
            length = n
            while (
                submitted_index + length < len(submitted_tokens)
                and source_index + length < len(source_tokens)
                and submitted_tokens[submitted_index + length] == source_tokens[source_index + length]
            ):
                length += 1
            if not best or length > best["matched_words"]:
                best = {
                    "matched_words": length,
                    "submitted_start": submitted_index,
                    "submitted_end": submitted_index + length,
                    "source_start": source_index,
                    "source_end": source_index + length,
                }
    return best


def _public_excerpt(text: str, start: int, end: int) -> str:
    tokens = _text_tokens(text)
    return " ".join(tokens[start:end])[:300]


def _strip_internal_source(source: dict) -> dict:
    return {key: value for key, value in source.items() if not key.startswith("_")}


async def _check_section(section: str, section_index: int = 0) -> dict:
    """Search and deterministically compare one document section."""
    queries = _queries_for_section(section)
    if not queries:
        return {
            "verified": False, "evidence_checked": False, "score": None,
            "summary": "Section too short to search.", "sources": [],
            "matched_words": 0, "matches": [],
        }

    # Tavily searches both representative phrases; the academic indexes use
    # the first phrase once per section to keep public API traffic bounded.
    search_calls = (
        [_tavily_search(q) for q in queries]
        + [_semantic_scholar_search(queries[0])]
        + [_crossref_search(queries[0])]
    )
    results_lists = await asyncio.gather(*search_calls)

    seen_urls, sources = set(), []
    for lst in results_lists:
        for s in lst:
            key = s["url"] or (s["type"], s["snippet"])
            if key not in seen_urls:
                seen_urls.add(key)
                sources.append(s)

    if not sources:
        return {
            "verified": False, "evidence_checked": False, "score": None,
            "summary": "No candidate sources were returned for this section.",
            "sources": [], "matched_words": 0, "matches": [],
        }

    matches = []
    for source in sources:
        raw_content = source.get("_raw_content", "")
        if not raw_content:
            continue
        overlap = _best_public_overlap(section, raw_content)
        if overlap:
            overlap["source"] = source["source"]
            overlap["url"] = source["url"]
            overlap["type"] = source["type"]
            overlap["section_index"] = section_index
            overlap["excerpt"] = _public_excerpt(
                raw_content, overlap["source_start"], overlap["source_end"]
            )
            source["matched_words"] = overlap["matched_words"]
            source["match_excerpt"] = overlap["excerpt"]
            matches.append(overlap)

    matches.sort(key=lambda item: item["matched_words"], reverse=True)
    matched_words = matches[0]["matched_words"] if matches else 0
    section_words = max(1, len(_text_tokens(section)))
    score = round(matched_words / section_words * 100, 1) if matches else 0
    evidence_checked = any(s.get("_raw_content") for s in sources)
    clean_sources = []
    for source in sources:
        clean = _strip_internal_source(source)
        clean["evidence_available"] = bool(source.get("_raw_content"))
        clean_sources.append(clean)

    if matches:
        top = matches[0]
        summary = (
            f"Found a deterministic public-text overlap of {top['matched_words']} words "
            f"with {top['source']}. Review the highlighted source passage and citation."
        )
    elif evidence_checked:
        summary = (
            "No contiguous overlap of eight or more words was found in the public page text "
            "retrieved for this section. This is not a guarantee of originality."
        )
    else:
        summary = (
            "Candidate records were found, but their public page text could not be retrieved. "
            "This section could not be verified."
        )

    return {
        "verified": evidence_checked,
        "evidence_checked": evidence_checked,
        "score": score,
        "summary": summary,
        "sources": clean_sources,
        "evidence_sources_count": sum(1 for s in clean_sources if s["evidence_available"]),
        "matched_words": matched_words,
        "matches": matches,
    }


async def check_plagiarism(text: str) -> dict:
    """
    Full-coverage originality check: splits the article into sections so every part
    of a long document is searched. Search services discover candidate pages;
    only fetched public page text is compared deterministically. Metadata and
    snippets are never treated as proof of a match.
    """
    checked_text, excluded_reference_words = _remove_reference_section(text)
    sections = _split_into_chunks(checked_text, chunk_size=_PLAG_SECTION_SIZE)
    if not sections:
        return {"score": 0, "label": "Low Risk", "summary": "No text to check.", "sources": [],
                "sources_found": 0, "queries_run": 0, "verified": False}

    results = await asyncio.gather(*[
        _check_section(section, section_index=index + 1)
        for index, section in enumerate(sections)
    ])

    seen_urls, sources = set(), []
    for r in results:
        for s in r["sources"]:
            key = s["url"] or (s["type"], s["snippet"])
            if key not in seen_urls:
                seen_urls.add(key)
                sources.append(s)

    # Candidate records are useful for transparency, but only sources with
    # fetched raw text count as pages actually compared.
    public_pages_compared = sum(1 for s in sources if s.get("evidence_available"))

    lengths = [len(s) for s in sections]
    evidence_results = [(l, r) for l, r in zip(lengths, results) if r["evidence_checked"]]
    unverified_count = len(results) - len(evidence_results)
    total_words = max(1, len(_text_tokens(checked_text)))
    matched_words = sum(r["matched_words"] for r in results)
    score = round(matched_words / total_words * 100, 1)
    all_matches = sorted(
        [match for result in results for match in result["matches"]],
        key=lambda item: item["matched_words"],
        reverse=True,
    )
    # Multiple search results often mirror the same page or reproduce the same
    # submitted passage. Keep one evidence result per submitted span.
    unique_matches = []
    seen_spans = set()
    for match in all_matches:
        span_key = (
            match.get("section_index", 0),
            match["submitted_start"],
            match["submitted_end"],
        )
        if span_key not in seen_spans:
            seen_spans.add(span_key)
            unique_matches.append(match)
    all_matches = unique_matches

    # Only selected evidence sources receive a visible match annotation.
    # Candidate pages remain available as discovery sources without appearing
    # to be independent plagiarism findings.
    selected_source_matches = {}
    for match in all_matches:
        key = match.get("url") or match.get("source")
        selected_source_matches[key] = max(
            selected_source_matches.get(key, 0),
            match["matched_words"],
        )
    for source in sources:
        source.pop("matched_words", None)
        source.pop("match_excerpt", None)
        key = source.get("url") or source.get("source")
        if key in selected_source_matches:
            source["matched_words"] = selected_source_matches[key]
            matching = next(
                (match for match in all_matches if (match.get("url") or match.get("source")) == key),
                None,
            )
            if matching:
                source["match_excerpt"] = matching["excerpt"]

    if all_matches:
        top = all_matches[0]
        summary = (
            f"Found {matched_words} words of deterministic overlap across "
            f"{len(all_matches)} public-source match(es). Strongest match: {top['source']}. "
            f"Checked {len(sections)} body section(s); {unverified_count} section(s) could not be "
            "verified because usable public page text was unavailable."
        )
        verification_state = "matches_found"
        verified_overall = True
    elif evidence_results:
        summary = (
            f"No contiguous overlap of {_PLAG_MIN_MATCH_WORDS} or more words was found in "
            f"the public page text retrieved for {len(evidence_results)} body section(s). "
            "This is not a guarantee of originality; paywalled journals, theses, private "
            "documents, and unindexed pages are not covered."
        )
        verification_state = "partial_no_overlap" if unverified_count else "no_overlap"
        verified_overall = True
    else:
        summary = (
            "The checker could not retrieve enough public page text to verify this document. "
            "A 0% result here must not be interpreted as proof of originality. Paywalled "
            "journals, theses, private documents, and unindexed pages are not covered."
        )
        verification_state = "insufficient_evidence"
        verified_overall = False

    if score > 65:
        label = "High Risk"
    elif score > 35:
        label = "Moderate Risk"
    else:
        label = "Low Risk — Original"

    # Build methodology note for frontend transparency
    methodology = (
        f"Searched all {len(sections)} body section(s) of your document (full coverage, not just the opening) across "
        f"live web (Tavily), Semantic Scholar academic database, and Crossref publisher metadata. "
        f"Found {len(sources)} unique sources ({len([s for s in sources if s['type']=='academic'])} academic, "
        f"{len([s for s in sources if s['type']=='crossref'])} Crossref, "
        f"{len([s for s in sources if s['type']=='web'])} web); "
        f"actually compared public text from {public_pages_compared} page(s). "
        f"Compared fetched public page text with deterministic {_PLAG_MIN_MATCH_WORDS}-word "
        "contiguous matching; metadata records, search snippets, and the reference list were "
        "not treated as proof."
    )

    return {
        "score":              score,
        "label":              label,
        "summary":            summary,
        "sources":            sources[:20],
        "methodology":        methodology,
        "queries_run":        len(sections),
        "sources_found":      len(sources),
        "public_pages_compared": public_pages_compared,
        "evidence_sources_count": sum(
            1 for s in sources if s.get("evidence_available")
        ),
        "verified":           verified_overall,
        "verification_state": verification_state,
        "sections_analyzed":  len(sections),
        "sections_unverified": unverified_count,
        "words_checked":      total_words,
        "reference_words_excluded": excluded_reference_words,
        "matched_words":      matched_words,
        "matches_found":      len(all_matches),
        "matches":            all_matches[:20],
    }


# ─────────────────────────────────────────────────────────────────────────────
# SENTENCE-LEVEL HEATMAP
# ─────────────────────────────────────────────────────────────────────────────

_HEATMAP_PROMPT = """\
You are analysing text for AI-generation patterns at the sentence level.

For each sentence in the text below, assign a score from 0 to 100:
- 0  = clearly human-written (personal voice, specific detail, idiosyncratic phrasing)
- 50 = ambiguous or mixed
- 100 = clearly AI-generated (formulaic, generic, perfectly structured filler)

IMPORTANT — academic writing uses formal language by design. Do NOT penalise:
- Passive voice, hedged claims, literature review phrasing
- Technical jargon, structured methodology sections
- Citations or references to prior work

Return ONLY a valid JSON array. Each element: {"s": "<exact sentence>", "score": <int 0-100>}
No markdown, no extra text. Process every sentence in order.

TEXT:
"""

async def detect_ai_sentences(text: str) -> dict:
    """Sentence-level AI detection — single Gemini call returns per-sentence scores."""
    if not _client:
        return {"sentences": [], "error": "Gemini not configured"}

    sample = text[:3500]
    loop = asyncio.get_event_loop()
    try:
        resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=_HEATMAP_PROMPT + sample,
            )
        )
        raw = resp.text.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            items = json.loads(match.group())
            cleaned = []
            for item in items:
                if isinstance(item, dict) and "s" in item and str(item["s"]).strip():
                    cleaned.append({
                        "s":     str(item["s"]).strip(),
                        "score": max(0, min(100, int(item.get("score", 50)))),
                    })
            return {"sentences": cleaned, "truncated": len(text) > 3500}
    except Exception as e:
        print(f"[Heatmap] Error: {e}")

    return {"sentences": [], "error": "Could not generate sentence analysis"}


# ─────────────────────────────────────────────────────────────────────────────
# SELF-PLAGIARISM COMPARISON
# ─────────────────────────────────────────────────────────────────────────────

_SELF_PLAG_CHUNK_SIZE = 3000  # chars per chunk — fits comfortably inside one Gemini call alongside the other doc chunk
_SELF_PLAG_MAX_CHUNKS_PER_DOC = 8   # caps chunks per document so pair count (and total Gemini calls) stays bounded
_SELF_PLAG_MAX_CONCURRENCY = 6      # max Gemini calls in flight at once — avoids rate-limit storms on large documents
_SELF_PLAG_TIMEOUT_SECONDS = 110    # overall wall-clock budget; if exceeded we return a clear timeout message instead of hanging
_SELF_PLAG_OVERLAP_THRESHOLD = 30   # pair score above which a section pair is reported as a notable overlap


def _self_plag_chunk_size(text_len: int) -> int:
    """
    Pick a chunk size that keeps each document to at most
    _SELF_PLAG_MAX_CHUNKS_PER_DOC chunks, however long the document is.
    This guarantees full-document coverage (nothing is truncated or dropped)
    while keeping the total number of pairwise Gemini calls bounded, which is
    what prevents very large documents from silently timing out.
    """
    if text_len <= 0:
        return _SELF_PLAG_CHUNK_SIZE
    needed = -(-text_len // _SELF_PLAG_MAX_CHUNKS_PER_DOC)  # ceil division
    return max(_SELF_PLAG_CHUNK_SIZE, needed)

_SELF_PLAG_PAIR_PROMPT = """\
You are an academic integrity expert specialising in self-plagiarism detection.

Compare these two excerpts and identify content overlap, shared passages, or recycled ideas.

EXCERPT FROM DOCUMENT A (current paper):
"{chunk_a}"

EXCERPT FROM DOCUMENT B (prior work):
"{chunk_b}"

Self-plagiarism = reusing substantial portions of your own prior published work without disclosure.
Shared domain terminology, common methodology descriptions, or standard boilerplate are NOT self-plagiarism.
Only flag actual copied or heavily paraphrased passages that appear in both excerpts without citation.

Return ONLY valid JSON:
{{
  "score": <int 0-100; 0=completely different, 100=near-identical>,
  "overlaps": [<list of 0-3 strings describing specific overlapping phrases or ideas found in BOTH excerpts>],
  "summary": "<1-2 sentences assessing the overlap between these two excerpts>"
}}"""


async def _compare_pair(chunk_a: str, chunk_b: str, attempt: int = 0) -> dict | None:
    """Compare one chunk of A against one chunk of B. Retries once on failure."""
    loop = asyncio.get_event_loop()
    prompt = _SELF_PLAG_PAIR_PROMPT.format(chunk_a=chunk_a, chunk_b=chunk_b)
    try:
        resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
        )
        match = re.search(r'\{.*\}', resp.text.strip(), re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            return {
                "score":    max(0, min(100, int(parsed.get("score", 0)))),
                "overlaps": parsed.get("overlaps", []),
                "summary":  parsed.get("summary", ""),
            }
    except Exception as e:
        print(f"[SelfPlag] pair comparison error (attempt {attempt}): {e}")
    if attempt == 0:
        return await _compare_pair(chunk_a, chunk_b, attempt=1)
    return None


async def _run_self_plag_comparison(text_a: str, text_b: str) -> dict:
    """The actual chunk-and-compare work, run under a wall-clock budget by the caller."""
    chunk_size_a = _self_plag_chunk_size(len(text_a))
    chunk_size_b = _self_plag_chunk_size(len(text_b))
    chunks_a = _split_into_chunks(text_a, chunk_size=chunk_size_a)
    chunks_b = _split_into_chunks(text_b, chunk_size=chunk_size_b)

    if not chunks_a or not chunks_b:
        return {"score": 0, "summary": "One or both documents are empty.", "overlaps": [], "recommendation": ""}

    # Compare every section of A against every section of B, index-tracked so we can
    # report exactly which section pair an overlap came from (not just the phrase text).
    pairs = [(i, a, j, b) for i, a in enumerate(chunks_a) for j, b in enumerate(chunks_b)]

    # Bound concurrent Gemini calls — large documents can produce dozens of pairs,
    # and firing them all at once risks rate-limit failures that look like a hang.
    sem = asyncio.Semaphore(_SELF_PLAG_MAX_CONCURRENCY)

    async def _bounded_compare(a: str, b: str):
        async with sem:
            return await _compare_pair(a, b)

    pair_results = await asyncio.gather(*[_bounded_compare(a, b) for _, a, _, b in pairs])

    valid = [(i, j, r) for (i, _, j, _), r in zip(pairs, pair_results) if r is not None]

    if not valid:
        return {"score": 0, "overlaps": [], "summary": "Analysis failed. Please try again.", "recommendation": ""}

    # For each A chunk, find its worst-case (max) overlap score against any B chunk
    a_chunk_max: dict[int, int] = {}
    for i, _, r in valid:
        a_chunk_max[i] = max(a_chunk_max.get(i, 0), r["score"])

    # Weighted overall score — weight by A-chunk length so large recycled sections dominate
    total_len = sum(len(chunks_a[i]) for i in a_chunk_max)
    overall_score = round(
        sum(len(chunks_a[i]) * score for i, score in a_chunk_max.items()) / total_len
    ) if total_len else 0

    # Section-level overlaps — exactly which Document A section overlaps with which
    # Document B section, sorted by severity, so the user can go look at those spots.
    sorted_valid = sorted(valid, key=lambda t: t[2]["score"], reverse=True)
    section_overlaps = []
    for i, j, r in sorted_valid:
        if r["score"] <= _SELF_PLAG_OVERLAP_THRESHOLD:
            continue
        section_overlaps.append({
            "section_a": i + 1,
            "section_b": j + 1,
            "score":     r["score"],
            "examples":  r.get("overlaps", [])[:3],
            "summary":   r.get("summary", ""),
        })
        if len(section_overlaps) >= 8:
            break

    # Flat overlap phrase list (backward compatible), each tagged with its section pair
    overlaps, seen = [], set()
    for i, j, r in sorted_valid:
        for o in r.get("overlaps", []):
            tagged = f"[Doc A §{i + 1} ↔ Doc B §{j + 1}] {o}"
            if o not in seen:
                seen.add(o)
                overlaps.append(tagged)
            if len(overlaps) >= 8:
                break
        if len(overlaps) >= 8:
            break

    top_summary = sorted_valid[0][2].get("summary", "") if sorted_valid else ""
    total_pairs = len(pairs)
    flagged_pairs = sum(1 for _, _, r in valid if r["score"] > _SELF_PLAG_OVERLAP_THRESHOLD)
    coverage_note = (
        f" Compared {len(chunks_a)} section(s) of Document A against "
        f"{len(chunks_b)} section(s) of Document B — full documents, no truncation "
        f"({len(valid)} of {total_pairs} pair(s) analyzed; {flagged_pairs} showed notable overlap)."
    )
    summary = (top_summary + coverage_note).strip()

    if overall_score > 65:
        recommendation = (
            "Significant overlap detected. Cite your prior work explicitly wherever ideas or phrasing "
            "are reused, or rewrite the overlapping sections substantially."
        )
    elif overall_score > 35:
        recommendation = (
            "Moderate overlap found. Review the flagged sections and add appropriate self-citations "
            "where ideas or phrasing from your prior work appear."
        )
    else:
        recommendation = (
            "Overlap is minimal. Ensure any shared methodology descriptions or domain terminology "
            "are properly contextualised so readers understand the relationship to your prior work."
        )

    return {
        "score":            overall_score,
        "overlaps":         overlaps or ["No specific overlapping passages identified."],
        "section_overlaps": section_overlaps,
        "summary":          summary,
        "recommendation":   recommendation,
        "chunks_a":         len(chunks_a),
        "chunks_b":         len(chunks_b),
        "pairs_analyzed":   len(valid),
        "pairs_total":      total_pairs,
    }


async def check_self_plagiarism(text_a: str, text_b: str) -> dict:
    """
    Full-coverage self-plagiarism check: chunks both documents so long papers are
    fully compared — not just the opening 1500 characters — and retries each
    Gemini call once on failure.

    Every section of Document A is compared against every section of Document B.
    The overall score is a weighted average of per-A-chunk maximum overlap scores,
    so a single recycled section in a long paper is still surfaced.

    Document size no longer determines coverage: chunk size scales up for very
    long documents so the pair count (and therefore total run time) stays bounded,
    and the whole comparison runs under a wall-clock timeout so a huge submission
    fails loudly with a clear message instead of hanging until the connection
    silently times out.
    """
    if not _client:
        return {"score": 0, "summary": "Gemini not configured", "overlaps": [], "recommendation": ""}

    try:
        return await asyncio.wait_for(
            _run_self_plag_comparison(text_a, text_b),
            timeout=_SELF_PLAG_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        return {
            "score": 0,
            "overlaps": [],
            "section_overlaps": [],
            "summary": "",
            "recommendation": "",
            "error": True,
            "timed_out": True,
            "message": (
                "This comparison took too long and was stopped so it wouldn't hang indefinitely. "
                "Try comparing shorter excerpts (e.g. one chapter or section at a time) instead of "
                "full-length documents."
            ),
        }
