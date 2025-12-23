"""
Tool executor for handling Claude's tool calls.

Maps Claude's tool call requests to actual Python function executions.
"""

import logging
from typing import Dict, Any
from app.tools.files import (
    file_search_tool,
    file_operations_tool,
    execute_document_tool,
    execute_pdf_tool
)
from app.tools.invoicing.invoice_tools import execute_invoice_tool
from app.tools.gdrive import execute_gdrive_tool
from app.tools.email.email_tools import execute_email_tool

logger = logging.getLogger(__name__)


class ToolExecutor:
    """Executes tools based on Claude's tool use requests."""

    def __init__(self):
        """Initialize the tool executor."""
        self.tool_map = {
            # File search tools
            "search_files_by_name": self._search_files_by_name,
            "search_files_by_extension": self._search_files_by_extension,
            "search_recent_files": self._search_recent_files,

            # File operation tools
            "read_file": self._read_file,
            "write_file": self._write_file,
            "append_to_file": self._append_to_file,
            "get_file_info": self._get_file_info,
            "copy_file": self._copy_file,
            "move_file": self._move_file,

            # Document tools - PDF
            "create_pdf": self._execute_document_tool,

            # Document tools - DOCX
            "create_docx": self._execute_document_tool,
            "read_docx": self._execute_document_tool,
            "append_to_docx": self._execute_document_tool,
            "add_table_to_docx": self._execute_document_tool,

            # Document tools - Excel
            "create_excel": self._execute_document_tool,
            "read_excel": self._execute_document_tool,
            "append_to_excel": self._execute_document_tool,
            "update_excel_cell": self._execute_document_tool,
            "get_excel_info": self._execute_document_tool,

            # Invoice tools
            "generate_invoice": self._execute_generate_invoice,
            "save_invoice_template": self._execute_save_invoice_template,
            "load_invoice_template": self._execute_load_invoice_template,
            "list_invoice_templates": self._execute_list_invoice_templates,

            # Google Drive tools
            "read_gdrive_file": self._execute_gdrive_tool,
            "download_gdrive_file": self._execute_gdrive_tool,
            "get_gdrive_metadata": self._execute_gdrive_tool,
            "authenticate_gdrive": self._execute_gdrive_tool,
            "check_gdrive_auth": self._execute_gdrive_tool,
            "revoke_gdrive_auth": self._execute_gdrive_tool,
            "list_gdrive_folder": self._execute_gdrive_tool,
            "download_gdrive_folder_pdfs": self._execute_gdrive_tool,

            # Enhanced PDF tools
            "read_pdf_detailed": self._execute_pdf_tool,
            "merge_pdf_files": self._execute_pdf_tool,
            "split_pdf_file": self._execute_pdf_tool,
            "extract_pdf_pages": self._execute_pdf_tool,

            # Email tools
            "send_email": self._execute_email_tool,
            "check_email_config": self._execute_email_tool,
        }

    async def execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by name with given inputs.

        Args:
            tool_name: Name of the tool to execute
            tool_input: Dictionary of tool parameters

        Returns:
            Dictionary with tool execution results
        """
        logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

        if tool_name not in self.tool_map:
            error_msg = f"Unknown tool: {tool_name}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }

        try:
            # Execute the tool
            tool_function = self.tool_map[tool_name]
            result = await tool_function(**tool_input)

            logger.info(f"Tool {tool_name} executed successfully: {result.get('success', False)}")
            return result

        except Exception as e:
            error_msg = f"Error executing tool {tool_name}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }

    # File Search Tools
    async def _search_files_by_name(
        self,
        query: str,
        search_paths: list = None,
        case_sensitive: bool = False,
        exact_match: bool = False,
        file_type: str = None,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """Search files by name."""
        # Convert file_type "both" to None for the tool
        if file_type == "both":
            file_type = None

        return await file_search_tool.search_by_name(
            query=query,
            search_paths=search_paths,
            case_sensitive=case_sensitive,
            exact_match=exact_match,
            file_type=file_type,
            max_results=max_results
        )

    async def _search_files_by_extension(
        self,
        extension: str,
        search_paths: list = None,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """Search files by extension."""
        return await file_search_tool.search_by_extension(
            extension=extension,
            search_paths=search_paths,
            max_results=max_results
        )

    async def _search_recent_files(
        self,
        hours: int = 24,
        search_paths: list = None,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """Search for recently modified files."""
        return await file_search_tool.search_recent_files(
            search_paths=search_paths,
            hours=hours,
            max_results=max_results
        )

    # File Operation Tools
    async def _read_file(
        self,
        file_path: str,
        encoding: str = "utf-8",
        max_lines: int = None
    ) -> Dict[str, Any]:
        """Read a file."""
        return await file_operations_tool.read_file(
            file_path=file_path,
            encoding=encoding,
            max_lines=max_lines
        )

    async def _write_file(
        self,
        file_path: str,
        content: str,
        encoding: str = "utf-8",
        create_dirs: bool = True,
        backup: bool = True
    ) -> Dict[str, Any]:
        """Write to a file."""
        return await file_operations_tool.write_file(
            file_path=file_path,
            content=content,
            encoding=encoding,
            create_dirs=create_dirs,
            backup=backup
        )

    async def _append_to_file(
        self,
        file_path: str,
        content: str,
        encoding: str = "utf-8",
        create_if_missing: bool = True
    ) -> Dict[str, Any]:
        """Append to a file."""
        return await file_operations_tool.append_to_file(
            file_path=file_path,
            content=content,
            encoding=encoding,
            create_if_missing=create_if_missing
        )

    async def _get_file_info(
        self,
        file_path: str
    ) -> Dict[str, Any]:
        """Get file information."""
        return await file_operations_tool.get_file_info(
            file_path=file_path
        )

    async def _copy_file(
        self,
        source: str,
        destination: str,
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """Copy a file."""
        return await file_operations_tool.copy_file(
            source=source,
            destination=destination,
            overwrite=overwrite
        )

    async def _move_file(
        self,
        source: str,
        destination: str,
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """Move a file."""
        return await file_operations_tool.move_file(
            source=source,
            destination=destination,
            overwrite=overwrite
        )

    # Document Tools (PDF, DOCX, Excel)
    async def _execute_document_tool(self, **kwargs) -> Dict[str, Any]:
        """
        Execute a document tool via the modular document tool executor.

        This is a generic handler that delegates to execute_document_tool
        which will route to the appropriate tool (PDF, DOCX, or Excel).

        The tool name is extracted from the call stack to determine which
        document operation to perform.
        """
        import inspect

        # Get the tool name from the call stack
        # The stack looks like: execute_tool -> tool_function (from tool_map) -> this method
        frame = inspect.currentframe()
        if frame and frame.f_back and frame.f_back.f_back:
            # Get the tool_name from execute_tool's local variables
            tool_name = frame.f_back.f_back.f_locals.get('tool_name')
            if tool_name:
                return await execute_document_tool(tool_name, kwargs)

        return {
            "success": False,
            "error": "Could not determine document tool name"
        }

    # Invoice Tools
    async def _execute_generate_invoice(self, **kwargs) -> Dict[str, Any]:
        """Execute generate_invoice tool."""
        return await execute_invoice_tool("generate_invoice", kwargs)

    async def _execute_save_invoice_template(self, **kwargs) -> Dict[str, Any]:
        """Execute save_invoice_template tool."""
        return await execute_invoice_tool("save_invoice_template", kwargs)

    async def _execute_load_invoice_template(self, **kwargs) -> Dict[str, Any]:
        """Execute load_invoice_template tool."""
        return await execute_invoice_tool("load_invoice_template", kwargs)

    async def _execute_list_invoice_templates(self, **kwargs) -> Dict[str, Any]:
        """Execute list_invoice_templates tool."""
        return await execute_invoice_tool("list_invoice_templates", kwargs)

    # Google Drive Tools
    async def _execute_gdrive_tool(self, **kwargs) -> Dict[str, Any]:
        """
        Execute a Google Drive tool via the modular Google Drive tool executor.

        This is a generic handler that delegates to execute_gdrive_tool
        which will route to the appropriate Google Drive operation.
        """
        import inspect

        # Get the tool name from the call stack
        frame = inspect.currentframe()
        if frame and frame.f_back and frame.f_back.f_back:
            # Get the tool_name from execute_tool's local variables
            tool_name = frame.f_back.f_back.f_locals.get('tool_name')
            if tool_name:
                return await execute_gdrive_tool(tool_name, kwargs)

        return {
            "success": False,
            "error": "Could not determine Google Drive tool name"
        }

    # Enhanced PDF Tools
    async def _execute_pdf_tool(self, **kwargs) -> Dict[str, Any]:
        """
        Execute an enhanced PDF tool via the PDF tool executor.

        This is a generic handler that delegates to execute_pdf_tool
        which will route to the appropriate PDF operation.
        """
        import inspect

        # Get the tool name from the call stack
        frame = inspect.currentframe()
        if frame and frame.f_back and frame.f_back.f_back:
            # Get the tool_name from execute_tool's local variables
            tool_name = frame.f_back.f_back.f_locals.get('tool_name')
            if tool_name:
                return await execute_pdf_tool(tool_name, kwargs)

        return {
            "success": False,
            "error": "Could not determine PDF tool name"
        }

    # Email Tools
    async def _execute_email_tool(self, **kwargs) -> Dict[str, Any]:
        """
        Execute an email tool via the email tool executor.

        This is a generic handler that delegates to execute_email_tool
        which will route to the appropriate email operation.
        """
        import inspect

        # Get the tool name from the call stack
        frame = inspect.currentframe()
        if frame and frame.f_back and frame.f_back.f_back:
            # Get the tool_name from execute_tool's local variables
            tool_name = frame.f_back.f_back.f_locals.get('tool_name')
            if tool_name:
                return await execute_email_tool(tool_name, kwargs)

        return {
            "success": False,
            "error": "Could not determine email tool name"
        }


# Singleton instance
tool_executor = ToolExecutor()
