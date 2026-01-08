import aiohttp
import base64
import uuid
import os

HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo"
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

async def generate_image_base64(prompt: str):
    """
    Generates an image using:
    1) Pollinations (primary, free)
    2) Hugging Face SDXL Turbo (fallback)
    Returns Base64 image for frontend rendering
    """

    clean_prompt = prompt.strip().replace(" ", "%20")

    pollinations_url = (
        "https://image.pollinations.ai/prompt/"
        + clean_prompt
        + "?nologo=true&width=1024&height=1024&seed="
        + str(uuid.uuid4())
    )

    async with aiohttp.ClientSession() as session:

        # ===============================
        # 1️⃣ TRY POLLINATIONS (PRIMARY)
        # ===============================
        try:
            async with session.get(pollinations_url, timeout=30) as resp:
                if resp.status == 200:
                    img_bytes = await resp.read()
                    img_b64 = base64.b64encode(img_bytes).decode("utf-8")

                    return {
                        "type": "image_v2",
                        "content": f"data:image/jpeg;base64,{img_b64}",
                        "prompt": prompt,
                        "source": "pollinations"
                    }
        except Exception as e:
            print("Pollinations failed:", str(e))

        # ===============================
        # 2️⃣ FALLBACK – HUGGING FACE
        # ===============================
        if not HF_API_TOKEN:
            return {
                "type": "text",
                "content": "Image system unavailable (HF token missing)."
            }

        headers = {
            "Authorization": f"Bearer {HF_API_TOKEN}",
            "Content-Type": "application/json"
        }

        payload = {
            "inputs": prompt,
            "options": {"wait_for_model": True}
        }

        try:
            async with session.post(
                HF_API_URL,
                headers=headers,
                json=payload,
                timeout=60
            ) as resp:

                if resp.status == 200:
                    img_bytes = await resp.read()
                    img_b64 = base64.b64encode(img_bytes).decode("utf-8")

                    return {
                        "type": "image_v2",
                        "content": f"data:image/png;base64,{img_b64}",
                        "prompt": prompt,
                        "source": "huggingface"
                    }

                else:
                    error_text = await resp.text()
                    print("HF Error:", error_text)

        except Exception as e:
            print("HuggingFace failed:", str(e))

    # ===============================
    # FINAL FAILSAFE
    # ===============================
    return {
        "type": "text",
        "content": "Image generation is currently busy. Please try again."
    }
