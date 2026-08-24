# deep_research.py — Dynamo AI Deep Research Agent
# Phase 1: Gemini Interactions API (deep-research-preview-04-2026)
# Fallback: True multi-step agentic pipeline (6 searches, gap analysis, synthesis)

import asyncio
import uuid
import time
from datetime import datetime
from google import genai
import config

_client = genai.Client(api_key=config.GEMINI_KEY) if config.GEMINI_KEY else None

# In-memory job store (keyed by job_id)
_jobs: dict[str, dict] = {}

DEEP_MODEL = "deep-research-preview-04-2026"
MAX_MODEL  = "deep-research-max-preview-04-2026"

# ── Academic-source cache ────────────────────────────────────────────────────
# Short-TTL cache so re-running Deep Research on the same/similar topic within
# a window doesn't re-spend calls against Semantic Scholar's rate-limited API.
_ACADEMIC_CACHE_TTL = 6 * 3600  # 6 hours
_academic_cache: dict[str, tuple[float, list[dict]]] = {}


def _normalize_query(q: str) -> str:
    return " ".join(q.strip().lower().split())


async def start_research(query: str, user_id: str, use_max: bool = False, user_plan: str = "pro") -> str:
    job_id = str(uuid.uuid4())[:8]
    model  = MAX_MODEL if use_max else DEEP_MODEL

    _jobs[job_id] = {
        "status":       "starting",
        "query":        query,
        "user_id":      user_id,
        "user_plan":    user_plan,
        "model":        model,
        "report":       None,
        "error":        None,
        "created_at":   datetime.utcnow().isoformat(),
        "elapsed":      0,
        "progress_msg": "Initialising deep research agent…",
        "activity":     [],
        "fallback":     False,
    }

    asyncio.create_task(_run_research(job_id, query, model))
    return job_id


def _log(job_id: str, msg: str):
    """Append a message to the job's live activity log."""
    job = _jobs.get(job_id)
    if job:
        job["activity"].append(msg)
        job["progress_msg"] = msg


async def _run_research(job_id: str, query: str, model: str):
    job        = _jobs[job_id]
    start_time = time.time()
    loop       = asyncio.get_event_loop()

    def _elapsed():
        return int(time.time() - start_time)

    # ── Attempt 1: Gemini Interactions API ─────────────────────────────────────
    try:
        job["status"] = "planning"
        _log(job_id, "📋 Building research plan…")

        def _create():
            return _client.interactions.create(
                agent=model,   # Gemini API now requires 'agent' field, not 'model'
                input=query,
                background=True,
            )

        interaction = await loop.run_in_executor(None, _create)
        op_name     = interaction.name

        job["status"] = "researching"
        _log(job_id, "🔍 Searching web and academic databases…")

        while True:
            e = _elapsed()
            job["elapsed"] = e
            if   e < 30:  _log(job_id, f"📄 Scanning sources… ({e}s)")
            elif e < 90:  _log(job_id, f"🧬 Analysing papers and data… ({e}s)")
            elif e < 180: _log(job_id, f"⚗️ Synthesising findings… ({e}s)")
            else:         _log(job_id, f"✍️ Writing final report… ({e}s)")

            def _poll(name=op_name):
                return _client.interactions.get(name=name)

            interaction = await loop.run_in_executor(None, _poll)
            if interaction.done:
                break
            await asyncio.sleep(6)

        report_text = _extract_text(interaction)

        # ── Academic verification pass — applied here too, not just in the
        # fallback pipeline, so every successful Deep Research run (whichever
        # path produced it) gets the same academic-source grounding and
        # fact-check treatment before being shown to the user.
        primary_papers = []
        primary_source_material = ""
        try:
            primary_papers = await _fetch_semantic_scholar_cached(query, limit=8)
            if primary_papers:
                primary_source_material = _papers_to_context(primary_papers, "Academic sources")
        except _RateLimited:
            _log(job_id, "⚠️ Academic source API is rate-limited — skipping academic verification for this report")
        except Exception as ae:
            _log(job_id, f"⚠️ Academic search unavailable: {str(ae)[:60]}")

        report_text = await _finalize_report(
            job_id, query, loop, report_text, primary_papers, primary_source_material
        )

        job.update({"status": "complete", "report": report_text,
                    "elapsed": _elapsed(), "progress_msg": "Research complete"})
        _log(job_id, "✅ Research complete")
        return

    except Exception as e:
        print(f"[DeepResearch] Interactions API failed for {job_id}: {e}")

    # ── Fallback: True Agentic Multi-Step Pipeline ──────────────────────────────
    # This is a real autonomous agent: plans searches, runs them, extracts
    # insights, identifies gaps, then synthesises a comprehensive report.
    # Unlike Research Mode (1 search + 3 models ~90s), this does 6 targeted
    # searches across different angles and takes 3-8 minutes.
    try:
        import search as search_mod

        job["status"] = "planning"
        job["fallback"] = True

        # ── Step 1: Generate a multi-angle research plan ─────────────────────
        _log(job_id, "🧠 Planning research strategy across multiple angles…")

        plan_prompt = (
            "You are a research director. Given this research topic, generate exactly 6 distinct "
            "search queries that together cover: (1) overview/background, (2) current state & data, "
            "(3) key actors/stakeholders, (4) challenges & criticisms, (5) recent developments 2024-2026, "
            "(6) future outlook & expert predictions.\n\n"
            f"TOPIC: {query}\n\n"
            "Return ONLY a JSON array of 6 strings, one per search query. No other text."
        )

        plan_resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=plan_prompt,
            )
        )

        import json, re
        queries = []
        try:
            raw = plan_resp.text.strip()
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            if match:
                queries = json.loads(match.group())
        except Exception:
            pass

        if not queries or len(queries) < 3:
            queries = [
                query,
                f"{query} latest data 2025",
                f"{query} challenges problems",
                f"{query} future trends predictions",
                f"{query} case studies examples",
                f"{query} expert analysis research",
            ]

        # Trial users (pro_validation) are capped at 3 searches to reduce API cost
        is_trial = job.get("user_plan") in ("pro_trial", "pro_validation")
        max_searches = 3 if is_trial else 6
        queries = queries[:max_searches]

        _log(job_id, f"📋 Research plan ready — {len(queries)} search angles identified")

        # ── Step 2: Execute all searches — academic sources first ────────────
        # For each angle, try Semantic Scholar (real scholarly papers) first.
        # Only fall back to general web search when scholarly results are too
        # thin for that angle, so the report leans on papers, not blog posts,
        # wherever possible — the thing this audience judges us on hardest.
        job["status"] = "researching"
        academic_ctxs: list[str] = []
        web_ctxs: list[str] = []
        all_papers: list[dict] = []
        academic_disabled = False  # set True after a 429 so we stop retrying a rate-limited API
        angle_labels = ["Overview", "Current data", "Key players",
                        "Challenges", "Recent developments", "Future outlook"]

        for i, q in enumerate(queries[:max_searches]):
            label = angle_labels[i] if i < len(angle_labels) else f"Angle {i+1}"
            _log(job_id, f"🔍 Searching: {label} — \"{q[:60]}...\"")

            angle_papers = []
            if not academic_disabled:
                try:
                    angle_papers = await _fetch_semantic_scholar_cached(q, limit=6)
                except _RateLimited:
                    academic_disabled = True
                    _log(job_id, "⚠️ Academic source API is rate-limited — using web search for the rest of this report")
                except Exception as ae:
                    _log(job_id, f"⚠️ Academic search unavailable for angle {i+1}: {str(ae)[:60]}")

            academic_ctx = _papers_to_context(angle_papers, label) if angle_papers else ""
            has_enough_academic = academic_ctx and academic_ctx.count("\n- ") >= 2

            if angle_papers:
                academic_ctxs.append(academic_ctx)
                all_papers.extend(angle_papers)

            if has_enough_academic:
                _log(job_id, f"📚 {label}: found {len(angle_papers)} academic papers")
            else:
                # Fall back to general web search for this angle — either no
                # academic API results, or too few to stand on their own.
                try:
                    ctx = await loop.run_in_executor(
                        None, lambda q=q: search_mod.get_web_context(q, deep_dive=True)
                    )
                    if ctx and len(ctx.strip()) > 100:
                        web_ctxs.append(f"=== {label} ===\n{ctx}")
                except Exception as se:
                    _log(job_id, f"⚠️ Search failed for angle {i+1}: {str(se)[:60]}")
            await asyncio.sleep(0.5)

        all_papers = _dedupe_papers(all_papers)
        _log(job_id, f"📄 Collected {len(academic_ctxs) + len(web_ctxs)} research sources ({len(all_papers)} academic papers)")

        # ── Step 3: Extract key insights per source ───────────────────────────
        # Academic material is placed first and given a guaranteed budget so
        # it isn't pushed out by web material when later steps truncate — the
        # whole point of this upgrade is that scholarly content survives into
        # what the model actually reads, not just what gets collected.
        _log(job_id, "🧬 Extracting key insights and evidence from each source…")
        ACADEMIC_BUDGET = 7000
        academic_material = "\n\n".join(academic_ctxs)[:ACADEMIC_BUDGET]
        web_material = "\n\n".join(web_ctxs)
        combined_context = academic_material + (("\n\n" + web_material) if web_material else "")

        extract_prompt = (
            "You are a research analyst. Read the following multi-source research context and extract "
            "the 12 most important factual insights, statistics, claims, or findings. "
            "Number each one [1] through [12]. Include the source context it came from.\n\n"
            f"TOPIC: {query}\n\n"
            f"RESEARCH CONTEXT:\n{combined_context[:8000]}\n\n"
            "Return numbered insights only, one per line."
        )

        insights_resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=extract_prompt,
            )
        )
        insights = insights_resp.text

        _log(job_id, f"✅ Extracted key insights and findings")

        # ── Step 4: Identify research gaps ────────────────────────────────────
        _log(job_id, "🔭 Identifying research gaps, blind spots, and open questions…")

        gaps_prompt = (
            "You are a senior research critic. Based on the following insights about a topic, "
            "identify 4-6 significant research gaps, underexplored angles, or open questions "
            "that existing literature has not adequately addressed.\n\n"
            f"TOPIC: {query}\n\n"
            f"CURRENT INSIGHTS:\n{insights[:3000]}\n\n"
            "Return a concise numbered list of research gaps."
        )

        gaps_resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=gaps_prompt,
            )
        )
        gaps = gaps_resp.text

        _log(job_id, "🔭 Research gaps identified")

        # ── Step 5: Synthesise full report ─────────────────────────────────────
        _log(job_id, "⚗️ Synthesising all findings into comprehensive report…")

        # academic_material is already fully included (guaranteed, see Step 3);
        # top up with as much web material as fits so the writer sees a rich
        # context, while the fact-check/matrix step later only trusts papers
        # inside academic_material — the part we know the writer actually saw.
        SYNTHESIS_BUDGET = 9000
        remaining_budget = max(1500, SYNTHESIS_BUDGET - len(academic_material))
        synthesis_context = academic_material + (("\n\n" + web_material[:remaining_budget]) if web_material else "")

        synthesis_prompt = (
            "You are a world-class academic research writer. Write a comprehensive, well-structured "
            "research report on the given topic using ALL the provided material.\n\n"
            "REQUIRED SECTIONS (use ## headings):\n"
            "1. Executive Summary (150 words)\n"
            "2. Introduction & Background\n"
            "3. Current State of the Field (with data and statistics)\n"
            "4. Key Findings (use numbered citations [1][2][3] from the insights)\n"
            "5. Key Stakeholders & Actors\n"
            "6. Challenges & Criticisms\n"
            "7. Recent Developments (2024–2026)\n"
            "8. Research Gaps & Open Questions\n"
            "9. Future Outlook & Expert Predictions\n"
            "10. Conclusion\n"
            "11. References (numbered list)\n\n"
            f"TOPIC: {query}\n\n"
            f"KEY INSIGHTS WITH CITATIONS:\n{insights}\n\n"
            f"RESEARCH GAPS:\n{gaps}\n\n"
            f"FULL RESEARCH CONTEXT:\n{synthesis_context}\n\n"
            "Write the complete, detailed, professional report now. Be thorough, use citations "
            "in [n] format throughout, and ensure every claim is supported. Minimum 1500 words."
        )

        _log(job_id, "✍️ Writing final report (this takes 1-2 minutes)…")

        report_resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3.6-flash",
                contents=synthesis_prompt,
            )
        )

        final_report = report_resp.text
        elapsed = _elapsed()

        _log(job_id, f"✅ Report written — {len(final_report.split())} words")

        # ── Step 6: Fact-check pass + Sources Matrix ─────────────────────────
        # Shared with the Interactions-API success path (see above) so both
        # execution paths get the same verification and sourcing treatment.
        # Uses synthesis_context (not the wider combined_context) so the
        # matrix only ever lists papers whose content the writer actually saw.
        final_report = await _finalize_report(
            job_id, query, loop, final_report, all_papers, synthesis_context
        )

        elapsed = _elapsed()
        _log(job_id, f"✅ Research complete in {elapsed}s")

        job.update({
            "status":       "complete",
            "report":       final_report,
            "elapsed":      elapsed,
            "progress_msg": "Deep research complete",
        })

    except Exception as e2:
        import traceback
        traceback.print_exc()
        job.update({
            "status":       "error",
            "error":        str(e2),
            "progress_msg": f"Research failed: {str(e2)[:120]}",
        })
        _log(job_id, f"❌ Error: {str(e2)[:80]}")


class _RateLimited(Exception):
    """Raised when Semantic Scholar's free tier returns 429 — signals the
    caller to stop hammering it for the rest of this job rather than retry
    on every remaining angle (wastes time and looks unreliable to the user)."""
    pass


async def _fetch_semantic_scholar(query: str, limit: int = 8) -> list[dict]:
    """Fetch top academic papers from Semantic Scholar (free, no key needed)."""
    import aiohttp
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query":  query,
        "fields": "paperId,title,year,citationCount,abstract,authors,externalIds",
        "limit":  limit,
    }
    headers = {"User-Agent": "DynamoAI/1.0 (academic research tool)"}
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url, params=params, headers=headers,
            timeout=aiohttp.ClientTimeout(total=15)
        ) as resp:
            if resp.status == 429:
                raise _RateLimited("Semantic Scholar rate limit hit (429)")
            if resp.status == 200:
                data = await resp.json()
                return data.get("data", [])
    return []


async def _fetch_semantic_scholar_cached(query: str, limit: int = 6) -> list[dict]:
    """Cached wrapper around _fetch_semantic_scholar — avoids re-querying the
    same/similar topic within _ACADEMIC_CACHE_TTL, since Semantic Scholar's
    free tier is rate-limited and repeat topics are common. Re-raises
    _RateLimited so callers can stop attempting further academic calls for
    the rest of the job instead of retrying a 429 on every remaining angle."""
    key = _normalize_query(query)
    cached = _academic_cache.get(key)
    now = time.time()
    if cached and (now - cached[0]) < _ACADEMIC_CACHE_TTL:
        return cached[1]
    papers = await _fetch_semantic_scholar(query, limit=limit)  # may raise _RateLimited
    if papers:
        _academic_cache[key] = (now, papers)
    return papers


def _papers_to_context(papers: list[dict], label: str) -> str:
    """Format a list of Semantic Scholar papers into the same kind of context
    block the synthesis prompt already expects from web search, so scholarly
    results can be swapped in for a research angle transparently."""
    lines = [f"=== {label} (academic sources) ==="]
    for p in papers:
        title = (p.get("title") or "").strip()
        if not title:
            continue
        year = p.get("year") or "n/a"
        citations = p.get("citationCount") or 0
        authors = p.get("authors") or []
        author_str = authors[0].get("name", "Unknown") if authors else "Unknown"
        if len(authors) > 1:
            author_str += " et al."
        abstract = (p.get("abstract") or "").strip()[:500]
        doi = (p.get("externalIds") or {}).get("DOI", "")
        url = f"https://doi.org/{doi}" if doi else f"https://www.semanticscholar.org/paper/{p.get('paperId', '')}"
        if abstract:
            lines.append(f"- {title} ({author_str}, {year}, {citations} citations): {abstract} (Source: {url})")
    return "\n".join(lines) if len(lines) > 1 else ""


async def _finalize_report(job_id: str, query: str, loop, report_text: str,
                            papers: list[dict], source_material: str) -> str:
    """Shared verification step used by BOTH the Gemini Interactions API
    success path and the fallback agentic pipeline, so every Deep Research
    report gets the same treatment regardless of which path produced it:
    1. Fact-check the draft against `source_material` (one cheap LLM pass).
    2. Append a Sources Matrix — but only for papers whose text actually
       appears in `source_material`, so the matrix never lists a paper as
       "used" when its content wasn't part of what was fact-checked/written.
    """
    if source_material.strip():
        _log(job_id, "🔎 Fact-checking claims and citations against sources…")
        try:
            factcheck_prompt = (
                "You are a rigorous fact-checking editor for an academic research report. "
                "Below is a DRAFT REPORT and the SOURCE MATERIAL it was written from. "
                "Your job: verify that every factual claim and every [n] citation in the draft "
                "is actually supported by something in the source material.\n\n"
                "Rules:\n"
                "- If a claim or citation IS supported, keep it exactly as written.\n"
                "- If a claim or citation is NOT supported by the source material (fabricated, "
                "misattributed, or unverifiable), either remove it or rewrite it as a clearly "
                "hedged statement (e.g. 'reports suggest' instead of a specific unsupported stat).\n"
                "- Do not invent new content. Do not shorten unrelated sections.\n"
                "- Output the full corrected report text only — no commentary, no explanation of changes.\n\n"
                f"SOURCE MATERIAL:\n{source_material[:9000]}\n\n"
                f"DRAFT REPORT:\n{report_text[:9000]}"
            )
            factcheck_resp = await loop.run_in_executor(
                None,
                lambda: _client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=factcheck_prompt,
                )
            )
            verified = (factcheck_resp.text or "").strip()
            # Guard against a degenerate/empty response wiping out a good report
            if verified and len(verified.split()) > 200:
                report_text = verified
                _log(job_id, "✅ Fact-check complete — unsupported claims flagged or removed")
            else:
                _log(job_id, "⚠️ Fact-check pass returned too little text — keeping original draft")
        except Exception as fc_err:
            _log(job_id, f"⚠️ Fact-check pass skipped: {str(fc_err)[:60]}")
    else:
        _log(job_id, "⚠️ No academic/source material collected — skipping fact-check pass")

    if papers:
        material_lower = source_material.lower()
        matrix_papers = [
            p for p in papers
            if (p.get("title") or "").strip()[:40].lower() in material_lower
        ]
        if matrix_papers:
            matrix_papers = matrix_papers[:10]
            report_text = report_text + _format_sources_matrix(matrix_papers)
            _log(job_id, f"📚 Sources Matrix added — {len(matrix_papers)} academic papers")

    return report_text


def _dedupe_papers(papers: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for p in papers:
        pid = p.get("paperId") or p.get("title")
        if not pid or pid in seen:
            continue
        seen.add(pid)
        out.append(p)
    return out


def _sanitize_cell(text: str, max_len: int = 130) -> str:
    """Strip characters that break markdown table cells."""
    text = text.replace("\n", " ").replace("\r", " ").replace("|", "｜")
    text = " ".join(text.split())   # collapse whitespace
    if len(text) > max_len:
        text = text[:max_len].rstrip() + "…"
    return text or "—"


def _format_sources_matrix(papers: list[dict]) -> str:
    """Format Semantic Scholar papers as a markdown Sources Matrix table."""
    valid = [p for p in papers if p.get("title")]
    if not valid:
        return ""
    rows = []
    for p in valid:
        title       = _sanitize_cell(p.get("title") or "Unknown", 70)
        year        = str(p.get("year") or "N/A")
        citations   = p.get("citationCount") or 0
        authors     = p.get("authors") or []
        first_author = _sanitize_cell(
            authors[0].get("name", "Unknown").split()[-1] if authors else "Unknown", 30
        )
        abstract    = (p.get("abstract") or "").strip()
        key_finding = _sanitize_cell(abstract, 130)
        doi         = (p.get("externalIds") or {}).get("DOI", "")
        link        = f"[{title}](https://doi.org/{doi})" if doi else title
        rows.append(f"| {link} | {first_author} et al. | {year} | {citations:,} | {key_finding} |")

    header = "| Paper | Authors | Year | Citations | Key Finding |\n|---|---|---|---|---|"
    return (
        "\n\n---\n\n"
        "## 📚 Sources Matrix — Academic Papers\n\n"
        "*Real papers from Semantic Scholar matched to this research topic. "
        "Sorted by relevance. Use these to ground-check the report.*\n\n"
        + header + "\n" + "\n".join(rows) + "\n"
    )


def _extract_text(interaction) -> str:
    if hasattr(interaction, "outputs") and interaction.outputs:
        parts = []
        for out in interaction.outputs:
            if hasattr(out, "text") and out.text:
                parts.append(out.text)
        if parts:
            return "\n\n".join(parts)
    for attr in ("result", "response", "text"):
        val = getattr(interaction, attr, None)
        if val:
            return str(val)
    return "Research complete — please check your results."


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def cleanup_old_jobs():
    cutoff = time.time() - 3600
    to_del = [
        jid for jid, j in _jobs.items()
        if datetime.fromisoformat(j["created_at"]).timestamp() < cutoff
    ]
    for jid in to_del:
        del _jobs[jid]
