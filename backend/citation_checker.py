import re
import json
import asyncio
import httpx
from typing import Optional


async def _run_gemini(text: str, bibliography: str, fmt: str, gemini_client) -> dict:
    prompt = f"""You are a professional academic citation checker. Analyse the text and bibliography below for citation errors according to {fmt} style.

TEXT WITH IN-TEXT CITATIONS:
{text[:8000]}

BIBLIOGRAPHY / REFERENCES:
{bibliography[:4000]}

Check for ALL of the following:
IN-TEXT CITATION ISSUES (category: "in_text"):
1. Missing bibliography entries (in-text citation has no matching entry in bibliography)
2. Year mismatches between in-text citation and bibliography
3. {fmt}-specific in-text format violations (wrong bracket style, et al. threshold, author ordering, missing year, punctuation)
4. Unused bibliography entries (listed but never cited in text)

REFERENCE LIST ISSUES (category: "reference"):
5. Missing DOIs or URLs for journal articles
6. Author name formatting errors (wrong order, wrong abbreviation, truncation)
7. {fmt}-specific reference format violations (wrong field order, missing volume/page/publisher, incorrect italics, capitalization)
8. Year or title errors in bibliography entries

IMPORTANT: Each issue MUST have a "category" field: use "in_text" for issues found in the body text, and "reference" for issues in the bibliography/reference list.

Return ONLY a JSON object with this exact structure — no markdown fences, no explanation:
{{
  "issues": [
    {{
      "id": 1,
      "type": "error",
      "category": "in_text",
      "title": "Short title max 8 words",
      "detail": "Full clear explanation of the specific problem",
      "fix": "Exact corrected text or instruction",
      "location": "e.g. In-text paragraph 1 or Bibliography entry 3"
    }}
  ],
  "sources": [
    {{
      "ref": "Short citation label e.g. Smith et al. 2021 or [1]",
      "doi": "doi string only or empty string if none",
      "journal": "Journal name or publisher",
      "status": "verified"
    }}
  ],
  "corrected_entries": [
    {{
      "label": "[1]",
      "original": "The original bibliography entry exactly as given",
      "corrected": "The fully corrected bibliography entry in proper {fmt} format with ALL issues fixed",
      "changes": ["One short phrase per fix applied, e.g. 'Reordered author name to A. Vaswani'"]
    }}
  ],
  "summary": "One sentence overall quality assessment"
}}

Rules:
- type: "error" for critical problems, "warning" for format issues, "info" for suggestions
- category: REQUIRED on every issue — "in_text" or "reference"
- sources status: start all as "verified" — the system will downgrade based on live DOI checks
- corrected_entries: MUST include every bibliography entry, one object each. Apply ALL fixes from the issues list to produce the corrected field. If an entry needs no changes, set corrected equal to original and changes to [].
- If bibliography is empty, return empty corrected_entries []"""

    for model in ("gemini-3.5-flash", "gemini-3.1-flash-lite-preview"):
        try:
            resp = gemini_client.models.generate_content(
                model=model,
                contents=prompt
            )
            raw = resp.text.strip()
            raw = re.sub(r'^```[a-z]*\n?', '', raw)
            raw = re.sub(r'\n?```$', '', raw)
            return json.loads(raw)
        except Exception as e:
            last_err = e
            continue
    e = last_err
    return {
            "issues": [{
                "id": 1, "type": "error",
                "category": "reference",
                "title": "Analysis error",
                "detail": f"Dynamo AI could not analyse citations: {e}",
                "fix": "Please try again or check your input",
                "location": "—"
            }],
            "sources": [],
            "corrected_entries": [],
            "summary": "Analysis failed — please retry"
        }


async def _verify_doi(doi: str) -> str:
    if not doi:
        return "missing"
    clean = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    if not clean:
        return "missing"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(
                f"https://api.crossref.org/works/{clean}",
                headers={"User-Agent": "DynamoAI/1.0 (mailto:support@dynamo.ai)"}
            )
            return "verified" if r.status_code == 200 else "warning"
    except Exception:
        return "warning"


async def _get_corrected_entries(bibliography: str, issues: list, fmt: str, gemini_client) -> list:
    """Dedicated second call — ask Gemini to produce corrected bibliography entries."""
    if not bibliography.strip():
        return []
    issues_summary = "\n".join(
        f"- [{x.get('location','')}] {x.get('title','')}: {x.get('fix','')}"
        for x in issues
    )
    prompt = f"""You are correcting a bibliography to {fmt} format.

ORIGINAL BIBLIOGRAPHY:
{bibliography[:4000]}

ISSUES TO FIX:
{issues_summary}

Return ONLY a JSON array — no markdown, no explanation:
[
  {{
    "label": "[1]",
    "original": "original entry text exactly",
    "corrected": "fully corrected entry in {fmt} format with ALL issues fixed",
    "changes": ["one short phrase per change made"]
  }}
]

Include every entry. If an entry needs no changes set corrected=original and changes=[]."""

    for model in ("gemini-3.5-flash", "gemini-3.1-flash-lite-preview"):
        try:
            resp = gemini_client.models.generate_content(model=model, contents=prompt)
            raw = resp.text.strip()
            raw = re.sub(r'^```[a-z]*\n?', '', raw)
            raw = re.sub(r'\n?```$', '', raw)
            data = json.loads(raw)
            for e in data:
                if isinstance(e.get("changes"), str):
                    e["changes"] = [e["changes"]] if e["changes"] else []
            return data
        except Exception:
            continue
    return []


async def check_citations(text: str, bibliography: str, fmt: str, gemini_client) -> dict:
    result = await _run_gemini(text, bibliography, fmt, gemini_client)
    issues = result.get("issues", [])
    sources = result.get("sources", [])

    # Ensure every issue has a category (fallback for older Gemini responses)
    for issue in issues:
        if "category" not in issue:
            loc = (issue.get("location") or "").lower()
            issue["category"] = "in_text" if "in-text" in loc or "paragraph" in loc else "reference"

    # Run DOI verification + corrected entries generation concurrently
    doi_checks = [(i, src) for i, src in enumerate(sources) if src.get("doi")]
    tasks = []
    if doi_checks:
        tasks = [_verify_doi(src["doi"]) for _, src in doi_checks]
    corrected_task = asyncio.create_task(_get_corrected_entries(bibliography, issues, fmt, gemini_client))

    if doi_checks:
        statuses = await asyncio.gather(*tasks)
        for (i, src), status in zip(doi_checks, statuses):
            sources[i]["status"] = status
            if status == "warning":
                # Inject unverified DOI as a reference issue so it shows in the grouped issues panel
                issues.append({
                    "id": 9000 + i,
                    "type": "warning",
                    "category": "reference",
                    "title": f"DOI unverified — {src.get('ref', '')}",
                    "detail": f"The DOI for '{src.get('ref', '')}' could not be confirmed via Crossref. It may be incorrect or not yet indexed.",
                    "fix": f"Check the DOI manually: https://doi.org/{src.get('doi', '')}",
                    "location": f"Bibliography — {src.get('ref', '')}"
                })
            elif status == "missing":
                issues.append({
                    "id": 9000 + i,
                    "type": "warning",
                    "category": "reference",
                    "title": f"No DOI found — {src.get('ref', '')}",
                    "detail": f"'{src.get('ref', '')}' has no DOI. Journal articles should include a DOI in {fmt} format.",
                    "fix": "Add a DOI or URL. If unavailable, add 'No DOI' note per your institution's guidelines.",
                    "location": f"Bibliography — {src.get('ref', '')}"
                })

    corrected_entries = await corrected_task

    errors = sum(1 for x in issues if x.get("type") == "error")
    warnings = sum(1 for x in issues if x.get("type") == "warning")
    score = max(0, min(100, 100 - errors * 20 - warnings * 7))

    return {
        "score": score,
        "issues": issues,
        "sources": sources,
        "corrected_entries": corrected_entries,
        "summary": result.get("summary", "")
    }
