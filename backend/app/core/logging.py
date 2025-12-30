"""
Structured logging configuration with context tracking.

This module provides a centralized logging system with JSON formatting,
context tracking, and request correlation for the Focus backend.
"""

import logging
import sys
import json
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler
from pythonjsonlogger import jsonlogger

from .config import get_settings


# Context variables for request tracking
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
user_id_ctx: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


class ContextFilter(logging.Filter):
    """
    Logging filter that adds context information to log records.

    This filter enriches log records with request-specific context such as
    request ID, user ID, and correlation ID from context variables.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """Add context variables to the log record."""
        record.request_id = request_id_ctx.get()
        record.user_id = user_id_ctx.get()
        record.correlation_id = correlation_id_ctx.get()
        return True


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter for structured logging.

    Formats log records as JSON with consistent field names and additional
    metadata for easier parsing and analysis.
    """

    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any]
    ) -> None:
        """
        Add custom fields to the JSON log record.

        Args:
            log_record: The log record dictionary to be formatted
            record: The original logging.LogRecord object
            message_dict: Additional message dictionary
        """
        super().add_fields(log_record, record, message_dict)

        # Add timestamp in ISO format
        log_record["timestamp"] = datetime.utcnow().isoformat() + "Z"

        # Add log level
        log_record["level"] = record.levelname
        log_record["logger"] = record.name

        # Add context information
        if hasattr(record, "request_id") and record.request_id:
            log_record["request_id"] = record.request_id
        if hasattr(record, "user_id") and record.user_id:
            log_record["user_id"] = record.user_id
        if hasattr(record, "correlation_id") and record.correlation_id:
            log_record["correlation_id"] = record.correlation_id

        # Add location information
        log_record["file"] = record.filename
        log_record["function"] = record.funcName
        log_record["line"] = record.lineno

        # Add exception information if present
        if record.exc_info:
            log_record["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # Add extra fields passed via the extra parameter
        for key, value in message_dict.items():
            if key not in log_record:
                log_record[key] = value


class ColoredTextFormatter(logging.Formatter):
    """
    Colored text formatter for console output in development.

    Adds color coding to log levels for better readability in terminal.
    """

    # Color codes for different log levels
    COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record with color coding."""
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"

        # Format the message
        formatted = super().format(record)

        return formatted


def setup_logging() -> None:
    """
    Configure application logging based on settings.

    This function sets up the logging system with appropriate handlers,
    formatters, and filters based on the configuration settings.
    """
    settings = get_settings()

    # Avoid raising logging exceptions in production paths.
    logging.raiseExceptions = False

    # Patch LogRecord factory to strip reserved keys from extra to avoid
    # "Attempt to overwrite 'name' in LogRecord" errors.
    if not getattr(logging, "_safe_logrecord_factory_patched", False):
        base_factory = logging.getLogRecordFactory()
        reserved = set(logging.LogRecord(None, None, "", 0, "", None, None).__dict__.keys())

        def safe_factory(*args, **kwargs):
            extra = kwargs.get("extra")
            if extra:
                kwargs["extra"] = {k: v for k, v in extra.items() if k not in reserved}
            record = base_factory(*args, **kwargs)
            return record

        logging.setLogRecordFactory(safe_factory)
        logging._safe_logrecord_factory_patched = True

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.logging.level)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Add context filter to all handlers
    context_filter = ContextFilter()

    # Configure formatters based on log format setting
    if settings.logging.format == "json":
        formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s"
        )
    else:
        if settings.is_development:
            # Use colored formatter for development
            formatter = ColoredTextFormatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
        else:
            # Use plain formatter for production text logs
            formatter = logging.Formatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )

    # Console handler
    if settings.logging.output in ["console", "both"]:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(settings.logging.level)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(context_filter)
        root_logger.addHandler(console_handler)

    # File handler
    if settings.logging.output in ["file", "both"]:
        log_path = Path(settings.logging.file_path)

        if settings.logging.file_rotation:
            # Use rotating file handler
            file_handler = RotatingFileHandler(
                filename=log_path,
                maxBytes=settings.logging.file_max_size_mb * 1024 * 1024,
                backupCount=settings.logging.file_backup_count,
                encoding="utf-8",
            )
        else:
            # Use regular file handler
            file_handler = logging.FileHandler(
                filename=log_path,
                encoding="utf-8",
            )

        file_handler.setLevel(settings.logging.level)
        file_handler.setFormatter(formatter)
        file_handler.addFilter(context_filter)
        root_logger.addHandler(file_handler)

    # Set specific log levels for third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)

    # Only show SQL queries if database echo is enabled
    if settings.database.echo:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
    else:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.

    Args:
        name: The name of the logger (typically __name__)

    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)


class LogContext:
    """
    Context manager for adding contextual information to logs.

    Usage:
        with LogContext(request_id="abc123", user_id="user456"):
            logger.info("Processing request")
    """

    def __init__(
        self,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ):
        """
        Initialize the log context.

        Args:
            request_id: Request identifier
            user_id: User identifier
            correlation_id: Correlation identifier for distributed tracing
        """
        self.request_id = request_id
        self.user_id = user_id
        self.correlation_id = correlation_id

        # Store previous values for restoration
        self.prev_request_id: Optional[str] = None
        self.prev_user_id: Optional[str] = None
        self.prev_correlation_id: Optional[str] = None

    def __enter__(self):
        """Enter the context and set context variables."""
        self.prev_request_id = request_id_ctx.get()
        self.prev_user_id = user_id_ctx.get()
        self.prev_correlation_id = correlation_id_ctx.get()

        if self.request_id is not None:
            request_id_ctx.set(self.request_id)
        if self.user_id is not None:
            user_id_ctx.set(self.user_id)
        if self.correlation_id is not None:
            correlation_id_ctx.set(self.correlation_id)

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context and restore previous context variables."""
        request_id_ctx.set(self.prev_request_id)
        user_id_ctx.set(self.prev_user_id)
        correlation_id_ctx.set(self.prev_correlation_id)


def set_request_context(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> None:
    """
    Set request context variables for logging.

    This is useful when you don't want to use the context manager.

    Args:
        request_id: Request identifier
        user_id: User identifier
        correlation_id: Correlation identifier
    """
    if request_id is not None:
        request_id_ctx.set(request_id)
    if user_id is not None:
        user_id_ctx.set(user_id)
    if correlation_id is not None:
        correlation_id_ctx.set(correlation_id)


def clear_request_context() -> None:
    """Clear all request context variables."""
    request_id_ctx.set(None)
    user_id_ctx.set(None)
    correlation_id_ctx.set(None)


def log_with_context(
    logger: logging.Logger,
    level: str,
    message: str,
    **kwargs: Any
) -> None:
    """
    Log a message with additional context data.

    Args:
        logger: Logger instance
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        message: Log message
        **kwargs: Additional context data to include in the log
    """
    log_method = getattr(logger, level.lower())
    log_method(message, extra=kwargs)


# Convenience functions for structured logging
def log_debug(logger: logging.Logger, message: str, **kwargs: Any) -> None:
    """Log a debug message with context."""
    log_with_context(logger, "DEBUG", message, **kwargs)


def log_info(logger: logging.Logger, message: str, **kwargs: Any) -> None:
    """Log an info message with context."""
    log_with_context(logger, "INFO", message, **kwargs)


def log_warning(logger: logging.Logger, message: str, **kwargs: Any) -> None:
    """Log a warning message with context."""
    log_with_context(logger, "WARNING", message, **kwargs)


def log_error(logger: logging.Logger, message: str, **kwargs: Any) -> None:
    """Log an error message with context."""
    log_with_context(logger, "ERROR", message, **kwargs)


def log_critical(logger: logging.Logger, message: str, **kwargs: Any) -> None:
    """Log a critical message with context."""
    log_with_context(logger, "CRITICAL", message, **kwargs)


def log_exception(
    logger: logging.Logger,
    message: str,
    exc_info: bool = True,
    **kwargs: Any
) -> None:
    """
    Log an exception with full traceback and context.

    Args:
        logger: Logger instance
        message: Log message
        exc_info: Whether to include exception info (default: True)
        **kwargs: Additional context data
    """
    logger.error(message, exc_info=exc_info, extra=kwargs)


# Example usage function (for documentation purposes)
def _example_usage():
    """
    Example usage of the logging system.

    This function demonstrates various logging patterns and is not called
    during normal operation. It's here for documentation purposes.
    """
    # Get a logger
    logger = get_logger(__name__)

    # Simple logging
    logger.info("Application started")

    # Logging with context manager
    with LogContext(request_id="req-123", user_id="user-456"):
        logger.info("Processing request")
        logger.warning("Something might be wrong")

    # Logging with extra context data
    log_info(
        logger,
        "User action performed",
        action="create_space",
        space_name="My Space",
        object_count=5
    )

    # Logging exceptions
    try:
        raise ValueError("Something went wrong")
    except ValueError:
        log_exception(logger, "Failed to process request", operation="create_space")

    # Manual context setting (without context manager)
    set_request_context(request_id="req-789")
    logger.info("Another request")
    clear_request_context()
