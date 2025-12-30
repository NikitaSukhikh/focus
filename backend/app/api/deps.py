"""
API Dependencies

This module provides dependency injection functions for FastAPI routes.
Dependencies include database sessions, authentication, settings access, and more.
"""

from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, Header, Path, Request, status

from app.core.config import Settings, get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)


# Settings dependency
def get_settings_dependency() -> Settings:
    """
    Dependency to inject application settings.

    Returns:
        Settings: Application settings instance

    Example:
        @app.get("/config")
        async def get_config(settings: Settings = Depends(get_settings_dependency)):
            return {"environment": settings.server.environment}
    """
    return get_settings()


# TODO: Database session dependency (implement when database layer is ready)
# async def get_db_session() -> AsyncGenerator:
#     """
#     Dependency to inject database session.
#
#     Yields a database session and ensures it's closed after the request.
#
#     Yields:
#         AsyncSession: Database session
#
#     Example:
#         @app.get("/spaces")
#         async def get_spaces(db: AsyncSession = Depends(get_db_session)):
#             result = await db.execute(select(Space))
#             return result.scalars().all()
#     """
#     async with async_session_maker() as session:
#         try:
#             yield session
#             await session.commit()
#         except Exception:
#             await session.rollback()
#             raise
#         finally:
#             await session.close()


# Request ID dependency
async def get_request_id(x_request_id: Optional[str] = Header(None)) -> Optional[str]:
    """
    Dependency to extract request ID from headers.

    Args:
        x_request_id: Request ID from X-Request-ID header

    Returns:
        Optional[str]: Request ID if present

    Example:
        @app.get("/data")
        async def get_data(request_id: str = Depends(get_request_id)):
            logger.info(f"Processing request {request_id}")
    """
    return x_request_id


# Feature flag dependencies
class FeatureFlags:
    """
    Feature flag dependencies for controlling access to features.

    These dependencies raise HTTP 503 (Service Unavailable) if a feature
    is disabled, allowing for easy feature toggling without changing route code.
    """

    @staticmethod
    def require_google_integration(
        settings: Settings = Depends(get_settings_dependency)
    ) -> None:
        """
        Dependency that requires Google integration to be enabled.

        Raises:
            HTTPException: If Google integration is disabled

        Example:
            @app.get("/google/auth", dependencies=[Depends(FeatureFlags.require_google_integration)])
            async def google_auth():
                # This route only works if Google integration is enabled
                pass
        """
        if not settings.features.google_integration:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google integration is currently disabled"
            )

    @staticmethod
    def require_ai_assistant(
        settings: Settings = Depends(get_settings_dependency)
    ) -> None:
        """
        Dependency that requires AI assistant to be enabled.

        Raises:
            HTTPException: If AI assistant is disabled
        """
        if not settings.features.ai_assistant:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI assistant is currently disabled"
            )

    @staticmethod
    def require_thumbnails(
        settings: Settings = Depends(get_settings_dependency)
    ) -> None:
        """
        Dependency that requires thumbnail generation to be enabled.

        Raises:
            HTTPException: If thumbnail generation is disabled
        """
        if not settings.features.thumbnails:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Thumbnail generation is currently disabled"
            )

    @staticmethod
    def require_previews(
        settings: Settings = Depends(get_settings_dependency)
    ) -> None:
        """
        Dependency that requires preview generation to be enabled.

        Raises:
            HTTPException: If preview generation is disabled
        """
        if not settings.features.previews:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Preview generation is currently disabled"
            )


# Backward compatibility aliases
FeatureFlags.google_integration = FeatureFlags.require_google_integration
FeatureFlags.ai_assistant = FeatureFlags.require_ai_assistant
FeatureFlags.thumbnails = FeatureFlags.require_thumbnails
FeatureFlags.previews = FeatureFlags.require_previews
# Google OAuth configuration dependency
def get_google_config(
    settings: Settings = Depends(get_settings_dependency)
) -> dict:
    """
    Dependency to get Google OAuth configuration.

    Args:
        settings: Application settings

    Returns:
        dict: Google OAuth configuration

    Raises:
        HTTPException: If Google OAuth is not configured

    Example:
        @app.get("/google/status")
        async def google_status(google_config: dict = Depends(get_google_config)):
            return {"configured": True, "scopes": google_config["scopes"]}
    """
    if not settings.google.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )

    return {
        "client_id": settings.google.client_id,
        "client_secret": settings.google.client_secret,
        "redirect_uri": settings.google.redirect_uri,
        "scopes": settings.google.scopes,
    }


# AI Assistant configuration dependency
def get_ai_config(
    settings: Settings = Depends(get_settings_dependency)
) -> dict:
    """
    Dependency to get AI assistant configuration.

    Args:
        settings: Application settings

    Returns:
        dict: AI assistant configuration

    Raises:
        HTTPException: If AI assistant is not configured

    Example:
        @app.post("/assistant/chat")
        async def chat(ai_config: dict = Depends(get_ai_config)):
            # Use ai_config["provider"], ai_config["api_key"], etc.
            pass
    """
    if not settings.ai.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI assistant is not configured. Please set {settings.ai.provider.upper()}_API_KEY."
        )

    return {
        "provider": settings.ai.provider,
        "api_key": settings.ai.api_key,
        "model": settings.ai.model,
        "max_tokens": settings.ai.max_tokens,
        "temperature": settings.ai.temperature,
    }


# Rate limiting dependency (placeholder - implement actual rate limiting when needed)
class RateLimiter:
    """
    Rate limiting dependency.

    This is a placeholder for future rate limiting implementation.
    Consider using slowapi or similar library for production use.
    """

    @staticmethod
    async def check_rate_limit(
        request_id: Optional[str] = Depends(get_request_id),
        settings: Settings = Depends(get_settings_dependency)
    ) -> None:
        """
        Check rate limit for the current request.

        Args:
            request_id: Request ID
            settings: Application settings

        Raises:
            HTTPException: If rate limit is exceeded

        Note:
            This is a placeholder. Implement actual rate limiting logic
            using Redis, in-memory cache, or a dedicated rate limiting library.
        """
        if not settings.rate_limit.enabled:
            return

        # TODO: Implement actual rate limiting logic
        # For now, this is a no-op
        pass


# Pagination dependency
class PaginationParams:
    """
    Common pagination parameters dependency.
    """

    def __init__(
        self,
        skip: int = 0,
        limit: int = 100,
    ):
        """
        Initialize pagination parameters.

        Args:
            skip: Number of items to skip (offset)
            limit: Maximum number of items to return

        Example:
            @app.get("/spaces")
            async def get_spaces(pagination: PaginationParams = Depends()):
                # Use pagination.skip and pagination.limit
                pass
        """
        self.skip = max(0, skip)  # Ensure skip is non-negative
        self.limit = min(max(1, limit), 1000)  # Clamp limit between 1 and 1000


# Common query parameters for filtering
class FilterParams:
    """
    Common filtering parameters dependency.
    """

    def __init__(
        self,
        search: Optional[str] = None,
        tags: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "asc",
    ):
        """
        Initialize filter parameters.

        Args:
            search: Search query string
            tags: Comma-separated list of tags to filter by
            sort_by: Field to sort by
            sort_order: Sort order (asc or desc)

        Example:
            @app.get("/objects")
            async def get_objects(filters: FilterParams = Depends()):
                # Use filters.search, filters.tags, etc.
                pass
        """
        self.search = search
        self.tags = tags.split(",") if tags else []
        self.sort_by = sort_by
        self.sort_order = sort_order.lower() if sort_order else "asc"


# Validation helpers
def validate_uuid(request: Request) -> str:
    """
    Validate that a string is a valid UUID.

    Args:
        value: String to validate

    Returns:
        str: The validated UUID string

    Raises:
        HTTPException: If the value is not a valid UUID

    Example:
        @app.get("/spaces/{space_id}")
        async def get_space(space_id: str = Depends(validate_uuid)):
            # Now we know space_id is a valid UUID
    """
    import uuid

    # Prefer path params, but allow query fallback for flexibility.
    candidate: Optional[str] = None
    if request.path_params:
        candidate = next(iter(request.path_params.values()))
    elif request.query_params.get("value"):
        candidate = request.query_params.get("value")

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid UUID: must be provided",
        )

    try:
        return uuid.UUID(str(candidate))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid UUID: must be a valid UUID"
        )


def validate_positive_int(value: int, field_name: str = "value") -> int:
    """
    Validate that an integer is positive.

    Args:
        value: Integer to validate
        field_name: Name of the field (for error messages)

    Returns:
        int: The validated integer

    Raises:
        HTTPException: If the value is not positive
    """
    if value <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field_name}: must be a positive integer"
        )
    return value
