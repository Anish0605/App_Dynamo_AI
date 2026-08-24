import re
import json
import asyncio
import httpx
from typing import Optional


def _safe_truncate(text: str, max_chars: int) -> str:
    """Truncate at a newline boundary so we don't cut a reference entry in half."""
    if len(text) <= max_chars:
        return text
    cut = text.rfind("\n", 0, max_chars)
    return text[:cut] if cut > max_chars // 2 else text[:max_chars]


# Styles that use numbered references (not author-date)
_NUMBERED_STYLES = {"ieee", "vancouver", "acs", "springer"}


async def _run_gemini(text: str, bibliography: str, fmt: str, gemini_client) -> dict:
    is_numbered = fmt.lower().replace(" ", "").replace(".", "") in _NUMBERED_STYLES
    intext_style_note = (
        "This is a NUMBERED citation style. In-text citations must be numbers in the correct bracket/superscript format "
        f"for {fmt} — do NOT flag missing author-date pairs as errors."
        if is_numbered else
        "This is an AUTHOR-DATE citation style. In-text citations must follow (Author, Year) or (Author Year) "
        f"conventions specific to {fmt}."
    )

    # ASA-specific note: no comma between author and year
    asa_note = (
        "\nASA SPECIFIC: In-text format is (Author Year) — NO comma between author and year. "
        "Flag any citation using (Author, Year) with a comma as an error."
        if fmt.upper() == "ASA" else ""
    )

    safe_text = _safe_truncate(text, 8000)
    safe_bib = _safe_truncate(bibliography, 5000)

    prompt = f"""You are a professional academic citation checker. Analyse the text and bibliography below for citation errors according to {fmt} style.

TEXT WITH IN-TEXT CITATIONS:
{safe_text}

BIBLIOGRAPHY / REFERENCES:
{safe_bib}

STYLE CONTEXT: {intext_style_note}{asa_note}

Check for ALL of the following:

IN-TEXT CITATION ISSUES (category: "in_text"):
1. Missing bibliography entries — in-text citation has no matching entry in bibliography [SEVERITY: error]
2. Year mismatches between in-text citation and bibliography entry [SEVERITY: error]
3. {fmt}-specific in-text format violations — wrong bracket/punctuation style, wrong et al. threshold, wrong author ordering [SEVERITY: error]
4. Unused bibliography entries — listed in references but never cited in the text [SEVERITY: warning — not an error, just a flag]

REFERENCE LIST ISSUES (category: "reference"):
5. Missing DOIs or URLs for journal articles where they are required by {fmt} [SEVERITY: warning]
6. Author name formatting errors — wrong order, wrong abbreviation, incorrect truncation [SEVERITY: error]
7. {fmt}-specific reference format violations — wrong field order, missing required fields (volume/page/publisher), incorrect capitalization, inconsistent spacing [SEVERITY: warning]
8. Year or title errors in bibliography entries [SEVERITY: error]

SEVERITY RULES (follow exactly):
- "error" = factually wrong, breaks citation integrity (missing match, year mismatch, wrong author name, wrong in-text style)
- "warning" = format/style deviation that should be fixed but does not break the citation (unused entries, missing DOI, spacing/capitalization issues)
- "info" = optional improvement suggestion only
- Do NOT flag "unused bibliography entries" as errors — they are always warnings.
- Do NOT flag "missing DOI" as an error unless {fmt} strictly requires DOIs for all sources.

PLAIN TEXT RULE: If the bibliography does NOT contain markdown markers (*Journal*, **text**) or HTML tags (<i>, <em>), do NOT flag missing italics — the user is working in plain text. Only flag italicization if wrong markers are already present.

IMPORTANT: Each issue MUST have a "category" field: "in_text" for body text issues, "reference" for bibliography issues.

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
- type: strictly follow SEVERITY RULES above
- category: REQUIRED on every issue — "in_text" or "reference"
- sources status: start all as "verified" — the system will downgrade based on live DOI checks
- corrected_entries: MUST include every bibliography entry, one object each. Apply ALL fixes from the issues list. If an entry needs no changes, set corrected equal to original and changes to [].
- If bibliography is empty, return empty corrected_entries []
- summary: Be accurate — mention main problems if any exist. If none, say "All citations are correct." Do NOT claim perfection when errors are present."""

    for model in ("gemini-3.6-flash", "gemini-3.5-flash-lite"):
        try:
            from google.genai import types as _gtypes
            resp = gemini_client.models.generate_content(
                model=model,
                contents=prompt,
                config=_gtypes.GenerateContentConfig(temperature=0)
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
    # Filter out italic-only issues for plain text bibliography
    _ITALIC_RE = re.compile(r'italic', re.IGNORECASE)
    plain_text = not bool(re.search(r'(<[iI]>|<em>|</[iI]>|</em>|\*\*|\*)', bibliography))
    relevant_issues = []
    for x in issues:
        title = x.get('title', '')
        if plain_text and _ITALIC_RE.search(title):
            continue
        relevant_issues.append(x)

    issues_summary = "\n".join(
        f"- [{x.get('location','')}] {x.get('title','')}: {x.get('fix','')}"
        for x in relevant_issues
    ) if relevant_issues else "No issues to fix — entries are correct."
    prompt = f"""You are correcting a bibliography to {fmt} format.

ORIGINAL BIBLIOGRAPHY:
{_safe_truncate(bibliography, 5000)}

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

    for model in ("gemini-3.6-flash", "gemini-3.5-flash-lite"):
        try:
            from google.genai import types as _gtypes
            resp = gemini_client.models.generate_content(
                model=model, contents=prompt,
                config=_gtypes.GenerateContentConfig(temperature=0)
            )
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
                doi_val = src.get("doi", "")
                issues.append({
                    "id": 9000 + i,
                    "type": "error",
                    "category": "reference",
                    "title": f"DOI not found — {src.get('ref', '')}",
                    "detail": f"The DOI '{doi_val}' returned no result from doi.org. This usually means the DOI is incorrect or was copied with a typo. A broken DOI is a critical reference error.",
                    "fix": f"Search for this paper by title on Google Scholar or the publisher's website to find the correct DOI. Then update your reference to use the correct DOI.",
                    "location": f"Bibliography — {src.get('ref', '')}"
                })
            elif status == "missing":
                issues.append({
                    "id": 9000 + i,
                    "type": "warning",
                    "category": "reference",
                    "title": f"No DOI — {src.get('ref', '')}",
                    "detail": f"No DOI was found for '{src.get('ref', '')}'. Journal articles should include a DOI in {fmt} format.",
                    "fix": "Search for this paper on Google Scholar or Crossref (search.crossref.org) to find and add the correct DOI.",
                    "location": f"Bibliography — {src.get('ref', '')}"
                })

    corrected_entries = await corrected_task

    errors = sum(1 for x in issues if x.get("type") == "error")
    warnings = sum(1 for x in issues if x.get("type") == "warning")
    # Gradual deduction: -12 per error, -4 per warning, minimum 5 if any issue exists
    if errors == 0 and warnings == 0:
        score = 100
    else:
        raw = 100 - errors * 12 - warnings * 4
        score = max(5, min(99, raw))

    # Generate accurate summary programmatically — don't trust Gemini's
    in_text_errors = sum(1 for x in issues if x.get("type") == "error" and x.get("category") == "in_text")
    ref_errors = sum(1 for x in issues if x.get("type") == "error" and x.get("category") == "reference")
    in_text_warns = sum(1 for x in issues if x.get("type") == "warning" and x.get("category") == "in_text")
    ref_warns = sum(1 for x in issues if x.get("type") == "warning" and x.get("category") == "reference")

    if errors == 0 and warnings == 0:
        summary = "All citations are correct. No issues found in in-text citations or bibliography."
    else:
        parts = []
        if in_text_errors: parts.append(f"{in_text_errors} in-text citation error(s)")
        if ref_errors: parts.append(f"{ref_errors} reference list error(s)")
        if in_text_warns: parts.append(f"{in_text_warns} in-text citation warning(s)")
        if ref_warns: parts.append(f"{ref_warns} reference list warning(s)")
        summary = f"Found {' and '.join(parts)}. Total score: {score}/100."

    return {
        "score": score,
        "issues": issues,
        "sources": sources,
        "corrected_entries": corrected_entries,
        "summary": summary
    }
