"""
DOCX operations tool for creating, editing, and reading Word documents.

Provides comprehensive Word document manipulation with proper error handling and validation.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class DocxOperationsTool:
    """Tool for performing DOCX operations like create, read, edit Word documents."""

    def __init__(self):
        """Initialize the DOCX operations tool."""
        self.max_file_size = 50 * 1024 * 1024  # 50 MB limit for reading

    async def create_docx(
        self,
        file_path: str,
        content: str,
        title: Optional[str] = None,
        author: Optional[str] = None,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new Word document with text content.

        Args:
            file_path: Path where document should be saved
            content: Text content to include in document
            title: Optional document title
            author: Optional document author
            subject: Optional document subject

        Returns:
            Dictionary with operation result
        """
        try:
            from docx import Document
            from docx.shared import Pt

            path = Path(file_path).resolve()

            # Create parent directories if needed
            path.parent.mkdir(parents=True, exist_ok=True)

            # Create document
            doc = Document()

            # Set metadata
            core_properties = doc.core_properties
            if title:
                core_properties.title = title
            if author:
                core_properties.author = author
            if subject:
                core_properties.subject = subject

            # Add content - split by paragraphs
            paragraphs = content.split('\n\n')
            for para_text in paragraphs:
                if para_text.strip():
                    paragraph = doc.add_paragraph(para_text.strip())
                    # Set font size
                    for run in paragraph.runs:
                        run.font.size = Pt(11)

            # Save document
            doc.save(str(path))

            file_size = path.stat().st_size

            return {
                "success": True,
                "path": str(path),
                "size": file_size,
                "size_human": self._format_size(file_size),
                "message": f"Successfully created Word document: {path.name}"
            }

        except ImportError as e:
            logger.error(f"Missing dependency for DOCX creation: {e}")
            return {
                "success": False,
                "error": "python-docx not installed. Run: pip install python-docx"
            }
        except Exception as e:
            logger.error(f"Error creating DOCX {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def read_docx(
        self,
        file_path: str
    ) -> Dict[str, Any]:
        """
        Read text content from a Word document.

        Args:
            file_path: Path to the DOCX file

        Returns:
            Dictionary with document content and metadata
        """
        try:
            from docx import Document

            path = Path(file_path).resolve()

            # Validate file exists
            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            # Check file size
            file_size = path.stat().st_size
            if file_size > self.max_file_size:
                return {
                    "success": False,
                    "error": f"File too large ({file_size} bytes). Max size: {self.max_file_size} bytes"
                }

            # Read document
            doc = Document(str(path))

            # Extract text from paragraphs
            paragraphs = []
            for para in doc.paragraphs:
                if para.text.strip():
                    paragraphs.append(para.text)

            # Extract text from tables
            tables_content = []
            for table in doc.tables:
                table_data = []
                for row in table.rows:
                    row_data = [cell.text for cell in row.cells]
                    table_data.append(" | ".join(row_data))
                if table_data:
                    tables_content.append("\n".join(table_data))

            # Get metadata
            props = doc.core_properties

            return {
                "success": True,
                "path": str(path),
                "content": "\n\n".join(paragraphs),
                "tables": tables_content,
                "total_paragraphs": len(doc.paragraphs),
                "total_tables": len(doc.tables),
                "size": file_size,
                "metadata": {
                    "title": props.title or "",
                    "author": props.author or "",
                    "subject": props.subject or "",
                    "keywords": props.keywords or "",
                    "created": props.created.isoformat() if props.created else "",
                    "modified": props.modified.isoformat() if props.modified else "",
                    "last_modified_by": props.last_modified_by or "",
                },
                "modified": datetime.fromtimestamp(path.stat().st_mtime).isoformat()
            }

        except ImportError as e:
            logger.error(f"Missing dependency for DOCX reading: {e}")
            return {
                "success": False,
                "error": "python-docx not installed. Run: pip install python-docx"
            }
        except Exception as e:
            logger.error(f"Error reading DOCX {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def append_to_docx(
        self,
        file_path: str,
        content: str,
        heading: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Append text to an existing Word document.

        Args:
            file_path: Path to the DOCX file
            content: Text content to append
            heading: Optional heading to add before content

        Returns:
            Dictionary with operation result
        """
        try:
            from docx import Document
            from docx.shared import Pt

            path = Path(file_path).resolve()

            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            # Open existing document
            doc = Document(str(path))

            # Add heading if provided
            if heading:
                doc.add_heading(heading, level=2)

            # Add content
            paragraphs = content.split('\n\n')
            for para_text in paragraphs:
                if para_text.strip():
                    paragraph = doc.add_paragraph(para_text.strip())
                    for run in paragraph.runs:
                        run.font.size = Pt(11)

            # Save document
            doc.save(str(path))

            file_size = path.stat().st_size

            return {
                "success": True,
                "path": str(path),
                "size": file_size,
                "message": f"Successfully appended content to {path.name}"
            }

        except ImportError:
            return {
                "success": False,
                "error": "python-docx not installed. Run: pip install python-docx"
            }
        except Exception as e:
            logger.error(f"Error appending to DOCX: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def add_table_to_docx(
        self,
        file_path: str,
        table_data: List[List[str]],
        has_header: bool = True
    ) -> Dict[str, Any]:
        """
        Add a table to an existing Word document.

        Args:
            file_path: Path to the DOCX file
            table_data: 2D list of table data (rows and columns)
            has_header: Whether first row should be formatted as header

        Returns:
            Dictionary with operation result
        """
        try:
            from docx import Document
            from docx.shared import Pt, RGBColor
            from docx.enum.text import WD_ALIGN_PARAGRAPH

            path = Path(file_path).resolve()

            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            if not table_data or not table_data[0]:
                return {
                    "success": False,
                    "error": "Table data is empty"
                }

            # Open existing document
            doc = Document(str(path))

            # Create table
            rows = len(table_data)
            cols = len(table_data[0])
            table = doc.add_table(rows=rows, cols=cols)
            table.style = 'Light Grid Accent 1'

            # Populate table
            for i, row_data in enumerate(table_data):
                row_cells = table.rows[i].cells
                for j, cell_text in enumerate(row_data):
                    cell = row_cells[j]
                    cell.text = str(cell_text)

                    # Format header row
                    if i == 0 and has_header:
                        for paragraph in cell.paragraphs:
                            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            for run in paragraph.runs:
                                run.font.bold = True
                                run.font.size = Pt(11)

            # Save document
            doc.save(str(path))

            file_size = path.stat().st_size

            return {
                "success": True,
                "path": str(path),
                "rows": rows,
                "columns": cols,
                "size": file_size,
                "message": f"Successfully added {rows}x{cols} table to {path.name}"
            }

        except ImportError:
            return {
                "success": False,
                "error": "python-docx not installed. Run: pip install python-docx"
            }
        except Exception as e:
            logger.error(f"Error adding table to DOCX: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def replace_text_in_docx(
        self,
        file_path: str,
        search_text: str,
        replace_text: str,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Replace text in a Word document.

        Args:
            file_path: Path to the DOCX file
            search_text: Text to search for
            replace_text: Text to replace with
            output_path: Optional output path (uses input path if None)

        Returns:
            Dictionary with operation result
        """
        try:
            from docx import Document

            path = Path(file_path).resolve()

            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            # Open document
            doc = Document(str(path))

            replacements = 0

            # Replace in paragraphs
            for para in doc.paragraphs:
                if search_text in para.text:
                    # Replace in each run to preserve formatting
                    for run in para.runs:
                        if search_text in run.text:
                            run.text = run.text.replace(search_text, replace_text)
                            replacements += 1

            # Replace in tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            if search_text in para.text:
                                for run in para.runs:
                                    if search_text in run.text:
                                        run.text = run.text.replace(search_text, replace_text)
                                        replacements += 1

            # Save document
            out_path = Path(output_path).resolve() if output_path else path
            out_path.parent.mkdir(parents=True, exist_ok=True)
            doc.save(str(out_path))

            file_size = out_path.stat().st_size

            return {
                "success": True,
                "path": str(out_path),
                "replacements": replacements,
                "size": file_size,
                "message": f"Successfully replaced {replacements} occurrences"
            }

        except ImportError:
            return {
                "success": False,
                "error": "python-docx not installed. Run: pip install python-docx"
            }
        except Exception as e:
            logger.error(f"Error replacing text in DOCX: {e}", exc_info=True)
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
docx_operations_tool = DocxOperationsTool()
