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

        # ── Pro-only gate: only check watches for Pro/demo users ──
        pro_user_ids = set()
        try:
            user_rows = sb.table("users").select("id,email,plan").execute()
            pro_user_ids = {
                r["id"] for r in (user_rows.data or [])
                if (r.get("plan") or "").lower() in ("pro", "pro_trial", "pro_validation")
                or supabase_client.is_demo_account(r)
            }
        except Exception as e:
            print(f"[Watcher] Could not fetch Pro users: {e}")

        all_watches = [w for w in all_watches if w.get("user_id") in pro_user_ids]
        due = [w for w in all_watches if watches_module.is_due(w)]
        print(f"[Watcher] Daily run: {len(all_watches)} Pro-user watches active, {len(due)} due")

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
        trigger=IntervalTrigger(hours=24),
        id="watch_check",
        name="Research Watcher daily check (Pro only)",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # ── Trial expiry: runs every 6 hours ──
    import trial_expiry_scheduler
    trial_expiry_scheduler.start(_scheduler)

    _scheduler.start()
    print("[Watcher] Scheduler started — checks run every 24 hours, Pro users only ✅")


def stop():
    """Gracefully stop the scheduler. Call at app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("[Watcher] Scheduler stopped")
