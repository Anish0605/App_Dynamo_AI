"""
Admin CLI for the Pro Validation Programme.

Usage:
  python backend/admin_trial.py create user@example.com [notes]
  python backend/admin_trial.py revoke user@example.com
  python backend/admin_trial.py list
  python backend/admin_trial.py trials
  python backend/admin_trial.py conversions
"""

import sys
import os
import secrets
import string
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

import config
from supabase import create_client

_sb = None

def _get_supabase():
    global _sb
    if _sb is None:
        if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY:
            print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")
            sys.exit(1)
        _sb = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
    return _sb


def _generate_code(length=16):
    alphabet = string.ascii_uppercase + string.digits
    return "DYNAMO-" + "".join(secrets.choice(alphabet) for _ in range(length))


def _print_table(rows, headers):
    if not rows:
        print("  (no results)")
        return
    widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(str(val)))
    fmt = "  " + "  ".join(f"{{:<{w}}}" for w in widths)
    sep = "  " + "  ".join("-" * w for w in widths)
    print(fmt.format(*headers))
    print(sep)
    for row in rows:
        print(fmt.format(*[str(v) for v in row]))


def createInvite(email: str, notes: str = "", days_valid: int = 90):
    sb = _get_supabase()
    code = _generate_code()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=days_valid)).isoformat()
    sb.table("trial_invites").insert({
        "email": email,
        "code": code,
        "notes": notes,
        "revoked": False,
        "expires_at": expires_at,
    }).execute()
    print(f"\n✅ Invite created for {email}")
    print(f"   Code    : {code}")
    print(f"   Expires : {expires_at[:10]} ({days_valid} days)")
    if notes:
        print(f"   Notes   : {notes}")
    print()


def revokeInvite(email: str):
    sb = _get_supabase()
    res = sb.table("trial_invites") \
        .update({"revoked": True}) \
        .eq("email", email) \
        .eq("revoked", False) \
        .execute()
    count = len(res.data) if res.data else 0
    print(f"\n✅ Revoked {count} active invite(s) for {email}\n")


def listInvites():
    sb = _get_supabase()
    res = sb.table("trial_invites") \
        .select("email, code, notes, revoked, used_at, created_at") \
        .order("created_at", desc=True) \
        .execute()
    rows = []
    for r in (res.data or []):
        status = "USED" if r.get("used_at") else ("REVOKED" if r.get("revoked") else "ACTIVE")
        rows.append((
            r.get("email", ""),
            r.get("code", ""),
            status,
            (r.get("used_at") or "")[:10],
            (r.get("created_at") or "")[:10],
            r.get("notes", "") or "",
        ))
    print("\n=== All Invites ===")
    _print_table(rows, ["Email", "Code", "Status", "Used At", "Created", "Notes"])
    print()


def listActiveTrials():
    sb = _get_supabase()
    res = sb.table("subscriptions") \
        .select("user_id, plan, status, razorpay_order_id, expires_at, created_at") \
        .in_("plan", ["pro_trial", "pro_validation"]) \
        .eq("status", "trial_active") \
        .order("created_at", desc=True) \
        .execute()

    user_ids = list({r["user_id"] for r in (res.data or []) if r.get("user_id")})
    emails = {}
    if user_ids:
        ures = sb.table("users").select("id, email").in_("id", user_ids).execute()
        for u in (ures.data or []):
            emails[u["id"]] = u.get("email", "")

    rows = []
    for r in (res.data or []):
        rows.append((
            emails.get(r.get("user_id", ""), "unknown"),
            r.get("status", ""),
            (r.get("expires_at") or "")[:10],
            (r.get("created_at") or "")[:10],
            r.get("razorpay_order_id", ""),
        ))
    print("\n=== Active Pro Validation Trials ===")
    _print_table(rows, ["Email", "Status", "Expires", "Started", "Razorpay Sub ID"])
    print()


def listConversions():
    sb = _get_supabase()
    res = sb.table("subscriptions") \
        .select("user_id, plan, status, created_at") \
        .eq("status", "active") \
        .in_("plan", ["pro", "pro_trial", "pro_validation"]) \
        .order("created_at", desc=True) \
        .execute()

    user_ids = list({r["user_id"] for r in (res.data or []) if r.get("user_id")})
    emails = {}
    if user_ids:
        ures = sb.table("users").select("id, email, plan").in_("id", user_ids).execute()
        for u in (ures.data or []):
            emails[u["id"]] = (u.get("email", ""), u.get("plan", ""))

    rows = []
    for r in (res.data or []):
        uid = r.get("user_id", "")
        email, current_plan = emails.get(uid, ("unknown", ""))
        rows.append((
            email,
            r.get("plan", ""),
            current_plan,
            (r.get("created_at") or "")[:10],
        ))
    print("\n=== Trial → Paid Conversions ===")
    _print_table(rows, ["Email", "Sub Plan", "Current Plan", "Converted At"])
    print()


def listFeedback():
    sb = _get_supabase()
    res = sb.table("trial_feedback") \
        .select("user_id, rating, would_upgrade, feedback_text, created_at") \
        .order("created_at", desc=True) \
        .execute()

    user_ids = list({r["user_id"] for r in (res.data or []) if r.get("user_id")})
    emails = {}
    if user_ids:
        ures = sb.table("users").select("id, email").in_("id", user_ids).execute()
        for u in (ures.data or []):
            emails[u["id"]] = u.get("email", "")

    rows = []
    for r in (res.data or []):
        rows.append((
            emails.get(r.get("user_id", ""), "unknown"),
            r.get("rating") if r.get("rating") is not None else "-",
            "Yes" if r.get("would_upgrade") else ("No" if r.get("would_upgrade") is False else "-"),
            (r.get("feedback_text") or "")[:80],
            (r.get("created_at") or "")[:16],
        ))

    print("\n=== Trial Feedback Responses ===")
    _print_table(rows, ["Email", "Rating", "Would Upgrade", "Feedback (truncated)", "Submitted At"])

    ratings = [r.get("rating") for r in (res.data or []) if r.get("rating") is not None]
    upgrades = [r.get("would_upgrade") for r in (res.data or []) if r.get("would_upgrade") is not None]
    if ratings:
        avg = sum(ratings) / len(ratings)
        print(f"\n  Avg rating     : {avg:.1f} / 5  (n={len(ratings)})")
    if upgrades:
        pct = 100 * sum(upgrades) / len(upgrades)
        print(f"  Would upgrade  : {pct:.0f}%  (n={len(upgrades)})")
    print()


COMMANDS = {
    "create":      (createInvite,   "create <email> [notes]"),
    "revoke":      (revokeInvite,   "revoke <email>"),
    "list":        (listInvites,    "list"),
    "trials":      (listActiveTrials, "trials"),
    "conversions": (listConversions, "conversions"),
    "feedback":    (listFeedback,   "feedback"),
}

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] not in COMMANDS:
        print("\nDynamo AI — Trial Admin CLI")
        print("Usage:")
        for _, (_, usage) in COMMANDS.items():
            print(f"  python backend/admin_trial.py {usage}")
        print()
        sys.exit(0)

    cmd = args[0]
    fn, usage = COMMANDS[cmd]

    if cmd == "create":
        if len(args) < 2:
            print(f"Usage: python backend/admin_trial.py {usage}")
            sys.exit(1)
        notes = " ".join(args[2:]) if len(args) > 2 else ""
        fn(args[1], notes)
    elif cmd == "revoke":
        if len(args) < 2:
            print(f"Usage: python backend/admin_trial.py {usage}")
            sys.exit(1)
        fn(args[1])
    else:
        fn()
