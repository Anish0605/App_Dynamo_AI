"""
backend/admin_dashboard.py — Trial Admin + Paid Users + Usage Dashboard Endpoints

Endpoints:
  GET  /admin/trials        — All users with trial/paid status, days left, etc.
  GET  /admin/paid-users    — All paid subscriptions (trial→paid conversions)
  POST /admin/alert-trials  — Send expiry alerts to selected trial users
  GET  /admin/usage         — API cost tracking per user (chat/images/videos)
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import config
from supabase_client import supabase

router = APIRouter()


def _require_admin(x_admin_secret: str):
    if not config.ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin endpoint not configured (ADMIN_SECRET not set)")
    if x_admin_secret != config.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin secret")
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not available")


def _now():
    return datetime.now(timezone.utc)


def _days_until(dt_str: str | None) -> int:
    if not dt_str:
        return -999
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return (dt - _now()).days
    except Exception:
        return -999


def _fmt_date(dt_str: str | None) -> str:
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return dt_str[:10]


# ───────────────────────────────────────────────────────
# GET /admin/trials
# ───────────────────────────────────────────────────────

@router.get("/admin/trials")
async def admin_trials(x_admin_secret: str = Header(default="")):
    _require_admin(x_admin_secret)

    # Fetch all users + their latest subscription
    users_res = supabase.table("users") \
        .select("id, email, full_name, plan, created_at") \
        .execute()

    subs_res = supabase.table("subscriptions") \
        .select("user_id, plan, status, razorpay_order_id, amount, created_at, expires_at") \
        .execute()

    # Build subscription lookup by user_id (latest first)
    subs_by_user: dict = {}
    for s in (subs_res.data or []):
        uid = s.get("user_id")
        if uid and (uid not in subs_by_user or s.get("created_at", "") > subs_by_user[uid].get("created_at", "")):
            subs_by_user[uid] = s

    trials = []
    for u in (users_res.data or []):
        uid = u.get("id")
        sub = subs_by_user.get(uid)
        plan = u.get("plan", "free")

        # Skip pure free users who have never had any subscription
        if not sub:
            continue

        # Determine trial type and days left
        trial_type = ""
        days_left = -999
        start_date = ""
        end_date = ""
        alerted = False

        sub_plan = sub.get("plan", "")
        sub_status = sub.get("status", "")
        expires_at = sub.get("expires_at")
        created_at = sub.get("created_at")

        if sub_status in ("trial", "trial_active"):
            trial_type = "14-Day" if "pro" in sub_plan.lower() else "7-Day"
            days_left = _days_until(expires_at)
            start_date = _fmt_date(created_at)
            end_date = _fmt_date(expires_at)
        elif sub_status in ("paid", "active") and sub.get("amount", 0) == 0:
            # Trial that hasn't been charged yet
            trial_type = "14-Day" if "pro" in sub_plan.lower() else "7-Day"
            days_left = _days_until(expires_at)
            start_date = _fmt_date(created_at)
            end_date = _fmt_date(expires_at)
        elif sub_status in ("paid", "active"):
            # Paid subscription — show as paid/active
            trial_type = "14-Day" if "pro" in sub_plan.lower() else "7-Day"
            days_left = 999
            start_date = _fmt_date(created_at)
            end_date = _fmt_date(expires_at)
        elif sub_status in ("cancelled", "halted"):
            trial_type = "14-Day" if "pro" in sub_plan.lower() else "7-Day"
            days_left = _days_until(expires_at) if expires_at else -999
            start_date = _fmt_date(created_at)
            end_date = _fmt_date(expires_at)
        else:
            # Any other subscription status — still include them
            trial_type = "14-Day" if "pro" in sub_plan.lower() else "7-Day"
            days_left = _days_until(expires_at) if expires_at else -999
            start_date = _fmt_date(created_at)
            end_date = _fmt_date(expires_at)

        # Status for display
        if days_left == 999:
            row_status = "paid"
        elif days_left < 0:
            row_status = "expired"
        elif days_left <= 1:
            row_status = "expiring-soon"
        else:
            row_status = "active"

        trials.append({
            "id": uid,
            "name": (u.get("full_name") or (u.get("email") or "").split("@")[0].replace(".", " ").title() or "Unknown"),
            "email": u.get("email") or "",
            "plan": plan,
            "trialType": trial_type,
            "startDate": start_date,
            "endDate": end_date,
            "daysLeft": days_left,
            "status": row_status,
            "alerted": alerted,
            "subscriptionId": sub.get("razorpay_order_id", "") if sub else "",
            "amount": sub.get("amount", 0) if sub else 0,
        })

    # Stats
    total = len(trials)
    active = sum(1 for t in trials if t["status"] == "active")
    expiring_today = sum(1 for t in trials if t["daysLeft"] == 0)
    expiring_soon = sum(1 for t in trials if t["daysLeft"] == 1)
    expired = sum(1 for t in trials if t["status"] == "expired")

    return {
        "stats": {
            "total": total,
            "active": active,
            "expiringToday": expiring_today,
            "expiringSoon": expiring_soon,
            "expired": expired,
        },
        "trials": trials,
    }


# ───────────────────────────────────────────────────────
# GET /admin/paid-users
# ───────────────────────────────────────────────────────

@router.get("/admin/paid-users")
async def admin_paid_users(x_admin_secret: str = Header(default="")):
    _require_admin(x_admin_secret)

    # Fetch paid subscriptions (status = paid or active, amount > 0)
    subs_res = supabase.table("subscriptions") \
        .select("id, user_id, plan, razorpay_order_id, razorpay_payment_id, amount, status, created_at, expires_at") \
        .or_("status.eq.paid,status.eq.active") \
        .execute()

    user_ids = list({s["user_id"] for s in (subs_res.data or []) if s.get("user_id")})

    # Fetch user details
    users_map: dict = {}
    if user_ids:
        users_res = supabase.table("users") \
            .select("id, email, full_name, plan") \
            .in_("id", user_ids) \
            .execute()
        for u in (users_res.data or []):
            users_map[u["id"]] = u

    paid_users = []
    for s in (subs_res.data or []):
        uid = s.get("user_id")
        u = users_map.get(uid, {})
        plan_label = s.get("plan", "")
        amount = s.get("amount", 0)
        if amount == 0:
            continue  # Skip trial subscriptions (amount = 0)

        # Determine if annual
        is_annual = amount >= 300000  # ₹3,000+ is annual
        display_plan = f"{plan_label.title()} Annual" if is_annual else plan_label.title()

        # Calculate period
        created = s.get("created_at")
        expires = s.get("expires_at")
        period = ""
        if created and expires:
            period = f"{_fmt_date(created)} → {_fmt_date(expires)}"

        # Determine source (trial or direct)
        source = "Direct Purchase"
        # Check if user had a trial before this paid sub
        if uid:
            trial_check = supabase.table("subscriptions") \
                .select("id") \
                .eq("user_id", uid) \
                .eq("status", "trial") \
                .lt("created_at", created or "9999-12-31") \
                .execute()
            if trial_check.data:
                trial_days = 14 if "pro" in plan_label.lower() else 7
                source = f"Trial → {plan_label.title()} ({trial_days}-day)"

        # Active if paid and not expired
        sub_status = s.get("status", "")
        is_expired = expires and _now() > datetime.fromisoformat(expires.replace("Z", "+00:00"))
        effective_status = "expired" if is_expired else sub_status

        paid_users.append({
            "id": s.get("id"),
            "name": (u.get("full_name") or (u.get("email") or "").split("@")[0].replace(".", " ").title() or "Unknown"),
            "email": u.get("email") or "",
            "plan": display_plan,
            "rawPlan": plan_label,
            "amount": amount,
            "period": period,
            "convertedAt": created or "",
            "invoiceId": s.get("razorpay_order_id", ""),
            "orderId": s.get("razorpay_order_id", ""),
            "paymentId": s.get("razorpay_payment_id", ""),
            "status": effective_status,
            "source": source,
        })

    # Sort by convertedAt desc
    paid_users.sort(key=lambda x: x["convertedAt"] or "", reverse=True)

    # Stats
    total = len(paid_users)
    active = sum(1 for p in paid_users if p["status"] in ("active", "paid"))
    pro_users = sum(1 for p in paid_users if "pro" in p["rawPlan"].lower() and p["status"] in ("active", "paid"))
    plus_users = sum(1 for p in paid_users if "plus" in p["rawPlan"].lower() and p["status"] in ("active", "paid"))
    total_revenue = sum(p["amount"] for p in paid_users)
    mrr = sum(
        (p["amount"] / 12 if p["amount"] >= 300000 else p["amount"])
        for p in paid_users if p["status"] in ("active", "paid")
    )

    return {
        "stats": {
            "total": total,
            "active": active,
            "proUsers": pro_users,
            "plusUsers": plus_users,
            "mrr": round(mrr),
            "totalRevenue": total_revenue,
        },
        "users": paid_users,
    }


# ───────────────────────────────────────────────────────
# POST /admin/alert-trials
# ───────────────────────────────────────────────────────

class AlertTrialsRequest(BaseModel):
    user_ids: list[str]
    template: str = "default"  # "pro" or "plus" or "default"
    channels: list[str] = ["email", "in_app"]
    custom_subject: str | None = None
    custom_body: str | None = None


@router.post("/admin/alert-trials")
async def admin_alert_trials(req: AlertTrialsRequest, x_admin_secret: str = Header(default="")):
    _require_admin(x_admin_secret)

    if not req.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")

    # Fetch users to alert
    users_res = supabase.table("users") \
        .select("id, email, full_name, plan") \
        .in_("id", req.user_ids) \
        .execute()

    users = users_res.data or []
    if not users:
        raise HTTPException(status_code=404, detail="No users found for the given IDs")

    sent = []
    failed = []

    for u in users:
        email = u.get("email") or ""
        name = u.get("full_name") or email.split("@")[0].replace(".", " ").title()
        plan = u.get("plan", "")

        # Default templates
        if "pro" in plan.lower():
            subject = req.custom_subject or "Your Dynamo AI Pro trial ends tomorrow — upgrade now?"
            body = req.custom_body or f"""Hi {name},

Your Dynamo AI Pro trial ends tomorrow.

Don't lose access to:
- DeepThink reasoning mode
- AI Detector & Plagiarism Checker
- 25 images/month & 15 videos/month
- Research Watcher alerts

Upgrade to Pro for just ₹999/month.

[Upgrade Now →]"""
        else:
            subject = req.custom_subject or "Your Dynamo AI Plus trial ends tomorrow — keep the momentum?"
            body = req.custom_body or f"""Hi {name},

Your Dynamo AI Plus trial ends tomorrow.

Don't lose access to:
- 100 messages / day
- Research Mode + citations
- Study guides & quiz tools
- AI memory for your documents

Upgrade to Plus for just ₹399/month.

[Upgrade Now →]"""

        # TODO: Actually send email via Brevo when integration is ready
        # For now, log the alert intent
        try:
            # Log alert in subscription_events for tracking
            supabase.table("subscription_events").insert({
                "user_id": u["id"],
                "event": "admin.alert_sent",
                "payload": {
                    "template": req.template,
                    "channels": req.channels,
                    "subject": subject,
                    "body_preview": body[:200],
                }
            }).execute()
            sent.append({"user_id": u["id"], "email": email, "name": name, "plan": plan})
        except Exception as e:
            failed.append({"user_id": u["id"], "email": email, "error": str(e)})

    return {
        "success": True,
        "sentCount": len(sent),
        "failedCount": len(failed),
        "sent": sent,
        "failed": failed,
    }


# ───────────────────────────────────────────────────────
# GET /admin/usage
# ───────────────────────────────────────────────────────
#
# Cost model (INR at ₹83/$):
#   Chat  — Gemini 3.5 Flash  ~₹0.08 / message
#   Image — ChatGPT DALL·E 3  ~₹3.32 / image  (Stability AI fallback ~₹1.66)
#   Video — Runway Gen-3 Turbo ~₹41.50 / clip
#   Search (Tavily)            ~₹2.08 / search (estimated 1.5 searches per research chat)
#
# Plan revenue (introductory pricing):
#   Plus ₹899/mo  |  Pro ₹1,899/mo  |  Free ₹0

COST_CHAT_PER_MSG   = 0.08    # ₹
COST_IMAGE_PER_IMG  = 3.32    # ₹ (ChatGPT DALL·E 3 primary)
COST_VIDEO_PER_CLIP = 41.50   # ₹ (Runway Gen-3 Turbo min)
COST_SEARCH_PER_QRY = 2.08    # ₹ (Tavily, ~1.5 searches per research chat)

PLAN_REVENUE = {
    "free":           0,
    "plus":           899,
    "plus_trial":     0,
    "pro":            1899,
    "pro_trial":      0,
    "pro_validation": 0,
}


def _estimate_cost(chats: int, images: int, videos: int) -> float:
    search_est = chats * 0.3 * COST_SEARCH_PER_QRY  # ~30% of chats use search
    return round(
        chats  * COST_CHAT_PER_MSG +
        images * COST_IMAGE_PER_IMG +
        videos * COST_VIDEO_PER_CLIP +
        search_est,
        2
    )


@router.get("/admin/usage")
async def admin_usage(period: str = "month", x_admin_secret: str = Header(default="")):
    _require_admin(x_admin_secret)

    # ── Period window ──────────────────────────────
    now = _now()
    if period == "day":
        period_start = (now - timedelta(days=1)).isoformat()
        period_label = "Today"
    elif period == "week":
        period_start = (now - timedelta(days=7)).isoformat()
        period_label = "Last 7 days"
    else:
        period = "month"
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_start = first_of_month.isoformat()
        period_label = now.strftime("%B %Y")

    # ── Fetch all users ────────────────────────────
    res = supabase.table("users") \
        .select("id, email, full_name, plan, image_count_used, video_count_used, quota_month, created_at") \
        .execute()
    users_data = res.data or []
    user_map = {u["id"]: u for u in users_data}

    # ── Fetch actual chat counts from messages table ─
    # Step 1: get all chats (id → user_id mapping)
    chats_res = supabase.table("chats").select("id, user_id").execute()
    chat_to_user: dict = {}
    for c in (chats_res.data or []):
        if c.get("id") and c.get("user_id"):
            chat_to_user[c["id"]] = c["user_id"]

    # Step 2: count user-role messages in the period (each = one user query)
    chat_counts: dict = {}
    try:
        msgs_res = supabase.table("messages") \
            .select("chat_id") \
            .eq("role", "user") \
            .gte("created_at", period_start) \
            .execute()
        for msg in (msgs_res.data or []):
            cid = msg.get("chat_id")
            uid = chat_to_user.get(cid)
            if uid:
                chat_counts[uid] = chat_counts.get(uid, 0) + 1
    except Exception as e:
        print("Usage: messages query error:", e)
        # Fallback: use daily_quota_used for day period
        fallback_res = supabase.table("users").select("id, daily_quota_used").execute()
        for u in (fallback_res.data or []):
            chat_counts[u["id"]] = u.get("daily_quota_used") or 0

    # ── Per-user rows ──────────────────────────────
    rows = []
    for u in users_data:
        uid       = u.get("id")
        plan      = (u.get("plan") or "free").lower()
        chats     = chat_counts.get(uid, 0)              # real count from messages table
        images    = u.get("image_count_used") or 0       # always current month
        videos    = u.get("video_count_used") or 0       # always current month
        email     = u.get("email") or ""
        name      = (
            u.get("full_name")
            or email.split("@")[0].replace(".", " ").title()
            or "Unknown"
        )

        est_cost    = _estimate_cost(chats, images, videos)
        revenue     = PLAN_REVENUE.get(plan, 0)
        margin      = revenue - est_cost
        margin_pct  = round((margin / revenue * 100) if revenue > 0 else 0, 1)

        # Flags
        is_at_risk           = revenue > 0 and margin < 0
        is_upgrade_candidate = plan == "free" and chats >= 8

        rows.append({
            "id":          uid,
            "name":        name,
            "email":       email,
            "plan":        plan,
            "chats":       chats,
            "images":      images,
            "videos":      videos,
            "estCost":     est_cost,
            "revenue":     revenue,
            "margin":      round(margin, 2),
            "marginPct":   margin_pct,
            "quotaMonth":  u.get("quota_month") or "",
            "isAtRisk":    is_at_risk,
            "isUpgradeCandidate": is_upgrade_candidate,
            "createdAt":   u.get("created_at") or "",
        })

    # Sort by estimated cost desc
    rows.sort(key=lambda x: x["estCost"], reverse=True)

    # ── Platform-wide aggregates ───────────────────
    total_users   = len(rows)
    active_users  = sum(1 for r in rows if r["chats"] > 0 or r["images"] > 0 or r["videos"] > 0)
    total_cost    = round(sum(r["estCost"] for r in rows), 2)
    total_revenue = sum(r["revenue"] for r in rows)
    total_margin  = round(total_revenue - total_cost, 2)

    chat_cost  = round(sum(r["chats"]  * COST_CHAT_PER_MSG   for r in rows), 2)
    image_cost = round(sum(r["images"] * COST_IMAGE_PER_IMG   for r in rows), 2)
    video_cost = round(sum(r["videos"] * COST_VIDEO_PER_CLIP  for r in rows), 2)
    search_cost = round(sum(r["chats"] * 0.3 * COST_SEARCH_PER_QRY for r in rows), 2)

    top_spender = rows[0] if rows else None

    plan_dist = {"free": 0, "plus": 0, "pro": 0, "trial": 0}
    for r in rows:
        p = r["plan"]
        if "trial" in p:
            plan_dist["trial"] += 1
        elif p == "plus":
            plan_dist["plus"] += 1
        elif p == "pro":
            plan_dist["pro"] += 1
        else:
            plan_dist["free"] += 1

    at_risk_count    = sum(1 for r in rows if r["isAtRisk"])
    upgrade_count    = sum(1 for r in rows if r["isUpgradeCandidate"])

    avg_cost_per_active = round(total_cost / active_users, 2) if active_users > 0 else 0

    return {
        "stats": {
            "totalUsers":       total_users,
            "activeUsers":      active_users,
            "totalCost":        total_cost,
            "totalRevenue":     total_revenue,
            "totalMargin":      total_margin,
            "chatCost":         chat_cost,
            "imageCost":        image_cost,
            "videoCost":        video_cost,
            "searchCost":       search_cost,
            "avgCostPerActive": avg_cost_per_active,
            "topSpenderName":   top_spender["name"] if top_spender else "",
            "topSpenderCost":   top_spender["estCost"] if top_spender else 0,
            "planDist":         plan_dist,
            "atRiskCount":      at_risk_count,
            "upgradeCount":     upgrade_count,
        },
        "users": rows,
        "period": period,
        "periodLabel": period_label,
        "costModel": {
            "chatPerMsg":    COST_CHAT_PER_MSG,
            "imagePerImg":   COST_IMAGE_PER_IMG,
            "videoPerClip":  COST_VIDEO_PER_CLIP,
            "searchPerQry":  COST_SEARCH_PER_QRY,
            "chatSource":    f"Real message count from DB ({period_label})",
            "imageSource":   "Supabase image_count_used (current month only — resets monthly)",
            "videoSource":   "Supabase video_count_used (current month only — resets monthly)",
            "searchSource":  "Estimated: ~30% of chats use Tavily search (not tracked separately)",
            "costRates":     "Gemini 3.5 Flash ₹0.08/msg · ChatGPT DALL·E ₹3.32/img · Runway Gen-3 ₹41.50/clip · Tavily ₹2.08/qry",
            "accuracy":      "Chat counts are REAL (messages table). Images/videos are REAL (monthly quota). Search cost is ESTIMATED.",
        },
    }
