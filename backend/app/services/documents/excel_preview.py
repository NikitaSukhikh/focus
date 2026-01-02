"""
Excel Preview Service

Handles conversion of Excel files to HTML for preview display.
Supports: .xlsx, .xls, .ods
"""

from pathlib import Path
from typing import Optional
import hashlib

from app.core.config import get_settings
from app.core.logging import get_logger

# Optional imports - gracefully handle missing dependencies
try:
    import openpyxl
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    openpyxl = None

try:
    import xlrd
    XLRD_AVAILABLE = True
except ImportError:
    XLRD_AVAILABLE = False
    xlrd = None


logger = get_logger(__name__)
settings = get_settings()


class ExcelPreviewService:
    """
    Service for converting Excel files to HTML for preview.
    """

    # Supported Excel formats
    SUPPORTED_EXCEL_FORMATS = {
        '.xlsx',  # Native support via openpyxl
        '.xlsm',  # Excel Macro-Enabled Workbook
        '.xls',   # Legacy Excel format (requires xlrd)
        '.ods',   # OpenDocument Spreadsheet (openpyxl can read)
    }

    def __init__(self):
        """Initialize the Excel preview service."""
        self.settings = settings
        self.cache_dir = Path(settings.storage.cache_dir) / "excel_previews"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def convert_excel_to_html(
        self,
        file_path: str,
        force_regenerate: bool = False,
        max_rows: int = 1000,
        max_cols: int = 50
    ) -> str:
        """
        Convert an Excel file to HTML for preview.

        Args:
            file_path: Path to the Excel file
            force_regenerate: Force regeneration even if cached
            max_rows: Maximum number of rows to render per sheet
            max_cols: Maximum number of columns to render per sheet

        Returns:
            str: Path to the generated HTML file

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a supported format or dependencies not installed
        """
        if not OPENPYXL_AVAILABLE:
            raise ValueError(
                "Excel preview feature is not available. "
                "Please install openpyxl: pip install openpyxl"
            )

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        # Check if Excel format is supported
        if path.suffix.lower() not in self.SUPPORTED_EXCEL_FORMATS:
            raise ValueError(
                f"Unsupported Excel format: {path.suffix}. "
                f"Supported formats: {', '.join(self.SUPPORTED_EXCEL_FORMATS)}"
            )

        # Generate cache key
        cache_key = self._generate_cache_key(file_path)
        html_path = self.cache_dir / f"{cache_key}.html"

        # Return cached HTML if exists and not forcing regeneration
        if html_path.exists() and not force_regenerate:
            logger.debug(
                f"Using cached Excel preview: {html_path}",
                extra={"source": file_path, "cached": True}
            )
            return str(html_path)

        # Convert Excel to HTML
        try:
            # Handle .xls files with xlrd if available
            if path.suffix.lower() == '.xls':
                if not XLRD_AVAILABLE:
                    raise ValueError(
                        "Cannot preview .xls files. Please install xlrd: pip install xlrd"
                    )
                html_content = self._xls_to_html(path, max_rows, max_cols)
            else:
                # .xlsx, .xlsm, .ods files use openpyxl
                workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
                html_content = self._workbook_to_html(workbook, path.name, max_rows, max_cols)
                workbook.close()

            # Save HTML file
            html_path.write_text(html_content, encoding='utf-8')

            logger.info(
                f"Generated Excel preview: {html_path}",
                extra={"source": file_path}
            )

            return str(html_path)

        except Exception as e:
            logger.error(
                f"Failed to convert Excel to HTML: {file_path}: {e}",
                exc_info=True
            )
            raise ValueError(f"Failed to convert Excel file: {e}")

    def _xls_to_html(self, path: Path, max_rows: int, max_cols: int) -> str:
        """
        Convert legacy .xls file to HTML using xlrd.

        Args:
            path: Path to the .xls file
            max_rows: Maximum rows to render
            max_cols: Maximum columns to render

        Returns:
            str: HTML content
        """
        workbook = xlrd.open_workbook(path)

        html_parts = self._html_header(path.name)

        # Process each sheet
        for sheet_idx in range(workbook.nsheets):
            sheet = workbook.sheet_by_index(sheet_idx)

            if sheet_idx > 0:
                html_parts.append('<div class="sheet-separator"></div>')

            html_parts.append(f'<div class="sheet-header">{self._escape_html(sheet.name)}</div>')

            actual_rows = min(sheet.nrows, max_rows)
            actual_cols = min(sheet.ncols, max_cols)

            if sheet.nrows == 0 or sheet.ncols == 0:
                html_parts.append('<p class="empty-sheet">Empty sheet</p>')
                continue

            html_parts.append('<div class="table-wrapper">')
            html_parts.append('<table>')

            # Render rows
            for row_idx in range(actual_rows):
                html_parts.append('<tr>')
                for col_idx in range(actual_cols):
                    try:
                        cell = sheet.cell(row_idx, col_idx)
                        cell_value = self._format_cell_value(cell.value)
                        cell_class = 'header-cell' if row_idx == 0 else 'data-cell'
                        html_parts.append(f'<td class="{cell_class}">{self._escape_html(str(cell_value))}</td>')
                    except Exception:
                        html_parts.append('<td class="data-cell"></td>')
                html_parts.append('</tr>')

            # Show truncation notice
            if sheet.nrows > max_rows or sheet.ncols > max_cols:
                html_parts.append('</table>')
                html_parts.append(f'<p class="truncation-notice">Showing {actual_rows} of {sheet.nrows} rows, {actual_cols} of {sheet.ncols} columns</p>')
            else:
                html_parts.append('</table>')

            html_parts.append('</div>')

        html_parts.extend(self._html_footer())
        return '\n'.join(html_parts)

    def _workbook_to_html(
        self,
        workbook,
        filename: str,
        max_rows: int,
        max_cols: int
    ) -> str:
        """
        Convert an openpyxl workbook to HTML.

        Args:
            workbook: openpyxl Workbook object
            filename: Original filename for display
            max_rows: Maximum rows to render
            max_cols: Maximum columns to render

        Returns:
            str: HTML content
        """
        html_parts = self._html_header(filename)

        # Process each sheet
        for sheet_idx, sheet in enumerate(workbook.worksheets):
            if sheet_idx > 0:
                html_parts.append('<div class="sheet-separator"></div>')

            html_parts.append(f'<div class="sheet-header">{self._escape_html(sheet.title)}</div>')

            # Get actual dimensions
            if sheet.max_row == 0 or sheet.max_column == 0:
                html_parts.append('<p class="empty-sheet">Empty sheet</p>')
                continue

            actual_rows = min(sheet.max_row, max_rows)
            actual_cols = min(sheet.max_column, max_cols)

            html_parts.append('<div class="table-wrapper">')
            html_parts.append('<table>')

            # Render rows
            for row_idx in range(1, actual_rows + 1):
                html_parts.append('<tr>')
                for col_idx in range(1, actual_cols + 1):
                    try:
                        cell = sheet.cell(row_idx, col_idx)
                        cell_value = self._format_cell_value(cell.value)
                        cell_class = 'header-cell' if row_idx == 1 else 'data-cell'
                        html_parts.append(f'<td class="{cell_class}">{self._escape_html(str(cell_value))}</td>')
                    except Exception:
                        html_parts.append('<td class="data-cell"></td>')
                html_parts.append('</tr>')

            # Show truncation notice
            if sheet.max_row > max_rows or sheet.max_column > max_cols:
                html_parts.append('</table>')
                html_parts.append(
                    f'<p class="truncation-notice">Showing {actual_rows} of {sheet.max_row} rows, '
                    f'{actual_cols} of {sheet.max_column} columns</p>'
                )
            else:
                html_parts.append('</table>')

            html_parts.append('</div>')

        html_parts.extend(self._html_footer())
        return '\n'.join(html_parts)

    def _html_header(self, filename: str) -> list:
        """Generate HTML header with styles."""
        return [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            f'<title>{self._escape_html(filename)}</title>',
            '<style>',
            'body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb; user-select: text; -webkit-user-select: text; }',
            '.sheet-header { font-size: 1.2em; font-weight: 600; margin: 20px 0 10px 0; color: #1e40af; padding: 10px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }',
            '.sheet-separator { height: 20px; }',
            '.table-wrapper { overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }',
            'table { border-collapse: collapse; width: 100%; font-size: 0.9em; user-select: text; }',
            'td { border: 1px solid #cbd5e1; padding: 8px 12px; white-space: nowrap; user-select: text; cursor: text; }',
            '.header-cell { background-color: #e0e7ff; font-weight: 600; color: #1e40af; }',
            '.data-cell { background-color: white; }',
            'tr:hover .data-cell { background-color: #f8fafc; }',
            '.empty-sheet { color: #64748b; font-style: italic; padding: 20px; }',
            '.truncation-notice { color: #64748b; font-size: 0.85em; margin-top: 10px; font-style: italic; }',
            '</style>',
            '</head>',
            '<body>',
        ]

    def _html_footer(self) -> list:
        """Generate HTML footer."""
        return [
            '</body>',
            '</html>'
        ]

    def _format_cell_value(self, value) -> str:
        """Format cell value for display."""
        if value is None:
            return ''
        if isinstance(value, float):
            # Format numbers nicely
            if value.is_integer():
                return str(int(value))
            return f'{value:.2f}'
        if isinstance(value, bool):
            return str(value)
        return str(value)

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters."""
        return (str(text)
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))

    def is_excel(self, file_path: str) -> bool:
        """
        Check if a file is a supported Excel format.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is a supported Excel file
        """
        path = Path(file_path)
        return path.suffix.lower() in self.SUPPORTED_EXCEL_FORMATS

    def get_cached_preview(self, file_path: str) -> Optional[str]:
        """
        Get cached preview path if it exists.

        Args:
            file_path: Path to the original file

        Returns:
            Optional[str]: Path to cached preview, or None if not cached
        """
        cache_key = self._generate_cache_key(file_path)
        html_path = self.cache_dir / f"{cache_key}.html"

        if html_path.exists():
            return str(html_path)
        return None

    def clear_cache(self, file_path: Optional[str] = None) -> int:
        """
        Clear Excel preview cache.

        Args:
            file_path: Specific file to clear cache for (None clears all)

        Returns:
            int: Number of cache files deleted
        """
        if file_path:
            # Clear specific file's preview
            cache_key = self._generate_cache_key(file_path)
            html_path = self.cache_dir / f"{cache_key}.html"

            if html_path.exists():
                html_path.unlink()
                logger.info(f"Cleared Excel preview cache for {file_path}")
                return 1
            return 0
        else:
            # Clear all previews
            count = 0
            for html_file in self.cache_dir.glob("*.html"):
                html_file.unlink()
                count += 1

            logger.info(f"Cleared all Excel preview cache ({count} files)")
            return count

    def _generate_cache_key(self, file_path: str) -> str:
        """
        Generate a unique cache key for an Excel preview.

        Args:
            file_path: Source file path

        Returns:
            str: Cache key (hash)
        """
        # Include file path and modification time in key
        path = Path(file_path)
        mtime = path.stat().st_mtime if path.exists() else 0

        key_string = f"{file_path}_{mtime}"
        return hashlib.md5(key_string.encode()).hexdigest()


# Singleton instance
excel_preview_service = ExcelPreviewService()
