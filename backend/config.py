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

# Image Generation Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")

# Video Generation
RUNWAY_API_KEY = os.getenv("RUNWAY_API_KEY")

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# APIMart (Multi-Model Research Pipeline)
APIMART_API_KEY = os.getenv("APIMART_API_KEY")

# Razorpay Config
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

# Identity Branding - Using safe string format for Render stability
DYNAMO_IDENTITY = (
    "My name is **Dynamo AI**, the #1 AI Research OS made in India. "
    "I specialize in deep-data intelligence, visual systems, and professional research."
)
