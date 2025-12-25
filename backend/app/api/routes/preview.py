"""
Preview Routes

API endpoints for generating and serving object previews and thumbnails.
"""

from uuid import UUID
from pathlib import Path
from typing import Dict, Any
from urllib.parse import urlparse, parse_qs
import re
from fastapi import APIRouter, status, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.models.preview import PreviewResponse, PreviewError
from app.services.preview_service import preview_service
from app.services.objects_service import objects_service, ObjectNotFoundError
from app.services.authenticated_links import authenticated_links_service
from app.storage.repositories.google_repo import google_tokens_repository
from app.api.deps import validate_uuid
from app.core.config import get_settings, Settings
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


class UrlMetadataResponse(BaseModel):
    """Response model for URL metadata."""
    title: str | None = None
    description: str | None = None
    favicon_url: str | None = None
    site_name: str | None = None
    og_title: str | None = None
    og_description: str | None = None
    og_image: str | None = None


# ============================================================================
# Preview Endpoints
# ============================================================================

def _extract_drive_file_info(url: str) -> Dict[str, Any]:
    """
    Extract file/folder information from Google Drive URL.

    Args:
        url: Google Drive URL

    Returns:
        Dict with file_id/folder_id and type information
    """
    info = {}

    # Extract folder ID from URL patterns:
    # https://drive.google.com/drive/folders/FOLDER_ID
    # https://drive.google.com/drive/u/0/folders/FOLDER_ID
    if '/folders/' in url:
        match = re.search(r'/folders/([a-zA-Z0-9_-]+)', url)
        if match:
            info['file_id'] = match.group(1)
            info['file_type'] = 'folder'
            return info

    # Extract file ID from Docs/Sheets/Slides URLs:
    # https://docs.google.com/document/d/FILE_ID/edit
    # https://docs.google.com/spreadsheets/d/FILE_ID/edit
    # https://docs.google.com/presentation/d/FILE_ID/edit
    if 'docs.google.com' in url or 'sheets.google.com' in url or 'slides.google.com' in url:
        match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
        if match:
            info['file_id'] = match.group(1)

            # Determine document type
            if 'document' in url:
                info['file_type'] = 'doc'
            elif 'spreadsheet' in url:
                info['file_type'] = 'sheet'
            elif 'presentation' in url:
                info['file_type'] = 'slide'
            else:
                info['file_type'] = 'document'

            return info

    # Extract file ID from generic Drive file URLs:
    # https://drive.google.com/file/d/FILE_ID/view
    if '/file/d/' in url:
        match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
        if match:
            info['file_id'] = match.group(1)
            info['file_type'] = 'file'
            return info

    return info


async def _get_file_info_from_drive_api(file_id: str, account_email: str) -> Dict[str, Any]:
    """
    Fetch file/folder information from Google Drive API.

    Args:
        file_id: Google Drive file/folder ID
        account_email: Google account email to use

    Returns:
        Dict with name, shared status, and owner info if successful, empty dict otherwise
    """
    try:
        from app.services.google.oauth_flow import google_oauth_service
        from googleapiclient.discovery import build

        # Get credentials for the account
        credentials = await google_oauth_service.get_credentials(account_email)
        if not credentials:
            return {}

        # Build Drive service
        service = build('drive', 'v3', credentials=credentials)

        # Fetch file metadata with additional fields
        file_metadata = service.files().get(
            fileId=file_id,
            fields='name,shared,ownedByMe,owners,mimeType'
        ).execute()

        return {
            'name': file_metadata.get('name'),
            'shared': file_metadata.get('shared', False),
            'owned_by_me': file_metadata.get('ownedByMe', True),
            'owners': file_metadata.get('owners', []),
            'mime_type': file_metadata.get('mimeType')
        }

    except Exception as e:
        logger.debug(f"Failed to fetch file info from Drive API: {e}")
        return {}


async def _get_google_drive_metadata(url: str) -> UrlMetadataResponse:
    """
    Get specialized metadata for Google Drive URLs.

    Sets:
    - title: "Google Drive" (or "Google Docs/Sheets/Slides" for specific types)
    - description: Account email + optional file/folder name
    """
    # Detect service
    service = authenticated_links_service.detector.detect(url)

    if service != 'gdrive':
        # Not a Google Drive URL, return empty
        return None

    # Get file/folder info from URL
    file_info = _extract_drive_file_info(url)

    # Get available Google accounts
    accounts = await google_tokens_repository.get_all_accounts()
    valid_accounts = [
        acc for acc in accounts
        if not acc.get('requires_reauth', False)
    ]

    # Build description
    description_parts = []

    # Add account email (use first valid account)
    account_email = None
    if valid_accounts:
        account_email = valid_accounts[0].get('email', '')
        if account_email:
            description_parts.append(account_email)

    # Try to get file/folder info from Drive API if we have a file ID and valid account
    drive_file_info = {}
    if file_info.get('file_id') and account_email:
        drive_file_info = await _get_file_info_from_drive_api(
            file_info['file_id'],
            account_email
        )

    # Add file/folder name to description with proper formatting
    file_name = drive_file_info.get('name')
    if file_name:
        # Check if it's a folder
        is_folder = (
            file_info.get('file_type') == 'folder' or
            drive_file_info.get('mime_type') == 'application/vnd.google-apps.folder'
        )

        if is_folder:
            # Format folder name with shared status
            is_shared = drive_file_info.get('shared', False)
            owned_by_me = drive_file_info.get('owned_by_me', True)

            if is_shared and not owned_by_me:
                # Shared by someone else
                description_parts.append(f"Shared Folder: {file_name}")
            else:
                # My folder (may or may not be shared with others)
                description_parts.append(f"Folder: {file_name}")
        else:
            # Regular file - just show the name
            description_parts.append(file_name)
    elif file_info.get('file_type') == 'folder':
        # Fallback if we couldn't get the name but know it's a folder
        description_parts.append("Folder view")

    description = '\n'.join(description_parts) if description_parts else None

    # Determine title and favicon based on file type
    file_type = file_info.get('file_type')
    if file_type == 'doc':
        title = "Google Docs"
        favicon = "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico"
    elif file_type == 'sheet':
        title = "Google Sheets"
        favicon = "https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico"
    elif file_type == 'slide':
        title = "Google Slides"
        favicon = "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico"
    else:
        title = "Google Drive"
        favicon = "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png"

    return UrlMetadataResponse(
        title=title,
        description=description,
        favicon_url=favicon,
        site_name=title
    )


@router.get(
    "/metadata/url",
    response_model=UrlMetadataResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch URL metadata",
    description="Fetch title, description, and favicon from a URL before creating a link object.",
    tags=["Preview"]
)
async def fetch_url_metadata(
    url: str = Query(..., description="URL to fetch metadata from")
) -> UrlMetadataResponse:
    """
    Fetch metadata from a URL.

    Extracts title, description, favicon, and Open Graph metadata
    from the provided URL. Used by the frontend when adding links
    to auto-populate title and description fields.

    Special handling for Google Drive URLs:
    - Title: "Google Drive"
    - Description: Account email + optional folder name

    Args:
        url: URL to fetch metadata from

    Returns:
        UrlMetadataResponse: Extracted metadata

    Raises:
        500: Failed to fetch or parse URL
    """
    try:
        # Check if it's a Google Drive URL - use specialized handler
        drive_metadata = await _get_google_drive_metadata(url)
        if drive_metadata:
            logger.debug(
                f"Generated Google Drive metadata",
                extra={"url": url, "title": drive_metadata.title}
            )
            return drive_metadata

        # Regular URL metadata fetching
        metadata = await preview_service._fetch_url_metadata(url)

        logger.debug(
            f"Fetched metadata for URL",
            extra={"url": url, "metadata_keys": list(metadata.keys())}
        )

        return UrlMetadataResponse(
            title=metadata.get("title") or metadata.get("og_title"),
            description=metadata.get("description") or metadata.get("og_description"),
            favicon_url=metadata.get("favicon_url"),
            site_name=metadata.get("site_name"),
            og_title=metadata.get("og_title"),
            og_description=metadata.get("og_description"),
            og_image=metadata.get("og_image")
        )

    except Exception as e:
        logger.warning(f"Failed to fetch URL metadata: {e}")
        # Return empty metadata rather than error - allow user to proceed
        return UrlMetadataResponse()


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
