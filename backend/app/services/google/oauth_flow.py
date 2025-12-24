"""
Google OAuth Flow Service

Handles OAuth 2.0 authorization flow with Google.
Supports Gmail, Drive (including Docs, Sheets, Slides, and other Drive files).
"""

from typing import Dict, Any, Optional
import secrets
from datetime import datetime
from urllib.parse import urlencode
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.storage.repositories.google_repo import google_tokens_repository


logger = get_logger(__name__)
settings = get_settings()


class GoogleOAuthService:
    """
    Service for Google OAuth 2.0 authorization flow.

    Handles:
    - Authorization URL generation
    - OAuth callback processing
    - Token exchange and refresh
    - User info retrieval
    """

    # OAuth scopes for different Google services
    SCOPES = {
        "gmail": "https://www.googleapis.com/auth/gmail.readonly",
        "drive": "https://www.googleapis.com/auth/drive.readonly",
        "drive_metadata": "https://www.googleapis.com/auth/drive.metadata.readonly",
        "docs": "https://www.googleapis.com/auth/documents.readonly",
        "sheets": "https://www.googleapis.com/auth/spreadsheets.readonly",
        "slides": "https://www.googleapis.com/auth/presentations.readonly",
        "userinfo": "https://www.googleapis.com/auth/userinfo.email",
    }

    # Default scopes (can be customized via settings)
    DEFAULT_SCOPES = [
        "gmail",
        "drive",
        "userinfo"
    ]

    def __init__(self):
        """Initialize the OAuth service."""
        self.settings = settings
        self.tokens_repo = google_tokens_repository

        # Build OAuth client config
        self.client_config = {
            "web": {
                "client_id": settings.google.client_id,
                "client_secret": settings.google.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google.redirect_uri],
            }
        }

    def get_authorization_url(
        self,
        scopes: Optional[list] = None,
        state: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate Google OAuth authorization URL.

        Args:
            scopes: List of scope keys (e.g., ["gmail", "drive"])
                   Uses DEFAULT_SCOPES if not provided
            state: Optional state parameter for CSRF protection
                  Generated automatically if not provided

        Returns:
            Dict with 'auth_url' and 'state'
        """
        # Use default scopes if not provided
        if scopes is None:
            scopes = self.DEFAULT_SCOPES

        # Convert scope keys to full scope URLs
        scope_urls = []
        for scope_key in scopes:
            if scope_key in self.SCOPES:
                scope_urls.append(self.SCOPES[scope_key])
            else:
                logger.warning(f"Unknown scope key: {scope_key}")

        # Fallback to settings scopes if no valid scopes
        if not scope_urls:
            scope_urls = settings.google.scopes

        # Generate state token if not provided (CSRF protection)
        if state is None:
            state = secrets.token_urlsafe(32)

        # Create OAuth flow
        flow = Flow.from_client_config(
            self.client_config,
            scopes=scope_urls,
            redirect_uri=settings.google.redirect_uri
        )

        # Generate authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',  # Request refresh token
            include_granted_scopes='true',  # Incremental authorization
            state=state,
            prompt='consent'  # Force consent screen to get refresh token
        )

        logger.info(
            "Generated OAuth authorization URL",
            extra={"scopes": scopes, "state": state}
        )

        return {
            "auth_url": auth_url,
            "state": state
        }

    async def handle_oauth_callback(
        self,
        code: str,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle OAuth callback and exchange code for tokens.

        Args:
            code: Authorization code from Google
            state: State parameter for CSRF validation

        Returns:
            Dict with user info and success status

        Raises:
            ValueError: If code exchange fails or token save fails
        """
        try:
            # Create OAuth flow
            flow = Flow.from_client_config(
                self.client_config,
                scopes=None,  # Scopes are already in the code
                redirect_uri=settings.google.redirect_uri
            )

            # Exchange code for tokens
            flow.fetch_token(code=code)

            # Get credentials
            credentials = flow.credentials

            # Get user info
            user_info = await self._get_user_info(credentials)
            user_email = user_info.get("email", "unknown")

            # Save tokens to repository (use email as user_id for multi-account support)
            await self.tokens_repo.save_tokens(
                user_id=user_email,  # Use email as user_id for multi-account support
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_uri=credentials.token_uri,
                client_id=credentials.client_id,
                client_secret=credentials.client_secret,
                scopes=list(credentials.scopes) if credentials.scopes else [],
                expires_at=credentials.expiry,
                user_email=user_email
            )

            logger.info(
                f"OAuth callback successful for user {user_email}",
                extra={"user_email": user_email, "scopes": list(credentials.scopes or [])}
            )

            return {
                "success": True,
                "message": "Successfully connected to Google",
                "user_email": user_email,
                "scopes": list(credentials.scopes or [])
            }

        except Exception as e:
            logger.error(f"OAuth callback failed: {e}", exc_info=True)
            raise ValueError(f"Failed to complete OAuth authorization: {e}")

    async def _get_user_info(self, credentials: Credentials) -> Dict[str, Any]:
        """
        Get user information using OAuth credentials.

        Args:
            credentials: Google OAuth credentials

        Returns:
            Dict with user info (email, name, etc.)
        """
        try:
            # Build OAuth2 service
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()

            logger.debug(
                "Retrieved user info",
                extra={"email": user_info.get("email")}
            )

            return user_info

        except Exception as e:
            logger.error(f"Failed to get user info: {e}", exc_info=True)
            return {}

    async def get_credentials(
        self,
        user_id: str = "default"
    ) -> Optional[Credentials]:
        """
        Get Google OAuth credentials for a user.

        Automatically refreshes expired tokens.

        Args:
            user_id: User identifier

        Returns:
            Credentials if available, None otherwise
        """
        # Get tokens from repository
        token_data = await self.tokens_repo.get_tokens(user_id)

        if token_data is None:
            logger.debug(f"No tokens found for user {user_id}")
            return None

        # Create credentials object
        credentials = Credentials(
            token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_uri=token_data["token_uri"],
            client_id=token_data["client_id"],
            client_secret=token_data["client_secret"],
            scopes=token_data["scopes"]
        )

        # Set expiry
        if token_data["expires_at"]:
            credentials.expiry = token_data["expires_at"]

        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            try:
                await self._refresh_credentials(credentials, user_id)
            except Exception as e:
                logger.error(f"Failed to refresh credentials: {e}", exc_info=True)
                return None

        return credentials

    async def _refresh_credentials(
        self,
        credentials: Credentials,
        user_id: str
    ) -> None:
        """
        Refresh expired OAuth credentials.

        Args:
            credentials: Credentials to refresh (modified in place)
            user_id: User identifier
        """
        from google.auth.transport.requests import Request

        # Refresh the token
        request = Request()
        credentials.refresh(request)

        # Update tokens in repository
        await self.tokens_repo.update_access_token(
            user_id=user_id,
            access_token=credentials.token,
            expires_at=credentials.expiry
        )

        logger.info(
            f"Refreshed OAuth tokens for user {user_id}",
            extra={"user_id": user_id, "expires_at": credentials.expiry}
        )

    async def disconnect(self, user_id: str = "default") -> bool:
        """
        Disconnect Google account (revoke tokens).

        Args:
            user_id: User identifier

        Returns:
            bool: True if disconnected successfully
        """
        # Get tokens (try provided user_id, then legacy 'default')
        token_data = await self.tokens_repo.get_tokens(user_id)
        token_user_id = user_id

        if token_data is None and user_id != "default":
            token_data = await self.tokens_repo.get_tokens("default")
            token_user_id = "default" if token_data else user_id

        if token_data is None:
            logger.warning(f"No tokens to disconnect for user {user_id}")
            return False

        # Revoke token with Google (optional but recommended)
        try:
            await self._revoke_token(token_data["access_token"])
        except Exception as e:
            logger.warning(f"Failed to revoke token with Google: {e}")

        # Instead of deleting the row (which removes the email), mark it as requiring reauth
        updated = await self.tokens_repo.mark_requires_reauth(
            user_id=token_user_id,
            requires_reauth=True,
            expires_at=datetime.utcnow(),
            refresh_token=None,
            wipe_access_token=True,
        )

        if not updated:
            # Fallback to forcing the flag without token changes
            updated = await self.tokens_repo.force_requires_reauth_flag(token_user_id)

        if updated:
            logger.info(f"Disconnected Google account for user {token_user_id} (requires reauth)")

        return updated

    async def _revoke_token(self, token: str) -> None:
        """
        Revoke an OAuth token with Google.

        Args:
            token: Access token to revoke
        """
        revoke_url = "https://oauth2.googleapis.com/revoke"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                revoke_url,
                params={"token": token},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()

        logger.debug("Revoked OAuth token with Google")

    async def get_connection_status(
        self,
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Get Google connection status for a user.

        Args:
            user_id: User identifier

        Returns:
            Dict with connection status
        """
        token_row = await self.tokens_repo.get_tokens(user_id)

        if not token_row:
            return {
                "connected": False,
                "user_email": None,
                "scopes": [],
                "token_expires_at": None,
                "requires_reauth": False
            }

        requires_reauth_flag = token_row.get("requires_reauth", False)
        is_valid = await self.tokens_repo.is_token_valid(user_id)
        requires_refresh = await self.tokens_repo.requires_refresh(user_id)

        return {
            "connected": bool(is_valid and not requires_reauth_flag),
            "user_email": token_row.get("user_email"),
            "scopes": token_row.get("scopes", []),
            "token_expires_at": token_row.get("expires_at"),
            "requires_reauth": True if requires_reauth_flag else (not is_valid and not token_row.get("refresh_token"))
        }


# Singleton instance
google_oauth_service = GoogleOAuthService()
oauth_service = google_oauth_service  # backward compatibility alias


def get_service() -> GoogleOAuthService:
    """
    Get the Google OAuth service instance.

    Returns:
        GoogleOAuthService: Service instance
    """
    return google_oauth_service
