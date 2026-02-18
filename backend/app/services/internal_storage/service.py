"""
Internal Storage Service

Provides helpers for working with the app's internal storage area. Currently
supports opening the storage directory in the user's native file manager.
"""

from pathlib import Path
import os
import platform
import subprocess

from app.core.config import get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)


class InternalStorageError(Exception):
    """Raised when an internal storage operation fails."""


class InternalStorageService:
    """Service responsible for internal storage actions."""

    def __init__(self, base_path: str) -> None:
        self.base_path = Path(base_path).resolve()

    async def open_file_manager(self) -> None:
        """
        Open the internal storage directory in the native file manager.

        Raises:
            InternalStorageError: if the directory cannot be opened.
        """
        path = self.base_path
        try:
            path.mkdir(parents=True, exist_ok=True)

            system = platform.system()
            if system == "Windows":
                os.startfile(path)  # type: ignore[attr-defined]
            elif system == "Darwin":
                subprocess.Popen(["open", str(path)])
            else:
                subprocess.Popen(["xdg-open", str(path)])

            logger.info("Opened internal storage in file manager", extra={"path": str(path)})
        except Exception as exc:
            logger.error("Failed to open internal storage directory", exc_info=True, extra={"path": str(path)})
            raise InternalStorageError("Failed to open internal storage directory") from exc


settings = get_settings()
internal_storage_service = InternalStorageService(str(settings.storage.storage_path))
