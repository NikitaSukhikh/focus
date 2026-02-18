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


class SettingsUpdate(BaseModel):
    language: str | None = None


@router.get("", response_model=SettingsResponse)
async def get_settings(session: AsyncSession = Depends(get_session)):
    repo = PreferencesRepository(session)
    prefs = await repo.get()
    return SettingsResponse(language=prefs.language)


@router.patch("", response_model=SettingsResponse)
async def update_settings(body: SettingsUpdate, session: AsyncSession = Depends(get_session)):
    repo = PreferencesRepository(session)
    if body.language is not None:
        prefs = await repo.update_language(body.language)
    else:
        prefs = await repo.get()
    return SettingsResponse(language=prefs.language)
