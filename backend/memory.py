# memory.py — Dynamo AI (AI Memory System)
# Extracts, stores, and retrieves user memories across chat sessions

import json
import re
import google.generativeai as genai
import config


def extract_memories(user_message: str, ai_response: str) -> list:
    """Use Gemini to extract personal facts about the user from a conversation turn."""
    genai.configure(api_key=config.GEMINI_KEY)

    prompt = (
        f"User said: {user_message[:400]}\n"
        f"AI said: {ai_response[:300]}\n\n"
        "Extract ONLY personal facts revealed about the USER from their message.\n"
        "Examples: name, job, location, hobbies, goals, preferences, 'remember that...' statements.\n"
        "Rules:\n"
        "- Return [] if nothing personal was revealed (e.g. just a general question)\n"
        "- Max 2 items, max 12 words each\n"
        "- Return ONLY a valid JSON array: "
        "[{\"content\": \"fact about user\", \"category\": \"personal|preference|goal|fact\"}]\n"
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
                return [
                    {
                        "content": str(i.get("content", "")).strip(),
                        "category": i.get("category", "fact")
                    }
                    for i in items
                    if isinstance(i, dict) and len(str(i.get("content", ""))) > 5
                ][:2]
    except Exception as e:
        print(f"Memory extraction error: {e}")
    return []


def fetch_memories(supabase, user_id: str) -> list:
    """Fetch all memories for a user."""
    if not supabase or not user_id:
        return []
    try:
        res = supabase.table("user_memories") \
            .select("id, content, category, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(30) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"Fetch memories error: {e}")
        return []


def save_memories(supabase, user_id: str, memories: list):
    """Save extracted memories to Supabase."""
    if not supabase or not user_id or not memories:
        return
    try:
        rows = [
            {"user_id": user_id, "content": m["content"], "category": m.get("category", "fact")}
            for m in memories if m.get("content")
        ]
        if rows:
            supabase.table("user_memories").insert(rows).execute()
            print(f"✅ Saved {len(rows)} memories for user {user_id}")
    except Exception as e:
        print(f"Save memories error: {e}")


def delete_memory(supabase, memory_id: str) -> bool:
    """Delete a specific memory by ID."""
    if not supabase or not memory_id:
        return False
    try:
        supabase.table("user_memories").delete().eq("id", memory_id).execute()
        return True
    except Exception as e:
        print(f"Delete memory error: {e}")
        return False


def clear_all_memories(supabase, user_id: str) -> bool:
    """Delete all memories for a user."""
    if not supabase or not user_id:
        return False
    try:
        supabase.table("user_memories").delete().eq("user_id", user_id).execute()
        return True
    except Exception as e:
        print(f"Clear memories error: {e}")
        return False


def format_for_prompt(memories: list) -> str:
    """Format memories into a string block to inject into the system prompt."""
    if not memories:
        return ""
    lines = [f"- {m['content']}" for m in memories if m.get("content")]
    return "\n".join(lines[:20])
