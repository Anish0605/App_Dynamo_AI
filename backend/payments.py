import hmac
import hashlib
import razorpay
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import config
from supabase_client import supabase

router = APIRouter()

PLAN_PRICES = {
    "basic":        9900,
    "plus":        79900,
    "pro":        179900,
    "plus_annual": 767040,
    "pro_annual": 1727040,
}

PLAN_LABELS = {
    "basic": "Basic",
    "plus":  "Plus",
    "pro":   "Pro",
}

# Razorpay subscription plan IDs (updated July 2026)
RAZORPAY_PLANS = {
    "basic": "plan_TEcFeSRiwKq2sH",
    "plus":  "plan_TEcFedq2l1TF5E",
    "pro":   "plan_TEcFevJUElcZT9",
}

# Trial period in days per plan (Basic has no trial)
TRIAL_DAYS = {
    "basic": 0,
    "plus":  7,
    "pro":   14,
}


def get_razorpay_client():
    if not config.RAZORPAY_KEY_ID or not config.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured")
    return razorpay.Client(auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET))


# ── Request models ────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan: str
    user_id: str
    email: str | None = None
    name: str | None = None
    billing: str = "monthly"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    user_id: str
    billing: str = "monthly"


class CreateSubscriptionRequest(BaseModel):
    plan: str
    user_id: str
    email: str | None = None
    name: str | None = None


class VerifySubscriptionRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    plan: str
    user_id: str


# ── One-time order (used for annual billing / no-trial flow) ──────────────────

@router.post("/create-order")
async def create_order(req: CreateOrderRequest):
    plan = req.plan.lower()
    billing = req.billing.lower() if req.billing else "monthly"
    if plan not in ("basic", "plus", "pro"):
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}. Choose 'basic', 'plus' or 'pro'.")

    price_key = f"{plan}_annual" if billing == "annual" else plan
    amount_paise = PLAN_PRICES[price_key]
    client = get_razorpay_client()

    receipt = f"rcpt_{plan}_{billing[:1]}_{uuid.uuid4().hex[:8]}"
    order_data = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "plan": plan,
            "billing": billing,
            "user_id": req.user_id
        }
    })

    return {
        "order_id": order_data["id"],
        "amount": order_data["amount"],
        "currency": order_data["currency"],
        "key_id": config.RAZORPAY_KEY_ID,
        "plan": plan,
        "billing": billing,
    }


@router.post("/verify-payment")
async def verify_payment(req: VerifyPaymentRequest):
    if not config.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay secret not configured")

    plan = req.plan.lower()
    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")

    generated_signature = hmac.new(
        config.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature. Payment not verified.")

    billing = req.billing.lower() if req.billing else "monthly"
    days = 365 if billing == "annual" else 30
    expires_at = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    price_key = f"{plan}_annual" if billing == "annual" else plan

    if supabase:
        try:
            supabase.table("users").update({"plan": plan}).eq("id", req.user_id).execute()
        except Exception as e:
            print("Error updating user plan:", e)
            raise HTTPException(status_code=500, detail="Failed to update user plan")

        try:
            supabase.table("subscriptions").insert({
                "user_id": req.user_id,
                "plan": plan,
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "amount": PLAN_PRICES[price_key],
                "status": "paid",
                "expires_at": expires_at,
            }).execute()
        except Exception as e:
            print("Warning: Could not insert subscription record:", e)
    else:
        raise HTTPException(status_code=500, detail="Database not available")

    return {"success": True, "plan": plan}


# ── Subscription with trial ───────────────────────────────────────────────────

@router.post("/create-subscription")
async def create_subscription(req: CreateSubscriptionRequest):
    plan = req.plan.lower()
    if plan not in RAZORPAY_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")

    trial_days = TRIAL_DAYS[plan]
    plan_id = RAZORPAY_PLANS[plan]
    client = get_razorpay_client()

    # start_at = now + trial_days → no charge until trial ends
    start_at = int((datetime.now(timezone.utc) + timedelta(days=trial_days)).timestamp())

    sub = client.subscription.create({
        "plan_id": plan_id,
        "total_count": 12,
        "quantity": 1,
        "start_at": start_at,
        "notes": {
            "plan": plan,
            "user_id": req.user_id,
            "trial_days": str(trial_days),
        }
    })

    return {
        "subscription_id": sub["id"],
        "key_id": config.RAZORPAY_KEY_ID,
        "plan": plan,
        "trial_days": trial_days,
        "amount": PLAN_PRICES[plan],
        "currency": "INR",
    }


@router.post("/verify-subscription")
async def verify_subscription(req: VerifySubscriptionRequest):
    if not config.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay secret not configured")

    plan = req.plan.lower()
    if plan not in RAZORPAY_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Signature for subscriptions: payment_id + "|" + subscription_id
    generated_signature = hmac.new(
        config.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{req.razorpay_payment_id}|{req.razorpay_subscription_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid subscription signature.")

    trial_days = TRIAL_DAYS.get(plan, 0)
    # User gets trial plan status immediately — full plan activates after trial
    trial_plan = "pro_trial" if plan == "pro" else "plus_trial"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=trial_days)).isoformat()

    if supabase:
        try:
            # Give immediate trial access
            supabase.table("users").update({"plan": trial_plan}).eq("id", req.user_id).execute()
        except Exception as e:
            print("Error setting trial plan:", e)
            raise HTTPException(status_code=500, detail="Failed to activate trial")

        try:
            supabase.table("subscriptions").insert({
                "user_id": req.user_id,
                "plan": plan,
                "razorpay_order_id": req.razorpay_subscription_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "amount": 0,
                "status": "trial",
                "expires_at": expires_at,
            }).execute()
        except Exception as e:
            print("Warning: Could not insert trial subscription record:", e)
    else:
        raise HTTPException(status_code=500, detail="Database not available")

    return {
        "success": True,
        "plan": plan,
        "trial_plan": trial_plan,
        "trial_days": trial_days,
        "trial_ends": expires_at,
    }


# ── Webhook (handles both order payments and subscription renewals) ────────────

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    webhook_secret = config.RAZORPAY_WEBHOOK_SECRET
    if webhook_secret:
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "")

    if event == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment_entity.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan", "").lower()

        if user_id and plan in PLAN_PRICES and supabase:
            try:
                supabase.table("users").update({"plan": plan}).eq("id", user_id).execute()
                print(f"Webhook: Updated user {user_id} to plan {plan}")
            except Exception as e:
                print("Webhook: Error updating plan:", e)

    elif event == "subscription.charged":
        # Recurring subscription charge — upgrade trial user to full plan
        sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        notes = sub_entity.get("notes", {}) or {}
        user_id = notes.get("user_id")
        plan = notes.get("plan", "").lower()

        if user_id and plan in RAZORPAY_PLANS and supabase:
            try:
                supabase.table("users").update({"plan": plan}).eq("id", user_id).execute()
                print(f"Webhook: Subscription charged — upgraded user {user_id} to {plan}")
            except Exception as e:
                print("Webhook: Error on subscription.charged:", e)

    elif event == "subscription.cancelled":
        sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        notes = sub_entity.get("notes", {}) or {}
        user_id = notes.get("user_id")

        if user_id and supabase:
            try:
                supabase.table("users").update({"plan": "basic"}).eq("id", user_id).execute()
                print(f"Webhook: Subscription cancelled — downgraded user {user_id} to basic")
            except Exception as e:
                print("Webhook: Error on subscription.cancelled:", e)

    return {"status": "ok"}
