def get_watches(sb, user_id: str):
    res = sb.table("research_watches").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
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
