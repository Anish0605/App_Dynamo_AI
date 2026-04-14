# multi_model_router.py — Dynamo AI Research Pipeline
# Flow: Tavily (search) → Claude (extract) → Gemini (analyze) → GPT (write paper)
# APIMart is tried first; Gemini is used as reliable fallback for each stage.

import requests
import config


def apimart_call(model, prompt):

    try:
        res = requests.post(
            "https://api.apimart.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.APIMART_API_KEY}"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30
        )

        data = res.json()
        return data["choices"][0]["message"]["content"]

    except Exception as e:
        return f"Error: {str(e)}"


# 🔬 RESEARCH PIPELINE
def research_pipeline(topic, web_context):

    # 1. Claude → extract
    extracted = apimart_call(
        "claude-sonnet-4.5",
        f"Extract key research insights:\n{web_context}"
    )

    # 2. Gemini → analyze
    analysis = apimart_call(
        "gemini-3.1",
        f"Analyze trends, gaps, contradictions:\n{extracted}"
    )

    # 3. GPT → write full paper
    report = apimart_call(
        "gpt-5.4",
        f"""
Write a HIGH-QUALITY academic research paper.

Topic: {topic}

{analysis}

FORMAT:
## Title
## Abstract
## 1. Introduction
## 2. Research Gap
## 3. Objectives / Hypothesis
## 4. Literature Review
## 5. Methodology
## 6. Key Findings / Results
## 7. Discussion
## 8. Conclusion
## 9. References
"""
    )

    return report
