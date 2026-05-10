# deep_research.py — Dynamo AI Deep Research Agent
# Uses Google Gemini Interactions API (deep-research-preview-04-2026)
# Falls back to enhanced Gemini + Tavily if Interactions API unavailable

import asyncio
import uuid
import time
from datetime import datetime
from google import genai
import config

_client = genai.Client(api_key=config.GEMINI_KEY) if config.GEMINI_KEY else None

# In-memory job store  (keyed by job_id)
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
        "fallback":     False,
    }

    asyncio.create_task(_run_research(job_id, query, model))
    return job_id


async def _run_research(job_id: str, query: str, model: str):
    job        = _jobs[job_id]
    start_time = time.time()
    loop       = asyncio.get_event_loop()

    def _elapsed():
        return int(time.time() - start_time)

    # ── Attempt 1: Gemini Interactions API ──────────────────────────────────
    try:
        job["status"]       = "planning"
        job["progress_msg"] = "Building research plan…"

        def _create():
            return _client.interactions.create(
                model=model,
                input=query,
                background=True,
            )

        interaction = await loop.run_in_executor(None, _create)
        op_name     = interaction.name

        job["status"]       = "researching"
        job["progress_msg"] = "Searching the web and academic databases…"

        while True:
            e = _elapsed()
            job["elapsed"] = e
            if   e < 30:  job["progress_msg"] = "Scanning sources…"
            elif e < 90:  job["progress_msg"] = f"Analysing papers & data ({e}s)…"
            elif e < 180: job["progress_msg"] = f"Synthesising findings ({e}s)…"
            else:         job["progress_msg"] = f"Writing final report ({e}s)…"

            def _poll(name=op_name):
                return _client.interactions.get(name=name)

            interaction = await loop.run_in_executor(None, _poll)
            if interaction.done:
                break
            await asyncio.sleep(5)

        # Extract report text
        report_text = _extract_text(interaction)

        job.update({"status": "complete", "report": report_text,
                    "elapsed": _elapsed(), "progress_msg": "Research complete"})
        return

    except Exception as e:
        print(f"[DeepResearch] Interactions API failed for {job_id}: {e}")

    # ── Fallback: Enhanced Gemini + Tavily web search ────────────────────────
    try:
        job["status"]       = "researching"
        job["progress_msg"] = "Running enhanced research (web + AI synthesis)…"
        job["fallback"]     = True

        import search as search_mod

        web_ctx = await loop.run_in_executor(
            None, lambda: search_mod.get_web_context(query, deep_dive=True)
        )

        fallback_prompt = (
            "You are a world-class academic research agent. Write a comprehensive, well-structured "
            "research report. Include: Executive Summary, Introduction, Key Findings with numbered "
            "citations [1][2][3], Current State of the Field, Research Gaps, Future Directions, "
            "and a References section.\n\n"
            f"TOPIC: {query}\n\n"
            f"WEB RESEARCH CONTEXT:\n{web_ctx}\n\n"
            "Write the complete report now in detailed academic markdown. Be thorough and precise."
        )

        resp = await loop.run_in_executor(
            None,
            lambda: _client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=fallback_prompt
            )
        )

        job.update({
            "status":       "complete",
            "report":       resp.text,
            "elapsed":      _elapsed(),
            "progress_msg": "Research complete (enhanced mode)",
        })

    except Exception as e2:
        job.update({"status": "error", "error": str(e2),
                    "progress_msg": f"Research failed: {str(e2)[:120]}"})


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
