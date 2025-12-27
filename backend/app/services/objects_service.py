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

from typing import List, Optional, Union
from uuid import UUID
from pathlib import Path
import mimetypes

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
)
from app.storage.repositories.objects_repo import objects_repository
from app.storage.repositories.islands_repo import islands_repository
from app.core.logging import get_logger


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


class IslandNotFoundError(ObjectServiceError):
    """Raised when the parent island is not found."""
    pass


class InvalidObjectDataError(ObjectServiceError):
    """Raised when object data is invalid."""
    pass


class FileNotFoundError(ObjectServiceError):
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
    MAX_OBJECTS_PER_ISLAND = 500  # Maximum objects per island
    MAX_TITLE_LENGTH = 400
    MIN_TITLE_LENGTH = 1
    MAX_TAG_LENGTH = 50
    MAX_TAGS_COUNT = 20
    MAX_TEXT_CONTENT_LENGTH = 10000

    def __init__(self):
        """Initialize the service."""
        self.objects_repo = objects_repository
        self.islands_repo = islands_repository

    # ========================================================================
    # Create
    # ========================================================================

    async def create_object(
        self,
        island_id: UUID,
        object_data: Union[
            LinkObjectCreate,
            FileObjectCreate,
            GoogleDriveObjectCreate,
            GmailObjectCreate,
            TextObjectCreate
        ]
    ) -> ObjectResponse:
        """
        Create a new object with type-specific validation.

        Args:
            island_id: ID of the island to add the object to
            object_data: Object creation data (polymorphic)

        Returns:
            ObjectResponse: Created object

        Raises:
            IslandNotFoundError: If island doesn't exist
            ObjectLimitExceededError: If object limit exceeded
            InvalidObjectDataError: If object data is invalid
            FileNotFoundError: If file object's file doesn't exist
        """
        # Validate island exists
        await self._check_island_exists(island_id)

        # Check object limit for island
        await self._check_object_limit(island_id)

        # Type-specific validation
        await self._validate_object_data(object_data)

        # Create object
        obj = await self.objects_repo.create_object(island_id, object_data)

        # Update island's object count
        await self.islands_repo.update_island_object_count(island_id, delta=1)

        # TODO: Trigger thumbnail generation asynchronously
        # await self._generate_thumbnail(obj)

        logger.info(
            f"Created {obj.type} object: {obj.title}",
            extra={
                "object_id": str(obj.id),
                "island_id": str(island_id),
                "type": obj.type,
                "title": obj.title
            }
        )

        return obj

    # ========================================================================
    # Read
    # ========================================================================

    async def get_object(self, object_id: UUID) -> ObjectResponse:
        """
        Get an object by ID.

        Args:
            object_id: Object UUID

        Returns:
            ObjectResponse: Object data

        Raises:
            ObjectNotFoundError: If object not found
        """
        obj = await self.objects_repo.get_object_by_id(object_id)

        if obj is None:
            raise ObjectNotFoundError(f"Object not found: {object_id}")

        return obj

    async def get_objects_by_island(
        self,
        island_id: UUID,
        skip: int = 0,
        limit: int = 100,
        object_type: Optional[ObjectType] = None,
        tags: Optional[List[str]] = None,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> ObjectList:
        """
        Get all objects on an island with filtering and sorting.

        Args:
            island_id: Island UUID
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
            IslandNotFoundError: If island doesn't exist
        """
        # Validate island exists
        await self._check_island_exists(island_id)

        objects = await self.objects_repo.get_objects_by_island(
            island_id=island_id,
            skip=skip,
            limit=limit,
            object_type=object_type,
            tags=tags,
            search_query=search_query,
            sort_by=sort_by,
            sort_order=sort_order
        )

        logger.debug(
            f"Retrieved {len(objects.objects)} objects for island {island_id}",
            extra={
                "island_id": str(island_id),
                "total": objects.total,
                "filters": {
                    "type": object_type,
                    "tags": tags,
                    "search": search_query
                }
            }
        )

        return objects

    async def search_objects(
        self,
        search_query: str,
        tags: Optional[List[str]] = None,
        object_type: Optional[ObjectType] = None,
        skip: int = 0,
        limit: int = 100
    ) -> ObjectList:
        """
        Search objects across all islands.

        Args:
            search_query: Search string
            tags: Filter by tags
            object_type: Filter by object type
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            ObjectList: Matching objects
        """
        objects = await self.objects_repo.search_objects(
            search_query=search_query,
            tags=tags,
            object_type=object_type,
            skip=skip,
            limit=limit
        )

        logger.debug(
            f"Search found {objects.total} objects",
            extra={"query": search_query, "returned": len(objects.objects)}
        )

        return objects

    async def get_objects_by_type(
        self,
        object_type: ObjectType,
        skip: int = 0,
        limit: int = 100
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
        objects = await self.objects_repo.get_objects_by_type(
            object_type=object_type,
            skip=skip,
            limit=limit
        )

        logger.debug(
            f"Retrieved {objects.total} {object_type} objects",
            extra={"type": object_type, "returned": len(objects.objects)}
        )

        return objects

    async def get_objects_by_tag(
        self,
        tag: str,
        skip: int = 0,
        limit: int = 100
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
        objects = await self.objects_repo.get_objects_by_tag(
            tag=tag,
            skip=skip,
            limit=limit
        )

        logger.debug(
            f"Found {objects.total} objects with tag '{tag}'",
            extra={"tag": tag, "returned": len(objects.objects)}
        )

        return objects

    # ========================================================================
    # Update
    # ========================================================================

    async def update_object(
        self,
        object_id: UUID,
        object_data: ObjectUpdate
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
        # Check object exists
        existing_obj = await self.objects_repo.get_object_by_id(object_id)
        if existing_obj is None:
            raise ObjectNotFoundError(f"Object not found: {object_id}")

        # Validate update data
        if object_data.title:
            self._validate_title(object_data.title)

        if object_data.tags is not None:
            self._validate_tags(object_data.tags)

        # Update object
        updated_obj = await self.objects_repo.update_object(object_id, object_data)

        if updated_obj is None:
            raise ObjectNotFoundError(f"Object not found during update: {object_id}")

        logger.info(
            f"Updated object: {updated_obj.title}",
            extra={"object_id": str(object_id), "title": updated_obj.title}
        )

        return updated_obj

    async def reorder_objects(
        self,
        island_id: UUID,
        object_ids: List[UUID]
    ) -> List[ObjectResponse]:
        """
        Reorder objects on an island.

        Args:
            island_id: Island UUID
            object_ids: Ordered list of object UUIDs

        Returns:
            List[ObjectResponse]: Reordered objects

        Raises:
            IslandNotFoundError: If island doesn't exist
            InvalidObjectDataError: If object IDs are invalid
        """
        # Validate island exists
        await self._check_island_exists(island_id)

        try:
            reordered = await self.objects_repo.reorder_objects(island_id, object_ids)

            logger.info(
                f"Reordered {len(object_ids)} objects on island {island_id}",
                extra={"island_id": str(island_id), "object_count": len(object_ids)}
            )

            return reordered

        except ValueError as e:
            raise InvalidObjectDataError(f"Invalid reorder data: {e}")

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_object(self, object_id: UUID) -> ObjectDeleteResponse:
        """
        Delete an object.

        Args:
            object_id: Object UUID

        Returns:
            ObjectDeleteResponse: Deletion confirmation

        Raises:
            ObjectNotFoundError: If object not found
        """
        # Check object exists and get its data
        obj = await self.objects_repo.get_object_by_id(object_id)
        if obj is None:
            raise ObjectNotFoundError(f"Object not found: {object_id}")

        island_id = obj.island_id
        object_title = obj.title

        # Delete the object
        deleted = await self.objects_repo.delete_object(object_id)

        if not deleted:
            raise ObjectNotFoundError(f"Object not found during deletion: {object_id}")

        # Update island's object count
        await self.islands_repo.update_island_object_count(island_id, delta=-1)

        # TODO: Delete associated thumbnail if exists
        # await self._delete_thumbnail(obj)

        logger.info(
            f"Deleted object: {object_title}",
            extra={
                "object_id": str(object_id),
                "island_id": str(island_id),
                "title": object_title
            }
        )

        return ObjectDeleteResponse(
            success=True,
            object_id=object_id,
            message=f"Object '{object_title}' deleted successfully"
        )

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def _check_island_exists(self, island_id: UUID) -> None:
        """
        Check if an island exists.

        Args:
            island_id: Island UUID

        Raises:
            IslandNotFoundError: If island doesn't exist
        """
        exists = await self.islands_repo.exists(island_id)
        if not exists:
            raise IslandNotFoundError(f"Island not found: {island_id}")

    async def _check_object_limit(self, island_id: UUID) -> None:
        """
        Check if object limit for island has been reached.

        Args:
            island_id: Island UUID

        Raises:
            ObjectLimitExceededError: If limit exceeded
        """
        current_count = await self.objects_repo.get_object_count_by_island(island_id)

        if current_count >= self.MAX_OBJECTS_PER_ISLAND:
            raise ObjectLimitExceededError(
                f"Maximum number of objects ({self.MAX_OBJECTS_PER_ISLAND}) "
                f"reached for this island"
            )

    async def _validate_object_data(
        self,
        object_data: Union[
            LinkObjectCreate,
            FileObjectCreate,
            GoogleDriveObjectCreate,
            GmailObjectCreate,
            TextObjectCreate
        ]
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

    def _validate_tags(self, tags: List[str]) -> None:
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
            raise FileNotFoundError(
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
