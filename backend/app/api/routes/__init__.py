"""
API Routes Module

Contains all FastAPI router modules for the Focus backend API.
"""

from app.api.routes import health, spaces, objects, preview, internal_storage, thumbnails, undo

__all__ = [
    "health",
    "spaces",
    "objects",
    "preview",
    "internal_storage",
    "thumbnails",
    "undo",
]
