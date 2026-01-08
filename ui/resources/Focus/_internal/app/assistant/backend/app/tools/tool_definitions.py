"""
Tool definitions for Claude API function calling.

Defines the schemas that Claude uses to understand and call our file tools.
"""

from typing import List, Dict, Any
from app.tools.files import DOCUMENT_TOOLS, PDF_TOOLS
from app.tools.invoicing.invoice_tools import INVOICE_TOOLS
from app.tools.gdrive import GDRIVE_TOOLS
from app.tools.email.email_tools import EMAIL_TOOLS


# File Search Tool Definitions
FILE_SEARCH_TOOLS = [
    {
        "name": "search_files_by_name",
        "description": "Search for files and directories by name or partial name. Supports wildcards (* and ?). Use this when the user asks to find files.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - filename or pattern to search for. Supports wildcards like '*.py' or 'config*'"
                },
                "search_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of directory paths to search in. If not provided, searches common user directories (Documents, Downloads, Desktop, etc.)"
                },
                "case_sensitive": {
                    "type": "boolean",
                    "description": "Whether the search should be case-sensitive. Default is false.",
                    "default": False
                },
                "exact_match": {
                    "type": "boolean",
                    "description": "If true, only exact filename matches are returned. Default is false (partial matching).",
                    "default": False
                },
                "file_type": {
                    "type": "string",
                    "enum": ["file", "directory", "both"],
                    "description": "Filter results by type: 'file' for files only, 'directory' for directories only, 'both' for both"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return. Default is 50.",
                    "default": 50
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "search_files_by_extension",
        "description": "Search for files by file extension. Use this when the user asks to find files of a specific type (e.g., 'find all PDFs', 'find Python files').",
        "input_schema": {
            "type": "object",
            "properties": {
                "extension": {
                    "type": "string",
                    "description": "File extension to search for (with or without dot, e.g., 'pdf' or '.pdf')"
                },
                "search_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of directory paths to search in"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 50
                }
            },
            "required": ["extension"]
        }
    },
    {
        "name": "search_recent_files",
        "description": "Find recently modified files. Use this when the user asks about recent files, files modified today, files changed recently, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "hours": {
                    "type": "integer",
                    "description": "Find files modified within this many hours. Default is 24 (last day).",
                    "default": 24
                },
                "search_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of directory paths to search in"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 50
                }
            },
            "required": []
        }
    }
]


# File Operations Tool Definitions
FILE_OPERATION_TOOLS = [
    {
        "name": "read_file",
        "description": "Read the contents of a text file. Use this when the user asks to read, view, or show the contents of a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Full path to the file to read"
                },
                "encoding": {
                    "type": "string",
                    "description": "File encoding. Default is 'utf-8'.",
                    "default": "utf-8"
                },
                "max_lines": {
                    "type": "integer",
                    "description": "Maximum number of lines to read. If not provided, reads entire file. Use this for large files or when user asks for 'first N lines'."
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file. Creates a new file or overwrites existing one. Automatically creates backup of existing files. Use this when user asks to create or write a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Full path where the file should be written"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                },
                "encoding": {
                    "type": "string",
                    "description": "File encoding. Default is 'utf-8'.",
                    "default": "utf-8"
                },
                "create_dirs": {
                    "type": "boolean",
                    "description": "Create parent directories if they don't exist. Default is true.",
                    "default": True
                },
                "backup": {
                    "type": "boolean",
                    "description": "Create backup of existing file before overwriting. Default is true.",
                    "default": True
                }
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "append_to_file",
        "description": "Append content to the end of an existing file. Use this when user asks to add content to a file without replacing existing content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Full path to the file"
                },
                "content": {
                    "type": "string",
                    "description": "Content to append"
                },
                "encoding": {
                    "type": "string",
                    "description": "File encoding. Default is 'utf-8'.",
                    "default": "utf-8"
                },
                "create_if_missing": {
                    "type": "boolean",
                    "description": "Create the file if it doesn't exist. Default is true.",
                    "default": True
                }
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "get_file_info",
        "description": "Get detailed information about a file or directory (size, dates, type, permissions, etc.). Use this when user asks about file properties or details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Full path to the file or directory"
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "copy_file",
        "description": "Copy a file to a new location. Use this when user asks to copy, duplicate, or backup a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "description": "Path to the source file"
                },
                "destination": {
                    "type": "string",
                    "description": "Path where the file should be copied to"
                },
                "overwrite": {
                    "type": "boolean",
                    "description": "Whether to overwrite if destination exists. Default is false.",
                    "default": False
                }
            },
            "required": ["source", "destination"]
        }
    },
    {
        "name": "move_file",
        "description": "Move or rename a file. Use this when user asks to move, rename, or relocate a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source": {
                    "type": "string",
                    "description": "Path to the source file"
                },
                "destination": {
                    "type": "string",
                    "description": "New path for the file"
                },
                "overwrite": {
                    "type": "boolean",
                    "description": "Whether to overwrite if destination exists. Default is false.",
                    "default": False
                }
            },
            "required": ["source", "destination"]
        }
    }
]


# Combined tool list
ALL_FILE_TOOLS = FILE_SEARCH_TOOLS + FILE_OPERATION_TOOLS
ALL_TOOLS = ALL_FILE_TOOLS + DOCUMENT_TOOLS + INVOICE_TOOLS + GDRIVE_TOOLS + EMAIL_TOOLS


def get_all_tools() -> List[Dict[str, Any]]:
    """Get all available tool definitions including file, document, and invoice tools."""
    return ALL_TOOLS


def get_file_tools() -> List[Dict[str, Any]]:
    """Get only file operation tools."""
    return ALL_FILE_TOOLS


def get_document_tools() -> List[Dict[str, Any]]:
    """Get only document manipulation tools (PDF, DOCX, Excel)."""
    return DOCUMENT_TOOLS


def get_invoice_tools() -> List[Dict[str, Any]]:
    """Get only invoice generation tools."""
    return INVOICE_TOOLS


def get_gdrive_tools() -> List[Dict[str, Any]]:
    """Get only Google Drive tools."""
    return GDRIVE_TOOLS


def get_pdf_tools() -> List[Dict[str, Any]]:
    """Get only PDF tools."""
    return PDF_TOOLS


def get_email_tools() -> List[Dict[str, Any]]:
    """Get only email tools."""
    return EMAIL_TOOLS


def get_tool_by_name(tool_name: str) -> Dict[str, Any]:
    """Get a specific tool definition by name."""
    for tool in ALL_TOOLS:
        if tool["name"] == tool_name:
            return tool
    raise ValueError(f"Tool '{tool_name}' not found")
