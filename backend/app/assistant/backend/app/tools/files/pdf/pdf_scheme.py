"""
PDF tool definitions for Claude API.

Defines the tool schemas that Claude uses to call PDF operations.
"""

from typing import List, Dict, Any
from .pdf_tools import pdf_tools


# PDF tool definitions
PDF_TOOLS = [
    {
        "name": "create_pdf",
        "description": "Create a new PDF document with text content. Supports adding metadata like title, author, and subject.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path where the PDF should be saved (e.g., 'documents/report.pdf')"
                },
                "content": {
                    "type": "string",
                    "description": "Text content to include in the PDF. Use double newlines (\\n\\n) to separate paragraphs."
                },
                "title": {
                    "type": "string",
                    "description": "Optional PDF title metadata"
                },
                "author": {
                    "type": "string",
                    "description": "Optional PDF author metadata"
                },
                "subject": {
                    "type": "string",
                    "description": "Optional PDF subject metadata"
                }
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "read_pdf_detailed",
        "description": "Read a PDF file and extract text content with detailed metadata and summary statistics. Use this when analyzing PDFs or when the user wants to understand what's in a PDF file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the PDF file to read (can be uploaded file or local path)"
                },
                "max_pages": {
                    "type": "integer",
                    "description": "Optional maximum number of pages to read. If not specified, reads entire PDF."
                },
                "include_summary": {
                    "type": "boolean",
                    "description": "Whether to include word count, character count, and summary statistics. Default is true.",
                    "default": True
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "merge_pdf_files",
        "description": "Merge multiple PDF files into a single PDF document. Maintains page order based on input file order. Use when user wants to combine PDFs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "input_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of PDF file paths to merge in order. Can be uploaded files or local paths."
                },
                "output_path": {
                    "type": "string",
                    "description": "Path where the merged PDF should be saved (e.g., 'merged_document.pdf')"
                }
            },
            "required": ["input_paths", "output_path"]
        }
    },
    {
        "name": "split_pdf_file",
        "description": "Split a PDF file into multiple smaller PDFs. Can split by page count or specific page ranges. Use when user wants to separate or divide a PDF.",
        "input_schema": {
            "type": "object",
            "properties": {
                "input_path": {
                    "type": "string",
                    "description": "Path to the PDF file to split"
                },
                "output_dir": {
                    "type": "string",
                    "description": "Directory where split PDFs should be saved"
                },
                "split_mode": {
                    "type": "string",
                    "enum": ["pages", "ranges"],
                    "description": "'pages' to split by page count, 'ranges' to split by specific page ranges. Default is 'pages'.",
                    "default": "pages"
                },
                "pages_per_file": {
                    "type": "integer",
                    "description": "Number of pages per output file (only for 'pages' mode). Default is 1 (split into individual pages).",
                    "default": 1
                },
                "page_ranges": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "minItems": 2,
                        "maxItems": 2
                    },
                    "description": "List of [start, end] page ranges (only for 'ranges' mode). Example: [[1, 5], [6, 10]] to split pages 1-5 and 6-10 into separate files."
                }
            },
            "required": ["input_path", "output_dir"]
        }
    },
    {
        "name": "extract_pdf_pages",
        "description": "Extract specific pages from a PDF file and save them as a new PDF. Use when user wants to pull out certain pages from a PDF.",
        "input_schema": {
            "type": "object",
            "properties": {
                "input_path": {
                    "type": "string",
                    "description": "Path to the input PDF file"
                },
                "output_path": {
                    "type": "string",
                    "description": "Path for the output PDF with extracted pages"
                },
                "pages": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "List of page numbers to extract (1-indexed). Example: [1, 3, 5] to extract pages 1, 3, and 5."
                }
            },
            "required": ["input_path", "output_path", "pages"]
        }
    }
]


async def execute_pdf_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a PDF tool.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Dictionary of tool parameters

    Returns:
        Dictionary with tool execution results
    """
    try:
        if tool_name == "create_pdf":
            return await pdf_tools.create_pdf(**tool_input)
        elif tool_name == "read_pdf_detailed":
            return await pdf_tools.read_pdf_with_summary(**tool_input)
        elif tool_name == "merge_pdf_files":
            return await pdf_tools.merge_pdfs(**tool_input)
        elif tool_name == "split_pdf_file":
            return await pdf_tools.split_pdf(**tool_input)
        elif tool_name == "extract_pdf_pages":
            return await pdf_tools.extract_pages(**tool_input)
        else:
            return {
                "success": False,
                "error": f"Unknown PDF tool: {tool_name}"
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {tool_name}: {str(e)}"
        }
