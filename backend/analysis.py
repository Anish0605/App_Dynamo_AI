# analysis.py — Dynamo AI (FINAL, SAFE, STRUCTURED, UI-FRIENDLY)

import io
import base64
import mimetypes

import pandas as pd
import matplotlib
matplotlib.use("Agg")  # REQUIRED for server environments
import matplotlib.pyplot as plt

from pypdf import PdfReader
from docx import Document
import google.generativeai as genai
import config


# --------------------------------------------------
# UNIVERSAL FILE ANALYSIS ENGINE
# --------------------------------------------------

def process_file_universally(file_bytes: bytes, filename: str):
    fn = filename.lower()

    try:
        # ==================================================
        # 1️⃣ TABULAR DATA (CSV / EXCEL)
        # ==================================================
        if fn.endswith((".csv", ".xlsx", ".xls")):

            try:
                if fn.endswith(".csv"):
                    df = pd.read_csv(
                        io.BytesIO(file_bytes),
                        encoding="utf-8",
                        errors="ignore"
                    )
                else:
                    df = pd.read_excel(io.BytesIO(file_bytes))
            except Exception:
                return {
                    "type": "text",
                    "content": "Unable to read tabular data.",
                    "insight": "File format not supported or corrupted."
                }

            # 🔒 Clean & normalize dataframe
            df = df.fillna("").astype(str)

            columns = list(df.columns)
            rows = df.head(10).values.tolist()

            # Detect numeric columns (for chart)
            numeric_df = df.apply(pd.to_numeric, errors="coerce")
            numeric_df = numeric_df.dropna(axis=1, how="all")

            # -------------------------------
            # 📊 Chart + Table
            # -------------------------------
            if not numeric_df.empty:
                plt.figure(figsize=(10, 5))
                numeric_df.head(10).plot(kind="bar", color="#EAB308")
                plt.title(f"Dynamo Analysis: {filename}")
                plt.tight_layout()

                buf = io.BytesIO()
                plt.savefig(buf, format="png")
                plt.close()
                buf.seek(0)

                img_b64 = base64.b64encode(buf.read()).decode()

                return {
                    "type": "chart",
                    "image": "data:image/png;base64," + img_b64,
                    "columns": columns,
                    "rows": rows,
                    "insight": f"Extracted numeric trends from {filename}. Showing first 10 rows."
                }

            # -------------------------------
            # 📋 Table only
            # -------------------------------
            return {
                "type": "table",
                "columns": columns,
                "rows": rows,
                "insight": f"Preview of first 10 rows from {filename}. No numeric columns detected."
            }

        # ==================================================
        # 2️⃣ DOCUMENTS (PDF / DOCX / TXT)
        # ==================================================
        elif fn.endswith((".pdf", ".docx", ".txt")):
            text = ""

            if fn.endswith(".pdf"):
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"

            elif fn.endswith(".docx"):
                doc = Document(io.BytesIO(file_bytes))
                for para in doc.paragraphs:
                    if para.text:
                        text += para.text + "\n"

            else:  # TXT
                text = file_bytes.decode("utf-8", errors="ignore")

            return {
                "type": "text",
                "content": text[:30000],  # token safety
                "insight": f"Read {filename} successfully."
            }

        # ==================================================
        # 3️⃣ IMAGE / VISION ANALYSIS
        # ==================================================
        elif fn.endswith((".png", ".jpg", ".jpeg", ".webp")):

            if not config.GEMINI_KEY:
                return {
                    "type": "text",
                    "content": "Vision analysis is not configured."
                }

            mime_type = mimetypes.guess_type(filename)[0] or "image/png"
            img_b64 = base64.b64encode(file_bytes).decode()

            image_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": img_b64
                }
            }

            genai.configure(api_key=config.GEMINI_KEY)
            model = genai.GenerativeModel("gemini-2.0-flash")

            response = model.generate_content(
                ["Describe this image for research purposes.", image_part]
            )

            return {
                "type": "vision",
                "content": response.text,
                "image": f"data:{mime_type};base64,{img_b64}",
                "insight": "Visual analysis complete."
            }

    except Exception as e:
        return {
            "type": "text",
            "content": "Analysis failed.",
            "error": str(e)
        }

    # --------------------------------------------------
    # Unsupported file
    # --------------------------------------------------
    return {
        "type": "text",
        "content": "Unsupported file format."
    }
