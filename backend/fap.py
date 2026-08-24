# backend/fap.py — Faculty Ambassador Program (FAP) API Router

import re
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from supabase_client import supabase

router = APIRouter(prefix="/fap", tags=["FAP"])

# --------------------------------------------------
# CONSTANTS
# --------------------------------------------------
ADMIN_EMAILS = {"anishkrisna6@gmail.com", "anishkrisnareview@gmail.com"}

FAP_COMMISSION = {
    "plus": 12000,   # ₹120 in paise
    "pro":  27000,   # ₹270 in paise
}

ELIGIBLE_PLANS = {"plus", "pro"}

# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def _generate_referral_code(full_name: str, sequence: int = 1) -> str:
    """Generate a code like ANISH001 from the first name."""
    first = re.sub(r"[^A-Z]", "", full_name.upper().split()[0])[:10]
    return f"{first}{sequence:03d}"


def _get_unique_referral_code(full_name: str) -> str:
    base = re.sub(r"[^A-Z]", "", full_name.upper().split()[0])[:10]
    seq = 1
    while True:
        code = f"{base}{seq:03d}"
        res = supabase.table("partners").select("id").eq("referral_code", code).execute()
        if not res.data:
            return code
        seq += 1


def _verify_admin(x_user_email: Optional[str]):
    if x_user_email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access only")


def _get_partner_by_user_email(email: str):
    user = supabase.table("users").select("id").eq("email", email.strip().lower()).single().execute()
    if not user.data:
        return None
    partner = supabase.table("partners").select("*").eq("user_id", user.data["id"]).single().execute()
    return partner.data if partner.data else None


def _get_user_id_by_email(email: str):
    """Return the app user id for an email, if the user has signed in before."""
    result = supabase.table("users").select("id").eq("email", email.strip().lower()).limit(1).execute()
    return result.data[0]["id"] if result.data else None


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class ApplicationRequest(BaseModel):
    full_name: str
    email: str
    mobile: str
    institution_name: str
    designation: str
    department: str
    city: str
    state: str

class ApproveRequest(BaseModel):
    application_id: str

class RejectRequest(BaseModel):
    application_id: str

class MarkPayoutPaidRequest(BaseModel):
    payout_id: str
    transaction_ref: str

class CreatePayoutRequest(BaseModel):
    partner_id: str
    payout_month: str


# --------------------------------------------------
# PHASE 2 — FACULTY APPLICATION FORM
# --------------------------------------------------

@router.post("/apply")
async def submit_application(req: ApplicationRequest):
    # Check for duplicate pending/approved application from same email
    existing = supabase.table("partner_applications") \
        .select("id, status") \
        .eq("email", req.email) \
        .in_("status", ["Pending", "Approved"]) \
        .execute()

    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="An application from this email already exists."
        )

    result = supabase.table("partner_applications").insert({
        "full_name": req.full_name,
        "email": req.email,
        "mobile": req.mobile,
        "institution_name": req.institution_name,
        "designation": req.designation,
        "department": req.department,
        "city": req.city,
        "state": req.state,
        "status": "Pending",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save application")

    return {"success": True, "message": "Application submitted successfully."}


@router.get("/apply/status")
async def check_application_status(email: str):
    result = supabase.table("partner_applications") \
        .select("status, created_at") \
        .eq("email", email) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not result.data:
        return {"found": False}

    return {"found": True, "status": result.data[0]["status"]}


# --------------------------------------------------
# PHASE 3 — ADMIN APPROVAL
# --------------------------------------------------

@router.get("/admin/applications")
async def list_applications(x_user_email: Optional[str] = Header(None)):
    _verify_admin(x_user_email)
    result = supabase.table("partner_applications") \
        .select("*") \
        .order("created_at", desc=True) \
        .execute()
    return {"applications": result.data or []}


@router.post("/admin/applications/{application_id}/approve")
async def approve_application(
    application_id: str,
    x_user_email: Optional[str] = Header(None)
):
    _verify_admin(x_user_email)

    app_res = supabase.table("partner_applications") \
        .select("*").eq("id", application_id).single().execute()

    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")

    app = app_res.data
    if app["status"] != "Pending":
        raise HTTPException(status_code=400, detail=f"Application is already {app['status']}")

    # Update status
    supabase.table("partner_applications") \
        .update({"status": "Approved"}) \
        .eq("id", application_id).execute()

    # Look up Supabase user by email (may not exist yet if they haven't signed up)
    user_res = supabase.table("users").select("id").eq("email", app["email"]).execute()
    user_id = user_res.data[0]["id"] if user_res.data else None

    # Generate unique referral code
    referral_code = _get_unique_referral_code(app["full_name"])

    # Create partner record
    partner_res = supabase.table("partners").insert({
        "user_id": user_id,
        "application_id": application_id,
        "referral_code": referral_code,
        "status": "Active",
    }).execute()

    return {
        "success": True,
        "referral_code": referral_code,
        "partner_id": partner_res.data[0]["id"] if partner_res.data else None
    }


@router.post("/admin/applications/{application_id}/reject")
async def reject_application(
    application_id: str,
    x_user_email: Optional[str] = Header(None)
):
    _verify_admin(x_user_email)

    res = supabase.table("partner_applications") \
        .update({"status": "Rejected"}) \
        .eq("id", application_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")

    return {"success": True}


# --------------------------------------------------
# PHASE 4 — REFERRAL TRACKING (called on signup)
# --------------------------------------------------

@router.post("/track-referral")
async def track_referral(referral_code: str, user_id: str):
    """Called during signup if ?ref=CODE is present in the URL."""
    partner_res = supabase.table("partners") \
        .select("id, user_id") \
        .eq("referral_code", referral_code.upper()) \
        .eq("status", "Active") \
        .execute()

    if not partner_res.data:
        return {"success": False, "reason": "Invalid referral code"}

    partner = partner_res.data[0]

    # Prevent self-referral
    if partner["user_id"] == user_id:
        return {"success": False, "reason": "Self-referral not allowed"}

    # Check if user already has a referral (immutable)
    existing = supabase.table("referrals") \
        .select("id").eq("referred_user_id", user_id).execute()

    if existing.data:
        return {"success": False, "reason": "User already has a referral"}

    supabase.table("referrals").insert({
        "partner_id": partner["id"],
        "referred_user_id": user_id,
        "status": "Trial",
    }).execute()

    # Also store referred_by on the user record
    supabase.table("users").update({"referred_by": referral_code.upper()}) \
        .eq("id", user_id).execute()

    return {"success": True}


# --------------------------------------------------
# PHASE 5 — COMMISSION ON PAYMENT (called from webhook)
# --------------------------------------------------

@router.post("/internal/payment-captured")
async def handle_payment_captured(
    user_id: str,
    plan: str,
    payment_id: str,
    x_internal_secret: Optional[str] = Header(None)
):
    """Internal endpoint called from the Razorpay webhook handler."""
    plan = plan.lower()
    if plan not in ELIGIBLE_PLANS:
        return {"skipped": True, "reason": "Plan not eligible for commission"}

    referral_res = supabase.table("referrals") \
        .select("*") \
        .eq("referred_user_id", user_id) \
        .eq("status", "Trial") \
        .execute()

    if not referral_res.data:
        return {"skipped": True, "reason": "No trial referral found"}

    referral = referral_res.data[0]
    amount = FAP_COMMISSION.get(plan, 0)

    # Mark referral as Paid
    supabase.table("referrals").update({"status": "Paid", "plan": plan}) \
        .eq("id", referral["id"]).execute()

    # Create commission record
    supabase.table("commissions").insert({
        "partner_id": referral["partner_id"],
        "referral_id": referral["id"],
        "amount": amount,
        "plan": plan,
        "payment_id": payment_id,
        "status": "Pending",
    }).execute()

    return {"success": True, "commission": amount}


# --------------------------------------------------
# PHASE 6 — PARTNER DASHBOARD
# --------------------------------------------------

@router.get("/partner/me")
async def get_partner_me(x_user_email: Optional[str] = Header(None)):
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    email = x_user_email.strip().lower()
    user_id = _get_user_id_by_email(email)

    # Approval can happen before the applicant's first app login, leaving
    # partners.user_id NULL. Resolve through the approved application email
    # and repair the link as soon as the partner signs in.
    partner_res = supabase.table("partners").select("*").eq("user_id", user_id).execute() if user_id else None
    if not partner_res or not partner_res.data:
        app_res = supabase.table("partner_applications") \
            .select("id") \
            .eq("email", email) \
            .eq("status", "Approved") \
            .limit(1) \
            .execute()
        if app_res.data:
            partner_res = supabase.table("partners").select("*") \
                .eq("application_id", app_res.data[0]["id"]).limit(1).execute()
            if partner_res.data and user_id and not partner_res.data[0].get("user_id"):
                supabase.table("partners").update({"user_id": user_id}) \
                    .eq("id", partner_res.data[0]["id"]).execute()
                partner_res.data[0]["user_id"] = user_id
        else:
            partner_res = None
    if not partner_res or not partner_res.data:
        return {"is_partner": False}

    partner = partner_res.data[0]
    partner_id = partner["id"]

    # Application details
    app_res = supabase.table("partner_applications") \
        .select("full_name, institution_name, designation, department, city, state") \
        .eq("id", partner["application_id"]).single().execute()
    app = app_res.data or {}

    # Referrals
    referrals_res = supabase.table("referrals") \
        .select("*, users(email)") \
        .eq("partner_id", partner_id) \
        .order("created_at", desc=True) \
        .execute()
    referrals = referrals_res.data or []

    # Commissions
    commissions_res = supabase.table("commissions") \
        .select("*") \
        .eq("partner_id", partner_id) \
        .execute()
    commissions = commissions_res.data or []

    pending_commission = sum(c["amount"] for c in commissions if c["status"] == "Pending")
    paid_commission    = sum(c["amount"] for c in commissions if c["status"] == "Paid")

    return {
        "is_partner": True,
        "partner": {
            "id": partner_id,
            "referral_code": partner["referral_code"],
            "referral_link": f"https://app.dynamoai.in/?ref={partner['referral_code']}",
            "status": partner["status"],
            "joined": partner["created_at"],
            "full_name": app.get("full_name", ""),
            "institution": app.get("institution_name", ""),
            "designation": app.get("designation", ""),
            "department": app.get("department", ""),
            "city": app.get("city", ""),
            "state": app.get("state", ""),
        },
        "stats": {
            "total_referrals":    len(referrals),
            "trial_users":        sum(1 for r in referrals if r["status"] == "Trial"),
            "paid_users":         sum(1 for r in referrals if r["status"] == "Paid"),
            "pending_commission": pending_commission,
            "paid_commission":    paid_commission,
            "lifetime_earnings":  pending_commission + paid_commission,
        },
        "referrals": referrals,
        "commissions": commissions,
    }


@router.get("/partner/payouts")
async def get_partner_payouts(x_user_email: Optional[str] = Header(None)):
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    email = x_user_email.strip().lower()
    user_id = _get_user_id_by_email(email)
    partner_res = supabase.table("partners").select("id").eq("user_id", user_id).execute() if user_id else None
    if not partner_res or not partner_res.data:
        app_res = supabase.table("partner_applications").select("id") \
            .eq("email", email).eq("status", "Approved").limit(1).execute()
        if app_res.data:
            partner_res = supabase.table("partners").select("id") \
                .eq("application_id", app_res.data[0]["id"]).limit(1).execute()
    if not partner_res or not partner_res.data:
        raise HTTPException(status_code=404, detail="Not a partner")
    partner_id = partner_res.data[0]["id"]

    payouts_res = supabase.table("payouts") \
        .select("*") \
        .eq("partner_id", partner_id) \
        .order("created_at", desc=True) \
        .execute()

    return {"payouts": payouts_res.data or []}


# --------------------------------------------------
# PHASE 7 — ADMIN DASHBOARD
# --------------------------------------------------

@router.get("/admin/partners")
async def list_partners(x_user_email: Optional[str] = Header(None)):
    _verify_admin(x_user_email)

    partners_res = supabase.table("partners") \
        .select("*, partner_applications(full_name, email, mobile, institution_name, designation, department, city, state)") \
        .order("created_at", desc=True) \
        .execute()
    partners = partners_res.data or []

    enriched = []
    for p in partners:
        partner_id = p["id"]

        referrals_res = supabase.table("referrals").select("id, status").eq("partner_id", partner_id).execute()
        referrals = referrals_res.data or []

        commissions_res = supabase.table("commissions").select("amount, status").eq("partner_id", partner_id).execute()
        commissions = commissions_res.data or []

        enriched.append({
            **p,
            "total_referrals": len(referrals),
            "paid_users":      sum(1 for r in referrals if r["status"] == "Paid"),
            "lifetime_earned": sum(c["amount"] for c in commissions if c["status"] == "Paid"),
            "pending_amount":  sum(c["amount"] for c in commissions if c["status"] == "Pending"),
        })

    return {"partners": enriched}


@router.get("/admin/stats")
async def admin_stats(x_user_email: Optional[str] = Header(None)):
    _verify_admin(x_user_email)

    apps_res     = supabase.table("partner_applications").select("status").execute()
    partners_res = supabase.table("partners").select("id").eq("status", "Active").execute()
    referrals_res= supabase.table("referrals").select("status").execute()
    commissions_res = supabase.table("commissions").select("amount, status").execute()

    apps        = apps_res.data or []
    referrals   = referrals_res.data or []
    commissions = commissions_res.data or []

    return {
        "total_partners":      len(partners_res.data or []),
        "pending_applications": sum(1 for a in apps if a["status"] == "Pending"),
        "approved_partners":   sum(1 for a in apps if a["status"] == "Approved"),
        "total_referrals":     len(referrals),
        "paid_users":          sum(1 for r in referrals if r["status"] == "Paid"),
        "pending_payout":      sum(c["amount"] for c in commissions if c["status"] == "Pending"),
        "total_commission_paid": sum(c["amount"] for c in commissions if c["status"] == "Paid"),
    }


@router.get("/admin/payouts")
async def admin_list_payouts(x_user_email: Optional[str] = Header(None)):
    _verify_admin(x_user_email)

    payouts_res = supabase.table("payouts") \
        .select("*, partners(referral_code, partner_applications(full_name, institution_name))") \
        .order("created_at", desc=True) \
        .execute()

    return {"payouts": payouts_res.data or []}


@router.post("/admin/payouts/create")
async def create_payout(req: CreatePayoutRequest, x_user_email: Optional[str] = Header(None)):
    _verify_admin(x_user_email)

    # Sum all pending commissions for this partner
    commissions_res = supabase.table("commissions") \
        .select("id, amount") \
        .eq("partner_id", req.partner_id) \
        .eq("status", "Pending") \
        .execute()

    commissions = commissions_res.data or []
    if not commissions:
        raise HTTPException(status_code=400, detail="No pending commissions for this partner")

    total = sum(c["amount"] for c in commissions)

    payout_res = supabase.table("payouts").insert({
        "partner_id": req.partner_id,
        "amount": total,
        "status": "Pending",
        "payout_month": req.payout_month,
    }).execute()

    return {"success": True, "payout_id": payout_res.data[0]["id"], "amount": total}


@router.post("/admin/payouts/{payout_id}/mark-paid")
async def mark_payout_paid(
    payout_id: str,
    req: MarkPayoutPaidRequest,
    x_user_email: Optional[str] = Header(None)
):
    _verify_admin(x_user_email)

    # Update payout
    payout_res = supabase.table("payouts").update({
        "status": "Paid",
        "transaction_ref": req.transaction_ref,
        "paid_at": datetime.utcnow().isoformat(),
    }).eq("id", payout_id).execute()

    if not payout_res.data:
        raise HTTPException(status_code=404, detail="Payout not found")

    # Mark all associated pending commissions as Paid
    payout = payout_res.data[0]
    supabase.table("commissions").update({"status": "Paid"}) \
        .eq("partner_id", payout["partner_id"]) \
        .eq("status", "Pending") \
        .execute()

    return {"success": True}
