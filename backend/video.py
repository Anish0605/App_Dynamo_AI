# video.py — Dynamo AI Video Generation (Runway ML Gen-3)

import httpx
import asyncio
import config

RUNWAY_BASE = "https://api.dev.runwayml.com/v1"
RUNWAY_VERSION = "2024-11-06"


async def generate_video(prompt: str, duration: int = 5) -> dict:
    """
    Generate a short video using Runway Gen-3 Turbo.
    Duration is kept at 5s by default for cost control.
    """
    if not config.RUNWAY_API_KEY:
        return {
            "type": "error",
            "content": "Video generation is not configured. Please add RUNWAY_API_KEY."
        }

    headers = {
        "Authorization": f"Bearer {config.RUNWAY_API_KEY}",
        "Content-Type": "application/json",
        "X-Runway-Version": RUNWAY_VERSION
    }

    async with httpx.AsyncClient(timeout=180) as client:
        # Submit text-to-video task
        try:
            resp = await client.post(
                f"{RUNWAY_BASE}/text_to_video",
                headers=headers,
                json={
                    "promptText": prompt,
                    "duration": duration,   # 5s — cost controlled
                    "model": "gen3"
                }
            )
        except Exception as e:
            return {"type": "error", "content": f"Failed to reach Runway API: {str(e)}"}

        if resp.status_code not in (200, 201):
            return {
                "type": "error",
                "content": f"Runway API error ({resp.status_code}): {resp.text[:300]}"
            }

        task_data = resp.json()
        task_id = task_data.get("id")

        if not task_id:
            return {"type": "error", "content": "No task ID returned from Runway."}

        # Poll for completion — max ~3 minutes (36 * 5s)
        for _ in range(36):
            await asyncio.sleep(5)

            try:
                status_resp = await client.get(
                    f"{RUNWAY_BASE}/tasks/{task_id}",
                    headers=headers
                )
            except Exception:
                continue

            if status_resp.status_code != 200:
                continue

            task = status_resp.json()
            status = task.get("status")

            if status == "SUCCEEDED":
                outputs = task.get("output", [])
                video_url = outputs[0] if outputs else None

                if video_url:
                    return {
                        "type": "video",
                        "url": video_url,
                        "content": f"Here's your generated video for: {prompt}"
                    }
                return {"type": "error", "content": "Video succeeded but no URL returned."}

            elif status in ("FAILED", "CANCELLED"):
                error_msg = task.get("failure", "Unknown error")
                return {"type": "error", "content": f"Video generation failed: {error_msg}"}

        # Timeout
        return {
            "type": "error",
            "content": "⏱ Video generation timed out. Please try again."
        }
