import aiohttp
import base64
import uuid
import os
import config

async def generate_image_base64(prompt: str):
    """
    Generates an image using:
    1) OpenAI GPT-4 Vision (Image Model 1.5) - PRIMARY
    2) Stability AI (SDXL) - FALLBACK
    Returns Base64 image for frontend rendering
    """

    async with aiohttp.ClientSession() as session:

        # ===============================
        # 1️⃣ TRY OPENAI DALL-E 3 (PRIMARY)
        # ===============================
        if config.OPENAI_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {config.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }

                payload = {
                    "model": "dall-e-3",
                    "prompt": prompt,
                    "n": 1,
                    "size": "1024x1024",
                    "quality": "standard",
                    "response_format": "b64_json"
                }

                async with session.post(
                    "https://api.openai.com/v1/images/generations",
                    headers=headers,
                    json=payload,
                    timeout=60
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        
                        img_b64 = data.get("data", [{}])[0].get("b64_json")
                        if img_b64:
                            return {
                                "type": "image_v2",
                                "content": f"data:image/png;base64,{img_b64}",
                                "prompt": prompt,
                                "source": "openai"
                            }
            except Exception as e:
                print("OpenAI image generation failed:", str(e))

        # ===============================
        # 2️⃣ FALLBACK – STABILITY AI (SDXL)
        # ===============================
        if config.STABILITY_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {config.STABILITY_API_KEY}",
                    "Accept": "image/png"
                }

                payload = {
                    "text_prompts": [{"text": prompt}],
                    "cfg_scale": 7,
                    "height": 1024,
                    "width": 1024,
                    "samples": 1,
                    "steps": 30
                }

                async with session.post(
                    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
                    headers=headers,
                    json=payload,
                    timeout=60
                ) as resp:

                    if resp.status == 200:
                        data = await resp.json()
                        
                        if data.get("artifacts"):
                            img_b64 = data["artifacts"][0].get("base64")
                            if img_b64:
                                return {
                                    "type": "image_v2",
                                    "content": f"data:image/png;base64,{img_b64}",
                                    "prompt": prompt,
                                    "source": "stability_ai"
                                }
                    else:
                        error_text = await resp.text()
                        print("Stability AI Error:", error_text)

            except Exception as e:
                print("Stability AI failed:", str(e))

    # ===============================
    # FINAL FAILSAFE
    # ===============================
    return {
        "type": "text",
        "content": "Image generation is currently unavailable. Please try again later."
    }
