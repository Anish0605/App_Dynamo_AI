# video.py — Dynamo AI (RUNWAY VIDEO GENERATION)

import aiohttp
import asyncio
import config


# --------------------------------------------------
# 🎯 PROMPT ENHANCER
# --------------------------------------------------
def enhance_video_prompt(prompt: str):
    return f"{prompt}, {config.VIDEO_PROMPT_STYLE}"


# --------------------------------------------------
# 🎥 VIDEO GENERATOR (RUNWAY)
# --------------------------------------------------
async def generate_video(prompt: str):

    if not config.RUNWAY_API_KEY:
        return {
            "type": "text",
            "content": "Runway API key is missing."
        }

    enhanced_prompt = enhance_video_prompt(prompt)

    async with aiohttp.ClientSession() as session:

        # ===============================
        # 1️⃣ CREATE GENERATION JOB
        # ===============================
        try:
            async with session.post(
                "https://api.runwayml.com/v1/generations",
                headers={
                    "Authorization": f"Bearer {config.RUNWAY_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "prompt": enhanced_prompt,
                    "duration": 5  # seconds (keep cost low)
                }
            ) as resp:

                data = await resp.json()

                if resp.status != 200:
                    return {
                        "type": "text",
                        "content": f"Runway error: {data}"
                    }

                job_id = data.get("id")

                if not job_id:
                    return {
                        "type": "text",
                        "content": "Failed to create video job."
                    }

        except Exception as e:
            return {
                "type": "text",
                "content": f"Video generation failed: {str(e)}"
            }

        # ===============================
        # 2️⃣ POLL FOR RESULT
        # ===============================
        for _ in range(20):  # ~60 seconds max
            await asyncio.sleep(3)

            try:
                async with session.get(
                    f"https://api.runwayml.com/v1/generations/{job_id}",
                    headers={
                        "Authorization": f"Bearer {config.RUNWAY_API_KEY}"
                    }
                ) as status_resp:

                    status_data = await status_resp.json()
                    status = status_data.get("status")

                    if status == "succeeded":
                        video_url = status_data.get("output", [None])[0]

                        return {
                            "type": "video",
                            "url": video_url,
                            "prompt": prompt,
                            "enhanced_prompt": enhanced_prompt,
                            "source": "runway"
                        }

                    elif status == "failed":
                        return {
                            "type": "text",
                            "content": "Video generation failed."
                        }

            except Exception as e:
                print("Polling error:", e)

        # ===============================
        # TIMEOUT
        # ===============================
        return {
            "type": "text",
            "content": "Video generation timed out. Please try again."
        }