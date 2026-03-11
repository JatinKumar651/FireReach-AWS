import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.environ.get("RESEND_API_KEY")

def tool_outreach_automated_sender(brief: str, company_name: str, recipient: str, sender: str = "onboarding@resend.dev") -> dict:
    """
    Drafts and sends a hyper-personalized email via Resend API using the brief.
    """
    subject = f"Connecting regarding {company_name}"
    body = f"Hi there,\n\n{brief}\n\nBest,\nAutomated Agent"

    if not resend.api_key or resend.api_key == "your_resend_api_key_here":
        print("RESEND_API_KEY not found or default! Mocking email send.")
        return {"status": "mock_sent", "recipient": recipient, "subject": subject, "body": body}

    try:
        r = resend.Emails.send({
            "from": sender,
            "to": recipient,
            "subject": subject,
            "text": body,
        })
        return {"status": "live_sent", "id": r.get('id', 'unknown_id'), "recipient": recipient, "subject": subject, "body": body}
    except Exception as e:
        return {"status": "error", "message": f"Resend API Error: {str(e)}", "recipient": recipient, "subject": subject, "body": body}
