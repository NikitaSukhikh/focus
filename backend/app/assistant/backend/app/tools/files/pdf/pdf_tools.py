"""
PDF tools with comprehensive operations.

Provides PDF creation, reading, summarization, merging, splitting, and manipulation.
"""

import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter, PdfMerger

logger = logging.getLogger(__name__)


class PDFTools:
    """PDF operations including create, read, split, merge, extract, and modify."""

    @staticmethod
    async def create_pdf(
        file_path: str,
        content: str,
        title: Optional[str] = None,
        author: Optional[str] = None,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new PDF file with text content.

        Args:
            file_path: Path where PDF should be saved
            content: Text content to include in PDF
            title: Optional PDF title metadata
            author: Optional PDF author metadata
            subject: Optional PDF subject metadata

        Returns:
            Dictionary with operation result
        """
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.enums import TA_JUSTIFY

            path = Path(file_path)

            # Create parent directories if needed
            path.parent.mkdir(parents=True, exist_ok=True)

            # Create PDF
            doc = SimpleDocTemplate(
                str(path),
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18,
            )

            # Set metadata
            if title:
                doc.title = title
            if author:
                doc.author = author
            if subject:
                doc.subject = subject

            # Build content
            story = []
            styles = getSampleStyleSheet()
            styles.add(ParagraphStyle(name='Justify', alignment=TA_JUSTIFY))

            # Split content into paragraphs
            paragraphs = content.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    p = Paragraph(para.strip(), styles['Justify'])
                    story.append(p)
                    story.append(Spacer(1, 0.2 * inch))

            doc.build(story)

            file_size = path.stat().st_size

            return {
                "success": True,
                "path": str(path.absolute()),
                "size": file_size,
                "size_human": f"{file_size / 1024:.2f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.2f} MB",
                "message": f"Successfully created PDF: {path.name}"
            }

        except ImportError as e:
            logger.error(f"Missing dependency for PDF creation: {e}")
            return {
                "success": False,
                "error": "reportlab not installed. Run: pip install reportlab"
            }
        except Exception as e:
            logger.error(f"Error creating PDF {file_path}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def read_pdf_with_summary(
        file_path: str,
        max_pages: Optional[int] = None,
        include_summary: bool = True
    ) -> Dict[str, Any]:
        """
        Read PDF and optionally generate a summary.

        Args:
            file_path: Path to PDF file
            max_pages: Maximum pages to read
            include_summary: Whether to include summary metadata

        Returns:
            Dictionary with content, metadata, and optional summary
        """
        try:
            path = Path(file_path)
            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}"
                }

            reader = PdfReader(file_path)
            total_pages = len(reader.pages)

            # Read pages
            pages_to_read = min(max_pages, total_pages) if max_pages else total_pages
            text_content = []

            for i in range(pages_to_read):
                try:
                    page = reader.pages[i]
                    text = page.extract_text()
                    text_content.append(f"--- Page {i+1} ---\n{text}\n")
                except Exception as e:
                    logger.warning(f"Error reading page {i+1}: {e}")
                    text_content.append(f"--- Page {i+1} ---\n[Error extracting text]\n")

            full_text = "\n".join(text_content)

            # Extract metadata
            metadata = reader.metadata
            result = {
                "success": True,
                "content": full_text,
                "total_pages": total_pages,
                "pages_read": pages_to_read,
                "file_path": str(path.absolute()),
                "metadata": {
                    "title": metadata.get("/Title", ""),
                    "author": metadata.get("/Author", ""),
                    "subject": metadata.get("/Subject", ""),
                    "creator": metadata.get("/Creator", ""),
                } if metadata else {}
            }

            # Add summary info if requested
            if include_summary:
                # Calculate character and word counts
                char_count = len(full_text)
                word_count = len(full_text.split())

                result["summary"] = {
                    "total_characters": char_count,
                    "total_words": word_count,
                    "average_words_per_page": word_count // pages_to_read if pages_to_read > 0 else 0,
                    "has_more_pages": total_pages > pages_to_read
                }

            return result

        except Exception as e:
            error_msg = f"Error reading PDF: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }

    @staticmethod
    async def merge_pdfs(
        input_paths: List[str],
        output_path: str
    ) -> Dict[str, Any]:
        """
        Merge multiple PDF files into one.

        Args:
            input_paths: List of PDF file paths to merge
            output_path: Path for the merged output file

        Returns:
            Dictionary with success status and file info
        """
        try:
            if not input_paths:
                return {
                    "success": False,
                    "error": "No input files provided"
                }

            # Verify all input files exist
            missing_files = []
            for path in input_paths:
                if not Path(path).exists():
                    missing_files.append(path)

            if missing_files:
                return {
                    "success": False,
                    "error": f"Files not found: {', '.join(missing_files)}"
                }

            # Create merger
            merger = PdfMerger()

            # Add PDFs
            total_pages = 0
            for pdf_path in input_paths:
                try:
                    merger.append(pdf_path)
                    reader = PdfReader(pdf_path)
                    total_pages += len(reader.pages)
                except Exception as e:
                    logger.error(f"Error adding {pdf_path}: {e}")
                    return {
                        "success": False,
                        "error": f"Error adding {pdf_path}: {str(e)}"
                    }

            # Ensure output directory exists
            output = Path(output_path)
            output.parent.mkdir(parents=True, exist_ok=True)

            # Write merged PDF
            merger.write(output_path)
            merger.close()

            return {
                "success": True,
                "output_path": str(output.absolute()),
                "files_merged": len(input_paths),
                "total_pages": total_pages,
                "message": f"Successfully merged {len(input_paths)} PDFs into {output_path}"
            }

        except Exception as e:
            error_msg = f"Error merging PDFs: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }

    @staticmethod
    async def split_pdf(
        input_path: str,
        output_dir: str,
        split_mode: str = "pages",
        pages_per_file: int = 1,
        page_ranges: Optional[List[List[int]]] = None
    ) -> Dict[str, Any]:
        """
        Split a PDF into multiple files.

        Args:
            input_path: Path to input PDF
            output_dir: Directory for output files
            split_mode: "pages" (split by page count) or "ranges" (split by page ranges)
            pages_per_file: Number of pages per output file (for "pages" mode)
            page_ranges: List of [start, end] page ranges (for "ranges" mode)

        Returns:
            Dictionary with success status and output files
        """
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                return {
                    "success": False,
                    "error": f"File not found: {input_path}"
                }

            reader = PdfReader(input_path)
            total_pages = len(reader.pages)

            # Create output directory
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)

            output_files = []
            base_name = input_file.stem

            if split_mode == "pages":
                # Split by pages_per_file
                file_num = 1
                for start_page in range(0, total_pages, pages_per_file):
                    writer = PdfWriter()
                    end_page = min(start_page + pages_per_file, total_pages)

                    for page_num in range(start_page, end_page):
                        writer.add_page(reader.pages[page_num])

                    output_file = output_path / f"{base_name}_part{file_num}.pdf"
                    with open(output_file, 'wb') as f:
                        writer.write(f)

                    output_files.append({
                        "path": str(output_file.absolute()),
                        "pages": f"{start_page + 1}-{end_page}",
                        "page_count": end_page - start_page
                    })
                    file_num += 1

            elif split_mode == "ranges":
                if not page_ranges:
                    return {
                        "success": False,
                        "error": "Page ranges not provided for 'ranges' mode"
                    }

                for idx, (start, end) in enumerate(page_ranges, 1):
                    # Convert to 0-indexed
                    start_idx = start - 1
                    end_idx = min(end, total_pages)

                    if start_idx < 0 or start_idx >= total_pages:
                        logger.warning(f"Invalid range {start}-{end}, skipping")
                        continue

                    writer = PdfWriter()
                    for page_num in range(start_idx, end_idx):
                        writer.add_page(reader.pages[page_num])

                    output_file = output_path / f"{base_name}_pages{start}-{end}.pdf"
                    with open(output_file, 'wb') as f:
                        writer.write(f)

                    output_files.append({
                        "path": str(output_file.absolute()),
                        "pages": f"{start}-{end_idx}",
                        "page_count": end_idx - start_idx
                    })

            else:
                return {
                    "success": False,
                    "error": f"Invalid split_mode: {split_mode}. Use 'pages' or 'ranges'"
                }

            return {
                "success": True,
                "output_files": output_files,
                "files_created": len(output_files),
                "total_pages": total_pages,
                "message": f"Successfully split PDF into {len(output_files)} files"
            }

        except Exception as e:
            error_msg = f"Error splitting PDF: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }

    @staticmethod
    async def extract_pages(
        input_path: str,
        output_path: str,
        pages: List[int]
    ) -> Dict[str, Any]:
        """
        Extract specific pages from a PDF.

        Args:
            input_path: Path to input PDF
            output_path: Path for output PDF with extracted pages
            pages: List of page numbers to extract (1-indexed)

        Returns:
            Dictionary with success status and output info
        """
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                return {
                    "success": False,
                    "error": f"File not found: {input_path}"
                }

            reader = PdfReader(input_path)
            total_pages = len(reader.pages)

            # Validate page numbers
            invalid_pages = [p for p in pages if p < 1 or p > total_pages]
            if invalid_pages:
                return {
                    "success": False,
                    "error": f"Invalid page numbers: {invalid_pages}. PDF has {total_pages} pages."
                }

            # Extract pages
            writer = PdfWriter()
            for page_num in pages:
                writer.add_page(reader.pages[page_num - 1])  # Convert to 0-indexed

            # Ensure output directory exists
            output = Path(output_path)
            output.parent.mkdir(parents=True, exist_ok=True)

            # Write output
            with open(output_path, 'wb') as f:
                writer.write(f)

            return {
                "success": True,
                "output_path": str(output.absolute()),
                "pages_extracted": len(pages),
                "page_numbers": pages,
                "message": f"Successfully extracted {len(pages)} pages to {output_path}"
            }

        except Exception as e:
            error_msg = f"Error extracting pages: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }

    @staticmethod
    async def add_text_to_pdf(
        input_path: str,
        output_path: str,
        text: str,
        position: str = "end"
    ) -> Dict[str, Any]:
        """
        Add text page to an existing PDF.

        Args:
            input_path: Path to source PDF
            output_path: Path for output PDF
            text: Text to add
            position: 'start' or 'end' (default: 'end')

        Returns:
            Dictionary with operation result
        """
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            import io

            src_path = Path(input_path)
            dst_path = Path(output_path)

            if not src_path.exists():
                return {
                    "success": False,
                    "error": f"Source file not found: {input_path}"
                }

            # Create a new PDF with the text
            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=letter)

            # Add text with word wrapping
            text_obj = can.beginText(72, 720)
            text_obj.setFont("Helvetica", 12)

            # Simple word wrapping
            max_width = 450
            lines = []
            for paragraph in text.split('\n'):
                words = paragraph.split()
                current_line = []
                for word in words:
                    test_line = ' '.join(current_line + [word])
                    if can.stringWidth(test_line, "Helvetica", 12) <= max_width:
                        current_line.append(word)
                    else:
                        if current_line:
                            lines.append(' '.join(current_line))
                        current_line = [word]
                if current_line:
                    lines.append(' '.join(current_line))
                lines.append('')  # Empty line for paragraph break

            for line in lines:
                text_obj.textLine(line)

            can.drawText(text_obj)
            can.save()
            packet.seek(0)

            # Read the existing PDF
            existing_pdf = PdfReader(input_path)
            new_page = PdfReader(packet).pages[0]
            output_pdf = PdfWriter()

            # Add pages based on position
            if position == "start":
                output_pdf.add_page(new_page)

            for page in existing_pdf.pages:
                output_pdf.add_page(page)

            if position == "end":
                output_pdf.add_page(new_page)

            # Create output directory
            dst_path.parent.mkdir(parents=True, exist_ok=True)

            # Write output
            with open(dst_path, 'wb') as output_file:
                output_pdf.write(output_file)

            file_size = dst_path.stat().st_size

            return {
                "success": True,
                "input_path": str(src_path.absolute()),
                "output_path": str(dst_path.absolute()),
                "size": file_size,
                "size_human": f"{file_size / 1024:.2f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.2f} MB",
                "message": f"Successfully added text to PDF at {position}"
            }

        except ImportError as e:
            logger.error(f"Missing dependency: {e}")
            return {
                "success": False,
                "error": "reportlab not installed. Run: pip install reportlab"
            }
        except Exception as e:
            logger.error(f"Error adding text to PDF: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
pdf_tools = PDFTools()
