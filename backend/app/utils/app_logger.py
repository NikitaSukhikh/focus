"""
Enhanced Application Logger for Production Release

This module provides application-specific logging utilities for tracking
installation, startup, runtime events, and errors in production.
"""

import logging
from pathlib import Path
from typing import Any
from datetime import datetime
import sys

from app.core.logging import get_logger, log_with_context
from app.core.config import get_settings


class AppLogger:
    """
    Enhanced logger for tracking application lifecycle events.

    Logs installation, startup, database operations, space creation,
    link additions, and other critical operations to help diagnose
    issues in production.
    """

    def __init__(self, name: str = "app"):
        self.logger = get_logger(f"app.{name}")
        self.settings = get_settings()

    def log_startup(self, **kwargs: Any) -> None:
        """Log application startup with environment info."""
        startup_info = {
            "event": "app_startup",
            "environment": self.settings.server.environment,
            "python_version": sys.version,
            "platform": sys.platform,
            "is_frozen": getattr(sys, 'frozen', False),
            "database_path": self.settings.database.path,
            "log_level": self.settings.logging.level,
            **kwargs
        }
        log_with_context(self.logger, "INFO", "Application starting", **startup_info)

    def log_installation(self, status: str, **kwargs: Any) -> None:
        """Log installation/initialization events."""
        install_info = {
            "event": "installation",
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs
        }
        log_with_context(self.logger, "INFO", f"Installation {status}", **install_info)

    def log_database_init(self, status: str, **kwargs: Any) -> None:
        """Log database initialization events."""
        db_info = {
            "event": "database_init",
            "status": status,
            "database_url": self.settings.database.url,
            **kwargs
        }

        level = "ERROR" if status == "failed" else "INFO"
        log_with_context(self.logger, level, f"Database initialization {status}", **db_info)

    def log_space_operation(
        self,
        operation: str,
        space_id: str | None = None,
        space_name: str | None = None,
        status: str = "success",
        **kwargs: Any
    ) -> None:
        """Log space-related operations (create, delete, update)."""
        space_info = {
            "event": "space_operation",
            "operation": operation,
            "status": status,
            "space_id": space_id,
            "space_name": space_name,
            **kwargs
        }

        level = "INFO" if status == "success" else "ERROR"
        message = f"Space {operation} {status}"
        if space_name:
            message += f": {space_name}"

        log_with_context(self.logger, level, message, **space_info)

    def log_object_operation(
        self,
        operation: str,
        object_id: str | None = None,
        object_type: str | None = None,
        status: str = "success",
        **kwargs: Any
    ) -> None:
        """Log object-related operations (add link, add file, delete, etc)."""
        object_info = {
            "event": "object_operation",
            "operation": operation,
            "status": status,
            "object_id": object_id,
            "object_type": object_type,
            **kwargs
        }

        level = "INFO" if status == "success" else "ERROR"
        message = f"Object {operation} {status}"
        if object_type:
            message += f" ({object_type})"

        log_with_context(self.logger, level, message, **object_info)

    def log_storage_operation(
        self,
        operation: str,
        path: str | None = None,
        status: str = "success",
        **kwargs: Any
    ) -> None:
        """Log storage/file system operations."""
        storage_info = {
            "event": "storage_operation",
            "operation": operation,
            "status": status,
            "path": path,
            **kwargs
        }

        level = "INFO" if status == "success" else "ERROR"
        log_with_context(self.logger, level, f"Storage {operation} {status}", **storage_info)

    def log_error(
        self,
        error_type: str,
        error_message: str,
        exc_info: bool = True,
        **kwargs: Any
    ) -> None:
        """Log application errors with context."""
        error_info = {
            "event": "error",
            "error_type": error_type,
            "error_message": error_message,
            **kwargs
        }

        self.logger.error(
            f"Error occurred: {error_type}",
            exc_info=exc_info,
            extra=error_info
        )

    def log_warning(self, message: str, **kwargs: Any) -> None:
        """Log warnings with context."""
        warning_info = {
            "event": "warning",
            **kwargs
        }
        log_with_context(self.logger, "WARNING", message, **warning_info)

    def log_performance(
        self,
        operation: str,
        duration_ms: float,
        **kwargs: Any
    ) -> None:
        """Log performance metrics."""
        perf_info = {
            "event": "performance",
            "operation": operation,
            "duration_ms": duration_ms,
            **kwargs
        }
        log_with_context(self.logger, "INFO", f"Performance: {operation}", **perf_info)


# Global app logger instance
_app_logger: AppLogger | None = None


def get_app_logger(name: str = "app") -> AppLogger:
    """Get or create the global app logger instance."""
    global _app_logger
    if _app_logger is None:
        _app_logger = AppLogger(name)
    return _app_logger
