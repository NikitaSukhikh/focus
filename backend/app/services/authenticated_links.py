"""
Authenticated Links Service

Handles seamless opening of links that require authentication.
Supports Google services (Gmail, Drive, Docs, Sheets, Slides) and other OAuth providers.
"""

from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse, parse_qs
import re

from app.core.logging import get_logger
from app.services.google.oauth_flow import google_oauth_service
from app.storage.repositories.google_repo import google_tokens_repository


logger = get_logger(__name__)


class ServiceDetector:
    """Detect which service/provider a URL belongs to."""

    # Gmail patterns
    GMAIL_PATTERNS = [
        r'mail\.google\.com',
        r'gmail\.com'
    ]

    # Google Drive patterns (includes Docs, Sheets, Slides)
    GDRIVE_PATTERNS = [
        r'drive\.google\.com',
        r'docs\.google\.com',
        r'sheets\.google\.com',
        r'slides\.google\.com'
    ]

    # OneDrive patterns (includes Office Online)
    ONEDRIVE_PATTERNS = [
        r'onedrive\.live\.com',
        r'1drv\.ms',
        r'[a-zA-Z0-9\-]+\.sharepoint\.com',
        r'office\.live\.com',
        r'outlook\.live\.com/owa'  # OneDrive accessed through Outlook
    ]

    # Dropbox patterns
    DROPBOX_PATTERNS = [
        r'dropbox\.com',
        r'db\.tt',
        r'paper\.dropbox\.com'
    ]

    # Box patterns
    BOX_PATTERNS = [
        r'box\.com',
        r'app\.box\.com'
    ]

    # iCloud patterns
    ICLOUD_PATTERNS = [
        r'icloud\.com',
        r'iclouddrive\.com'
    ]

    # Notion patterns
    NOTION_PATTERNS = [
        r'notion\.so',
        r'notion\.site'
    ]

    # GitHub patterns
    GITHUB_PATTERNS = [
        r'github\.com/[^/]+/[^/]+(?:/.*)?',  # Private repos
    ]

    # GitLab patterns
    GITLAB_PATTERNS = [
        r'gitlab\.com/[^/]+/[^/]+(?:/.*)?',
    ]

    # Atlassian patterns (Jira, Confluence)
    ATLASSIAN_PATTERNS = [
        r'atlassian\.net',
        r'jira\.com',
        r'confluence\.com'
    ]

    @classmethod
    def detect(cls, url: str) -> Optional[str]:
        """
        Detect which service a URL belongs to.

        Args:
            url: URL to analyze

        Returns:
            Service identifier: 'gmail', 'gdrive', 'onedrive', 'dropbox', etc., or None
        """
        url_lower = url.lower()

        # Check Gmail
        if any(re.search(pattern, url_lower) for pattern in cls.GMAIL_PATTERNS):
            return 'gmail'

        # Check Google Drive (includes Docs, Sheets, Slides)
        if any(re.search(pattern, url_lower) for pattern in cls.GDRIVE_PATTERNS):
            return 'gdrive'

        # Check OneDrive (includes SharePoint, Office Online)
        if any(re.search(pattern, url_lower) for pattern in cls.ONEDRIVE_PATTERNS):
            return 'onedrive'

        # Check Dropbox
        if any(re.search(pattern, url_lower) for pattern in cls.DROPBOX_PATTERNS):
            return 'dropbox'

        # Check Box
        if any(re.search(pattern, url_lower) for pattern in cls.BOX_PATTERNS):
            return 'box'

        # Check iCloud
        if any(re.search(pattern, url_lower) for pattern in cls.ICLOUD_PATTERNS):
            return 'icloud'

        # Check Notion
        if any(re.search(pattern, url_lower) for pattern in cls.NOTION_PATTERNS):
            return 'notion'

        # Check GitHub
        if any(re.search(pattern, url_lower) for pattern in cls.GITHUB_PATTERNS):
            return 'github'

        # Check GitLab
        if any(re.search(pattern, url_lower) for pattern in cls.GITLAB_PATTERNS):
            return 'gitlab'

        # Check Atlassian
        if any(re.search(pattern, url_lower) for pattern in cls.ATLASSIAN_PATTERNS):
            return 'atlassian'

        return None

    @classmethod
    def requires_auth(cls, url: str) -> bool:
        """
        Check if a URL likely requires authentication.

        Args:
            url: URL to check

        Returns:
            True if URL requires authentication
        """
        return cls.detect(url) is not None


class AuthenticatedLinksService:
    """
    Service for handling authenticated link opening.

    Manages:
    - Service detection (Gmail, Drive, GitHub, etc.)
    - Token validation and account selection
    - Authenticated URL generation
    """

    def __init__(self):
        """Initialize the authenticated links service."""
        self.detector = ServiceDetector()
        self.google_oauth = google_oauth_service
        self.google_tokens = google_tokens_repository

    async def prepare_link(
        self,
        url: str,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prepare a link for authenticated opening.

        Args:
            url: Original link URL
            account_email: Optional specific account to use

        Returns:
            Dict with:
                - authenticated_url: URL to open (may be same as original)
                - needs_auth: Whether OAuth flow is needed
                - service: Detected service identifier
                - accounts: Available accounts for this service
                - selected_account: Account that will be used (if any)
        """
        # Detect service
        service = self.detector.detect(url)

        if service is None:
            # No authentication needed - return original URL
            logger.debug(f"No authentication required for URL: {url}")
            return {
                "authenticated_url": url,
                "needs_auth": False,
                "service": None,
                "accounts": [],
                "selected_account": None
            }

        logger.info(f"Detected service '{service}' for URL: {url}")

        # Route to appropriate handler
        if service in ['gmail', 'gdrive']:
            return await self._prepare_google_link(url, service, account_email)
        elif service == 'onedrive':
            return await self._prepare_onedrive_link(url, account_email)
        elif service in ['dropbox', 'box', 'icloud']:
            return await self._prepare_cloud_storage_link(url, service, account_email)
        elif service in ['github', 'gitlab']:
            return await self._prepare_git_service_link(url, service, account_email)
        elif service in ['notion', 'atlassian']:
            return await self._prepare_saas_link(url, service, account_email)
        else:
            # Unknown service - return original URL
            return {
                "authenticated_url": url,
                "needs_auth": False,
                "service": service,
                "accounts": [],
                "selected_account": None
            }

    async def _prepare_google_link(
        self,
        url: str,
        service: str,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prepare Google service link (Gmail, Drive, Docs, Sheets, Slides).

        Args:
            url: Original URL
            service: Service identifier ('gmail' or 'gdrive')
            account_email: Optional specific account to use

        Returns:
            Dict with preparation results
        """
        # Get all Google accounts
        all_accounts = await self.google_tokens.get_all_accounts()

        # Filter valid accounts (not requiring reauth)
        valid_accounts = [
            acc for acc in all_accounts
            if not acc.get('requires_reauth', False)
        ]

        if not valid_accounts:
            # No valid accounts - need OAuth
            logger.info("No valid Google accounts found - OAuth required")
            return {
                "authenticated_url": url,
                "needs_auth": True,
                "service": service,
                "accounts": [],
                "selected_account": None,
                "auth_url": None  # Frontend will trigger OAuth flow
            }

        # Select account
        selected_account = None
        if account_email:
            # Use specified account
            selected_account = next(
                (acc for acc in valid_accounts if acc['email'] == account_email),
                None
            )
            if not selected_account:
                logger.warning(f"Specified account {account_email} not found or invalid")

        if not selected_account:
            # Use first valid account
            selected_account = valid_accounts[0]

        account_email = selected_account['email']
        logger.info(f"Using Google account: {account_email}")

        # Check if token is valid
        is_valid = await self.google_tokens.is_token_valid(account_email)

        if not is_valid:
            # Token expired/invalid - try to refresh
            logger.info(f"Token for {account_email} is invalid - attempting refresh")
            credentials = await self.google_oauth.get_credentials(account_email)

            if not credentials:
                # Refresh failed - need reauth
                logger.warning(f"Token refresh failed for {account_email}")
                return {
                    "authenticated_url": url,
                    "needs_auth": True,
                    "service": service,
                    "accounts": [{"email": acc['email']} for acc in valid_accounts],
                    "selected_account": account_email,
                    "auth_url": None
                }

        # Token is valid - return original URL
        # Google services use browser cookies for auth, not URL params
        # The user's browser will already be authenticated if they're logged in
        logger.info(f"Valid token found for {account_email} - returning original URL")

        return {
            "authenticated_url": url,
            "needs_auth": False,
            "service": service,
            "accounts": [{"email": acc['email']} for acc in valid_accounts],
            "selected_account": account_email,
            "hint": f"Opening with account: {account_email}"
        }

    async def _prepare_onedrive_link(
        self,
        url: str,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prepare OneDrive/SharePoint link.

        Args:
            url: Original URL
            account_email: Optional specific account to use

        Returns:
            Dict with preparation results
        """
        # OneDrive/Microsoft 365 OAuth support - placeholder for future implementation
        # Would require Microsoft OAuth similar to Google
        logger.info("OneDrive/Microsoft 365 authentication not yet implemented")

        return {
            "authenticated_url": url,
            "needs_auth": False,
            "service": "onedrive",
            "accounts": [],
            "selected_account": None,
            "hint": "Tip: Sign in to your Microsoft account in your browser for seamless access"
        }

    async def _prepare_cloud_storage_link(
        self,
        url: str,
        service: str,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prepare cloud storage link (Dropbox, Box, iCloud).

        Args:
            url: Original URL
            service: Service identifier
            account_email: Optional specific account to use

        Returns:
            Dict with preparation results
        """
        # Cloud storage OAuth support - placeholder for future implementation
        logger.info(f"{service.title()} authentication not yet implemented")

        service_names = {
            'dropbox': 'Dropbox',
            'box': 'Box',
            'icloud': 'iCloud'
        }

        return {
            "authenticated_url": url,
            "needs_auth": False,
            "service": service,
            "accounts": [],
            "selected_account": None,
            "hint": f"Tip: Sign in to {service_names.get(service, service)} in your browser for seamless access"
        }

    async def _prepare_git_service_link(
        self,
        url: str,
        service: str,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prepare Git service link (GitHub, GitLab).

        Args:
            url: Original URL
            service: Service identifier ('github' or 'gitlab')
            account_email: Optional specific account to use

        Returns:
            Dict with preparation results
        """
        # Git service OAuth support - placeholder for future implementation
        logger.info(f"{service.title()} authentication not yet implemented")

        service_names = {
            'github': 'GitHub',
            'gitlab': 'GitLab'
        }

        return {
            "authenticated_url": url,
            "needs_auth": False,
            "service": service,
            "accounts": [],
            "selected_account": None,
            "hint": f"Tip: Sign in to {service_names.get(service, service)} in your browser for seamless access"
        }

    async def _prepare_saas_link(
        self,
        url: str,
        service: str,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prepare SaaS application link (Notion, Atlassian).

        Args:
            url: Original URL
            service: Service identifier
            account_email: Optional specific account to use

        Returns:
            Dict with preparation results
        """
        # SaaS OAuth support - placeholder for future implementation
        logger.info(f"{service.title()} authentication not yet implemented")

        service_names = {
            'notion': 'Notion',
            'atlassian': 'Atlassian (Jira/Confluence)'
        }

        return {
            "authenticated_url": url,
            "needs_auth": False,
            "service": service,
            "accounts": [],
            "selected_account": None,
            "hint": f"Tip: Sign in to {service_names.get(service, service)} in your browser for seamless access"
        }

    async def get_available_accounts(self, service: str) -> list[Dict[str, Any]]:
        """
        Get available accounts for a service.

        Args:
            service: Service identifier

        Returns:
            List of account info dicts
        """
        if service in ['gmail', 'gdrive']:
            accounts = await self.google_tokens.get_all_accounts()
            valid_accounts = [
                {"email": acc['email'], "scopes": acc.get('scopes', [])}
                for acc in accounts
                if not acc.get('requires_reauth', False)
            ]
            return valid_accounts

        return []


# Singleton instance
authenticated_links_service = AuthenticatedLinksService()


def get_service() -> AuthenticatedLinksService:
    """
    Get the authenticated links service instance.

    Returns:
        AuthenticatedLinksService: Service instance
    """
    return authenticated_links_service
