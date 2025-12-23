"""
Google Drive Client Service

Client for interacting with Google Drive API.
Supports Drive files including Docs, Sheets, Slides, and other file types.
"""

from typing import List, Optional, Dict, Any
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials

from app.models.google import DriveItem, DriveFileList, DriveSearchQuery, DriveOwner
from app.core.logging import get_logger


logger = get_logger(__name__)


class GoogleDriveClient:
    """
    Client for Google Drive API operations.

    Supports:
    - Listing files (including Docs, Sheets, Slides)
    - Getting file metadata
    - Searching files
    - Downloading files (export for Google Workspace files)
    """

    # Google Workspace MIME types
    MIME_TYPES = {
        "document": "application/vnd.google-apps.document",
        "spreadsheet": "application/vnd.google-apps.spreadsheet",
        "presentation": "application/vnd.google-apps.presentation",
        "folder": "application/vnd.google-apps.folder",
        "form": "application/vnd.google-apps.form",
        "drawing": "application/vnd.google-apps.drawing",
        "site": "application/vnd.google-apps.site",
        "script": "application/vnd.google-apps.script",
    }

    # Export formats for Google Workspace files
    EXPORT_FORMATS = {
        "document": "application/pdf",  # Export Docs as PDF
        "spreadsheet": "application/pdf",  # Export Sheets as PDF
        "presentation": "application/pdf",  # Export Slides as PDF
    }

    # Fields to retrieve for file metadata
    FILE_FIELDS = (
        "id, name, mimeType, kind, webViewLink, webContentLink, "
        "thumbnailLink, iconLink, size, createdTime, modifiedTime, "
        "viewedByMeTime, owners, shared, permissions, starred, trashed, "
        "description, parents"
    )

    def __init__(self, credentials: Credentials):
        """
        Initialize the Drive client.

        Args:
            credentials: Google OAuth credentials
        """
        self.credentials = credentials
        self.service = build('drive', 'v3', credentials=credentials)

    async def list_files(
        self,
        page_size: int = 20,
        page_token: Optional[str] = None,
        query: Optional[str] = None,
        order_by: str = "modifiedTime desc"
    ) -> DriveFileList:
        """
        List files from Google Drive.

        Args:
            page_size: Number of files to return (1-1000)
            page_token: Page token for pagination
            query: Search query in Drive query format
            order_by: Sort order (e.g., "modifiedTime desc", "name")

        Returns:
            DriveFileList: List of Drive files with pagination

        Raises:
            HttpError: If API request fails
        """
        try:
            # Clamp page size
            page_size = min(max(1, page_size), 1000)

            # Build request
            request_params = {
                "pageSize": page_size,
                "fields": f"nextPageToken, files({self.FILE_FIELDS})",
                "orderBy": order_by,
            }

            if page_token:
                request_params["pageToken"] = page_token

            if query:
                request_params["q"] = query

            # Execute request
            results = self.service.files().list(**request_params).execute()

            files = results.get("files", [])
            next_page_token = results.get("nextPageToken")

            # Convert to DriveItem models
            drive_items = [self._parse_drive_item(file) for file in files]

            logger.debug(
                f"Listed {len(drive_items)} Drive files",
                extra={"page_size": page_size, "has_next": bool(next_page_token)}
            )

            return DriveFileList(
                files=drive_items,
                next_page_token=next_page_token,
                total=len(drive_items)  # Note: Drive API doesn't provide total count
            )

        except HttpError as e:
            logger.error(f"Drive API error: {e}", exc_info=True)
            raise

    async def get_file(self, file_id: str) -> Optional[DriveItem]:
        """
        Get metadata for a specific Drive file.

        Args:
            file_id: Google Drive file ID

        Returns:
            DriveItem if found, None if not found

        Raises:
            HttpError: If API request fails
        """
        try:
            file = self.service.files().get(
                fileId=file_id,
                fields=self.FILE_FIELDS
            ).execute()

            drive_item = self._parse_drive_item(file)

            logger.debug(
                f"Retrieved Drive file: {drive_item.name}",
                extra={"file_id": file_id}
            )

            return drive_item

        except HttpError as e:
            if e.resp.status == 404:
                logger.warning(f"Drive file not found: {file_id}")
                return None
            logger.error(f"Drive API error: {e}", exc_info=True)
            raise

    async def search_files(self, search_query: DriveSearchQuery) -> DriveFileList:
        """
        Search files in Google Drive.

        Args:
            search_query: Search query parameters

        Returns:
            DriveFileList: Matching files

        Raises:
            HttpError: If API request fails
        """
        # Build Drive query string
        query_parts = []

        if search_query.query:
            # Search in name and full text
            query_parts.append(f"(name contains '{search_query.query}' or fullText contains '{search_query.query}')")

        if search_query.mime_type:
            query_parts.append(f"mimeType = '{search_query.mime_type}'")

        if search_query.folder_id:
            query_parts.append(f"'{search_query.folder_id}' in parents")

        if not search_query.include_trashed:
            query_parts.append("trashed = false")

        query_string = " and ".join(query_parts) if query_parts else None

        # List files with query
        return await self.list_files(
            page_size=search_query.page_size,
            page_token=search_query.page_token,
            query=query_string,
            order_by=search_query.order_by or "modifiedTime desc"
        )

    async def list_recent_files(
        self,
        page_size: int = 20,
        include_docs: bool = True,
        include_sheets: bool = True,
        include_slides: bool = True,
        include_other: bool = True
    ) -> DriveFileList:
        """
        List recently modified files.

        Args:
            page_size: Number of files to return
            include_docs: Include Google Docs
            include_sheets: Include Google Sheets
            include_slides: Include Google Slides
            include_other: Include other file types

        Returns:
            DriveFileList: Recent files
        """
        # Build MIME type filter
        mime_filters = []
        if include_docs:
            mime_filters.append(f"mimeType = '{self.MIME_TYPES['document']}'")
        if include_sheets:
            mime_filters.append(f"mimeType = '{self.MIME_TYPES['spreadsheet']}'")
        if include_slides:
            mime_filters.append(f"mimeType = '{self.MIME_TYPES['presentation']}'")
        if include_other:
            # Include files that are NOT Google Workspace types
            workspace_types = [
                self.MIME_TYPES['document'],
                self.MIME_TYPES['spreadsheet'],
                self.MIME_TYPES['presentation'],
                self.MIME_TYPES['folder'],
            ]
            workspace_filter = "' and mimeType != '".join(workspace_types)
            mime_filters.append(
                f"(mimeType != '{workspace_filter}')"
            )

        query = None
        if mime_filters:
            query = f"({' or '.join(mime_filters)}) and trashed = false"

        return await self.list_files(
            page_size=page_size,
            query=query,
            order_by="modifiedTime desc"
        )

    async def get_docs(self, page_size: int = 20) -> DriveFileList:
        """Get Google Docs files."""
        return await self.list_files(
            page_size=page_size,
            query=f"mimeType = '{self.MIME_TYPES['document']}' and trashed = false",
            order_by="modifiedTime desc"
        )

    async def get_sheets(self, page_size: int = 20) -> DriveFileList:
        """Get Google Sheets files."""
        return await self.list_files(
            page_size=page_size,
            query=f"mimeType = '{self.MIME_TYPES['spreadsheet']}' and trashed = false",
            order_by="modifiedTime desc"
        )

    async def get_slides(self, page_size: int = 20) -> DriveFileList:
        """Get Google Slides files."""
        return await self.list_files(
            page_size=page_size,
            query=f"mimeType = '{self.MIME_TYPES['presentation']}' and trashed = false",
            order_by="modifiedTime desc"
        )

    def _parse_drive_item(self, file_data: Dict[str, Any]) -> DriveItem:
        """
        Parse Drive API file data into DriveItem model.

        Args:
            file_data: Raw file data from Drive API

        Returns:
            DriveItem: Parsed Drive item
        """
        from datetime import datetime

        # Parse owners
        owners = []
        for owner in file_data.get("owners", []):
            owners.append(DriveOwner(
                email=owner.get("emailAddress"),
                display_name=owner.get("displayName"),
                photo_link=owner.get("photoLink")
            ))

        # Parse dates
        created_time = None
        if file_data.get("createdTime"):
            created_time = datetime.fromisoformat(file_data["createdTime"].replace("Z", "+00:00"))

        modified_time = None
        if file_data.get("modifiedTime"):
            modified_time = datetime.fromisoformat(file_data["modifiedTime"].replace("Z", "+00:00"))

        viewed_by_me_time = None
        if file_data.get("viewedByMeTime"):
            viewed_by_me_time = datetime.fromisoformat(file_data["viewedByMeTime"].replace("Z", "+00:00"))

        # Get permissions
        permissions = []
        if file_data.get("permissions"):
            for perm in file_data["permissions"]:
                permissions.append(perm.get("role", ""))

        return DriveItem(
            id=file_data["id"],
            name=file_data["name"],
            mime_type=file_data["mimeType"],
            kind=file_data.get("kind", "drive#file"),
            web_view_link=file_data.get("webViewLink"),
            web_content_link=file_data.get("webContentLink"),
            thumbnail_link=file_data.get("thumbnailLink"),
            icon_link=file_data.get("iconLink"),
            size=file_data.get("size"),
            created_time=created_time,
            modified_time=modified_time,
            viewed_by_me_time=viewed_by_me_time,
            owners=owners,
            shared=file_data.get("shared", False),
            permissions=permissions,
            starred=file_data.get("starred", False),
            trashed=file_data.get("trashed", False),
            description=file_data.get("description"),
            parents=file_data.get("parents", [])
        )

    def is_google_workspace_file(self, mime_type: str) -> bool:
        """
        Check if a file is a Google Workspace file (Docs, Sheets, Slides, etc.).

        Args:
            mime_type: MIME type to check

        Returns:
            bool: True if Google Workspace file
        """
        return mime_type in self.MIME_TYPES.values()

    def get_file_type(self, mime_type: str) -> str:
        """
        Get human-readable file type from MIME type.

        Args:
            mime_type: MIME type

        Returns:
            str: File type name
        """
        for type_name, type_mime in self.MIME_TYPES.items():
            if mime_type == type_mime:
                return type_name.capitalize()

        # Not a Google Workspace file
        if "/" in mime_type:
            return mime_type.split("/")[1].upper()

        return "File"


def create_client(credentials: Credentials) -> GoogleDriveClient:
    """
    Create a Google Drive client.

    Args:
        credentials: Google OAuth credentials

    Returns:
        GoogleDriveClient: Drive client instance
    """
    return GoogleDriveClient(credentials)
