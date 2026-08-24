# export_routes.py — Dynamo AI (FINAL, STABLE)

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from export import pdf, word, ppt
from supabase_client import get_user_by_firebase_uid, has_paid_access
from request_auth import require_authenticated_user

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)

# --------------------------------------------------
# HISTORY VALIDATOR
# --------------------------------------------------

def extract_history(payload: dict):
    history = payload.get("messages") or payload.get("history")

    if not isinstance(history, list) or not history:
        raise HTTPException(
            status_code=400,
            detail="No valid chat history provided"
        )

    return history


def require_paid_export(payload: dict):
    user = require_authenticated_user(payload.get("user_id", ""), get_user_by_firebase_uid)
    if not has_paid_access(user):
        raise HTTPException(
            status_code=403,
            detail="Export requires an active paid plan. Visit /pricing.html to upgrade.",
        )

# --------------------------------------------------
# ROUTES
# --------------------------------------------------

@router.post("/pdf")
async def export_pdf(payload: dict = Body(...)):
    require_paid_export(payload)
    history = extract_history(payload)
    return pdf(history)


@router.post("/word")
async def export_word(payload: dict = Body(...)):
    require_paid_export(payload)
    history = extract_history(payload)
    return word(history)


@router.post("/ppt")
async def export_ppt(payload: dict = Body(...)):
    require_paid_export(payload)
    history = extract_history(payload)
    return ppt(history)
