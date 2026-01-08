"""
Preview Service

Orchestrates preview generation for all object types.
Handles URLs, files, images, PDFs, text, and service objects.

IMPORTANT DISTINCTION - TEXT vs FILE Objects:
==============================================

When generating previews, this service handles two distinct text-related scenarios:

1. TEXT Object Previews (_generate_text_preview):
   - Input: ObjectType.TEXT with metadata.content
   - Source: Plain text written directly in UI pane
   - Stored: In database (metadata.content field)
   - Preview: Displays content from database
   - No file I/O involved

2. FILE Object Previews with .txt files (_generate_file_preview):
   - Input: ObjectType.FILE with metadata.file_path pointing to .txt
   - Source: Actual .txt file on user's filesystem
   - Stored: Only file path in database
   - Preview: Reads file from disk, shows file metadata (size, dates, etc.)
   - File I/O required to read content

Both can display text content, but handling is completely different!
"""

from typing import Optional, Union, Dict, Any
from pathlib import Path
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
import mimetypes

from app.models.object import ObjectResponse, ObjectType
from app.models.preview import (
    PreviewResponse,
    LinkPreview,
    FilePreview,
    TextPreview,
    GoogleDrivePreview,
    GmailPreview,
    PreviewError,
)
from app.services.thumbnails.text_preview import text_preview_service
from app.services.thumbnails.file_thumbnail import file_thumbnail_service
from app.services.thumbnails.audio_metadata import is_audio_file, get_audio_metadata
from app.core.config import get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)
settings = get_settings()


class PreviewService:
    """
    Service for generating previews for all object types.

    Orchestrates different preview generators based on object type.
    """

    # HTTP client settings
    HTTP_TIMEOUT = 10.0  # seconds
    MAX_CONTENT_LENGTH = 1024 * 1024 * 5  # 5MB max for URL fetching
    MAX_BODY_BYTES = 1024 * 1024 * 2  # 2MB hard cap for HTML body fetch
    CACHE_TTL_SECONDS = 60 * 10  # 10 minutes

    def __init__(self):
        """Initialize the preview service."""
        self.settings = settings
        self.text_service = text_preview_service
        self.thumbnail_service = file_thumbnail_service
        # Simple in-memory cache for URL metadata keyed by (url, etag/last-modified)
        self._metadata_cache: dict[str, tuple[dict[str, Any], float]] = {}

    async def generate_preview(
        self,
        obj: ObjectResponse
    ) -> Union[PreviewResponse, PreviewError]:
        """
        Generate preview for an object based on its type.

        Args:
            obj: Object to generate preview for

        Returns:
            Union[PreviewResponse, PreviewError]: Preview data or error
        """
        try:
            if obj.type == ObjectType.LINK:
                return await self._generate_link_preview(obj)
            # If metadata already includes a thumbnail or og data, short-circuit for speed.
            if obj.type == ObjectType.LINK and obj.metadata.get("og_title") and obj.metadata.get("og_image"):
                return LinkPreview(
                    object_id=obj.id,
                    object_type=ObjectType.LINK,
                    title=obj.title,
                    description=obj.description,
                    tags=obj.tags,
                    url=obj.metadata.get("url"),
                    favicon_url=obj.metadata.get("favicon_url"),
                    thumbnail_url=obj.metadata.get("og_image"),
                    site_name=obj.metadata.get("site_name"),
                    og_title=obj.metadata.get("og_title"),
                    og_description=obj.metadata.get("og_description"),
                    og_image=obj.metadata.get("og_image"),
                )

            if obj.type == ObjectType.LINK:
                return await self._generate_link_preview(obj)
            elif obj.type == ObjectType.FILE:
                return await self._generate_file_preview(obj)
            elif obj.type == ObjectType.TEXT:
                return self._generate_text_preview(obj)
            elif obj.type == ObjectType.GOOGLE_DRIVE:
                return self._generate_google_drive_preview(obj)
            elif obj.type == ObjectType.GMAIL:
                return self._generate_gmail_preview(obj)
            else:
                return PreviewError(
                    object_id=obj.id,
                    error=f"Unsupported object type: {obj.type}",
                    error_type="unsupported_type",
                    is_accessible=False
                )

        except Exception as e:
            logger.error(
                f"Failed to generate preview for object {obj.id}: {e}",
                exc_info=True
            )
            return PreviewError(
                object_id=obj.id,
                error=str(e),
                error_type="preview_generation_failed",
                is_accessible=False
            )

    # ========================================================================
    # Link Preview
    # ========================================================================

    async def _generate_link_preview(self, obj: ObjectResponse) -> LinkPreview:
        """
        Generate preview for a link object.

        Fetches URL metadata (title, description, favicon, Open Graph data).

        Args:
            obj: Link object

        Returns:
            LinkPreview: Link preview data
        """
        url = obj.metadata.get("url")
        if not url:
            raise ValueError("Link object missing URL")

        # Fetch URL metadata
        metadata = await self._fetch_url_metadata(url)

        return LinkPreview(
            object_id=obj.id,
            object_type=ObjectType.LINK,
            title=obj.title,
            description=obj.description,
            tags=obj.tags,
            url=url,
            favicon_url=metadata.get("favicon_url") or obj.metadata.get("favicon_url"),
            thumbnail_url=metadata.get("og_image") or obj.metadata.get("thumbnail_url"),
            site_name=metadata.get("site_name"),
            og_title=metadata.get("og_title"),
            og_description=metadata.get("og_description"),
            og_image=metadata.get("og_image"),
        )

    async def _fetch_url_metadata(self, url: str) -> Dict[str, Any]:
        """
        Fetch metadata from a URL (title, description, favicon, Open Graph).

        Args:
            url: URL to fetch metadata from

        Returns:
            Dict[str, Any]: Metadata dictionary
        """
        metadata = {}

        # Cache key based on URL; etag will be added once we fetch headers.
        now = datetime.utcnow().timestamp()
        cached = self._metadata_cache.get(url)
        if cached and now - cached[1] <= self.CACHE_TTL_SECONDS:
            return cached[0]

        try:
            async with httpx.AsyncClient(timeout=self.HTTP_TIMEOUT) as client:
                # First do a HEAD to get lightweight etag/size.
                head = await client.head(
                    url,
                    follow_redirects=True,
                    headers={"User-Agent": "Focus/1.0 (Preview Generator)"},
                )
                etag = head.headers.get("etag") or head.headers.get("last-modified")
                content_length = head.headers.get("content-length")
                if content_length and int(content_length) > self.MAX_CONTENT_LENGTH:
                    raise ValueError("Content too large for preview")

                cache_key = f"{url}:{etag}" if etag else url
                cached_by_etag = self._metadata_cache.get(cache_key)
                if cached_by_etag and now - cached_by_etag[1] <= self.CACHE_TTL_SECONDS:
                    return cached_by_etag[0]

                response = await client.get(
                    url,
                    follow_redirects=True,
                    headers={"User-Agent": "Focus/1.0 (Preview Generator)"}
                )
                response.raise_for_status()
                # Enforce body size cap
                if len(response.content) > self.MAX_BODY_BYTES:
                    raise ValueError("Response body too large for preview parsing")

                # Parse HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # Track the final resolved URL after redirects
                metadata['resolved_url'] = str(response.url)

                # Extract title
                title_tag = soup.find('title')
                if title_tag:
                    metadata['title'] = title_tag.get_text().strip()

                # Extract Open Graph metadata
                og_tags = soup.find_all('meta', property=lambda x: x and x.startswith('og:'))
                for tag in og_tags:
                    property_name = tag.get('property', '').replace('og:', '')
                    content = tag.get('content')
                    if content:
                        if property_name == 'title':
                            metadata['og_title'] = content
                        elif property_name == 'description':
                            metadata['og_description'] = content
                        elif property_name == 'image':
                            metadata['og_image'] = content
                        elif property_name == 'site_name':
                            metadata['site_name'] = content
                        elif property_name == 'image:secure_url' and 'og_image' not in metadata:
                            metadata['og_image'] = content

                # Twitter card image as fallback
                twitter_image = soup.find('meta', attrs={'name': 'twitter:image'}) or soup.find('meta', attrs={'name': 'twitter:image:src'})
                if twitter_image and twitter_image.get('content') and 'og_image' not in metadata:
                    metadata['og_image'] = twitter_image.get('content')

                # Amazon and other sites sometimes expose image via link rel="image_src"
                if 'og_image' not in metadata:
                    link_image = soup.find('link', rel=lambda x: x and 'image_src' in str(x).lower())
                    if link_image and link_image.get('href'):
                        metadata['og_image'] = link_image.get('href')

                # Amazon-specific fallback: parse landing image attributes
                if 'og_image' not in metadata:
                    landing_img = soup.find('img', id='landingImage')
                    if landing_img:
                        data_old = landing_img.get('data-old-hires')
                        if data_old:
                            metadata['og_image'] = data_old
                        else:
                            data_dyn = landing_img.get('data-a-dynamic-image')
                            if data_dyn:
                                try:
                                    import json
                                    dyn_images = json.loads(data_dyn)
                                    if isinstance(dyn_images, dict):
                                        first_url = next(iter(dyn_images.keys()), None)
                                        if first_url:
                                            metadata['og_image'] = first_url
                                except Exception:
                                    pass

                # Extract meta description
                desc_tag = soup.find('meta', attrs={'name': 'description'})
                if desc_tag:
                    metadata['description'] = desc_tag.get('content', '')

                # Extract favicon - try multiple approaches
                favicon = None

                # Try finding link with rel containing 'icon' (case-insensitive)
                favicon = soup.find('link', rel=lambda x: x and 'icon' in str(x).lower())

                # If not found, try shortcut icon specifically
                if not favicon:
                    favicon = soup.find('link', rel='shortcut icon')

                # If still not found, try apple-touch-icon
                if not favicon:
                    favicon = soup.find('link', rel='apple-touch-icon')

                if favicon and favicon.get('href'):
                    favicon_url = favicon.get('href')
                    # Make absolute URL if relative
                    if not favicon_url.startswith(('http://', 'https://')):
                        from urllib.parse import urljoin
                        favicon_url = urljoin(url, favicon_url)
                    metadata['favicon_url'] = favicon_url
                else:
                    # Fallback: try /favicon.ico on the domain
                    from urllib.parse import urlparse, urljoin
                    parsed = urlparse(response.url)  # Use final URL after redirects
                    base_url = f"{parsed.scheme}://{parsed.netloc}"
                    metadata['favicon_url'] = urljoin(base_url, '/favicon.ico')

                logger.debug(
                    f"Fetched URL metadata for {url}",
                    extra={"url": url, "metadata_keys": list(metadata.keys())}
                )

                # Cache the metadata
                self._metadata_cache[cache_key] = (metadata, now)

        except Exception as e:
            logger.warning(f"Failed to fetch URL metadata for {url}: {e}")

        return metadata

    # ========================================================================
    # File Preview
    # ========================================================================

    async def _generate_file_preview(self, obj: ObjectResponse) -> FilePreview:
        """
        Generate preview for a FILE object (reference to file on disk).

        IMPORTANT DISTINCTION:
        - FILE object with .txt: Reads actual .txt file from filesystem, shows file metadata
        - TEXT object: Plain text from UI, stored in DB (handled by _generate_text_preview)

        This method:
        - Reads files from disk (including .txt files)
        - Shows file metadata (size, dates, path)
        - Generates thumbnails for images
        - Generates text preview by reading .txt files from disk

        Handles: images, text files (.txt), PDFs, and other file types.

        Args:
            obj: File object (must have metadata.file_path)

        Returns:
            FilePreview: File preview data
        """
        file_path = obj.metadata.get("file_path")
        if not file_path:
            raise ValueError("File object missing file_path")

        path = Path(file_path)
        is_accessible = path.exists() and path.is_file()

        # Get file metadata
        file_name = path.name
        file_extension = path.suffix
        mime_type = obj.metadata.get("mime_type") or mimetypes.guess_type(str(path))[0]

        file_size = None
        file_size_human = None
        created_date = None
        modified_date = None
        thumbnail_url = None
        text_preview = None

        if is_accessible:
            # Get file stats
            stats = path.stat()
            file_size = stats.st_size
            file_size_human = self.thumbnail_service.get_human_readable_size(file_size)
            created_date = datetime.fromtimestamp(stats.st_ctime)
            modified_date = datetime.fromtimestamp(stats.st_mtime)

            # Generate thumbnail for images
            if self.thumbnail_service.is_image(file_path):
                try:
                    thumbnail_url = self.thumbnail_service.generate_image_thumbnail(
                        file_path,
                        quality=settings.storage.thumbnail_quality
                    )
                except Exception as e:
                    logger.warning(f"Failed to generate thumbnail: {e}")

            # Generate text preview for text files
            elif mime_type and mime_type.startswith('text/'):
                try:
                    # Load full file content (no line limit) for preview pane
                    # The frontend will handle scrolling and display
                    text_content, _ = self.text_service.get_text_preview(
                        file_path,
                        max_lines=None  # Load entire file
                    )
                    text_preview = text_content  # Return full content
                except Exception as e:
                    logger.warning(f"Failed to generate text preview: {e}")

            # Check if this is an audio file and add metadata
            elif is_audio_file(file_path):
                try:
                    audio_metadata = get_audio_metadata(file_path)
                    # Audio files are handled in the frontend with AudioPlayer component
                    # The metadata is already stored in the object's metadata during creation
                    logger.debug(f"Audio file detected: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to extract audio metadata: {e}")

            # TODO: Consider dispatching a background job to refresh thumbnails/previews asynchronously
            # using a task queue if generation becomes heavy.

        return FilePreview(
            object_id=obj.id,
            object_type=ObjectType.FILE,
            title=obj.title,
            description=obj.description,
            tags=obj.tags,
            file_path=file_path,
            file_name=file_name,
            file_extension=file_extension,
            file_size=file_size,
            file_size_human=file_size_human,
            mime_type=mime_type,
            thumbnail_url=thumbnail_url,
            text_preview=text_preview,
            created_date=created_date,
            modified_date=modified_date,
            is_accessible=is_accessible,
        )

    # ========================================================================
    # Text Preview
    # ========================================================================

    def _generate_text_preview(self, obj: ObjectResponse) -> TextPreview:
        """
        Generate preview for a TEXT object (plain text written in UI).

        IMPORTANT DISTINCTION:
        - TEXT object: Plain text written directly in UI, stored in metadata.content
        - FILE object with .txt: Actual .txt file on disk (handled by _generate_file_preview)

        This method:
        - Displays text content from database (metadata.content)
        - Does NOT read any file from disk
        - Shows word/character counts
        - Used for quick notes typed directly in the app

        Args:
            obj: Text object (must have metadata.content)

        Returns:
            TextPreview: Text preview data
        """
        content = obj.metadata.get("content", "")

        # Generate preview (first 200 characters)
        content_preview = content[:200]
        if len(content) > 200:
            content_preview += "..."

        # Calculate stats
        word_count = self.text_service.get_word_count(content)
        character_count = self.text_service.get_character_count(content)

        return TextPreview(
            object_id=obj.id,
            object_type=ObjectType.TEXT,
            title=obj.title,
            description=obj.description,
            tags=obj.tags,
            content=content,
            content_preview=content_preview,
            word_count=word_count,
            character_count=character_count,
        )

    # ========================================================================
    # Google Drive Preview
    # ========================================================================

    def _generate_google_drive_preview(
        self,
        obj: ObjectResponse
    ) -> GoogleDrivePreview:
        """
        Generate preview for a Google Drive object.

        Note: Requires Google OAuth to be connected for full data.

        Args:
            obj: Google Drive object

        Returns:
            GoogleDrivePreview: Google Drive preview data
        """
        # Extract metadata
        drive_file_id = obj.metadata.get("drive_file_id", "")
        drive_file_name = obj.metadata.get("drive_file_name", "")
        mime_type = obj.metadata.get("mime_type")
        web_view_link = obj.metadata.get("web_view_link")

        # TODO: Fetch additional metadata from Google Drive API if connected
        # This will be implemented when Google OAuth service is ready

        return GoogleDrivePreview(
            object_id=obj.id,
            object_type=ObjectType.GOOGLE_DRIVE,
            title=obj.title,
            description=obj.description,
            tags=obj.tags,
            drive_file_id=drive_file_id,
            drive_file_name=drive_file_name,
            mime_type=mime_type,
            web_view_link=web_view_link,
            is_accessible=True,  # TODO: Check Google OAuth connection
        )

    # ========================================================================
    # Gmail Preview
    # ========================================================================

    def _generate_gmail_preview(self, obj: ObjectResponse) -> GmailPreview:
        """
        Generate preview for a Gmail object.

        Note: Requires Gmail OAuth to be connected for full data.

        Args:
            obj: Gmail object

        Returns:
            GmailPreview: Gmail preview data
        """
        # Extract metadata
        thread_id = obj.metadata.get("thread_id", "")
        message_id = obj.metadata.get("message_id", "")
        subject = obj.metadata.get("subject", "")
        sender = obj.metadata.get("sender", "")
        snippet = obj.metadata.get("snippet")
        received_date_str = obj.metadata.get("received_date")

        received_date = None
        if received_date_str:
            try:
                received_date = datetime.fromisoformat(received_date_str)
            except ValueError:
                pass

        # TODO: Fetch additional metadata from Gmail API if connected
        # This will be implemented when Google OAuth service is ready

        return GmailPreview(
            object_id=obj.id,
            object_type=ObjectType.GMAIL,
            title=obj.title,
            description=obj.description,
            tags=obj.tags,
            thread_id=thread_id,
            message_id=message_id,
            subject=subject,
            sender=sender,
            snippet=snippet,
            received_date=received_date,
            is_accessible=True,  # TODO: Check Gmail OAuth connection
        )


# Singleton instance
preview_service = PreviewService()


def get_service() -> PreviewService:
    """
    Get the preview service instance.

    Returns:
        PreviewService: Service instance
    """
    return preview_service
