"""
File upload API endpoint.

Handles file uploads from the frontend, particularly for PDF and other document attachments.
"""

import logging
import shutil
from pathlib import Path
from typing import List
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf", ".doc", ".docx", ".txt", ".rtf",
    # Spreadsheets
    ".xls", ".xlsx", ".csv",
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg",
    # Archives
    ".zip", ".rar", ".7z", ".tar", ".gz",
    # Other
    ".json", ".xml", ".yaml", ".yml"
}

# Max file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024


class UploadResponse(BaseModel):
    """Response model for file upload."""
    success: bool
    file_path: str = ""
    filename: str = ""
    size: int = 0
    message: str = ""
    error: str = ""


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file to the server.

    Args:
        file: File to upload

    Returns:
        UploadResponse with file information
    """
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_name = Path(file.filename).stem
        safe_filename = f"{original_name}_{timestamp}{file_ext}"
        file_path = UPLOAD_DIR / safe_filename

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()

            # Check file size
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
                )

            buffer.write(content)

        logger.info(f"File uploaded successfully: {safe_filename}")

        return UploadResponse(
            success=True,
            file_path=str(file_path.absolute()),
            filename=safe_filename,
            size=len(content),
            message=f"File '{file.filename}' uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error uploading file: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return UploadResponse(
            success=False,
            error=error_msg
        )


@router.post("/upload/multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    """
    Upload multiple files at once.

    Args:
        files: List of files to upload

    Returns:
        List of UploadResponse objects
    """
    results = []

    for file in files:
        result = await upload_file(file)
        results.append(result)

    return {
        "success": all(r.success for r in results),
        "files": results,
        "total": len(files),
        "uploaded": sum(1 for r in results if r.success)
    }


@router.get("/uploads")
async def list_uploads():
    """
    List all uploaded files.

    Returns:
        List of uploaded file information
    """
    try:
        files = []
        for file_path in UPLOAD_DIR.iterdir():
            if file_path.is_file():
                stat = file_path.stat()
                files.append({
                    "filename": file_path.name,
                    "path": str(file_path.absolute()),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })

        # Sort by modification time (most recent first)
        files.sort(key=lambda x: x["modified"], reverse=True)

        return {
            "success": True,
            "files": files,
            "total": len(files)
        }

    except Exception as e:
        logger.error(f"Error listing uploads: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@router.delete("/uploads/{filename}")
async def delete_upload(filename: str):
    """
    Delete an uploaded file.

    Args:
        filename: Name of the file to delete

    Returns:
        Success status
    """
    try:
        file_path = UPLOAD_DIR / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Not a file")

        # Security check: ensure file is within upload directory
        if not str(file_path.resolve()).startswith(str(UPLOAD_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")

        file_path.unlink()

        logger.info(f"File deleted: {filename}")

        return {
            "success": True,
            "message": f"File '{filename}' deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
