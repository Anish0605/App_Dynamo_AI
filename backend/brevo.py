import requests
import config

CONTACTS_URL = "https://api.brevo.com/v3/contacts"
EMAIL_URL = "https://api.brevo.com/v3/smtp/email"
LIST_ID = 4


def send_watch_alert(to_email: str, to_name: str, topic: str, summary: str, sources: list) -> bool:
    if not config.BREVO_API_KEY:
        print("BREVO_API_KEY not set — skipping email")
        return False

    sources_html = ""
    for s in sources[:5]:
        url = s.get("url", "#")
        title = (s.get("title") or url)[:80]
        sources_html += f'<li style="margin:6px 0;"><a href="{url}" style="color:#ca8a04;text-decoration:none;font-size:13px;">{title}</a></li>'

    sources_block = (
        f'<p style="font-size:13px;font-weight:700;color:#374151;margin:20px 0 8px;">Sources</p>'
        f'<ul style="margin:0;padding-left:18px;color:#6b7280;">{sources_html}</ul>'
        if sources_html else ""
    )

    greeting = f"Hi {to_name}," if to_name else "Hi,"

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#facc15;padding:24px 28px;text-align:center;">
          <span style="font-size:28px;">🔔</span>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;color:#000;">Research Alert</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#000;opacity:0.7;">Dynamo AI Watcher</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px;">{greeting}</p>
          <p style="font-size:14px;color:#374151;margin:0 0 20px;">There are new developments on the topic you're watching:</p>
          <div style="background:#fefce8;border:1.5px solid #fde047;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">📌 {topic}</p>
          </div>
          <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">What's new</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">{summary}</p>
          {sources_block}
          <div style="margin-top:28px;text-align:center;">
            <a href="https://dynamoai.in" style="display:inline-block;background:#facc15;color:#000;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">Open Dynamo AI →</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">You're receiving this because you set a Research Watch on Dynamo AI. Manage your watches in your profile.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    try:
        r = requests.post(EMAIL_URL, json={
            "sender": {"name": config.BREVO_SENDER_NAME, "email": config.BREVO_SENDER_EMAIL},
            "to": [{"email": to_email, "name": to_name or to_email}],
            "subject": f"🔔 New research alert: {topic[:60]}",
            "htmlContent": html,
        }, headers=_headers(), timeout=15)
        success = r.status_code in (200, 201)
        if not success:
            print(f"Brevo error {r.status_code}: {r.text[:200]}")
        return success
    except Exception as e:
        print(f"Brevo send failed: {e}")
        return False

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
