"""
Islands Routes

API endpoints for Island (workspace) CRUD operations.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, status, Query, Depends

from app.models.island import (
    IslandCreate,
    IslandUpdate,
    IslandResponse,
    IslandList,
    IslandReorder,
    IslandDeleteResponse,
)
from app.services.islands_service import (
    islands_service,
    IslandNotFoundError,
    IslandLimitExceededError,
    InvalidIslandDataError,
)
from app.api.deps import validate_uuid
from app.core.exceptions import AppError, BadRequestError, ConflictError, NotFoundError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Islands Endpoints
# ============================================================================

@router.get(
    "",
    response_model=IslandList,
    status_code=status.HTTP_200_OK,
    summary="List all islands",
    description="Get all islands with pagination and sorting options.",
    tags=["Islands"]
)
async def list_islands(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    sort_by: Optional[str] = Query(None, description="Field to sort by (e.g., 'name', 'created_at', 'position')"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order (asc or desc)")
) -> IslandList:
    """
    List all islands with pagination.

    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        sort_by: Field to sort by
        sort_order: Sort order (asc or desc)

    Returns:
        IslandList: Paginated list of islands
    """
    try:
        islands = await islands_service.get_all_islands(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

        logger.info(
            f"Listed {len(islands.islands)} islands",
            extra={"total": islands.total, "skip": skip, "limit": limit}
        )

        return islands

    except Exception as e:
        logger.exception(
            "Failed to list islands",
            extra={"skip": skip, "limit": limit, "sort_by": sort_by, "sort_order": sort_order}
        )
        raise AppError(
            "Unable to retrieve islands right now. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_list_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "",
    response_model=IslandResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new island",
    description="Create a new island with the provided data.",
    tags=["Islands"]
)
async def create_island(
    island_data: IslandCreate
) -> IslandResponse:
    """
    Create a new island.

    Args:
        island_data: Island creation data

    Returns:
        IslandResponse: Created island

    Raises:
        400: Invalid island data or name conflict
        409: Island name already exists
        422: Validation error
        500: Internal server error
    """
    try:
        island = await islands_service.create_island(island_data)

        logger.info(f"Created island: {island.name}")

        return island

    except IslandLimitExceededError as e:
        logger.warning(f"Island limit exceeded: {e}")
        raise BadRequestError(
            "You have reached the maximum number of islands.",
            error_code="island_limit_exceeded",
            details={"error": str(e)},
        )

    except InvalidIslandDataError as e:
        logger.warning(f"Invalid island data: {e}")
        raise BadRequestError(
            "Island data is invalid.",
            error_code="invalid_island_data",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to create island", extra={"payload": island_data.dict() if hasattr(island_data, "dict") else {}})
        raise AppError(
            "Unable to create the island right now. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_create_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/{island_id}",
    response_model=IslandResponse,
    status_code=status.HTTP_200_OK,
    summary="Get island by ID",
    description="Get detailed information about a specific island.",
    tags=["Islands"]
)
async def get_island(
    island_id: UUID = Depends(validate_uuid)
) -> IslandResponse:
    """
    Get an island by ID.

    Args:
        island_id: Island UUID

    Returns:
        IslandResponse: Island data

    Raises:
        404: Island not found
        500: Internal server error
    """
    try:
        island = await islands_service.get_island(island_id)

        logger.debug(
            f"Retrieved island: {island.name}",
            extra={"island_id": str(island_id)}
        )

        return island

    except IslandNotFoundError as e:
        logger.warning(f"Island not found: {island_id}")
        raise NotFoundError(
            "Island not found.",
            error_code="island_not_found",
            details={"island_id": str(island_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to get island", extra={"island_id": str(island_id)})
        raise AppError(
            "Unable to retrieve this island right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_fetch_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.put(
    "/{island_id}",
    response_model=IslandResponse,
    status_code=status.HTTP_200_OK,
    summary="Update island",
    description="Update an existing island's data.",
    tags=["Islands"]
)
async def update_island(
    island_data: IslandUpdate,
    island_id: UUID = Depends(validate_uuid)
) -> IslandResponse:
    """
    Update an island.

    Args:
        island_id: Island UUID
        island_data: Island update data

    Returns:
        IslandResponse: Updated island

    Raises:
        400: Invalid island data
        404: Island not found
        409: Name conflict with another island
        500: Internal server error
    """
    try:
        island = await islands_service.update_island(island_id, island_data)

        logger.info(
            f"Updated island: {island.name}",
            extra={"island_id": str(island_id)}
        )

        return island

    except IslandNotFoundError as e:
        logger.warning(f"Island not found for update: {island_id}")
        raise NotFoundError(
            "Island not found.",
            error_code="island_not_found",
            details={"island_id": str(island_id), "error": str(e)},
        )

    except IslandNameConflictError as e:
        logger.warning(f"Island name conflict during update: {e}")
        raise ConflictError(
            "Another island already uses this name.",
            error_code="island_name_conflict",
            details={"island_id": str(island_id), "error": str(e)},
        )

    except InvalidIslandDataError as e:
        logger.warning(f"Invalid island update data: {e}")
        raise BadRequestError(
            "Island data is invalid.",
            error_code="invalid_island_data",
            details={"island_id": str(island_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to update island", extra={"island_id": str(island_id)})
        raise AppError(
            "Unable to update this island right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_update_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.delete(
    "/{island_id}",
    response_model=IslandDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete island",
    description="Delete an island and all its objects (cascade delete).",
    tags=["Islands"]
)
async def delete_island(
    island_id: UUID = Depends(validate_uuid)
) -> IslandDeleteResponse:
    """
    Delete an island and all its objects.

    This performs a cascade delete - all objects on the island will be deleted.

    Args:
        island_id: Island UUID

    Returns:
        IslandDeleteResponse: Deletion confirmation with count of deleted objects

    Raises:
        404: Island not found
        500: Internal server error
    """
    try:
        result = await islands_service.delete_island(island_id)

        logger.info(
            f"Deleted island and {result.objects_deleted} objects",
            extra={
                "island_id": str(island_id),
                "objects_deleted": result.objects_deleted
            }
        )

        return result

    except IslandNotFoundError as e:
        logger.warning(f"Island not found for deletion: {island_id}")
        raise NotFoundError(
            "Island not found.",
            error_code="island_not_found",
            details={"island_id": str(island_id), "error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to delete island", extra={"island_id": str(island_id)})
        raise AppError(
            "Unable to delete this island right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_delete_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/reorder",
    response_model=list[IslandResponse],
    status_code=status.HTTP_200_OK,
    summary="Reorder islands",
    description="Reorder islands by providing an ordered list of island IDs.",
    tags=["Islands"]
)
async def reorder_islands(
    reorder_data: IslandReorder
) -> list[IslandResponse]:
    """
    Reorder islands.

    Provide an ordered list of island IDs to set the new order.

    Args:
        reorder_data: Ordered list of island IDs

    Returns:
        list[IslandResponse]: Reordered islands

    Raises:
        400: Invalid reorder data
        500: Internal server error
    """
    try:
        islands = await islands_service.reorder_islands(reorder_data.island_ids)

        logger.info(
            f"Reordered {len(islands)} islands",
            extra={"island_count": len(islands)}
        )

        return islands

    except InvalidIslandDataError as e:
        logger.warning(f"Invalid reorder data: {e}")
        raise BadRequestError(
            "Island order request is invalid.",
            error_code="invalid_island_order",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to reorder islands", extra={"count": len(reorder_data.island_ids)})
        raise AppError(
            "Unable to reorder islands right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_reorder_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/search",
    response_model=IslandList,
    status_code=status.HTTP_200_OK,
    summary="Search islands",
    description="Search islands by name or description.",
    tags=["Islands"]
)
async def search_islands(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return")
) -> IslandList:
    """
    Search islands by name or description.

    Args:
        q: Search query string
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        IslandList: Matching islands

    Raises:
        500: Internal server error
    """
    try:
        islands = await islands_service.search_islands(
            search_query=q,
            skip=skip,
            limit=limit
        )

        logger.debug(
            f"Search found {islands.total} islands",
            extra={"query": q, "returned": len(islands.islands)}
        )

        return islands

    except Exception as e:
        logger.exception("Failed to search islands", extra={"query": q})
        raise AppError(
            "Unable to search islands right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_search_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/count",
    status_code=status.HTTP_200_OK,
    summary="Get island count",
    description="Get total number of islands.",
    tags=["Islands"]
)
async def get_island_count() -> dict:
    """
    Get total count of islands.

    Returns:
        dict: Count information

    Raises:
        500: Internal server error
    """
    try:
        count = await islands_service.get_island_count()

        logger.debug(f"Island count: {count}")

        return {"count": count}

    except Exception as e:
        logger.exception("Failed to get island count")
        raise AppError(
            "Unable to retrieve island count right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="island_count_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e
