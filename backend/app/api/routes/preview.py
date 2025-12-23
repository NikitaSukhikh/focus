"""
Preview Routes

API endpoints for generating and serving object previews and thumbnails.
"""

from uuid import UUID
from pathlib import Path
from fastapi import APIRouter, status, Depends
from fastapi.responses import FileResponse

from app.models.preview import PreviewResponse, PreviewError
from app.services.preview_service import preview_service
from app.services.objects_service import objects_service, ObjectNotFoundError
from app.api.deps import validate_uuid
from app.core.config import get_settings, Settings
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Preview Endpoints
# ============================================================================

@router.get(
    "/objects/{object_id}/preview",
    response_model=PreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get object preview",
    description="Generate and return preview data for an object based on its type.",
    tags=["Preview"]
)
async def get_object_preview(
    object_id: UUID = Depends(validate_uuid)
) -> PreviewResponse:
    """
    Get preview data for an object.

    Generates different preview types based on object type:
    - LINK: URL metadata (title, description, favicon, Open Graph)
    - FILE: File metadata, thumbnail (for images), text preview (for text files)
    - TEXT: Content preview, word/character counts
    - GOOGLE_DRIVE: Drive file metadata (requires OAuth connection)
    - GMAIL: Email thread/message preview (requires OAuth connection)

    Args:
        object_id: Object UUID

    Returns:
        PreviewResponse: Preview data (polymorphic response)

    Raises:
        404: Object not found
        500: Internal server error
    """
    try:
        # Get the object
        obj = await objects_service.get_object(object_id)

        # Generate preview
        preview = await preview_service.generate_preview(obj)

        # Check if preview generation failed
        if isinstance(preview, PreviewError):
            logger.warning(
                f"Preview generation failed for object {object_id}",
                extra={
                    "object_id": str(object_id),
                    "error": preview.error,
                    "error_type": preview.error_type
                }
            )
            raise AppError(
                "Could not generate a preview for this object.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="preview_generation_failed",
                details={
                    "object_id": str(object_id),
                    "error": preview.error,
                    "error_type": preview.error_type
                },
                log_level="error",
            )

        logger.debug(
            f"Generated preview for {obj.type} object",
            extra={"object_id": str(object_id), "type": obj.type}
        )

        return preview

    except ObjectNotFoundError as e:
        logger.warning(f"Object not found: {object_id}")
        raise NotFoundError(
            "Object not found.",
            error_code="object_not_found",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to get preview", extra={"object_id": str(object_id)})
        raise AppError(
            "Unable to generate a preview right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="preview_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/objects/{object_id}/thumbnail",
    status_code=status.HTTP_200_OK,
    summary="Get object thumbnail",
    description="Serve cached thumbnail image for an object (FILE type with image MIME type).",
    tags=["Preview"],
    response_class=FileResponse
)
async def get_object_thumbnail(
    object_id: UUID = Depends(validate_uuid),
    settings: Settings = Depends(get_settings)
) -> FileResponse:
    """
    Get thumbnail image for an object.

    Only works for FILE objects with image MIME types.
    Returns a cached thumbnail from the thumbnails directory.

    Args:
        object_id: Object UUID
        settings: Application settings

    Returns:
        FileResponse: Thumbnail image file

    Raises:
        404: Object not found, thumbnail not found, or object is not an image
        500: Internal server error
    """
    try:
        # Get the object
        obj = await objects_service.get_object(object_id)

        # Check if object is a FILE type
        if obj.type != "file":
            raise NotFoundError(
                "Thumbnail not available for this object.",
                error_code="thumbnail_not_available",
                details={"reason": "not_file_object", "object_type": obj.type},
            )

        # Get file path from metadata
        file_path = obj.metadata.get("file_path")
        if not file_path:
            raise NotFoundError(
                "Thumbnail not available for this object.",
                error_code="thumbnail_not_available",
                details={"reason": "missing_file_path"},
            )

        # Check MIME type
        mime_type = obj.metadata.get("mime_type", "")
        if not mime_type.startswith("image/"):
            raise NotFoundError(
                "Thumbnail not available for this object.",
                error_code="thumbnail_not_available",
                details={"reason": "non_image", "mime_type": mime_type},
            )

        # Generate preview to ensure thumbnail exists
        preview = await preview_service.generate_preview(obj)

        # Check if preview has thumbnail_url
        if isinstance(preview, PreviewError) or not hasattr(preview, 'thumbnail_url') or not preview.thumbnail_url:
            raise NotFoundError(
                "Thumbnail not available for this object.",
                error_code="thumbnail_not_available",
                details={
                    "reason": "thumbnail_missing",
                    "preview_error": getattr(preview, "error", None),
                    "preview_type": getattr(preview, "error_type", None),
                },
            )

        # Extract thumbnail filename from URL
        # thumbnail_url format: "/api/thumbnails/{filename}"
        thumbnail_filename = Path(preview.thumbnail_url).name

        # Construct full path to thumbnail
        thumbnail_path = settings.storage.thumbnails_dir / thumbnail_filename

        if not thumbnail_path.exists():
            raise NotFoundError(
                "Thumbnail file not found.",
                error_code="thumbnail_not_found",
                details={"thumbnail_path": str(thumbnail_path)},
            )

        logger.debug(
            f"Serving thumbnail for object {object_id}",
            extra={"object_id": str(object_id), "thumbnail_path": str(thumbnail_path)}
        )

        # Serve the thumbnail
        return FileResponse(
            path=str(thumbnail_path),
            media_type="image/jpeg",
            filename=thumbnail_filename
        )

    except ObjectNotFoundError as e:
        logger.warning(f"Object not found: {object_id}")
        raise NotFoundError(
            "Object not found.",
            error_code="object_not_found",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except NotFoundError:
        raise

    except Exception as e:
        logger.exception("Failed to serve thumbnail", extra={"object_id": str(object_id)})
        raise AppError(
            "Unable to serve the thumbnail right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="thumbnail_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/thumbnails/{filename}",
    status_code=status.HTTP_200_OK,
    summary="Get thumbnail by filename",
    description="Serve a thumbnail image by filename (internal use).",
    tags=["Preview"],
    response_class=FileResponse,
    include_in_schema=False  # Hide from OpenAPI docs (internal endpoint)
)
async def get_thumbnail_by_filename(
    filename: str,
    settings: Settings = Depends(get_settings)
) -> FileResponse:
    """
    Serve a thumbnail image by filename.

    This is an internal endpoint used by the frontend to load thumbnails
    from the URL provided in preview responses.

    Args:
        filename: Thumbnail filename
        settings: Application settings

    Returns:
        FileResponse: Thumbnail image file

    Raises:
        404: Thumbnail not found
        500: Internal server error
    """
    try:
        # Construct full path to thumbnail
        thumbnail_path = settings.storage.thumbnails_dir / filename

        if not thumbnail_path.exists():
            logger.warning(f"Thumbnail not found: {filename}")
            raise NotFoundError(
                "Thumbnail not found.",
                error_code="thumbnail_not_found",
                details={"filename": filename},
            )

        # Validate that the path is within thumbnails directory (security check)
        try:
            thumbnail_path.resolve().relative_to(settings.storage.thumbnails_dir.resolve())
        except ValueError:
            # Path is outside thumbnails directory - potential path traversal attack
            logger.warning(
                f"Path traversal attempt detected: {filename}",
                extra={"filename": filename}
            )
            raise NotFoundError(
                "Thumbnail not found.",
                error_code="thumbnail_not_found",
                details={"filename": filename, "reason": "invalid_path"},
            )

        logger.debug(f"Serving thumbnail: {filename}")

        return FileResponse(
            path=str(thumbnail_path),
            media_type="image/jpeg",
            filename=filename
        )

    except NotFoundError:
        raise

    except Exception as e:
        logger.exception("Failed to serve thumbnail by filename", extra={"filename": filename})
        raise AppError(
            "Unable to serve the thumbnail right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="thumbnail_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e
