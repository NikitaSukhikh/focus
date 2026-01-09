"""
Gmail OAuth authentication and email sending.

Uses the shared Google OAuth manager for authentication (same as Google Drive).
This allows a single OAuth flow to grant access to both Gmail and Drive.
"""

import base64
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from googleapiclient.errors import HttpError
from ..gdrive.oauth_manager import GDriveOAuthManager

logger = logging.getLogger(__name__)


class GmailOAuthClient:
    """
    Gmail client using OAuth 2.0 authentication.

    Uses the shared Google OAuth manager, so a single authentication
    grants access to both Gmail and Google Drive.
    """

    def __init__(self):
        """Initialize the Gmail OAuth client using shared Google auth."""
        # Use the shared Google OAuth manager
        self.oauth_manager = GDriveOAuthManager()

    def is_authenticated(self) -> bool:
        """
        Check if user is authenticated with Google (covers both Gmail and Drive).

        Returns:
            True if authenticated with valid credentials
        """
        return self.oauth_manager.is_authenticated()

    def get_auth_status(self) -> Dict[str, Any]:
        """
        Get authentication status.

        Returns:
            Dictionary with authentication status
        """
        is_authenticated = self.is_authenticated()
        return {
            'success': True,
            'authenticated': is_authenticated,
            'provider': 'google',  # Single Google auth for both Gmail and Drive
            'message': 'Using shared Google OAuth (Gmail + Drive)' if is_authenticated else 'Not authenticated'
        }

    def _get_service(self):
        """Get Gmail API service using shared OAuth manager."""
        return self.oauth_manager.get_gmail_service()

    def send_email(
        self,
        to_addresses: List[str],
        subject: str,
        body: str,
        cc_addresses: Optional[List[str]] = None,
        bcc_addresses: Optional[List[str]] = None,
        attachment_paths: Optional[List[str]] = None,
        html: bool = False
    ) -> Dict[str, Any]:
        """
        Send an email using Gmail API.

        Args:
            to_addresses: List of recipient email addresses
            subject: Email subject
            body: Email body content
            cc_addresses: Optional list of CC recipients
            bcc_addresses: Optional list of BCC recipients
            attachment_paths: Optional list of file paths to attach
            html: Whether the body is HTML

        Returns:
            Dictionary with send status
        """
        try:
            service = self._get_service()

            # Create message
            message = MIMEMultipart()
            message['To'] = ', '.join(to_addresses)
            message['Subject'] = subject

            if cc_addresses:
                message['Cc'] = ', '.join(cc_addresses)

            # Add body
            body_type = 'html' if html else 'plain'
            message.attach(MIMEText(body, body_type))

            # Add attachments
            if attachment_paths:
                for file_path in attachment_paths:
                    try:
                        path = Path(file_path)
                        if not path.exists():
                            logger.warning(f"Attachment not found: {file_path}")
                            continue

                        with open(path, 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())

                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename={path.name}'
                        )
                        message.attach(part)
                        logger.info(f"Attached file: {path.name}")
                    except Exception as e:
                        logger.error(f"Failed to attach file {file_path}: {e}")

            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

            # Send message
            send_result = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()

            logger.info(f"Email sent successfully via Gmail to {', '.join(to_addresses)}")

            return {
                'success': True,
                'message': f'Email sent successfully to {", ".join(to_addresses)}',
                'message_id': send_result.get('id'),
                'recipients': to_addresses,
                'cc': cc_addresses or [],
                'bcc': bcc_addresses or [],
                'attachments': len(attachment_paths) if attachment_paths else 0
            }

        except HttpError as e:
            error_msg = f"Gmail API error: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Failed to send email via Gmail: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                'success': False,
                'error': error_msg
            }
