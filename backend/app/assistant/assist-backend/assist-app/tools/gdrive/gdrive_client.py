"""
Google Drive client for reading and downloading files.

Handles HTTP requests to Google Drive to fetch file content.
Supports both public access and OAuth-authenticated access for private files.
"""

import logging
from typing import Dict, Any, Optional, List
import httpx
from pathlib import Path
from .link_parser import GDriveLinkParser
from .oauth_manager import GDriveOAuthManager

logger = logging.getLogger(__name__)


class GDriveClient:
    """Client for interacting with Google Drive files."""

    def __init__(self, use_auth: bool = True):
        """
        Initialize the Google Drive client.

        Args:
            use_auth: Whether to use OAuth authentication for private files
        """
        self.parser = GDriveLinkParser()
        self.timeout = 60.0  # 60 seconds timeout
        self.use_auth = use_auth
        self.oauth_manager = GDriveOAuthManager() if use_auth else None

    async def read_file_from_link(
        self,
        url: str,
        export_format: Optional[str] = None,
        use_auth: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Read content from a Google Drive link.

        Args:
            url: Google Drive URL
            export_format: Optional export format (pdf, docx, txt, etc.)
            use_auth: Override default auth setting for this request

        Returns:
            Dictionary with success status, content, and metadata
        """
        try:
            # Parse the link
            link_info = self.parser.parse_link(url)

            if not link_info['is_valid']:
                return {
                    'success': False,
                    'error': 'Invalid Google Drive URL'
                }

            file_id = link_info['file_id']
            file_type = link_info['file_type']

            # Determine the export format
            if export_format is None:
                export_format = self._get_default_export_format(file_type)

            # Determine whether to use authentication
            should_use_auth = use_auth if use_auth is not None else self.use_auth

            # Try authenticated access first if enabled
            if should_use_auth and self.oauth_manager:
                try:
                    if self.oauth_manager.is_authenticated():
                        logger.info(f"Attempting authenticated access for file {file_id}")
                        return await self._read_with_auth(file_id, file_type, export_format)
                    else:
                        logger.info("No OAuth session available. Skipping authentication.")
                except Exception as auth_error:
                    logger.warning(f"Authenticated access failed: {auth_error}. Falling back to public access.")

            # Fall back to public access
            logger.info(f"Attempting public access for file {file_id}")
            return await self._read_without_auth(file_id, file_type, export_format, url)

        except Exception as e:
            error_msg = f'Error reading file: {str(e)}'
            logger.error(error_msg, exc_info=True)
            return {
                'success': False,
                'error': error_msg
            }

    async def list_folder_files_from_link(
        self,
        url: str,
        mime_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        List files within a Google Drive folder link.
        Requires OAuth authentication for private folders.
        """
        link_info = self.parser.parse_link(url)
        if not link_info['is_valid'] or link_info['file_type'] != 'folder':
            return {
                'success': False,
                'error': 'Invalid folder link'
            }

        if not self.oauth_manager:
            return {
                'success': False,
                'error': 'Google Drive OAuth not configured.'
            }

        if not self.oauth_manager.is_authenticated():
            return {
                'success': False,
                'error': 'Google Drive OAuth not authenticated. Please authenticate using the Settings panel first.'
            }

        return self.oauth_manager.list_folder_files(link_info['file_id'], mime_types)

    async def download_folder_pdfs(
        self,
        url: str,
        destination_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Download all PDFs from a Drive folder.

        Args:
            url: Folder share link
            destination_dir: Optional destination directory
        """
        link_info = self.parser.parse_link(url)
        if not link_info['is_valid'] or link_info['file_type'] != 'folder':
            return {
                'success': False,
                'error': 'Invalid folder link'
            }

        if not self.oauth_manager:
            return {
                'success': False,
                'error': 'Google Drive OAuth not configured.'
            }

        if not self.oauth_manager.is_authenticated():
            return {
                'success': False,
                'error': 'Google Drive OAuth not authenticated. Please authenticate using the Settings panel first.'
            }

        folder_id = link_info['file_id']
        list_result = self.oauth_manager.list_folder_files(
            folder_id,
            mime_types=[
                'application/pdf',
                'application/vnd.google-apps.document',
                'application/vnd.google-apps.presentation',
                'application/vnd.google-apps.spreadsheet'
            ]
        )

        if not list_result.get('success'):
            return list_result

        files = list_result.get('files', [])
        if not files:
            return {
                'success': False,
                'error': 'No PDF-compatible files found in folder'
            }

        base_dir = Path(__file__).parent.parent.parent.parent / 'data' / 'gdrive_downloads'
        target_dir = Path(destination_dir) if destination_dir else base_dir / folder_id
        target_dir.mkdir(parents=True, exist_ok=True)

        downloaded = []
        errors = []
        for f in files:
            name = f.get('name') or f.get('id')
            safe_name = (name or 'file').replace('/', '_').replace('\\', '_')
            file_id = f.get('id')
            # Ensure PDF extension for Google Docs export
            outfile = target_dir / (safe_name if safe_name.lower().endswith('.pdf') else f"{safe_name}.pdf")
            result = self.oauth_manager.download_file_to_path(
                file_id=file_id,
                destination_path=str(outfile),
                export_mime_type='application/pdf'
            )
            if result.get('success'):
                downloaded.append({
                    'id': file_id,
                    'name': name,
                    'path': result['path'],
                    'size': result.get('size', 0)
                })
            else:
                errors.append({
                    'id': file_id,
                    'name': name,
                    'error': result.get('error', 'Unknown error')
                })

        return {
            'success': len(downloaded) > 0,
            'downloaded': downloaded,
            'failed': errors,
            'folder_id': folder_id,
            'destination': str(target_dir.absolute()),
            'message': f"Downloaded {len(downloaded)} files" if downloaded else 'No files downloaded'
        }

    async def _read_with_auth(
        self,
        file_id: str,
        file_type: str,
        export_format: str
    ) -> Dict[str, Any]:
        """
        Read file using OAuth authentication.

        Args:
            file_id: Google Drive file ID
            file_type: Type of file
            export_format: Export format

        Returns:
            Dictionary with file content and metadata
        """
        result = self.oauth_manager.download_file(file_id)

        if not result['success']:
            raise Exception(result.get('error', 'Failed to download with auth'))

        content = result['content']
        metadata = result['metadata']

        # Determine if content is binary
        mime_type = metadata.get('mimeType', '')
        is_binary = not mime_type.startswith('text/') and export_format not in ['txt', 'csv']

        return {
            'success': True,
            'content': content,
            'file_id': file_id,
            'file_type': file_type,
            'export_format': export_format,
            'content_type': mime_type,
            'is_binary': is_binary,
            'size': len(content) if isinstance(content, (str, bytes)) else 0,
            'auth_used': True,
            'metadata': metadata
        }

    async def _read_without_auth(
        self,
        file_id: str,
        file_type: str,
        export_format: str,
        original_url: str
    ) -> Dict[str, Any]:
        """
        Read file using public access (no authentication).

        Args:
            file_id: Google Drive file ID
            file_type: Type of file
            export_format: Export format
            original_url: Original URL for error messages

        Returns:
            Dictionary with file content and metadata
        """
        try:
            # Get the appropriate URL
            if file_type in ['document', 'spreadsheet', 'presentation']:
                download_url = self.parser.get_export_url(file_id, file_type, export_format)
            else:
                download_url = self.parser.get_direct_download_url(file_id)

            # Fetch the content
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(download_url)
                response.raise_for_status()

                # Get content type
                content_type = response.headers.get('content-type', '')

                # Handle text content
                if 'text' in content_type or export_format in ['txt', 'csv']:
                    content = response.text
                    is_binary = False
                else:
                    content = response.content
                    is_binary = True

                return {
                    'success': True,
                    'content': content,
                    'file_id': file_id,
                    'file_type': file_type,
                    'export_format': export_format,
                    'content_type': content_type,
                    'is_binary': is_binary,
                    'size': len(content) if isinstance(content, (str, bytes)) else 0,
                    'auth_used': False
                }

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                error_msg = (
                    f'HTTP 403 Forbidden: This file is private and requires authentication. '
                    f'Please authenticate with Google Drive using OAuth to access private files.'
                )
            elif e.response.status_code == 404:
                error_msg = f'HTTP 404 Not Found: File does not exist or is not accessible.'
            else:
                error_msg = f'HTTP error {e.response.status_code}: {str(e)}'
            logger.error(error_msg)
            raise Exception(error_msg)

        except httpx.RequestError as e:
            error_msg = f'Request error: {str(e)}'
            logger.error(error_msg)
            raise Exception(error_msg)

    async def download_file_from_link(
        self,
        url: str,
        destination_path: str,
        export_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Download a file from a Google Drive link to local storage.

        Args:
            url: Google Drive URL
            destination_path: Local path to save the file
            export_format: Optional export format (pdf, docx, xlsx, etc.)

        Returns:
            Dictionary with success status and file metadata
        """
        try:
            # Read the file content
            result = await self.read_file_from_link(url, export_format)

            if not result['success']:
                return result

            # Ensure destination directory exists
            dest_path = Path(destination_path)
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            # Write the content to file
            content = result['content']
            if result['is_binary']:
                with open(destination_path, 'wb') as f:
                    f.write(content)
            else:
                with open(destination_path, 'w', encoding='utf-8') as f:
                    f.write(content)

            return {
                'success': True,
                'file_path': str(dest_path.absolute()),
                'file_id': result['file_id'],
                'file_type': result['file_type'],
                'export_format': result['export_format'],
                'size': result['size'],
                'message': f'File downloaded successfully to {destination_path}'
            }

        except Exception as e:
            error_msg = f'Error downloading file: {str(e)}'
            logger.error(error_msg, exc_info=True)
            return {
                'success': False,
                'error': error_msg
            }

    async def get_file_metadata(self, url: str) -> Dict[str, Any]:
        """
        Get metadata about a Google Drive file without downloading it.

        Args:
            url: Google Drive URL

        Returns:
            Dictionary with file metadata
        """
        try:
            link_info = self.parser.parse_link(url)

            if not link_info['is_valid']:
                return {
                    'success': False,
                    'error': 'Invalid Google Drive URL'
                }

            return {
                'success': True,
                'file_id': link_info['file_id'],
                'file_type': link_info['file_type'],
                'original_url': link_info['original_url']
            }

        except Exception as e:
            error_msg = f'Error getting metadata: {str(e)}'
            logger.error(error_msg, exc_info=True)
            return {
                'success': False,
                'error': error_msg
            }

    def _get_default_export_format(self, file_type: str) -> str:
        """
        Get the default export format for a file type.

        Args:
            file_type: Type of Google Drive file

        Returns:
            Default export format
        """
        defaults = {
            'document': 'txt',
            'spreadsheet': 'csv',
            'presentation': 'pdf',
            'form': 'pdf'
        }
        return defaults.get(file_type, 'pdf')

    def authenticate(self) -> Dict[str, Any]:
        """
        Trigger OAuth authentication flow.

        Returns:
            Dictionary with authentication status
        """
        if not self.oauth_manager:
            return {
                'success': False,
                'error': 'OAuth is not enabled for this client'
            }

        try:
            credentials = self.oauth_manager.authenticate()
            return {
                'success': True,
                'message': 'Successfully authenticated with Google Drive',
                'authenticated': True
            }
        except Exception as e:
            error_msg = f'Authentication failed: {str(e)}'
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg,
                'authenticated': False
            }

    def get_auth_status(self) -> Dict[str, Any]:
        """
        Get current authentication status.

        Returns:
            Dictionary with authentication status
        """
        if not self.oauth_manager:
            return {
                'success': True,
                'authenticated': False,
                'message': 'OAuth authentication is not enabled'
            }

        is_authenticated = self.oauth_manager.is_authenticated()
        return {
            'success': True,
            'authenticated': is_authenticated,
            'message': 'Authenticated' if is_authenticated else 'Not authenticated'
        }

    def revoke_auth(self) -> Dict[str, Any]:
        """
        Revoke OAuth credentials.

        Returns:
            Dictionary with revocation status
        """
        if not self.oauth_manager:
            return {
                'success': False,
                'error': 'OAuth is not enabled for this client'
            }

        try:
            self.oauth_manager.revoke_credentials()
            return {
                'success': True,
                'message': 'Successfully revoked authentication'
            }
        except Exception as e:
            error_msg = f'Failed to revoke authentication: {str(e)}'
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
