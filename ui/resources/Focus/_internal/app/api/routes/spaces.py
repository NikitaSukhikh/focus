"""
Spaces Routes

API endpoints for Space (workspace) CRUD operations.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, status, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.space import (
    SpaceCreate,
    SpaceUpdate,
    SpaceResponse,
    SpaceList,
    SpaceReorder,
    SpaceDeleteResponse,
)
from app.services.spaces_service import (
    spaces_service,
    SpaceNotFoundError,
    SpaceLimitExceededError,
    InvalidSpaceDataError,
)
from app.api.deps import validate_uuid
from app.core.exceptions import AppError, BadRequestError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.storage.db import get_session


logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Spaces Endpoints
# ============================================================================

@router.get(
    "",
    response_model=SpaceList,
    status_code=status.HTTP_200_OK,
    summary="List all spaces",
    description="Get all spaces with pagination and sorting options.",
    tags=["Spaces"]
)
async def list_spaces(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    sort_by: Optional[str] = Query(None, description="Field to sort by (e.g., 'name', 'created_at', 'position')"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order (asc or desc)"),
    session: AsyncSession = Depends(get_session)
) -> SpaceList:
    """
    List all spaces with pagination.

    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        sort_by: Field to sort by
        sort_order: Sort order (asc or desc)

    Returns:
        SpaceList: Paginated list of spaces
    """
    try:
        spaces = await spaces_service.get_all_spaces(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            session=session
        )

        logger.info(
            f"Listed {len(spaces.spaces)} spaces",
            extra={"total": spaces.total, "skip": skip, "limit": limit}
        )

        return spaces

    except Exception as e:
        logger.exception(
            "Failed to list spaces",
            extra={"skip": skip, "limit": limit, "sort_by": sort_by, "sort_order": sort_order}
        )
        raise AppError(
            "Unable to retrieve spaces right now. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_list_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "",
    response_model=SpaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new space",
    description="Create a new space with the provided data.",
    tags=["Spaces"]
)
async def create_space(
    space_data: SpaceCreate,
    session: AsyncSession = Depends(get_session)
) -> SpaceResponse:
    """
    Create a new space.

    Args:
        space_data: Space creation data

    Returns:
        SpaceResponse: Created space

    Raises:
        400: Invalid space data or name conflict
        409: Space name already exists
        422: Validation error
        500: Internal server error
    """
    from app.utils.app_logger import get_app_logger

    app_logger = get_app_logger("spaces")

    try:
        space = await spaces_service.create_space(space_data, session=session)

        logger.info(f"Created space: {space.name}")
        app_logger.log_space_operation(
            "create",
            space_id=space.id,
            space_name=space.name,
            status="success"
        )

        return space

    except SpaceLimitExceededError as e:
        logger.warning(f"Space limit exceeded: {e}")
        raise BadRequestError(
            "You have reached the maximum number of spaces.",
            error_code="space_limit_exceeded",
            details={"error": str(e)},
        )

    except InvalidSpaceDataError as e:
        logger.warning(f"Invalid space data: {e}")
        raise BadRequestError(
            "Space data is invalid.",
            error_code="invalid_space_data",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to create space", extra={"payload": space_data.dict() if hasattr(space_data, "dict") else {}})
        app_logger.log_space_operation(
            "create",
            space_name=space_data.name if hasattr(space_data, "name") else None,
            status="failed",
            error=str(e)
        )
        raise AppError(
            "Unable to create the space right now. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_create_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/{space_id}",
    response_model=SpaceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get space by ID",
    description="Get detailed information about a specific space.",
    tags=["Spaces"]
)
async def get_space(
    space_id: UUID = Depends(validate_uuid),
    session: AsyncSession = Depends(get_session)
) -> SpaceResponse:
    """
    Get an space by ID.

    Args:
        space_id: Space UUID

    Returns:
        SpaceResponse: Space data

    Raises:
        404: Space not found
        500: Internal server error
    """
    try:
        space = await spaces_service.get_space(space_id, session=session)

        logger.debug(
            f"Retrieved space: {space.name}",
            extra={"space_id": str(space_id)}
        )

        return space

    except SpaceNotFoundError as e:
        logger.warning(f"Space not found: {space_id}")
        raise NotFoundError(
            "Space not found.",
            error_code="space_not_found",
            details={"space_id": str(space_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to get space", extra={"space_id": str(space_id)})
        raise AppError(
            "Unable to retrieve this space right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.put(
    "/{space_id}",
    response_model=SpaceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update space",
    description="Update an existing space's data.",
    tags=["Spaces"]
)
async def update_space(
    space_data: SpaceUpdate,
    space_id: UUID = Depends(validate_uuid),
    session: AsyncSession = Depends(get_session)
) -> SpaceResponse:
    """
    Update an space.

    Args:
        space_id: Space UUID
        space_data: Space update data

    Returns:
        SpaceResponse: Updated space

    Raises:
        400: Invalid space data
        404: Space not found
        409: Name conflict with another space
        500: Internal server error
    """
    try:
        space = await spaces_service.update_space(space_id, space_data, session=session)

        logger.info(
            f"Updated space: {space.name}",
            extra={"space_id": str(space_id)}
        )

        return space

    except SpaceNotFoundError as e:
        logger.warning(f"Space not found for update: {space_id}")
        raise NotFoundError(
            "Space not found.",
            error_code="space_not_found",
            details={"space_id": str(space_id), "error": str(e)},
        )

    except SpaceNameConflictError as e:
        logger.warning(f"Space name conflict during update: {e}")
        raise ConflictError(
            "Another space already uses this name.",
            error_code="space_name_conflict",
            details={"space_id": str(space_id), "error": str(e)},
        )

    except InvalidSpaceDataError as e:
        logger.warning(f"Invalid space update data: {e}")
        raise BadRequestError(
            "Space data is invalid.",
            error_code="invalid_space_data",
            details={"space_id": str(space_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to update space", extra={"space_id": str(space_id)})
        raise AppError(
            "Unable to update this space right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_update_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.delete(
    "/{space_id}",
    response_model=SpaceDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete space",
    description="Delete an space and all its objects (cascade delete).",
    tags=["Spaces"]
)
async def delete_space(
    space_id: UUID = Depends(validate_uuid),
    session: AsyncSession = Depends(get_session)
) -> SpaceDeleteResponse:
    """
    Delete an space and all its objects.

    This performs a cascade delete - all objects on the space will be deleted.

    Args:
        space_id: Space UUID

    Returns:
        SpaceDeleteResponse: Deletion confirmation with count of deleted objects

    Raises:
        404: Space not found
        500: Internal server error
    """
    try:
        result = await spaces_service.delete_space(space_id, session=session)

        logger.info(
            f"Deleted space and {result.objects_deleted} objects",
            extra={
                "space_id": str(space_id),
                "objects_deleted": result.objects_deleted
            }
        )

        return result

    except SpaceNotFoundError as e:
        logger.warning(f"Space not found for deletion: {space_id}")
        raise NotFoundError(
            "Space not found.",
            error_code="space_not_found",
            details={"space_id": str(space_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to delete space", extra={"space_id": str(space_id)})
        raise AppError(
            "Unable to delete this space right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_delete_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/reorder",
    response_model=list[SpaceResponse],
    status_code=status.HTTP_200_OK,
    summary="Reorder spaces",
    description="Reorder spaces by providing an ordered list of space IDs.",
    tags=["Spaces"]
)
async def reorder_spaces(
    reorder_data: SpaceReorder,
    session: AsyncSession = Depends(get_session)
) -> list[SpaceResponse]:
    """
    Reorder spaces.

    Provide an ordered list of space IDs to set the new order.

    Args:
        reorder_data: Ordered list of space IDs

    Returns:
        list[SpaceResponse]: Reordered spaces

    Raises:
        400: Invalid reorder data
        500: Internal server error
    """
    try:
        spaces = await spaces_service.reorder_spaces(reorder_data.space_ids, session=session)

        logger.info(
            f"Reordered {len(spaces)} spaces",
            extra={"space_count": len(spaces)}
        )

        return spaces

    except InvalidSpaceDataError as e:
        logger.warning(f"Invalid reorder data: {e}")
        raise BadRequestError(
            "Space order request is invalid.",
            error_code="invalid_space_order",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to reorder spaces", extra={"count": len(reorder_data.space_ids)})
        raise AppError(
            "Unable to reorder spaces right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_reorder_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/search",
    response_model=SpaceList,
    status_code=status.HTTP_200_OK,
    summary="Search spaces",
    description="Search spaces by name or description.",
    tags=["Spaces"]
)
async def search_spaces(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    session: AsyncSession = Depends(get_session)
) -> SpaceList:
    """
    Search spaces by name or description.

    Args:
        q: Search query string
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        SpaceList: Matching spaces

    Raises:
        500: Internal server error
    """
    try:
        spaces = await spaces_service.search_spaces(
            search_query=q,
            skip=skip,
            limit=limit,
            session=session
        )

        logger.debug(
            f"Search found {spaces.total} spaces",
            extra={"query": q, "returned": len(spaces.spaces)}
        )

        return spaces

    except Exception as e:
        logger.exception("Failed to search spaces", extra={"query": q})
        raise AppError(
            "Unable to search spaces right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_search_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/count",
    status_code=status.HTTP_200_OK,
    summary="Get space count",
    description="Get total number of spaces.",
    tags=["Spaces"]
)
async def get_space_count(session: AsyncSession = Depends(get_session)) -> dict:
    """
    Get total count of spaces.

    Returns:
        dict: Count information

    Raises:
        500: Internal server error
    """
    try:
        count = await spaces_service.get_space_count(session=session)

        logger.debug(f"Space count: {count}")

        return {"count": count}

    except Exception as e:
        logger.exception("Failed to get space count")
        raise AppError(
            "Unable to retrieve space count right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="space_count_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e
