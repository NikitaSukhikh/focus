"""
Ocean Backend - FastAPI Application

Main application entry point for the Ocean backend server.
Provides REST API for Islands, Objects, Previews, Google OAuth, and AI Assistant.
"""

# Load .env file before importing settings
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory (parent of app directory)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import uuid
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers, get_request_id
from app.core.logging import (
    setup_logging,
    get_logger,
    set_request_context,
    clear_request_context,
)
from app.storage.db import init_db


# Initialize settings and logging
settings = get_settings()
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan context manager.

    Handles startup and shutdown events for the application.
    """
    # Startup
    try:
        settings.storage.ensure_directories()
        await init_db()
    except Exception as e:
        logger.error(f"Failed to initialize storage: {e}", exc_info=True)

    yield

    # Shutdown
    # TODO: Close database connections when database layer is implemented
    # await close_database()
    pass


# Create FastAPI application
app = FastAPI(
    title="Ocean Backend API",
    description="Backend API for Ocean - A desktop workspace organizer for links, files, and more",
    version="0.1.0",
    docs_url="/docs" if settings.dev.enable_api_docs else None,
    redoc_url="/redoc" if settings.dev.enable_api_docs else None,
    openapi_url="/openapi.json" if settings.dev.enable_openapi_schema else None,
    lifespan=lifespan,
)


# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors.origins,
    allow_credentials=settings.cors.allow_credentials,
    allow_methods=settings.cors.allow_methods,
    allow_headers=settings.cors.allow_headers,
)


# Request ID middleware
@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    """
    Middleware to add a unique request ID to each request.

    The request ID is stored in context variables for logging and
    returned in the response headers for tracing.
    """
    request_id = str(uuid.uuid4())

    # Set request context for logging
    request.state.request_id = request_id
    set_request_context(request_id=request_id)

    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        # Clear request context after request is processed
        clear_request_context()


# Request logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Middleware to log incoming requests and responses.
    """
    request_id = get_request_id(request)

    if settings.logging.requests:
        logger.info(
            "Incoming request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
                "client_host": request.client.host if request.client else None,
                "request_id": request_id,
            }
        )

    response = await call_next(request)

    if settings.logging.requests:
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "request_id": request_id,
            }
        )

    return response


# Register global exception handlers
register_exception_handlers(app, settings=settings, logger=logger)


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint.

    Returns basic API information and status.
    """
    return {
        "name": "Ocean Backend API",
        "version": "0.1.0",
        "status": "running",
        "environment": settings.server.environment,
        "docs_url": "/docs" if settings.dev.enable_api_docs else None,
    }


# Import routers
from app.api.routes import health, islands, objects, preview, google_oauth, internal_storage, thumbnails, undo

# Register routers
# Health endpoints (no /api prefix for health checks)
app.include_router(health.router, tags=["Health"])

# Islands endpoints
app.include_router(islands.router, prefix="/api/islands", tags=["Islands"])

# Objects endpoints
app.include_router(objects.router, prefix="/api", tags=["Objects"])

# Thumbnails endpoints (must be before preview router to avoid route conflicts)
app.include_router(thumbnails.router, prefix="/api/thumbnails", tags=["Thumbnails"])

# Preview endpoints
app.include_router(preview.router, prefix="/api", tags=["Preview"])

# Google OAuth and services endpoints
app.include_router(google_oauth.router, prefix="/api/google", tags=["Google"])

# Internal Storage endpoints
app.include_router(internal_storage.router, prefix="/api/internal-storage", tags=["Internal Storage"])

# Undo/Redo endpoints
app.include_router(undo.router, prefix="/api", tags=["Undo"])

# TODO: Add AI Assistant router when implemented
# from app.api.routes import assistant
# app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])


def run_server():
    """
    Run the uvicorn server.

    This function is used when running the application directly.
    """
    uvicorn.run(
        "app.main:app",
        host=settings.server.host,
        port=settings.server.port,
        reload=settings.is_development,
        log_level=settings.logging.level.lower(),
    )


if __name__ == "__main__":
    run_server()
