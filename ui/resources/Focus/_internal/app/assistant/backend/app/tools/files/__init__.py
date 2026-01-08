"""
File and document manipulation tools.

Unified module containing all file-related operations organized by file type:
- pdf/: PDF operations and tools
- docx/: Word document operations and tools
- excel/: Excel spreadsheet operations and tools
- general/: General file operations and search
"""

from .pdf import (
    PDF_TOOLS,
    execute_pdf_tool,
    pdf_tools
)
from .docx import (
    DOCX_TOOLS,
    execute_docx_tool,
    docx_operations_tool
)
from .excel import (
    EXCEL_TOOLS,
    execute_excel_tool,
    excel_operations_tool
)
from .general import (
    file_operations_tool,
    file_search_tool
)

# Combine all document tools
DOCUMENT_TOOLS = PDF_TOOLS + DOCX_TOOLS + EXCEL_TOOLS


# Unified executor for document tools
async def execute_document_tool(tool_name: str, tool_input: dict) -> dict:
    """
    Execute any document tool (PDF, DOCX, Excel).

    Routes to the appropriate executor based on tool name.
    """
    # PDF tools
    if tool_name in ["create_pdf", "read_pdf_detailed", "merge_pdf_files", "split_pdf_file", "extract_pdf_pages"]:
        return await execute_pdf_tool(tool_name, tool_input)

    # DOCX tools
    elif tool_name in ["create_docx", "read_docx", "append_to_docx", "add_table_to_docx"]:
        return await execute_docx_tool(tool_name, tool_input)

    # Excel tools
    elif tool_name in ["create_excel", "read_excel", "append_to_excel", "update_excel_cell", "get_excel_info"]:
        return await execute_excel_tool(tool_name, tool_input)

    else:
        return {
            "success": False,
            "error": f"Unknown document tool: {tool_name}"
        }


__all__ = [
    # Combined tools
    'DOCUMENT_TOOLS',

    # Individual tool lists
    'PDF_TOOLS',
    'DOCX_TOOLS',
    'EXCEL_TOOLS',

    # Executors
    'execute_document_tool',
    'execute_pdf_tool',
    'execute_docx_tool',
    'execute_excel_tool',

    # PDF tools instance
    'pdf_tools',

    # Operations (for backward compatibility)
    'docx_operations_tool',
    'excel_operations_tool',
    'file_operations_tool',
    'file_search_tool',
]
