"""
Space Pydantic Models

Data models for Space entities - workspaces that contain objects.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict


class SpaceBase(BaseModel):
    """Base Space model with common fields."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Space name",
        examples=["Work Projects", "Personal", "Research"]
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional space description"
    )
    icon: Optional[str] = Field(
        None,
        max_length=50,
        description="Optional icon identifier or emoji",
        examples=["🏝️", "work", "folder"]
    )
    color: Optional[str] = Field(
        None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Optional color in hex format",
        examples=["#3B82F6", "#10B981", "#F59E0B"]
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate and normalize space name."""
        # Strip whitespace
        v = v.strip()

        # Ensure not empty after stripping
        if not v:
            raise ValueError("Space name cannot be empty or only whitespace")

        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize description."""
        if v is not None:
            v = v.strip()
            # Convert empty string to None
            if not v:
                return None
        return v


class SpaceCreate(SpaceBase):
    """
    Schema for creating a new Space.

    Used in POST /api/spaces endpoint.
    """

    # All fields inherited from SpaceBase
    # position is handled server-side (append to end)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Work Projects",
                "description": "All my work-related projects and resources",
                "icon": "💼",
                "color": "#3B82F6"
            }
        }
    )


class SpaceUpdate(BaseModel):
    """
    Schema for updating an existing Space.

    Used in PUT/PATCH /api/spaces/{id} endpoint.
    All fields are optional to allow partial updates.
    """

    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Space name"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Space description"
    )
    icon: Optional[str] = Field(
        None,
        max_length=50,
        description="Icon identifier or emoji"
    )
    color: Optional[str] = Field(
        None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Color in hex format"
    )
    position: Optional[int] = Field(
        None,
        ge=0,
        description="Position in the spaces list (0-based)"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize space name."""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Space name cannot be empty or only whitespace")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize description."""
        if v is not None:
            v = v.strip()
            if not v:
                return None
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Work & Projects",
                "color": "#10B981"
            }
        }
    )


class SpaceResponse(SpaceBase):
    """
    Schema for Space responses.

    Used in GET /api/spaces/{id} and other endpoints that return space data.
    """

    id: UUID = Field(
        ...,
        description="Unique space identifier"
    )
    position: int = Field(
        ...,
        ge=0,
        description="Position in the spaces list (0-based)"
    )
    object_count: int = Field(
        default=0,
        ge=0,
        description="Number of objects on this space"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the space was created"
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the space was last updated"
    )

    model_config = ConfigDict(
        from_attributes=True,  # Allow creating from ORM models
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Work Projects",
                "description": "All my work-related projects and resources",
                "icon": "💼",
                "color": "#3B82F6",
                "position": 0,
                "object_count": 12,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-20T14:45:00Z"
            }
        }
    )


class SpaceSummary(BaseModel):
    """
    Minimal Space schema for lists and references.

    Used when you need to reference an space without full details.
    """

    id: UUID = Field(..., description="Unique space identifier")
    name: str = Field(..., description="Space name")
    icon: Optional[str] = Field(None, description="Icon identifier or emoji")
    color: Optional[str] = Field(None, description="Color in hex format")
    object_count: int = Field(default=0, ge=0, description="Number of objects")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Work Projects",
                "icon": "💼",
                "color": "#3B82F6",
                "object_count": 12
            }
        }
    )


class SpaceList(BaseModel):
    """
    Schema for paginated list of Spaces.

    Used in GET /api/spaces endpoint.
    """

    spaces: List[SpaceResponse] = Field(
        default_factory=list,
        description="List of spaces"
    )
    total: int = Field(
        ...,
        ge=0,
        description="Total number of spaces"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "spaces": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "Work Projects",
                        "description": "Work stuff",
                        "icon": "💼",
                        "color": "#3B82F6",
                        "position": 0,
                        "object_count": 12,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-20T14:45:00Z"
                    },
                    {
                        "id": "660e8400-e29b-41d4-a716-446655440001",
                        "name": "Personal",
                        "description": None,
                        "icon": "🏠",
                        "color": "#10B981",
                        "position": 1,
                        "object_count": 8,
                        "created_at": "2024-01-16T11:00:00Z",
                        "updated_at": "2024-01-16T11:00:00Z"
                    }
                ],
                "total": 2
            }
        }
    )


class SpaceReorder(BaseModel):
    """
    Schema for reordering spaces.

    Used in POST /api/spaces/reorder endpoint.
    """

    space_ids: List[UUID] = Field(
        ...,
        min_length=1,
        description="Ordered list of space IDs in desired sequence"
    )

    @field_validator("space_ids")
    @classmethod
    def validate_unique_ids(cls, v: List[UUID]) -> List[UUID]:
        """Ensure all space IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError("Duplicate space IDs are not allowed")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "space_ids": [
                    "660e8400-e29b-41d4-a716-446655440001",
                    "550e8400-e29b-41d4-a716-446655440000",
                    "770e8400-e29b-41d4-a716-446655440002"
                ]
            }
        }
    )


class SpaceDeleteResponse(BaseModel):
    """
    Schema for space deletion confirmation.

    Used in DELETE /api/spaces/{id} endpoint.
    """

    success: bool = Field(..., description="Whether deletion was successful")
    space_id: UUID = Field(..., description="ID of the deleted space")
    objects_deleted: int = Field(
        ...,
        ge=0,
        description="Number of objects that were also deleted"
    )
    message: str = Field(..., description="Success message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "space_id": "550e8400-e29b-41d4-a716-446655440000",
                "objects_deleted": 12,
                "message": "Space 'Work Projects' and 12 objects deleted successfully"
            }
        }
    )
