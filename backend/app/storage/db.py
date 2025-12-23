"""
Async database setup and ORM models.

This module configures the SQLAlchemy async engine/session and defines the
core tables for islands, objects, and Google tokens.
"""

import uuid
from typing import AsyncGenerator

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
    func,
    Index,
)
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, relationship

from app.core.config import get_settings


# Base declarative class
Base = declarative_base()


# Models

class Island(Base):
    """Islands table (workspaces)."""

    __tablename__ = "islands"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)
    position = Column(Integer, nullable=False, default=0, server_default="0")
    object_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    objects = relationship("Object", back_populates="island", cascade="all, delete-orphan")


class Object(Base):
    """Objects table (items on islands)."""

    __tablename__ = "objects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    island_id = Column(String, ForeignKey("islands.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list, server_default="[]")
    metadata_json = Column("metadata", JSON, nullable=False, default=dict, server_default="{}")
    position = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    island = relationship("Island", back_populates="objects")

    __table_args__ = (
        Index("idx_objects_island_type", "island_id", "type"),
    )


class GoogleToken(Base):
    """Google OAuth tokens table."""

    __tablename__ = "google_tokens"

    user_id = Column(String(100), primary_key=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String(255), nullable=True)
    client_id = Column(String(255), nullable=True)
    client_secret = Column(Text, nullable=True)
    scopes = Column(JSON, nullable=False, default=list, server_default="[]")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    user_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    requires_reauth = Column(Boolean, nullable=False, default=False, server_default="0")


# Engine and session configuration
settings = get_settings()
settings.database.ensure_database_directory()

engine: AsyncEngine = create_async_engine(
    settings.database.url,
    echo=settings.database.echo,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to provide an async database session."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Initialize database and create tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
