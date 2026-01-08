"""
DOCX (Word) tool definitions and executor.

Provides tools for creating, reading, and manipulating Word documents.
"""

import logging
from typing import Dict, Any
from .operations import docx_operations_tool

logger = logging.getLogger(__name__)


# DOCX tools
DOCX_TOOLS = [
    {
        "name": "create_docx",
        "description": "Create a new Word document (.docx) with text content. Supports adding metadata like title, author, and subject.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path where the Word document should be saved (e.g., 'documents/report.docx')"
                },
                "content": {
                    "type": "string",
                    "description": "Text content to include in the document. Use double newlines (\\n\\n) to separate paragraphs."
                },
                "title": {
                    "type": "string",
                    "description": "Optional document title"
                },
                "author": {
                    "type": "string",
                    "description": "Optional document author"
                },
                "subject": {
                    "type": "string",
                    "description": "Optional document subject"
                }
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "read_docx",
        "description": "Read and extract text content from a Word document (.docx). Returns the text content, tables, and metadata.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Word document to read"
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "append_to_docx",
        "description": "Append text content to an existing Word document. Optionally add a heading before the content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Word document"
                },
                "content": {
                    "type": "string",
                    "description": "Text content to append"
                },
                "heading": {
                    "type": "string",
                    "description": "Optional heading to add before the content"
                }
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "add_table_to_docx",
        "description": "Add a table to an existing Word document.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Word document"
                },
                "table_data": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "description": "2D array of table data (rows and columns)"
                },
                "has_header": {
                    "type": "boolean",
                    "description": "Whether the first row should be formatted as a header"
                }
            },
            "required": ["file_path", "table_data"]
        }
    }
]


# Tool function mapping
DOCX_TOOL_MAP = {
    "create_docx": docx_operations_tool.create_docx,
    "read_docx": docx_operations_tool.read_docx,
    "append_to_docx": docx_operations_tool.append_to_docx,
    "add_table_to_docx": docx_operations_tool.add_table_to_docx,
}


async def execute_docx_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a DOCX tool.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool

    Returns:
        Result dictionary from the tool execution
    """
    try:
        if tool_name not in DOCX_TOOL_MAP:
            return {
                "success": False,
                "error": f"Unknown DOCX tool: {tool_name}"
            }

        logger.info(f"Executing DOCX tool: {tool_name}")
        tool_func = DOCX_TOOL_MAP[tool_name]
        result = await tool_func(**tool_input)
        logger.info(f"DOCX tool {tool_name} completed: {result.get('success', False)}")
        return result

    except Exception as e:
        logger.error(f"Error executing DOCX tool {tool_name}: {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool execution error: {str(e)}"
        }
