"""API routes for email configuration and sending."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.tools.email.email_client import EmailClient
from app.tools.email.gmail_oauth import GmailOAuthClient

router = APIRouter()

# Initialize email clients
email_client = EmailClient()
gmail_oauth_client = GmailOAuthClient()


class EmailConfig(BaseModel):
    """Email configuration model."""
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    from_email: EmailStr
    from_name: Optional[str] = None
    use_tls: bool = True


class EmailSendRequest(BaseModel):
    """Email send request model."""
    to: List[EmailStr]
    subject: str
    body: str
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    attachments: Optional[List[str]] = None
    html: bool = False


@router.post("/email/config")
async def save_email_config(config: EmailConfig):
    """
    Save email/SMTP configuration.
    """
    config_dict = config.dict()
    result = email_client.save_config(config_dict)
    return result


@router.get("/email/config/status")
async def get_email_config_status():
    """
    Get email configuration status (without exposing sensitive data).
    """
    result = email_client.get_config_status()
    # Don't expose password in the response
    if 'smtp_password' in result:
        del result['smtp_password']
    return result


@router.post("/email/test")
async def test_email_connection():
    """
    Test SMTP connection and authentication.
    """
    result = email_client.test_connection()
    return result


@router.post("/email/send")
async def send_email(request: EmailSendRequest):
    """
    Send an email with optional attachments.
    Note: This endpoint is primarily for testing.
    Claude will use the send_email tool directly during conversations.
    """
    result = email_client.send_email(
        to_addresses=request.to,
        subject=request.subject,
        body=request.body,
        cc_addresses=request.cc,
        bcc_addresses=request.bcc,
        attachment_paths=request.attachments,
        html=request.html
    )
    return result


# Gmail OAuth status endpoint (uses shared Google OAuth)
@router.get("/email/gmail/auth/status")
async def get_gmail_auth_status():
    """
    Get Gmail OAuth authentication status.
    Note: Gmail uses the same Google OAuth as Google Drive.
    """
    result = gmail_oauth_client.get_auth_status()
    return result
