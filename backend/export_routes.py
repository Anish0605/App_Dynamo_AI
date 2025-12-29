# export_routes.py — Dynamo AI (FINAL, STABLE)

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from export import pdf, word, ppt

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

# --------------------------------------------------
# ROUTES
# --------------------------------------------------

@router.post("/pdf")
async def export_pdf(payload: dict = Body(...)):
    history = extract_history(payload)
    return pdf(history)


@router.post("/word")
async def export_word(payload: dict = Body(...)):
    history = extract_history(payload)
    return word(history)


@router.post("/ppt")
async def export_ppt(payload: dict = Body(...)):
    history = extract_history(payload)
    return ppt(history)
