"""
Settings Routes

API endpoints for user preferences/settings.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.db import get_session
from app.storage.repositories.preferences_repo import PreferencesRepository

router = APIRouter()


class SettingsResponse(BaseModel):
    language: str
    intro_seen: bool


class SettingsUpdate(BaseModel):
    language: str | None = None
    intro_seen: bool | None = None


@router.get("", response_model=SettingsResponse)
async def get_settings(session: AsyncSession = Depends(get_session)):
    repo = PreferencesRepository(session)
    prefs = await repo.get()
    return SettingsResponse(language=prefs.language, intro_seen=prefs.intro_seen)


@router.patch("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdate, session: AsyncSession = Depends(get_session)):
    repo = PreferencesRepository(session)
    if body.language is not None or body.intro_seen is not None:
        prefs = await repo.update(language=body.language, intro_seen=body.intro_seen)
    else:
        prefs = await repo.get()
    return SettingsResponse(language=prefs.language, intro_seen=prefs.intro_seen)
