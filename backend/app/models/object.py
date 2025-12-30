"""
Object Pydantic Models

Data models for Object entities - items stored on spaces (links, files, service objects).
Supports polymorphic object types: Link, File, GoogleDrive, Gmail, Text.

CRITICAL DISTINCTION - TEXT vs FILE Objects:
=============================================

1. TEXT Objects (ObjectType.TEXT):
   Purpose: Store plain text written DIRECTLY in the UI
   Storage: metadata.content (string stored in database)
   Use case: User types a note/snippet directly in the main pane
   Create with: TextObjectCreate(type="text", title="...", content="...")

2. FILE Objects (ObjectType.FILE):
   Purpose: Reference files on the filesystem (including .txt files)
   Storage: metadata.file_path (path to file on disk)
   Use case: User drags/adds a file (including .txt) from their computer
   Create with: FileObjectCreate(type="file", title="...", file_path="/path/to/file.txt")

Example scenarios:
- User types "Meeting notes for tomorrow" in UI → TEXT object
- User adds their existing "notes.txt" file → FILE object (MIME: text/plain)
- User adds "report.pdf" → FILE object (MIME: application/pdf)
- User adds "photo.jpg" → FILE object (MIME: image/jpeg)

Both TEXT and FILE(.txt) can contain text, but storage is fundamentally different!
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Union, Any
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl, field_validator, ConfigDict, model_validator


class ObjectType(str, Enum):
    """
    Types of objects that can be stored on spaces.

    IMPORTANT: TEXT and FILE are different!
    - TEXT: Plain text written in UI (stored in DB)
    - FILE: Reference to file on disk (including .txt files)
    """

    LINK = "link"                # Web URL
    FILE = "file"                # File on disk (any type: .txt, .pdf, .jpg, etc.)
    GOOGLE_DRIVE = "google_drive"  # Google Drive file
    GMAIL = "gmail"              # Gmail email
    TEXT = "text"                # Plain text written in UI (NOT a .txt file!)


class ObjectBase(BaseModel):
    """Base Object model with common fields across all object types."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=400,
        description="Object title/name"
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional description"
    )
    custom_title: Optional[str] = Field(
        None,
        min_length=2,
        max_length=400,
        description="Custom title set by user (overrides default title when present)"
    )
    custom_description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Custom description set by user (overrides default description when present)"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for categorization and search"
    )
    position: Optional[int] = Field(
        None,
        ge=0,
        description="Position on the space canvas"
    )
    x: Optional[float] = Field(
        None,
        description="X coordinate on canvas for flexible positioning"
    )
    y: Optional[float] = Field(
        None,
        description="Y coordinate on canvas for flexible positioning"
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate and normalize title."""
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty or only whitespace")
        return v

    @field_validator("custom_title")
    @classmethod
    def validate_custom_title(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize custom title (allows clearing when None)."""
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if len(v) < 2:
            raise ValueError("Custom title must be at least 2 characters")
        return v

    @field_validator("custom_description")
    @classmethod
    def validate_custom_description(cls, v: Optional[str]) -> Optional[str]:
        """Normalize custom description (allows clearing when blank)."""
        if v is None:
            return v
        v = v.strip()
        return v or None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        """Validate and normalize tags."""
        # Remove duplicates, strip whitespace, filter empty strings
        cleaned_tags = []
        seen = set()
        for tag in v:
            tag = tag.strip().lower()
            if tag and tag not in seen:
                cleaned_tags.append(tag)
                seen.add(tag)
        return cleaned_tags


# ============================================================================
# Link Object Models
# ============================================================================

class LinkObjectData(BaseModel):
    """Data specific to Link objects."""

    url: HttpUrl = Field(
        ...,
        description="URL of the link"
    )
    favicon_url: Optional[HttpUrl] = Field(
        None,
        description="URL of the site's favicon"
    )
    thumbnail_url: Optional[HttpUrl] = Field(
        None,
        description="URL of a preview thumbnail"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "url": "https://github.com/anthropics/focus",
                "favicon_url": "https://github.com/favicon.ico",
                "thumbnail_url": "https://opengraph.githubassets.com/..."
            }
        }
    )


class LinkObjectCreate(ObjectBase):
    """Schema for creating a Link object."""

    type: ObjectType = Field(
        default=ObjectType.LINK,
        description="Object type"
    )
    url: HttpUrl = Field(
        ...,
        description="URL of the link"
    )
    favicon_url: Optional[HttpUrl] = None
    thumbnail_url: Optional[HttpUrl] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: ObjectType) -> ObjectType:
        """Ensure type is LINK."""
        if v != ObjectType.LINK:
            raise ValueError("Type must be 'link' for LinkObjectCreate")
        return v


# ============================================================================
# File Object Models
# ============================================================================

class FileObjectData(BaseModel):
    """
    Data specific to File objects.

    IMPORTANT: File objects reference actual files on the filesystem.
    This includes .txt files, PDFs, images, etc.
    The file content remains on disk; only the path is stored.
    """

    file_path: str = Field(
        ...,
        description="Absolute or relative path to the file (can be .txt, .pdf, .jpg, etc.)"
    )
    file_size: Optional[int] = Field(
        None,
        ge=0,
        description="File size in bytes"
    )
    mime_type: Optional[str] = Field(
        None,
        description="MIME type of the file"
    )
    thumbnail_path: Optional[str] = Field(
        None,
        description="Path to cached thumbnail (if generated)"
    )

    @field_validator("file_path")
    @classmethod
    def validate_file_path(cls, v: str) -> str:
        """Validate file path."""
        if not v or not v.strip():
            raise ValueError("File path cannot be empty")
        return v.strip()

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "file_path": "/Users/me/Documents/report.pdf",
                "file_size": 2048576,
                "mime_type": "application/pdf",
                "thumbnail_path": "/cache/thumbnails/abc123.jpg"
            }
        }
    )


class FileObjectCreate(ObjectBase):
    """Schema for creating a File object."""

    type: ObjectType = Field(
        default=ObjectType.FILE,
        description="Object type"
    )
    file_path: str = Field(
        ...,
        description="Path to the file"
    )
    mime_type: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: ObjectType) -> ObjectType:
        """Ensure type is FILE."""
        if v != ObjectType.FILE:
            raise ValueError("Type must be 'file' for FileObjectCreate")
        return v

    @field_validator("file_path")
    @classmethod
    def validate_file_path(cls, v: str) -> str:
        """Validate file path."""
        if not v or not v.strip():
            raise ValueError("File path cannot be empty")
        return v.strip()


# ============================================================================
# Google Drive Object Models
# ============================================================================

class GoogleDriveObjectData(BaseModel):
    """Data specific to Google Drive objects."""

    drive_file_id: str = Field(
        ...,
        description="Google Drive file ID"
    )
    drive_file_name: str = Field(
        ...,
        description="File name in Google Drive"
    )
    mime_type: Optional[str] = Field(
        None,
        description="MIME type of the Drive file"
    )
    web_view_link: Optional[HttpUrl] = Field(
        None,
        description="Link to view the file in Google Drive"
    )
    thumbnail_link: Optional[HttpUrl] = Field(
        None,
        description="Link to the file's thumbnail"
    )
    modified_time: Optional[datetime] = Field(
        None,
        description="Last modified time in Drive"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                "drive_file_name": "Project Proposal.docx",
                "mime_type": "application/vnd.google-apps.document",
                "web_view_link": "https://docs.google.com/document/d/...",
                "thumbnail_link": "https://lh3.googleusercontent.com/...",
                "modified_time": "2024-01-20T14:30:00Z"
            }
        }
    )


class GoogleDriveObjectCreate(ObjectBase):
    """Schema for creating a Google Drive object."""

    type: ObjectType = Field(
        default=ObjectType.GOOGLE_DRIVE,
        description="Object type"
    )
    drive_file_id: str = Field(
        ...,
        description="Google Drive file ID"
    )
    drive_file_name: str = Field(
        ...,
        description="File name in Google Drive"
    )
    mime_type: Optional[str] = None
    web_view_link: Optional[HttpUrl] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: ObjectType) -> ObjectType:
        """Ensure type is GOOGLE_DRIVE."""
        if v != ObjectType.GOOGLE_DRIVE:
            raise ValueError("Type must be 'google_drive' for GoogleDriveObjectCreate")
        return v


# ============================================================================
# Gmail Object Models
# ============================================================================

class GmailObjectData(BaseModel):
    """Data specific to Gmail objects."""

    thread_id: str = Field(
        ...,
        description="Gmail thread ID"
    )
    message_id: str = Field(
        ...,
        description="Gmail message ID"
    )
    subject: str = Field(
        ...,
        description="Email subject"
    )
    sender: str = Field(
        ...,
        description="Email sender"
    )
    snippet: Optional[str] = Field(
        None,
        description="Email snippet/preview"
    )
    received_date: Optional[datetime] = Field(
        None,
        description="Date the email was received"
    )
    labels: List[str] = Field(
        default_factory=list,
        description="Gmail labels"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "thread_id": "17d5a1b2c3d4e5f6",
                "message_id": "17d5a1b2c3d4e5f7",
                "subject": "Project Update: Q1 2024",
                "sender": "colleague@example.com",
                "snippet": "Hi team, here's the update for Q1...",
                "received_date": "2024-01-20T09:15:00Z",
                "labels": ["INBOX", "IMPORTANT"]
            }
        }
    )


class GmailObjectCreate(ObjectBase):
    """Schema for creating a Gmail object."""

    type: ObjectType = Field(
        default=ObjectType.GMAIL,
        description="Object type"
    )
    thread_id: str = Field(
        ...,
        description="Gmail thread ID"
    )
    message_id: str = Field(
        ...,
        description="Gmail message ID"
    )
    subject: str = Field(
        ...,
        description="Email subject"
    )
    sender: str = Field(
        ...,
        description="Email sender"
    )
    snippet: Optional[str] = None
    received_date: Optional[datetime] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: ObjectType) -> ObjectType:
        """Ensure type is GMAIL."""
        if v != ObjectType.GMAIL:
            raise ValueError("Type must be 'gmail' for GmailObjectCreate")
        return v


# ============================================================================
# Text Object Models
# ============================================================================

class TextObjectData(BaseModel):
    """
    Data specific to Text objects.

    IMPORTANT: Text objects store plain text written directly in the UI.
    This is NOT for .txt files - those are FILE objects!
    The content is stored in the database, not on the filesystem.
    """

    content: str = Field(
        ...,
        max_length=10000,
        description="Plain text content written in UI (NOT file content!)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "This is a quick note about the meeting tomorrow..."
            }
        }
    )


class TextObjectCreate(ObjectBase):
    """Schema for creating a Text object."""

    type: ObjectType = Field(
        default=ObjectType.TEXT,
        description="Object type"
    )
    content: str = Field(
        ...,
        max_length=10000,
        description="Text content"
    )
    service: Optional[str] = Field(
        None,
        max_length=50,
        description="Optional service identifier (e.g., telegram)"
    )

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: ObjectType) -> ObjectType:
        """Ensure type is TEXT."""
        if v != ObjectType.TEXT:
            raise ValueError("Type must be 'text' for TextObjectCreate")
        return v


# ============================================================================
# Union Create Schema
# ============================================================================

# Union type for object creation
ObjectCreate = Union[
    LinkObjectCreate,
    FileObjectCreate,
    GoogleDriveObjectCreate,
    GmailObjectCreate,
    TextObjectCreate
]


# ============================================================================
# Update Schema
# ============================================================================

class ObjectUpdate(BaseModel):
    """
    Schema for updating an existing Object.

    All fields are optional to allow partial updates.
    Type-specific fields are stored in metadata dict.
    """

    default_title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=400,
        description="Default title (metadata-derived)"
    )
    default_description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Default description (metadata-derived)"
    )
    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=400,
        description="Object title"
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Object description"
    )
    custom_title: Optional[str] = Field(
        None,
        min_length=2,
        max_length=400,
        description="Custom title override"
    )
    custom_description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Custom description override"
    )
    tags: Optional[List[str]] = Field(
        None,
        description="Object tags"
    )
    position: Optional[int] = Field(
        None,
        ge=0,
        description="Position on canvas"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Type-specific metadata to update"
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize title."""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Title cannot be empty or only whitespace")
        return v

    @field_validator("default_title")
    @classmethod
    def validate_default_title(cls, v: Optional[str]) -> Optional[str]:
        """Validate default title when provided."""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Default title cannot be empty or only whitespace")
        return v

    @field_validator("custom_title")
    @classmethod
    def validate_custom_title(cls, v: Optional[str]) -> Optional[str]:
        """Validate custom title when provided."""
        if v is not None:
            v = v.strip()
            if not v:
                return None
            if len(v) < 2:
                raise ValueError("Custom title must be at least 2 characters")
        return v

    @field_validator("custom_description")
    @classmethod
    def validate_custom_description(cls, v: Optional[str]) -> Optional[str]:
        """Normalize custom description when provided."""
        if v is not None:
            v = v.strip()
            if not v:
                return None
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate and normalize tags."""
        if v is not None:
            cleaned_tags = []
            seen = set()
            for tag in v:
                tag = tag.strip().lower()
                if tag and tag not in seen:
                    cleaned_tags.append(tag)
                    seen.add(tag)
            return cleaned_tags
        return v


# ============================================================================
# Response Schema
# ============================================================================

class ObjectResponse(ObjectBase):
    """
    Schema for Object responses.

    Includes all common fields plus type-specific metadata.
    """

    id: UUID = Field(..., description="Unique object identifier")
    space_id: UUID = Field(..., description="ID of the space this object belongs to")
    type: ObjectType = Field(..., description="Object type")
    default_title: str = Field(..., description="Original/default title from metadata or system")
    default_description: Optional[str] = Field(
        None,
        description="Original/default description from metadata or system"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Type-specific metadata (url, file_path, etc.)"
    )
    thumbnail_url: Optional[str] = Field(
        None,
        description="URL/path to cached thumbnail"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "space_id": "660e8400-e29b-41d4-a716-446655440001",
                "type": "link",
                "title": "GitHub - Focus Project",
                "description": "Desktop workspace organizer",
                "tags": ["development", "github", "tools"],
                "position": 0,
                "metadata": {
                    "url": "https://github.com/anthropics/focus",
                    "favicon_url": "https://github.com/favicon.ico"
                },
                "thumbnail_url": "/cache/thumbnails/abc123.jpg",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T14:45:00Z"
            }
        }
    )


class ObjectList(BaseModel):
    """Schema for paginated list of Objects."""

    objects: List[ObjectResponse] = Field(
        default_factory=list,
        description="List of objects"
    )
    total: int = Field(..., ge=0, description="Total number of objects")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "objects": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "space_id": "660e8400-e29b-41d4-a716-446655440001",
                        "type": "link",
                        "title": "GitHub",
                        "description": None,
                        "tags": ["dev"],
                        "position": 0,
                        "metadata": {"url": "https://github.com"},
                        "thumbnail_url": None,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z"
                    }
                ],
                "total": 1
            }
        }
    )


class ObjectReorder(BaseModel):
    """Schema for reordering objects on an space."""

    object_ids: List[UUID] = Field(
        ...,
        min_length=1,
        description="Ordered list of object IDs"
    )

    @field_validator("object_ids")
    @classmethod
    def validate_unique_ids(cls, v: List[UUID]) -> List[UUID]:
        """Ensure all object IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError("Duplicate object IDs are not allowed")
        return v


class ObjectDeleteResponse(BaseModel):
    """Schema for object deletion confirmation."""

    success: bool = Field(..., description="Whether deletion was successful")
    object_id: UUID = Field(..., description="ID of the deleted object")
    message: str = Field(..., description="Success message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "object_id": "550e8400-e29b-41d4-a716-446655440000",
                "message": "Object 'GitHub' deleted successfully"
            }
        }
    )
