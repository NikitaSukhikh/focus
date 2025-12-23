"""
Preview Pydantic Models

Data models for object previews - polymorphic based on object type.
Different object types have different preview data structures.
"""

from datetime import datetime
from typing import List, Optional, Union, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl, ConfigDict

from app.models.object import ObjectType


class PreviewBase(BaseModel):
    """Base Preview model with common fields."""

    object_id: UUID = Field(..., description="ID of the object being previewed")
    object_type: ObjectType = Field(..., description="Type of the object")
    title: str = Field(..., description="Object title")
    description: Optional[str] = Field(None, description="Object description")
    tags: List[str] = Field(default_factory=list, description="Object tags")


# ============================================================================
# Link Preview
# ============================================================================

class LinkPreview(PreviewBase):
    """Preview data for Link objects."""

    object_type: ObjectType = Field(default=ObjectType.LINK, description="Object type")
    url: str = Field(..., description="Link URL")
    favicon_url: Optional[str] = Field(None, description="Favicon URL")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail/preview image URL")
    site_name: Optional[str] = Field(None, description="Website name")

    # Open Graph metadata (if fetched)
    og_title: Optional[str] = Field(None, description="Open Graph title")
    og_description: Optional[str] = Field(None, description="Open Graph description")
    og_image: Optional[str] = Field(None, description="Open Graph image URL")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440000",
                "object_type": "link",
                "title": "GitHub - Ocean Project",
                "description": "Desktop workspace organizer",
                "tags": ["development", "github"],
                "url": "https://github.com/anthropics/ocean",
                "favicon_url": "https://github.com/favicon.ico",
                "thumbnail_url": "https://opengraph.githubassets.com/...",
                "site_name": "GitHub",
                "og_title": "Ocean - Desktop Workspace Organizer",
                "og_description": "Organize your links, files, and more",
                "og_image": "https://opengraph.githubassets.com/..."
            }
        }
    )


# ============================================================================
# File Preview
# ============================================================================

class FilePreview(PreviewBase):
    """Preview data for File objects."""

    object_type: ObjectType = Field(default=ObjectType.FILE, description="Object type")
    file_path: str = Field(..., description="File path")
    file_name: str = Field(..., description="File name")
    file_extension: Optional[str] = Field(None, description="File extension")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    file_size_human: Optional[str] = Field(None, description="Human-readable file size")
    mime_type: Optional[str] = Field(None, description="MIME type")

    # Preview data
    thumbnail_url: Optional[str] = Field(None, description="Cached thumbnail URL/path")
    text_preview: Optional[str] = Field(
        None,
        description="Text preview (first N lines for text files)"
    )

    # File metadata
    created_date: Optional[datetime] = Field(None, description="File creation date")
    modified_date: Optional[datetime] = Field(None, description="File modification date")
    is_accessible: bool = Field(
        default=True,
        description="Whether the file is accessible"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440001",
                "object_type": "file",
                "title": "Project Report",
                "description": "Q1 2024 project report",
                "tags": ["reports", "q1"],
                "file_path": "/Users/me/Documents/report.pdf",
                "file_name": "report.pdf",
                "file_extension": ".pdf",
                "file_size": 2048576,
                "file_size_human": "2.0 MB",
                "mime_type": "application/pdf",
                "thumbnail_url": "/cache/thumbnails/abc123.jpg",
                "text_preview": None,
                "created_date": "2024-01-10T09:00:00Z",
                "modified_date": "2024-01-15T14:30:00Z",
                "is_accessible": True
            }
        }
    )


# ============================================================================
# Google Drive Preview
# ============================================================================

class GoogleDrivePreview(PreviewBase):
    """Preview data for Google Drive objects."""

    object_type: ObjectType = Field(
        default=ObjectType.GOOGLE_DRIVE,
        description="Object type"
    )
    drive_file_id: str = Field(..., description="Google Drive file ID")
    drive_file_name: str = Field(..., description="File name in Drive")
    mime_type: Optional[str] = Field(None, description="MIME type")
    file_size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    file_size_human: Optional[str] = Field(None, description="Human-readable file size")

    # Drive-specific URLs
    web_view_link: Optional[str] = Field(
        None,
        description="URL to view file in Google Drive"
    )
    web_content_link: Optional[str] = Field(
        None,
        description="URL to download file content"
    )
    thumbnail_link: Optional[str] = Field(
        None,
        description="Drive-provided thumbnail URL"
    )
    icon_link: Optional[str] = Field(None, description="File type icon URL")

    # Metadata
    created_time: Optional[datetime] = Field(None, description="Creation time in Drive")
    modified_time: Optional[datetime] = Field(None, description="Last modified time")
    owners: List[str] = Field(default_factory=list, description="File owners")
    shared: bool = Field(default=False, description="Whether the file is shared")

    # Connection status
    is_accessible: bool = Field(
        default=True,
        description="Whether the file is accessible (requires Google auth)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440002",
                "object_type": "google_drive",
                "title": "Project Proposal",
                "description": "Proposal for new project",
                "tags": ["proposals", "drive"],
                "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                "drive_file_name": "Project Proposal.docx",
                "mime_type": "application/vnd.google-apps.document",
                "file_size": 15360,
                "file_size_human": "15 KB",
                "web_view_link": "https://docs.google.com/document/d/...",
                "thumbnail_link": "https://lh3.googleusercontent.com/...",
                "icon_link": "https://drive-thirdparty.googleusercontent.com/16/type/...",
                "created_time": "2024-01-05T10:00:00Z",
                "modified_time": "2024-01-20T16:30:00Z",
                "owners": ["user@example.com"],
                "shared": False,
                "is_accessible": True
            }
        }
    )


# ============================================================================
# Gmail Preview
# ============================================================================

class GmailPreview(PreviewBase):
    """Preview data for Gmail objects."""

    object_type: ObjectType = Field(default=ObjectType.GMAIL, description="Object type")
    thread_id: str = Field(..., description="Gmail thread ID")
    message_id: str = Field(..., description="Gmail message ID")
    subject: str = Field(..., description="Email subject")
    sender: str = Field(..., description="Sender email address")
    sender_name: Optional[str] = Field(None, description="Sender display name")
    recipients: List[str] = Field(default_factory=list, description="Recipient emails")

    # Email content
    snippet: Optional[str] = Field(None, description="Email snippet/preview")
    body_preview: Optional[str] = Field(
        None,
        max_length=500,
        description="Preview of email body (first N characters)"
    )

    # Metadata
    received_date: Optional[datetime] = Field(None, description="Date received")
    labels: List[str] = Field(default_factory=list, description="Gmail labels")
    has_attachments: bool = Field(default=False, description="Whether email has attachments")
    is_unread: bool = Field(default=False, description="Whether email is unread")
    is_starred: bool = Field(default=False, description="Whether email is starred")

    # Thread info
    thread_size: int = Field(default=1, ge=1, description="Number of messages in thread")

    # Connection status
    is_accessible: bool = Field(
        default=True,
        description="Whether the email is accessible (requires Gmail auth)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440003",
                "object_type": "gmail",
                "title": "Project Update: Q1 2024",
                "description": "Important project update",
                "tags": ["email", "project"],
                "thread_id": "17d5a1b2c3d4e5f6",
                "message_id": "17d5a1b2c3d4e5f7",
                "subject": "Project Update: Q1 2024",
                "sender": "colleague@example.com",
                "sender_name": "John Doe",
                "recipients": ["me@example.com", "team@example.com"],
                "snippet": "Hi team, here's the update for Q1...",
                "body_preview": "Hi team, here's the quarterly update...",
                "received_date": "2024-01-20T09:15:00Z",
                "labels": ["INBOX", "IMPORTANT"],
                "has_attachments": True,
                "is_unread": False,
                "is_starred": True,
                "thread_size": 3,
                "is_accessible": True
            }
        }
    )


# ============================================================================
# Text Preview
# ============================================================================

class TextPreview(PreviewBase):
    """Preview data for Text objects."""

    object_type: ObjectType = Field(default=ObjectType.TEXT, description="Object type")
    content: str = Field(..., description="Full text content")
    content_preview: str = Field(..., description="Preview of content (first N chars)")
    word_count: int = Field(default=0, ge=0, description="Word count")
    character_count: int = Field(default=0, ge=0, description="Character count")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440004",
                "object_type": "text",
                "title": "Meeting Notes",
                "description": "Notes from team meeting",
                "tags": ["notes", "meetings"],
                "content": "Meeting notes for January 20th...\n\n1. Project updates\n2. Next steps",
                "content_preview": "Meeting notes for January 20th...",
                "word_count": 125,
                "character_count": 687
            }
        }
    )


# ============================================================================
# Union Preview Response
# ============================================================================

# Union type for preview responses
PreviewResponse = Union[
    LinkPreview,
    FilePreview,
    GoogleDrivePreview,
    GmailPreview,
    TextPreview
]


# ============================================================================
# Preview Error Response
# ============================================================================

class PreviewError(BaseModel):
    """Error response when preview generation fails."""

    object_id: UUID = Field(..., description="ID of the object")
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    is_accessible: bool = Field(
        default=False,
        description="Whether the object is accessible"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440000",
                "error": "File not found at specified path",
                "error_type": "file_not_found",
                "is_accessible": False
            }
        }
    )


# ============================================================================
# Thumbnail Request
# ============================================================================

class ThumbnailRequest(BaseModel):
    """Request schema for generating thumbnails."""

    object_id: UUID = Field(..., description="ID of the object")
    width: Optional[int] = Field(
        None,
        ge=50,
        le=1000,
        description="Desired thumbnail width"
    )
    height: Optional[int] = Field(
        None,
        ge=50,
        le=1000,
        description="Desired thumbnail height"
    )
    quality: Optional[int] = Field(
        None,
        ge=1,
        le=100,
        description="JPEG quality (1-100)"
    )
    regenerate: bool = Field(
        default=False,
        description="Force regeneration even if cached thumbnail exists"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440000",
                "width": 400,
                "height": 400,
                "quality": 85,
                "regenerate": False
            }
        }
    )


class ThumbnailResponse(BaseModel):
    """Response schema for thumbnail generation."""

    object_id: UUID = Field(..., description="ID of the object")
    thumbnail_url: str = Field(..., description="URL/path to the thumbnail")
    width: int = Field(..., description="Actual thumbnail width")
    height: int = Field(..., description="Actual thumbnail height")
    cached: bool = Field(..., description="Whether thumbnail was served from cache")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "object_id": "550e8400-e29b-41d4-a716-446655440000",
                "thumbnail_url": "/cache/thumbnails/abc123.jpg",
                "width": 400,
                "height": 300,
                "cached": True
            }
        }
    )
