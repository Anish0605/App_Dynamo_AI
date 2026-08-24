"""
backend/trial.py — Pro Validation Programme
Handles invite-only 14-day Pro trial activation, webhook events, and feedback.
"""

import hmac
import hashlib
import json
import secrets
import razorpay
import requests as _requests

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel

import config
from supabase_client import supabase

router = APIRouter()


# --------------------------------------------------
# FIREBASE TOKEN VERIFICATION
# --------------------------------------------------

def verify_firebase_token(token: str) -> dict:
    """
    Verify a Firebase ID token via the google-auth library.
    Returns the decoded token dict (contains 'email', 'uid', etc.).
    Raises HTTPException 401 on any failure.
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests

        project_id = config.FIREBASE_PROJECT_ID
        if not project_id:
            raise HTTPException(status_code=500, detail="FIREBASE_PROJECT_ID not configured")

        request_adapter = grequests.Request()
        decoded = id_token.verify_firebase_token(token, request_adapter, audience=project_id)
        return decoded

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")


# --------------------------------------------------
# RAZORPAY CLIENT
# --------------------------------------------------

def _get_razorpay_client():
    if not config.RAZORPAY_KEY_ID or not config.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured")
    return razorpay.Client(auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET))


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class ActivateTrialRequest(BaseModel):
    firebase_token: str
    invite_code: str


class FeedbackRequest(BaseModel):
    firebase_token: str
    subscription_id: str | None = None
    rating: int | None = None
    feedback_text: str | None = None
    would_upgrade: bool | None = None


# --------------------------------------------------
# POST /trial/activate
# --------------------------------------------------

@router.post("/trial/activate")
async def activate_trial(req: ActivateTrialRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not available")

    # 1. Verify Firebase token — never trust frontend-supplied email
    decoded = verify_firebase_token(req.firebase_token)
    verified_email = decoded.get("email")
    # Firebase JWTs use "user_id" or "sub" for the UID, not "uid"
    firebase_uid = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid")

    if not verified_email or not firebase_uid:
        raise HTTPException(status_code=401, detail="Could not extract email from token")

    # 2. Look up user in Supabase — try firebase_uid first, fall back to email
    user_res = supabase.table("users") \
        .select("id, plan, email, firebase_uid") \
        .eq("firebase_uid", firebase_uid) \
        .execute()

    if not user_res.data and verified_email:
        # Fallback: look up by verified email (handles uid mismatch after re-auth)
        user_res = supabase.table("users") \
            .select("id, plan, email, firebase_uid") \
            .eq("email", verified_email) \
            .execute()

    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found. Please sign in to the main app first.")

    user = user_res.data[0]
    user_id = user["id"]

    # Patch firebase_uid if it was missing or mismatched
    if firebase_uid and user.get("firebase_uid") != firebase_uid:
        try:
            supabase.table("users").update({"firebase_uid": firebase_uid}).eq("id", user_id).execute()
        except Exception:
            pass

    # 3. Check if user already has an active trial
    existing = supabase.table("subscriptions") \
        .select("id, status") \
        .eq("user_id", user_id) \
        .eq("plan", "pro_trial") \
        .execute()

    for sub in (existing.data or []):
        if sub.get("status") in ("trial_active", "active"):
            raise HTTPException(status_code=409, detail="You already have an active Pro Validation trial.")

    # 4. Validate invite code
    code = req.invite_code.strip().upper()
    invite_res = supabase.table("trial_invites") \
        .select("*") \
        .eq("code", code) \
        .execute()

    if not invite_res.data:
        raise HTTPException(status_code=400, detail="Invalid invite code. Please check and try again.")

    invite = invite_res.data[0]

    if invite.get("revoked"):
        raise HTTPException(status_code=400, detail="This invite code has been revoked.")

    if invite.get("used_at"):
        raise HTTPException(status_code=400, detail="This invite code has already been used.")

    # Expiry check
    expires_at_str = invite.get("expires_at")
    if expires_at_str:
        try:
            from datetime import datetime, timezone
            exp = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="This invite code has expired. Please contact the Dynamo AI team for a new one.")
        except HTTPException:
            raise
        except Exception:
            pass

    # Email binding — invite is bound to the email it was issued for
    invite_email = (invite.get("email") or "").strip().lower()
    token_email  = (verified_email or "").strip().lower()
    if invite_email and token_email != invite_email:
        raise HTTPException(
            status_code=403,
            detail="This invite code was issued for a different email address. Please sign in with the correct account."
        )

    # 5. Create Razorpay subscription with 14-day trial
    if not config.RAZORPAY_PRO_PLAN_ID:
        raise HTTPException(status_code=500, detail="RAZORPAY_PRO_PLAN_ID not configured")

    start_at = int((datetime.now(timezone.utc) + timedelta(days=14)).timestamp())
    rp_client = _get_razorpay_client()

    try:
        subscription = rp_client.subscription.create({
            "plan_id": config.RAZORPAY_PRO_PLAN_ID,
            "total_count": 120,
            "quantity": 1,
            "start_at": start_at,
            "notes": {
                "user_id": user_id,
                "email": verified_email,
                "plan": "pro_trial",
            }
        })
        razorpay_sub_id = subscription["id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Razorpay subscription: {e}")

    # 6. Insert subscriptions row
    expires_at = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    try:
        supabase.table("subscriptions").insert({
            "user_id": user_id,
            "plan": "pro_trial",
            "razorpay_order_id": razorpay_sub_id,
            "amount": 0,
            "status": "trial_active",
            "expires_at": expires_at,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record subscription: {e}")

    # 7. Mark invite as used
    try:
        supabase.table("trial_invites").update({
            "used_at": datetime.now(timezone.utc).isoformat(),
            "used_by": user_id,
        }).eq("id", invite["id"]).execute()
    except Exception as e:
        print(f"[Trial] Warning: could not mark invite used: {e}")

    # 8. Log subscription event
    try:
        supabase.table("subscription_events").insert({
            "user_id": user_id,
            "razorpay_sub_id": razorpay_sub_id,
            "event": "trial.activated",
            "payload": {
                "invite_code": code,
                "email": verified_email,
                "expires_at": expires_at,
            }
        }).execute()
    except Exception as e:
        print(f"[Trial] Warning: could not log event: {e}")

    # 9. Update users.plan → pro_trial
    try:
        supabase.table("users").update({"plan": "pro_trial"}).eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user plan: {e}")

    return {
        "success": True,
        "subscription_id": razorpay_sub_id,
        "key_id": config.RAZORPAY_KEY_ID,
        "email": verified_email,
        "expires_at": expires_at,
    }


# --------------------------------------------------
# POST /trial/webhook
# --------------------------------------------------

@router.post("/trial/webhook")
async def trial_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    webhook_secret = config.RAZORPAY_WEBHOOK_SECRET
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured — rejecting unsigned payload")

    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")
    sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    razorpay_sub_id = sub_entity.get("id", "")
    notes = sub_entity.get("notes", {})
    user_id = notes.get("user_id")

    if not supabase:
        return {"status": "ok"}

    # Log event regardless of type
    if user_id:
        try:
            supabase.table("subscription_events").insert({
                "user_id": user_id,
                "razorpay_sub_id": razorpay_sub_id,
                "event": event,
                "payload": sub_entity,
            }).execute()
        except Exception as e:
            print(f"[Trial Webhook] Event log error: {e}")

    if event == "subscription.authenticated":
        # Trial subscription authenticated — no plan change needed (already pro_validation)
        print(f"[Trial Webhook] subscription.authenticated for sub {razorpay_sub_id}")

    elif event == "subscription.charged":
        # First real charge — trial converted to paid Pro
        if user_id:
            try:
                supabase.table("subscriptions") \
                    .update({"status": "active", "plan": "pro"}) \
                    .eq("razorpay_order_id", razorpay_sub_id) \
                    .execute()

                supabase.table("users") \
                    .update({"plan": "pro"}) \
                    .eq("id", user_id) \
                    .execute()

                print(f"[Trial Webhook] subscription.charged — user {user_id} upgraded to pro")
            except Exception as e:
                print(f"[Trial Webhook] Error upgrading to pro: {e}")

    elif event in ("subscription.cancelled", "subscription.halted"):
        # Trial cancelled or payment failed — downgrade to free
        if user_id:
            status_map = {
                "subscription.cancelled": "cancelled",
                "subscription.halted":    "halted",
            }
            new_status = status_map.get(event, event)
            try:
                supabase.table("subscriptions") \
                    .update({"status": new_status}) \
                    .eq("razorpay_order_id", razorpay_sub_id) \
                    .execute()

                supabase.table("users") \
                    .update({"plan": "free"}) \
                    .eq("id", user_id) \
                    .execute()

                print(f"[Trial Webhook] {event} — user {user_id} downgraded to free")
            except Exception as e:
                print(f"[Trial Webhook] Error downgrading plan: {e}")

    return {"status": "ok"}


# --------------------------------------------------
# POST /trial/feedback
# --------------------------------------------------

@router.post("/trial/feedback")
async def submit_trial_feedback(req: FeedbackRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not available")

    decoded = verify_firebase_token(req.firebase_token)
    # Firebase JWTs use "user_id" or "sub" for the UID, not "uid"
    firebase_uid = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid")

    user_res = supabase.table("users") \
        .select("id") \
        .eq("firebase_uid", firebase_uid) \
        .execute()

    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user_res.data[0]["id"]

    try:
        supabase.table("trial_feedback").insert({
            "user_id": user_id,
            "subscription_id": req.subscription_id,
            "rating": req.rating,
            "feedback_text": req.feedback_text,
            "would_upgrade": req.would_upgrade,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {e}")

    return {"success": True}


# --------------------------------------------------
# GET /admin/trial-feedback
# --------------------------------------------------

@router.get("/admin/trial-feedback")
async def admin_trial_feedback(x_admin_secret: str = Header(default="")):
    if not config.ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin endpoint not configured (ADMIN_SECRET not set)")
    if x_admin_secret != config.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin secret")
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not available")

    fb_res = supabase.table("trial_feedback") \
        .select("user_id, rating, would_upgrade, feedback_text, created_at") \
        .order("created_at", desc=True) \
        .execute()

    rows = fb_res.data or []

    user_ids = list({r["user_id"] for r in rows if r.get("user_id")})
    emails: dict = {}
    if user_ids:
        u_res = supabase.table("users").select("id, email").in_("id", user_ids).execute()
        for u in (u_res.data or []):
            emails[u["id"]] = u.get("email", "")

    enriched = []
    for r in rows:
        enriched.append({
            "email": emails.get(r.get("user_id", ""), "unknown"),
            "rating": r.get("rating"),
            "would_upgrade": r.get("would_upgrade"),
            "feedback_text": r.get("feedback_text") or "",
            "submitted_at": r.get("created_at") or "",
        })

    ratings = [r["rating"] for r in enriched if r["rating"] is not None]
    upgrades = [r["would_upgrade"] for r in enriched if r["would_upgrade"] is not None]

    stats = {
        "total": len(enriched),
        "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "pct_would_upgrade": round(100 * sum(upgrades) / len(upgrades)) if upgrades else None,
        "ratings_count": len(ratings),
        "upgrades_count": len(upgrades),
    }

    return {"stats": stats, "rows": enriched}
