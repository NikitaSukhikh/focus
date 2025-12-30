"""
Undo/Redo Routes

API endpoints for undo/redo operations.
"""

from fastapi import APIRouter, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.undo import (
    UndoEventCreate,
    UndoEventResponse,
    UndoRedoResponse,
)
from app.services import undo_service
from app.storage.repositories.undo_repo import UndoEventRepository
from app.storage.db import get_session
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


def get_undo_repo(session: AsyncSession = Depends(get_session)) -> UndoEventRepository:
    """Dependency to get undo repository."""
    return UndoEventRepository(session)


# ============================================================================
# Undo/Redo Endpoints
# ============================================================================

@router.post(
    "/spaces/{space_id}/undo-events",
    response_model=UndoEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create undo event",
    description="Record a new undo event for an space. Clears redo stack.",
    tags=["Undo"]
)
async def create_undo_event(
    event: UndoEventCreate,
    space_id: str,
    undo_repo: UndoEventRepository = Depends(get_undo_repo),
) -> UndoEventResponse:
    """
    Create a new undo event.

    This endpoint should be called when the user performs an action that should be undoable.
    Creating a new event will clear all redoable events (redo stack).

    Args:
        event: Undo event data
        space_id: ID of the space
        undo_repo: Undo repository dependency

    Returns:
        UndoEventResponse: Created undo event
    """
    try:
        result = await undo_service.create_undo_event(
            space_id=space_id,
            event_create=event,
            undo_repo=undo_repo,
        )

        logger.info(
            f"Created undo event for space {space_id}: {event.event_type}",
            extra={"space_id": space_id, "event_type": event.event_type}
        )

        return result

    except Exception as e:
        logger.exception(f"Failed to create undo event: {e}")
        raise


@router.post(
    "/spaces/{space_id}/undo",
    response_model=UndoRedoResponse,
    status_code=status.HTTP_200_OK,
    summary="Undo last event",
    description="Undo the last undoable event for an space.",
    tags=["Undo"]
)
async def undo_last_event(
    space_id: str,
    undo_repo: UndoEventRepository = Depends(get_undo_repo),
) -> UndoRedoResponse:
    """
    Undo the last event.

    Returns the event that was undone so the client can reverse it.

    Args:
        space_id: ID of the space
        undo_repo: Undo repository dependency

    Returns:
        UndoRedoResponse: Result of undo operation with event data
    """
    try:
        result = await undo_service.undo_last_event(
            space_id=space_id,
            undo_repo=undo_repo,
        )

        if result.success:
            logger.info(
                f"Undone event for space {space_id}",
                extra={"space_id": space_id, "event_id": result.event.id if result.event else None}
            )
        else:
            logger.debug(f"No events to undo for space {space_id}")

        return result

    except Exception as e:
        logger.exception(f"Failed to undo event: {e}")
        raise


@router.post(
    "/spaces/{space_id}/redo",
    response_model=UndoRedoResponse,
    status_code=status.HTTP_200_OK,
    summary="Redo last undone event",
    description="Redo the last undone event for an space.",
    tags=["Undo"]
)
async def redo_last_event(
    space_id: str,
    undo_repo: UndoEventRepository = Depends(get_undo_repo),
) -> UndoRedoResponse:
    """
    Redo the last undone event.

    Returns the event that was redone so the client can reapply it.

    Args:
        space_id: ID of the space
        undo_repo: Undo repository dependency

    Returns:
        UndoRedoResponse: Result of redo operation with event data
    """
    try:
        result = await undo_service.redo_last_event(
            space_id=space_id,
            undo_repo=undo_repo,
        )

        if result.success:
            logger.info(
                f"Redone event for space {space_id}",
                extra={"space_id": space_id, "event_id": result.event.id if result.event else None}
            )
        else:
            logger.debug(f"No events to redo for space {space_id}")

        return result

    except Exception as e:
        logger.exception(f"Failed to redo event: {e}")
        raise


@router.delete(
    "/spaces/{space_id}/undo-events",
    status_code=status.HTTP_200_OK,
    summary="Clear undo history",
    description="Clear all undo/redo history for an space.",
    tags=["Undo"]
)
async def clear_undo_history(
    space_id: str,
    undo_repo: UndoEventRepository = Depends(get_undo_repo),
) -> dict:
    """
    Clear all undo/redo history for an space.

    Args:
        space_id: ID of the space
        undo_repo: Undo repository dependency

    Returns:
        dict: Number of events cleared
    """
    try:
        count = await undo_service.clear_undo_history(
            space_id=space_id,
            undo_repo=undo_repo,
        )

        logger.info(
            f"Cleared undo history for space {space_id}: {count} events",
            extra={"space_id": space_id, "count": count}
        )

        return {"cleared": count, "message": f"Cleared {count} events"}

    except Exception as e:
        logger.exception(f"Failed to clear undo history: {e}")
        raise
