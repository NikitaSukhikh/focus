"""
Undo Service

Business logic layer for undo/redo operations.
Handles validation, orchestration, and business rules for undo events.
"""

from typing import Optional
from uuid import UUID

from app.models.undo import (
    UndoEventCreate,
    UndoEventResponse,
    UndoRedoResponse,
)
from app.storage.repositories.undo_repo import UndoEventRepository
from app.core.logging import get_logger


logger = get_logger(__name__)


# ============================================================================
# Custom Exceptions
# ============================================================================

class UndoServiceError(Exception):
    """Base exception for undo service errors."""
    pass


class NoUndoableEventError(UndoServiceError):
    """Raised when there are no events to undo."""
    pass


class NoRedoableEventError(UndoServiceError):
    """Raised when there are no events to redo."""
    pass


# ============================================================================
# Service Functions
# ============================================================================

async def create_undo_event(
    space_id: str,
    event_create: UndoEventCreate,
    undo_repo: UndoEventRepository,
    max_events: int = 100,
) -> UndoEventResponse:
    """
    Create a new undo event.

    When a new action is performed:
    1. Clear all redoable events (redo stack)
    2. Create new undo event
    3. Trim old events to max_events limit
    """
    logger.info(f"Creating undo event for space {space_id}: {event_create.event_type}")

    # Use a transaction so redo clear + insert + trim commit together.
    async with undo_repo.session.begin():
        # Clear redo stack when new action performed
        cleared = await undo_repo.clear_redoable_events(space_id)
        if cleared > 0:
            logger.debug(f"Cleared {cleared} redoable events")

        # Create new event
        event = await undo_repo.create_event(
            space_id=space_id,
            event_type=event_create.event_type,
            event_data=event_create.event_data,
        )

        # Trim old events
        trimmed = await undo_repo.trim_to_limit(space_id, max_events)
        if trimmed > 0:
            logger.debug(f"Trimmed {trimmed} old events")

    # Refresh so caller gets committed values
    await undo_repo.session.refresh(event)

    return UndoEventResponse.model_validate(event)


async def undo_last_event(
    space_id: str,
    undo_repo: UndoEventRepository,
) -> UndoRedoResponse:
    """
    Undo the last undoable event.

    Returns the event that was undone so the client can reverse it.
    """
    logger.info(f"Undoing last event for space {space_id}")

    # Get last undoable event
    event = await undo_repo.get_last_undoable_event(space_id)

    if not event:
        logger.warning(f"No undoable events for space {space_id}")
        return UndoRedoResponse(
            success=False,
            event=None,
            message="No events to undo"
        )

    # Mark as undone
    await undo_repo.mark_as_undone(event.id)

    logger.info(f"Undone event {event.id}: {event.event_type}")

    return UndoRedoResponse(
        success=True,
        event=UndoEventResponse.model_validate(event),
        message="Event undone successfully"
    )


async def redo_last_event(
    space_id: str,
    undo_repo: UndoEventRepository,
) -> UndoRedoResponse:
    """
    Redo the last redoable event.

    Returns the event that was redone so the client can reapply it.
    """
    logger.info(f"Redoing last event for space {space_id}")

    # Get last redoable event
    event = await undo_repo.get_last_redoable_event(space_id)

    if not event:
        logger.warning(f"No redoable events for space {space_id}")
        return UndoRedoResponse(
            success=False,
            event=None,
            message="No events to redo"
        )

    # Mark as not undone
    await undo_repo.mark_as_not_undone(event.id)

    logger.info(f"Redone event {event.id}: {event.event_type}")

    return UndoRedoResponse(
        success=True,
        event=UndoEventResponse.model_validate(event),
        message="Event redone successfully"
    )


async def clear_undo_history(
    space_id: str,
    undo_repo: UndoEventRepository,
) -> int:
    """Clear all undo/redo history for an space."""
    logger.info(f"Clearing undo history for space {space_id}")

    count = await undo_repo.clear_all_events(space_id)

    logger.info(f"Cleared {count} events for space {space_id}")
    return count
