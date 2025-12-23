"""
Google Drive tool definitions and executor.

Defines the tools that Claude can use to interact with Google Drive files.
"""

import logging
from typing import Dict, Any, List, Optional
from .gdrive_client import GDriveClient
from pathlib import Path

logger = logging.getLogger(__name__)

# Initialize the Google Drive client
gdrive_client = GDriveClient()


# Google Drive Tool Definitions for Claude API
GDRIVE_TOOLS = [
    {
        "name": "read_gdrive_file",
        "description": "Read content from a Google Drive file using its share link. Works with both public and private files (requires authentication for private files). Supports Google Docs, Sheets, Presentations, and regular files.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Google Drive share URL (e.g., https://drive.google.com/file/d/... or https://docs.google.com/document/d/...)"
                },
                "export_format": {
                    "type": "string",
                    "description": "Optional export format. For documents: 'txt', 'docx', 'pdf'. For spreadsheets: 'csv', 'xlsx', 'pdf'. For presentations: 'pdf', 'pptx'. Default is text-based format.",
                    "enum": ["txt", "pdf", "docx", "xlsx", "csv", "pptx"]
                }
            },
            "required": ["url"]
        }
    },
    {
        "name": "download_gdrive_file",
        "description": "Download a file from Google Drive to local storage. Works with both public and private files (requires authentication for private files).",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Google Drive share URL"
                },
                "destination_path": {
                    "type": "string",
                    "description": "Local file path where the file should be saved (e.g., 'downloads/document.pdf')"
                },
                "export_format": {
                    "type": "string",
                    "description": "Optional export format for Google Docs/Sheets/Slides. For documents: 'txt', 'docx', 'pdf'. For spreadsheets: 'csv', 'xlsx', 'pdf'. For presentations: 'pdf', 'pptx'.",
                    "enum": ["txt", "pdf", "docx", "xlsx", "csv", "pptx"]
                }
            },
            "required": ["url", "destination_path"]
        }
    },
    {
        "name": "get_gdrive_metadata",
        "description": "Get metadata about a Google Drive file from its share link without downloading it. Returns file ID, type, and URL information.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Google Drive share URL"
                }
            },
            "required": ["url"]
        }
    },
    {
        "name": "authenticate_gdrive",
        "description": "Authenticate with Google Drive using OAuth 2.0. This is required to access private or shared files. Opens a browser window for user to grant permissions.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "check_gdrive_auth",
        "description": "Check the current Google Drive authentication status. Returns whether the user is authenticated and can access private files.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "revoke_gdrive_auth",
        "description": "Revoke Google Drive authentication and delete stored credentials. Use when the user wants to disconnect their Google account.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "list_gdrive_folder",
        "description": "List files inside a Google Drive folder (requires OAuth). Use to discover PDFs before downloading/merging.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Google Drive folder share URL"
                }
            },
            "required": ["url"]
        }
    },
    {
        "name": "download_gdrive_folder_pdfs",
        "description": "Download all PDF-compatible files (PDFs and Google Docs exported as PDF) from a Drive folder to local storage (requires OAuth).",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Google Drive folder share URL"
                },
                "destination_dir": {
                    "type": "string",
                    "description": "Optional destination directory. Defaults to backend/data/gdrive_downloads/<folder_id>"
                }
            },
            "required": ["url"]
        }
    }
]


async def execute_gdrive_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a Google Drive tool.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Dictionary of tool parameters

    Returns:
        Dictionary with tool execution results
    """
    logger.info(f"Executing Google Drive tool: {tool_name}")

    try:
        if tool_name == "read_gdrive_file":
            return await _read_gdrive_file(**tool_input)
        elif tool_name == "download_gdrive_file":
            return await _download_gdrive_file(**tool_input)
        elif tool_name == "get_gdrive_metadata":
            return await _get_gdrive_metadata(**tool_input)
        elif tool_name == "authenticate_gdrive":
            return _authenticate_gdrive()
        elif tool_name == "check_gdrive_auth":
            return _check_gdrive_auth()
        elif tool_name == "revoke_gdrive_auth":
            return _revoke_gdrive_auth()
        elif tool_name == "list_gdrive_folder":
            return await _list_gdrive_folder(**tool_input)
        elif tool_name == "download_gdrive_folder_pdfs":
            return await _download_gdrive_folder_pdfs(**tool_input)
        else:
            return {
                "success": False,
                "error": f"Unknown Google Drive tool: {tool_name}"
            }

    except Exception as e:
        error_msg = f"Error executing {tool_name}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "success": False,
            "error": error_msg
        }


async def _read_gdrive_file(url: str, export_format: Optional[str] = None) -> Dict[str, Any]:
    """
    Read content from a Google Drive file.

    Args:
        url: Google Drive URL
        export_format: Optional export format

    Returns:
        Dictionary with file content and metadata
    """
    result = await gdrive_client.read_file_from_link(url, export_format)

    if result['success']:
        # For text content, include it in the result
        if not result['is_binary']:
            return {
                'success': True,
                'content': result['content'],
                'file_id': result['file_id'],
                'file_type': result['file_type'],
                'export_format': result['export_format'],
                'size': result['size'],
                'message': f"Successfully read {result['file_type']} file (File ID: {result['file_id']})"
            }
        else:
            # For binary content, just return metadata
            return {
                'success': True,
                'file_id': result['file_id'],
                'file_type': result['file_type'],
                'export_format': result['export_format'],
                'size': result['size'],
                'is_binary': True,
                'message': f"File is binary format ({result['export_format']}). Use download_gdrive_file to save it locally."
            }

    return result


async def _download_gdrive_file(
    url: str,
    destination_path: str,
    export_format: Optional[str] = None
) -> Dict[str, Any]:
    """
    Download a file from Google Drive.

    Args:
        url: Google Drive URL
        destination_path: Local path to save the file
        export_format: Optional export format

    Returns:
        Dictionary with download results
    """
    # Ensure the destination path is relative to the backend/data directory for safety
    base_dir = Path(__file__).parent.parent.parent.parent / 'data' / 'gdrive_downloads'

    # Create the full path
    if Path(destination_path).is_absolute():
        # If absolute path is provided, use it as-is (but log a warning)
        logger.warning(f"Absolute path provided: {destination_path}")
        full_path = Path(destination_path)
    else:
        # If relative path, make it relative to our gdrive_downloads directory
        full_path = base_dir / destination_path

    result = await gdrive_client.download_file_from_link(url, str(full_path), export_format)

    return result


async def _get_gdrive_metadata(url: str) -> Dict[str, Any]:
    """
    Get metadata about a Google Drive file.

    Args:
        url: Google Drive URL

    Returns:
        Dictionary with file metadata
    """
    result = await gdrive_client.get_file_metadata(url)

    if result['success']:
        return {
            'success': True,
            'file_id': result['file_id'],
            'file_type': result['file_type'],
            'original_url': result['original_url'],
            'message': f"File ID: {result['file_id']}, Type: {result['file_type']}"
        }

    return result


def _authenticate_gdrive() -> Dict[str, Any]:
    """
    Authenticate with Google Drive using OAuth 2.0.

    Returns:
        Dictionary with authentication status
    """
    result = gdrive_client.authenticate()

    if result['success']:
        return {
            'success': True,
            'message': 'Successfully authenticated with Google Drive. You can now access private and shared files.',
            'authenticated': True
        }

    return result


def _check_gdrive_auth() -> Dict[str, Any]:
    """
    Check Google Drive authentication status.

    Returns:
        Dictionary with authentication status
    """
    result = gdrive_client.get_auth_status()

    if result['authenticated']:
        return {
            'success': True,
            'authenticated': True,
            'message': 'You are authenticated with Google Drive and can access private files.'
        }
    else:
        return {
            'success': True,
            'authenticated': False,
            'message': 'You are not authenticated. Use authenticate_gdrive to access private files.'
        }


def _revoke_gdrive_auth() -> Dict[str, Any]:
    """
    Revoke Google Drive authentication.

    Returns:
        Dictionary with revocation status
    """
    result = gdrive_client.revoke_auth()

    if result['success']:
        return {
            'success': True,
            'message': 'Successfully revoked Google Drive authentication and deleted credentials.'
        }

    return result


async def _list_gdrive_folder(url: str) -> Dict[str, Any]:
    """
    List files inside a Google Drive folder.

    Args:
        url: Folder share link
    """
    return await gdrive_client.list_folder_files_from_link(url)


async def _download_gdrive_folder_pdfs(
    url: str,
    destination_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Download all PDFs (and Google Docs exported as PDF) from a Drive folder.
    """
    return await gdrive_client.download_folder_pdfs(url, destination_dir)
