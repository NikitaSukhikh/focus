"""
Spaces Repository

Data access layer for Space entities.
Provides async CRUD operations and queries for spaces using SQLAlchemy async sessions
against the configured database (see app/storage/db.py for engine/session setup).
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import select, func, update, delete, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.space import (
    SpaceCreate,
    SpaceUpdate,
    SpaceResponse,
    SpaceList,
)
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal, Space


logger = get_logger(__name__)


# ============================================================================
# Repository Class
# ============================================================================

class SpacesRepository:
    """
    Repository for Space entities.

    Provides async CRUD operations and queries for managing spaces.
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

    async def create_space(self, space_data: SpaceCreate, session: AsyncSession | None = None) -> SpaceResponse:
        """
        Create a new space.

        Args:
            space_data: Space creation data

        Returns:
            SpaceResponse: Created space with metadata

        """
        session_to_use, external = self._get_session(session)
        try:
            position = await session_to_use.scalar(select(func.count(Space.id)))
            space = Space(
                id=str(space_data.id) if space_data.id else str(uuid4()),
                name=space_data.name,
                description=space_data.description,
                icon=space_data.icon,
                color=space_data.color,
                position=position or 0,
                object_count=0,
            )
            session_to_use.add(space)
            await session_to_use.flush()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(space)

            logger.info(f"Created space: {space.name}")

            return SpaceResponse.model_validate(space)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Read
    # ========================================================================

    async def get_space_by_id(self, space_id: UUID, session: AsyncSession | None = None) -> SpaceResponse | None:
        """
        Get an space by ID.

        Args:
            space_id: Space UUID

        Returns:
            SpaceResponse if found, None otherwise

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Space).where(Space.id == str(space_id))
            )
            space = result.scalar_one_or_none()
            if space is None:
                logger.warning(f"Space not found: {space_id}")
                return None
            return SpaceResponse.model_validate(space)
        finally:
            if not external:
                await session_to_use.close()

    async def get_all_spaces(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str | None = None,
        sort_order: str = "asc",
        session: AsyncSession | None = None,
    ) -> SpaceList:
        """
        Get all spaces with pagination and sorting.

        Args:
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            sort_by: Field to sort by (position, name, created_at, updated_at)
            sort_order: Sort order (asc or desc)

        Returns:
            SpaceList: Paginated list of spaces

        """
        sort_column = {
            "position": Space.position,
            "name": Space.name,
            "created_at": Space.created_at,
            "updated_at": Space.updated_at,
        }.get(sort_by or "position", Space.position)

        ordering = desc(sort_column) if sort_order.lower() == "desc" else asc(sort_column)

        session_to_use, external = self._get_session(session)
        try:
            total = await session_to_use.scalar(select(func.count(Space.id)))
            result = await session_to_use.execute(
                select(Space)
                .order_by(ordering)
                .offset(skip)
                .limit(limit)
            )
            rows = result.scalars().all()
            space_responses = [SpaceResponse.model_validate(i) for i in rows]

            logger.debug(
                f"Retrieved {len(space_responses)} spaces (total: {total})",
                extra={"skip": skip, "limit": limit, "total": total}
            )

            return SpaceList(spaces=space_responses, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()

    async def get_spaces_by_ids(self, space_ids: list[UUID], session: AsyncSession | None = None) -> list[SpaceResponse]:
        """
        Get multiple spaces by their IDs.

        Args:
            space_ids: List of space UUIDs

        Returns:
            list[SpaceResponse]: List of found spaces

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Space).where(Space.id.in_([str(i) for i in space_ids]))
            )
            rows = result.scalars().all()
            spaces = [SpaceResponse.model_validate(r) for r in rows]
            logger.debug(
                f"Retrieved {len(spaces)} spaces by IDs",
                extra={"requested": len(space_ids), "found": len(spaces)}
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
            return await session_to_use.scalar(select(func.count(Space.id))) or 0
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
    ) -> SpaceResponse | None:
        """
        Update an existing space.

        Args:
            space_id: Space UUID
            space_data: Space update data (partial)

        Returns:
            SpaceResponse if updated, None if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Space).where(Space.id == str(space_id)))
            space = result.scalar_one_or_none()
            if space is None:
                logger.warning(f"Cannot update - space not found: {space_id}")
                return None

            update_data = space_data.model_dump(exclude_unset=True, exclude_none=True)
            if "position" in update_data:
                update_data.pop("position")
                logger.warning(
                    f"Position update ignored - use reorder_spaces instead",
                    extra={"space_id": str(space_id)}
                )

            for key, value in update_data.items():
                setattr(space, key, value)
            space.updated_at = datetime.utcnow()

            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(space)
            else:
                await session_to_use.flush()

            logger.info(
                f"Updated space: {space.name}",
                extra={"space_id": str(space_id), "updated_fields": list(update_data.keys())}
            )

            return SpaceResponse.model_validate(space)
        finally:
            if not external:
                await session_to_use.close()

    async def update_space_object_count(
        self,
        space_id: UUID,
        delta: int = 1,
        session: AsyncSession | None = None
    ) -> SpaceResponse | None:
        """
        Update the object count for an space.

        Args:
            space_id: Space UUID
            delta: Amount to change count by (positive or negative)

        Returns:
            SpaceResponse if updated, None if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Space).where(Space.id == str(space_id)))
            space = result.scalar_one_or_none()
            if space is None:
                logger.warning(f"Cannot update count - space not found: {space_id}")
                return None

            space.object_count = max(0, (space.object_count or 0) + delta)
            space.updated_at = datetime.utcnow()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(space)
            else:
                await session_to_use.flush()

            logger.debug(
                f"Updated object count for space {space_id}",
                extra={"space_id": str(space_id), "delta": delta, "new_count": space.object_count}
            )

            return SpaceResponse.model_validate(space)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_space(self, space_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Delete an space.

        Note: Cascade deletion of objects is handled automatically by the database
        foreign key constraint (CASCADE on delete).

        Args:
            space_id: Space UUID

        Returns:
            bool: True if deleted, False if not found
        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Space).where(Space.id == str(space_id)))
            space = result.scalar_one_or_none()

            if space is None:
                logger.warning(f"Cannot delete - space not found: {space_id}")
                return False

            space_name = space.name
            space_position = space.position

            # Delete the space (cascade will delete related objects)
            await session_to_use.delete(space)
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()

            # Reorder remaining spaces to fill the gap
            await self._compact_positions(session=session_to_use)

            logger.info(
                f"Deleted space: {space_name}",
                extra={"space_id": str(space_id), "position": space_position}
            )

            return True
        finally:
            if not external:
                await session_to_use.close()

    async def delete_all_spaces(self, session: AsyncSession | None = None) -> int:
        """
        Delete all spaces (used for testing).

        Returns:
            int: Number of spaces deleted
        """
        session_to_use, external = self._get_session(session)
        try:
            # Count spaces before deletion
            count_result = await session_to_use.execute(select(func.count()).select_from(Space))
            count = count_result.scalar_one()

            # Delete all spaces
            await session_to_use.execute(delete(Space))
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()

            logger.warning(f"Deleted all spaces", extra={"count": count})

            return count
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Reorder
    # ========================================================================

    async def reorder_spaces(self, space_ids: list[UUID], session: AsyncSession | None = None) -> list[SpaceResponse]:
        """
        Reorder spaces by providing a new ordered list of IDs.

        Args:
            space_ids: Ordered list of space UUIDs

        Returns:
            list[SpaceResponse]: Reordered spaces

        Raises:
            ValueError: If space IDs don't match existing spaces
        """
        session_to_use, external = self._get_session(session)
        try:
            # Validate IDs
            result = await session_to_use.execute(select(Space.id))
            existing_ids = {UUID(i) for i in result.scalars().all()}
            provided_ids = set(space_ids)
            if existing_ids != provided_ids:
                missing_ids = existing_ids - provided_ids
                extra_ids = provided_ids - existing_ids
                error_msg = []
                if missing_ids:
                    error_msg.append(f"Missing spaces: {missing_ids}")
                if extra_ids:
                    error_msg.append(f"Unknown spaces: {extra_ids}")
                raise ValueError("; ".join(error_msg))

            now = datetime.utcnow()
            for position, space_id in enumerate(space_ids):
                await session_to_use.execute(
                    update(Space)
                    .where(Space.id == str(space_id))
                    .values(position=position, updated_at=now)
                )
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()

            result = await session_to_use.execute(select(Space).where(Space.id.in_([str(i) for i in space_ids])))
            rows = {row.id: row for row in result.scalars().all()}
            reordered = [SpaceResponse.model_validate(rows[str(i)]) for i in space_ids if str(i) in rows]

            logger.info(
                f"Reordered {len(space_ids)} spaces",
                extra={"space_count": len(space_ids)}
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
        Compact space positions to eliminate gaps.

        After deleting an space, this ensures positions are sequential
        starting from 0.
        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Space).order_by(Space.position.asc()))
            spaces = result.scalars().all()
            now = datetime.utcnow()
            for new_position, space in enumerate(spaces):
                if space.position != new_position:
                    space.position = new_position
                    space.updated_at = now
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            logger.debug(f"Compacted positions for {len(spaces)} spaces")
        finally:
            if not external:
                await session_to_use.close()

    async def exists(self, space_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Check if an space exists.

        Args:
            space_id: Space UUID

        Returns:
            bool: True if exists, False otherwise

        """
        session_to_use, external = self._get_session(session)
        try:
            exists = await session_to_use.scalar(
                select(func.count(Space.id)).where(Space.id == str(space_id))
            )
            return bool(exists)
        finally:
            if not external:
                await session_to_use.close()

    async def search_spaces(
        self,
        search_query: str | None = None,
        skip: int = 0,
        limit: int = 100,
        session: AsyncSession | None = None
    ) -> SpaceList:
        """
        Search spaces by name or description.

        Args:
            search_query: Search string (case-insensitive)
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            SpaceList: Matching spaces

        """
        session_to_use, external = self._get_session(session)
        try:
            stmt = select(Space)
            if search_query:
                pattern = f"%{search_query.lower()}%"
                stmt = stmt.where(
                    func.lower(Space.name).like(pattern) |
                    func.lower(Space.description).like(pattern)
                )
            total = await session_to_use.scalar(select(func.count()).select_from(stmt.subquery()))
            result = await session_to_use.execute(
                stmt.order_by(Space.position.asc()).offset(skip).limit(limit)
            )
            rows = result.scalars().all()
            spaces = [SpaceResponse.model_validate(r) for r in rows]
            logger.debug(
                f"Search found {total} spaces",
                extra={"query": search_query, "returned": len(spaces)}
            )
            return SpaceList(spaces=spaces, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()


# ============================================================================
# Singleton Instance
# ============================================================================

# Create a singleton instance
spaces_repository = SpacesRepository()


# ============================================================================
# Convenience Functions
# ============================================================================

async def get_repository() -> SpacesRepository:
    """
    Get the spaces repository instance.

    This is used for dependency injection in FastAPI routes.

    Returns:
        SpacesRepository: Repository instance
    """
    return spaces_repository
