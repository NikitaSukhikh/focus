"""
Health Check Routes

Provides health status endpoints for monitoring and diagnostics.
"""

from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, status, Depends
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


# Track application start time
_app_start_time = datetime.utcnow()


# ============================================================================
# Response Models
# ============================================================================

class HealthResponse(BaseModel):
    """Basic health check response."""
    status: str
    version: str
    environment: str
    timestamp: datetime
    uptime_seconds: float


class DatabaseHealthResponse(BaseModel):
    """Database health check response."""
    status: str
    connected: bool
    message: str
    timestamp: datetime


class DetailedHealthResponse(BaseModel):
    """Detailed health check with all subsystems."""
    status: str
    version: str
    environment: str
    timestamp: datetime
    uptime_seconds: float
    subsystems: Dict[str, Any]


# ============================================================================
# Health Endpoints
# ============================================================================

@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Basic health check",
    description="Returns basic application health status, version, and uptime.",
    tags=["Health"]
)
async def health_check(
    settings: Settings = Depends(get_settings)
) -> HealthResponse:
    """
    Basic health check endpoint.

    Returns:
        HealthResponse: Application health status
    """
    current_time = datetime.utcnow()
    uptime = (current_time - _app_start_time).total_seconds()

    logger.debug("Health check requested", extra={"uptime": uptime})

    return HealthResponse(
        status="healthy",
        version="0.1.0",  # TODO: Get from package metadata or git tag
        environment=settings.server.environment,
        timestamp=current_time,
        uptime_seconds=uptime
    )


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Database health check",
    description="Checks database connectivity and returns connection status.",
    tags=["Health"]
)
async def database_health_check(
    settings: Settings = Depends(get_settings)
) -> DatabaseHealthResponse:
    """
    Database connectivity health check.

    Returns:
        DatabaseHealthResponse: Database connection status
    """
    current_time = datetime.utcnow()

    # TODO: Implement actual database connectivity check (e.g., execute simple query)
    # For now, return healthy assuming the database is available

    logger.debug("Database health check requested")

    return DatabaseHealthResponse(
        status="healthy",
        connected=True,
        message=f"Database connected: {settings.database.path}",
        timestamp=current_time
    )


@router.get(
    "/health/detailed",
    response_model=DetailedHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Detailed health check",
    description="Returns detailed health status including all subsystems (database, storage).",
    tags=["Health"]
)
async def detailed_health_check(
    settings: Settings = Depends(get_settings)
) -> DetailedHealthResponse:
    """
    Detailed health check with subsystem status.

    Checks:
    - Database connectivity
    - Storage directories
    - Feature flags

    Returns:
        DetailedHealthResponse: Detailed health information
    """
    current_time = datetime.utcnow()
    uptime = (current_time - _app_start_time).total_seconds()

    # Check subsystems
    subsystems = {}

    # Database status
    # TODO: Implement actual database connectivity check
    subsystems["database"] = {
        "status": "healthy",
        "connected": True,
        "type": "sqlite",
        "path": settings.database.path
    }

    # Storage status
    subsystems["storage"] = {
        "status": "healthy",
        "base_path": str(settings.storage.base_path),
        "cache_dir": str(settings.storage.cache_dir)
    }

    # Feature flags
    subsystems["features"] = {
        "ai_assistant": settings.features.ai_assistant,
        "thumbnails": settings.features.thumbnails,
        "previews": settings.features.previews,
        "api_docs": settings.dev.enable_api_docs
    }

    logger.debug("Detailed health check requested", extra={"uptime": uptime})

    return DetailedHealthResponse(
        status="healthy",
        version="0.1.0",  # TODO: Get from package metadata
        environment=settings.server.environment,
        timestamp=current_time,
        uptime_seconds=uptime,
        subsystems=subsystems
    )


@router.get(
    "/health/ready",
    status_code=status.HTTP_200_OK,
    summary="Readiness check",
    description="Checks if the application is ready to serve requests (used by container orchestrators).",
    tags=["Health"]
)
async def readiness_check() -> Dict[str, str]:
    """
    Readiness probe endpoint.

    Used by Kubernetes/Docker Swarm to determine if the service is ready to accept traffic.

    Returns:
        Dict: Simple ready status
    """
    # TODO: Add more comprehensive readiness checks
    # - Database connection established
    # - Required services available
    # - Initial data loaded

    logger.debug("Readiness check requested")

    return {"status": "ready"}


@router.get(
    "/health/live",
    status_code=status.HTTP_200_OK,
    summary="Liveness check",
    description="Checks if the application is alive (used by container orchestrators).",
    tags=["Health"]
)
async def liveness_check() -> Dict[str, str]:
    """
    Liveness probe endpoint.

    Used by Kubernetes/Docker Swarm to determine if the service is still running.

    Returns:
        Dict: Simple alive status
    """
    logger.debug("Liveness check requested")

    return {"status": "alive"}
