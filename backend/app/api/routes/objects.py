"""
Objects Routes

API endpoints for Object CRUD operations.
Supports polymorphic objects: Link, File, Text, GoogleDrive, Gmail.
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, status, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.object import (
    ObjectCreate,
    ObjectUpdate,
    ObjectResponse,
    ObjectList,
    ObjectReorder,
    ObjectDeleteResponse,
    ObjectType,
)
from app.services.objects_service import (
    objects_service,
    ObjectNotFoundError,
    ObjectLimitExceededError,
    InvalidObjectDataError,
)
from app.api.deps import validate_uuid
from app.core.exceptions import AppError, BadRequestError, NotFoundError
from app.core.logging import get_logger
from app.storage.db import get_session


logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Objects Endpoints
# ============================================================================

@router.get(
    "/spaces/{space_id}/objects",
    response_model=ObjectList,
    status_code=status.HTTP_200_OK,
    summary="List objects on space",
    description="Get all objects on a specific space with pagination.",
    tags=["Objects"]
)
async def list_objects_on_space(
    space_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    type_filter: Optional[ObjectType] = Query(None, description="Filter by object type"),
    session: AsyncSession = Depends(get_session)
) -> ObjectList:
    """
    List all objects on an space.

    Args:
        space_id: Space UUID
        skip: Number of records to skip
        limit: Maximum number of records to return
        type_filter: Optional filter by object type

    Returns:
        ObjectList: Paginated list of objects

    Raises:
        500: Internal server error
    """
    try:
        objects = await objects_service.get_objects_by_space(
            space_id=space_id,
            skip=skip,
            limit=limit,
            object_type=type_filter,
            session=session
        )

        logger.info(
            f"Listed {len(objects.objects)} objects on space",
            extra={
                "space_id": str(space_id),
                "total": objects.total,
                "type_filter": type_filter
            }
        )

        return objects

    except Exception as e:
        logger.exception(
            "Failed to list objects",
            extra={"space_id": str(space_id), "skip": skip, "limit": limit, "type_filter": str(type_filter)}
        )
        raise AppError(
            "Unable to retrieve objects right now. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_list_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/spaces/{space_id}/objects",
    response_model=ObjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create object on space",
    description="Create a new object on the specified space.",
    tags=["Objects"]
)
async def create_object(
    space_id: UUID,
    object_data: ObjectCreate,
    session: AsyncSession = Depends(get_session)
) -> ObjectResponse:
    """
    Create a new object on an space.

    Supports polymorphic object types:
    - LINK: URL bookmark with metadata
    - FILE: Reference to file on filesystem (including .txt files)
    - TEXT: Plain text written directly in UI (stored in DB)
    - GOOGLE_DRIVE: Google Drive file reference
    - GMAIL: Gmail thread/message reference

    Args:
        space_id: Space UUID
        object_data: Object creation data (polymorphic)

    Returns:
        ObjectResponse: Created object

    Raises:
        400: Invalid object data or limit exceeded
        404: Space not found
        500: Internal server error
    """
    try:
        obj = await objects_service.create_object(space_id, object_data, session=session)

        logger.info(
            f"Created {obj.type} object: {obj.title}",
            extra={
                "object_id": str(obj.id),
                "space_id": str(space_id),
                "type": obj.type
            }
        )

        return obj

    except ObjectLimitExceededError as e:
        logger.warning(f"Object limit exceeded: {e}")
        raise BadRequestError(
            "You have reached the maximum number of objects allowed.",
            error_code="object_limit_exceeded",
            details={"error": str(e)},
        )

    except InvalidObjectDataError as e:
        logger.warning(f"Invalid object data: {e}")
        raise BadRequestError(
            "Object data is invalid.",
            error_code="invalid_object_data",
            details={"error": str(e)},
        )

    except FileNotFoundError as e:
        logger.warning(f"File not found: {e}")
        raise NotFoundError(
            "The referenced file could not be found.",
            error_code="file_not_found",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to create object", extra={"space_id": str(space_id)})
        raise AppError(
            "Unable to create the object right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_create_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/objects/{object_id}",
    response_model=ObjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Get object by ID",
    description="Get detailed information about a specific object.",
    tags=["Objects"]
)
async def get_object(
    object_id: UUID,
    session: AsyncSession = Depends(get_session)
) -> ObjectResponse:
    """
    Get an object by ID.

    Args:
        object_id: Object UUID

    Returns:
        ObjectResponse: Object data

    Raises:
        404: Object not found
        500: Internal server error
    """
    try:
        obj = await objects_service.get_object(object_id, session=session)

        logger.debug(
            f"Retrieved object: {obj.title}",
            extra={"object_id": str(object_id), "type": obj.type}
        )

        return obj

    except ObjectNotFoundError as e:
        logger.warning(f"Object not found: {object_id}")
        raise NotFoundError(
            "Object not found.",
            error_code="object_not_found",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to get object", extra={"object_id": str(object_id)})
        raise AppError(
            "Unable to retrieve this object right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.patch(
    "/objects/{object_id}",
    response_model=ObjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update object",
    description="Partially update an existing object's data (e.g., position).",
    tags=["Objects"]
)
async def patch_object(
    object_id: UUID,
    object_data: ObjectUpdate,
    session: AsyncSession = Depends(get_session)
) -> ObjectResponse:
    """
    Partially update an object (same as PUT but semantically for partial updates).

    Args:
        object_id: Object UUID
        object_data: Object update data (partial)

    Returns:
        ObjectResponse: Updated object

    Raises:
        400: Invalid object data
        404: Object not found
        500: Internal server error
    """
    try:
        obj = await objects_service.update_object(object_id, object_data, session=session)

        logger.info(
            f"Patched object: {obj.title}",
            extra={"object_id": str(object_id), "type": obj.type}
        )

        return obj

    except ObjectNotFoundError as e:
        logger.warning(f"Object not found for patch: {object_id}")
        raise NotFoundError(
            "Object not found.",
            error_code="object_not_found",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except InvalidObjectDataError as e:
        logger.warning(f"Invalid object patch data: {e}")
        raise BadRequestError(
            "Object data is invalid.",
            error_code="invalid_object_data",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to patch object", extra={"object_id": str(object_id)})
        raise AppError(
            "Unable to update this object right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_patch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.put(
    "/objects/{object_id}",
    response_model=ObjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update object",
    description="Update an existing object's data.",
    tags=["Objects"]
)
async def update_object(
    object_id: UUID,
    object_data: ObjectUpdate,
    session: AsyncSession = Depends(get_session)
) -> ObjectResponse:
    """
    Update an object.

    Args:
        object_id: Object UUID
        object_data: Object update data

    Returns:
        ObjectResponse: Updated object

    Raises:
        400: Invalid object data
        404: Object not found
        500: Internal server error
    """
    try:
        obj = await objects_service.update_object(object_id, object_data, session=session)

        logger.info(
            f"Updated object: {obj.title}",
            extra={"object_id": str(object_id), "type": obj.type}
        )

        return obj

    except ObjectNotFoundError as e:
        logger.warning(f"Object not found for update: {object_id}")
        raise NotFoundError(
            "Object not found.",
            error_code="object_not_found",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except InvalidObjectDataError as e:
        logger.warning(f"Invalid object update data: {e}")
        raise BadRequestError(
            "Object data is invalid.",
            error_code="invalid_object_data",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to update object", extra={"object_id": str(object_id)})
        raise AppError(
            "Unable to update this object right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_update_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.delete(
    "/objects/{object_id}",
    response_model=ObjectDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete object",
    description="Delete an object.",
    tags=["Objects"]
)
async def delete_object(
    object_id: UUID,
    session: AsyncSession = Depends(get_session)
) -> ObjectDeleteResponse:
    """
    Delete an object.

    Args:
        object_id: Object UUID

    Returns:
        ObjectDeleteResponse: Deletion confirmation

    Raises:
        404: Object not found
        500: Internal server error
    """
    try:
        result = await objects_service.delete_object(object_id, session=session)

        logger.info(
            f"Deleted object",
            extra={"object_id": str(object_id)}
        )

        return result

    except ObjectNotFoundError as e:
        logger.warning(f"Object not found for deletion: {object_id}")
        raise NotFoundError(
            "Object not found.",
            error_code="object_not_found",
            details={"object_id": str(object_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to delete object", extra={"object_id": str(object_id)})
        raise AppError(
            "Unable to delete this object right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_delete_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/objects/reorder",
    response_model=list[ObjectResponse],
    status_code=status.HTTP_200_OK,
    summary="Reorder objects",
    description="Reorder objects within an space by providing an ordered list of object IDs.",
    tags=["Objects"]
)
async def reorder_objects(
    reorder_data: ObjectReorder,
    session: AsyncSession = Depends(get_session)
) -> list[ObjectResponse]:
    """
    Reorder objects within an space.

    Args:
        reorder_data: Ordered list of object IDs

    Returns:
        list[ObjectResponse]: Reordered objects

    Raises:
        400: Invalid reorder data
        500: Internal server error
    """
    try:
        objects = await objects_service.reorder_objects(reorder_data.object_ids, session=session)

        logger.info(
            f"Reordered {len(objects)} objects",
            extra={"object_count": len(objects)}
        )

        return objects

    except InvalidObjectDataError as e:
        logger.warning(f"Invalid reorder data: {e}")
        raise BadRequestError(
            "Object order request is invalid.",
            error_code="invalid_object_order",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to reorder objects", extra={"count": len(reorder_data.object_ids)})
        raise AppError(
            "Unable to reorder objects right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_reorder_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/objects/search",
    response_model=ObjectList,
    status_code=status.HTTP_200_OK,
    summary="Search objects",
    description="Search objects by title, description, tags, or full-text search.",
    tags=["Objects"]
)
async def search_objects(
    q: Optional[str] = Query(None, description="Search query (title, description, metadata)"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags (AND logic)"),
    type_filter: Optional[ObjectType] = Query(None, description="Filter by object type"),
    space_id: Optional[UUID] = Query(None, description="Filter by space"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    session: AsyncSession = Depends(get_session)
) -> ObjectList:
    """
    Search objects across all spaces or within a specific space.

    Args:
        q: Search query string (searches title, description, and metadata)
        tags: List of tags to filter by (AND logic - object must have all tags)
        type_filter: Filter by object type
        space_id: Optional space filter
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        ObjectList: Matching objects

    Raises:
        500: Internal server error
    """
    try:
        objects = await objects_service.search_objects(
            search_query=q,
            tags=tags,
            type_filter=type_filter,
            space_id=space_id,
            skip=skip,
            limit=limit,
            session=session
        )

        logger.debug(
            f"Search found {objects.total} objects",
            extra={
                "query": q,
                "tags": tags,
                "type_filter": type_filter,
                "space_id": str(space_id) if space_id else None
            }
        )

        return objects

    except Exception as e:
        logger.exception("Failed to search objects", extra={"query": q, "tags": tags})
        raise AppError(
            "Unable to search objects right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_search_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/objects/by-type/{object_type}",
    response_model=ObjectList,
    status_code=status.HTTP_200_OK,
    summary="Get objects by type",
    description="Get all objects of a specific type (e.g., all links, all files).",
    tags=["Objects"]
)
async def get_objects_by_type(
    object_type: ObjectType,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    session: AsyncSession = Depends(get_session)
) -> ObjectList:
    """
    Get all objects of a specific type.

    Args:
        object_type: Object type to filter by
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        ObjectList: Objects of the specified type

    Raises:
        500: Internal server error
    """
    try:
        objects = await objects_service.get_objects_by_type(
            object_type=object_type,
            skip=skip,
            limit=limit,
            session=session
        )

        logger.debug(
            f"Retrieved {len(objects.objects)} {object_type} objects",
            extra={"type": object_type, "total": objects.total}
        )

        return objects

    except Exception as e:
        logger.exception("Failed to get objects by type", extra={"type": object_type})
        raise AppError(
            "Unable to retrieve objects of this type right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_type_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/objects/by-tags",
    response_model=ObjectList,
    status_code=status.HTTP_200_OK,
    summary="Get objects by tags",
    description="Get all objects that have all specified tags (AND logic).",
    tags=["Objects"]
)
async def get_objects_by_tags(
    tags: List[str] = Query(..., description="Tags to filter by (AND logic)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    session: AsyncSession = Depends(get_session)
) -> ObjectList:
    """
    Get objects by tags (AND logic - object must have all specified tags).

    Args:
        tags: List of tags to filter by
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        ObjectList: Objects with all specified tags

    Raises:
        500: Internal server error
    """
    try:
        objects = await objects_service.get_objects_by_tags(
            tags=tags,
            skip=skip,
            limit=limit,
            session=session
        )

        logger.debug(
            f"Found {objects.total} objects with tags {tags}",
            extra={"tags": tags, "total": objects.total}
        )

        return objects

    except Exception as e:
        logger.exception("Failed to get objects by tags", extra={"tags": tags})
        raise AppError(
            "Unable to retrieve objects for the specified tags right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="object_tags_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e
