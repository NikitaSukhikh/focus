"""
Objects Service

Business logic layer for Object operations.
Handles validation, orchestration, and business rules for polymorphic objects.

IMPORTANT DISTINCTION - TEXT vs FILE Objects:
==============================================

1. TEXT Objects (ObjectType.TEXT):
   - Plain text content written DIRECTLY in the UI pane
   - Content stored in database (metadata.content)
   - Does NOT reference any file on disk
   - Used when user types text directly in the main pane
   - Example: Quick notes, ideas, snippets written in the app

2. FILE Objects (ObjectType.FILE) with .txt files:
   - References an ACTUAL .txt file on the filesystem
   - Only file path stored in database (metadata.file_path)
   - File content remains on disk
   - Used when user drags/adds a .txt file from their computer
   - Can be any file type including .txt, .pdf, .jpg, etc.

When user writes text in UI → Create TEXT object
When user adds .txt file → Create FILE object (happens to be text/plain MIME type)

Both types can display text content, but storage and handling differ.
"""

from uuid import UUID
from pathlib import Path
import mimetypes
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.object import (
    ObjectType,
    ObjectCreate,
    ObjectUpdate,
    ObjectResponse,
    ObjectList,
    ObjectDeleteResponse,
    LinkObjectCreate,
    FileObjectCreate,
    GoogleDriveObjectCreate,
    GmailObjectCreate,
    TextObjectCreate,
    WebArticleObjectCreate,
    FileRenameResponse,
)
import shutil
from app.storage.repositories.objects_repo import objects_repository
from app.storage.repositories.spaces_repo import spaces_repository
from app.services.thumbnails.audio_metadata import get_audio_metadata, is_audio_file
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal


logger = get_logger(__name__)


# ============================================================================
# Custom Exceptions
# ============================================================================

class ObjectServiceError(Exception):
    """Base exception for object service errors."""
    pass


class ObjectNotFoundError(ObjectServiceError):
    """Raised when an object is not found."""
    pass


class SpaceNotFoundError(ObjectServiceError):
    """Raised when the parent space is not found."""
    pass


class InvalidObjectDataError(ObjectServiceError):
    """Raised when object data is invalid."""
    pass


class ObjectFileNotFoundError(ObjectServiceError):
    """Raised when a file object's file doesn't exist."""
    pass


class ObjectLimitExceededError(ObjectServiceError):
    """Raised when object count limit is exceeded."""
    pass


# ============================================================================
# Service Class
# ============================================================================

class ObjectsService:
    """
    Service for Object business logic.

    Handles validation, orchestration, and business rules for polymorphic objects.
    """

    # Configuration
    MAX_OBJECTS_PER_ISLAND = 500  # Maximum objects per space
    MAX_TITLE_LENGTH = 400
    MIN_TITLE_LENGTH = 1
    MIN_CUSTOM_TITLE_LENGTH = 2
    MAX_TAG_LENGTH = 50
    MAX_TAGS_COUNT = 20
    MAX_TEXT_CONTENT_LENGTH = 10000

    def __init__(self):
        """Initialize the service."""
        self.objects_repo = objects_repository
        self.spaces_repo = spaces_repository

    def _get_session(self, session: AsyncSession | None) -> tuple[AsyncSession, bool]:
        """
        Return session and whether caller supplied it.
        """
        if session is not None:
            return session, True
        return AsyncSessionLocal(), False

    # ========================================================================
    # Create
    # ========================================================================

    async def create_object(
        self,
        space_id: UUID,
        object_data: ObjectCreate,
        session: AsyncSession | None = None
    ) -> ObjectResponse:
        """
        Create a new object with type-specific validation.

        Args:
            space_id: ID of the space to add the object to
            object_data: Object creation data (polymorphic)

        Returns:
            ObjectResponse: Created object

        Raises:
            SpaceNotFoundError: If space doesn't exist
            ObjectLimitExceededError: If object limit exceeded
            InvalidObjectDataError: If object data is invalid
            FileNotFoundError: If file object's file doesn't exist
        """
        session_to_use, external = self._get_session(session)

        try:
            async with session_to_use.begin():
                await self._check_space_exists(space_id, session=session_to_use)
                await self._check_object_limit(space_id, session=session_to_use)
                await self._validate_object_data(object_data)

                obj = await self.objects_repo.create_object(
                    space_id,
                    object_data,
                    session=session_to_use
                )

                await self.spaces_repo.update_space_object_count(
                    space_id,
                    delta=1,
                    session=session_to_use
                )

            # TODO: Trigger thumbnail generation asynchronously
            logger.info(
                f"Created {obj.type} object: {obj.title}",
                extra={
                    "object_id": str(obj.id),
                    "space_id": str(space_id),
                    "type": obj.type,
                    "title": obj.title
                }
            )

            return obj
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Read
    # ========================================================================

    async def get_object(self, object_id: UUID, session: AsyncSession | None = None) -> ObjectResponse:
        """
        Get an object by ID.

        Args:
            object_id: Object UUID

        Returns:
            ObjectResponse: Object data

        Raises:
            ObjectNotFoundError: If object not found
        """
        session_to_use, external = self._get_session(session)
        try:
            obj = await self.objects_repo.get_object_by_id(object_id, session=session_to_use)

            if obj is None:
                raise ObjectNotFoundError(f"Object not found: {object_id}")

            return obj
        finally:
            if not external:
                await session_to_use.close()

    async def get_objects_by_space(
        self,
        space_id: UUID,
        skip: int = 0,
        limit: int = 100,
        object_type: ObjectType | None = None,
        tags: list[str] | None = None,
        search_query: str | None = None,
        sort_by: str | None = None,
        sort_order: str = "asc",
        session: AsyncSession | None = None,
    ) -> ObjectList:
        """
        Get all objects on an space with filtering and sorting.

        Args:
            space_id: Space UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            object_type: Filter by object type
            tags: Filter by tags
            search_query: Search in title and description
            sort_by: Field to sort by
            sort_order: Sort order (asc or desc)

        Returns:
            ObjectList: Paginated list of objects

        Raises:
            SpaceNotFoundError: If space doesn't exist
        """
        session_to_use, external = self._get_session(session)
        try:
            await self._check_space_exists(space_id, session=session_to_use)

            objects = await self.objects_repo.get_objects_by_space(
                space_id=space_id,
                skip=skip,
                limit=limit,
                object_type=object_type,
                tags=tags,
                search_query=search_query,
                sort_by=sort_by,
                sort_order=sort_order,
                session=session_to_use
            )

            logger.debug(
                f"Retrieved {len(objects.objects)} objects for space {space_id}",
                extra={
                    "space_id": str(space_id),
                    "total": objects.total,
                    "filters": {
                        "type": object_type,
                        "tags": tags,
                        "search": search_query
                    }
                }
            )

            return objects
        finally:
            if not external:
                await session_to_use.close()

    async def search_objects(
        self,
        search_query: str,
        tags: list[str] | None = None,
        object_type: ObjectType | None = None,
        space_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> ObjectList:
        """
        Search objects across all spaces.

        Args:
            search_query: Search string
            tags: Filter by tags
            object_type: Filter by object type
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            ObjectList: Matching objects
        """
        session_to_use, external = self._get_session(session)
        try:
            objects = await self.objects_repo.search_objects(
                search_query=search_query,
                tags=tags,
                object_type=object_type,
                space_id=space_id,
                skip=skip,
                limit=limit,
                session=session_to_use
            )

            logger.debug(
                f"Search found {objects.total} objects",
                extra={"query": search_query, "returned": len(objects.objects)}
            )

            return objects
        finally:
            if not external:
                await session_to_use.close()

    async def get_objects_by_type(
        self,
        object_type: ObjectType,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> ObjectList:
        """
        Get all objects of a specific type.

        Args:
            object_type: Object type to filter by
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            ObjectList: Objects of the specified type
        """
        session_to_use, external = self._get_session(session)
        try:
            objects = await self.objects_repo.get_objects_by_type(
                object_type=object_type,
                skip=skip,
                limit=limit,
                session=session_to_use
            )

            logger.debug(
                f"Retrieved {objects.total} {object_type} objects",
                extra={"type": object_type, "returned": len(objects.objects)}
            )

            return objects
        finally:
            if not external:
                await session_to_use.close()

    async def get_objects_by_tag(
        self,
        tag: str,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> ObjectList:
        """
        Get all objects with a specific tag.

        Args:
            tag: Tag to filter by
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            ObjectList: Objects with the tag
        """
        session_to_use, external = self._get_session(session)
        try:
            objects = await self.objects_repo.get_objects_by_tag(
                tag=tag,
                skip=skip,
                limit=limit,
                session=session_to_use
            )

            logger.debug(
                f"Found {objects.total} objects with tag '{tag}'",
                extra={"tag": tag, "returned": len(objects.objects)}
            )

            return objects
        finally:
            if not external:
                await session_to_use.close()

    async def get_objects_by_tags(
        self,
        tags: list[str],
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> ObjectList:
        """
        Multi-tag query (AND logic) across all spaces.
        """
        session_to_use, external = self._get_session(session)
        try:
            objects = await self.objects_repo.search_objects(
                search_query="",
                tags=tags,
                object_type=None,
                space_id=None,
                skip=skip,
                limit=limit,
                session=session_to_use
            )
            return objects
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Update
    # ========================================================================

    async def update_object(
        self,
        object_id: UUID,
        object_data: ObjectUpdate,
        session: AsyncSession | None = None
    ) -> ObjectResponse:
        """
        Update an object with validation.

        Args:
            object_id: Object UUID
            object_data: Object update data

        Returns:
            ObjectResponse: Updated object

        Raises:
            ObjectNotFoundError: If object not found
            InvalidObjectDataError: If update data is invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                existing_obj = await self.objects_repo.get_object_by_id(object_id, session=session_to_use)
                if existing_obj is None:
                    raise ObjectNotFoundError(f"Object not found: {object_id}")

                if object_data.title is not None:
                    self._validate_title(object_data.title)
                if object_data.default_title is not None:
                    self._validate_title(object_data.default_title)
                self._validate_custom_title(object_data.custom_title)

                if object_data.tags is not None:
                    self._validate_tags(object_data.tags)

                updated_obj = await self.objects_repo.update_object(object_id, object_data, session=session_to_use)

                if updated_obj is None:
                    raise ObjectNotFoundError(f"Object not found during update: {object_id}")

            logger.info(
                f"Updated object: {updated_obj.title}",
                extra={"object_id": str(object_id), "title": updated_obj.title}
            )

            return updated_obj
        finally:
            if not external:
                await session_to_use.close()

    async def reorder_objects(
        self,
        space_id: UUID,
        object_ids: list[UUID],
        session: AsyncSession | None = None
    ) -> list[ObjectResponse]:
        """
        Reorder objects on an space.

        Args:
            space_id: Space UUID
            object_ids: Ordered list of object UUIDs

        Returns:
            list[ObjectResponse]: Reordered objects

        Raises:
            SpaceNotFoundError: If space doesn't exist
            InvalidObjectDataError: If object IDs are invalid
        """
        session_to_use, external = self._get_session(session)

        try:
            async with session_to_use.begin():
                await self._check_space_exists(space_id, session=session_to_use)
                reordered = await self.objects_repo.reorder_objects(space_id, object_ids, session=session_to_use)

            logger.info(
                f"Reordered {len(object_ids)} objects on space {space_id}",
                extra={"space_id": str(space_id), "object_count": len(object_ids)}
            )

            return reordered

        except ValueError as e:
            raise InvalidObjectDataError(f"Invalid reorder data: {e}")
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_object(self, object_id: UUID, session: AsyncSession | None = None) -> ObjectDeleteResponse:
        """
        Delete an object.

        Args:
            object_id: Object UUID

        Returns:
            ObjectDeleteResponse: Deletion confirmation

        Raises:
            ObjectNotFoundError: If object not found
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                obj = await self.objects_repo.get_object_by_id(object_id, session=session_to_use)
                if obj is None:
                    raise ObjectNotFoundError(f"Object not found: {object_id}")

                space_id = obj.space_id
                object_title = obj.title

                deleted = await self.objects_repo.delete_object(object_id, session=session_to_use)

                if not deleted:
                    raise ObjectNotFoundError(f"Object not found during deletion: {object_id}")

                await self.spaces_repo.update_space_object_count(space_id, delta=-1, session=session_to_use)

            logger.info(
                f"Deleted object: {object_title}",
                extra={
                    "object_id": str(object_id),
                    "space_id": str(space_id),
                    "title": object_title
                }
            )

            return ObjectDeleteResponse(
                success=True,
                object_id=object_id,
                message=f"Object '{object_title}' deleted successfully"
            )
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def _check_space_exists(self, space_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Check if an space exists.

        Args:
            space_id: Space UUID

        Raises:
            SpaceNotFoundError: If space doesn't exist
        """
        exists = await self.spaces_repo.exists(space_id, session=session)
        if not exists:
            raise SpaceNotFoundError(f"Space not found: {space_id}")

    async def _check_object_limit(self, space_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Check if object limit for space has been reached.

        Args:
            space_id: Space UUID

        Raises:
            ObjectLimitExceededError: If limit exceeded
        """
        current_count = await self.objects_repo.get_object_count_by_space(space_id, session=session)

        if current_count >= self.MAX_OBJECTS_PER_ISLAND:
            raise ObjectLimitExceededError(
                f"Maximum number of objects ({self.MAX_OBJECTS_PER_ISLAND}) "
                f"reached for this space"
            )

    async def _validate_object_data(
        self,
        object_data: ObjectCreate
    ) -> None:
        """
        Validate object creation data with type-specific checks.

        Args:
            object_data: Object creation data

        Raises:
            InvalidObjectDataError: If data is invalid
            FileNotFoundError: If file doesn't exist
        """
        # Common validation
        self._validate_title(object_data.title)
        self._validate_custom_title(getattr(object_data, "custom_title", None))
        self._validate_tags(object_data.tags)

        # Type-specific validation
        if isinstance(object_data, LinkObjectCreate):
            self._validate_link_object(object_data)
        elif isinstance(object_data, FileObjectCreate):
            await self._validate_file_object(object_data)
        elif isinstance(object_data, GoogleDriveObjectCreate):
            self._validate_google_drive_object(object_data)
        elif isinstance(object_data, GmailObjectCreate):
            self._validate_gmail_object(object_data)
        elif isinstance(object_data, TextObjectCreate):
            self._validate_text_object(object_data)
        elif isinstance(object_data, WebArticleObjectCreate):
            self._validate_link_object(object_data)  # same URL validation

    def _validate_title(self, title: str) -> None:
        """
        Validate object title.

        Args:
            title: Object title

        Raises:
            InvalidObjectDataError: If title is invalid
        """
        if not title or not title.strip():
            raise InvalidObjectDataError("Object title cannot be empty")

        if len(title) < self.MIN_TITLE_LENGTH:
            raise InvalidObjectDataError(
                f"Object title must be at least {self.MIN_TITLE_LENGTH} character(s)"
            )

        if len(title) > self.MAX_TITLE_LENGTH:
            raise InvalidObjectDataError(
                f"Object title must not exceed {self.MAX_TITLE_LENGTH} characters"
            )

    def _validate_custom_title(self, title: str | None) -> None:
        """
        Validate custom title when provided.

        Args:
            title: Custom title override

        Raises:
            InvalidObjectDataError: If title is invalid
        """
        if title is None:
            return
        if not title.strip():
            return
        if len(title.strip()) < self.MIN_CUSTOM_TITLE_LENGTH:
            raise InvalidObjectDataError(
                f"Custom title must be at least {self.MIN_CUSTOM_TITLE_LENGTH} characters"
            )
        if len(title.strip()) > self.MAX_TITLE_LENGTH:
            raise InvalidObjectDataError(
                f"Custom title must not exceed {self.MAX_TITLE_LENGTH} characters"
            )

    def _validate_tags(self, tags: list[str]) -> None:
        """
        Validate object tags.

        Args:
            tags: List of tags

        Raises:
            InvalidObjectDataError: If tags are invalid
        """
        if len(tags) > self.MAX_TAGS_COUNT:
            raise InvalidObjectDataError(
                f"Maximum number of tags ({self.MAX_TAGS_COUNT}) exceeded"
            )

        for tag in tags:
            if not tag or not tag.strip():
                raise InvalidObjectDataError("Tags cannot be empty")

            if len(tag) > self.MAX_TAG_LENGTH:
                raise InvalidObjectDataError(
                    f"Tag '{tag}' exceeds maximum length of {self.MAX_TAG_LENGTH} characters"
                )

    def _validate_link_object(self, object_data: LinkObjectCreate) -> None:
        """
        Validate link object data.

        Args:
            object_data: Link object creation data

        Raises:
            InvalidObjectDataError: If link data is invalid
        """
        # URL validation is already handled by Pydantic HttpUrl type
        # Additional custom validation can be added here

        # Ensure URL has a valid scheme
        url_str = str(object_data.url)
        if not url_str.startswith(('http://', 'https://')):
            raise InvalidObjectDataError(
                "Link URL must start with http:// or https://"
            )

        logger.debug(f"Validated link object: {url_str}")

    async def _validate_file_object(self, object_data: FileObjectCreate) -> None:
        """
        Validate file object data.

        IMPORTANT: This validates FILE objects (references to actual files on disk),
        NOT TEXT objects (plain text written in UI). FILE objects can include .txt files.

        Distinction:
        - FILE object with .txt: References an actual .txt file on the filesystem
        - TEXT object: Plain text content written directly in the UI, stored in database

        Args:
            object_data: File object creation data

        Raises:
            InvalidObjectDataError: If file data is invalid
            FileNotFoundError: If file doesn't exist
        """
        file_path = Path(object_data.file_path)

        # Check if file exists
        if not file_path.exists():
            raise ObjectFileNotFoundError(
                f"File not found: {object_data.file_path}"
            )

        # Check if it's a file (not a directory)
        if not file_path.is_file():
            raise InvalidObjectDataError(
                f"Path is not a file: {object_data.file_path}"
            )

        # Optionally validate file size (add limit if needed)
        # file_size = file_path.stat().st_size
        # if file_size > MAX_FILE_SIZE:
        #     raise InvalidObjectDataError("File too large")

        # Auto-detect MIME type if not provided
        if not object_data.mime_type:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if mime_type:
                object_data.mime_type = mime_type

        # Extract audio metadata if it's an audio file
        if is_audio_file(file_path):
            try:
                audio_metadata = get_audio_metadata(file_path)
                # Store audio metadata in the metadata field
                if not hasattr(object_data, 'metadata') or object_data.metadata is None:
                    object_data.metadata = {}
                object_data.metadata.update({
                    'audio_duration': audio_metadata.get('duration', 0),
                    'audio_bitrate': audio_metadata.get('bitrate', 0),
                    'audio_sample_rate': audio_metadata.get('sample_rate', 0),
                    'audio_channels': audio_metadata.get('channels', 0),
                })
                # Add ID3 tags if available
                if 'title' in audio_metadata:
                    object_data.metadata['audio_title'] = audio_metadata['title']
                if 'artist' in audio_metadata:
                    object_data.metadata['audio_artist'] = audio_metadata['artist']
                if 'album' in audio_metadata:
                    object_data.metadata['audio_album'] = audio_metadata['album']
                logger.info(f"Extracted audio metadata for {file_path}: {audio_metadata}")
            except Exception as e:
                logger.warning(f"Failed to extract audio metadata from {file_path}: {e}")

        logger.debug(
            f"Validated file object: {object_data.file_path}",
            extra={"path": object_data.file_path, "mime_type": object_data.mime_type}
        )

    def _validate_google_drive_object(
        self,
        object_data: GoogleDriveObjectCreate
    ) -> None:
        """
        Validate Google Drive object data.

        Args:
            object_data: Google Drive object creation data

        Raises:
            InvalidObjectDataError: If Drive data is invalid
        """
        # Validate Drive file ID format (basic check)
        if not object_data.drive_file_id or not object_data.drive_file_id.strip():
            raise InvalidObjectDataError("Drive file ID cannot be empty")

        # Validate file name
        if not object_data.drive_file_name or not object_data.drive_file_name.strip():
            raise InvalidObjectDataError("Drive file name cannot be empty")

        logger.debug(
            f"Validated Google Drive object: {object_data.drive_file_name}",
            extra={"file_id": object_data.drive_file_id}
        )

    def _validate_gmail_object(self, object_data: GmailObjectCreate) -> None:
        """
        Validate Gmail object data.

        Args:
            object_data: Gmail object creation data

        Raises:
            InvalidObjectDataError: If Gmail data is invalid
        """
        # Validate thread and message IDs
        if not object_data.thread_id or not object_data.thread_id.strip():
            raise InvalidObjectDataError("Gmail thread ID cannot be empty")

        if not object_data.message_id or not object_data.message_id.strip():
            raise InvalidObjectDataError("Gmail message ID cannot be empty")

        # Validate subject
        if not object_data.subject or not object_data.subject.strip():
            raise InvalidObjectDataError("Email subject cannot be empty")

        # Validate sender
        if not object_data.sender or not object_data.sender.strip():
            raise InvalidObjectDataError("Email sender cannot be empty")

        logger.debug(
            f"Validated Gmail object: {object_data.subject}",
            extra={
                "thread_id": object_data.thread_id,
                "message_id": object_data.message_id
            }
        )

    def _validate_text_object(self, object_data: TextObjectCreate) -> None:
        """
        Validate text object data.

        IMPORTANT: This validates TEXT objects (plain text written directly in UI),
        NOT FILE objects that reference .txt files.

        Distinction:
        - TEXT object: Plain text content written in UI, stored in metadata.content
        - FILE object with .txt: References a .txt file on disk via metadata.file_path

        Args:
            object_data: Text object creation data

        Raises:
            InvalidObjectDataError: If text data is invalid
        """
        # Validate content
        if not object_data.content or not object_data.content.strip():
            raise InvalidObjectDataError("Text content cannot be empty")

        if len(object_data.content) > self.MAX_TEXT_CONTENT_LENGTH:
            raise InvalidObjectDataError(
                f"Text content exceeds maximum length of "
                f"{self.MAX_TEXT_CONTENT_LENGTH} characters"
            )

        logger.debug(
            f"Validated text object: {len(object_data.content)} characters",
            extra={"content_length": len(object_data.content)}
        )

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def object_exists(self, object_id: UUID) -> bool:
        """
        Check if an object exists.

        Args:
            object_id: Object UUID

        Returns:
            bool: True if exists
        """
        return await self.objects_repo.exists(object_id)

    # TODO: Thumbnail generation (placeholder)
    async def _generate_thumbnail(self, obj: ObjectResponse) -> None:
        """
        Generate thumbnail for an object (placeholder).

        This will be implemented when thumbnail service is ready.

        Args:
            obj: Object to generate thumbnail for
        """
        # Placeholder for thumbnail generation
        # Will be implemented in Task 4.3: Preview & Thumbnail Service
        pass

    # TODO: Thumbnail deletion (placeholder)
    async def _delete_thumbnail(self, obj: ObjectResponse) -> None:
        """
        Delete thumbnail for an object (placeholder).

        This will be implemented when thumbnail service is ready.

        Args:
            obj: Object whose thumbnail should be deleted
        """
        # Placeholder for thumbnail deletion
        pass

    async def rename_file(
        self,
        object_id: UUID,
        new_name: str,
        session: AsyncSession | None = None
    ) -> FileRenameResponse:
        """
        Rename a file on disk and update the object's file_path metadata.

        Args:
            object_id: Object UUID
            new_name: New filename (without directory path)

        Returns:
            FileRenameResponse: Rename confirmation with old/new paths

        Raises:
            ObjectNotFoundError: If object not found
            InvalidObjectDataError: If object is not a file type or rename fails
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                obj = await self.objects_repo.get_object_by_id(object_id, session=session_to_use)
                if obj is None:
                    raise ObjectNotFoundError(f"Object not found: {object_id}")

                if obj.type != ObjectType.FILE:
                    raise InvalidObjectDataError("Only file objects can be renamed")

                old_path = obj.metadata.get("file_path")
                if not old_path:
                    raise InvalidObjectDataError("File object has no file_path")

                old_path_obj = Path(old_path)
                if not old_path_obj.exists():
                    raise InvalidObjectDataError(f"File does not exist: {old_path}")

                # Preserve extension if not provided in new_name
                old_ext = old_path_obj.suffix
                new_name_path = Path(new_name)
                if not new_name_path.suffix and old_ext:
                    new_name = new_name + old_ext

                new_path_obj = old_path_obj.parent / new_name
                new_path = str(new_path_obj)

                if new_path_obj.exists():
                    raise InvalidObjectDataError(f"File already exists: {new_path}")

                # Perform the actual file rename on disk
                try:
                    shutil.move(str(old_path_obj), str(new_path_obj))
                except OSError as e:
                    raise InvalidObjectDataError(f"Failed to rename file: {e}")

                # Update the object metadata with new path and title
                new_title = new_name_path.stem if new_name_path.suffix else new_name
                update_data = ObjectUpdate(
                    default_title=new_title,
                    metadata={"file_path": new_path}
                )
                await self.objects_repo.update_object(object_id, update_data, session=session_to_use)

            logger.info(
                f"Renamed file: {old_path} -> {new_path}",
                extra={"object_id": str(object_id), "old_path": old_path, "new_path": new_path}
            )

            return FileRenameResponse(
                success=True,
                object_id=object_id,
                old_path=old_path,
                new_path=new_path,
                new_title=new_title
            )
        finally:
            if not external:
                await session_to_use.close()


# ============================================================================
# Singleton Instance
# ============================================================================

# Create a singleton instance
objects_service = ObjectsService()


# ============================================================================
# Convenience Functions
# ============================================================================

def get_service() -> ObjectsService:
    """
    Get the objects service instance.

    This is used for dependency injection in FastAPI routes.

    Returns:
        ObjectsService: Service instance
    """
    return objects_service
