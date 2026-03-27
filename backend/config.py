# app_config.py
import os
from dotenv import load_dotenv

load_dotenv()

# API Keys - Ensure these match your Render Environment Variables exactly
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")
TAVILY_KEY = os.getenv("TAVILY_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
RUNWAY_API_KEY = os.getenv("RUNWAY_API_KEY")

VIDEO_PROMPT_STYLE = (
    "cinematic, smooth motion, ultra realistic, "
    "high quality, 4k, dramatic lighting"
)
# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Identity Branding - Using safe string format for Render stability
DYNAMO_IDENTITY = (
    "My name is **Dynamo AI**, the #1 AI Research OS made in India. "
    "I specialize in deep-data intelligence, visual systems, and professional research."
)
