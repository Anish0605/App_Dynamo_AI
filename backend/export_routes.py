# app_export_routes.py — Dynamo AI (FINAL)
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse
from app_export import pdf, word, ppt

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)

def validate_history(history):
    if not isinstance(history, list) or len(history) == 0:
        raise HTTPException(status_code=400, detail="No chat history provided")

    for m in history:
        if "role" not in m or "content" not in m:
            raise HTTPException(
                status_code=400,
                detail="Invalid message format"
            )

@router.post("/pdf")
async def export_pdf(payload: dict = Body(...)):
    history = payload.get("messages")
    validate_history(history)

    response: StreamingResponse = pdf(history)
    response.headers["Content-Disposition"] = (
        "attachment; filename=DynamoAI_Report.pdf"
    )
    return response


@router.post("/word")
async def export_word(payload: dict = Body(...)):
    history = payload.get("messages")
    validate_history(history)

    response: StreamingResponse = word(history)
    response.headers["Content-Disposition"] = (
        "attachment; filename=DynamoAI_Report.docx"
    )
    return response


@router.post("/ppt")
async def export_ppt(payload: dict = Body(...)):
    history = payload.get("messages")
    validate_history(history)

    response: StreamingResponse = ppt(history)
    response.headers["Content-Disposition"] = (
        "attachment; filename=DynamoAI_Report.pptx"
    )
    return response
