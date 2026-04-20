import requests
import config

CONTACTS_URL = "https://api.brevo.com/v3/contacts"
EMAIL_URL = "https://api.brevo.com/v3/smtp/email"
LIST_ID = 4

def _headers():
    return {
        "accept": "application/json",
        "api-key": config.BREVO_API_KEY,
        "content-type": "application/json"
    }

def add_contact(email):
    if not config.BREVO_API_KEY:
        return {"error": "Missing API key"}
    try:
        res = requests.post(CONTACTS_URL, json={
            "email": email,
            "listIds": [LIST_ID],
            "updateEnabled": True
        }, headers=_headers())
        return res.json()
    except Exception as e:
        return {"error": str(e)}

def send_welcome_email(email):
    if not config.BREVO_API_KEY:
        return {"error": "Missing API key"}
    try:
        res = requests.post(EMAIL_URL, json={
            "sender": {
                "name": config.BREVO_SENDER_NAME,
                "email": config.BREVO_SENDER_EMAIL
            },
            "to": [{"email": email}],
            "subject": "Welcome to Dynamo AI 🚀",
            "htmlContent": """
            <h2>Welcome to Dynamo AI 🚀</h2>
            <p>Hey 👋</p>
            <p>You've successfully signed up.</p>
            <p>👉 Try Research Mode now.</p>
            <a href="https://app.dynamoai.in">Open App</a>
            """
        }, headers=_headers())
        return res.json()
    except Exception as e:
        return {"error": str(e)}
