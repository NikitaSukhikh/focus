"""
Document Preview Service

Handles conversion of document files to HTML for preview display.
Supports: .docx, .doc, .odt
"""

from pathlib import Path
from typing import Optional
import hashlib
import zipfile

from app.core.config import get_settings
from app.core.logging import get_logger

# Optional imports - gracefully handle missing dependencies
try:
    from docx import Document
    from docx.oxml.text.paragraph import CT_P
    from docx.oxml.table import CT_Tbl
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    Document = None
    CT_P = None
    CT_Tbl = None
    Table = None
    Paragraph = None

try:
    import pypandoc
    # Check if pandoc is actually installed
    try:
        pypandoc.get_pandoc_version()
        PANDOC_AVAILABLE = True
    except (OSError, RuntimeError):
        PANDOC_AVAILABLE = False
except ImportError:
    PANDOC_AVAILABLE = False
    pypandoc = None


logger = get_logger(__name__)
settings = get_settings()


class DocumentPreviewService:
    """
    Service for converting documents to HTML for preview.
    """

    # Supported document formats
    SUPPORTED_DOC_FORMATS = {
        '.docx',  # Native support via python-docx
        '.doc',   # Converted via pypandoc (requires pandoc installed)
        '.odt',   # OpenDocument Text - converted via pypandoc (requires pandoc installed)
    }

    def __init__(self):
        """Initialize the document preview service."""
        self.settings = settings
        self.cache_dir = Path(settings.storage.cache_dir) / "document_previews"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def convert_docx_to_html(
        self,
        file_path: str,
        force_regenerate: bool = False
    ) -> str:
        """
        Convert a DOCX file to HTML for preview.

        Args:
            file_path: Path to the DOCX file
            force_regenerate: Force regeneration even if cached

        Returns:
            str: Path to the generated HTML file

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a supported document format or dependencies not installed
        """
        if not DOCX_AVAILABLE:
            raise ValueError(
                "Document preview feature is not available. "
                "Please install python-docx: pip install python-docx==1.1.2"
            )

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        # Check if document format is supported
        if path.suffix.lower() not in self.SUPPORTED_DOC_FORMATS:
            raise ValueError(
                f"Unsupported document format: {path.suffix}. "
                f"Supported formats: {', '.join(self.SUPPORTED_DOC_FORMATS)}"
            )

        # Generate cache key
        cache_key = self._generate_cache_key(file_path)
        html_path = self.cache_dir / f"{cache_key}.html"

        # Return cached HTML if exists and not forcing regeneration
        if html_path.exists() and not force_regenerate:
            logger.debug(
                f"Using cached document preview: {html_path}",
                extra={"source": file_path, "cached": True}
            )
            return str(html_path)

        # Convert document to HTML
        try:
            # Handle .doc and .odt files by converting to .docx first
            if path.suffix.lower() in ['.doc', '.odt']:
                if not PANDOC_AVAILABLE:
                    raise ValueError(
                        f"Cannot preview {path.suffix} files. Pandoc is not installed. "
                        "Please install pandoc: https://pandoc.org/installing.html "
                        "Or download it via Python: python -m pypandoc.pandoc_download"
                    )

                # Convert to .docx using pandoc
                temp_docx_path = self.cache_dir / f"{cache_key}_temp.docx"
                try:
                    # Determine the input format
                    input_format = 'doc' if path.suffix.lower() == '.doc' else 'odt'

                    # Ask pandoc to convert to docx, explicitly passing the source format
                    pypandoc.convert_file(
                        str(path),
                        'docx',
                        format=input_format,
                        outputfile=str(temp_docx_path),
                    )

                    # Ensure pandoc produced a valid DOCX archive before parsing
                    if not temp_docx_path.exists() or not zipfile.is_zipfile(temp_docx_path):
                        raise ValueError("Pandoc did not produce a valid DOCX file for preview")

                    doc = Document(temp_docx_path)
                except Exception as e:
                    if temp_docx_path.exists():
                        temp_docx_path.unlink()
                    raise ValueError(f"Failed to convert {path.suffix} file: {e}")
                else:
                    # Clean up temp file
                    if temp_docx_path.exists():
                        temp_docx_path.unlink()
            else:
                # .docx files can be opened directly
                doc = Document(path)

            html_content = self._docx_to_html(doc, path.name)

            # Save HTML file
            html_path.write_text(html_content, encoding='utf-8')

            logger.info(
                f"Generated document preview: {html_path}",
                extra={"source": file_path}
            )

            return str(html_path)

        except Exception as e:
            logger.error(
                f"Failed to convert document to HTML: {file_path}: {e}",
                exc_info=True
            )
            raise ValueError(f"Failed to convert document: {e}")

    def _docx_to_html(self, doc: Document, filename: str) -> str:
        """
        Convert a python-docx Document to HTML.

        Args:
            doc: python-docx Document object
            filename: Original filename for display

        Returns:
            str: HTML content
        """
        html_parts = [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            f'<title>{filename}</title>',
            '<style>',
            'body { font-family: "Segoe UI", Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; background: #f9fafb; }',
            'h1 { font-size: 2em; margin-bottom: 0.5em; color: #1e40af; }',
            'h2 { font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; color: #1e40af; }',
            'h3 { font-size: 1.2em; margin-top: 0.8em; margin-bottom: 0.4em; color: #3b82f6; }',
            'p { margin: 0.5em 0; }',
            'table { border-collapse: collapse; width: 100%; margin: 1em 0; background: white; }',
            'td, th { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }',
            'th { background-color: #f1f5f9; font-weight: 600; }',
            'ul, ol { margin: 0.5em 0; padding-left: 2em; }',
            'li { margin: 0.3em 0; }',
            'strong { font-weight: 600; }',
            'em { font-style: italic; }',
            '.document-container { background: white; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; }',
            '</style>',
            '</head>',
            '<body>',
            '<div class="document-container">',
        ]

        # Process document elements
        for element in doc.element.body:
            if isinstance(element, CT_P):
                paragraph = Paragraph(element, doc)
                html_parts.append(self._paragraph_to_html(paragraph))
            elif isinstance(element, CT_Tbl):
                table = Table(element, doc)
                html_parts.append(self._table_to_html(table))

        html_parts.extend([
            '</div>',
            '</body>',
            '</html>'
        ])

        return '\n'.join(html_parts)

    def _paragraph_to_html(self, paragraph: Paragraph) -> str:
        """
        Convert a paragraph to HTML.

        Args:
            paragraph: python-docx Paragraph object

        Returns:
            str: HTML paragraph
        """
        text = paragraph.text.strip()
        if not text:
            return '<p>&nbsp;</p>'

        # Detect heading level
        if paragraph.style and paragraph.style.name:
            style_name = paragraph.style.name.lower()
            if 'heading 1' in style_name:
                return f'<h1>{self._escape_html(text)}</h1>'
            elif 'heading 2' in style_name:
                return f'<h2>{self._escape_html(text)}</h2>'
            elif 'heading 3' in style_name:
                return f'<h3>{self._escape_html(text)}</h3>'

        # Process runs for formatting
        formatted_text = []
        for run in paragraph.runs:
            run_text = self._escape_html(run.text)
            if run.bold:
                run_text = f'<strong>{run_text}</strong>'
            if run.italic:
                run_text = f'<em>{run_text}</em>'
            formatted_text.append(run_text)

        return f'<p>{"".join(formatted_text)}</p>'

    def _table_to_html(self, table: Table) -> str:
        """
        Convert a table to HTML.

        Args:
            table: python-docx Table object

        Returns:
            str: HTML table
        """
        html_parts = ['<table>']

        for i, row in enumerate(table.rows):
            html_parts.append('<tr>')
            for cell in row.cells:
                cell_text = self._escape_html(cell.text.strip())
                # First row is typically header
                tag = 'th' if i == 0 else 'td'
                html_parts.append(f'<{tag}>{cell_text}</{tag}>')
            html_parts.append('</tr>')

        html_parts.append('</table>')
        return '\n'.join(html_parts)

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters."""
        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))

    def is_document(self, file_path: str) -> bool:
        """
        Check if a file is a supported document format.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is a supported document
        """
        path = Path(file_path)
        return path.suffix.lower() in self.SUPPORTED_DOC_FORMATS

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
        Clear document preview cache.

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
                logger.info(f"Cleared document preview cache for {file_path}")
                return 1
            return 0
        else:
            # Clear all previews
            count = 0
            for html_file in self.cache_dir.glob("*.html"):
                html_file.unlink()
                count += 1

            logger.info(f"Cleared all document preview cache ({count} files)")
            return count

    def _generate_cache_key(self, file_path: str) -> str:
        """
        Generate a unique cache key for a document preview.

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
document_preview_service = DocumentPreviewService()
