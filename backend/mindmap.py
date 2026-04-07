# mindmap.py — Dynamo AI (Production Grade)

import json
import model


# --------------------------------------------------
# 🎯 PROMPT TEMPLATE
# --------------------------------------------------
def build_mindmap_prompt(user_input: str):

    return f"""
Convert the following topic into a structured mindmap.

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanation
- Format EXACTLY like this:

{{
  "type": "mindmap",
  "root": {{
    "label": "Main Topic",
    "children": [
      {{
        "label": "Branch 1",
        "children": [
          {{ "label": "Subtopic" }}
        ]
      }}
    ]
  }}
}}

Guidelines:
- Keep 3–5 main branches
- Each branch can have 2–4 subtopics
- Keep labels short and clear
- Make it visually balanced

Topic:
{user_input}
"""


# --------------------------------------------------
# 🧠 GENERATE MINDMAP
# --------------------------------------------------
def generate_mindmap(prompt: str):

    system_prompt = build_mindmap_prompt(prompt)

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

        if clean_response.startswith("```"):
            clean_response = clean_response.strip("```")
            clean_response = clean_response.replace("json", "").strip()

        # -------------------------
        # 🔁 PARSE JSON
        # -------------------------
        try:
            data = json.loads(clean_response)
        except Exception:
            return {
                "type": "text",
                "content": "AI returned invalid mindmap format. Try again."
            }

        # -------------------------
        # ✅ VALIDATION
        # -------------------------
        if "root" not in data:
            return {
                "type": "text",
                "content": "Invalid mindmap structure returned."
            }

        return data

    except Exception as e:
        return {
            "type": "text",
            "content": "Failed to generate mindmap.",
            "error": str(e)
        }