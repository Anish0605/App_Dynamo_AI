# deck_engine.py — Smart Research Deck Planner
# Generates a structured slide outline (JSON) using AI, then renders to PPTX
# DO NOT import multi_model_router — standalone module

import json
import re
from google import genai
import config

_client = genai.Client(api_key=config.GEMINI_KEY) if config.GEMINI_KEY else None

# --------------------------------------------------
# CONSTANTS
# --------------------------------------------------

LENGTH_MAP = {
    "short":    6,
    "standard": 10,
    "deep":     15,
}

STYLE_TONE = {
    "academic": "formal academic, citation-aware, evidence-driven, scholarly",
    "business": "professional executive, data-driven, concise, action-oriented",
    "pitch":    "startup pitch, story-led, punchy, visionary",
    "minimal":  "clean, text-first, understated, precise",
}

SLIDE_TYPES = [
    "title", "thesis", "background",
    "evidence", "chart", "comparison",
    "quote", "conclusion"
]

# --------------------------------------------------
# PLAN DECK — AI generates outline JSON
# --------------------------------------------------

async def plan_deck(
    topic: str,
    style: str = "academic",
    length: str = "standard",
    audience: str = "Research peers",
    source_text: str = ""
) -> dict:
    """
    Calls Gemini to produce a structured deck outline as JSON.
    Returns the parsed dict directly — no rendering yet.
    """
    n_slides = LENGTH_MAP.get(length, 10)
    tone     = STYLE_TONE.get(style, STYLE_TONE["academic"])

    source_block = ""
    if source_text.strip():
        source_block = f"\n\nSOURCE MATERIAL (from uploaded paper / notes):\n{source_text[:4000]}"

    prompt = f"""You are a senior academic presentation designer.

Generate a structured slide deck outline for the following research topic.

TOPIC: {topic}
AUDIENCE: {audience}
TONE: {tone}
NUMBER OF SLIDES: {n_slides}
{source_block}

Return ONLY valid JSON — no markdown fences, no explanation, no trailing text.

JSON SCHEMA:
{{
  "title": "Full presentation title",
  "slides": [
    {{
      "type": "title",
      "heading": "Full presentation title",
      "subheading": "Subtitle or author / institution"
    }},
    {{
      "type": "thesis",
      "heading": "Research Question",
      "thesis": "One-sentence central claim or research question"
    }},
    {{
      "type": "background",
      "heading": "Background heading",
      "bullets": ["Point 1", "Point 2", "Point 3"]
    }},
    {{
      "type": "evidence",
      "heading": "Evidence slide heading",
      "bullets": ["Finding 1", "Finding 2", "Finding 3"],
      "citation": "Author et al. (Year). Journal, vol(issue), pages."
    }},
    {{
      "type": "chart",
      "heading": "Chart heading",
      "chart": {{
        "kind": "bar",
        "labels": ["Label A", "Label B", "Label C", "Label D"],
        "values": [42, 67, 55, 80]
      }}
    }},
    {{
      "type": "comparison",
      "heading": "Comparison heading",
      "left":  {{ "label": "Option A", "points": ["Point 1", "Point 2", "Point 3"] }},
      "right": {{ "label": "Option B", "points": ["Point 1", "Point 2", "Point 3"] }}
    }},
    {{
      "type": "quote",
      "heading": "Expert Perspective",
      "quote": "A meaningful expert quote relevant to the topic.",
      "citation": "Name, Source (Year)"
    }},
    {{
      "type": "conclusion",
      "heading": "Implications & Next Steps",
      "bullets": ["Implication 1", "Implication 2", "Next step 1"]
    }}
  ]
}}

RULES:
- First slide MUST be type "title"
- Last slide MUST be type "conclusion"
- Total slides must be exactly {n_slides}
- Choose slide types that best fit the topic — not all types are required
- Each bullet point must be a complete, meaningful sentence
- For "evidence" slides: always include a plausible citation in the correct format
- For "chart" slides: generate realistic numbers that support the narrative
- For "comparison" slides: make both sides genuinely balanced
- Academic tone: use precise, formal language without jargon overload
"""

    resp = _client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    raw = resp.text.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()

    try:
        outline = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: minimal outline
        outline = _fallback_outline(topic, n_slides)

    outline["style"]    = style
    outline["length"]   = length
    outline["audience"] = audience
    return outline


def _fallback_outline(topic: str, n: int) -> dict:
    slides = [
        {"type": "title",      "heading": topic, "subheading": "Research Overview"},
        {"type": "background", "heading": "Background", "bullets": ["Context point 1", "Context point 2", "Context point 3"]},
        {"type": "evidence",   "heading": "Key Findings", "bullets": ["Finding 1", "Finding 2", "Finding 3"], "citation": ""},
        {"type": "conclusion", "heading": "Conclusions", "bullets": ["Conclusion 1", "Conclusion 2", "Next steps"]},
    ]
    return {"title": topic, "slides": slides[:n]}
