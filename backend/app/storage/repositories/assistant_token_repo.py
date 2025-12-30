"""
Assistant Tokens Repository

Data access layer for Assistant OAuth tokens.
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
from app.storage.db import AsyncSessionLocal, AssistantToken


logger = get_logger(__name__)


class TokenEncryption:
    """
    Helper class for encrypting and decrypting OAuth tokens.
    Uses Fernet (symmetric encryption).
    """

    def __init__(self, encryption_key: str):
        key = encryption_key.strip()
        if len(key) == 44 and key.endswith("="):
            fernet_key = key.encode()
        else:
            if len(key) < 32:
                raise ValueError(
                    f"Encryption key must be a 32-byte urlsafe base64 Fernet key or >=32 chars for derivation (got {len(key)}). "
                    "Set ENCRYPTION_KEY to a secure value."
                )
            key_bytes = key.encode()[:32]
            fernet_key = base64.urlsafe_b64encode(key_bytes)

        try:
            self._fernet = Fernet(fernet_key)
        except Exception as e:
            logger.error(f"Failed to initialize token encryption: {e}")
            raise ValueError("Invalid encryption key configuration")

    def encrypt(self, data: str) -> str:
        encrypted_bytes = self._fernet.encrypt(data.encode())
        return encrypted_bytes.decode()

    def decrypt(self, encrypted_data: str) -> str:
        decrypted_bytes = self._fernet.decrypt(encrypted_data.encode())
        return decrypted_bytes.decode()


class AssistantTokenRepository:
    """Repository for Assistant OAuth tokens backed by SQLite via SQLAlchemy async."""

    def __init__(self):
        settings = get_settings()
        self._encryption = TokenEncryption(settings.security.encryption_key)

    async def save_tokens(
        self,
        user_email: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_uri: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        scopes: Optional[list] = None,
        expires_at: Optional[datetime] = None,
    ) -> bool:
        try:
            encrypted_access_token = self._encryption.encrypt(access_token)
            encrypted_refresh_token = self._encryption.encrypt(refresh_token) if refresh_token else None
            encrypted_client_secret = self._encryption.encrypt(client_secret) if client_secret else None

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(AssistantToken).where(AssistantToken.user_id == user_email)
                )
                token_row = result.scalar_one_or_none()
                if token_row is None:
                    token_row = AssistantToken(user_id=user_email)
                    session.add(token_row)

                token_row.access_token = encrypted_access_token
                token_row.refresh_token = encrypted_refresh_token
                token_row.token_uri = token_uri
                token_row.client_id = client_id
                token_row.client_secret = encrypted_client_secret
                token_row.scopes = scopes or []
                token_row.expires_at = expires_at
                token_row.requires_reauth = False
                token_row.updated_at = datetime.utcnow()

                await session.commit()
                await session.refresh(token_row)

            logger.info(
                f"Saved assistant OAuth tokens for {user_email}",
                extra={
                    "user_email": user_email,
                    "scopes": scopes,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                }
            )
            return True

        except Exception as e:
            logger.error(f"Failed to save assistant tokens for {user_email}: {e}", exc_info=True)
            return False

    async def get_tokens(self, user_email: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AssistantToken).where(AssistantToken.user_id == user_email)
            )
            token_row = result.scalar_one_or_none()
            if token_row is None:
                logger.debug(f"No assistant tokens found for {user_email}")
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
                    "user_email": user_email,
                    "access_token": decrypted_access_token,
                    "refresh_token": decrypted_refresh_token,
                    "token_uri": token_row.token_uri,
                    "client_id": token_row.client_id,
                    "client_secret": decrypted_client_secret,
                    "scopes": token_row.scopes or [],
                    "expires_at": token_row.expires_at,
                    "requires_reauth": token_row.requires_reauth,
                    "created_at": token_row.created_at,
                    "updated_at": token_row.updated_at,
                }
            except Exception as e:
                logger.error(f"Failed to decrypt assistant tokens for {user_email}: {e}", exc_info=True)
                return None

    async def has_tokens(self, user_email: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AssistantToken).where(AssistantToken.user_id == user_email)
            )
            return result.scalar_one_or_none() is not None

    async def is_token_valid(self, user_email: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AssistantToken.expires_at, AssistantToken.requires_reauth).where(
                    AssistantToken.user_id == user_email
                )
            )
            row = result.one_or_none()
            if row is None:
                return False
            expires_at, requires_reauth = row
            if requires_reauth:
                return False
            if expires_at is None:
                return False
            return expires_at > datetime.utcnow() + timedelta(minutes=5)

    async def requires_refresh(self, user_email: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AssistantToken.expires_at).where(AssistantToken.user_id == user_email)
            )
            expires_at = result.scalar_one_or_none()
            if expires_at is None:
                return False
            return expires_at <= datetime.utcnow() + timedelta(minutes=15)

    async def get_scopes(self, user_email: str) -> Optional[list]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AssistantToken.scopes).where(AssistantToken.user_id == user_email)
            )
            return result.scalar_one_or_none()

    async def has_scope(self, user_email: str, scope: str) -> bool:
        scopes = await self.get_scopes(user_email)
        return bool(scopes and scope in scopes)

    async def update_access_token(
        self,
        user_email: str,
        access_token: str,
        expires_at: Optional[datetime] = None
    ) -> bool:
        try:
            encrypted_access_token = self._encryption.encrypt(access_token)
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(AssistantToken).where(AssistantToken.user_id == user_email)
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
            logger.error(f"Failed to update assistant access token for {user_email}: {e}", exc_info=True)
            return False

    async def delete_tokens(self, user_email: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                delete(AssistantToken).where(AssistantToken.user_id == user_email)
            )
            deleted = result.rowcount or 0
            await session.commit()
            if deleted:
                logger.info(f"Deleted assistant tokens for {user_email}")
            return bool(deleted)

    async def mark_requires_reauth(self, user_email: str, requires_reauth: bool = True) -> bool:
        """Mark assistant tokens as requiring re-auth."""
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(AssistantToken).where(AssistantToken.user_id == user_email)
                )
                token_row = result.scalar_one_or_none()
                if token_row is None:
                    return False

                token_row.requires_reauth = requires_reauth
                token_row.expires_at = datetime.utcnow()
                token_row.refresh_token = None
                token_row.updated_at = datetime.utcnow()
                await session.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to mark assistant requires_reauth for {user_email}: {e}", exc_info=True)
            return False

    async def get_all_accounts(self) -> list[Dict[str, Any]]:
        """Get all connected assistant Google accounts."""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AssistantToken))
            accounts = result.scalars().all()

            return [
                {
                    "email": account.user_id,
                    "scopes": account.scopes or [],
                    "connected_at": account.created_at,
                    "requires_reauth": account.requires_reauth,
                    "expires_at": account.expires_at,
                }
                for account in accounts
            ]


# Singleton instance
assistant_token_repository = AssistantTokenRepository()


async def get_repository() -> AssistantTokenRepository:
    """Convenience dependency for DI."""
    return assistant_token_repository
