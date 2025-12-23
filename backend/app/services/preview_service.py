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

    def __init__(self):
        """Initialize the preview service."""
        self.settings = settings
        self.text_service = text_preview_service
        self.thumbnail_service = file_thumbnail_service

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

        try:
            async with httpx.AsyncClient(timeout=self.HTTP_TIMEOUT) as client:
                response = await client.get(
                    url,
                    follow_redirects=True,
                    headers={"User-Agent": "Ocean/1.0 (Preview Generator)"}
                )
                response.raise_for_status()

                # Parse HTML
                soup = BeautifulSoup(response.text, 'html.parser')

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

                # Extract meta description
                desc_tag = soup.find('meta', attrs={'name': 'description'})
                if desc_tag:
                    metadata['description'] = desc_tag.get('content', '')

                # Extract favicon
                favicon = soup.find('link', rel=lambda x: x and 'icon' in x.lower())
                if favicon and favicon.get('href'):
                    favicon_url = favicon.get('href')
                    # Make absolute URL if relative
                    if not favicon_url.startswith(('http://', 'https://')):
                        from urllib.parse import urljoin
                        favicon_url = urljoin(url, favicon_url)
                    metadata['favicon_url'] = favicon_url

                logger.debug(
                    f"Fetched URL metadata for {url}",
                    extra={"url": url, "metadata_keys": list(metadata.keys())}
                )

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
                    text_content, _ = self.text_service.get_text_preview(
                        file_path,
                        max_lines=settings.storage.text_preview_lines
                    )
                    text_preview = text_content[:500]  # Limit preview length
                except Exception as e:
                    logger.warning(f"Failed to generate text preview: {e}")

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
