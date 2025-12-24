"""
Google OAuth Routes

API endpoints for Google OAuth authentication and Google service integration.
Supports Gmail and Google Drive (including Docs, Sheets, Slides).
"""

from typing import Optional, List
from fastapi import APIRouter, status, Query, Depends
from fastapi.responses import HTMLResponse

from app.models.google import (
    GoogleAuthURL,
    GoogleAuthCallback,
    GoogleAuthSuccess,
    GoogleConnectionStatus,
    GoogleDisconnectResponse,
    GoogleAccountsList,
    GoogleAccount,
    DriveFileList,
    DriveSearchQuery,
    GmailThreadList,
    GmailSearchQuery,
)
from app.services.google.oauth_flow import oauth_service
from app.services.google.token_store import token_store
from app.services.google.drive_client import create_client as create_drive_client
from app.services.google.gmail_client import create_client as create_gmail_client
from app.api.deps import FeatureFlags, get_google_config
from app.core.config import GoogleOAuthSettings
from app.core.exceptions import AppError, BadRequestError, UnauthorizedError
from app.core.logging import get_logger


logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# OAuth Endpoints
# ============================================================================

@router.get(
    "/auth/url",
    response_model=GoogleAuthURL,
    status_code=status.HTTP_200_OK,
    summary="Get Google OAuth URL",
    description="Generate Google OAuth authorization URL with optional scopes.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google OAuth"]
)
async def get_auth_url(
    scopes: Optional[List[str]] = Query(None, description="OAuth scopes (gmail, drive, docs, sheets, slides, userinfo)"),
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GoogleAuthURL:
    """
    Generate Google OAuth authorization URL.

    Args:
        scopes: Optional list of scopes to request (defaults to gmail, drive, userinfo)
        config: Google OAuth configuration

    Returns:
        GoogleAuthURL: Authorization URL and state token

    Raises:
        500: Internal server error
    """
    try:
        result = oauth_service.get_authorization_url(scopes=scopes)

        logger.info(
            "Generated OAuth authorization URL",
            extra={"scopes": scopes or oauth_service.DEFAULT_SCOPES}
        )

        return GoogleAuthURL(
            auth_url=result["auth_url"],
            state=result["state"]
        )

    except Exception as e:
        logger.exception("Failed to generate OAuth URL", extra={"scopes": scopes})
        raise AppError(
            "Unable to generate an authorization link right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_auth_url_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/auth/callback",
    status_code=status.HTTP_200_OK,
    summary="Handle OAuth callback (GET)",
    description="Handle the OAuth callback from Google redirect.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google OAuth"],
    response_class=HTMLResponse
)
async def handle_auth_callback_get(
    code: str = Query(..., description="Authorization code"),
    state: str = Query(..., description="State token"),
    config: GoogleOAuthSettings = Depends(get_google_config)
):
    """
    Handle Google OAuth callback from browser redirect.

    Returns an HTML page that processes the callback and closes the window.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google Sign In - Processing</title>
        <style>
            body {{
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }}
            .container {{
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .spinner {{
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            .success {{
                color: #10b981;
                font-size: 3rem;
            }}
            .error {{
                color: #ef4444;
                font-size: 3rem;
            }}
            h2 {{
                margin: 0.5rem 0;
                color: #1f2937;
            }}
            p {{
                color: #6b7280;
                margin: 0.5rem 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div id="loading">
                <div class="spinner"></div>
                <h2>Connecting to Google...</h2>
                <p>Please wait while we complete the sign-in process.</p>
            </div>
            <div id="success" style="display: none;">
                <div class="success">✓</div>
                <h2>Successfully Connected!</h2>
                <p>You can close this window now.</p>
            </div>
            <div id="error" style="display: none;">
                <div class="error">✗</div>
                <h2>Connection Failed</h2>
                <p id="error-message">Please try again.</p>
            </div>
        </div>
        <script>
            (async function() {{
                try {{
                    const response = await fetch('/api/google/auth/callback', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{
                            code: '{code}',
                            state: '{state}'
                        }})
                    }});

                    if (response.ok) {{
                        document.getElementById('loading').style.display = 'none';
                        document.getElementById('success').style.display = 'block';
                        setTimeout(() => window.close(), 2000);
                    }} else {{
                        throw new Error('Authentication failed');
                    }}
                }} catch (error) {{
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error-message').textContent = error.message;
                }}
            }})();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.post(
    "/auth/callback",
    response_model=GoogleAuthSuccess,
    status_code=status.HTTP_200_OK,
    summary="Handle OAuth callback",
    description="Handle the OAuth callback and exchange authorization code for tokens.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google OAuth"]
)
async def handle_auth_callback_post(
    callback_data: GoogleAuthCallback,
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GoogleAuthSuccess:
    """
    Handle Google OAuth callback.

    Exchange authorization code for access and refresh tokens.

    Args:
        callback_data: Callback data (code, state)
        config: Google OAuth configuration

    Returns:
        GoogleAuthSuccess: Connection success confirmation

    Raises:
        400: Invalid callback data or state mismatch
        500: Internal server error
    """
    try:
        # Handle the OAuth callback
        result = await oauth_service.handle_oauth_callback(
            code=callback_data.code,
            state=callback_data.state
        )

        logger.info(
            "Successfully connected Google account",
            extra={"scopes": result.get("scopes", [])}
        )

        return GoogleAuthSuccess(
            success=True,
            message="Successfully connected to Google",
            scopes=result.get("scopes", [])
        )

    except ValueError as e:
        logger.warning(f"Invalid OAuth callback: {e}")
        raise BadRequestError(
            "Invalid OAuth callback parameters.",
            error_code="google_oauth_invalid_callback",
            details={"error": str(e)},
        )

    except Exception as e:
        logger.exception("Failed to handle OAuth callback", extra={"state": callback_data.state})
        raise AppError(
            "Unable to complete Google sign-in right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_oauth_callback_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/disconnect",
    response_model=GoogleDisconnectResponse,
    status_code=status.HTTP_200_OK,
    summary="Disconnect Google account",
    description="Revoke Google OAuth tokens and disconnect the account.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google OAuth"]
)
async def disconnect_google(
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GoogleDisconnectResponse:
    """
    Disconnect Google account.

    Revokes OAuth tokens and removes stored credentials.

    Args:
        config: Google OAuth configuration

    Returns:
        GoogleDisconnectResponse: Disconnection confirmation

    Raises:
        500: Internal server error
    """
    try:
        # Disconnect all stored Google accounts to avoid stale reuse
        from app.storage.repositories.google_repo import google_tokens_repository

        accounts = await google_tokens_repository.get_all_accounts()
        if not accounts:
            logger.info("No Google accounts to disconnect")
        else:
            for account in accounts:
                user_id = account["email"]
                try:
                    await oauth_service.disconnect(user_id=user_id)
                    logger.info(f"Disconnected Google account {user_id}")
                except Exception as e:
                    logger.warning(f"Failed to disconnect Google account {user_id}: {e}")

        return GoogleDisconnectResponse(
            success=True,
            message="Successfully disconnected from Google"
        )

    except Exception as e:
        logger.exception("Failed to disconnect Google")
        raise AppError(
            "Unable to disconnect Google right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_disconnect_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/accounts",
    response_model=GoogleAccountsList,
    status_code=status.HTTP_200_OK,
    summary="List all connected Google accounts",
    description="Get list of all connected Google accounts.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google OAuth"]
)
async def list_accounts(
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GoogleAccountsList:
    """
    List all connected Google accounts.

    Returns:
        GoogleAccountsList: List of connected accounts

    Raises:
        500: Internal server error
    """
    try:
        from app.storage.repositories.google_repo import google_tokens_repository

        accounts_data = await google_tokens_repository.get_all_accounts()

        accounts = [
            GoogleAccount(
                email=account["email"],
                scopes=account["scopes"],
                connected_at=account["connected_at"]
            )
            for account in accounts_data
        ]

        logger.debug(f"Found {len(accounts)} connected Google accounts")

        return GoogleAccountsList(accounts=accounts)

    except Exception as e:
        logger.exception("Failed to list accounts")
        raise AppError(
            "Unable to retrieve connected accounts right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_accounts_list_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/status",
    response_model=GoogleConnectionStatus,
    status_code=status.HTTP_200_OK,
    summary="Get Google connection status",
    description="Check if any Google account is connected (legacy endpoint - use /accounts for multi-account support).",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google OAuth"]
)
async def get_connection_status(
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GoogleConnectionStatus:
    """
    Get Google connection status (legacy - checks if ANY account is connected).

    Returns:
        GoogleConnectionStatus: Connection status and available scopes

    Raises:
        500: Internal server error
    """
    try:
        from app.storage.repositories.google_repo import google_tokens_repository

        accounts_data = await google_tokens_repository.get_all_accounts()

        # Consider connected only if at least one account does NOT require reauth
        connected_accounts = [a for a in accounts_data if not a.get("requires_reauth")]
        is_connected = len(connected_accounts) > 0
        requires_reauth = not is_connected and bool(accounts_data)

        # Prefer a connected account for display; otherwise show first stored account
        display_account = connected_accounts[0] if connected_accounts else (accounts_data[0] if accounts_data else None)

        user_email = display_account.get("email") if display_account else None
        scopes = display_account.get("scopes") if display_account else []
        token_expires_at = display_account.get("expires_at") if display_account else None

        logger.debug(f"Google connection status: {is_connected}")

        return GoogleConnectionStatus(
            connected=is_connected,
            user_email=user_email,
            scopes=scopes or [],
            token_expires_at=token_expires_at,
            requires_reauth=requires_reauth
        )

    except Exception as e:
        logger.exception("Failed to get connection status")
        raise AppError(
            "Unable to check Google connection status right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_status_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


# ============================================================================
# Google Drive Endpoints
# ============================================================================

@router.get(
    "/drive/files",
    response_model=DriveFileList,
    status_code=status.HTTP_200_OK,
    summary="List Google Drive files",
    description="List files from Google Drive with pagination and filtering.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google Drive"]
)
async def list_drive_files(
    page_size: int = Query(20, ge=1, le=1000, description="Number of files to return"),
    page_token: Optional[str] = Query(None, description="Page token for pagination"),
    query: Optional[str] = Query(None, description="Drive query string"),
    order_by: str = Query("modifiedTime desc", description="Sort order"),
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> DriveFileList:
    """
    List Google Drive files.

    Args:
        page_size: Number of files to return
        page_token: Page token for pagination
        query: Drive query string (optional)
        order_by: Sort order (default: modifiedTime desc)
        config: Google OAuth configuration

    Returns:
        DriveFileList: List of Drive files

    Raises:
        401: Not connected to Google
        500: Internal server error
    """
    try:
        # Check if connected
        if not await token_store.is_connected():
            raise UnauthorizedError(
                "Google account not connected. Please authenticate first.",
                error_code="google_not_connected",
            )

        # Get credentials
        credentials = await oauth_service.get_credentials()
        if not credentials:
            raise UnauthorizedError(
                "Failed to retrieve credentials. Please re-authenticate.",
                error_code="google_credentials_missing",
            )

        # Create Drive client
        drive_client = create_drive_client(credentials)

        # List files
        files = await drive_client.list_files(
            page_size=page_size,
            page_token=page_token,
            query=query,
            order_by=order_by
        )

        logger.info(
            f"Listed {len(files.files)} Drive files",
            extra={"total": files.total, "has_next": bool(files.next_page_token)}
        )

        return files

    except UnauthorizedError:
        raise

    except Exception as e:
        logger.exception("Failed to list Drive files", extra={"page_size": page_size, "query": query})
        raise AppError(
            "Unable to list Drive files right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_drive_list_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/drive/search",
    response_model=DriveFileList,
    status_code=status.HTTP_200_OK,
    summary="Search Google Drive files",
    description="Search files in Google Drive with filters.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google Drive"]
)
async def search_drive_files(
    search_query: DriveSearchQuery,
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> DriveFileList:
    """
    Search Google Drive files.

    Args:
        search_query: Search query parameters
        config: Google OAuth configuration

    Returns:
        DriveFileList: Matching Drive files

    Raises:
        401: Not connected to Google
        500: Internal server error
    """
    try:
        # Check if connected
        if not await token_store.is_connected():
            raise UnauthorizedError(
                "Google account not connected. Please authenticate first.",
                error_code="google_not_connected",
            )

        # Get credentials
        credentials = await oauth_service.get_credentials()
        if not credentials:
            raise UnauthorizedError(
                "Failed to retrieve credentials. Please re-authenticate.",
                error_code="google_credentials_missing",
            )

        # Create Drive client
        drive_client = create_drive_client(credentials)

        # Search files
        files = await drive_client.search_files(search_query)

        logger.info(
            f"Found {files.total} Drive files",
            extra={"query": search_query.query}
        )

        return files

    except UnauthorizedError:
        raise

    except Exception as e:
        logger.exception("Failed to search Drive files", extra={"query": search_query.query})
        raise AppError(
            "Unable to search Drive files right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_drive_search_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.get(
    "/drive/recent",
    response_model=DriveFileList,
    status_code=status.HTTP_200_OK,
    summary="List recent Drive files",
    description="List recently modified files from Google Drive.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Google Drive"]
)
async def list_recent_drive_files(
    page_size: int = Query(20, ge=1, le=100, description="Number of files to return"),
    include_docs: bool = Query(True, description="Include Google Docs"),
    include_sheets: bool = Query(True, description="Include Google Sheets"),
    include_slides: bool = Query(True, description="Include Google Slides"),
    include_other: bool = Query(True, description="Include other file types"),
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> DriveFileList:
    """
    List recently modified Drive files.

    Args:
        page_size: Number of files to return
        include_docs: Include Google Docs
        include_sheets: Include Google Sheets
        include_slides: Include Google Slides
        include_other: Include other file types
        config: Google OAuth configuration

    Returns:
        DriveFileList: Recent Drive files

    Raises:
        401: Not connected to Google
        500: Internal server error
    """
    try:
        # Check if connected
        if not await token_store.is_connected():
            raise UnauthorizedError(
                "Google account not connected. Please authenticate first.",
                error_code="google_not_connected",
            )

        # Get credentials
        credentials = await oauth_service.get_credentials()
        if not credentials:
            raise UnauthorizedError(
                "Failed to retrieve credentials. Please re-authenticate.",
                error_code="google_credentials_missing",
            )

        # Create Drive client
        drive_client = create_drive_client(credentials)

        # List recent files
        files = await drive_client.list_recent_files(
            page_size=page_size,
            include_docs=include_docs,
            include_sheets=include_sheets,
            include_slides=include_slides,
            include_other=include_other
        )

        logger.info(f"Listed {len(files.files)} recent Drive files")

        return files

    except UnauthorizedError:
        raise

    except Exception as e:
        logger.exception("Failed to list recent Drive files", extra={"page_size": page_size})
        raise AppError(
            "Unable to list recent Drive files right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="google_drive_recent_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


# ============================================================================
# Gmail Endpoints
# ============================================================================

@router.get(
    "/gmail/threads",
    response_model=GmailThreadList,
    status_code=status.HTTP_200_OK,
    summary="List Gmail threads",
    description="List email threads from Gmail with pagination and filtering.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Gmail"]
)
async def list_gmail_threads(
    page_size: int = Query(20, ge=1, le=500, description="Number of threads to return"),
    page_token: Optional[str] = Query(None, description="Page token for pagination"),
    label_ids: Optional[List[str]] = Query(None, description="Filter by label IDs (INBOX, UNREAD, etc.)"),
    include_spam_trash: bool = Query(False, description="Include spam and trash"),
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GmailThreadList:
    """
    List Gmail threads.

    Args:
        page_size: Number of threads to return
        page_token: Page token for pagination
        label_ids: Filter by label IDs
        include_spam_trash: Include spam and trash
        config: Google OAuth configuration

    Returns:
        GmailThreadList: List of email threads

    Raises:
        401: Not connected to Google
        500: Internal server error
    """
    try:
        # Check if connected
        if not await token_store.is_connected():
            raise UnauthorizedError(
                "Google account not connected. Please authenticate first.",
                error_code="google_not_connected",
            )

        # Get credentials
        credentials = await oauth_service.get_credentials()
        if not credentials:
            raise UnauthorizedError(
                "Failed to retrieve credentials. Please re-authenticate.",
                error_code="google_credentials_missing",
            )

        # Create Gmail client
        gmail_client = create_gmail_client(credentials)

        # List threads
        threads = await gmail_client.list_threads(
            page_size=page_size,
            page_token=page_token,
            label_ids=label_ids,
            include_spam_trash=include_spam_trash
        )

        logger.info(
            f"Listed {len(threads.threads)} Gmail threads",
            extra={"total": threads.total, "has_next": bool(threads.next_page_token)}
        )

        return threads

    except UnauthorizedError:
        raise

    except Exception as e:
        logger.exception("Failed to list Gmail threads", extra={"page_size": page_size})
        raise AppError(
            "Unable to list Gmail threads right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="gmail_threads_list_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e


@router.post(
    "/gmail/search",
    response_model=GmailThreadList,
    status_code=status.HTTP_200_OK,
    summary="Search Gmail threads",
    description="Search email threads in Gmail.",
    dependencies=[Depends(FeatureFlags.google_integration)],
    tags=["Gmail"]
)
async def search_gmail_threads(
    search_query: GmailSearchQuery,
    config: GoogleOAuthSettings = Depends(get_google_config)
) -> GmailThreadList:
    """
    Search Gmail threads.

    Args:
        search_query: Search query parameters
        config: Google OAuth configuration

    Returns:
        GmailThreadList: Matching email threads

    Raises:
        401: Not connected to Google
        500: Internal server error
    """
    try:
        # Check if connected
        if not await token_store.is_connected():
            raise UnauthorizedError(
                "Google account not connected. Please authenticate first.",
                error_code="google_not_connected",
            )

        # Get credentials
        credentials = await oauth_service.get_credentials()
        if not credentials:
            raise UnauthorizedError(
                "Failed to retrieve credentials. Please re-authenticate.",
                error_code="google_credentials_missing",
            )

        # Create Gmail client
        gmail_client = create_gmail_client(credentials)

        # Search threads
        threads = await gmail_client.search(search_query)

        logger.info(
            f"Found {threads.total} Gmail threads",
            extra={"query": search_query.query}
        )

        return threads

    except UnauthorizedError:
        raise

    except Exception as e:
        logger.exception("Failed to search Gmail threads", extra={"query": search_query.query})
        raise AppError(
            "Unable to search Gmail threads right now.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="gmail_threads_search_failed",
            details={"error": str(e)},
            log_level="error",
        ) from e
