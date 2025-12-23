"""
Internal Storage Routes

API endpoints for interacting with the app's internal storage area.
"""

from fastapi import APIRouter, status

from app.services.internal_storage import internal_storage_service, InternalStorageError
from app.core.exceptions import AppError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "/open",
    status_code=status.HTTP_200_OK,
    summary="Open internal storage folder",
    description="Opens the internal storage directory in the native file manager.",
)
async def open_internal_storage():
    """
    Open the internal storage folder in the user's file manager.

    Returns:
        dict: Status of the operation and the path that was opened.
    """
    try:
        await internal_storage_service.open_file_manager()
        return {"status": "opened", "path": str(internal_storage_service.base_path)}
    except InternalStorageError as exc:
        logger.error("Failed to open internal storage", exc_info=True)
        raise AppError(
            "Failed to open internal storage folder.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="internal_storage_open_failed",
        ) from exc
