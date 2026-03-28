# supabase_client.py — Dynamo AI (CLEAN + PRODUCTION SAFE)

from supabase import create_client
import config
from datetime import datetime, date

# --------------------------------------------------
# INIT SUPABASE CLIENT
# --------------------------------------------------

supabase = None

if config.SUPABASE_URL and config.SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_KEY
        )
        print("Supabase client initialized")
    except Exception as e:
        print("Supabase Init Error:", e)
else:
    print("Supabase keys missing")


# --------------------------------------------------
# USERS (WITH DAILY RESET)
# --------------------------------------------------

def get_or_create_user(firebase_uid, email=None, full_name=None, phone=None):
    if not supabase:
        return None

    try:
        # -------------------------
        # FETCH USER
        # -------------------------
        res = supabase.table("users") \
            .select("*") \
            .eq("firebase_uid", firebase_uid) \
            .execute()

        # -------------------------
        # USER EXISTS
        # -------------------------
        if res.data:
            user = res.data[0]

            # 🔥 DAILY RESET LOGIC
            today = date.today().isoformat()

            if user.get("quota_date") != today:
                try:
                    supabase.table("users") \
                        .update({
                            "daily_quota_used": 0,
                            "quota_date": today
                        }) \
                        .eq("id", user["id"]) \
                        .execute()

                    user["daily_quota_used"] = 0
                    user["quota_date"] = today

                    print("✅ Daily quota reset")

                except Exception as e:
                    print("Quota reset error:", e)

            return user

        # -------------------------
        # CREATE NEW USER
        # -------------------------
        insert = {
            "firebase_uid": firebase_uid,
            "email": email,
            "full_name": full_name,
            "phone": phone,
            "created_at": datetime.utcnow().isoformat(),
            "daily_quota_used": 0,
            "quota_date": date.today().isoformat()
        }

        res = supabase.table("users").insert(insert).execute()
        return res.data[0] if res.data else None

    except Exception as e:
        print("User fetch/create error:", e)
        return None

# --------------------------------------------------
# 🔥 GET USER BY SUPABASE ID (for backend quota checks)
# --------------------------------------------------

def get_user_by_supabase_id(supabase_id):
    """Look up a user by their Supabase UUID (the 'id' column).
    Also runs daily quota reset if needed."""
    if not supabase or not supabase_id:
        return None

    try:
        res = supabase.table("users") \
            .select("*") \
            .eq("id", supabase_id) \
            .execute()

        if not res.data:
            return None

        user = res.data[0]

        # Daily reset
        today = date.today().isoformat()
        if user.get("quota_date") != today:
            try:
                supabase.table("users") \
                    .update({
                        "daily_quota_used": 0,
                        "quota_date": today
                    }) \
                    .eq("id", user["id"]) \
                    .execute()

                user["daily_quota_used"] = 0
                user["quota_date"] = today
                print("✅ Daily quota reset for user:", supabase_id)

            except Exception as e:
                print("Quota reset error:", e)

        return user

    except Exception as e:
        print("get_user_by_supabase_id error:", e)
        return None


# --------------------------------------------------
# 🔥 QUOTA CHECK
# --------------------------------------------------

def check_user_quota(user):
    if not user:
        return True  # allow if no user (anonymous)

    plan = user.get("plan", "free")
    used = user.get("daily_quota_used", 0)

    if plan == "plus":
        limit = 100
    else:
        limit = 10  # free plan

    return used < limit


# --------------------------------------------------
# 🔥 INCREMENT QUOTA
# --------------------------------------------------

def increment_quota(user):
    try:
        new_value = user.get("daily_quota_used", 0) + 1

        supabase.table("users") \
            .update({
                "daily_quota_used": new_value
            }) \
            .eq("id", user["id"]) \
            .execute()

        # Also update local dict so caller has fresh value
        user["daily_quota_used"] = new_value

    except Exception as e:
        print("Quota increment error:", e)

# --------------------------------------------------
# CHATS
# --------------------------------------------------

def create_chat(user_id, title="New Chat"):
    if not supabase:
        return None

    try:
        res = supabase.table("chats").insert({
            "user_id": user_id,
            "title": title
        }).execute()

        return res.data[0] if res.data else None

    except Exception as e:
        print("Create chat error:", e)
        return None


def list_user_chats(user_id):
    if not supabase:
        return []

    try:
        res = supabase.table("chats") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()

        return res.data or []

    except Exception as e:
        print("List chats error:", e)
        return []


# --------------------------------------------------
# MESSAGES
# --------------------------------------------------

def save_message(chat_id, role, content, content_type="text"):
    if not supabase:
        return None

    try:
        res = supabase.table("messages").insert({
            "chat_id": chat_id,
            "role": role,
            "content": content,
            "content_type": content_type,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return res.data[0] if res.data else None

    except Exception as e:
        print("Save message error:", e)
        return None


def fetch_chat_messages(chat_id, limit=50):
    if not supabase:
        return []

    try:
        res = supabase.table("messages") \
            .select("role, content, content_type, created_at") \
            .eq("chat_id", chat_id) \
            .eq("is_deleted", False) \
            .order("created_at") \
            .limit(limit) \
            .execute()

        return res.data or []

    except Exception as e:
        print("Fetch messages error:", e)
        return []


# --------------------------------------------------
# SOFT DELETE
# --------------------------------------------------

def soft_delete_message(message_id):
    if not supabase:
        return False

    try:
        supabase.table("messages") \
            .update({"is_deleted": True}) \
            .eq("id", message_id) \
            .execute()
        return True
    except Exception as e:
        print("Delete message error:", e)
        return False
