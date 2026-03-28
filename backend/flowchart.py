# flowchart.py — Dynamo AI (Production Grade)

import json
import model


# --------------------------------------------------
# 🎯 FLOWCHART PROMPT TEMPLATE
# --------------------------------------------------
def build_flowchart_prompt(user_input: str):

    return f"""
Convert the following request into a structured flowchart.

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanation
- Format EXACTLY like this:

{{
  "type": "flowchart",
  "nodes": [
    {{ "id": "start", "label": "Start" }},
    {{ "id": "step1", "label": "..." }},
    {{ "id": "end", "label": "End" }}
  ],
  "edges": [
    {{ "from": "start", "to": "step1" }},
    {{ "from": "step1", "to": "end" }}
  ]
}}

Guidelines:
- Keep 4–8 steps max
- Use simple labels
- Always include Start and End
- Maintain logical order

User Request:
{user_input}
"""


# --------------------------------------------------
# 🧠 GENERATE FLOWCHART
# --------------------------------------------------
def generate_flowchart(prompt: str):

    system_prompt = build_flowchart_prompt(prompt)

    try:
        response = model.get_ai_response(
            prompt=system_prompt,
            history=[],
            model_name="gemini-2.0-flash"
        )

        # -------------------------
        # 🧹 CLEAN RESPONSE
        # -------------------------
        clean_response = response.strip()

        # Remove markdown if exists
        if clean_response.startswith("```"):
            clean_response = clean_response.strip("```")
            clean_response = clean_response.replace("json", "").strip()

        # -------------------------
        # 🔁 TRY PARSE JSON
        # -------------------------
        try:
            data = json.loads(clean_response)
        except Exception:
            return {
                "type": "text",
                "content": "AI returned invalid format. Please try again."
            }

        # -------------------------
        # ✅ VALIDATION
        # -------------------------
        if "nodes" not in data or "edges" not in data:
            return {
                "type": "text",
                "content": "Invalid flowchart structure returned."
            }

        return data

    except Exception as e:
        return {
            "type": "text",
            "content": "Failed to generate flowchart.",
            "error": str(e)
        }