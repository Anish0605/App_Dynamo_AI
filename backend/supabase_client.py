# supabase_client.py — Dynamo AI (SCHEMA-ALIGNED, FINAL)

from supabase import create_client
from datetime import datetime
import config

# --------------------------------------------------
# INIT
# --------------------------------------------------

supabase = None

if config.SUPABASE_URL and config.SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_KEY
        )
    except Exception as e:
        print("Supabase Init Error:", e)

# --------------------------------------------------
# USERS
# --------------------------------------------------

def get_or_create_user(firebase_uid: str, email: str = None):
    """
    Fetch user by Firebase UID.
    Create if not exists.
    """
    if not supabase:
        return None

    try:
        res = (
            supabase
            .table("users")
            .select("*")
            .eq("firebase_uid", firebase_uid)
            .execute()
        )

        if res.data:
            return res.data[0]

        insert = (
            supabase
            .table("users")
            .insert({
                "firebase_uid": firebase_uid,
                "email": email,
                "created_at": datetime.utcnow().isoformat()
            })
            .execute()
        )

        return insert.data[0] if insert.data else None

    except Exception as e:
        print("User Error:", e)
        return None

# --------------------------------------------------
# CHATS
# --------------------------------------------------

def create_chat(user_id: str, title: str = "New Chat"):
    if not supabase:
        return None

    try:
        res = (
            supabase
            .table("chats")
            .insert({
                "user_id": user_id,
                "title": title,
                "created_at": datetime.utcnow().isoformat()
            })
            .execute()
        )

        return res.data[0] if res.data else None

    except Exception as e:
        print("Chat Create Error:", e)
        return None

def get_user_chats(user_id: str):
    if not supabase:
        return []

    try:
        res = (
            supabase
            .table("chats")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        return res.data or []

    except Exception as e:
        print("Fetch Chats Error:", e)
        return []

# --------------------------------------------------
# MESSAGES
# --------------------------------------------------

def save_message(
    chat_id: str,
    role: str,
    content: dict,
    content_type: str = "text"
):
    """
    Save a message (JSON safe).
    """
    if not supabase:
        return None

    try:
        res = (
            supabase
            .table("messages")
            .insert({
                "chat_id": chat_id,
                "role": role,
                "content": content,
                "content_type": content_type,
                "created_at": datetime.utcnow().isoformat()
            })
            .execute()
        )

        return res.data[0] if res.data else None

    except Exception as e:
        print("Save Message Error:", e)
        return None

def fetch_chat_messages(chat_id: str):
    """
    Fetch ordered chat history for AI + frontend.
    """
    if not supabase:
        return []

    try:
        res = (
            supabase
            .table("messages")
            .select("role, content, content_type, created_at")
            .eq("chat_id", chat_id)
            .eq("is_deleted", False)
            .order("created_at")
            .execute()
        )

        return res.data or []

    except Exception as e:
        print("Fetch Messages Error:", e)
        return []
