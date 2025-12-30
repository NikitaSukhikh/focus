"""
Islands Repository

Data access layer for Island entities.
Provides async CRUD operations and queries for islands using SQLAlchemy async sessions
against the configured database (see app/storage/db.py for engine/session setup).
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import select, func, update, delete, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.island import (
    IslandCreate,
    IslandUpdate,
    IslandResponse,
    IslandList,
)
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal, Island


logger = get_logger(__name__)


# ============================================================================
# Repository Class
# ============================================================================

class IslandsRepository:
    """
    Repository for Island entities.

    Provides async CRUD operations and queries for managing islands.
    Currently uses in-memory storage; will be updated to use database.
    """

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
        Create a new island.

        Args:
            island_data: Island creation data

        Returns:
            IslandResponse: Created island with metadata

        """
        session_to_use, external = self._get_session(session)
        try:
            position = await session_to_use.scalar(select(func.count(Island.id)))
            island = Island(
                id=str(uuid4()),
                name=island_data.name,
                description=island_data.description,
                icon=island_data.icon,
                color=island_data.color,
                position=position or 0,
                object_count=0,
            )
            session_to_use.add(island)
            await session_to_use.flush()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(island)

            logger.info(f"Created island: {island.name}")

            return IslandResponse.model_validate(island)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Read
    # ========================================================================

    async def get_island_by_id(self, island_id: UUID, session: AsyncSession | None = None) -> Optional[IslandResponse]:
        """
        Get an island by ID.

        Args:
            island_id: Island UUID

        Returns:
            IslandResponse if found, None otherwise

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Island).where(Island.id == str(island_id))
            )
            island = result.scalar_one_or_none()
            if island is None:
                logger.warning(f"Island not found: {island_id}")
                return None
            return IslandResponse.model_validate(island)
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
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            sort_by: Field to sort by (position, name, created_at, updated_at)
            sort_order: Sort order (asc or desc)

        Returns:
            IslandList: Paginated list of islands

        """
        sort_column = {
            "position": Island.position,
            "name": Island.name,
            "created_at": Island.created_at,
            "updated_at": Island.updated_at,
        }.get(sort_by or "position", Island.position)

        ordering = desc(sort_column) if sort_order.lower() == "desc" else asc(sort_column)

        session_to_use, external = self._get_session(session)
        try:
            total = await session_to_use.scalar(select(func.count(Island.id)))
            result = await session_to_use.execute(
                select(Island)
                .order_by(ordering)
                .offset(skip)
                .limit(limit)
            )
            rows = result.scalars().all()
            island_responses = [IslandResponse.model_validate(i) for i in rows]

            logger.debug(
                f"Retrieved {len(island_responses)} islands (total: {total})",
                extra={"skip": skip, "limit": limit, "total": total}
            )

            return IslandList(islands=island_responses, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()

    async def get_islands_by_ids(self, island_ids: List[UUID], session: AsyncSession | None = None) -> List[IslandResponse]:
        """
        Get multiple islands by their IDs.

        Args:
            island_ids: List of island UUIDs

        Returns:
            List[IslandResponse]: List of found islands

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Island).where(Island.id.in_([str(i) for i in island_ids]))
            )
            rows = result.scalars().all()
            islands = [IslandResponse.model_validate(r) for r in rows]
            logger.debug(
                f"Retrieved {len(islands)} islands by IDs",
                extra={"requested": len(island_ids), "found": len(islands)}
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
            return await session_to_use.scalar(select(func.count(Island.id))) or 0
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
    ) -> Optional[IslandResponse]:
        """
        Update an existing island.

        Args:
            island_id: Island UUID
            island_data: Island update data (partial)

        Returns:
            IslandResponse if updated, None if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Island).where(Island.id == str(island_id)))
            island = result.scalar_one_or_none()
            if island is None:
                logger.warning(f"Cannot update - island not found: {island_id}")
                return None

            update_data = island_data.model_dump(exclude_unset=True, exclude_none=True)
            if "position" in update_data:
                update_data.pop("position")
                logger.warning(
                    f"Position update ignored - use reorder_islands instead",
                    extra={"island_id": str(island_id)}
                )

            for key, value in update_data.items():
                setattr(island, key, value)
            island.updated_at = datetime.utcnow()

            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(island)
            else:
                await session_to_use.flush()

            logger.info(
                f"Updated island: {island.name}",
                extra={"island_id": str(island_id), "updated_fields": list(update_data.keys())}
            )

            return IslandResponse.model_validate(island)
        finally:
            if not external:
                await session_to_use.close()

    async def update_island_object_count(
        self,
        island_id: UUID,
        delta: int = 1,
        session: AsyncSession | None = None
    ) -> Optional[IslandResponse]:
        """
        Update the object count for an island.

        Args:
            island_id: Island UUID
            delta: Amount to change count by (positive or negative)

        Returns:
            IslandResponse if updated, None if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Island).where(Island.id == str(island_id)))
            island = result.scalar_one_or_none()
            if island is None:
                logger.warning(f"Cannot update count - island not found: {island_id}")
                return None

            island.object_count = max(0, (island.object_count or 0) + delta)
            island.updated_at = datetime.utcnow()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(island)
            else:
                await session_to_use.flush()

            logger.debug(
                f"Updated object count for island {island_id}",
                extra={"island_id": str(island_id), "delta": delta, "new_count": island.object_count}
            )

            return IslandResponse.model_validate(island)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_island(self, island_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Delete an island.

        Note: Cascade deletion of objects is handled automatically by the database
        foreign key constraint (CASCADE on delete).

        Args:
            island_id: Island UUID

        Returns:
            bool: True if deleted, False if not found
        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Island).where(Island.id == str(island_id)))
            island = result.scalar_one_or_none()

            if island is None:
                logger.warning(f"Cannot delete - island not found: {island_id}")
                return False

            island_name = island.name
            island_position = island.position

            # Delete the island (cascade will delete related objects)
            await session_to_use.delete(island)
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()

            # Reorder remaining islands to fill the gap
            await self._compact_positions(session=session_to_use)

            logger.info(
                f"Deleted island: {island_name}",
                extra={"island_id": str(island_id), "position": island_position}
            )

            return True
        finally:
            if not external:
                await session_to_use.close()

    async def delete_all_islands(self, session: AsyncSession | None = None) -> int:
        """
        Delete all islands (used for testing).

        Returns:
            int: Number of islands deleted
        """
        session_to_use, external = self._get_session(session)
        try:
            # Count islands before deletion
            count_result = await session_to_use.execute(select(func.count()).select_from(Island))
            count = count_result.scalar_one()

            # Delete all islands
            await session_to_use.execute(delete(Island))
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()

            logger.warning(f"Deleted all islands", extra={"count": count})

            return count
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Reorder
    # ========================================================================

    async def reorder_islands(self, island_ids: List[UUID], session: AsyncSession | None = None) -> List[IslandResponse]:
        """
        Reorder islands by providing a new ordered list of IDs.

        Args:
            island_ids: Ordered list of island UUIDs

        Returns:
            List[IslandResponse]: Reordered islands

        Raises:
            ValueError: If island IDs don't match existing islands
        """
        session_to_use, external = self._get_session(session)
        try:
            # Validate IDs
            result = await session_to_use.execute(select(Island.id))
            existing_ids = {UUID(i) for i in result.scalars().all()}
            provided_ids = set(island_ids)
            if existing_ids != provided_ids:
                missing_ids = existing_ids - provided_ids
                extra_ids = provided_ids - existing_ids
                error_msg = []
                if missing_ids:
                    error_msg.append(f"Missing islands: {missing_ids}")
                if extra_ids:
                    error_msg.append(f"Unknown islands: {extra_ids}")
                raise ValueError("; ".join(error_msg))

            now = datetime.utcnow()
            for position, island_id in enumerate(island_ids):
                await session_to_use.execute(
                    update(Island)
                    .where(Island.id == str(island_id))
                    .values(position=position, updated_at=now)
                )
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()

            result = await session_to_use.execute(select(Island).where(Island.id.in_([str(i) for i in island_ids])))
            rows = {row.id: row for row in result.scalars().all()}
            reordered = [IslandResponse.model_validate(rows[str(i)]) for i in island_ids if str(i) in rows]

            logger.info(
                f"Reordered {len(island_ids)} islands",
                extra={"island_count": len(island_ids)}
            )

            return reordered
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _compact_positions(self, session: AsyncSession | None = None) -> None:
        """
        Compact island positions to eliminate gaps.

        After deleting an island, this ensures positions are sequential
        starting from 0.
        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Island).order_by(Island.position.asc()))
            islands = result.scalars().all()
            now = datetime.utcnow()
            for new_position, island in enumerate(islands):
                if island.position != new_position:
                    island.position = new_position
                    island.updated_at = now
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            logger.debug(f"Compacted positions for {len(islands)} islands")
        finally:
            if not external:
                await session_to_use.close()

    async def exists(self, island_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Check if an island exists.

        Args:
            island_id: Island UUID

        Returns:
            bool: True if exists, False otherwise

        """
        session_to_use, external = self._get_session(session)
        try:
            exists = await session_to_use.scalar(
                select(func.count(Island.id)).where(Island.id == str(island_id))
            )
            return bool(exists)
        finally:
            if not external:
                await session_to_use.close()

    async def search_islands(
        self,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> IslandList:
        """
        Search islands by name or description.

        Args:
            search_query: Search string (case-insensitive)
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            IslandList: Matching islands

        """
        session_to_use, external = self._get_session(session)
        try:
            stmt = select(Island)
            if search_query:
                pattern = f"%{search_query.lower()}%"
                stmt = stmt.where(
                    func.lower(Island.name).like(pattern) |
                    func.lower(Island.description).like(pattern)
                )
            total = await session_to_use.scalar(select(func.count()).select_from(stmt.subquery()))
            result = await session_to_use.execute(
                stmt.order_by(Island.position.asc()).offset(skip).limit(limit)
            )
            rows = result.scalars().all()
            islands = [IslandResponse.model_validate(r) for r in rows]
            logger.debug(
                f"Search found {total} islands",
                extra={"query": search_query, "returned": len(islands)}
            )
            return IslandList(islands=islands, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()


# ============================================================================
# Singleton Instance
# ============================================================================

# Create a singleton instance
islands_repository = IslandsRepository()


# ============================================================================
# Convenience Functions
# ============================================================================

async def get_repository() -> IslandsRepository:
    """
    Get the islands repository instance.

    This is used for dependency injection in FastAPI routes.

    Returns:
        IslandsRepository: Repository instance
    """
    return islands_repository
