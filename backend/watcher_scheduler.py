"""
watcher_scheduler.py — Automated Research Watcher scheduler.

Runs every hour. For each active watch, checks if it is "due" based on
its frequency (daily = 24h gap, weekly = 7-day gap). If due, fires the
Tavily → Gemini → Brevo pipeline and records last_checked_at.
"""

_scheduler = None


def _run_due_watches():
    """Synchronous job called by APScheduler every hour."""
    try:
        import supabase_client
        import watches as watches_module
        import watcher_check

        sb = supabase_client.supabase
        if not sb:
            print("[Watcher] Supabase not ready — skipping run")
            return

        all_watches = watches_module.get_all_active_watches(sb)
        due = [w for w in all_watches if watches_module.is_due(w)]
        print(f"[Watcher] Hourly run: {len(all_watches)} active, {len(due)} due")

        for watch in due:
            try:
                user_row = sb.table("users") \
                    .select("email,full_name") \
                    .eq("id", watch["user_id"]) \
                    .single() \
                    .execute()

                email = user_row.data.get("email", "") if user_row.data else ""
                name  = user_row.data.get("full_name", "") if user_row.data else ""

                print(f"[Watcher] Checking: '{watch['topic']}' ({watch['frequency']}) → {email}")
                result = watcher_check.check_topic(watch["topic"], email, name)

                # Stamp last_checked_at regardless of result
                watches_module.mark_checked(sb, watch["id"])

                status = "EMAIL SENT" if result.get("notified") else (
                    "noteworthy / no email" if result.get("noteworthy") else "nothing new"
                )
                print(f"[Watcher] '{watch['topic']}' → {status}")

            except Exception as e:
                print(f"[Watcher] Error on watch '{watch.get('topic')}': {e}")

    except Exception as e:
        print(f"[Watcher] Top-level error: {e}")


def start():
    """Start the background scheduler. Call once at app startup."""
    global _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        print("[Watcher] APScheduler not installed — automated checks disabled")
        return

    if _scheduler and _scheduler.running:
        return

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _run_due_watches,
        trigger=IntervalTrigger(hours=1),
        id="watch_check",
        name="Research Watcher hourly check",
        replace_existing=True,
        misfire_grace_time=300,
    )
    _scheduler.start()
    print("[Watcher] Scheduler started — checks run every hour ✅")


def stop():
    """Gracefully stop the scheduler. Call at app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("[Watcher] Scheduler stopped")
