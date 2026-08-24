# documents.py — Dynamo AI Persistent Document Memory
# Summarizes uploaded documents and stores them permanently per user

import json
import re
from google import genai
import config

_client = genai.Client(api_key=config.GEMINI_KEY) if config.GEMINI_KEY else None


# --------------------------------------------------
# SUMMARIZE  (called once on upload)
# --------------------------------------------------

def summarize_document(text: str, filename: str) -> dict:
    """
    Use Gemini to generate a structured summary of a document.
    Returns { summary, key_terms, topics }
    """
    # Cap input to avoid token overflow
    snippet = text[:8000]

    prompt = (
        f"Document filename: {filename}\n\n"
        f"Document content:\n{snippet}\n\n"
        "Generate a structured summary of this document for an AI assistant to use as persistent context.\n\n"
        "Return ONLY valid JSON in this exact format:\n"
        "{\n"
        "  \"summary\": \"2-4 sentence plain-English summary of what this document is about, its main argument/findings, and why it matters\",\n"
        "  \"key_terms\": \"comma-separated list of up to 8 key technical terms or concepts from this document\",\n"
        "  \"topics\": \"comma-separated list of up to 4 subject areas (e.g. machine learning, organic chemistry, constitutional law)\"\n"
        "}\n\n"
        "Output:"
    )

    try:
        r = _client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )
        text_out = r.text.strip()
        # Strip markdown fences
        text_out = re.sub(r"^```[a-z]*\n?", "", text_out).rstrip("```").strip()
        data = json.loads(text_out)
        return {
            "summary":   str(data.get("summary", "")).strip()[:1000],
            "key_terms": str(data.get("key_terms", "")).strip()[:500],
            "topics":    str(data.get("topics", "")).strip()[:300],
        }
    except Exception as e:
        print(f"Document summarization error: {e}")
        # Fallback: use raw truncated text as summary
        return {
            "summary":   text[:400].strip(),
            "key_terms": "",
            "topics":    "",
        }


# --------------------------------------------------
# FETCH
# --------------------------------------------------

def fetch_documents(supabase, user_id: str) -> list:
    """Fetch all saved documents for a user, most recent first."""
    if not supabase or not user_id:
        return []
    try:
        res = supabase.table("user_documents") \
            .select("id, filename, summary, key_terms, topics, upload_date, file_size_kb") \
            .eq("user_id", user_id) \
            .order("upload_date", desc=True) \
            .limit(20) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"Fetch documents error: {e}")
        return []


# --------------------------------------------------
# SAVE
# --------------------------------------------------

def save_document(supabase, user_id: str, filename: str, summary: str,
                  key_terms: str, topics: str, file_size_kb: int = 0) -> dict | None:
    """Save a summarized document to the user_documents table."""
    if not supabase or not user_id:
        return None
    try:
        row = {
            "user_id":      user_id,
            "filename":     filename,
            "summary":      summary,
            "key_terms":    key_terms,
            "topics":       topics,
            "file_size_kb": file_size_kb,
        }
        res = supabase.table("user_documents").insert(row).execute()
        saved = res.data[0] if res.data else None
        if saved:
            print(f"✅ Saved document '{filename}' for user {user_id}")
        return saved
    except Exception as e:
        print(f"Save document error: {e}")
        return None


# --------------------------------------------------
# DELETE
# --------------------------------------------------

def delete_document(supabase, doc_id: str, user_id: str | None = None) -> bool:
    """Delete a document by ID, optionally scoped to its owner."""
    if not supabase or not doc_id:
        return False
    try:
        query = supabase.table("user_documents").delete().eq("id", doc_id)
        if user_id:
            query = query.eq("user_id", user_id)
        query.execute()
        return True
    except Exception as e:
        print(f"Delete document error: {e}")
        return False


def clear_all_documents(supabase, user_id: str) -> bool:
    """Delete all documents for a user."""
    if not supabase or not user_id:
        return False
    try:
        supabase.table("user_documents").delete().eq("user_id", user_id).execute()
        return True
    except Exception as e:
        print(f"Clear documents error: {e}")
        return False


# --------------------------------------------------
# FORMAT FOR PROMPT
# --------------------------------------------------

def format_docs_for_prompt(docs: list) -> str:
    """
    Format saved documents into a structured block for the system prompt.
    The AI sees a clear inventory of documents the user has saved.
    """
    if not docs:
        return ""

    lines = ["The user has saved these documents to their library (use this knowledge naturally):"]
    for i, doc in enumerate(docs[:10], 1):
        name = doc.get("filename", "Unknown")
        summary = doc.get("summary", "")
        terms = doc.get("key_terms", "")
        topics = doc.get("topics", "")

        lines.append(f"\n[Document {i}] {name}")
        if summary:
            lines.append(f"  Summary: {summary}")
        if topics:
            lines.append(f"  Subject areas: {topics}")
        if terms:
            lines.append(f"  Key terms: {terms}")

    return "\n".join(lines)
