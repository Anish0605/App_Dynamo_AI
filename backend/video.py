# video.py — Dynamo AI Video Generation (Runway ML)

import httpx
import asyncio
import config

RUNWAY_BASE = "https://api.dev.runwayml.com/v1"


async def generate_video(prompt: str, duration: int = 5) -> dict:
    """
    Generate a short video using Runway Gen-3a Turbo.
    Duration is capped at 5s for cost control.
    """
    if not config.RUNWAY_API_KEY:
        return {
            "type": "error",
            "content": "Video generation is not configured. RUNWAY_API_KEY missing."
        }

    headers = {
        "Authorization": f"Bearer {config.RUNWAY_API_KEY}",
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
    }

    # Clamp duration to valid Runway values (5 or 10)
    safe_duration = 5 if duration <= 5 else 10

    payload = {
        "model": "gen4.5",
        "promptText": prompt,
        "duration": safe_duration,
        "ratio": "1280:720"
    }

    print(f"🎬 Runway request → model: gen4.5 | duration: {safe_duration}s")
    print(f"🎬 Payload: {payload}")

    async with httpx.AsyncClient(timeout=180) as client:

        # ── Step 1: Submit job ──────────────────────────────────────────────
        try:
            resp = await client.post(
                f"{RUNWAY_BASE}/text_to_video",
                headers=headers,
                json=payload
            )
        except Exception as e:
            return {"type": "error", "content": f"Network error reaching Runway: {str(e)}"}

        print(f"🎬 Runway status code: {resp.status_code}")
        print(f"🎬 Runway response body: {resp.text[:500]}")

        if resp.status_code not in (200, 201):
            return {
                "type": "error",
                "content": f"Runway API error ({resp.status_code}): {resp.text[:400]}"
            }

        task_data = resp.json()
        task_id = task_data.get("id")
        print(f"🎬 Task ID: {task_id}")

        if not task_id:
            return {"type": "error", "content": f"No task ID from Runway. Response: {task_data}"}

        # ── Step 2: Poll for result ─────────────────────────────────────────
        for attempt in range(36):   # max 3 min (36 × 5s)
            await asyncio.sleep(5)

            try:
                poll = await client.get(
                    f"{RUNWAY_BASE}/tasks/{task_id}",
                    headers=headers
                )
            except Exception:
                continue

            if poll.status_code != 200:
                continue

            task = poll.json()
            status = task.get("status")
            print(f"🎬 Poll {attempt+1}: status={status}")

            if status == "SUCCEEDED":
                outputs = task.get("output", [])
                video_url = outputs[0] if outputs else None
                if video_url:
                    print(f"✅ Video URL: {video_url[:80]}...")
                    return {
                        "type": "video",
                        "url": video_url,
                        "content": f"Your video is ready: {prompt[:60]}"
                    }
                return {"type": "error", "content": "Video succeeded but no URL in response."}

            elif status in ("FAILED", "CANCELLED"):
                reason = task.get("failure") or task.get("error") or "Unknown"
                print(f"❌ Runway failed: {reason}")
                return {"type": "error", "content": f"Video generation failed: {reason}"}

        return {
            "type": "error",
            "content": "⏱ Video generation timed out after 3 minutes. Please try again."
        }
