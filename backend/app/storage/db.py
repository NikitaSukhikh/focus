"""
Async database setup and ORM models.

This module configures the SQLAlchemy async engine/session and defines the
core tables for spaces, objects, and Google tokens.
"""

import uuid
from datetime import datetime
from typing import Any, AsyncGenerator

from sqlalchemy import (
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
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


# Models

class Space(Base):
    """Spaces table (workspaces)."""

    __tablename__ = "spaces"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(7))
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    object_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    objects: Mapped[list["Object"]] = relationship("Object", back_populates="space", cascade="all, delete-orphan")


class Object(Base):
    """Objects table (items on spaces)."""

    __tablename__ = "objects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id: Mapped[str] = mapped_column(String, ForeignKey("spaces.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(400))
    description: Mapped[str | None] = mapped_column(Text)
    default_title: Mapped[str] = mapped_column(String(400), server_default="")
    default_description: Mapped[str | None] = mapped_column(Text)
    custom_title: Mapped[str | None] = mapped_column(String(400))
    custom_description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[Any] = mapped_column(JSON, default=list, server_default="[]")
    metadata_json: Mapped[Any] = mapped_column("metadata", JSON, default=dict, server_default="{}")
    position: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    space: Mapped["Space"] = relationship("Space", back_populates="objects")

    __table_args__ = (
        Index("idx_objects_space_type", "space_id", "type"),
    )


class AssistantToken(Base):
    """Assistant OAuth tokens table for Google services."""

    __tablename__ = "assistant_tokens"

    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text)
    token_uri: Mapped[str | None] = mapped_column(String(255))
    client_id: Mapped[str | None] = mapped_column(String(255))
    client_secret: Mapped[str | None] = mapped_column(Text)
    scopes: Mapped[Any] = mapped_column(JSON, default=list, server_default="[]")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    requires_reauth: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")


class UserPreferences(Base):
    """User preferences table (single-row, id=1)."""

    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    language: Mapped[str] = mapped_column(String(10), default="en", server_default="en")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UndoEvent(Base):
    """Undo events table for undo/redo functionality."""

    __tablename__ = "undo_events"
    __mapper_args__ = {"confirm_deleted_rows": False}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    space_id: Mapped[str] = mapped_column(String, ForeignKey("spaces.id", ondelete="CASCADE"), index=True)
    # Monotonic per-space order; redo/undo uses sequence to step backward/forward.
    sequence: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # event_type covers nine event kinds: tile_create/tile_move/tile_delete,
    # text_create/text_move/text_delete, arrow_create/arrow_move/arrow_delete.
    event_type: Mapped[str] = mapped_column(String(50))
    event_data: Mapped[Any] = mapped_column(JSON)  # Complete object state snapshot
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    is_undone: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", index=True)

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
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:
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
