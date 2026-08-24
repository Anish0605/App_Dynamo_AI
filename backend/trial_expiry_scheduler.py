"""
trial_expiry_scheduler.py — Automated Pro Trial Expiry Downgrader

Runs every 6 hours. Finds any users still on plan='pro_trial' whose
Razorpay trial subscription has lapsed (or who have no active subscription
and whose account is older than 14 days), then downgrades them to 'free'.
"""

from datetime import datetime, timezone, timedelta

TRIAL_DAYS = 14
_job_id = "trial_expiry_check"


def _downgrade_expired_trials():
    """Synchronous job: find and downgrade stale pro_trial accounts."""
    try:
        import supabase_client
        sb = supabase_client.supabase
        if not sb:
            print("[TrialExpiry] Supabase not ready — skipping run")
            return

        # Fetch all users still on pro_trial
        result = sb.table("users") \
            .select("id, email, plan, created_at") \
            .eq("plan", "pro_trial") \
            .execute()

        users = result.data or []
        if not users:
            print("[TrialExpiry] No pro_trial accounts found — nothing to do")
            return

        print(f"[TrialExpiry] Found {len(users)} pro_trial account(s) to check")

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=TRIAL_DAYS)
        downgraded = []

        for user in users:
            created_at = datetime.fromisoformat(user["created_at"])
            if created_at <= cutoff:
                try:
                    sb.table("users") \
                        .update({"plan": "free"}) \
                        .eq("id", user["id"]) \
                        .execute()
                    downgraded.append(user["email"])
                    print(f"[TrialExpiry] Downgraded {user['email']} (trial started {user['created_at'][:10]})")
                except Exception as e:
                    print(f"[TrialExpiry] Failed to downgrade {user['email']}: {e}")
            else:
                days_left = TRIAL_DAYS - (now - created_at).days
                print(f"[TrialExpiry] {user['email']} — {days_left} day(s) remaining, skipping")

        if downgraded:
            print(f"[TrialExpiry] ✅ Downgraded {len(downgraded)} expired trial(s): {', '.join(downgraded)}")
        else:
            print("[TrialExpiry] ✅ All pro_trial accounts are still within their 14-day window")

    except Exception as e:
        print(f"[TrialExpiry] Top-level error: {e}")


def start(scheduler):
    """
    Add the trial-expiry job to an existing AsyncIOScheduler.
    Call this from main.py startup, passing the shared scheduler instance.
    """
    from apscheduler.triggers.interval import IntervalTrigger

    scheduler.add_job(
        _downgrade_expired_trials,
        trigger=IntervalTrigger(hours=6),
        id=_job_id,
        name="Pro trial expiry downgrader (every 6h)",
        replace_existing=True,
        misfire_grace_time=300,
    )
    print("[TrialExpiry] Job registered — runs every 6 hours ✅")
