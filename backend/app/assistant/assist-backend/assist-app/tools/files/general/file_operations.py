"""
File operations tool for reading, writing, and modifying files.

Provides safe file manipulation with proper error handling and validation.
"""

import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class FileOperationsTool:
    """Tool for performing file operations like read, write, copy, move, delete."""

    def __init__(self):
        """Initialize the file operations tool."""
        self.max_file_size = 10 * 1024 * 1024  # 10 MB limit for reading
        self.allowed_extensions = None  # None means all extensions allowed

    async def read_file(
        self,
        file_path: str,
        encoding: str = 'utf-8',
        max_lines: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Read contents of a text file.

        Args:
            file_path: Path to the file to read
            encoding: File encoding (default: utf-8)
            max_lines: Maximum number of lines to read (None = all)

        Returns:
            Dictionary with file content and metadata
        """
        try:
            path = Path(file_path).resolve()

            # Validate file exists
            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            # Validate it's a file (not directory)
            if not path.is_file():
                return {
                    "success": False,
                    "error": f"Path is not a file: {file_path}"
                }

            # Check file size
            file_size = path.stat().st_size
            if file_size > self.max_file_size:
                return {
                    "success": False,
                    "error": f"File too large ({file_size} bytes). Max size: {self.max_file_size} bytes"
                }

            # Read file content
            try:
                with open(path, 'r', encoding=encoding) as f:
                    if max_lines:
                        lines = []
                        for i, line in enumerate(f):
                            if i >= max_lines:
                                break
                            lines.append(line.rstrip('\n\r'))
                        content = '\n'.join(lines)
                        truncated = True
                    else:
                        content = f.read()
                        truncated = False

                return {
                    "success": True,
                    "path": str(path),
                    "content": content,
                    "size": file_size,
                    "encoding": encoding,
                    "truncated": truncated,
                    "lines_read": max_lines if truncated else None,
                    "modified": datetime.fromtimestamp(path.stat().st_mtime).isoformat()
                }

            except UnicodeDecodeError:
                return {
                    "success": False,
                    "error": f"Cannot decode file with encoding '{encoding}'. File may be binary."
                }

        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def write_file(
        self,
        file_path: str,
        content: str,
        encoding: str = 'utf-8',
        create_dirs: bool = True,
        backup: bool = True
    ) -> Dict[str, Any]:
        """
        Write content to a file.

        Args:
            file_path: Path where file should be written
            content: Content to write
            encoding: File encoding (default: utf-8)
            create_dirs: Create parent directories if they don't exist
            backup: Create backup of existing file before overwriting

        Returns:
            Dictionary with operation result
        """
        try:
            path = Path(file_path).resolve()

            # Create parent directories if needed
            if create_dirs and not path.parent.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created directory: {path.parent}")

            # Create backup if file exists
            backup_path = None
            if backup and path.exists():
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = path.with_suffix(f"{path.suffix}.backup_{timestamp}")
                shutil.copy2(path, backup_path)
                logger.info(f"Created backup: {backup_path}")

            # Write content
            with open(path, 'w', encoding=encoding) as f:
                f.write(content)

            return {
                "success": True,
                "path": str(path),
                "size": len(content),
                "encoding": encoding,
                "backup_created": backup_path is not None,
                "backup_path": str(backup_path) if backup_path else None,
                "message": f"Successfully wrote {len(content)} characters to {path.name}"
            }

        except Exception as e:
            logger.error(f"Error writing file {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def append_to_file(
        self,
        file_path: str,
        content: str,
        encoding: str = 'utf-8',
        create_if_missing: bool = True
    ) -> Dict[str, Any]:
        """
        Append content to end of file.

        Args:
            file_path: Path to the file
            content: Content to append
            encoding: File encoding
            create_if_missing: Create file if it doesn't exist

        Returns:
            Dictionary with operation result
        """
        try:
            path = Path(file_path).resolve()

            # Check if file exists
            if not path.exists() and not create_if_missing:
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            # Append content
            with open(path, 'a', encoding=encoding) as f:
                f.write(content)

            return {
                "success": True,
                "path": str(path),
                "appended_size": len(content),
                "message": f"Successfully appended {len(content)} characters"
            }

        except Exception as e:
            logger.error(f"Error appending to file {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def copy_file(
        self,
        source: str,
        destination: str,
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """
        Copy a file to a new location.

        Args:
            source: Source file path
            destination: Destination file path
            overwrite: Whether to overwrite if destination exists

        Returns:
            Dictionary with operation result
        """
        try:
            src_path = Path(source).resolve()
            dst_path = Path(destination).resolve()

            # Validate source exists
            if not src_path.exists():
                return {
                    "success": False,
                    "error": f"Source file not found: {source}"
                }

            # Validate source is a file
            if not src_path.is_file():
                return {
                    "success": False,
                    "error": f"Source is not a file: {source}"
                }

            # Check if destination exists
            if dst_path.exists() and not overwrite:
                return {
                    "success": False,
                    "error": f"Destination already exists: {destination}. Use overwrite=True to replace."
                }

            # Create destination directory if needed
            dst_path.parent.mkdir(parents=True, exist_ok=True)

            # Copy file
            shutil.copy2(src_path, dst_path)

            return {
                "success": True,
                "source": str(src_path),
                "destination": str(dst_path),
                "size": dst_path.stat().st_size,
                "message": f"Successfully copied {src_path.name} to {dst_path}"
            }

        except Exception as e:
            logger.error(f"Error copying file {source} to {destination}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def move_file(
        self,
        source: str,
        destination: str,
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """
        Move/rename a file.

        Args:
            source: Source file path
            destination: Destination file path
            overwrite: Whether to overwrite if destination exists

        Returns:
            Dictionary with operation result
        """
        try:
            src_path = Path(source).resolve()
            dst_path = Path(destination).resolve()

            # Validate source exists
            if not src_path.exists():
                return {
                    "success": False,
                    "error": f"Source file not found: {source}"
                }

            # Check if destination exists
            if dst_path.exists() and not overwrite:
                return {
                    "success": False,
                    "error": f"Destination already exists: {destination}"
                }

            # Create destination directory if needed
            dst_path.parent.mkdir(parents=True, exist_ok=True)

            # Move file
            shutil.move(str(src_path), str(dst_path))

            return {
                "success": True,
                "source": str(src_path),
                "destination": str(dst_path),
                "message": f"Successfully moved {src_path.name} to {dst_path}"
            }

        except Exception as e:
            logger.error(f"Error moving file {source} to {destination}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_file(
        self,
        file_path: str,
        confirm: bool = False
    ) -> Dict[str, Any]:
        """
        Delete a file.

        Args:
            file_path: Path to file to delete
            confirm: Must be True to actually delete (safety check)

        Returns:
            Dictionary with operation result
        """
        if not confirm:
            return {
                "success": False,
                "error": "Deletion requires explicit confirmation. Set confirm=True"
            }

        try:
            path = Path(file_path).resolve()

            # Validate file exists
            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            # Validate it's a file
            if not path.is_file():
                return {
                    "success": False,
                    "error": f"Path is not a file: {file_path}"
                }

            # Delete file
            path.unlink()

            return {
                "success": True,
                "path": str(path),
                "message": f"Successfully deleted {path.name}"
            }

        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def get_file_info(
        self,
        file_path: str
    ) -> Dict[str, Any]:
        """
        Get detailed information about a file.

        Args:
            file_path: Path to the file

        Returns:
            Dictionary with file information
        """
        try:
            path = Path(file_path).resolve()

            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            stat = path.stat()

            return {
                "success": True,
                "path": str(path),
                "name": path.name,
                "extension": path.suffix,
                "size": stat.st_size,
                "size_human": self._format_size(stat.st_size),
                "is_file": path.is_file(),
                "is_directory": path.is_dir(),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "accessed": datetime.fromtimestamp(stat.st_atime).isoformat(),
                "permissions": oct(stat.st_mode)[-3:],
                "parent": str(path.parent)
            }

        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} PB"


# Singleton instance
file_operations_tool = FileOperationsTool()
