# memory.py — Dynamo AI (Smart Memory System v2)
# Extracts, deduplicates, and injects rich learning context across sessions

import json
import re
import difflib
import google.generativeai as genai
import config


# --------------------------------------------------
# CATEGORY DEFINITIONS
# --------------------------------------------------
# Priority order for prompt injection (most useful → least)
CATEGORY_PRIORITY = [
    "exam_goal",
    "study_topic",
    "struggle_area",
    "course",
    "academic_level",
    "goal",
    "preference",
    "personal",
    "fact",
]

CATEGORY_LABELS = {
    "exam_goal":      "Exam / Deadline Goals",
    "study_topic":    "Topics Being Studied",
    "struggle_area":  "Areas the User Finds Difficult",
    "course":         "Course / Programme",
    "academic_level": "Academic Level",
    "goal":           "Goals",
    "preference":     "Preferences",
    "personal":       "Personal Info",
    "fact":           "Other Facts",
}


# --------------------------------------------------
# EXTRACTION
# --------------------------------------------------

def extract_memories(user_message: str, ai_response: str) -> list:
    """
    Use Gemini to extract rich learning + personal context from a conversation turn.
    Captures study topics, exam goals, struggles — not just personal facts.
    """
    genai.configure(api_key=config.GEMINI_KEY)

    prompt = (
        f"User said: {user_message[:500]}\n"
        f"AI replied: {ai_response[:300]}\n\n"
        "Extract facts about this USER that would help personalize future responses.\n"
        "Look for:\n"
        "  - What subject / topic they are studying right now\n"
        "  - Which exam they are preparing for (NEET, JEE, UPSC, IELTS, etc.)\n"
        "  - Concepts or subjects they find difficult or confusing\n"
        "  - Their course, college, degree, or academic level\n"
        "  - Explicit preferences (learning style, preferred language, study method)\n"
        "  NOTE: Do NOT capture output format preferences (e.g. JSON, markdown, bullet points).\n"
        "  - Personal info they shared (name, location, job)\n"
        "  - Any goal or deadline they mentioned\n\n"
        "Rules:\n"
        "  - Return [] if the message is a simple general question with no personal context\n"
        "  - Max 4 items total, max 15 words each\n"
        "  - Be specific and concise (e.g. 'preparing for NEET 2025' not 'studying medicine')\n"
        "  - Use ONLY these categories: "
        "personal, preference, goal, fact, study_topic, exam_goal, struggle_area, course, academic_level\n"
        "  - Return ONLY a valid JSON array:\n"
        "    [{\"content\": \"...\", \"category\": \"...\"}]\n"
        "Output:"
    )

    try:
        m = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        r = m.generate_content(prompt)
        text = r.text.strip()
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            items = json.loads(match.group(0))
            if isinstance(items, list):
                valid_cats = set(CATEGORY_PRIORITY)
                return [
                    {
                        "content": str(i.get("content", "")).strip(),
                        "category": i.get("category", "fact") if i.get("category") in valid_cats else "fact"
                    }
                    for i in items
                    if isinstance(i, dict) and len(str(i.get("content", "")).strip()) > 5
                ][:4]
    except Exception as e:
        print(f"Memory extraction error: {e}")
    return []


# --------------------------------------------------
# DEDUPLICATION
# --------------------------------------------------

def _is_duplicate(new_content: str, existing_memories: list, threshold: float = 0.75) -> bool:
    """
    Check if a new memory is too similar to an existing one.
    Uses sequence similarity so minor rephrasing doesn't create duplicates.
    """
    new_lower = new_content.lower().strip()
    for m in existing_memories:
        existing_lower = m.get("content", "").lower().strip()
        ratio = difflib.SequenceMatcher(None, new_lower, existing_lower).ratio()
        if ratio >= threshold:
            return True
    return False


# --------------------------------------------------
# FETCH
# --------------------------------------------------

def fetch_memories(supabase, user_id: str) -> list:
    """
    Fetch memories for a user, prioritised by category importance then recency.
    Returns up to 60 records so format_for_prompt can select the best ones.
    """
    if not supabase or not user_id:
        return []
    try:
        res = supabase.table("user_memories") \
            .select("id, content, category, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(60) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"Fetch memories error: {e}")
        return []


# --------------------------------------------------
# SAVE  (with deduplication)
# --------------------------------------------------

def save_memories(supabase, user_id: str, memories: list):
    """
    Save extracted memories, skipping any that are too similar to existing ones.
    Keeps the total memory store clean and non-redundant.
    """
    if not supabase or not user_id or not memories:
        return
    try:
        existing = fetch_memories(supabase, user_id)
        rows = []
        for m in memories:
            content = m.get("content", "").strip()
            if not content:
                continue
            if _is_duplicate(content, existing):
                print(f"⏭ Skipping duplicate memory: {content[:60]}")
                continue
            rows.append({
                "user_id": user_id,
                "content": content,
                "category": m.get("category", "fact")
            })
            # Add to existing so we don't double-save within this batch
            existing.append({"content": content, "category": m.get("category", "fact")})

        if rows:
            supabase.table("user_memories").insert(rows).execute()
            print(f"✅ Saved {len(rows)} memories for user {user_id}")
        else:
            print(f"⏭ All memories were duplicates — nothing new saved")
    except Exception as e:
        print(f"Save memories error: {e}")


# --------------------------------------------------
# DELETE / CLEAR
# --------------------------------------------------

def delete_memory(supabase, memory_id: str) -> bool:
    if not supabase or not memory_id:
        return False
    try:
        supabase.table("user_memories").delete().eq("id", memory_id).execute()
        return True
    except Exception as e:
        print(f"Delete memory error: {e}")
        return False


def clear_all_memories(supabase, user_id: str) -> bool:
    if not supabase or not user_id:
        return False
    try:
        supabase.table("user_memories").delete().eq("user_id", user_id).execute()
        return True
    except Exception as e:
        print(f"Clear memories error: {e}")
        return False


# --------------------------------------------------
# FORMAT FOR PROMPT  (grouped by priority category)
# --------------------------------------------------

def format_for_prompt(memories: list) -> str:
    """
    Format memories into a structured, grouped block to inject into the system prompt.
    Groups by category in priority order so the AI sees exam goals and study topics first.
    Injects at most 40 memories total.
    """
    if not memories:
        return ""

    # De-duplicate within the fetched set (same content, different rows)
    seen = set()
    unique = []
    for m in memories:
        key = m.get("content", "").lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(m)

    # Group by category
    grouped: dict[str, list[str]] = {}
    for m in unique[:40]:
        cat = m.get("category", "fact")
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(m["content"])

    if not grouped:
        return ""

    lines = []
    for cat in CATEGORY_PRIORITY:
        if cat in grouped:
            label = CATEGORY_LABELS.get(cat, cat.replace("_", " ").title())
            items = grouped[cat]
            lines.append(f"[{label}]")
            for item in items:
                lines.append(f"  • {item}")

    # Any category not in CATEGORY_PRIORITY (edge case)
    for cat, items in grouped.items():
        if cat not in CATEGORY_PRIORITY:
            lines.append(f"[{cat.replace('_', ' ').title()}]")
            for item in items:
                lines.append(f"  • {item}")

    return "\n".join(lines)
