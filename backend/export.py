# export.py — Dynamo AI (FINAL, SAFE)

import io
import html
from docx import Document
from pptx import Presentation
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from fastapi.responses import StreamingResponse

# --------------------------------------------------
# HISTORY NORMALIZER
# --------------------------------------------------

def normalize_history(history):
    clean = []

    if not isinstance(history, list):
        return clean

    for m in history:
        if not isinstance(m, dict):
            continue

        role = m.get("role")
        content = m.get("content")

        if role in ("user", "assistant") and content:
            clean.append({
                "role": role,
                "content": str(content)
            })

    return clean

# --------------------------------------------------
# WORD EXPORT
# --------------------------------------------------

def word(history):
    history = normalize_history(history)

    doc = Document()
    doc.add_heading("Dynamo AI Research Report", 0)

    for m in history:
        role = "User" if m["role"] == "user" else "Dynamo AI"
        doc.add_heading(role, level=1)
        doc.add_paragraph(m["content"])

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=DynamoAI_Report.docx"}
    )

# --------------------------------------------------
# POWERPOINT EXPORT
# --------------------------------------------------

def ppt(history):
    history = normalize_history(history)

    prs = Presentation()

    for m in history[-5:]:
        if m["role"] == "assistant":
            slide = prs.slides.add_slide(prs.slide_layouts[1])
            slide.shapes.title.text = "Research Insight"
            slide.placeholders[1].text = m["content"][:700]

    buf = io.BytesIO()
    prs.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": "attachment; filename=DynamoAI_Report.pptx"}
    )

# --------------------------------------------------
# PDF EXPORT
# --------------------------------------------------

def pdf(history):
    history = normalize_history(history)

    buf = io.BytesIO()
    pdf_doc = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()

    story = [
        Paragraph("Dynamo AI Intelligence Report", styles["Title"]),
        Spacer(1, 12)
    ]

    for m in history:
        role = "User:" if m["role"] == "user" else "Dynamo AI:"
        safe_text = html.escape(m["content"])

        story.append(
            Paragraph(f"<b>{role}</b> {safe_text}", styles["Normal"])
        )
        story.append(Spacer(1, 12))

    pdf_doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=DynamoAI_Report.pdf"}
    )
