"""
Excel tool definitions and executor.

Provides tools for creating, reading, and manipulating Excel spreadsheets.
"""

import logging
from typing import Dict, Any
from .operations import excel_operations_tool

logger = logging.getLogger(__name__)


# Excel tools
EXCEL_TOOLS = [
    {
        "name": "create_excel",
        "description": "Create a new Excel spreadsheet (.xlsx) with data. The first row can optionally be formatted as a header.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path where the Excel file should be saved (e.g., 'data/spreadsheet.xlsx')"
                },
                "data": {
                    "type": "array",
                    "items": {
                        "type": "array"
                    },
                    "description": "2D array of data (rows and columns)"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Name for the worksheet (default: 'Sheet1')"
                },
                "has_header": {
                    "type": "boolean",
                    "description": "Whether the first row should be formatted as a header"
                }
            },
            "required": ["file_path", "data"]
        }
    },
    {
        "name": "read_excel",
        "description": "Read data from an Excel spreadsheet. Returns the data as a 2D array along with metadata.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Excel file to read"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Optional specific sheet to read (reads active sheet if not specified)"
                },
                "max_rows": {
                    "type": "integer",
                    "description": "Optional maximum number of rows to read"
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "append_to_excel",
        "description": "Append rows to an existing Excel spreadsheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Excel file"
                },
                "data": {
                    "type": "array",
                    "items": {
                        "type": "array"
                    },
                    "description": "2D array of rows to append"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Optional sheet name (uses active sheet if not specified)"
                }
            },
            "required": ["file_path", "data"]
        }
    },
    {
        "name": "update_excel_cell",
        "description": "Update a specific cell in an Excel spreadsheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Excel file"
                },
                "row": {
                    "type": "integer",
                    "description": "Row number (1-indexed)"
                },
                "column": {
                    "description": "Column number (1-indexed) or letter (e.g., 'A', 'B')"
                },
                "value": {
                    "description": "New value for the cell"
                },
                "sheet_name": {
                    "type": "string",
                    "description": "Optional sheet name"
                }
            },
            "required": ["file_path", "row", "column", "value"]
        }
    },
    {
        "name": "get_excel_info",
        "description": "Get information about an Excel file including sheets, rows, and columns.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the Excel file"
                }
            },
            "required": ["file_path"]
        }
    }
]


# Tool function mapping
EXCEL_TOOL_MAP = {
    "create_excel": excel_operations_tool.create_excel,
    "read_excel": excel_operations_tool.read_excel,
    "append_to_excel": excel_operations_tool.append_to_excel,
    "update_excel_cell": excel_operations_tool.update_cell,
    "get_excel_info": excel_operations_tool.get_excel_info,
}


async def execute_excel_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an Excel tool.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool

    Returns:
        Result dictionary from the tool execution
    """
    try:
        if tool_name not in EXCEL_TOOL_MAP:
            return {
                "success": False,
                "error": f"Unknown Excel tool: {tool_name}"
            }

        logger.info(f"Executing Excel tool: {tool_name}")
        tool_func = EXCEL_TOOL_MAP[tool_name]
        result = await tool_func(**tool_input)
        logger.info(f"Excel tool {tool_name} completed: {result.get('success', False)}")
        return result

    except Exception as e:
        logger.error(f"Error executing Excel tool {tool_name}: {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool execution error: {str(e)}"
        }
