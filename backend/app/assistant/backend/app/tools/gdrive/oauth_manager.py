"""
Google Drive OAuth 2.0 Manager.

Handles OAuth authentication flow and token management for Google Drive API.
"""

import os
import json
import logging
import webbrowser
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

logger = logging.getLogger(__name__)


# Global OAuth session state - tracks ongoing OAuth flows
_oauth_sessions: Dict[str, Dict[str, Any]] = {}


class GDriveOAuthManager:
    """Manages OAuth 2.0 authentication for Google Drive API."""

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        credentials_path: Optional[str] = None,
        token_path: Optional[str] = None,
        scopes: Optional[list] = None
    ):
        """
        Initialize OAuth manager.

        Args:
            client_id: Google OAuth Client ID
            client_secret: Google OAuth Client Secret
            credentials_path: Path to credentials JSON file
            token_path: Path to store/load access tokens
            scopes: List of OAuth scopes
        """
        self.client_id = client_id or os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('GOOGLE_CLIENT_SECRET')

        # Default credentials path: check env first, then a shared drop location
        default_creds = Path(__file__).parent.parent.parent.parent / 'data' / 'gdrive_tokens' / 'client_secret.json'
        self.credentials_path = (
            credentials_path
            or os.getenv('GOOGLE_CREDENTIALS_PATH')
            or (str(default_creds) if default_creds.exists() else None)
        )

        # Default token storage path
        if token_path is None:
            token_dir = Path(__file__).parent.parent.parent.parent / 'data' / 'gdrive_tokens'
            token_dir.mkdir(parents=True, exist_ok=True)
            self.token_path = str(token_dir / 'token.json')
        else:
            self.token_path = token_path

        # Default scopes - include both Drive and Gmail
        if scopes is None:
            default_scopes = [
                'https://www.googleapis.com/auth/drive.readonly',  # Google Drive read access
                'https://www.googleapis.com/auth/gmail.send'        # Gmail send access
            ]
            scopes_env = os.getenv('GOOGLE_SCOPES', ','.join(default_scopes))
            self.scopes = [s.strip() for s in scopes_env.split(',')]
        else:
            self.scopes = scopes

        self._credentials: Optional[Credentials] = None
        self._service = None

    def get_credentials(self) -> Optional[Credentials]:
        """
        Get valid OAuth credentials.

        Returns:
            Valid Google OAuth credentials or None
        """
        # Return cached credentials if valid
        if self._credentials and self._credentials.valid:
            return self._credentials

        # Try to load from token file
        if os.path.exists(self.token_path):
            try:
                self._credentials = Credentials.from_authorized_user_file(
                    self.token_path, self.scopes
                )
                logger.info("Loaded credentials from token file")
            except Exception as e:
                logger.warning(f"Failed to load credentials from token file: {e}")
                self._credentials = None

        # Refresh credentials if expired
        if self._credentials and self._credentials.expired and self._credentials.refresh_token:
            try:
                self._credentials.refresh(Request())
                self._save_credentials()
                logger.info("Refreshed expired credentials")
                return self._credentials
            except Exception as e:
                logger.error(f"Failed to refresh credentials: {e}")
                self._credentials = None

        # Return if we have valid credentials
        if self._credentials and self._credentials.valid:
            return self._credentials

        # Need to authenticate
        logger.warning("No valid credentials available. User needs to authenticate.")
        return None

    def start_oauth_flow(self) -> str:
        """
        Start OAuth flow in background and return session ID immediately.
        Frontend can poll get_oauth_status() to check progress.

        Returns:
            Session ID for tracking this OAuth flow
        """
        import threading
        import uuid

        session_id = str(uuid.uuid4())

        # Initialize session state
        _oauth_sessions[session_id] = {
            "status": "starting",
            "error": None,
            "authenticated": False,
            "completed": False
        }

        # Start OAuth in background thread
        thread = threading.Thread(
            target=self._run_oauth_flow,
            args=(session_id,),
            daemon=True
        )
        thread.start()

        return session_id

    def get_oauth_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get current status of an OAuth flow.

        Args:
            session_id: Session ID returned by start_oauth_flow()

        Returns:
            Dict with status, error, authenticated, completed fields
        """
        return _oauth_sessions.get(session_id, {
            "status": "unknown",
            "error": "Session not found",
            "authenticated": False,
            "completed": True
        })

    def _run_oauth_flow(self, session_id: str) -> None:
        """
        Run OAuth flow in background thread.
        Updates session state as flow progresses.
        """
        import socket
        from http.server import HTTPServer, BaseHTTPRequestHandler
        from urllib.parse import urlparse, parse_qs
        import time

        try:
            # Update status
            _oauth_sessions[session_id]["status"] = "creating_server"

            # Create OAuth flow
            flow = self._create_flow()

            # Find available port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('localhost', 0))
            port = sock.getsockname()[1]
            sock.close()

            # Local state for this OAuth attempt
            oauth_state = {
                "credentials": None,
                "error": None,
                "completed": False,
                "request_received": False
            }

            class OAuthHandler(BaseHTTPRequestHandler):
                """Custom handler for OAuth callback."""

                def log_message(self, format, *args):
                    """Suppress default logging."""
                    pass

                def do_GET(self):
                    """Handle OAuth callback."""
                    oauth_state["request_received"] = True
                    _oauth_sessions[session_id]["status"] = "processing_callback"

                    # Parse the callback URL
                    parsed = urlparse(self.path)
                    params = parse_qs(parsed.query)

                    # Check for errors
                    if 'error' in params:
                        error_msg = params['error'][0]
                        if error_msg == 'access_denied':
                            oauth_state["error"] = "Access denied - you declined the authorization request"
                        else:
                            oauth_state["error"] = f"Authorization error: {error_msg}"

                        # Send error page to browser
                        self.send_response(400)
                        self.send_header('Content-type', 'text/html')
                        self.end_headers()
                        self.wfile.write(b"""
                        <html>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h2 style="color: #d32f2f;">Authorization Failed</h2>
                                <p>You declined the authorization request.</p>
                                <p>You can close this window and try again.</p>
                            </body>
                        </html>
                        """)
                        oauth_state["completed"] = True
                        return

                    # Check for authorization code
                    if 'code' in params:
                        try:
                            # Exchange code for credentials
                            flow.fetch_token(code=params['code'][0])
                            oauth_state["credentials"] = flow.credentials
                            oauth_state["completed"] = True

                            # Send success page to browser
                            self.send_response(200)
                            self.send_header('Content-type', 'text/html')
                            self.end_headers()
                            self.wfile.write(b"""
                            <html>
                                <body style="font-family: Arial; text-align: center; padding: 50px;">
                                    <h2 style="color: #4caf50;">Authentication Successful!</h2>
                                    <p>You have successfully authorized Alfy to access your Google account.</p>
                                    <p>You can close this window now.</p>
                                    <script>setTimeout(() => window.close(), 2000);</script>
                                </body>
                            </html>
                            """)
                        except Exception as e:
                            oauth_state["error"] = f"Failed to exchange authorization code: {str(e)}"
                            oauth_state["completed"] = True

                            # Send error page
                            self.send_response(500)
                            self.send_header('Content-type', 'text/html')
                            self.end_headers()
                            self.wfile.write(f"""
                            <html>
                                <body style="font-family: Arial; text-align: center; padding: 50px;">
                                    <h2 style="color: #d32f2f;">Authentication Error</h2>
                                    <p>{oauth_state["error"]}</p>
                                    <p>You can close this window and try again.</p>
                                </body>
                            </html>
                            """.encode())
                    else:
                        # Unknown callback
                        oauth_state["error"] = "Invalid OAuth callback - no authorization code received"
                        oauth_state["completed"] = True

                        self.send_response(400)
                        self.send_header('Content-type', 'text/html')
                        self.end_headers()
                        self.wfile.write(b"""
                        <html>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h2 style="color: #d32f2f;">Invalid Callback</h2>
                                <p>The OAuth callback was invalid.</p>
                                <p>You can close this window and try again.</p>
                            </body>
                        </html>
                        """)

            # Start server
            _oauth_sessions[session_id]["status"] = "starting_server"
            server = HTTPServer(('localhost', port), OAuthHandler)

            # Generate authorization URL
            flow.redirect_uri = f"http://localhost:{port}/"
            auth_url, _ = flow.authorization_url(
                access_type="offline",
                prompt="consent",
                include_granted_scopes="true"
            )

            # Open browser
            _oauth_sessions[session_id]["status"] = "opening_browser"
            logger.info(f"Opening browser for OAuth at: {auth_url}")
            try:
                webbrowser.open(auth_url)
            except Exception as e:
                logger.warning(f"Failed to open browser: {e}")
                _oauth_sessions[session_id]["status"] = "error"
                _oauth_sessions[session_id]["error"] = f"Failed to open browser: {str(e)}"
                _oauth_sessions[session_id]["completed"] = True
                return

            # Wait for callback
            _oauth_sessions[session_id]["status"] = "waiting_for_user"
            start_time = time.time()
            timeout_seconds = 120

            while not oauth_state["completed"]:
                # Handle one request
                server.handle_request()

                # Check timeout
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    oauth_state["completed"] = True
                    if not oauth_state["request_received"]:
                        oauth_state["error"] = "Authorization timed out - browser may have been closed without completing authorization"
                    else:
                        oauth_state["error"] = "Authorization process did not complete in time"
                    break

            # Update session with results
            if oauth_state["error"]:
                _oauth_sessions[session_id]["status"] = "error"
                _oauth_sessions[session_id]["error"] = oauth_state["error"]
                _oauth_sessions[session_id]["completed"] = True
                self._credentials = None
            elif oauth_state["credentials"]:
                self._credentials = oauth_state["credentials"]
                self._save_credentials()
                _oauth_sessions[session_id]["status"] = "success"
                _oauth_sessions[session_id]["authenticated"] = True
                _oauth_sessions[session_id]["completed"] = True
                logger.info("Successfully authenticated with Google Drive")
            else:
                _oauth_sessions[session_id]["status"] = "error"
                _oauth_sessions[session_id]["error"] = "Authorization completed but no credentials received"
                _oauth_sessions[session_id]["completed"] = True
                self._credentials = None

        except Exception as e:
            logger.error(f"OAuth flow error: {e}")
            _oauth_sessions[session_id]["status"] = "error"
            _oauth_sessions[session_id]["error"] = str(e)
            _oauth_sessions[session_id]["completed"] = True
            self._credentials = None

    def authenticate_blocking(self) -> Credentials:
        """
        Start OAuth flow with custom local server that detects browser closure.

        This implementation:
        1. Starts a local HTTP server to receive OAuth callback
        2. Opens browser to Google OAuth page
        3. Monitors server for incoming requests
        4. Detects if browser closes without completing OAuth
        5. Returns credentials on success or raises exception on failure

        Returns:
            New Google OAuth credentials

        Raises:
            ValueError: If credentials configuration is invalid
            Exception: If OAuth flow fails, browser closes, or access denied
        """
        import threading
        import socket
        from http.server import HTTPServer, BaseHTTPRequestHandler
        from urllib.parse import urlparse, parse_qs
        import time

        # Create OAuth flow
        flow = self._create_flow()

        # Find available port
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(('localhost', 0))
        port = sock.getsockname()[1]
        sock.close()

        # State to track OAuth completion
        oauth_state = {
            "credentials": None,
            "error": None,
            "completed": False,
            "server_started": False,
            "request_received": False
        }

        class OAuthHandler(BaseHTTPRequestHandler):
            """Custom handler for OAuth callback."""

            def log_message(self, format, *args):
                """Suppress default logging."""
                pass

            def do_GET(self):
                """Handle OAuth callback."""
                oauth_state["request_received"] = True

                # Parse the callback URL
                parsed = urlparse(self.path)
                params = parse_qs(parsed.query)

                # Check for errors
                if 'error' in params:
                    error_msg = params['error'][0]
                    if error_msg == 'access_denied':
                        oauth_state["error"] = "Access denied - you declined the authorization request"
                    else:
                        oauth_state["error"] = f"Authorization error: {error_msg}"

                    # Send error page to browser
                    self.send_response(400)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(b"""
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h2 style="color: #d32f2f;">Authorization Failed</h2>
                            <p>You declined the authorization request.</p>
                            <p>You can close this window and try again.</p>
                        </body>
                    </html>
                    """)
                    oauth_state["completed"] = True
                    return

                # Check for authorization code
                if 'code' in params:
                    try:
                        # Exchange code for credentials
                        flow.fetch_token(code=params['code'][0])
                        oauth_state["credentials"] = flow.credentials
                        oauth_state["completed"] = True

                        # Send success page to browser
                        self.send_response(200)
                        self.send_header('Content-type', 'text/html')
                        self.end_headers()
                        self.wfile.write(b"""
                        <html>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h2 style="color: #4caf50;">Authentication Successful!</h2>
                                <p>You have successfully authorized Alfy to access your Google account.</p>
                                <p>You can close this window now.</p>
                                <script>setTimeout(() => window.close(), 2000);</script>
                            </body>
                        </html>
                        """)
                    except Exception as e:
                        oauth_state["error"] = f"Failed to exchange authorization code: {str(e)}"
                        oauth_state["completed"] = True

                        # Send error page
                        self.send_response(500)
                        self.send_header('Content-type', 'text/html')
                        self.end_headers()
                        self.wfile.write(f"""
                        <html>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h2 style="color: #d32f2f;">Authentication Error</h2>
                                <p>{oauth_state["error"]}</p>
                                <p>You can close this window and try again.</p>
                            </body>
                        </html>
                        """.encode())
                else:
                    # Unknown callback
                    oauth_state["error"] = "Invalid OAuth callback - no authorization code received"
                    oauth_state["completed"] = True

                    self.send_response(400)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(b"""
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h2 style="color: #d32f2f;">Invalid Callback</h2>
                            <p>The OAuth callback was invalid.</p>
                            <p>You can close this window and try again.</p>
                        </body>
                    </html>
                    """)

        def run_server():
            """Run the OAuth callback server."""
            try:
                server = HTTPServer(('localhost', port), OAuthHandler)
                oauth_state["server_started"] = True

                # Run server until OAuth completes or times out
                while not oauth_state["completed"]:
                    server.handle_request()

            except Exception as e:
                logger.error(f"OAuth server error: {e}")
                oauth_state["error"] = f"Server error: {str(e)}"
                oauth_state["completed"] = True

        # Start server in background thread
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()

        # Wait for server to start
        timeout = time.time() + 5
        while not oauth_state["server_started"] and time.time() < timeout:
            time.sleep(0.1)

        if not oauth_state["server_started"]:
            raise Exception("Failed to start OAuth callback server")

        # Generate authorization URL with our redirect URI
        flow.redirect_uri = f"http://localhost:{port}/"
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            include_granted_scopes="true"
        )

        # Open browser
        logger.info(f"Opening browser for OAuth at: {auth_url}")
        try:
            webbrowser.open(auth_url)
        except Exception as e:
            logger.warning(f"Failed to open browser: {e}")
            raise Exception(f"Failed to open browser. Please visit this URL manually: {auth_url}")

        # Monitor for completion with timeout
        start_time = time.time()
        timeout_seconds = 120  # 2 minutes should be enough
        check_interval = 0.5  # Check every 500ms

        while not oauth_state["completed"]:
            elapsed = time.time() - start_time

            # Check for timeout
            if elapsed > timeout_seconds:
                oauth_state["completed"] = True
                if not oauth_state["request_received"]:
                    # No request received at all - browser likely closed
                    raise Exception("Authorization timed out - browser may have been closed without completing authorization. Please try again.")
                else:
                    # Request was received but not completed
                    raise Exception("Authorization process did not complete. Please try again.")

            time.sleep(check_interval)

        # Check results
        if oauth_state["error"]:
            self._credentials = None
            raise Exception(oauth_state["error"])

        if oauth_state["credentials"]:
            self._credentials = oauth_state["credentials"]
            self._save_credentials()
            logger.info("Successfully authenticated with Google Drive")
            return self._credentials
        else:
            self._credentials = None
            raise Exception("Authorization completed but no credentials received")

    def authenticate(self, timeout_seconds: int = 60) -> Credentials:
        """
        Start OAuth flow to get new credentials with timeout.

        Args:
            timeout_seconds: Maximum time to wait for user to complete OAuth

        Returns:
            New Google OAuth credentials

        Raises:
            ValueError: If credentials configuration is invalid
            TimeoutError: If user doesn't complete OAuth within timeout period
            Exception: If OAuth flow fails for any reason
        """
        import signal
        import threading

        # Create OAuth flow
        flow = self._create_flow()
        result = {"credentials": None, "error": None}

        def run_oauth():
            try:
                # Let run_local_server handle everything including opening the browser
                result["credentials"] = flow.run_local_server(
                    port=0,
                    authorization_prompt_message='Please visit this URL to authorize access: {url}',
                    success_message='Authentication successful! You can close this window.',
                    open_browser=True,
                    access_type="offline",
                    prompt="consent"
                )
            except KeyboardInterrupt:
                result["error"] = "Authentication cancelled by user"
            except Exception as e:
                logger.error(f"OAuth authentication failed: {e}")
                if "access" in str(e).lower() or "denied" in str(e).lower():
                    result["error"] = "Access denied or user cancelled authorization"
                else:
                    result["error"] = str(e)

        # Run OAuth in thread with timeout
        thread = threading.Thread(target=run_oauth, daemon=True)
        thread.start()
        thread.join(timeout=timeout_seconds)

        # Check if thread completed
        if thread.is_alive():
            # Timeout - user didn't complete OAuth
            logger.warning(f"OAuth flow timed out after {timeout_seconds} seconds")
            self._credentials = None
            raise TimeoutError("Authorization timed out. Please try again.")

        # Check for errors
        if result["error"]:
            self._credentials = None
            raise Exception(result["error"])

        # Success
        if result["credentials"]:
            self._credentials = result["credentials"]
            self._save_credentials()
            logger.info("Successfully authenticated with Google Drive")
            return self._credentials
        else:
            self._credentials = None
            raise Exception("Authentication failed for unknown reason")

    def get_auth_url(self) -> Dict[str, Any]:
        """Return an auth URL without launching the browser."""
        try:
            flow = self._create_flow()
            auth_url, _ = flow.authorization_url(
                access_type="offline",
                prompt="consent",
                include_granted_scopes="true"
            )
            return {"success": True, "auth_url": auth_url}
        except Exception as e:
            logger.error(f"Failed to generate auth URL: {e}")
            return {"success": False, "error": str(e)}

    def _create_flow(self) -> InstalledAppFlow:
        """
        Create OAuth flow.

        Returns:
            InstalledAppFlow instance

        Raises:
            ValueError: If credentials configuration is invalid
        """
        # Use credentials JSON file if provided
        if self.credentials_path and os.path.exists(self.credentials_path):
            return InstalledAppFlow.from_client_secrets_file(
                self.credentials_path,
                self.scopes
            )

        # Use client ID and secret
        if self.client_id and self.client_secret:
            client_config = {
                "installed": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "redirect_uris": ["http://localhost"]
                }
            }
            return InstalledAppFlow.from_client_config(
                client_config,
                self.scopes
            )

        raise ValueError(
            "No OAuth credentials configured. Please provide a Google OAuth client:\n"
            "- Drop client_secret.json at backend/data/gdrive_tokens/client_secret.json, or\n"
            "- Set GOOGLE_CREDENTIALS_PATH to your OAuth JSON, or\n"
            "- Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars."
        )

    def _save_credentials(self):
        """Save credentials to token file."""
        if self._credentials:
            try:
                token_dir = Path(self.token_path).parent
                token_dir.mkdir(parents=True, exist_ok=True)

                with open(self.token_path, 'w') as token_file:
                    token_file.write(self._credentials.to_json())
                logger.info(f"Saved credentials to {self.token_path}")
            except Exception as e:
                logger.error(f"Failed to save credentials: {e}")

    def get_drive_service(self):
        """
        Get Google Drive API service instance.

        Returns:
            Google Drive API service

        Raises:
            RuntimeError: If not authenticated
        """
        if self._service:
            return self._service

        credentials = self.get_credentials()
        if not credentials:
            raise RuntimeError(
                "Not authenticated. Please run authenticate() first."
            )

        self._service = build('drive', 'v3', credentials=credentials)
        return self._service

    def get_gmail_service(self):
        """
        Get Gmail API service instance.

        Returns:
            Gmail API service

        Raises:
            RuntimeError: If not authenticated
        """
        credentials = self.get_credentials()
        if not credentials:
            raise RuntimeError(
                "Not authenticated. Please run authenticate() first."
            )

        return build('gmail', 'v1', credentials=credentials)

    def is_authenticated(self) -> bool:
        """
        Check if user is authenticated.

        Returns:
            True if authenticated with valid credentials
        """
        credentials = self.get_credentials()
        return credentials is not None and credentials.valid

    def ensure_authenticated(self) -> Dict[str, Any]:
        """
        Ensure valid credentials are available, triggering OAuth if needed.

        Returns:
            Result dict with success/authenticated and optional error/message
        """
        try:
            if self.is_authenticated():
                return {
                    "success": True,
                    "authenticated": True,
                    "message": "Already authenticated with Google Drive."
                }

            # Launch OAuth flow in browser; the local-server flow auto-closes tab after consent.
            credentials = self.authenticate()
            return {
                "success": True,
                "authenticated": credentials is not None,
                "message": "Authenticated with Google Drive via OAuth."
            }
        except Exception as e:
            logger.error(f"Failed to authenticate with Google Drive: {e}")
            return {
                "success": False,
                "authenticated": False,
                "error": str(e)
            }

    def revoke_credentials(self):
        """Revoke and delete stored credentials."""
        if self._credentials:
            try:
                self._credentials.revoke(Request())
                logger.info("Revoked credentials")
            except Exception as e:
                logger.warning(f"Failed to revoke credentials: {e}")

        # Delete token file
        if os.path.exists(self.token_path):
            try:
                os.remove(self.token_path)
                logger.info(f"Deleted token file: {self.token_path}")
            except Exception as e:
                logger.error(f"Failed to delete token file: {e}")

        self._credentials = None
        self._service = None

    def get_file_metadata(self, file_id: str) -> Dict[str, Any]:
        """
        Get file metadata using Drive API.

        Args:
            file_id: Google Drive file ID

        Returns:
            Dictionary with file metadata
        """
        try:
            service = self.get_drive_service()
            file_metadata = service.files().get(
                fileId=file_id,
                fields='id,name,mimeType,size,createdTime,modifiedTime,permissions'
            ).execute()
            return {
                'success': True,
                'metadata': file_metadata
            }
        except Exception as e:
            logger.error(f"Failed to get file metadata: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def download_file(self, file_id: str) -> Dict[str, Any]:
        """
        Download file content using Drive API.

        Args:
            file_id: Google Drive file ID

        Returns:
            Dictionary with file content or error
        """
        try:
            service = self.get_drive_service()

            # Get file metadata first
            file_metadata = service.files().get(
                fileId=file_id,
                fields='id,name,mimeType,size'
            ).execute()

            mime_type = file_metadata.get('mimeType', '')

            # Export Google Workspace files
            if mime_type.startswith('application/vnd.google-apps'):
                export_format = self._get_export_mime_type(mime_type)
                request = service.files().export_media(
                    fileId=file_id,
                    mimeType=export_format
                )
            else:
                # Download regular files
                request = service.files().get_media(fileId=file_id)

            # Execute download
            content = request.execute()

            return {
                'success': True,
                'content': content,
                'metadata': file_metadata
            }

        except Exception as e:
            logger.error(f"Failed to download file: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def download_file_to_path(
        self,
        file_id: str,
        destination_path: str,
        export_mime_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Download a Drive file and save it to disk.

        Args:
            file_id: Google Drive file ID
            destination_path: Local path to save the file
            export_mime_type: Override export mime type for Google Docs

        Returns:
            Dictionary with result info
        """
        try:
            service = self.get_drive_service()
            file_metadata = service.files().get(
                fileId=file_id,
                fields='id,name,mimeType,size'
            ).execute()

            mime_type = file_metadata.get('mimeType', '')
            target_mime = export_mime_type or self._get_export_mime_type(mime_type)

            # Build request
            if mime_type.startswith('application/vnd.google-apps'):
                request = service.files().export_media(
                    fileId=file_id,
                    mimeType=target_mime
                )
            else:
                request = service.files().get_media(fileId=file_id)

            # Stream download to file
            path_obj = Path(destination_path)
            path_obj.parent.mkdir(parents=True, exist_ok=True)

            fh = io.FileIO(path_obj, 'wb')
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    logger.debug(f"Downloading {file_id}: {int(status.progress() * 100)}%")

            size_bytes = path_obj.stat().st_size if path_obj.exists() else 0

            return {
                'success': True,
                'file_id': file_id,
                'path': str(path_obj.absolute()),
                'mime_type': mime_type,
                'size': size_bytes
            }
        except Exception as e:
            logger.error(f"Failed to download file to path: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def list_folder_files(
        self,
        folder_id: str,
        mime_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        List files within a Drive folder.

        Args:
            folder_id: Folder ID
            mime_types: Optional list of mime types to filter

        Returns:
            Dictionary with success and list of files
        """
        try:
            service = self.get_drive_service()
            query_parts = [f"'{folder_id}' in parents", "trashed=false"]
            if mime_types:
                mime_filters = " or ".join([f"mimeType='{m}'" for m in mime_types])
                query_parts.append(f"({mime_filters})")

            query = " and ".join(query_parts)
            files = []
            page_token = None
            while True:
                response = service.files().list(
                    q=query,
                    fields="nextPageToken, files(id, name, mimeType, size, modifiedTime)",
                    pageToken=page_token
                ).execute()
                files.extend(response.get('files', []))
                page_token = response.get('nextPageToken')
                if not page_token:
                    break

            return {
                'success': True,
                'files': files
            }
        except Exception as e:
            logger.error(f"Failed to list folder files: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _get_export_mime_type(self, google_mime_type: str) -> str:
        """
        Get export MIME type for Google Workspace files.

        Args:
            google_mime_type: Google Workspace MIME type

        Returns:
            Export MIME type
        """
        export_map = {
            'application/vnd.google-apps.document': 'text/plain',
            'application/vnd.google-apps.spreadsheet': 'text/csv',
            'application/vnd.google-apps.presentation': 'application/pdf',
            'application/vnd.google-apps.drawing': 'image/png',
        }
        return export_map.get(google_mime_type, 'application/pdf')
