"""
Thumbnail API Routes

Provides endpoints for generating and serving file thumbnails.
"""

from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import FileResponse
from pathlib import Path

from app.services.thumbnails.file_thumbnail import file_thumbnail_service
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


@router.get(
    "/image",
    response_class=FileResponse,
    summary="Get image thumbnail",
    description="Generate or retrieve a cached thumbnail for an image file.",
)
async def get_image_thumbnail(
    file_path: str = Query(..., description="Absolute path to the image file"),
    max_width: int = Query(256, description="Maximum thumbnail width", ge=32, le=2048),
    max_height: int = Query(256, description="Maximum thumbnail height", ge=32, le=2048),
    quality: int = Query(85, description="JPEG quality (1-100)", ge=1, le=100),
):
    """
    Generate or retrieve a cached thumbnail for an image file.

    Args:
        file_path: Absolute path to the image file
        max_width: Maximum thumbnail width (default: 256)
        max_height: Maximum thumbnail height (default: 256)
        quality: JPEG quality 1-100 (default: 85)

    Returns:
        FileResponse: The thumbnail image

    Raises:
        HTTPException: If file not found or not a supported image
    """
    try:
        # Check if file is an image
        if not file_thumbnail_service.is_image(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported image format",
            )

        # Generate or get cached thumbnail
        thumbnail_path = file_thumbnail_service.generate_image_thumbnail(
            file_path=file_path,
            max_width=max_width,
            max_height=max_height,
            quality=quality,
        )

        logger.debug(f"Serving thumbnail: {thumbnail_path}", extra={"source": file_path})

        return FileResponse(
            path=thumbnail_path,
            media_type="image/jpeg",
            filename=f"{Path(file_path).stem}_thumb.jpg",
        )

    except FileNotFoundError as e:
        logger.error(f"File not found: {file_path}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValueError as e:
        logger.error(f"Invalid file for thumbnail: {file_path}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to generate thumbnail: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate thumbnail",
        )


@router.get(
    "/check",
    summary="Check if thumbnail exists",
    description="Check if a cached thumbnail exists for a file.",
)
async def check_thumbnail(
    file_path: str = Query(..., description="Absolute path to the file"),
):
    """
    Check if a cached thumbnail exists for a file.

    Args:
        file_path: Absolute path to the file

    Returns:
        dict: Information about thumbnail availability
    """
    try:
        is_image = file_thumbnail_service.is_image(file_path)
        cached_path = file_thumbnail_service.get_cached_thumbnail(file_path) if is_image else None

        return {
            "is_image": is_image,
            "has_cached_thumbnail": cached_path is not None,
            "cached_thumbnail_path": cached_path,
        }

    except Exception as e:
        logger.error(f"Failed to check thumbnail: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check thumbnail",
        )
