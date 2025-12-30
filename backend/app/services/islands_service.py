"""
Islands Service

Business logic layer for Island operations.
Handles validation, orchestration, and business rules for islands.
"""

from typing import List, Optional
from uuid import UUID

from app.models.island import (
    IslandCreate,
    IslandUpdate,
    IslandResponse,
    IslandList,
    IslandDeleteResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession
from app.storage.repositories.islands_repo import islands_repository
from app.storage.repositories.objects_repo import objects_repository
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal


logger = get_logger(__name__)


# ============================================================================
# Custom Exceptions
# ============================================================================

class IslandServiceError(Exception):
    """Base exception for island service errors."""
    pass


class IslandNotFoundError(IslandServiceError):
    """Raised when an island is not found."""
    pass


class IslandNameConflictError(IslandServiceError):
    """Raised when island name already exists."""
    pass


class IslandLimitExceededError(IslandServiceError):
    """Raised when island count limit is exceeded."""
    pass


class InvalidIslandDataError(IslandServiceError):
    """Raised when island data is invalid."""
    pass


# ============================================================================
# Service Class
# ============================================================================

class IslandsService:
    """
    Service for Island business logic.

    Handles validation, orchestration, and business rules.
    """

    # Configuration
    MAX_ISLANDS = 100  # Maximum number of islands per user
    MAX_NAME_LENGTH = 100
    MIN_NAME_LENGTH = 1

    def __init__(self):
        """Initialize the service."""
        self.islands_repo = islands_repository
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

    async def create_island(self, island_data: IslandCreate, session: AsyncSession | None = None) -> IslandResponse:
        """
        Create a new island with validation.

        Args:
            island_data: Island creation data

        Returns:
            IslandResponse: Created island

        Raises:
            IslandLimitExceededError: If max islands limit reached
            IslandNameConflictError: If island name already exists
            InvalidIslandDataError: If island data is invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                await self._check_island_limit(session=session_to_use)

                self._validate_island_data(island_data)

                try:
                    island = await self.islands_repo.create_island(island_data, session=session_to_use)
                except IslandNameConflictError:
                    island = await self.islands_repo.create_island(island_data, session=session_to_use)

            return island
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Read
    # ========================================================================

    async def get_island(self, island_id: UUID, session: AsyncSession | None = None) -> IslandResponse:
        """
        Get an island by ID.

        Args:
            island_id: Island UUID

        Returns:
            IslandResponse: Island data

        Raises:
            IslandNotFoundError: If island not found
        """
        session_to_use, external = self._get_session(session)
        try:
            island = await self.islands_repo.get_island_by_id(island_id, session=session_to_use)

            if island is None:
                raise IslandNotFoundError(f"Island not found: {island_id}")

            return island
        finally:
            if not external:
                await session_to_use.close()

    async def get_all_islands(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        session: AsyncSession | None = None,
    ) -> IslandList:
        """
        Get all islands with pagination and sorting.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            sort_by: Field to sort by
            sort_order: Sort order (asc or desc)

        Returns:
            IslandList: Paginated list of islands
        """
        session_to_use, external = self._get_session(session)
        try:
            islands = await self.islands_repo.get_all_islands(
                skip=skip,
                limit=limit,
                sort_by=sort_by,
                sort_order=sort_order,
                session=session_to_use
            )

            counts = await self.objects_repo.get_object_counts_by_island_ids(
                [island.id for island in islands.islands],
                session=session_to_use
            )
            for island in islands.islands:
                island.object_count = counts.get(str(island.id), 0)

            logger.debug(
                f"Retrieved {len(islands.islands)} islands",
                extra={"total": islands.total, "skip": skip, "limit": limit}
            )

            return islands
        finally:
            if not external:
                await session_to_use.close()

    async def search_islands(
        self,
        search_query: str,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> IslandList:
        """
        Search islands by name or description.

        Args:
            search_query: Search string
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            IslandList: Matching islands
        """
        session_to_use, external = self._get_session(session)
        try:
            islands = await self.islands_repo.search_islands(
                search_query=search_query,
                skip=skip,
                limit=limit,
                session=session_to_use
            )

            logger.debug(
                f"Search found {islands.total} islands",
                extra={"query": search_query, "returned": len(islands.islands)}
            )

            return islands
        finally:
            if not external:
                await session_to_use.close()

    async def get_island_count(self, session: AsyncSession | None = None) -> int:
        """
        Get total count of islands.

        Returns:
            int: Total number of islands
        """
        session_to_use, external = self._get_session(session)
        try:
            return await self.islands_repo.get_island_count(session=session_to_use)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Update
    # ========================================================================

    async def update_island(
        self,
        island_id: UUID,
        island_data: IslandUpdate,
        session: AsyncSession | None = None
    ) -> IslandResponse:
        """
        Update an island with validation.

        Args:
            island_id: Island UUID
            island_data: Island update data

        Returns:
            IslandResponse: Updated island

        Raises:
            IslandNotFoundError: If island not found
            IslandNameConflictError: If new name conflicts with existing island
            InvalidIslandDataError: If update data is invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                existing_island = await self.islands_repo.get_island_by_id(island_id, session=session_to_use)
                if existing_island is None:
                    raise IslandNotFoundError(f"Island not found: {island_id}")

                if island_data.name:
                    self._validate_name(island_data.name)

                updated_island = await self.islands_repo.update_island(island_id, island_data, session=session_to_use)

                if updated_island is None:
                    raise IslandNotFoundError(f"Island not found during update: {island_id}")

            logger.info(f"Island updated: {updated_island.name}")

            return updated_island
        finally:
            if not external:
                await session_to_use.close()

    async def reorder_islands(self, island_ids: List[UUID], session: AsyncSession | None = None) -> List[IslandResponse]:
        """
        Reorder islands.

        Args:
            island_ids: Ordered list of island UUIDs

        Returns:
            List[IslandResponse]: Reordered islands

        Raises:
            InvalidIslandDataError: If island IDs are invalid
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                reordered = await self.islands_repo.reorder_islands(island_ids, session=session_to_use)

            logger.info(
                f"Reordered {len(island_ids)} islands",
                extra={"island_count": len(island_ids)}
            )

            return reordered

        except ValueError as e:
            raise InvalidIslandDataError(f"Invalid reorder data: {e}")
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_island(self, island_id: UUID, session: AsyncSession | None = None) -> IslandDeleteResponse:
        """
        Delete an island and all its objects (cascade).

        Args:
            island_id: Island UUID

        Returns:
            IslandDeleteResponse: Deletion confirmation

        Raises:
            IslandNotFoundError: If island not found
        """
        session_to_use, external = self._get_session(session)
        try:
            async with session_to_use.begin():
                island = await self.islands_repo.get_island_by_id(island_id, session=session_to_use)
                if island is None:
                    raise IslandNotFoundError(f"Island not found: {island_id}")

                island_name = island.name

                objects_deleted = await self.objects_repo.delete_objects_by_island(island_id, session=session_to_use)

                deleted = await self.islands_repo.delete_island(island_id, session=session_to_use)

                if not deleted:
                    raise IslandNotFoundError(
                        f"Island not found during deletion: {island_id}"
                    )

            logger.info(
                f"Deleted island '{island_name}' and {objects_deleted} objects",
                extra={
                    "island_id": str(island_id),
                    "island_name": island_name,
                    "objects_deleted": objects_deleted
                }
            )

            return IslandDeleteResponse(
                success=True,
                island_id=island_id,
                objects_deleted=objects_deleted,
                message=f"Island '{island_name}' and {objects_deleted} objects deleted successfully"
            )
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def _check_island_limit(self, session: AsyncSession | None = None) -> None:
        """
        Check if island count limit has been reached.

        Raises:
            IslandLimitExceededError: If limit exceeded
        """
        current_count = await self.islands_repo.get_island_count(session=session)

        if current_count >= self.MAX_ISLANDS:
            raise IslandLimitExceededError(
                f"Maximum number of islands ({self.MAX_ISLANDS}) reached"
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

    def _validate_island_data(self, island_data: IslandCreate) -> None:
        """
        Validate island creation data.

        Args:
            island_data: Island creation data

        Raises:
            InvalidIslandDataError: If data is invalid
        """
        # Name validation is already done by Pydantic, but we can add extra checks
        self._validate_name(island_data.name)

    def _validate_name(self, name: str) -> None:
        """
        Validate island name.

        Args:
            name: Island name

        Raises:
            InvalidIslandDataError: If name is invalid
        """
        if not name or not name.strip():
            raise InvalidIslandDataError("Island name cannot be empty")

        if len(name) < self.MIN_NAME_LENGTH:
            raise InvalidIslandDataError(
                f"Island name must be at least {self.MIN_NAME_LENGTH} character(s)"
            )

        if len(name) > self.MAX_NAME_LENGTH:
            raise InvalidIslandDataError(
                f"Island name must not exceed {self.MAX_NAME_LENGTH} characters"
            )

        # Check for invalid characters (optional - can be customized)
        # For now, we allow all characters

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def island_exists(self, island_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Check if an island exists.

        Args:
            island_id: Island UUID

        Returns:
            bool: True if exists
        """
        session_to_use, external = self._get_session(session)
        try:
            return await self.islands_repo.exists(island_id, session=session_to_use)
        finally:
            if not external:
                await session_to_use.close()

    async def get_island_object_count(self, island_id: UUID, session: AsyncSession | None = None) -> int:
        """
        Get the count of objects on an island.

        Args:
            island_id: Island UUID

        Returns:
            int: Number of objects

        Raises:
            IslandNotFoundError: If island not found
        """
        session_to_use, external = self._get_session(session)
        try:
            exists = await self.islands_repo.exists(island_id, session=session_to_use)
            if not exists:
                raise IslandNotFoundError(f"Island not found: {island_id}")

            return await self.objects_repo.get_object_count_by_island(island_id, session=session_to_use)
        finally:
            if not external:
                await session_to_use.close()

    async def increment_object_count(self, island_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Increment the object count for an island.

        Args:
            island_id: Island UUID

        Note:
            This is called when an object is added to an island.
        """
        await self.islands_repo.update_island_object_count(island_id, delta=1, session=session)

        logger.debug(
            f"Incremented object count for island {island_id}",
            extra={"island_id": str(island_id)}
        )

    async def decrement_object_count(self, island_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Decrement the object count for an island.

        Args:
            island_id: Island UUID

        Note:
            This is called when an object is removed from an island.
        """
        await self.islands_repo.update_island_object_count(island_id, delta=-1, session=session)

        logger.debug(
            f"Decremented object count for island {island_id}",
            extra={"island_id": str(island_id)}
        )


# ============================================================================
# Singleton Instance
# ============================================================================

# Create a singleton instance
islands_service = IslandsService()


# ============================================================================
# Convenience Functions
# ============================================================================

def get_service() -> IslandsService:
    """
    Get the islands service instance.

    This is used for dependency injection in FastAPI routes.

    Returns:
        IslandsService: Service instance
    """
    return islands_service
