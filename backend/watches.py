def get_watches(sb, user_id: str):
    res = sb.table("research_watches").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data or []

def get_all_active_watches(sb):
    """Fetch all active watches across all users (for the scheduler)."""
    res = sb.table("research_watches").select("*").eq("is_active", True).execute()
    return res.data or []

def create_watch(sb, user_id: str, topic: str, frequency: str = "weekly"):
    res = sb.table("research_watches").insert({
        "user_id": user_id,
        "topic": topic,
        "frequency": frequency,
        "is_active": True,
    }).execute()
    return res.data[0] if res.data else None

def delete_watch(sb, watch_id: str, user_id: str):
    sb.table("research_watches").delete().eq("id", watch_id).eq("user_id", user_id).execute()
    return True

def toggle_watch(sb, watch_id: str, user_id: str, is_active: bool):
    res = sb.table("research_watches").update({"is_active": is_active}).eq("id", watch_id).eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def mark_checked(sb, watch_id: str):
    """Record the current UTC timestamp as last_checked_at."""
    from datetime import datetime
    try:
        sb.table("research_watches").update({
            "last_checked_at": datetime.utcnow().isoformat()
        }).eq("id", watch_id).execute()
    except Exception as e:
        print(f"mark_checked error: {e}")

def is_due(watch: dict) -> bool:
    """Return True if enough time has passed since last check based on frequency."""
    from datetime import datetime, timedelta
    freq = watch.get("frequency", "weekly")
    last_raw = watch.get("last_checked_at")

    if not last_raw:
        return True  # Never checked → run now

    try:
        last = datetime.fromisoformat(last_raw.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return True

    delta = timedelta(hours=24) if freq == "daily" else timedelta(days=7)
    return (datetime.utcnow() - last) >= delta
