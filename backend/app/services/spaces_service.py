"""
Spaces Service

Business logic layer for Space operations.
Handles validation, orchestration, and business rules for spaces.
"""

from typing import List, Optional
from uuid import UUID

from app.models.space import (
    SpaceCreate,
    SpaceUpdate,
    SpaceResponse,
    SpaceList,
    SpaceDeleteResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession
from app.storage.repositories.spaces_repo import spaces_repository
from app.storage.repositories.objects_repo import objects_repository
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal


logger = get_logger(__name__)


# ============================================================================
# Custom Exceptions
# ============================================================================

class SpaceServiceError(Exception):
    """Base exception for space service errors."""
    pass


class SpaceNotFoundError(SpaceServiceError):
    """Raised when an space is not found."""
    pass


class SpaceNameConflictError(SpaceServiceError):
    """Raised when space name already exists."""
    pass


class SpaceLimitExceededError(SpaceServiceError):
    """Raised when space count limit is exceeded."""
    pass


class InvalidSpaceDataError(SpaceServiceError):
    """Raised when space data is invalid."""
    pass


# ============================================================================
# Service Class
# ============================================================================

class SpacesService:
    """
    Service for Space business logic.

    Handles validation, orchestration, and business rules.
    """

    # Configuration
    MAX_ISLANDS = 100  # Maximum number of spaces per user
    MAX_NAME_LENGTH = 100
    MIN_NAME_LENGTH = 1

    def __init__(self):
        """Initialize the service."""
        self.spaces_repo = spaces_repository
        self.objects_repo = objects_repository

    def _get_session(self, session: AsyncSession | None) -> tuple[AsyncSession, bool]:
        """
        Return a session and flag indicating if it was provided by caller.
        """
        if session is not None:
            return session, True
        return AsyncSessionLocal(), False

    # ========================================================================
    # Create
    # ========================================================================

    async def create_space(self, space_data: SpaceCreate, session: AsyncSession | None = None) -> SpaceResponse:
        """
        Create a new space with validation.

        Args:
            space_data: Space creation data

        Returns:
            SpaceResponse: Created space

        Raises:
            SpaceLimitExceededError: If max spaces limit reached
            SpaceNameConflictError: If space name already exists
            InvalidSpaceDataError: If space data is invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                await self._check_space_limit(session=session_to_use)

                self._validate_space_data(space_data)

                try:
                    space = await self.spaces_repo.create_space(space_data, session=session_to_use)
                except SpaceNameConflictError:
                    space = await self.spaces_repo.create_space(space_data, session=session_to_use)

            return space
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Read
    # ========================================================================

    async def get_space(self, space_id: UUID, session: AsyncSession | None = None) -> SpaceResponse:
        """
        Get an space by ID.

        Args:
            space_id: Space UUID

        Returns:
            SpaceResponse: Space data

        Raises:
            SpaceNotFoundError: If space not found
        """
        session_to_use, external = self._get_session(session)
        try:
            space = await self.spaces_repo.get_space_by_id(space_id, session=session_to_use)

            if space is None:
                raise SpaceNotFoundError(f"Space not found: {space_id}")

            return space
        finally:
            if not external:
                await session_to_use.close()

    async def get_all_spaces(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        session: AsyncSession | None = None,
    ) -> SpaceList:
        """
        Get all spaces with pagination and sorting.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            sort_by: Field to sort by
            sort_order: Sort order (asc or desc)

        Returns:
            SpaceList: Paginated list of spaces
        """
        session_to_use, external = self._get_session(session)
        try:
            spaces = await self.spaces_repo.get_all_spaces(
                skip=skip,
                limit=limit,
                sort_by=sort_by,
                sort_order=sort_order,
                session=session_to_use
            )

            counts = await self.objects_repo.get_object_counts_by_space_ids(
                [space.id for space in spaces.spaces],
                session=session_to_use
            )
            for space in spaces.spaces:
                space.object_count = counts.get(str(space.id), 0)

            logger.debug(
                f"Retrieved {len(spaces.spaces)} spaces",
                extra={"total": spaces.total, "skip": skip, "limit": limit}
            )

            return spaces
        finally:
            if not external:
                await session_to_use.close()

    async def search_spaces(
        self,
        search_query: str,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> SpaceList:
        """
        Search spaces by name or description.

        Args:
            search_query: Search string
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            SpaceList: Matching spaces
        """
        session_to_use, external = self._get_session(session)
        try:
            spaces = await self.spaces_repo.search_spaces(
                search_query=search_query,
                skip=skip,
                limit=limit,
                session=session_to_use
            )

            logger.debug(
                f"Search found {spaces.total} spaces",
                extra={"query": search_query, "returned": len(spaces.spaces)}
            )

            return spaces
        finally:
            if not external:
                await session_to_use.close()

    async def get_space_count(self, session: AsyncSession | None = None) -> int:
        """
        Get total count of spaces.

        Returns:
            int: Total number of spaces
        """
        session_to_use, external = self._get_session(session)
        try:
            return await self.spaces_repo.get_space_count(session=session_to_use)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Update
    # ========================================================================

    async def update_space(
        self,
        space_id: UUID,
        space_data: SpaceUpdate,
        session: AsyncSession | None = None
    ) -> SpaceResponse:
        """
        Update an space with validation.

        Args:
            space_id: Space UUID
            space_data: Space update data

        Returns:
            SpaceResponse: Updated space

        Raises:
            SpaceNotFoundError: If space not found
            SpaceNameConflictError: If new name conflicts with existing space
            InvalidSpaceDataError: If update data is invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                existing_space = await self.spaces_repo.get_space_by_id(space_id, session=session_to_use)
                if existing_space is None:
                    raise SpaceNotFoundError(f"Space not found: {space_id}")

                if space_data.name:
                    self._validate_name(space_data.name)

                updated_space = await self.spaces_repo.update_space(space_id, space_data, session=session_to_use)

                if updated_space is None:
                    raise SpaceNotFoundError(f"Space not found during update: {space_id}")

            logger.info(f"Space updated: {updated_space.name}")

            return updated_space
        finally:
            if not external:
                await session_to_use.close()

    async def reorder_spaces(self, space_ids: List[UUID], session: AsyncSession | None = None) -> List[SpaceResponse]:
        """
        Reorder spaces.

        Args:
            space_ids: Ordered list of space UUIDs

        Returns:
            List[SpaceResponse]: Reordered spaces

        Raises:
            InvalidSpaceDataError: If space IDs are invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                reordered = await self.spaces_repo.reorder_spaces(space_ids, session=session_to_use)

            logger.info(
                f"Reordered {len(space_ids)} spaces",
                extra={"space_count": len(space_ids)}
            )

            return reordered

        except ValueError as e:
            raise InvalidSpaceDataError(f"Invalid reorder data: {e}")
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_space(self, space_id: UUID, session: AsyncSession | None = None) -> SpaceDeleteResponse:
        """
        Delete an space and all its objects (cascade).

        Args:
            space_id: Space UUID

        Returns:
            SpaceDeleteResponse: Deletion confirmation

        Raises:
            SpaceNotFoundError: If space not found
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                space = await self.spaces_repo.get_space_by_id(space_id, session=session_to_use)
                if space is None:
                    raise SpaceNotFoundError(f"Space not found: {space_id}")

                space_name = space.name

                objects_deleted = await self.objects_repo.delete_objects_by_space(space_id, session=session_to_use)

                deleted = await self.spaces_repo.delete_space(space_id, session=session_to_use)

                if not deleted:
                    raise SpaceNotFoundError(
                        f"Space not found during deletion: {space_id}"
                    )

            logger.info(
                f"Deleted space '{space_name}' and {objects_deleted} objects",
                extra={
                    "space_id": str(space_id),
                    "space_name": space_name,
                    "objects_deleted": objects_deleted
                }
            )

            return SpaceDeleteResponse(
                success=True,
                space_id=space_id,
                objects_deleted=objects_deleted,
                message=f"Space '{space_name}' and {objects_deleted} objects deleted successfully"
            )
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def _check_space_limit(self, session: AsyncSession | None = None) -> None:
        """
        Check if space count limit has been reached.

        Raises:
            SpaceLimitExceededError: If limit exceeded
        """
        current_count = await self.spaces_repo.get_space_count(session=session)

        if current_count >= self.MAX_ISLANDS:
            raise SpaceLimitExceededError(
                f"Maximum number of spaces ({self.MAX_ISLANDS}) reached"
            )

    async def _check_name_uniqueness(
        self,
        name: str,
        exclude_id: Optional[UUID] = None
    ) -> None:
        """
        Name uniqueness is intentionally not enforced (duplicate names allowed).
        """
        return None

    def _validate_space_data(self, space_data: SpaceCreate) -> None:
        """
        Validate space creation data.

        Args:
            space_data: Space creation data

        Raises:
            InvalidSpaceDataError: If data is invalid
        """
        # Name validation is already done by Pydantic, but we can add extra checks
        self._validate_name(space_data.name)

    def _validate_name(self, name: str) -> None:
        """
        Validate space name.

        Args:
            name: Space name

        Raises:
            InvalidSpaceDataError: If name is invalid
        """
        if not name or not name.strip():
            raise InvalidSpaceDataError("Space name cannot be empty")

        if len(name) < self.MIN_NAME_LENGTH:
            raise InvalidSpaceDataError(
                f"Space name must be at least {self.MIN_NAME_LENGTH} character(s)"
            )

        if len(name) > self.MAX_NAME_LENGTH:
            raise InvalidSpaceDataError(
                f"Space name must not exceed {self.MAX_NAME_LENGTH} characters"
            )

        # Check for invalid characters (optional - can be customized)
        # For now, we allow all characters

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def space_exists(self, space_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Check if an space exists.

        Args:
            space_id: Space UUID

        Returns:
            bool: True if exists
        """
        session_to_use, external = self._get_session(session)
        try:
            return await self.spaces_repo.exists(space_id, session=session_to_use)
        finally:
            if not external:
                await session_to_use.close()

    async def get_space_object_count(self, space_id: UUID, session: AsyncSession | None = None) -> int:
        """
        Get the count of objects on an space.

        Args:
            space_id: Space UUID

        Returns:
            int: Number of objects

        Raises:
            SpaceNotFoundError: If space not found
        """
        session_to_use, external = self._get_session(session)
        try:
            exists = await self.spaces_repo.exists(space_id, session=session_to_use)
            if not exists:
                raise SpaceNotFoundError(f"Space not found: {space_id}")

            return await self.objects_repo.get_object_count_by_space(space_id, session=session_to_use)
        finally:
            if not external:
                await session_to_use.close()

    async def increment_object_count(self, space_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Increment the object count for an space.

        Args:
            space_id: Space UUID

        Note:
            This is called when an object is added to an space.
        """
        await self.spaces_repo.update_space_object_count(space_id, delta=1, session=session)

        logger.debug(
            f"Incremented object count for space {space_id}",
            extra={"space_id": str(space_id)}
        )

    async def decrement_object_count(self, space_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Decrement the object count for an space.

        Args:
            space_id: Space UUID

        Note:
            This is called when an object is removed from an space.
        """
        await self.spaces_repo.update_space_object_count(space_id, delta=-1, session=session)

        logger.debug(
            f"Decremented object count for space {space_id}",
            extra={"space_id": str(space_id)}
        )


# ============================================================================
# Singleton Instance
# ============================================================================

# Create a singleton instance
spaces_service = SpacesService()


# ============================================================================
# Convenience Functions
# ============================================================================

def get_service() -> SpacesService:
    """
    Get the spaces service instance.

    This is used for dependency injection in FastAPI routes.

    Returns:
        SpacesService: Service instance
    """
    return spaces_service
