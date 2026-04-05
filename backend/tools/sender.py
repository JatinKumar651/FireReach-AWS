import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_PASS = os.environ.get("GMAIL_PASS")

def tool_outreach_automated_sender(brief: str, company_name: str, recipient: str, sender: str = None) -> dict:
    """
    Drafts and sends a hyper-personalized email via Gmail SMTP.
    """
    if not sender:
        sender = GMAIL_USER or "yourgmail@gmail.com"  # fallback
    
    subject = f"Connecting regarding {company_name}"
    body = f"Hi there,\n\n{brief}\n\nBest,\nAutomated Agent"

    if not GMAIL_USER or not GMAIL_PASS or GMAIL_USER == "yourgmail@gmail.com":
        print("GMAIL_USER or GMAIL_PASS not found or default! Mocking email send.")
        return {"status": "mock_sent", "recipient": recipient, "subject": subject, "body": body}

    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Create secure connection with server and send email
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(GMAIL_USER, GMAIL_PASS)
            server.sendmail(sender, recipient, msg.as_string())
        
        return {"status": "live_sent", "recipient": recipient, "subject": subject, "body": body}
    except Exception as e:
        return {"status": "error", "message": f"SMTP Error: {str(e)}", "recipient": recipient, "subject": subject, "body": body}
