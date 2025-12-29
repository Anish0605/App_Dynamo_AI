# presentation_engine.py — Dynamo AI

import io
from pptx import Presentation
from pptx.util import Inches, Pt
from fastapi.responses import StreamingResponse

def build_presentation(pres_json: dict):
    prs = Presentation()

    # -------------------------
    # Title Slide
    # -------------------------
    title_slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_slide.shapes.title.text = pres_json.get("title", "Dynamo AI Presentation")
    subtitle = title_slide.placeholders[1]
    subtitle.text = pres_json.get("subtitle", "")

    # -------------------------
    # Content Slides
    # -------------------------
    for slide in pres_json.get("slides", []):
        slide_type = slide.get("type", "content")

        # ---- CONTENT SLIDE
        if slide_type in ("content", "conclusion"):
            s = prs.slides.add_slide(prs.slide_layouts[1])
            s.shapes.title.text = slide.get("title", "")

            body = s.placeholders[1].text_frame
            body.clear()

            for point in slide.get("bullets", []):
                p = body.add_paragraph()
                p.text = point
                p.level = 0

        # ---- TWO COLUMN SLIDE
        elif slide_type == "two_column":
            s = prs.slides.add_slide(prs.slide_layouts[5])
            s.shapes.title.text = slide.get("title", "")

            left_box = s.shapes.add_textbox(Inches(0.5), Inches(1.8), Inches(4.5), Inches(4))
            right_box = s.shapes.add_textbox(Inches(5.2), Inches(1.8), Inches(4.5), Inches(4))

            for box, points in [
                (left_box, slide.get("left", [])),
                (right_box, slide.get("right", []))
            ]:
                tf = box.text_frame
                tf.clear()
                for pt in points:
                    p = tf.add_paragraph()
                    p.text = pt
                    p.level = 0

    # -------------------------
    # STREAM RESPONSE
    # -------------------------
    buf = io.BytesIO()
    prs.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": "attachment; filename=DynamoAI_Presentation.pptx"
        }
    )
