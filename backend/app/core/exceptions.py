"""
Application-specific exception types and FastAPI exception handlers.

The classes below carry status codes, error codes, and log levels so that
global handlers can produce structured responses and log with the right
severity. Helper functions at the bottom register those handlers on the app.
"""

from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_ctx


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        error_code: str = "app_error",
        details: Any | None = None,
        headers: dict[str, str] | None = None,
        log_level: str = "warning",
    ) -> None:
        super().__init__(message)
        self.user_message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details
        self.headers = headers or {}
        self.log_level = log_level


class BadRequestError(AppError):
    """Raised for malformed or invalid client input."""

    def __init__(self, message: str, *, error_code: str = "bad_request", details: Any | None = None):
        super().__init__(message, status_code=400, error_code=error_code, details=details, log_level="warning")


class ValidationAppError(AppError):
    """Raised for validation failures."""

    def __init__(self, message: str, *, details: Any | None = None):
        super().__init__(message, status_code=422, error_code="validation_error", details=details, log_level="warning")


class NotFoundError(AppError):
    """Raised when a resource cannot be found."""

    def __init__(self, message: str, *, error_code: str = "not_found", details: Any | None = None):
        super().__init__(message, status_code=404, error_code=error_code, details=details, log_level="warning")


class ConflictError(AppError):
    """Raised when a request conflicts with the current state."""

    def __init__(self, message: str, *, error_code: str = "conflict", details: Any | None = None):
        super().__init__(message, status_code=409, error_code=error_code, details=details, log_level="warning")


class UnauthorizedError(AppError):
    """Raised when authentication is required or invalid."""

    def __init__(self, message: str = "Authentication required", *, error_code: str = "unauthorized"):
        super().__init__(message, status_code=401, error_code=error_code, log_level="warning")


class ForbiddenError(AppError):
    """Raised when a user lacks permission to perform an action."""

    def __init__(self, message: str = "Not allowed to perform this action", *, error_code: str = "forbidden"):
        super().__init__(message, status_code=403, error_code=error_code, log_level="warning")


class ServiceUnavailableError(AppError):
    """Raised when a downstream dependency is unavailable."""

    def __init__(
        self,
        message: str = "Service temporarily unavailable. Please try again later.",
        *,
        error_code: str = "service_unavailable",
        details: Any | None = None,
    ):
        super().__init__(
            message,
            status_code=503,
            error_code=error_code,
            details=details,
            log_level="error",
        )


# ============================================================================#
# Exception handling utilities
# ============================================================================#

def get_request_id(request: Request) -> str | None:
    """Fetch the request ID from state or context vars."""
    return getattr(request.state, "request_id", None) or request_id_ctx.get()


def _error_response(
    request: Request,
    settings,
    *,
    status_code: int,
    message: str,
    error_code: str,
    details: dict | list | str | None = None,
    headers: dict | None = None,
):
    """Build a consistent error response payload with request correlation."""
    request_id = get_request_id(request)
    error_body = {
        "code": error_code,
        "message": message,
    }

    if details is not None and settings.is_development:
        error_body["details"] = details

    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_body,
            "request_id": request_id,
        },
        headers=headers or {},
    )


def register_exception_handlers(app: FastAPI, *, settings, logger) -> None:
    """
    Attach global exception handlers to the FastAPI app.

    Handlers log with context and return user-friendly error payloads.
    """

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        """Handle application-level errors raised intentionally in the codebase."""
        log_method = getattr(logger, exc.log_level, logger.error)
        log_method(
            "Application error",
            exc_info=bool(exc.__cause__),
            extra={
                "error_code": exc.error_code,
                "status_code": exc.status_code,
                "path": request.url.path,
                "method": request.method,
                "request_id": get_request_id(request),
                "details": exc.details,
            }
        )

        return _error_response(
            request,
            settings,
            status_code=exc.status_code,
            message=exc.user_message,
            error_code=exc.error_code,
            details=exc.details,
            headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Handle HTTP exceptions raised by FastAPI/Starlette."""
        log_level = "warning" if exc.status_code < 500 else "error"
        log_method = getattr(logger, log_level, logger.error)
        log_method(
            "HTTP exception",
            extra={
                "status_code": exc.status_code,
                "detail": exc.detail,
                "path": request.url.path,
                "method": request.method,
                "request_id": get_request_id(request),
            }
        )

        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        details = None if isinstance(exc.detail, str) else exc.detail

        return _error_response(
            request,
            settings,
            status_code=exc.status_code,
            message=message,
            error_code="http_error",
            details=details,
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle request validation errors from FastAPI/Pydantic."""
        logger.warning(
            "Request validation error",
            extra={
                "path": request.url.path,
                "method": request.method,
                "errors": exc.errors(),
                "request_id": get_request_id(request),
            }
        )

        return _error_response(
            request,
            settings,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Request validation failed.",
            error_code="validation_error",
            details=exc.errors(),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Catch-all handler for uncaught exceptions."""
        logger.error(
            "Unhandled exception",
            exc_info=True,
            extra={
                "path": request.url.path,
                "method": request.method,
                "exception_type": type(exc).__name__,
                "request_id": get_request_id(request),
            }
        )

        return _error_response(
            request,
            settings,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Something went wrong while processing your request. Please try again or contact support with the request ID.",
            error_code="internal_error",
            details={"exception": str(exc)} if settings.is_development else None,
        )
