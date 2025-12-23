"""
Google Integration Pydantic Models

Data models for Google OAuth, Drive, and Gmail integration.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, HttpUrl, ConfigDict


# ============================================================================
# OAuth Models
# ============================================================================

class GoogleAuthURL(BaseModel):
    """Response containing Google OAuth authorization URL."""

    auth_url: str = Field(
        ...,
        description="URL to redirect user for Google OAuth authorization"
    )
    state: str = Field(
        ...,
        description="State parameter for CSRF protection"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
                "state": "random_state_token_abc123"
            }
        }
    )


class GoogleAuthCallback(BaseModel):
    """Request schema for OAuth callback."""

    code: str = Field(
        ...,
        description="Authorization code from Google"
    )
    state: Optional[str] = Field(
        None,
        description="State parameter for CSRF validation"
    )
    scope: Optional[str] = Field(
        None,
        description="Granted scopes (space-separated)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "code": "4/0AY0e-g7...",
                "state": "random_state_token_abc123",
                "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly"
            }
        }
    )


class GoogleAuthSuccess(BaseModel):
    """Response after successful OAuth authorization."""

    success: bool = Field(..., description="Whether authorization was successful")
    message: str = Field(..., description="Success message")
    user_email: Optional[str] = Field(None, description="Authenticated user's email")
    scopes: List[str] = Field(
        default_factory=list,
        description="List of granted scopes"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Successfully connected to Google",
                "user_email": "user@example.com",
                "scopes": [
                    "https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/drive.readonly"
                ]
            }
        }
    )


class GoogleConnectionStatus(BaseModel):
    """Response indicating Google connection status."""

    connected: bool = Field(..., description="Whether Google account is connected")
    user_email: Optional[str] = Field(None, description="Connected user's email")
    scopes: List[str] = Field(
        default_factory=list,
        description="List of granted scopes"
    )
    token_expires_at: Optional[datetime] = Field(
        None,
        description="When the access token expires"
    )
    requires_reauth: bool = Field(
        default=False,
        description="Whether re-authentication is required"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "connected": True,
                "user_email": "user@example.com",
                "scopes": [
                    "https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/drive.readonly"
                ],
                "token_expires_at": "2024-01-21T10:30:00Z",
                "requires_reauth": False
            }
        }
    )


class GoogleDisconnectResponse(BaseModel):
    """Response after disconnecting Google account."""

    success: bool = Field(..., description="Whether disconnection was successful")
    message: str = Field(..., description="Success message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Google account disconnected successfully"
            }
        }
    )


# ============================================================================
# Google Drive Models
# ============================================================================

class DriveFileType(BaseModel):
    """Google Drive file type information."""

    mime_type: str = Field(..., description="MIME type")
    is_google_doc: bool = Field(
        default=False,
        description="Whether this is a native Google Doc"
    )
    is_folder: bool = Field(
        default=False,
        description="Whether this is a folder"
    )


class DriveOwner(BaseModel):
    """Drive file owner information."""

    email: Optional[str] = Field(None, description="Owner email")
    display_name: Optional[str] = Field(None, description="Owner display name")
    photo_link: Optional[str] = Field(None, description="Owner photo URL")


class DriveItem(BaseModel):
    """Google Drive file/folder item."""

    id: str = Field(..., description="Drive file ID")
    name: str = Field(..., description="File name")
    mime_type: str = Field(..., description="MIME type")
    kind: str = Field(default="drive#file", description="Resource kind")

    # URLs and links
    web_view_link: Optional[str] = Field(
        None,
        description="URL to view the file in Drive"
    )
    web_content_link: Optional[str] = Field(
        None,
        description="URL to download file content"
    )
    thumbnail_link: Optional[str] = Field(
        None,
        description="Thumbnail URL"
    )
    icon_link: Optional[str] = Field(None, description="Icon URL")

    # Metadata
    size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    created_time: Optional[datetime] = Field(None, description="Creation time")
    modified_time: Optional[datetime] = Field(None, description="Last modified time")
    viewed_by_me_time: Optional[datetime] = Field(None, description="Last viewed time")

    # Ownership and sharing
    owners: List[DriveOwner] = Field(
        default_factory=list,
        description="File owners"
    )
    shared: bool = Field(default=False, description="Whether file is shared")
    permissions: List[str] = Field(
        default_factory=list,
        description="User's permissions"
    )

    # Additional properties
    starred: bool = Field(default=False, description="Whether file is starred")
    trashed: bool = Field(default=False, description="Whether file is in trash")
    description: Optional[str] = Field(None, description="File description")

    # Parent folders
    parents: List[str] = Field(
        default_factory=list,
        description="Parent folder IDs"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                "name": "Project Proposal.docx",
                "mime_type": "application/vnd.google-apps.document",
                "kind": "drive#file",
                "web_view_link": "https://docs.google.com/document/d/1Bx...",
                "thumbnail_link": "https://lh3.googleusercontent.com/...",
                "icon_link": "https://drive-thirdparty.googleusercontent.com/16/type/...",
                "size": 15360,
                "created_time": "2024-01-05T10:00:00Z",
                "modified_time": "2024-01-20T16:30:00Z",
                "viewed_by_me_time": "2024-01-21T09:00:00Z",
                "owners": [
                    {
                        "email": "user@example.com",
                        "display_name": "John Doe",
                        "photo_link": "https://lh3.googleusercontent.com/..."
                    }
                ],
                "shared": False,
                "permissions": ["read", "write"],
                "starred": False,
                "trashed": False,
                "description": "Proposal for Q1 project",
                "parents": ["0B1..."]
            }
        }
    )


class DriveFileList(BaseModel):
    """List of Google Drive files."""

    files: List[DriveItem] = Field(
        default_factory=list,
        description="List of Drive files"
    )
    next_page_token: Optional[str] = Field(
        None,
        description="Token for fetching next page"
    )
    total: Optional[int] = Field(
        None,
        ge=0,
        description="Total number of files (if available)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "files": [
                    {
                        "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                        "name": "Project Proposal.docx",
                        "mime_type": "application/vnd.google-apps.document",
                        "web_view_link": "https://docs.google.com/document/d/...",
                        "modified_time": "2024-01-20T16:30:00Z"
                    }
                ],
                "next_page_token": "CAESBggCIAIoAQ",
                "total": 42
            }
        }
    )


class DriveSearchQuery(BaseModel):
    """Query parameters for searching Drive files."""

    query: Optional[str] = Field(
        None,
        max_length=500,
        description="Search query string"
    )
    mime_type: Optional[str] = Field(
        None,
        description="Filter by MIME type"
    )
    folder_id: Optional[str] = Field(
        None,
        description="Search within specific folder"
    )
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of results per page"
    )
    page_token: Optional[str] = Field(
        None,
        description="Page token for pagination"
    )
    order_by: Optional[str] = Field(
        None,
        description="Sort order (e.g., 'modifiedTime desc', 'name')"
    )
    include_trashed: bool = Field(
        default=False,
        description="Include trashed files"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "project proposal",
                "mime_type": "application/pdf",
                "page_size": 20,
                "order_by": "modifiedTime desc",
                "include_trashed": False
            }
        }
    )


# ============================================================================
# Gmail Models
# ============================================================================

class GmailLabel(BaseModel):
    """Gmail label information."""

    id: str = Field(..., description="Label ID")
    name: str = Field(..., description="Label name")
    type: str = Field(..., description="Label type (system or user)")


class GmailMessageHeader(BaseModel):
    """Gmail message header."""

    name: str = Field(..., description="Header name")
    value: str = Field(..., description="Header value")


class GmailAttachment(BaseModel):
    """Gmail attachment information."""

    filename: str = Field(..., description="Attachment filename")
    mime_type: str = Field(..., description="MIME type")
    size: int = Field(..., ge=0, description="Size in bytes")
    attachment_id: str = Field(..., description="Attachment ID for downloading")


class GmailMessage(BaseModel):
    """Gmail message."""

    id: str = Field(..., description="Message ID")
    thread_id: str = Field(..., description="Thread ID")
    label_ids: List[str] = Field(
        default_factory=list,
        description="List of label IDs"
    )

    # Headers
    subject: str = Field(..., description="Email subject")
    from_email: str = Field(..., description="Sender email", alias="from")
    to_emails: List[str] = Field(
        default_factory=list,
        description="Recipient emails"
    )
    cc_emails: List[str] = Field(
        default_factory=list,
        description="CC emails"
    )
    date: Optional[datetime] = Field(None, description="Email date")

    # Content
    snippet: str = Field(..., description="Email snippet/preview")
    body_text: Optional[str] = Field(None, description="Plain text body")
    body_html: Optional[str] = Field(None, description="HTML body")

    # Metadata
    size_estimate: Optional[int] = Field(
        None,
        ge=0,
        description="Estimated size in bytes"
    )
    attachments: List[GmailAttachment] = Field(
        default_factory=list,
        description="List of attachments"
    )

    # Flags
    is_unread: bool = Field(default=False, description="Whether message is unread")
    is_starred: bool = Field(default=False, description="Whether message is starred")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "id": "17d5a1b2c3d4e5f7",
                "thread_id": "17d5a1b2c3d4e5f6",
                "label_ids": ["INBOX", "IMPORTANT"],
                "subject": "Project Update: Q1 2024",
                "from": "colleague@example.com",
                "to_emails": ["me@example.com"],
                "cc_emails": [],
                "date": "2024-01-20T09:15:00Z",
                "snippet": "Hi team, here's the update for Q1...",
                "body_text": "Hi team,\n\nHere's the quarterly update...",
                "size_estimate": 5432,
                "attachments": [
                    {
                        "filename": "report.pdf",
                        "mime_type": "application/pdf",
                        "size": 102400,
                        "attachment_id": "ANGjdJ8..."
                    }
                ],
                "is_unread": False,
                "is_starred": True
            }
        }
    )


class GmailThread(BaseModel):
    """Gmail thread (conversation)."""

    id: str = Field(..., description="Thread ID")
    snippet: str = Field(..., description="Thread snippet")
    message_count: int = Field(..., ge=1, description="Number of messages in thread")
    messages: List[GmailMessage] = Field(
        default_factory=list,
        description="Messages in the thread"
    )

    # Summary from the most recent message
    subject: str = Field(..., description="Thread subject")
    participants: List[str] = Field(
        default_factory=list,
        description="Email addresses of all participants"
    )
    last_message_date: Optional[datetime] = Field(
        None,
        description="Date of most recent message"
    )

    # Flags (from most recent message)
    is_unread: bool = Field(default=False, description="Whether thread has unread messages")
    is_starred: bool = Field(default=False, description="Whether thread is starred")
    labels: List[str] = Field(default_factory=list, description="Thread labels")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "17d5a1b2c3d4e5f6",
                "snippet": "Hi team, here's the update for Q1...",
                "message_count": 3,
                "messages": [],
                "subject": "Project Update: Q1 2024",
                "participants": ["colleague@example.com", "me@example.com"],
                "last_message_date": "2024-01-20T09:15:00Z",
                "is_unread": False,
                "is_starred": True,
                "labels": ["INBOX", "IMPORTANT"]
            }
        }
    )


class GmailThreadList(BaseModel):
    """List of Gmail threads."""

    threads: List[GmailThread] = Field(
        default_factory=list,
        description="List of threads"
    )
    next_page_token: Optional[str] = Field(
        None,
        description="Token for fetching next page"
    )
    total: Optional[int] = Field(
        None,
        ge=0,
        description="Total number of threads (if available)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "threads": [
                    {
                        "id": "17d5a1b2c3d4e5f6",
                        "snippet": "Hi team, here's the update...",
                        "message_count": 3,
                        "subject": "Project Update",
                        "participants": ["colleague@example.com"],
                        "last_message_date": "2024-01-20T09:15:00Z",
                        "is_unread": False,
                        "is_starred": True,
                        "labels": ["INBOX"]
                    }
                ],
                "next_page_token": "CAESBggCIAIoAQ",
                "total": 156
            }
        }
    )


class GmailSearchQuery(BaseModel):
    """Query parameters for searching Gmail."""

    query: Optional[str] = Field(
        None,
        max_length=500,
        description="Gmail search query (supports Gmail search operators)"
    )
    label_ids: List[str] = Field(
        default_factory=list,
        description="Filter by label IDs"
    )
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of results per page"
    )
    page_token: Optional[str] = Field(
        None,
        description="Page token for pagination"
    )
    include_spam_trash: bool = Field(
        default=False,
        description="Include spam and trash"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "from:colleague@example.com subject:project",
                "label_ids": ["INBOX"],
                "page_size": 20,
                "include_spam_trash": False
            }
        }
    )
