"""
Google Drive link parser.

Extracts file IDs and metadata from Google Drive URLs.
"""

import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs


class GDriveLinkParser:
    """Parse Google Drive links to extract file IDs."""

    # Various Google Drive URL patterns
    PATTERNS = [
        # https://drive.google.com/file/d/FILE_ID/view
        r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',
        # https://drive.google.com/open?id=FILE_ID
        r'drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)',
        # https://drive.google.com/drive/folders/FOLDER_ID
        r'drive\.google\.com/drive/folders/([a-zA-Z0-9_-]+)',
        # https://drive.google.com/drive/u/0/folders/FOLDER_ID
        r'drive\.google\.com/drive/u/\d+/folders/([a-zA-Z0-9_-]+)',
        # https://drive.google.com/folderview?id=FOLDER_ID
        r'drive\.google\.com/folderview\?id=([a-zA-Z0-9_-]+)',
        # https://docs.google.com/document/d/FILE_ID
        r'docs\.google\.com/document/d/([a-zA-Z0-9_-]+)',
        # https://docs.google.com/spreadsheets/d/FILE_ID
        r'docs\.google\.com/spreadsheets/d/([a-zA-Z0-9_-]+)',
        # https://docs.google.com/presentation/d/FILE_ID
        r'docs\.google\.com/presentation/d/([a-zA-Z0-9_-]+)',
        # https://docs.google.com/forms/d/FILE_ID
        r'docs\.google\.com/forms/d/([a-zA-Z0-9_-]+)',
    ]

    @classmethod
    def is_gdrive_link(cls, url: str) -> bool:
        """
        Check if a URL is a Google Drive link.

        Args:
            url: URL to check

        Returns:
            True if the URL is a Google Drive link
        """
        return any(re.search(pattern, url) for pattern in cls.PATTERNS)

    @classmethod
    def extract_file_id(cls, url: str) -> Optional[str]:
        """
        Extract file ID from a Google Drive URL.

        Args:
            url: Google Drive URL

        Returns:
            File ID if found, None otherwise
        """
        # Try pattern matching
        for pattern in cls.PATTERNS:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        # Try query parameter
        try:
            parsed = urlparse(url)
            query_params = parse_qs(parsed.query)
            if 'id' in query_params:
                return query_params['id'][0]
        except Exception:
            pass

        return None

    @classmethod
    def get_file_type(cls, url: str) -> Optional[str]:
        """
        Determine the file type from the URL.

        Args:
            url: Google Drive URL

        Returns:
            File type (document, spreadsheet, presentation, form, file) or None
        """
        if 'docs.google.com/document' in url:
            return 'document'
        elif 'docs.google.com/spreadsheets' in url:
            return 'spreadsheet'
        elif 'docs.google.com/presentation' in url:
            return 'presentation'
        elif 'docs.google.com/forms' in url:
            return 'form'
        elif 'drive.google.com/drive/folders' in url or 'folderview?id=' in url:
            return 'folder'
        elif 'drive.google.com/file' in url or 'drive.google.com/open' in url:
            return 'file'
        return None

    @classmethod
    def parse_link(cls, url: str) -> Dict[str, Any]:
        """
        Parse a Google Drive link and extract all metadata.

        Args:
            url: Google Drive URL

        Returns:
            Dictionary with file_id, file_type, and original_url
        """
        file_id = cls.extract_file_id(url)
        file_type = cls.get_file_type(url)

        return {
            'file_id': file_id,
            'file_type': file_type,
            'original_url': url,
            'is_valid': file_id is not None
        }

    @classmethod
    def get_export_url(cls, file_id: str, file_type: str, export_format: str = 'pdf') -> str:
        """
        Generate an export URL for a Google Drive file.

        Args:
            file_id: Google Drive file ID
            file_type: Type of file (document, spreadsheet, presentation)
            export_format: Export format (pdf, docx, xlsx, pptx, etc.)

        Returns:
            Export URL
        """
        base_urls = {
            'document': f'https://docs.google.com/document/d/{file_id}/export',
            'spreadsheet': f'https://docs.google.com/spreadsheets/d/{file_id}/export',
            'presentation': f'https://docs.google.com/presentation/d/{file_id}/export',
        }

        if file_type in base_urls:
            return f"{base_urls[file_type]}?format={export_format}"
        else:
            # For generic files, use the direct download URL
            return f'https://drive.google.com/uc?export=download&id={file_id}'

    @classmethod
    def get_direct_download_url(cls, file_id: str) -> str:
        """
        Get direct download URL for a file.

        Args:
            file_id: Google Drive file ID

        Returns:
            Direct download URL
        """
        return f'https://drive.google.com/uc?export=download&id={file_id}'
