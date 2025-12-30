"""
Undo Event Pydantic Models

Data models for undo/redo functionality.
Stores complete object state snapshots for reversible operations.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class UndoEventType(str, Enum):
    """Types of undoable events."""

    TILE_CREATE = "tile_create"
    TILE_MOVE = "tile_move"
    TILE_DELETE = "tile_delete"
    TEXT_MOVE = "text_move"
    ARROW_MOVE = "arrow_move"
    ARROW_CREATE = "arrow_create"
    ARROW_DELETE = "arrow_delete"
    TEXT_CREATE = "text_create"
    TEXT_DELETE = "text_delete"


class UndoEventBase(BaseModel):
    """Base model for undo events."""

    event_type: UndoEventType = Field(
        ...,
        description="Type of event that occurred"
    )
    event_data: Dict[str, Any] = Field(
        ...,
        description="Complete state snapshot of the affected object"
    )


class UndoEventCreate(UndoEventBase):
    """Model for creating a new undo event."""
    pass


class UndoEventUpdate(BaseModel):
    """Model for updating an undo event."""

    is_undone: bool = Field(
        ...,
        description="Whether this event has been undone"
    )


class UndoEventResponse(UndoEventBase):
    """Model for undo event responses."""

    id: UUID
    space_id: UUID
    sequence: int = Field(..., description="Monotonic per-space sequence number for deterministic ordering")
    timestamp: datetime
    is_undone: bool

    model_config = ConfigDict(from_attributes=True)


class UndoEventList(BaseModel):
    """Model for paginated undo event lists."""

    events: List[UndoEventResponse]
    total: int
    skip: int
    limit: int


class UndoRedoResponse(BaseModel):
    """Response after undo/redo operation."""

    success: bool
    event: Optional[UndoEventResponse] = None
    message: str
