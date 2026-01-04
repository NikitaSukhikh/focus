"""
Thumbnail API Routes

Provides endpoints for generating and serving file thumbnails.
"""

from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import FileResponse
from pathlib import Path

from app.services.thumbnails.file_thumbnail import file_thumbnail_service
from app.services.documents.document_preview import document_preview_service
from app.services.documents.excel_preview import excel_preview_service
from app.services.documents.ebook_preview import ebook_preview_service
from app.services.thumbnails.audio_metadata import get_audio_metadata, is_audio_file, format_duration
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


@router.get(
    "/metadata",
    summary="Get image metadata",
    description="Get metadata for an image file including dimensions and aspect ratio.",
)
async def get_image_metadata(
    file_path: str = Query(..., description="Absolute path to the image file"),
):
    """
    Get metadata for an image file.

    Args:
        file_path: Absolute path to the image file

    Returns:
        dict: Image metadata including dimensions and aspect ratio
    """
    try:
        if not file_thumbnail_service.is_image(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported image format",
            )

        width, height = file_thumbnail_service.get_image_dimensions(file_path)
        file_size = file_thumbnail_service.get_file_size(file_path)

        # Calculate aspect ratio by rounding to popular ratios
        actual_ratio = height / width

        # Popular aspect ratios as (height, width, decimal_value)
        popular_ratios = [
            (1, 1, 1.0),      # Square
            (2, 3, 0.6667),   # 2:3
            (3, 4, 0.75),     # 3:4
            (9, 16, 0.5625),  # 9:16
            (10, 16, 0.625),  # 10:16
            (4, 5, 0.8),      # 4:5
            (3, 5, 0.6),      # 3:5
            (2, 1, 2.0),      # 2:1
            (3, 2, 1.5),      # 3:2
            (4, 3, 1.3333),   # 4:3
            (16, 9, 1.7778),  # 16:9
            (21, 9, 2.3333),  # 21:9
        ]

        # Find closest popular ratio
        min_diff = float('inf')
        closest_ratio = None
        is_exact_match = False

        for h, w, ratio_val in popular_ratios:
            diff = abs(actual_ratio - ratio_val)
            if diff < min_diff:
                min_diff = diff
                closest_ratio = (h, w, ratio_val)
                # Check if it's an exact match (within floating point precision)
                is_exact_match = diff < 0.0001

        # Show exact only if truly exact, otherwise always show approx
        if is_exact_match and closest_ratio:
            aspect_ratio_str = f"{closest_ratio[0]}:{closest_ratio[1]}"
        elif closest_ratio:
            aspect_ratio_str = f"approx {closest_ratio[0]}:{closest_ratio[1]}"
        else:
            # Fallback to GCD simplification
            from math import gcd
            divisor = gcd(width, height)
            aspect_ratio_str = f"approx {height // divisor}:{width // divisor}"

        return {
            "width": width,
            "height": height,
            "aspect_ratio": aspect_ratio_str,
            "file_size": file_size,
            "file_size_human": file_thumbnail_service.get_human_readable_size(file_size),
        }

    except FileNotFoundError as e:
        logger.error(f"File not found: {file_path}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValueError as e:
        logger.error(f"Invalid image file: {file_path}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to get image metadata: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get image metadata",
        )


@router.get(
    "/full-image",
    response_class=FileResponse,
    summary="Get full-size image for preview",
    description="Serve the full-size image file for preview display.",
)
async def get_full_image(
    file_path: str = Query(..., description="Absolute path to the image file"),
):
    """
    Serve the full-size image file for preview.

    Args:
        file_path: Absolute path to the image file

    Returns:
        FileResponse: The full-size image

    Raises:
        HTTPException: If file not found or not a supported image
    """
    try:
        path = Path(file_path)

        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}",
            )

        if not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a file: {file_path}",
            )

        # Check if file is an image
        if not file_thumbnail_service.is_image(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported image format",
            )

        # Determine media type from file extension
        import mimetypes
        media_type, _ = mimetypes.guess_type(file_path)
        if not media_type or not media_type.startswith('image/'):
            media_type = 'image/jpeg'

        logger.debug(f"Serving full image: {file_path}")

        return FileResponse(
            path=str(path),
            media_type=media_type,
            filename=path.name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve full image: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serve image",
        )


@router.get(
    "/audio-file",
    response_class=FileResponse,
    summary="Get audio file for playback",
    description="Serve audio file for playback in the audio player.",
)
async def get_audio_file(
    file_path: str = Query(..., description="Absolute path to the audio file"),
):
    """
    Serve an audio file for playback.

    Args:
        file_path: Absolute path to the audio file

    Returns:
        FileResponse: The audio file

    Raises:
        HTTPException: If file not found or not a supported audio format
    """
    try:
        path = Path(file_path)

        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}",
            )

        if not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a file: {file_path}",
            )

        # Check if file is an audio file
        if not is_audio_file(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported audio format",
            )

        # Determine media type from file extension
        import mimetypes
        media_type, _ = mimetypes.guess_type(file_path)
        if not media_type or not media_type.startswith('audio/'):
            media_type = 'audio/mpeg'

        logger.debug(f"Serving audio file: {file_path}")

        return FileResponse(
            path=str(path),
            media_type=media_type,
            filename=path.name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve audio file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serve audio file",
        )


@router.get(
    "/audio-metadata",
    summary="Get audio file metadata",
    description="Extract metadata from audio files including duration, bitrate, and tags.",
)
async def get_audio_metadata_endpoint(
    file_path: str = Query(..., description="Absolute path to the audio file"),
):
    """
    Extract metadata from an audio file.

    Args:
        file_path: Absolute path to the audio file

    Returns:
        dict: Audio metadata including duration, bitrate, sample rate, and tags

    Raises:
        HTTPException: If file not found or not a supported audio format
    """
    try:
        if not is_audio_file(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported audio format",
            )

        metadata = get_audio_metadata(file_path)

        # Add formatted duration
        metadata["duration_formatted"] = format_duration(metadata.get("duration", 0))

        # Add human-readable file size
        file_size = metadata.get("file_size", 0)
        metadata["file_size_human"] = file_thumbnail_service.get_human_readable_size(file_size)

        logger.debug(f"Serving audio metadata for: {file_path}")

        return metadata

    except FileNotFoundError as e:
        logger.error(f"File not found: {file_path}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValueError as e:
        logger.error(f"Invalid audio file: {file_path}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to get audio metadata: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audio metadata",
        )


@router.get(
    "/ebook-image/{image_name}",
    response_class=FileResponse,
    summary="Get ebook image",
    description="Serve extracted images from ebook files.",
)
async def get_ebook_image(
    image_name: str,
):
    """
    Serve an image extracted from an ebook.

    Args:
        image_name: Name of the image file

    Returns:
        FileResponse: The image file

    Raises:
        HTTPException: If image not found
    """
    try:
        # Get the image path
        from app.core.config import get_settings
        settings = get_settings()

        images_dir = Path(settings.storage.cache_dir) / "ebook_previews" / "images"
        image_path = images_dir / image_name

        if not image_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image not found: {image_name}",
            )

        if not image_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a file: {image_name}",
            )

        # Determine media type from file extension
        import mimetypes
        media_type, _ = mimetypes.guess_type(str(image_path))
        if not media_type:
            media_type = 'image/jpeg'

        logger.debug(f"Serving ebook image: {image_path}")

        return FileResponse(
            path=str(image_path),
            media_type=media_type,
            filename=image_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve ebook image: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serve ebook image",
        )


@router.get(
    "/ebook-metadata",
    summary="Get ebook metadata",
    description="Extract metadata from ebook files including title and author.",
)
async def get_ebook_metadata(
    file_path: str = Query(..., description="Absolute path to the ebook file"),
):
    """
    Extract metadata from an ebook file.

    Args:
        file_path: Absolute path to the ebook file

    Returns:
        dict: Ebook metadata including title and author

    Raises:
        HTTPException: If file not found or not a supported ebook
    """
    try:
        path = Path(file_path)

        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}",
            )

        if not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a file: {file_path}",
            )

        # Check if file is an ebook
        if not ebook_preview_service.is_ebook(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported ebook format",
            )

        metadata = ebook_preview_service.get_metadata(file_path)

        logger.debug(f"Serving ebook metadata for: {file_path}")

        return metadata

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get ebook metadata: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get ebook metadata",
        )


@router.get(
    "/document-preview",
    response_class=FileResponse,
    summary="Get document preview as HTML",
    description="Convert and serve document files (docx, doc, odt) as HTML for preview.",
)
async def get_document_preview(
    file_path: str = Query(..., description="Absolute path to the document file"),
):
    """
    Convert a document file to HTML and serve for preview.

    Args:
        file_path: Absolute path to the document file

    Returns:
        FileResponse: HTML preview of the document

    Raises:
        HTTPException: If file not found or not a supported document
    """
    try:
        path = Path(file_path)

        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}",
            )

        if not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a file: {file_path}",
            )

        # Check if file is Excel
        if excel_preview_service.is_excel(file_path):
            html_path = excel_preview_service.convert_excel_to_html(file_path)
        # Check if file is an ebook
        elif ebook_preview_service.is_ebook(file_path):
            html_path = ebook_preview_service.convert_ebook_to_html(file_path)
        # Check if file is a supported document
        elif document_preview_service.is_document(file_path):
            html_path = document_preview_service.convert_docx_to_html(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is not a supported document format",
            )

        logger.debug(f"Serving document preview: {html_path}")

        # Read HTML content and return as Response to avoid download prompt
        from fastapi.responses import Response
        from pathlib import Path as PathLib

        html_content = PathLib(html_path).read_text(encoding='utf-8')

        return Response(
            content=html_content,
            media_type="text/html; charset=utf-8",
            headers={
                "Content-Disposition": "inline"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate document preview: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate document preview",
        )
