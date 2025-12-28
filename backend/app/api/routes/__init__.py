"""
API Routes Module

Contains all FastAPI router modules for the Ocean backend API.
"""

from app.api.routes import health, islands, objects, preview, google_oauth, internal_storage, thumbnails, undo

__all__ = [
    "health",
    "islands",
    "objects",
    "preview",
    "google_oauth",
    "internal_storage",
    "thumbnails",
    "undo",
]
