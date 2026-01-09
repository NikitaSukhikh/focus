"""
File search tool for finding files and directories on the system.

Provides functionality to search for files by name, extension, or content
with various filtering options.
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
import fnmatch
import logging

logger = logging.getLogger(__name__)


class FileSearchTool:
    """Tool for searching files and directories on the local system."""

    def __init__(self):
        """Initialize the file search tool."""
        self.max_results = 100  # Safety limit to prevent overwhelming results
        self.max_depth = 10  # Maximum directory depth for recursive search

    async def search_by_name(
        self,
        query: str,
        search_paths: Optional[List[str]] = None,
        case_sensitive: bool = False,
        exact_match: bool = False,
        file_type: Optional[str] = None,
        max_results: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Search for files by name or partial name.

        Args:
            query: Search query (filename or pattern)
            search_paths: List of directories to search in (defaults to common user directories)
            case_sensitive: Whether search should be case-sensitive
            exact_match: If True, only exact filename matches are returned
            file_type: Filter by file type ('file', 'directory', or None for both)
            max_results: Maximum number of results to return

        Returns:
            Dictionary containing search results and metadata
        """
        results = []
        max_results = max_results or self.max_results

        # Default search paths if none provided
        if not search_paths:
            search_paths = self._get_default_search_paths()

        logger.info(f"Searching for '{query}' in {len(search_paths)} path(s)")

        try:
            # Prepare search pattern
            if exact_match:
                pattern = query
            else:
                # Support wildcards
                if '*' in query or '?' in query:
                    pattern = query
                else:
                    # Add wildcards for partial matching
                    pattern = f"*{query}*"

            # Search in each path
            for search_path in search_paths:
                if len(results) >= max_results:
                    break

                try:
                    path_obj = Path(search_path)
                    if not path_obj.exists():
                        logger.warning(f"Search path does not exist: {search_path}")
                        continue

                    # Recursive search with depth limit
                    found = self._search_in_directory(
                        path_obj,
                        pattern,
                        case_sensitive,
                        file_type,
                        max_results - len(results),
                        current_depth=0
                    )
                    results.extend(found)

                except PermissionError:
                    logger.warning(f"Permission denied for path: {search_path}")
                except Exception as e:
                    logger.error(f"Error searching in {search_path}: {e}")

            # Format results
            formatted_results = self._format_results(results)

            return {
                "success": True,
                "query": query,
                "total_found": len(results),
                "results": formatted_results,
                "truncated": len(results) >= max_results,
                "search_paths": search_paths
            }

        except Exception as e:
            logger.error(f"File search error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "results": []
            }

    def _search_in_directory(
        self,
        directory: Path,
        pattern: str,
        case_sensitive: bool,
        file_type: Optional[str],
        max_results: int,
        current_depth: int
    ) -> List[Path]:
        """
        Recursively search for files in a directory.

        Args:
            directory: Directory to search in
            pattern: Search pattern (supports wildcards)
            case_sensitive: Whether to match case
            file_type: Filter by type ('file', 'directory', or None)
            max_results: Maximum results to return
            current_depth: Current recursion depth

        Returns:
            List of matching file paths
        """
        results = []

        # Depth limit check
        if current_depth > self.max_depth:
            return results

        try:
            # Iterate through directory contents
            for item in directory.iterdir():
                if len(results) >= max_results:
                    break

                try:
                    # Check if item matches pattern
                    item_name = item.name
                    if not case_sensitive:
                        match = fnmatch.fnmatch(item_name.lower(), pattern.lower())
                    else:
                        match = fnmatch.fnmatch(item_name, pattern)

                    # Check file type filter
                    type_match = True
                    if file_type == 'file':
                        type_match = item.is_file()
                    elif file_type == 'directory':
                        type_match = item.is_dir()

                    # Add to results if matches
                    if match and type_match:
                        results.append(item)

                    # Recurse into subdirectories
                    if item.is_dir() and len(results) < max_results:
                        # Skip common system/hidden directories
                        if not self._should_skip_directory(item):
                            sub_results = self._search_in_directory(
                                item,
                                pattern,
                                case_sensitive,
                                file_type,
                                max_results - len(results),
                                current_depth + 1
                            )
                            results.extend(sub_results)

                except PermissionError:
                    # Skip files/folders we don't have permission to access
                    continue
                except Exception as e:
                    logger.debug(f"Error processing {item}: {e}")
                    continue

        except PermissionError:
            pass
        except Exception as e:
            logger.debug(f"Error reading directory {directory}: {e}")

        return results

    def _should_skip_directory(self, directory: Path) -> bool:
        """
        Check if a directory should be skipped during search.

        Args:
            directory: Directory path to check

        Returns:
            True if directory should be skipped
        """
        skip_patterns = [
            r'^\.',  # Hidden directories (e.g., .git, .vscode)
            r'^__pycache__$',
            r'^node_modules$',
            r'^\.git$',
            r'^\.venv$',
            r'^venv$',
            r'^env$',
            r'^\$RECYCLE\.BIN$',
            r'^System Volume Information$',
            r'^Windows$',
            r'^Program Files',
            r'^AppData$',
        ]

        dir_name = directory.name
        for pattern in skip_patterns:
            if re.match(pattern, dir_name, re.IGNORECASE):
                return True

        return False

    def _get_default_search_paths(self) -> List[str]:
        """
        Get default search paths based on the operating system.

        Returns:
            List of default search paths
        """
        home = Path.home()
        paths = [str(home)]

        # Add common user directories
        common_dirs = [
            "Documents",
            "Downloads",
            "Desktop",
            "Pictures",
            "Videos",
            "Music"
        ]

        for dir_name in common_dirs:
            dir_path = home / dir_name
            if dir_path.exists():
                paths.append(str(dir_path))

        return paths

    def _format_results(self, results: List[Path]) -> List[Dict[str, Any]]:
        """
        Format search results into a structured format.

        Args:
            results: List of Path objects

        Returns:
            List of formatted result dictionaries
        """
        formatted = []

        for path in results:
            try:
                stat = path.stat()

                result = {
                    "path": str(path.absolute()),
                    "name": path.name,
                    "type": "directory" if path.is_dir() else "file",
                    "size": stat.st_size if path.is_file() else None,
                    "size_human": self._format_size(stat.st_size) if path.is_file() else None,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "extension": path.suffix if path.is_file() else None,
                    "parent": str(path.parent),
                }

                formatted.append(result)

            except Exception as e:
                logger.debug(f"Error formatting result {path}: {e}")
                # Include basic info even if stat fails
                formatted.append({
                    "path": str(path.absolute()),
                    "name": path.name,
                    "type": "directory" if path.is_dir() else "file",
                    "error": str(e)
                })

        return formatted

    def _format_size(self, size_bytes: int) -> str:
        """
        Format file size in human-readable format.

        Args:
            size_bytes: Size in bytes

        Returns:
            Formatted size string
        """
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} PB"

    async def search_by_extension(
        self,
        extension: str,
        search_paths: Optional[List[str]] = None,
        max_results: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Search for files by extension.

        Args:
            extension: File extension to search for (with or without dot)
            search_paths: List of directories to search in
            max_results: Maximum number of results

        Returns:
            Dictionary containing search results
        """
        # Normalize extension
        if not extension.startswith('.'):
            extension = f'.{extension}'

        # Use name search with extension pattern
        pattern = f"*{extension}"

        return await self.search_by_name(
            query=pattern,
            search_paths=search_paths,
            case_sensitive=False,
            exact_match=False,
            file_type='file',
            max_results=max_results
        )

    async def search_recent_files(
        self,
        search_paths: Optional[List[str]] = None,
        hours: int = 24,
        max_results: Optional[int] = 50
    ) -> Dict[str, Any]:
        """
        Search for recently modified files.

        Args:
            search_paths: List of directories to search in
            hours: Files modified within this many hours
            max_results: Maximum number of results

        Returns:
            Dictionary containing search results
        """
        if not search_paths:
            search_paths = self._get_default_search_paths()

        max_results = max_results or 50
        results = []
        cutoff_time = datetime.now().timestamp() - (hours * 3600)

        logger.info(f"Searching for files modified in last {hours} hours")

        try:
            for search_path in search_paths:
                if len(results) >= max_results:
                    break

                try:
                    path_obj = Path(search_path)
                    if not path_obj.exists():
                        continue

                    # Find recent files
                    found = self._find_recent_files(
                        path_obj,
                        cutoff_time,
                        max_results - len(results),
                        current_depth=0
                    )
                    results.extend(found)

                except Exception as e:
                    logger.error(f"Error searching in {search_path}: {e}")

            # Sort by modification time (newest first)
            results.sort(key=lambda p: p.stat().st_mtime, reverse=True)

            # Format results
            formatted_results = self._format_results(results)

            return {
                "success": True,
                "hours": hours,
                "total_found": len(results),
                "results": formatted_results,
                "truncated": len(results) >= max_results,
                "search_paths": search_paths
            }

        except Exception as e:
            logger.error(f"Recent files search error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "results": []
            }

    def _find_recent_files(
        self,
        directory: Path,
        cutoff_time: float,
        max_results: int,
        current_depth: int
    ) -> List[Path]:
        """Find files modified after cutoff_time."""
        results = []

        if current_depth > self.max_depth:
            return results

        try:
            for item in directory.iterdir():
                if len(results) >= max_results:
                    break

                try:
                    # Check if file was modified recently
                    if item.is_file():
                        mtime = item.stat().st_mtime
                        if mtime >= cutoff_time:
                            results.append(item)

                    # Recurse into directories
                    elif item.is_dir() and not self._should_skip_directory(item):
                        sub_results = self._find_recent_files(
                            item,
                            cutoff_time,
                            max_results - len(results),
                            current_depth + 1
                        )
                        results.extend(sub_results)

                except (PermissionError, OSError):
                    continue

        except (PermissionError, OSError):
            pass

        return results


# Singleton instance
file_search_tool = FileSearchTool()
