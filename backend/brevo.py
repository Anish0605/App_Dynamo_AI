import requests
import config

BREVO_URL = "https://api.brevo.com/v3/smtp/email"

def send_email(to_email, subject, html_content):
    if not config.BREVO_API_KEY:
        return {"error": "Missing API key"}

    payload = {
        "sender": {
            "name": config.BREVO_SENDER_NAME,
            "email": config.BREVO_SENDER_EMAIL
        },
        "to": [
            {"email": to_email}
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": config.BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        res = requests.post(BREVO_URL, json=payload, headers=headers)
        return res.json()
    except Exception as e:
        return {"error": str(e)}
