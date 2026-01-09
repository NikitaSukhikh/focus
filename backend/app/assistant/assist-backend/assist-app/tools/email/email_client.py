"""
Email client for sending emails via SMTP.

Supports sending emails with attachments using various SMTP providers.
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
from typing import Dict, Any, List, Optional
import json

logger = logging.getLogger(__name__)


class EmailClient:
    """Client for sending emails via SMTP."""

    def __init__(self):
        """Initialize the email client with settings from storage or environment."""
        self.config_path = Path(__file__).parent.parent.parent.parent / 'data' / 'email_config.json'
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load email configuration from file or environment variables."""
        config = {}

        # Try to load from config file
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                logger.info("Loaded email config from file")
            except Exception as e:
                logger.warning(f"Failed to load email config from file: {e}")

        # Override with environment variables if present
        if os.getenv('SMTP_HOST'):
            config['smtp_host'] = os.getenv('SMTP_HOST')
        if os.getenv('SMTP_PORT'):
            config['smtp_port'] = int(os.getenv('SMTP_PORT'))
        if os.getenv('SMTP_USERNAME'):
            config['smtp_username'] = os.getenv('SMTP_USERNAME')
        if os.getenv('SMTP_PASSWORD'):
            config['smtp_password'] = os.getenv('SMTP_PASSWORD')
        if os.getenv('SMTP_FROM_EMAIL'):
            config['from_email'] = os.getenv('SMTP_FROM_EMAIL')
        if os.getenv('SMTP_FROM_NAME'):
            config['from_name'] = os.getenv('SMTP_FROM_NAME')
        if os.getenv('SMTP_USE_TLS'):
            config['use_tls'] = os.getenv('SMTP_USE_TLS').lower() == 'true'

        return config

    def save_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save email configuration to file.

        Args:
            config: Email configuration dictionary

        Returns:
            Result dictionary with success status
        """
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            self.config = config
            logger.info("Saved email configuration")
            return {
                'success': True,
                'message': 'Email configuration saved successfully'
            }
        except Exception as e:
            error_msg = f"Failed to save email configuration: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }

    def is_configured(self) -> bool:
        """Check if email client is properly configured."""
        required_fields = ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'from_email']
        return all(field in self.config and self.config[field] for field in required_fields)

    def get_config_status(self) -> Dict[str, Any]:
        """
        Get current configuration status.

        Returns:
            Dictionary with configuration status
        """
        is_configured = self.is_configured()
        return {
            'success': True,
            'configured': is_configured,
            'has_smtp_host': 'smtp_host' in self.config and bool(self.config['smtp_host']),
            'has_credentials': 'smtp_username' in self.config and 'smtp_password' in self.config,
            'from_email': self.config.get('from_email', ''),
            'from_name': self.config.get('from_name', ''),
            'smtp_host': self.config.get('smtp_host', ''),
            'smtp_port': self.config.get('smtp_port', 587),
            'use_tls': self.config.get('use_tls', True)
        }

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
        Send an email with optional attachments.

        Args:
            to_addresses: List of recipient email addresses
            subject: Email subject
            body: Email body content
            cc_addresses: Optional list of CC recipients
            bcc_addresses: Optional list of BCC recipients
            attachment_paths: Optional list of file paths to attach
            html: Whether the body is HTML (default: False, plain text)

        Returns:
            Dictionary with send status
        """
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Email client is not configured. Please configure SMTP settings first.'
            }

        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{self.config.get('from_name', '')} <{self.config['from_email']}>" if self.config.get('from_name') else self.config['from_email']
            msg['To'] = ', '.join(to_addresses)
            msg['Subject'] = subject

            if cc_addresses:
                msg['Cc'] = ', '.join(cc_addresses)

            # Add body
            body_type = 'html' if html else 'plain'
            msg.attach(MIMEText(body, body_type))

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
                        msg.attach(part)
                        logger.info(f"Attached file: {path.name}")
                    except Exception as e:
                        logger.error(f"Failed to attach file {file_path}: {e}")

            # Connect to SMTP server and send
            all_recipients = to_addresses.copy()
            if cc_addresses:
                all_recipients.extend(cc_addresses)
            if bcc_addresses:
                all_recipients.extend(bcc_addresses)

            use_tls = self.config.get('use_tls', True)

            if use_tls:
                # TLS connection (most common: port 587)
                server = smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port'])
                server.starttls()
            else:
                # SSL connection (port 465) or plain (port 25)
                if self.config.get('smtp_port') == 465:
                    server = smtplib.SMTP_SSL(self.config['smtp_host'], self.config['smtp_port'])
                else:
                    server = smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port'])

            # Login
            server.login(self.config['smtp_username'], self.config['smtp_password'])

            # Send email
            server.send_message(msg)
            server.quit()

            logger.info(f"Email sent successfully to {', '.join(to_addresses)}")

            return {
                'success': True,
                'message': f'Email sent successfully to {", ".join(to_addresses)}',
                'recipients': to_addresses,
                'cc': cc_addresses or [],
                'bcc': bcc_addresses or [],
                'attachments': len(attachment_paths) if attachment_paths else 0
            }

        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                'success': False,
                'error': error_msg
            }

    def test_connection(self) -> Dict[str, Any]:
        """
        Test SMTP connection and authentication.

        Returns:
            Dictionary with test results
        """
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Email client is not configured. Please configure SMTP settings first.'
            }

        try:
            use_tls = self.config.get('use_tls', True)

            if use_tls:
                server = smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port'], timeout=10)
                server.starttls()
            else:
                if self.config.get('smtp_port') == 465:
                    server = smtplib.SMTP_SSL(self.config['smtp_host'], self.config['smtp_port'], timeout=10)
                else:
                    server = smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port'], timeout=10)

            server.login(self.config['smtp_username'], self.config['smtp_password'])
            server.quit()

            logger.info("SMTP connection test successful")
            return {
                'success': True,
                'message': 'SMTP connection and authentication successful'
            }

        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"Authentication failed: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Connection test failed: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
