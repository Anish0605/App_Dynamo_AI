# supabase_client.py — Dynamo AI (CLEAN + PRODUCTION SAFE)

from supabase import create_client
import config
import requests
from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo
from brevo import add_contact, send_welcome_email

# --------------------------------------------------
# DEMO / INTERNAL ACCOUNTS
# Approved demo accounts have permanent demo access without changing the
# persisted subscription plan.
# --------------------------------------------------
DEMO_EMAILS = {
    "anishkrisnareview@gmail.com",
    "anishkrisnaonline@gmail.com",
}

DEMO_ACCESS_UNTIL = {}


def is_demo_account(user):
    """Return whether a user currently has demo-only unlimited access."""
    if not user:
        return False

    email = (user.get("email") or "").strip().lower()
    if email in DEMO_EMAILS:
        return True

    expires_at = DEMO_ACCESS_UNTIL.get(email)
    return bool(expires_at and datetime.now(timezone.utc) < expires_at.astimezone(timezone.utc))


def expire_demo_access_if_needed(user):
    """Downgrade an expired dated demo account on its next authenticated request."""
    if not user:
        return user

    email = (user.get("email") or "").strip().lower()
    expires_at = DEMO_ACCESS_UNTIL.get(email)
    if not expires_at or datetime.now(timezone.utc) < expires_at.astimezone(timezone.utc):
        return user

    if user.get("plan") in ("pro", "pro_trial", "pro_validation", "plus", "plus_trial"):
        try:
            supabase.table("users").update({"plan": "free"}).eq("id", user["id"]).execute()
            user["plan"] = "free"
            print(f"Demo access expired for {email}; downgraded to free")
        except Exception as e:
            print(f"Demo expiry update failed for {email}: {e}")

    return user


def track_event(email, event="user_signup"):
    if not config.POSTHOG_API_KEY:
        return
    try:
        requests.post("https://app.posthog.com/capture/", json={
            "api_key": config.POSTHOG_API_KEY,
            "event": event,
            "distinct_id": email
        })
    except Exception as e:
        print("PostHog tracking error:", e)

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
# STARTUP: verify new columns exist
# --------------------------------------------------

def check_migration_status():
    """Check if quota columns exist; log warning if not."""
    if not supabase:
        return
    try:
        supabase.table("users") \
            .select("image_count_used, video_count_used, quota_month") \
            .limit(1) \
            .execute()
        print("Quota columns verified OK")
    except Exception as e:
        print("WARNING: Quota columns missing — run backend/migrate_quota_columns.sql in Supabase Dashboard.")
        print("  SQL Editor: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql")


def check_memory_table():
    """Check if user_memories table exists; log warning if not."""
    if not supabase:
        return
    try:
        supabase.table("user_memories").select("id").limit(1).execute()
        print("user_memories table verified OK")
    except Exception as e:
        print("WARNING: user_memories table missing — run backend/migrate_memory.sql in Supabase Dashboard.")
        print("  SQL Editor: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql")


def check_folders_table():
    """Check if folders table and chats.folder_id column exist."""
    if not supabase:
        return
    try:
        supabase.table("folders").select("id").limit(1).execute()
        print("folders table verified OK")
    except Exception:
        print("WARNING: folders table missing — run backend/migrate_folders.sql in Supabase Dashboard.")
        print("  SQL Editor: https://supabase.com/dashboard/project/jbulnpcqxtbjobrclsqq/sql")


import threading
def _run_startup_checks():
    check_migration_status()
    check_memory_table()
    check_folders_table()

threading.Thread(target=_run_startup_checks, daemon=True).start()


# --------------------------------------------------
# PLAN LIMITS
# --------------------------------------------------

PLAN_LIMITS = {
    "free":           {"daily_chat": 10,  "images_month": 0,  "videos_month": 0,  "papers_month": 0},
    "basic":          {"daily_chat": 10,  "images_month": 0,  "videos_month": 0,  "papers_month": 0},
    "plus":           {"daily_chat": 100, "images_month": 0,  "videos_month": 0,  "papers_month": 3},
    "plus_trial":     {"daily_chat": 100, "images_month": 0,  "videos_month": 0,  "papers_month": 3},
    "pro":            {"daily_chat": 300, "images_month": 25, "videos_month": 15, "papers_month": 5},
    "pro_trial":      {"daily_chat": 300, "images_month": 25, "videos_month": 0,  "papers_month": 5},
    "pro_validation": {"daily_chat": 300, "images_month": 25, "videos_month": 0,  "papers_month": 5},
}

PAID_ACCESS_PLANS = {
    "basic",
    "plus",
    "plus_trial",
    "pro",
    "pro_trial",
    "pro_validation",
}


def has_paid_access(user):
    """Return whether the account may consume Dynamo AI features."""
    if not user:
        return False
    if is_demo_account(user):
        return True
    return (user.get("plan") or "free").strip().lower() in PAID_ACCESS_PLANS


def _current_month():
    return datetime.utcnow().date().strftime("%Y-%m")


def _apply_monthly_reset(user):
    """If user's quota_month != current month, reset image/video counters.
    Mutates the dict in place and updates Supabase.
    Handles missing columns gracefully (columns added via migration)."""
    if not supabase or not user:
        return user

    current_month = _current_month()
    quota_month = user.get("quota_month")

    # If columns don't exist in the row (None means not fetched), treat as needing reset
    if quota_month != current_month:
        try:
            supabase.table("users") \
                .update({
                    "image_count_used": 0,
                    "video_count_used": 0,
                    "paper_count_used": 0,
                    "quota_month": current_month
                }) \
                .eq("id", user["id"]) \
                .execute()

            user["image_count_used"] = 0
            user["video_count_used"] = 0
            user["paper_count_used"] = 0
            user["quota_month"] = current_month
            print("Monthly quota reset for user:", user["id"])

        except Exception as e:
            # If columns don't exist yet (migration not run), log but don't crash
            print("Monthly reset error (columns may need migration):", e)
            user.setdefault("image_count_used", 0)
            user.setdefault("video_count_used", 0)
            user.setdefault("paper_count_used", 0)

    return user


# --------------------------------------------------
# USERS (WITH DAILY + MONTHLY RESET)
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

            # Daily reset (UTC)
            today = datetime.utcnow().date().isoformat()
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
                    print("Daily quota reset (UTC):", today)

                except Exception as e:
                    print("Quota reset error:", e)

            # Monthly reset and any dated demo expiry
            user = _apply_monthly_reset(user)
            user = expire_demo_access_if_needed(user)

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
            "quota_date": datetime.utcnow().date().isoformat(),
            "image_count_used": 0,
            "video_count_used": 0,
            "quota_month": _current_month()
        }

        res = supabase.table("users").insert(insert).execute()
        new_user = res.data[0] if res.data else None

        # Add to Brevo list + send welcome email for new user
        if new_user and email:
            try:
                add_contact(email)
                send_welcome_email(email)
                print(f"Brevo: contact added + welcome email sent to {email}")
            except Exception as mail_err:
                print(f"Brevo error (non-blocking): {mail_err}")

            # Track signup event in PostHog
            track_event(email, "user_signup")

        return new_user

    except Exception as e:
        print("User fetch/create error:", e)
        return None

# --------------------------------------------------
# GET USER BY SUPABASE ID (for backend quota checks)
# --------------------------------------------------

def get_user_by_supabase_id(supabase_id):
    """Look up a user by their Supabase UUID (the 'id' column).
    Also runs daily and monthly quota reset if needed."""
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

        # Daily reset (UTC)
        today = datetime.utcnow().date().isoformat()
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
                print("Daily quota reset for user (UTC):", supabase_id, "date:", today)

            except Exception as e:
                print("Quota reset error:", e)

        user = _apply_monthly_reset(user)
        user = expire_demo_access_if_needed(user)

        return user

    except Exception as e:
        print("get_user_by_supabase_id error:", e)
        return None


def get_user_by_firebase_uid(firebase_uid):
    """Look up a user by the verified Firebase UID."""
    if not supabase or not firebase_uid:
        return None
    try:
        res = supabase.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
        if not res.data:
            return None
        user = res.data[0]
        user = _apply_monthly_reset(user)
        user = expire_demo_access_if_needed(user)
        return user
    except Exception as e:
        print("get_user_by_firebase_uid error:", e)
        return None


# --------------------------------------------------
# CHAT QUOTA CHECK
# --------------------------------------------------

def check_user_quota(user):
    if not user:
        return True  # allow if no user (anonymous)
    if is_demo_account(user):
        return True  # demo accounts have no limits

    plan = user.get("plan", "free")
    used = user.get("daily_quota_used", 0)
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    return used < limits["daily_chat"]


# --------------------------------------------------
# INCREMENT CHAT QUOTA
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

        user["daily_quota_used"] = new_value

    except Exception as e:
        print("Quota increment error:", e)


# --------------------------------------------------
# IMAGE QUOTA
# --------------------------------------------------

def check_image_quota(user):
    """Returns True if user is allowed to generate an image.
    Free users are never allowed. Plus/Pro users have monthly caps."""
    if not user:
        return False
    if is_demo_account(user):
        return True  # demo accounts have no limits

    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    monthly_limit = limits["images_month"]

    if monthly_limit == 0:
        return False

    # Default to 0 if column not yet present (migration pending)
    used = user.get("image_count_used") or 0
    return used < monthly_limit


def increment_image_quota(user):
    try:
        new_value = (user.get("image_count_used") or 0) + 1

        supabase.table("users") \
            .update({"image_count_used": new_value}) \
            .eq("id", user["id"]) \
            .execute()

        user["image_count_used"] = new_value

    except Exception as e:
        print("Image quota increment error (column may need migration):", e)


# --------------------------------------------------
# VIDEO QUOTA
# --------------------------------------------------

def check_video_quota(user):
    """Returns True if user is allowed to generate a video.
    Free users are never allowed. Plus/Pro users have monthly caps."""
    if not user:
        return False
    if is_demo_account(user):
        return True  # demo accounts have no limits

    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    monthly_limit = limits["videos_month"]

    if monthly_limit == 0:
        return False

    # Default to 0 if column not yet present (migration pending)
    used = user.get("video_count_used") or 0
    return used < monthly_limit


def increment_video_quota(user):
    try:
        new_value = (user.get("video_count_used") or 0) + 1

        supabase.table("users") \
            .update({"video_count_used": new_value}) \
            .eq("id", user["id"]) \
            .execute()

        user["video_count_used"] = new_value

    except Exception as e:
        print("Video quota increment error (column may need migration):", e)


# --------------------------------------------------
# PAPER WRITE-UP QUOTA
# --------------------------------------------------

def check_paper_quota(user):
    """Returns (allowed, used, limit).
    Free users are never allowed. Plus=3/month, Pro=5/month."""
    if not user:
        return False, 0, 0
    if is_demo_account(user):
        return True, 0, 9999  # demo accounts have no limits

    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    monthly_limit = limits["papers_month"]

    if monthly_limit == 0:
        return False, 0, 0

    used = user.get("paper_count_used") or 0
    return used < monthly_limit, used, monthly_limit


def increment_paper_quota(user):
    try:
        new_value = (user.get("paper_count_used") or 0) + 1

        supabase.table("users") \
            .update({"paper_count_used": new_value}) \
            .eq("id", user["id"]) \
            .execute()

        user["paper_count_used"] = new_value

    except Exception as e:
        print("Paper quota increment error (column may need migration):", e)


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
