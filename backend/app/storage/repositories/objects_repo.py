"""
Objects Repository

Data access layer for Object entities.
Provides async CRUD operations for polymorphic objects (Link, File, GoogleDrive, Gmail, Text).

Note: This implementation uses in-memory storage as a placeholder.
When the database layer (Task 1.2) is implemented, replace the in-memory
storage with actual SQLAlchemy async queries.
"""

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, func, update, delete, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.object import (
    ObjectType,
    ObjectCreate,
    ObjectUpdate,
    ObjectResponse,
    ObjectList,
    LinkObjectCreate,
    FileObjectCreate,
    GoogleDriveObjectCreate,
    GmailObjectCreate,
    TextObjectCreate,
    WebArticleObjectCreate,
)
from app.core.logging import get_logger
from app.storage.db import AsyncSessionLocal, Object


logger = get_logger(__name__)

# SQLite json_each helper column name
JSON_VALUE_COL = "value"


# ============================================================================
# Repository Class
# ============================================================================

class ObjectsRepository:
    """
    Repository for Object entities.

    Provides async CRUD operations and queries for managing polymorphic objects.
    Currently uses in-memory storage; will be updated to use database.
    """

    def _get_session(self, session: AsyncSession | None) -> tuple[AsyncSession, bool]:
        """
        Return a session and flag indicating if it was provided by the caller.
        """
        if session is not None:
            return session, True
        return AsyncSessionLocal(), False

    def _apply_tag_filter(self, stmt, tags: list[str] | None):
        """
        Apply AND tag filtering using SQLite json_each on the tags array.
        """
        if not tags:
            return stmt
        tags_lower = [t.lower() for t in tags if t]
        for tag in tags_lower:
            tag_tvf = func.json_each(Object.tags).table_valued(JSON_VALUE_COL)
            stmt = stmt.where(
                func.exists(
                    select(1).select_from(tag_tvf).where(func.lower(tag_tvf.c.value) == tag)
                )
            )
        return stmt

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
        Create a new object on an space.

        Args:
            space_id: ID of the space to add the object to
            object_data: Object creation data (polymorphic)

        Returns:
            ObjectResponse: Created object with metadata

        """
        session_to_use, external = self._get_session(session)
        try:
            position = await session_to_use.scalar(
                select(func.count(Object.id)).where(Object.space_id == str(space_id))
            )
            metadata = self._extract_metadata(object_data)
            default_title = object_data.title
            default_description = object_data.description
            custom_title = getattr(object_data, "custom_title", None)
            custom_description = getattr(object_data, "custom_description", None)
            display_title, display_description = self._compute_display_fields(
                default_title,
                custom_title,
                default_description,
                custom_description,
                fallback_title=object_data.title,
            )

            obj = Object(
                id=str(uuid4()),
                space_id=str(space_id),
                type=object_data.type,
                title=display_title,
                description=display_description,
                default_title=default_title,
                default_description=default_description,
                custom_title=custom_title,
                custom_description=custom_description,
                tags=object_data.tags,
                metadata_json=metadata,
                position=position or 0,
            )
            session_to_use.add(obj)
            await session_to_use.flush()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(obj)

            logger.info(
                f"Created {object_data.type} object: {object_data.title}",
                extra={
                    "object_id": obj.id,
                    "space_id": str(space_id),
                    "type": object_data.type,
                    "position": obj.position
                }
            )

            return self._to_response(obj)
        finally:
            if not external:
                await session_to_use.close()

    def _extract_metadata(self, object_data: ObjectCreate) -> dict[str, Any]:
        """
        Extract type-specific metadata from object creation data.

        Args:
            object_data: Object creation data

        Returns:
            dict[str, Any]: Metadata dictionary
        """
        metadata = {}

        if isinstance(object_data, LinkObjectCreate):
            metadata = {
                "url": str(object_data.url),
                "favicon_url": str(object_data.favicon_url) if object_data.favicon_url else None,
                "thumbnail_url": str(object_data.thumbnail_url) if object_data.thumbnail_url else None,
            }
        elif isinstance(object_data, FileObjectCreate):
            metadata = {
                "file_path": object_data.file_path,
                "mime_type": object_data.mime_type,
                "file_size": None,  # Will be populated by file service
                "thumbnail_path": None,
            }
        elif isinstance(object_data, GoogleDriveObjectCreate):
            metadata = {
                "drive_file_id": object_data.drive_file_id,
                "drive_file_name": object_data.drive_file_name,
                "mime_type": object_data.mime_type,
                "web_view_link": str(object_data.web_view_link) if object_data.web_view_link else None,
            }
        elif isinstance(object_data, GmailObjectCreate):
            # Construct Gmail URL from thread_id for webview navigation
            gmail_url = f"https://mail.google.com/mail/u/0/#inbox/{object_data.thread_id}"
            metadata = {
                "thread_id": object_data.thread_id,
                "message_id": object_data.message_id,
                "subject": object_data.subject,
                "sender": object_data.sender,
                "snippet": object_data.snippet,
                "received_date": object_data.received_date.isoformat() if object_data.received_date else None,
                "url": gmail_url,
            }
        elif isinstance(object_data, TextObjectCreate):
            metadata = {
                "content": object_data.content,
            }
            if getattr(object_data, "service", None):
                metadata["service"] = object_data.service
        elif isinstance(object_data, WebArticleObjectCreate):
            metadata = {
                "url": str(object_data.url),
                "favicon_url": str(object_data.favicon_url) if object_data.favicon_url else None,
            }

        # Add position coordinates if provided
        if hasattr(object_data, 'x') and object_data.x is not None:
            metadata["x"] = object_data.x
        if hasattr(object_data, 'y') and object_data.y is not None:
            metadata["y"] = object_data.y

        return metadata

    # ========================================================================
    # Read
    # ========================================================================

    async def get_object_by_id(self, object_id: UUID, session: AsyncSession | None = None) -> ObjectResponse | None:
        """
        Get an object by ID.

        Args:
            object_id: Object UUID

        Returns:
            ObjectResponse if found, None otherwise

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Object).where(Object.id == str(object_id))
            )
            obj = result.scalar_one_or_none()
            if obj is None:
                logger.warning(f"Object not found: {object_id}")
                return None
            return self._to_response(obj)
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
        Get all objects on an space with filtering, pagination, and sorting.

        Args:
            space_id: Space UUID
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            object_type: Filter by object type
            tags: Filter by tags (objects must have ALL specified tags)
            search_query: Search in title and description
            sort_by: Field to sort by (position, title, created_at, updated_at)
            sort_order: Sort order (asc or desc)

        Returns:
            ObjectList: Paginated list of objects

        """
        sort_column = {
            "position": Object.position,
            "title": Object.title,
            "created_at": Object.created_at,
            "updated_at": Object.updated_at,
        }.get(sort_by or "position", Object.position)
        ordering = desc(sort_column) if sort_order.lower() == "desc" else asc(sort_column)

        session_to_use, external = self._get_session(session)
        try:
            stmt = select(Object).where(Object.space_id == str(space_id))
            if object_type:
                stmt = stmt.where(Object.type == object_type.value if hasattr(object_type, "value") else object_type)
            if search_query:
                pattern = f"%{search_query.lower()}%"
                stmt = stmt.where(
                    func.lower(Object.title).like(pattern) |
                    func.lower(Object.description).like(pattern)
                )
            stmt = self._apply_tag_filter(stmt, tags)
            total = await session_to_use.scalar(select(func.count()).select_from(stmt.subquery()))
            result = await session_to_use.execute(
                stmt.order_by(ordering).offset(skip).limit(limit)
            )
            rows = result.scalars().all()
            object_responses = [self._to_response(r) for r in rows]

            logger.debug(
                f"Retrieved {len(object_responses)} objects for space {space_id} (total: {total})",
                extra={
                    "space_id": str(space_id),
                    "skip": skip,
                    "limit": limit,
                    "total": total,
                    "filters": {
                        "type": object_type,
                        "tags": tags,
                        "search": search_query
                    }
                }
            )

            return ObjectList(objects=object_responses, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()

    async def get_objects_by_ids(self, object_ids: list[UUID], session: AsyncSession | None = None) -> list[ObjectResponse]:
        """
        Get multiple objects by their IDs.

        Args:
            object_ids: List of object UUIDs

        Returns:
            list[ObjectResponse]: List of found objects

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Object).where(Object.id.in_([str(i) for i in object_ids]))
            )
            rows = result.scalars().all()
            objects = [self._to_response(r) for r in rows]
            logger.debug(
                f"Retrieved {len(objects)} objects by IDs",
                extra={"requested": len(object_ids), "found": len(objects)}
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
        Get all objects of a specific type across all spaces.

        Args:
            object_type: Object type to filter by
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            ObjectList: Paginated list of objects

        """
        session_to_use, external = self._get_session(session)
        try:
            stmt = select(Object).where(Object.type == object_type.value if hasattr(object_type, "value") else object_type)
            total = await session_to_use.scalar(select(func.count()).select_from(stmt.subquery()))
            result = await session_to_use.execute(
                stmt.order_by(desc(Object.created_at)).offset(skip).limit(limit)
            )
            rows = result.scalars().all()
            object_responses = [self._to_response(r) for r in rows]
            logger.debug(
                f"Retrieved {len(object_responses)} {object_type} objects (total: {total})",
                extra={"type": object_type, "total": total}
            )
            return ObjectList(objects=object_responses, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()

    async def get_object_count_by_space(self, space_id: UUID, session: AsyncSession | None = None) -> int:
        """
        Get the count of objects on an space.

        Args:
            space_id: Space UUID

        Returns:
            int: Number of objects on the space

        """
        session_to_use, external = self._get_session(session)
        try:
            return await session_to_use.scalar(
                select(func.count(Object.id)).where(Object.space_id == str(space_id))
            ) or 0
        finally:
            if not external:
                await session_to_use.close()

    async def get_object_counts_by_space_ids(
        self,
        space_ids: list[UUID],
        session: AsyncSession | None = None
    ) -> dict[str, int]:
        """
        Get object counts for multiple spaces in one query.
        """
        if not space_ids:
            return {}
        session_to_use, external = self._get_session(session)
        try:
            stmt = (
                select(Object.space_id, func.count(Object.id))
                .where(Object.space_id.in_([str(i) for i in space_ids]))
                .group_by(Object.space_id)
            )
            result = await session_to_use.execute(stmt)
            return {row[0]: row[1] for row in result.all()}
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
            search_query: Search string (case-insensitive)
            tags: Filter by tags
            object_type: Filter by object type
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            ObjectList: Matching objects

        """
        session_to_use, external = self._get_session(session)
        try:
            stmt = select(Object)
            if space_id:
                stmt = stmt.where(Object.space_id == str(space_id))
            if search_query:
                pattern = f"%{search_query.lower()}%"
                stmt = stmt.where(
                    func.lower(Object.title).like(pattern) |
                    func.lower(Object.description).like(pattern)
                )
            if object_type:
                stmt = stmt.where(Object.type == (object_type.value if hasattr(object_type, "value") else object_type))
            stmt = self._apply_tag_filter(stmt, tags)
            total = await session_to_use.scalar(select(func.count()).select_from(stmt.subquery()))
            result = await session_to_use.execute(
                stmt.order_by(desc(Object.created_at)).offset(skip).limit(limit)
            )
            rows = result.scalars().all()
            object_responses = [self._to_response(r) for r in rows]
            logger.debug(
                f"Search found {total} objects",
                extra={"query": search_query, "returned": len(object_responses)}
            )
            return ObjectList(objects=object_responses, total=total or 0)
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
    ) -> ObjectResponse | None:
        """
        Update an existing object.

        Args:
            object_id: Object UUID
            object_data: Object update data (partial)

        Returns:
            ObjectResponse if updated, None if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Object).where(Object.id == str(object_id)))
            obj = result.scalar_one_or_none()
            if obj is None:
                logger.warning(f"Cannot update - object not found: {object_id}")
                return None

            payload = object_data.model_dump(exclude_unset=True)
            metadata_updates = object_data.metadata if object_data.metadata is not None else payload.pop("metadata", None)

            default_title_set = "default_title" in payload
            default_description_set = "default_description" in payload
            custom_title_set = "custom_title" in payload
            custom_description_set = "custom_description" in payload
            title_set = "title" in payload
            description_set = "description" in payload

            default_title = payload.pop("default_title", None)
            default_description = payload.pop("default_description", None)
            custom_title = payload.pop("custom_title", None)
            custom_description = payload.pop("custom_description", None)
            title_update = payload.pop("title", None)
            description_update = payload.pop("description", None)

            for key, value in payload.items():
                setattr(obj, key, value)

            if default_title_set and default_title is not None:
                obj.default_title = default_title
            if default_description_set:
                obj.default_description = default_description

            if custom_title_set:
                obj.custom_title = custom_title
            elif title_set:
                obj.custom_title = title_update

            if custom_description_set:
                obj.custom_description = custom_description
            elif description_set and not default_description_set:
                obj.default_description = description_update

            if metadata_updates:
                # Copy before update so SQLAlchemy sees a new object and persists JSON changes.
                current_meta = dict(obj.metadata_json or {})
                current_meta.update(metadata_updates)
                obj.metadata_json = current_meta

            obj.title, obj.description = self._compute_display_fields(
                obj.default_title or obj.title,
                obj.custom_title,
                obj.default_description,
                obj.custom_description,
                fallback_title=obj.title,
            )

            obj.updated_at = datetime.utcnow()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(obj)
            else:
                await session_to_use.flush()

            logger.info(
                f"Updated object: {obj.title}",
                extra={
                    "object_id": str(object_id),
                    "updated_fields": list(payload.keys()) + (
                        ["default_title"] if default_title_set else []
                    ) + (
                        ["default_description"] if default_description_set else []
                    ) + (
                        ["custom_title"] if custom_title_set or title_set else []
                    ) + (
                        ["custom_description"] if custom_description_set or description_set else []
                    ) + (["metadata"] if metadata_updates else [])
                }
            )

            return self._to_response(obj)
        finally:
            if not external:
                await session_to_use.close()

    async def update_object_thumbnail(
        self,
        object_id: UUID,
        thumbnail_url: str,
        session: AsyncSession | None = None
    ) -> ObjectResponse | None:
        """
        Update the thumbnail URL for an object.

        Args:
            object_id: Object UUID
            thumbnail_url: URL/path to the thumbnail

        Returns:
            ObjectResponse if updated, None if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Object).where(Object.id == str(object_id)))
            obj = result.scalar_one_or_none()
            if obj is None:
                logger.warning(f"Cannot update thumbnail - object not found: {object_id}")
                return None

            meta = obj.metadata_json or {}
            meta["thumbnail_url"] = thumbnail_url
            obj.metadata_json = meta
            obj.updated_at = datetime.utcnow()
            if not external:
                await session_to_use.commit()
                await session_to_use.refresh(obj)
            else:
                await session_to_use.flush()

            logger.debug(
                f"Updated thumbnail for object {object_id}",
                extra={"object_id": str(object_id), "thumbnail_url": thumbnail_url}
            )

            return ObjectResponse.model_validate(obj)
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Delete
    # ========================================================================

    async def delete_object(self, object_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Delete an object.

        Args:
            object_id: Object UUID

        Returns:
            bool: True if deleted, False if not found

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(select(Object).where(Object.id == str(object_id)))
            obj = result.scalar_one_or_none()
            if obj is None:
                logger.warning(f"Cannot delete - object not found: {object_id}")
                return False
            space_id = obj.space_id
            await session_to_use.delete(obj)
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            await self._compact_positions(UUID(space_id), session=session_to_use)
            logger.info(
                f"Deleted object: {obj.title}",
                extra={
                    "object_id": str(object_id),
                    "space_id": str(space_id),
                    "position": obj.position
                }
            )
            return True
        finally:
            if not external:
                await session_to_use.close()

    async def delete_objects_by_space(self, space_id: UUID, session: AsyncSession | None = None) -> int:
        """
        Delete all objects on an space (cascade deletion).

        Args:
            space_id: Space UUID

        Returns:
            int: Number of objects deleted

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                delete(Object).where(Object.space_id == str(space_id))
            )
            deleted = result.rowcount or 0
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            logger.info(
                f"Deleted {deleted} objects from space {space_id}",
                extra={"space_id": str(space_id), "count": deleted}
            )
            return deleted
        finally:
            if not external:
                await session_to_use.close()

    async def delete_all_objects(self, session: AsyncSession | None = None) -> int:
        """
        Delete all objects (used for testing).

        Returns:
            int: Number of objects deleted

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(delete(Object))
            deleted = result.rowcount or 0
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            logger.warning(f"Deleted all objects", extra={"count": deleted})
            return deleted
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Reorder
    # ========================================================================

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
            ValueError: If object IDs don't match space's objects

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Object.id).where(Object.space_id == str(space_id))
            )
            existing_ids = {UUID(i) for i in result.scalars().all()}
            provided_ids = set(object_ids)
            if existing_ids != provided_ids:
                missing_ids = existing_ids - provided_ids
                extra_ids = provided_ids - existing_ids
                error_msg = []
                if missing_ids:
                    error_msg.append(f"Missing objects: {missing_ids}")
                if extra_ids:
                    error_msg.append(f"Unknown objects: {extra_ids}")
                raise ValueError("; ".join(error_msg))

            now = datetime.utcnow()
            for position, object_id in enumerate(object_ids):
                await session_to_use.execute(
                    update(Object)
                    .where(Object.id == str(object_id))
                    .values(position=position, updated_at=now)
                )
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            result = await session_to_use.execute(select(Object).where(Object.id.in_([str(i) for i in object_ids])))
            rows = {r.id: r for r in result.scalars().all()}
            reordered = [self._to_response(rows[str(i)]) for i in object_ids if str(i) in rows]
            logger.info(
                f"Reordered {len(object_ids)} objects on space {space_id}",
                extra={"space_id": str(space_id), "object_count": len(object_ids)}
            )
            return reordered
        finally:
            if not external:
                await session_to_use.close()

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _compact_positions(self, space_id: UUID, session: AsyncSession | None = None) -> None:
        """
        Compact object positions on an space to eliminate gaps.

        Args:
            space_id: Space UUID

        """
        session_to_use, external = self._get_session(session)
        try:
            result = await session_to_use.execute(
                select(Object).where(Object.space_id == str(space_id)).order_by(Object.position.asc())
            )
            space_objects = result.scalars().all()
            now = datetime.utcnow()
            for new_position, obj in enumerate(space_objects):
                if obj.position != new_position:
                    obj.position = new_position
                    obj.updated_at = now
            if not external:
                await session_to_use.commit()
            else:
                await session_to_use.flush()
            logger.debug(
                f"Compacted positions for {len(space_objects)} objects on space {space_id}",
                extra={"space_id": str(space_id), "object_count": len(space_objects)}
            )
        finally:
            if not external:
                await session_to_use.close()

    async def exists(self, object_id: UUID, session: AsyncSession | None = None) -> bool:
        """
        Check if an object exists.

        Args:
            object_id: Object UUID

        Returns:
            bool: True if exists, False otherwise

        """
        session_to_use, external = self._get_session(session)
        try:
            exists = await session_to_use.scalar(
                select(func.count(Object.id)).where(Object.id == str(object_id))
            )
            return bool(exists)
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
            ObjectList: Objects with the specified tag

        """
        session_to_use, external = self._get_session(session)
        try:
            stmt = select(Object).order_by(desc(Object.created_at))
            stmt = self._apply_tag_filter(stmt, [tag])
            total = await session_to_use.scalar(select(func.count()).select_from(stmt.subquery()))
            result = await session_to_use.execute(
                stmt.offset(skip).limit(limit)
            )
            rows = result.scalars().all()
            object_responses = [self._to_response(r) for r in rows]
            logger.debug(
                f"Found {total} objects with tag '{tag}'",
                extra={"tag": tag, "returned": len(object_responses)}
            )
            return ObjectList(objects=object_responses, total=total or 0)
        finally:
            if not external:
                await session_to_use.close()

    def _compute_display_fields(
        self,
        default_title: str,
        custom_title: str | None,
        default_description: str | None,
        custom_description: str | None,
        fallback_title: str | None = None,
    ) -> tuple[str, str | None]:
        """
        Resolve display title/description using custom overrides when present,
        always returning a non-empty title.
        """
        candidate_default = (default_title or "").strip()
        candidate_custom = (custom_title or "").strip()
        base_title = candidate_custom or candidate_default or (fallback_title or "").strip() or "Untitled"
        display_description = custom_description if custom_description is not None else default_description
        return base_title, display_description

    def _to_response(self, obj: Object) -> ObjectResponse:
        """
        Map ORM Object to ObjectResponse using the JSON metadata column.
        """
        display_title, display_description = self._compute_display_fields(
            obj.default_title or obj.title,
            obj.custom_title,
            obj.default_description,
            obj.custom_description,
            fallback_title=obj.title,
        )
        return ObjectResponse.model_validate(
            {
                "id": obj.id,
                "space_id": obj.space_id,
                "type": obj.type,
                "title": display_title,
                "description": display_description,
                "default_title": obj.default_title or obj.title,
                "default_description": obj.default_description,
                "custom_title": obj.custom_title,
                "custom_description": obj.custom_description,
                "tags": obj.tags or [],
                "position": obj.position,
                "metadata": obj.metadata_json or {},
                "thumbnail_url": None,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            }
        )


# ============================================================================
# Singleton Instance
# ============================================================================

# Create a singleton instance
objects_repository = ObjectsRepository()


# ============================================================================
# Convenience Functions
# ============================================================================

async def get_repository() -> ObjectsRepository:
    """
    Get the objects repository instance.

    This is used for dependency injection in FastAPI routes.

    Returns:
        ObjectsRepository: Repository instance
    """
    return objects_repository
