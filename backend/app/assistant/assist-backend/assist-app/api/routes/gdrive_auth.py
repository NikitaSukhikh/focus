"""Routes for Google Drive OAuth flow."""

from fastapi import APIRouter
from app.tools.gdrive.gdrive_tools import gdrive_client

router = APIRouter()


@router.post("/gdrive/auth/start")
async def start_gdrive_auth():
    """
    Start Google Drive OAuth flow in background. Returns session ID immediately.
    Frontend should poll /gdrive/auth/poll/{session_id} for status updates.
    """
    if not gdrive_client.oauth_manager:
        return {
            "success": False,
            "error": "Google Drive OAuth not configured on server.",
        }

    # Check if already authenticated
    if gdrive_client.oauth_manager.is_authenticated():
        return {
            "success": True,
            "authenticated": True,
            "message": "Already authenticated with Google Drive."
        }

    # Start OAuth flow in background - returns immediately with session ID
    try:
        session_id = gdrive_client.oauth_manager.start_oauth_flow()
        return {
            "success": True,
            "session_id": session_id,
            "message": "OAuth flow started - opening browser..."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/gdrive/auth/poll/{session_id}")
async def poll_gdrive_auth(session_id: str):
    """
    Poll for OAuth flow status.

    Returns:
        - status: "starting", "opening_browser", "waiting_for_user", "processing_callback", "success", "error"
        - completed: boolean
        - authenticated: boolean (only true on success)
        - error: string (only present on error)
    """
    if not gdrive_client.oauth_manager:
        return {
            "success": False,
            "error": "Google Drive OAuth not configured on server.",
        }

    status = gdrive_client.oauth_manager.get_oauth_status(session_id)
    return {
        "success": True,
        **status
    }


@router.get("/gdrive/auth/url")
async def get_gdrive_auth_url():
    """
    Return the Google OAuth authorization URL without launching a browser.
    """
    if not gdrive_client.oauth_manager:
        return {
            "success": False,
            "error": "Google Drive OAuth not configured on server.",
        }
    return gdrive_client.oauth_manager.get_auth_url()


@router.get("/gdrive/auth/status")
async def get_gdrive_auth_status():
    """
    Check if user is authenticated with Google Drive.
    """
    if not gdrive_client.oauth_manager:
        return {
            "success": False,
            "authenticated": False,
            "error": "Google Drive OAuth not configured on server.",
        }

    is_authenticated = gdrive_client.oauth_manager.is_authenticated()
    return {
        "success": True,
        "authenticated": is_authenticated,
        "message": "Authenticated with Google Drive" if is_authenticated else "Not authenticated"
    }


@router.post("/gdrive/auth/revoke")
async def revoke_gdrive_auth():
    """
    Revoke Google Drive authentication and delete stored credentials.
    """
    if not gdrive_client.oauth_manager:
        return {
            "success": False,
            "error": "Google Drive OAuth not configured on server.",
        }

    try:
        gdrive_client.oauth_manager.revoke_credentials()
        return {
            "success": True,
            "message": "Successfully revoked Google Drive authentication."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to revoke authentication: {str(e)}"
        }
