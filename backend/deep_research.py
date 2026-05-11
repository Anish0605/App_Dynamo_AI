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


async def start_research(query: str, user_id: str, use_max: bool = False) -> str:
    job_id = str(uuid.uuid4())[:8]
    model  = MAX_MODEL if use_max else DEEP_MODEL

    _jobs[job_id] = {
        "status":       "starting",
        "query":        query,
        "user_id":      user_id,
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
                model=model,
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
                model="gemini-3-flash-preview",
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

        _log(job_id, f"📋 Research plan ready — {len(queries)} search angles identified")

        # ── Step 2: Execute all searches ─────────────────────────────────────
        job["status"] = "researching"
        all_contexts = []
        angle_labels = ["Overview", "Current data", "Key players",
                        "Challenges", "Recent developments", "Future outlook"]

        for i, q in enumerate(queries[:6]):
            label = angle_labels[i] if i < len(angle_labels) else f"Angle {i+1}"
            _log(job_id, f"🔍 Searching: {label} — \"{q[:60]}...\"")
            try:
                ctx = await loop.run_in_executor(
                    None, lambda q=q: search_mod.get_web_context(q, deep_dive=True)
                )
                if ctx and len(ctx.strip()) > 100:
                    all_contexts.append(f"=== {label} ===\n{ctx}")
            except Exception as se:
                _log(job_id, f"⚠️ Search failed for angle {i+1}: {str(se)[:60]}")
            await asyncio.sleep(0.5)

        _log(job_id, f"📄 Collected {len(all_contexts)} research sources")

        # ── Step 3: Extract key insights per source ───────────────────────────
        _log(job_id, "🧬 Extracting key insights and evidence from each source…")
        combined_context = "\n\n".join(all_contexts)

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
                model="gemini-3-flash-preview",
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
                model="gemini-3-flash-preview",
                contents=gaps_prompt,
            )
        )
        gaps = gaps_resp.text

        _log(job_id, "🔭 Research gaps identified")

        # ── Step 5: Synthesise full report ─────────────────────────────────────
        _log(job_id, "⚗️ Synthesising all findings into comprehensive report…")

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
            f"FULL RESEARCH CONTEXT:\n{combined_context[:6000]}\n\n"
            "Write the complete, detailed, professional report now. Be thorough, use citations "
            "in [n] format throughout, and ensure every claim is supported. Minimum 1500 words."
        )

        _log(job_id, "✍️ Writing final report (this takes 1-2 minutes)…")

        report_resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=synthesis_prompt,
            )
        )

        final_report = report_resp.text
        elapsed = _elapsed()

        _log(job_id, f"✅ Report complete — {len(final_report.split())} words in {elapsed}s")

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
