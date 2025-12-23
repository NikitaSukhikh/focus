"""Email tools for sending emails via SMTP."""

from .email_tools import EMAIL_TOOLS, execute_email_tool
from .email_client import EmailClient

__all__ = ['EMAIL_TOOLS', 'execute_email_tool', 'EmailClient']
