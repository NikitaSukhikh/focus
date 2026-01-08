"""
Google Token Store Service

Business logic layer for Google OAuth token management.
Wraps the tokens repository with additional validation and error handling.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from app.storage.repositories.google_repo import google_tokens_repository
from app.core.logging import get_logger


logger = get_logger(__name__)


class GoogleTokenStoreService:
    """
    Service for managing Google OAuth tokens.

    Provides high-level operations for token storage and retrieval.
    """

    def __init__(self):
        """Initialize the token store service."""
        self.repo = google_tokens_repository

    async def store_tokens(
        self,
        user_id: str,
        access_token: str,
        refresh_token: Optional[str],
        scopes: list,
        expires_in: Optional[int] = None,
        user_email: Optional[str] = None,
        **kwargs
    ) -> bool:
        """
        Store Google OAuth tokens for a user.

        Args:
            user_id: User identifier
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            scopes: List of granted scopes
            expires_in: Token expiry in seconds from now
            user_email: User's email address
            **kwargs: Additional token data

        Returns:
            bool: True if stored successfully
        """
        # Calculate expiry datetime
        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Save tokens
        success = await self.repo.save_tokens(
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            scopes=scopes,
            expires_at=expires_at,
            user_email=user_email,
            **kwargs
        )

        if success:
            logger.info(
                f"Stored Google OAuth tokens for user {user_id}",
                extra={"user_id": user_id, "scopes": scopes}
            )

        return success

    async def get_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get Google OAuth tokens for a user.

        Args:
            user_id: User identifier

        Returns:
            Dict with token data if found, None otherwise
        """
        return await self.repo.get_tokens(user_id)

    async def get_access_token(self, user_id: str) -> Optional[str]:
        """
        Get only the access token for a user.

        Args:
            user_id: User identifier

        Returns:
            Access token string if found, None otherwise
        """
        tokens = await self.repo.get_tokens(user_id)

        if tokens:
            return tokens.get("access_token")

        return None

    async def get_refresh_token(self, user_id: str) -> Optional[str]:
        """
        Get only the refresh token for a user.

        Args:
            user_id: User identifier

        Returns:
            Refresh token string if found, None otherwise
        """
        tokens = await self.repo.get_tokens(user_id)

        if tokens:
            return tokens.get("refresh_token")

        return None

    async def delete_tokens(self, user_id: str) -> bool:
        """
        Delete Google OAuth tokens for a user.

        Args:
            user_id: User identifier

        Returns:
            bool: True if deleted successfully
        """
        deleted = await self.repo.delete_tokens(user_id)

        if deleted:
            logger.info(f"Deleted Google OAuth tokens for user {user_id}")

        return deleted

    async def update_access_token(
        self,
        user_id: str,
        access_token: str,
        expires_in: Optional[int] = None
    ) -> bool:
        """
        Update access token after refresh.

        Args:
            user_id: User identifier
            access_token: New access token
            expires_in: Token expiry in seconds from now

        Returns:
            bool: True if updated successfully
        """
        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        return await self.repo.update_access_token(
            user_id=user_id,
            access_token=access_token,
            expires_at=expires_at
        )

    async def is_connected(self, user_id: str) -> bool:
        """
        Check if a user has connected Google account.

        Args:
            user_id: User identifier

        Returns:
            bool: True if connected
        """
        return await self.repo.has_tokens(user_id)

    async def is_token_valid(self, user_id: str) -> bool:
        """
        Check if a user's token is still valid (not expired).

        Args:
            user_id: User identifier

        Returns:
            bool: True if valid
        """
        return await self.repo.is_token_valid(user_id)

    async def requires_refresh(self, user_id: str) -> bool:
        """
        Check if a user's token requires refresh.

        Args:
            user_id: User identifier

        Returns:
            bool: True if refresh needed
        """
        return await self.repo.requires_refresh(user_id)

    async def get_user_email(self, user_id: str) -> Optional[str]:
        """
        Get the email address for a connected Google account.

        Args:
            user_id: User identifier

        Returns:
            Email address if found, None otherwise
        """
        return await self.repo.get_user_email(user_id)

    async def get_scopes(self, user_id: str) -> Optional[list]:
        """
        Get the granted scopes for a user's tokens.

        Args:
            user_id: User identifier

        Returns:
            List of scopes if found, None otherwise
        """
        return await self.repo.get_scopes(user_id)

    async def has_scope(self, user_id: str, scope: str) -> bool:
        """
        Check if a user has a specific scope granted.

        Args:
            user_id: User identifier
            scope: Scope URL to check

        Returns:
            bool: True if scope is granted
        """
        scopes = await self.get_scopes(user_id)

        if scopes is None:
            return False

        return scope in scopes


# Singleton instance
token_store_service = GoogleTokenStoreService()
token_store = token_store_service  # backward compatibility alias


def get_service() -> GoogleTokenStoreService:
    """
    Get the Google token store service instance.

    Returns:
        GoogleTokenStoreService: Service instance
    """
    return token_store_service
