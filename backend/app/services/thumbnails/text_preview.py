"""
Text Preview Service

Handles text file preview generation with lazy loading support.
Extracts text content from files for preview display.
"""

from pathlib import Path
import chardet

from app.core.config import get_settings
from app.core.logging import get_logger


logger = get_logger(__name__)
settings = get_settings()


class TextPreviewService:
    """
    Service for generating text previews from files.

    Supports lazy loading for large text files.
    """

    # Configuration
    PREVIEW_CHUNK_SIZE = 1024 * 100  # 100KB chunks for lazy loading
    MAX_FILE_SIZE_FOR_FULL_LOAD = 1024 * 1024 * 5  # 5MB
    ENCODING_CONFIDENCE_THRESHOLD = 0.7

    def __init__(self):
        """Initialize the text preview service."""
        self.settings = settings

    def get_text_preview(
        self,
        file_path: str,
        max_lines: int | None = None,
        offset: int = 0
    ) -> tuple[str, bool]:
        """
        Get text preview from a file with lazy loading support.

        Args:
            file_path: Path to the text file
            max_lines: Maximum number of lines to return (None for all)
            offset: Line offset for pagination

        Returns:
            tuple[str, bool]: (preview_text, has_more)
                - preview_text: The extracted text
                - has_more: Whether there are more lines available

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not readable
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        # Detect encoding
        encoding = self._detect_encoding(path)

        # Get file size
        file_size = path.stat().st_size

        # Use appropriate method based on file size
        if file_size > self.MAX_FILE_SIZE_FOR_FULL_LOAD:
            return self._get_chunked_preview(path, encoding, max_lines, offset)
        else:
            return self._get_full_preview(path, encoding, max_lines, offset)

    def _get_full_preview(
        self,
        path: Path,
        encoding: str,
        max_lines: int | None,
        offset: int
    ) -> tuple[str, bool]:
        """
        Load entire file and return preview.

        Args:
            path: Path object
            encoding: File encoding
            max_lines: Maximum lines to return
            offset: Line offset

        Returns:
            tuple[str, bool]: (preview_text, has_more)
        """
        try:
            # Read entire file
            with open(path, 'r', encoding=encoding, errors='replace') as f:
                lines = f.readlines()

            total_lines = len(lines)

            # Apply offset
            if offset > 0:
                lines = lines[offset:]

            # Apply limit
            has_more = False
            if max_lines and len(lines) > max_lines:
                lines = lines[:max_lines]
                has_more = (offset + max_lines) < total_lines

            preview_text = ''.join(lines)

            logger.debug(
                f"Generated full text preview: {len(lines)} lines",
                extra={
                    "file": str(path),
                    "total_lines": total_lines,
                    "encoding": encoding
                }
            )

            return preview_text, has_more

        except Exception as e:
            logger.error(f"Error reading text file: {e}", exc_info=True)
            raise ValueError(f"Failed to read text file: {e}")

    def _get_chunked_preview(
        self,
        path: Path,
        encoding: str,
        max_lines: int | None,
        offset: int
    ) -> tuple[str, bool]:
        """
        Load file in chunks for large files (lazy loading).

        Args:
            path: Path object
            encoding: File encoding
            max_lines: Maximum lines to return
            offset: Line offset

        Returns:
            tuple[str, bool]: (preview_text, has_more)
        """
        try:
            lines = []
            current_line = 0
            target_lines = max_lines if max_lines else float('inf')

            with open(path, 'r', encoding=encoding, errors='replace') as f:
                # Skip offset lines
                for _ in range(offset):
                    if f.readline() == '':
                        break
                    current_line += 1

                # Read target lines
                while len(lines) < target_lines:
                    line = f.readline()
                    if not line:
                        break
                    lines.append(line)

                # Check if there are more lines
                has_more = f.readline() != ''

            preview_text = ''.join(lines)

            logger.debug(
                f"Generated chunked text preview: {len(lines)} lines",
                extra={
                    "file": str(path),
                    "offset": offset,
                    "has_more": has_more
                }
            )

            return preview_text, has_more

        except Exception as e:
            logger.error(f"Error reading text file in chunks: {e}", exc_info=True)
            raise ValueError(f"Failed to read text file: {e}")

    def _detect_encoding(self, path: Path) -> str:
        """
        Detect file encoding using chardet.

        Args:
            path: Path to the file

        Returns:
            str: Detected encoding (defaults to utf-8)
        """
        try:
            # Read first chunk to detect encoding
            with open(path, 'rb') as f:
                raw_data = f.read(min(10000, path.stat().st_size))

            result = chardet.detect(raw_data)
            encoding = result.get('encoding')
            confidence = result.get('confidence', 0)

            # Use detected encoding if confidence is high
            if encoding and confidence >= self.ENCODING_CONFIDENCE_THRESHOLD:
                logger.debug(
                    f"Detected encoding: {encoding} (confidence: {confidence})",
                    extra={"file": str(path), "encoding": encoding}
                )
                return encoding

            # Fallback to UTF-8
            logger.debug(
                f"Using fallback encoding UTF-8 (detected: {encoding}, confidence: {confidence})",
                extra={"file": str(path)}
            )
            return 'utf-8'

        except Exception as e:
            logger.warning(f"Encoding detection failed, using UTF-8: {e}")
            return 'utf-8'

    def get_line_count(self, file_path: str) -> int:
        """
        Get total line count for a text file.

        Args:
            file_path: Path to the text file

        Returns:
            int: Total number of lines

        Raises:
            FileNotFoundError: If file doesn't exist
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        encoding = self._detect_encoding(path)

        try:
            with open(path, 'r', encoding=encoding, errors='replace') as f:
                return sum(1 for _ in f)
        except Exception as e:
            logger.error(f"Error counting lines: {e}", exc_info=True)
            return 0

    def get_word_count(self, text: str) -> int:
        """
        Get word count from text.

        Args:
            text: Text content

        Returns:
            int: Number of words
        """
        return len(text.split())

    def get_character_count(self, text: str) -> int:
        """
        Get character count from text.

        Args:
            text: Text content

        Returns:
            int: Number of characters
        """
        return len(text)


# Singleton instance
text_preview_service = TextPreviewService()
