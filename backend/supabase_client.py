# supabase_client.py — Dynamo AI (PRODUCTION SAFE)

from supabase import create_client
import config
from datetime import datetime

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
# USERS
# --------------------------------------------------

def get_or_create_user(firebase_uid, email=None, full_name=None, phone=None):
    if not supabase:
        return None

    try:
        res = supabase.table("users") \
            .select("*") \
            .eq("firebase_uid", firebase_uid) \
            .execute()

        if res.data:
            return res.data[0]

        insert = {
            "firebase_uid": firebase_uid,
            "email": email,
            "full_name": full_name,
            "phone": phone,
            "created_at": datetime.utcnow().isoformat()
        }

        res = supabase.table("users").insert(insert).execute()
        return res.data[0] if res.data else None

    except Exception as e:
        print("User fetch/create error:", e)
        return None


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
            "content": content,          # JSONB (string / dict / list)
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
# SOFT DELETE (OPTIONAL)
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
