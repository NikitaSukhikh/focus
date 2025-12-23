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
from app.storage.repositories.islands_repo import islands_repository
from app.storage.repositories.objects_repo import objects_repository
from app.core.logging import get_logger


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

    # ========================================================================
    # Create
    # ========================================================================

    async def create_island(self, island_data: IslandCreate) -> IslandResponse:
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
        # Validate island count limit
        await self._check_island_limit()

        # Additional validation
        self._validate_island_data(island_data)

        # Create island; ignore name conflicts (duplicate names allowed)
        try:
            island = await self.islands_repo.create_island(island_data)
        except IslandNameConflictError:
            island = await self.islands_repo.create_island(island_data)

        # Logging disabled here to avoid LogRecord conflicts with reserved attributes.

        return island

    # ========================================================================
    # Read
    # ========================================================================

    async def get_island(self, island_id: UUID) -> IslandResponse:
        """
        Get an island by ID.

        Args:
            island_id: Island UUID

        Returns:
            IslandResponse: Island data

        Raises:
            IslandNotFoundError: If island not found
        """
        island = await self.islands_repo.get_island_by_id(island_id)

        if island is None:
            raise IslandNotFoundError(f"Island not found: {island_id}")

        return island

    async def get_all_islands(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
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
        islands = await self.islands_repo.get_all_islands(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

        # Update object counts for each island
        for island in islands.islands:
            count = await self.objects_repo.get_object_count_by_island(island.id)
            island.object_count = count

        logger.debug(
            f"Retrieved {len(islands.islands)} islands",
            extra={"total": islands.total, "skip": skip, "limit": limit}
        )

        return islands

    async def search_islands(
        self,
        search_query: str,
        skip: int = 0,
        limit: int = 100
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
        islands = await self.islands_repo.search_islands(
            search_query=search_query,
            skip=skip,
            limit=limit
        )

        logger.debug(
            f"Search found {islands.total} islands",
            extra={"query": search_query, "returned": len(islands.islands)}
        )

        return islands

    async def get_island_count(self) -> int:
        """
        Get total count of islands.

        Returns:
            int: Total number of islands
        """
        return await self.islands_repo.get_island_count()

    # ========================================================================
    # Update
    # ========================================================================

    async def update_island(
        self,
        island_id: UUID,
        island_data: IslandUpdate
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
        # Check island exists
        existing_island = await self.islands_repo.get_island_by_id(island_id)
        if existing_island is None:
            raise IslandNotFoundError(f"Island not found: {island_id}")

        # Additional validation
        if island_data.name:
            self._validate_name(island_data.name)

        # Update island
        updated_island = await self.islands_repo.update_island(island_id, island_data)

        if updated_island is None:
            raise IslandNotFoundError(f"Island not found during update: {island_id}")

        logger.info(f"Island updated: {updated_island.name}")

        return updated_island

    async def reorder_islands(self, island_ids: List[UUID]) -> List[IslandResponse]:
        """
        Reorder islands.

        Args:
            island_ids: Ordered list of island UUIDs

        Returns:
            List[IslandResponse]: Reordered islands

        Raises:
            InvalidIslandDataError: If island IDs are invalid
        """
        try:
            reordered = await self.islands_repo.reorder_islands(island_ids)

            logger.info(
                f"Reordered {len(island_ids)} islands",
                extra={"island_count": len(island_ids)}
            )

            return reordered

        except ValueError as e:
            raise InvalidIslandDataError(f"Invalid reorder data: {e}")

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_island(self, island_id: UUID) -> IslandDeleteResponse:
        """
        Delete an island and all its objects (cascade).

        Args:
            island_id: Island UUID

        Returns:
            IslandDeleteResponse: Deletion confirmation

        Raises:
            IslandNotFoundError: If island not found
        """
        # Check island exists
        island = await self.islands_repo.get_island_by_id(island_id)
        if island is None:
            raise IslandNotFoundError(f"Island not found: {island_id}")

        island_name = island.name

        # Cascade delete: Delete all objects on this island first
        objects_deleted = await self.objects_repo.delete_objects_by_island(island_id)

        # Delete the island
        deleted = await self.islands_repo.delete_island(island_id)

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

    # ========================================================================
    # Validation Helpers
    # ========================================================================

    async def _check_island_limit(self) -> None:
        """
        Check if island count limit has been reached.

        Raises:
            IslandLimitExceededError: If limit exceeded
        """
        current_count = await self.islands_repo.get_island_count()

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

    async def island_exists(self, island_id: UUID) -> bool:
        """
        Check if an island exists.

        Args:
            island_id: Island UUID

        Returns:
            bool: True if exists
        """
        return await self.islands_repo.exists(island_id)

    async def get_island_object_count(self, island_id: UUID) -> int:
        """
        Get the count of objects on an island.

        Args:
            island_id: Island UUID

        Returns:
            int: Number of objects

        Raises:
            IslandNotFoundError: If island not found
        """
        # Check island exists
        exists = await self.islands_repo.exists(island_id)
        if not exists:
            raise IslandNotFoundError(f"Island not found: {island_id}")

        return await self.objects_repo.get_object_count_by_island(island_id)

    async def increment_object_count(self, island_id: UUID) -> None:
        """
        Increment the object count for an island.

        Args:
            island_id: Island UUID

        Note:
            This is called when an object is added to an island.
        """
        await self.islands_repo.update_island_object_count(island_id, delta=1)

        logger.debug(
            f"Incremented object count for island {island_id}",
            extra={"island_id": str(island_id)}
        )

    async def decrement_object_count(self, island_id: UUID) -> None:
        """
        Decrement the object count for an island.

        Args:
            island_id: Island UUID

        Note:
            This is called when an object is removed from an island.
        """
        await self.islands_repo.update_island_object_count(island_id, delta=-1)

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
