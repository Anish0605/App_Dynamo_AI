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
    "plus": 19900,
    "pro":  49900,
}

PLAN_LABELS = {
    "plus": "Plus",
    "pro":  "Pro",
}

def get_razorpay_client():
    if not config.RAZORPAY_KEY_ID or not config.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured")
    return razorpay.Client(auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET))


class CreateOrderRequest(BaseModel):
    plan: str
    user_id: str
    email: str | None = None
    name: str | None = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    user_id: str


@router.post("/create-order")
async def create_order(req: CreateOrderRequest):
    plan = req.plan.lower()
    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}. Choose 'plus' or 'pro'.")

    amount_paise = PLAN_PRICES[plan]
    client = get_razorpay_client()

    receipt = f"rcpt_{plan}_{uuid.uuid4().hex[:8]}"
    order_data = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "plan": plan,
            "user_id": req.user_id
        }
    })

    return {
        "order_id": order_data["id"],
        "amount": order_data["amount"],
        "currency": order_data["currency"],
        "key_id": config.RAZORPAY_KEY_ID,
        "plan": plan,
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

    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

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
                "amount": PLAN_PRICES[plan],
                "status": "paid",
                "expires_at": expires_at,
            }).execute()
        except Exception as e:
            print("Warning: Could not insert subscription record (table may not exist yet):", e)
            print("Run SQL: CREATE TABLE subscriptions (...) — see backend/init_db.sql")
    else:
        raise HTTPException(status_code=500, detail="Database not available")

    return {"success": True, "plan": plan}


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

    return {"status": "ok"}
