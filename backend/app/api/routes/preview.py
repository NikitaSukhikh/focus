"""
Preview Routes

API endpoints for generating and serving object previews and thumbnails.
"""

import ipaddress
import socket
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
from app.core.config import get_settings, Settings
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


_PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
]


def _validate_url_for_fetch(url: str) -> None:
    """
    Reject URLs that would cause SSRF by targeting internal/private hosts.

    Raises HTTPException(400) for invalid schemes or private IP targets.
    """
    from fastapi import HTTPException

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only http and https URLs are supported.",
        )

    hostname = parsed.hostname or ""
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must include a valid hostname.",
        )

    # Resolve hostname to IP and check against private ranges
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for _family, _type, _proto, _canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            try:
                ip = ipaddress.ip_address(ip_str)
                if any(ip in net for net in _PRIVATE_NETWORKS):
                    logger.warning(f"SSRF attempt blocked: {hostname} -> {ip_str}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="URL targets a private or internal address.",
                    )
            except ValueError:
                pass
    except HTTPException:
        raise
    except OSError:
        # DNS resolution failed — let the downstream HTTP client handle it
        pass


class UrlMetadataResponse(BaseModel):
    """Response model for URL metadata."""
    title: str | None = None
    description: str | None = None
    favicon_url: str | None = None
    site_name: str | None = None
    channel_name: str | None = None
    channel_icon_url: str | None = None
    og_title: str | None = None
    og_description: str | None = None
    og_image: str | None = None
    resolved_url: str | None = None


# ============================================================================
# Preview Endpoints
# ============================================================================


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

    Args:
        url: URL to fetch metadata from

    Returns:
        UrlMetadataResponse: Extracted metadata

    Raises:
        500: Failed to fetch or parse URL
    """
    try:
        _validate_url_for_fetch(url)
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
            channel_name=metadata.get("channel_name"),
            channel_icon_url=metadata.get("channel_icon_url"),
            og_title=metadata.get("og_title"),
            og_description=metadata.get("og_description"),
            og_image=metadata.get("og_image"),
            resolved_url=metadata.get("resolved_url") or url
        )

    except Exception as e:
        logger.warning(f"Failed to fetch URL metadata: {e}")
        # Return empty metadata rather than error - allow user to proceed
        return UrlMetadataResponse()


class ArticleContentResponse(BaseModel):
    """Response model for extracted article content."""
    title: str | None = None
    content_html: str | None = None
    error: str | None = None


@router.get(
    "/article/extract",
    response_model=ArticleContentResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract article content",
    description="Fetch and extract readable article content from a URL as HTML.",
    tags=["Preview"]
)
async def extract_article_content(
    url: str = Query(..., description="URL to extract article from")
) -> ArticleContentResponse:
    """
    Extract clean article content from a URL using BeautifulSoup.
    Strips navigation, ads and boilerplate; returns main article body as HTML.
    """
    import httpx
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        _validate_url_for_fetch(url)
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text
    except Exception as exc:
        logger.warning(f"[article/extract] Failed to fetch URL: {exc}")
        return ArticleContentResponse(error=f"Could not fetch URL: {exc}")

    try:
        soup = BeautifulSoup(html, "lxml")

        for tag in soup(["script", "style", "noscript", "nav", "header",
                          "footer", "aside", "form", "iframe", "svg",
                          "button", "input", "select", "textarea"]):
            tag.decompose()

        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else None

        article = None
        for selector in ["article", '[role="main"]', "main",
                          ".article-body", ".post-content",
                          ".entry-content", ".content"]:
            article = soup.select_one(selector)
            if article:
                break
        if not article:
            article = soup.find("body")

        content_html = str(article) if article else "<p>No content found.</p>"
        return ArticleContentResponse(title=title, content_html=content_html)

    except Exception as exc:
        logger.warning(f"[article/extract] Parse failed: {exc}")
        return ArticleContentResponse(error=f"Could not parse article: {exc}")


@router.get(
    "/objects/{object_id}/preview",
    response_model=PreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get object preview",
    description="Generate and return preview data for an object based on its type.",
    tags=["Preview"]
)
async def get_object_preview(
    object_id: UUID
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
    object_id: UUID,
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
