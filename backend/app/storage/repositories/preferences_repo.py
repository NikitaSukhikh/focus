"""
Preferences Repository

Data access layer for UserPreferences (single-row settings).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import UserPreferences


PREFERENCES_ID = 1


class PreferencesRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self) -> UserPreferences:
        result = await self._session.execute(
            select(UserPreferences).where(UserPreferences.id == PREFERENCES_ID)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = UserPreferences(id=PREFERENCES_ID)
            self._session.add(row)
            await self._session.commit()
            await self._session.refresh(row)
        return row

    async def update(
        self,
        language: str | None = None,
        intro_seen: bool | None = None,
    ) -> UserPreferences:
        row = await self.get()
        if language is not None:
            row.language = language
        if intro_seen is not None:
            row.intro_seen = intro_seen
        await self._session.commit()
        await self._session.refresh(row)
        return row
