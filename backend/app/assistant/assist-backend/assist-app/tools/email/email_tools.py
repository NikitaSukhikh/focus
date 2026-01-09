"""
Email tool definitions and executor for Claude API.

Defines the tools that Claude can use to send emails.
"""

import logging
from typing import Dict, Any, List, Optional
from .email_client import EmailClient
from .gmail_oauth import GmailOAuthClient

logger = logging.getLogger(__name__)

# Initialize the email clients
email_client = EmailClient()
gmail_oauth_client = GmailOAuthClient()


# Email Tool Definitions for Claude API
EMAIL_TOOLS = [
    {
        "name": "send_email",
        "description": "Send an email to one or more recipients with optional attachments. Uses Gmail OAuth (if authenticated with Google) or SMTP (if configured). Supports CC, BCC, and file attachments. Check email configuration first with check_email_config.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of recipient email addresses (e.g., ['user@example.com', 'another@example.com'])"
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line"
                },
                "body": {
                    "type": "string",
                    "description": "Email body content (plain text or HTML)"
                },
                "cc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of CC recipient email addresses"
                },
                "bcc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of BCC recipient email addresses"
                },
                "attachments": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of file paths to attach to the email"
                },
                "html": {
                    "type": "boolean",
                    "description": "Whether the body is HTML format (default: false for plain text)"
                }
            },
            "required": ["to", "subject", "body"]
        }
    },
    {
        "name": "check_email_config",
        "description": "Check if email is configured and ready to send. Returns whether Gmail OAuth (via Google authentication) or SMTP is configured. Use this before attempting to send emails to inform the user about available options.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]


async def execute_email_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an email tool.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Dictionary of tool parameters

    Returns:
        Dictionary with tool execution results
    """
    logger.info(f"Executing email tool: {tool_name}")

    try:
        if tool_name == "send_email":
            return _send_email(**tool_input)
        elif tool_name == "check_email_config":
            return _check_email_config()
        else:
            return {
                "success": False,
                "error": f"Unknown email tool: {tool_name}"
            }

    except Exception as e:
        error_msg = f"Error executing {tool_name}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "success": False,
            "error": error_msg
        }


def _send_email(
    to: List[str],
    subject: str,
    body: str,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachments: Optional[List[str]] = None,
    html: bool = False
) -> Dict[str, Any]:
    """
    Send an email using the best available method.
    Priority: Gmail OAuth > SMTP

    Args:
        to: List of recipient email addresses
        subject: Email subject
        body: Email body
        cc: Optional list of CC recipients
        bcc: Optional list of BCC recipients
        attachments: Optional list of file paths to attach
        html: Whether body is HTML

    Returns:
        Dictionary with send results
    """
    # Try Gmail OAuth first (more secure)
    if gmail_oauth_client.is_authenticated():
        logger.info("Using Gmail OAuth to send email")
        result = gmail_oauth_client.send_email(
            to_addresses=to,
            subject=subject,
            body=body,
            cc_addresses=cc,
            bcc_addresses=bcc,
            attachment_paths=attachments,
            html=html
        )
        return result

    # Fall back to SMTP
    elif email_client.is_configured():
        logger.info("Using SMTP to send email")
        result = email_client.send_email(
            to_addresses=to,
            subject=subject,
            body=body,
            cc_addresses=cc,
            bcc_addresses=bcc,
            attachment_paths=attachments,
            html=html
        )
        return result

    else:
        return {
            'success': False,
            'error': 'No email method configured. Please set up Gmail OAuth or SMTP in Settings > Integrations.'
        }


def _check_email_config() -> Dict[str, Any]:
    """
    Check email configuration status.
    Checks both Gmail OAuth and SMTP methods.

    Returns:
        Dictionary with configuration status
    """
    gmail_authenticated = gmail_oauth_client.is_authenticated()
    smtp_configured = email_client.is_configured()

    if gmail_authenticated:
        return {
            'success': True,
            'configured': True,
            'method': 'gmail_oauth',
            'message': 'Email is configured via Gmail OAuth (secure, no password storage).'
        }
    elif smtp_configured:
        smtp_status = email_client.get_config_status()
        return {
            'success': True,
            'configured': True,
            'method': 'smtp',
            'message': f"Email is configured via SMTP. Sending from: {smtp_status['from_email']}",
            'from_email': smtp_status['from_email'],
            'from_name': smtp_status['from_name']
        }
    else:
        return {
            'success': True,
            'configured': False,
            'message': 'Email is not configured. Please set up Gmail OAuth (recommended) or SMTP in Settings > Integrations.'
        }
