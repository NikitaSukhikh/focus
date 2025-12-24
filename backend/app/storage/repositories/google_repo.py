"""
Google Tokens Repository

Data access layer for Google OAuth tokens.
Uses SQLAlchemy async with encryption for sensitive fields.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import json
import base64
from cryptography.fernet import Fernet
from sqlalchemy import select, delete

from app.core.config import get_settings
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal, GoogleToken


logger = get_logger(__name__)


class TokenEncryption:
    """
    Helper class for encrypting and decrypting OAuth tokens.
    Uses Fernet (symmetric encryption).
    """

    def __init__(self, encryption_key: str):
        try:
            if len(encryption_key) == 44 and encryption_key.endswith('='):
                # Valid Fernet key (base64-encoded 32 bytes)
                self._fernet = Fernet(encryption_key.encode())
            else:
                # Convert string to Fernet key
                if len(encryption_key) < 32:
                    raise ValueError(
                        f"Encryption key must be at least 32 characters (got {len(encryption_key)}). "
                        "Please set a secure ENCRYPTION_KEY in your environment variables."
                    )
                key_bytes = encryption_key.encode()[:32]
                fernet_key = base64.urlsafe_b64encode(key_bytes)
                self._fernet = Fernet(fernet_key)
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to initialize token encryption: {e}")
            raise ValueError("Invalid encryption key configuration")

    def encrypt(self, data: str) -> str:
        encrypted_bytes = self._fernet.encrypt(data.encode())
        return encrypted_bytes.decode()

    def decrypt(self, encrypted_data: str) -> str:
        decrypted_bytes = self._fernet.decrypt(encrypted_data.encode())
        return decrypted_bytes.decode()


class GoogleTokensRepository:
    """Repository for Google OAuth tokens backed by SQLite via SQLAlchemy async."""

    def __init__(self):
        settings = get_settings()
        self._encryption = TokenEncryption(settings.security.encryption_key)

    async def save_tokens(
        self,
        user_id: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_uri: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        scopes: Optional[list] = None,
        expires_at: Optional[datetime] = None,
        user_email: Optional[str] = None,
    ) -> bool:
        try:
            encrypted_access_token = self._encryption.encrypt(access_token)
            encrypted_refresh_token = self._encryption.encrypt(refresh_token) if refresh_token else None
            encrypted_client_secret = self._encryption.encrypt(client_secret) if client_secret else None

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(GoogleToken).where(GoogleToken.user_id == user_id)
                )
                token_row = result.scalar_one_or_none()
                if token_row is None:
                    token_row = GoogleToken(user_id=user_id)
                    session.add(token_row)

                token_row.access_token = encrypted_access_token
                token_row.refresh_token = encrypted_refresh_token
                token_row.token_uri = token_uri
                token_row.client_id = client_id
                token_row.client_secret = encrypted_client_secret
                token_row.scopes = scopes or []
                token_row.expires_at = expires_at
                token_row.user_email = user_email
                token_row.updated_at = datetime.utcnow()

                await session.commit()
                await session.refresh(token_row)

            logger.info(
                f"Saved Google OAuth tokens for user {user_id}",
                extra={
                    "user_id": user_id,
                    "user_email": user_email,
                    "scopes": scopes,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                }
            )
            return True

        except Exception as e:
            logger.error(f"Failed to save tokens: {e}", exc_info=True)
            return False

    async def get_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GoogleToken).where(GoogleToken.user_id == user_id)
            )
            token_row = result.scalar_one_or_none()
            if token_row is None:
                logger.debug(f"No tokens found for user {user_id}")
                return None

            try:
                decrypted_access_token = self._encryption.decrypt(token_row.access_token)
                decrypted_refresh_token = (
                    self._encryption.decrypt(token_row.refresh_token) if token_row.refresh_token else None
                )
                decrypted_client_secret = (
                    self._encryption.decrypt(token_row.client_secret) if token_row.client_secret else None
                )
                return {
                    "user_id": token_row.user_id,
                    "access_token": decrypted_access_token,
                    "refresh_token": decrypted_refresh_token,
                    "token_uri": token_row.token_uri,
                    "client_id": token_row.client_id,
                    "client_secret": decrypted_client_secret,
                    "scopes": token_row.scopes or [],
                    "expires_at": token_row.expires_at,
                    "user_email": token_row.user_email,
                    "created_at": token_row.created_at,
                    "updated_at": token_row.updated_at,
                }
            except Exception as e:
                logger.error(f"Failed to decrypt tokens for user {user_id}: {e}", exc_info=True)
                return None

    async def get_tokens_raw(self, user_id: str) -> Optional[GoogleToken]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GoogleToken).where(GoogleToken.user_id == user_id)
            )
            return result.scalar_one_or_none()

    async def has_tokens(self, user_id: str) -> bool:
        return (await self.get_tokens_raw(user_id)) is not None

    async def is_token_valid(self, user_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GoogleToken.expires_at).where(GoogleToken.user_id == user_id)
            )
            expires_at = result.scalar_one_or_none()
            if expires_at is None:
                return False
            return expires_at > datetime.utcnow() + timedelta(minutes=5)

    async def requires_refresh(self, user_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GoogleToken.expires_at).where(GoogleToken.user_id == user_id)
            )
            expires_at = result.scalar_one_or_none()
            if expires_at is None:
                return False
            return expires_at <= datetime.utcnow() + timedelta(minutes=15)

    async def get_user_email(self, user_id: str) -> Optional[str]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GoogleToken.user_email).where(GoogleToken.user_id == user_id)
            )
            return result.scalar_one_or_none()

    async def get_scopes(self, user_id: str) -> Optional[list]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GoogleToken.scopes).where(GoogleToken.user_id == user_id)
            )
            return result.scalar_one_or_none()

    async def has_scope(self, user_id: str, scope: str) -> bool:
        scopes = await self.get_scopes(user_id)
        return bool(scopes and scope in scopes)

    async def update_access_token(
        self,
        user_id: str,
        access_token: str,
        expires_at: Optional[datetime] = None
    ) -> bool:
        try:
            encrypted_access_token = self._encryption.encrypt(access_token)
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(GoogleToken).where(GoogleToken.user_id == user_id)
                )
                token_row = result.scalar_one_or_none()
                if token_row is None:
                    return False
                token_row.access_token = encrypted_access_token
                token_row.expires_at = expires_at
                token_row.updated_at = datetime.utcnow()
                await session.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to update access token: {e}", exc_info=True)
            return False

    async def delete_tokens(self, user_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                delete(GoogleToken).where(GoogleToken.user_id == user_id)
            )
            deleted = result.rowcount or 0
            await session.commit()
            if deleted:
                logger.info(f"Deleted tokens for user {user_id}")
            return bool(deleted)

    async def get_all_accounts(self) -> list[Dict[str, Any]]:
        """
        Get all connected Google accounts.

        Returns:
            List of account information dictionaries
        """
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(GoogleToken))
            accounts = result.scalars().all()

            return [
                {
                    "email": account.user_email or account.user_id,
                    "scopes": account.scopes or [],
                    "connected_at": account.created_at,
                }
                for account in accounts
            ]


# Singleton instance
google_tokens_repository = GoogleTokensRepository()


async def get_repository() -> GoogleTokensRepository:
    """Convenience dependency for DI."""
    return google_tokens_repository
