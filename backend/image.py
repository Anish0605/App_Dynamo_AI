import aiohttp
import base64
import os
import config

OPENAI_KEY = config.OPENAI_API_KEY
STABILITY_KEY = config.STABILITY_API_KEY


# --------------------------------------------------
# 🎯 PROMPT ENHANCER (VERY IMPORTANT)
# --------------------------------------------------
def enhance_prompt(prompt: str):
    return (
        f"{prompt}, ultra detailed, high quality, "
        "cinematic lighting, 4k, professional, sharp focus"
    )


# --------------------------------------------------
# 🖼 IMAGE GENERATOR
# --------------------------------------------------
async def generate_image_base64(prompt: str):

    enhanced_prompt = enhance_prompt(prompt)

    async with aiohttp.ClientSession() as session:

        # ===============================
        # 1️⃣ OPENAI (PRIMARY)
        # ===============================
        if OPENAI_KEY:
            try:
                for _ in range(2):  # retry logic
                    async with session.post(
                        "https://api.openai.com/v1/images/generations",
                        headers={
                            "Authorization": f"Bearer {OPENAI_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "gpt-image-1",
                            "prompt": enhanced_prompt,
                            "size": "1024x1024"
                        },
                        timeout=20
                    ) as resp:

                        if resp.status == 200:
                            data = await resp.json()
                            img_b64 = data["data"][0]["b64_json"]

                            return {
                                "type": "image_v2",
                                "content": f"data:image/png;base64,{img_b64}",
                                "prompt": prompt,
                                "enhanced_prompt": enhanced_prompt,
                                "source": "openai"
                            }

            except Exception as e:
                print("OpenAI failed:", str(e))

        # ===============================
        # 2️⃣ STABILITY (FALLBACK)
        # ===============================
        if STABILITY_KEY:
            try:
                async with session.post(
                    "https://api.stability.ai/v2beta/stable-image/generate/core",
                    headers={
                        "Authorization": f"Bearer {STABILITY_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "prompt": enhanced_prompt,
                        "output_format": "png"
                    },
                    timeout=25
                ) as resp:

                    if resp.status == 200:
                        img_bytes = await resp.read()
                        img_b64 = base64.b64encode(img_bytes).decode()

                        return {
                            "type": "image_v2",
                            "content": f"data:image/png;base64,{img_b64}",
                            "prompt": prompt,
                            "enhanced_prompt": enhanced_prompt,
                            "source": "stability"
                        }

                    else:
                        error_text = await resp.text()
                        print("Stability error:", error_text)

            except Exception as e:
                print("Stability failed:", str(e))

    # ===============================
    # FINAL FAILSAFE
    # ===============================
    return {
        "type": "text",
        "content": "⚠️ Image generation is temporarily unavailable. Try again."
    }
