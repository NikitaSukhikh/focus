"""
Async database setup and ORM models.

This module configures the SQLAlchemy async engine/session and defines the
core tables for spaces, objects, and Google tokens.
"""

import uuid
from typing import AsyncGenerator, Optional

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

class Space(Base):
    """Spaces table (workspaces)."""

    __tablename__ = "spaces"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)
    position = Column(Integer, nullable=False, default=0, server_default="0")
    object_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    objects = relationship("Object", back_populates="space", cascade="all, delete-orphan")


class Object(Base):
    """Objects table (items on spaces)."""

    __tablename__ = "objects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id = Column(String, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(400), nullable=False)
    description = Column(Text, nullable=True)
    default_title = Column(String(400), nullable=False, server_default="")
    default_description = Column(Text, nullable=True)
    custom_title = Column(String(400), nullable=True)
    custom_description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list, server_default="[]")
    metadata_json = Column("metadata", JSON, nullable=False, default=dict, server_default="{}")
    position = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    space = relationship("Space", back_populates="objects")

    __table_args__ = (
        Index("idx_objects_space_type", "space_id", "type"),
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
    space_id = Column(String, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True)
    # Monotonic per-space order; redo/undo uses sequence to step backward/forward.
    sequence = Column(Integer, nullable=False, default=0, server_default="0")
    # event_type covers nine event kinds: tile_create/tile_move/tile_delete,
    # text_create/text_move/text_delete, arrow_create/arrow_move/arrow_delete.
    event_type = Column(String(50), nullable=False)
    event_data = Column(JSON, nullable=False)  # Complete object state snapshot
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    is_undone = Column(Boolean, nullable=False, default=False, server_default="0", index=True)

    __table_args__ = (
        Index("idx_undo_events_space_undone", "space_id", "is_undone", "sequence"),
        Index("idx_undo_events_space_sequence", "space_id", "sequence", unique=True),
    )


# Engine and session configuration
import os
settings = get_settings()

# Ensure database directory exists BEFORE creating the engine
settings.database.ensure_database_directory()

# Debug logging
import sys
if settings.server.debug:
    print(f"[DB INIT] DATABASE_PATH env: {os.environ.get('DATABASE_PATH', 'NOT SET')}", file=sys.stderr)
    print(f"[DB INIT] Resolved DB path: {settings.database._resolve_db_path()}", file=sys.stderr)
    print(f"[DB INIT] Database URL: {settings.database.url}", file=sys.stderr)

engine: AsyncEngine = create_async_engine(
    settings.database.url,
    echo=settings.database.echo,
    connect_args={"check_same_thread": False, "timeout": 30},
)

# Improve SQLite concurrency: WAL mode + busy timeout
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[unused-argument]
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA busy_timeout=5000;")
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

async def ensure_object_name_columns() -> None:
    """
    Ensure the objects table has default/custom title/description columns.

    Adds missing columns for default/custom names and backfills existing rows
    so the display title/description remain consistent.
    """
    async with engine.begin() as conn:
        result = await conn.exec_driver_sql("PRAGMA table_info(objects);")
        existing_columns = {row[1] for row in result}
        statements = []

        if "default_title" not in existing_columns:
            statements.append("ALTER TABLE objects ADD COLUMN default_title TEXT NOT NULL DEFAULT ''")
        if "default_description" not in existing_columns:
            statements.append("ALTER TABLE objects ADD COLUMN default_description TEXT")
        if "custom_title" not in existing_columns:
            statements.append("ALTER TABLE objects ADD COLUMN custom_title TEXT")
        if "custom_description" not in existing_columns:
            statements.append("ALTER TABLE objects ADD COLUMN custom_description TEXT")

        for stmt in statements:
            await conn.exec_driver_sql(stmt)

        if statements:
            await conn.exec_driver_sql("""
                UPDATE objects
                SET
                    default_title = COALESCE(default_title, title),
                    default_description = COALESCE(default_description, description),
                    title = COALESCE(NULLIF(custom_title, ''), NULLIF(default_title, ''), title, 'Untitled'),
                    description = COALESCE(custom_description, default_description, description)
            """)
        else:
            # Ensure no empty titles remain even if columns already exist
            await conn.exec_driver_sql("""
                UPDATE objects
                SET
                    default_title = CASE WHEN default_title IS NULL OR default_title = '' THEN title ELSE default_title END,
                    title = CASE
                        WHEN (title IS NULL OR title = '') AND (custom_title IS NOT NULL AND custom_title <> '') THEN custom_title
                        WHEN (title IS NULL OR title = '') AND (default_title IS NOT NULL AND default_title <> '') THEN default_title
                        WHEN (title IS NULL OR title = '') THEN 'Untitled'
                        ELSE title
                    END
            """)


async def init_db() -> None:
    """Initialize database and create tables."""
    from app.utils.app_logger import get_app_logger

    app_logger = get_app_logger("database")

    try:
        # Directory is already ensured in module init, but do it again to be safe
        settings.database.ensure_database_directory()

        app_logger.log_database_init("started", database_path=str(settings.database._resolve_db_path()))

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await ensure_object_name_columns()

        app_logger.log_database_init("success", database_path=str(settings.database._resolve_db_path()))
    except Exception as e:
        app_logger.log_database_init("failed", error=str(e), database_path=str(settings.database._resolve_db_path()))
        raise
