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
    event,
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
    title = Column(String(400), nullable=False)
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


class AssistantToken(Base):
    """Assistant OAuth tokens table for Google services."""

    __tablename__ = "assistant_tokens"

    user_id = Column(String(100), primary_key=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String(255), nullable=True)
    client_id = Column(String(255), nullable=True)
    client_secret = Column(Text, nullable=True)
    scopes = Column(JSON, nullable=False, default=list, server_default="[]")
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    requires_reauth = Column(Boolean, nullable=False, default=False, server_default="0")


class UndoEvent(Base):
    """Undo events table for undo/redo functionality."""

    __tablename__ = "undo_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    island_id = Column(String, ForeignKey("islands.id", ondelete="CASCADE"), nullable=False, index=True)
    # Monotonic per-island order; redo/undo uses sequence to step backward/forward.
    sequence = Column(Integer, nullable=False, default=0, server_default="0")
    event_type = Column(String(50), nullable=False)  # tile_create, tile_delete, etc.
    event_data = Column(JSON, nullable=False)  # Complete object state snapshot
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    is_undone = Column(Boolean, nullable=False, default=False, server_default="0", index=True)

    __table_args__ = (
        Index("idx_undo_events_island_undone", "island_id", "is_undone", "sequence"),
        Index("idx_undo_events_island_sequence", "island_id", "sequence", unique=True),
    )


# Engine and session configuration
settings = get_settings()
settings.database.ensure_database_directory()

engine: AsyncEngine = create_async_engine(
    settings.database.url,
    echo=settings.database.echo,
    connect_args={"check_same_thread": False, "timeout": 30},
)

# Improve SQLite concurrency: WAL mode + busy timeout to mitigate "database is locked"
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[unused-argument]
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA busy_timeout=5000;")  # wait up to 5s if locked
    cursor.close()

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
