"""
Gmail Client Service

Client for interacting with Gmail API.
Supports listing threads, getting message details, and searching emails.
"""

from typing import List, Optional, Dict, Any
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
import base64

from app.models.google import (
    GmailThread,
    GmailMessage,
    GmailThreadList,
    GmailSearchQuery,
    GmailAttachment
)
from app.core.logging import get_logger


logger = get_logger(__name__)


class GmailClient:
    """
    Client for Gmail API operations.

    Supports:
    - Listing email threads
    - Getting thread/message details
    - Searching emails
    - Reading attachments metadata
    """

    def __init__(self, credentials: Credentials):
        """
        Initialize the Gmail client.

        Args:
            credentials: Google OAuth credentials
        """
        self.credentials = credentials
        self.service = build('gmail', 'v1', credentials=credentials)
        self.user_id = 'me'  # 'me' refers to the authenticated user

    async def list_threads(
        self,
        page_size: int = 20,
        page_token: Optional[str] = None,
        label_ids: Optional[List[str]] = None,
        include_spam_trash: bool = False
    ) -> GmailThreadList:
        """
        List email threads.

        Args:
            page_size: Number of threads to return (1-500)
            page_token: Page token for pagination
            label_ids: Filter by label IDs (e.g., ["INBOX", "UNREAD"])
            include_spam_trash: Include spam and trash

        Returns:
            GmailThreadList: List of email threads

        Raises:
            HttpError: If API request fails
        """
        try:
            # Clamp page size
            page_size = min(max(1, page_size), 500)

            # Build request
            request_params = {
                "userId": self.user_id,
                "maxResults": page_size,
            }

            if page_token:
                request_params["pageToken"] = page_token

            if label_ids:
                request_params["labelIds"] = label_ids

            if include_spam_trash:
                request_params["includeSpamTrash"] = True

            # Execute request
            results = self.service.users().threads().list(**request_params).execute()

            threads = results.get("threads", [])
            next_page_token = results.get("nextPageToken")

            # Get full thread details
            gmail_threads = []
            for thread_data in threads:
                thread = await self.get_thread(thread_data["id"])
                if thread:
                    gmail_threads.append(thread)

            logger.debug(
                f"Listed {len(gmail_threads)} Gmail threads",
                extra={"page_size": page_size, "has_next": bool(next_page_token)}
            )

            return GmailThreadList(
                threads=gmail_threads,
                next_page_token=next_page_token,
                total=len(gmail_threads)
            )

        except HttpError as e:
            logger.error(f"Gmail API error: {e}", exc_info=True)
            raise

    async def get_thread(self, thread_id: str) -> Optional[GmailThread]:
        """
        Get details for a specific email thread.

        Args:
            thread_id: Gmail thread ID

        Returns:
            GmailThread if found, None if not found

        Raises:
            HttpError: If API request fails
        """
        try:
            thread = self.service.users().threads().get(
                userId=self.user_id,
                id=thread_id,
                format='full'
            ).execute()

            gmail_thread = self._parse_thread(thread)

            logger.debug(
                f"Retrieved Gmail thread: {gmail_thread.subject}",
                extra={"thread_id": thread_id, "messages": gmail_thread.message_count}
            )

            return gmail_thread

        except HttpError as e:
            if e.resp.status == 404:
                logger.warning(f"Gmail thread not found: {thread_id}")
                return None
            logger.error(f"Gmail API error: {e}", exc_info=True)
            raise

    async def get_message(self, message_id: str) -> Optional[GmailMessage]:
        """
        Get details for a specific email message.

        Args:
            message_id: Gmail message ID

        Returns:
            GmailMessage if found, None if not found

        Raises:
            HttpError: If API request fails
        """
        try:
            message = self.service.users().messages().get(
                userId=self.user_id,
                id=message_id,
                format='full'
            ).execute()

            gmail_message = self._parse_message(message)

            logger.debug(
                f"Retrieved Gmail message: {gmail_message.subject}",
                extra={"message_id": message_id}
            )

            return gmail_message

        except HttpError as e:
            if e.resp.status == 404:
                logger.warning(f"Gmail message not found: {message_id}")
                return None
            logger.error(f"Gmail API error: {e}", exc_info=True)
            raise

    async def search(self, search_query: GmailSearchQuery) -> GmailThreadList:
        """
        Search email threads.

        Args:
            search_query: Search query parameters

        Returns:
            GmailThreadList: Matching threads

        Raises:
            HttpError: If API request fails
        """
        try:
            # Build request
            request_params = {
                "userId": self.user_id,
                "maxResults": search_query.page_size,
            }

            if search_query.query:
                request_params["q"] = search_query.query

            if search_query.label_ids:
                request_params["labelIds"] = search_query.label_ids

            if search_query.page_token:
                request_params["pageToken"] = search_query.page_token

            if search_query.include_spam_trash:
                request_params["includeSpamTrash"] = True

            # Execute search
            results = self.service.users().threads().list(**request_params).execute()

            threads = results.get("threads", [])
            next_page_token = results.get("nextPageToken")

            # Get full thread details
            gmail_threads = []
            for thread_data in threads:
                thread = await self.get_thread(thread_data["id"])
                if thread:
                    gmail_threads.append(thread)

            logger.debug(
                f"Search found {len(gmail_threads)} Gmail threads",
                extra={"query": search_query.query}
            )

            return GmailThreadList(
                threads=gmail_threads,
                next_page_token=next_page_token,
                total=len(gmail_threads)
            )

        except HttpError as e:
            logger.error(f"Gmail search error: {e}", exc_info=True)
            raise

    def _parse_thread(self, thread_data: Dict[str, Any]) -> GmailThread:
        """
        Parse Gmail API thread data into GmailThread model.

        Args:
            thread_data: Raw thread data from Gmail API

        Returns:
            GmailThread: Parsed thread
        """
        from datetime import datetime

        messages = thread_data.get("messages", [])
        message_count = len(messages)

        # Parse all messages in the thread
        gmail_messages = [self._parse_message(msg) for msg in messages]

        # Get data from most recent message
        latest_message = gmail_messages[0] if gmail_messages else None

        if latest_message:
            subject = latest_message.subject
            snippet = thread_data.get("snippet", "")
            participants = list(set([latest_message.from_email] + latest_message.to_emails))
            last_message_date = latest_message.date
            is_unread = latest_message.is_unread
            is_starred = latest_message.is_starred
            labels = latest_message.label_ids
        else:
            subject = ""
            snippet = thread_data.get("snippet", "")
            participants = []
            last_message_date = None
            is_unread = False
            is_starred = False
            labels = []

        return GmailThread(
            id=thread_data["id"],
            snippet=snippet,
            message_count=message_count,
            messages=gmail_messages,
            subject=subject,
            participants=participants,
            last_message_date=last_message_date,
            is_unread=is_unread,
            is_starred=is_starred,
            labels=labels
        )

    def _parse_message(self, message_data: Dict[str, Any]) -> GmailMessage:
        """
        Parse Gmail API message data into GmailMessage model.

        Args:
            message_data: Raw message data from Gmail API

        Returns:
            GmailMessage: Parsed message
        """
        from datetime import datetime

        # Extract headers
        headers = message_data.get("payload", {}).get("headers", [])
        header_dict = {h["name"].lower(): h["value"] for h in headers}

        subject = header_dict.get("subject", "(No Subject)")
        from_email = header_dict.get("from", "")
        to_emails = self._parse_email_list(header_dict.get("to", ""))
        cc_emails = self._parse_email_list(header_dict.get("cc", ""))
        date_str = header_dict.get("date")

        # Parse date
        date = None
        if date_str:
            try:
                from email.utils import parsedate_to_datetime
                date = parsedate_to_datetime(date_str)
            except (ValueError, TypeError, AttributeError) as e:
                logger.debug(f"Failed to parse email date: {e}")
                pass

        # Extract body
        body_text, body_html = self._extract_body(message_data.get("payload", {}))

        # Extract attachments
        attachments = self._extract_attachments(message_data.get("payload", {}))

        # Extract label IDs
        label_ids = message_data.get("labelIds", [])

        # Check flags
        is_unread = "UNREAD" in label_ids
        is_starred = "STARRED" in label_ids

        return GmailMessage(
            id=message_data["id"],
            thread_id=message_data["threadId"],
            label_ids=label_ids,
            subject=subject,
            from_email=from_email,
            to_emails=to_emails,
            cc_emails=cc_emails,
            date=date,
            snippet=message_data.get("snippet", ""),
            body_text=body_text,
            body_html=body_html,
            size_estimate=message_data.get("sizeEstimate"),
            attachments=attachments,
            is_unread=is_unread,
            is_starred=is_starred
        )

    def _parse_email_list(self, email_string: str) -> List[str]:
        """Parse comma-separated email addresses."""
        if not email_string:
            return []

        # Simple parsing - split by comma and extract email addresses
        emails = []
        for part in email_string.split(","):
            part = part.strip()
            # Extract email from "Name <email@example.com>" format
            if "<" in part and ">" in part:
                email = part[part.index("<") + 1:part.index(">")]
                emails.append(email)
            else:
                emails.append(part)

        return emails

    def _extract_body(self, payload: Dict[str, Any]) -> tuple:
        """
        Extract text and HTML body from message payload.

        Args:
            payload: Message payload

        Returns:
            tuple: (body_text, body_html)
        """
        body_text = None
        body_html = None

        # Check if this is a simple message
        if "body" in payload and payload["body"].get("data"):
            mime_type = payload.get("mimeType", "")
            body_data = payload["body"]["data"]
            decoded_body = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="ignore")

            if mime_type == "text/plain":
                body_text = decoded_body
            elif mime_type == "text/html":
                body_html = decoded_body

        # Check if this is a multipart message
        if "parts" in payload:
            for part in payload["parts"]:
                mime_type = part.get("mimeType", "")
                if "body" in part and part["body"].get("data"):
                    body_data = part["body"]["data"]
                    decoded_body = base64.urlsafe_b64decode(body_data).decode("utf-8", errors="ignore")

                    if mime_type == "text/plain" and not body_text:
                        body_text = decoded_body
                    elif mime_type == "text/html" and not body_html:
                        body_html = decoded_body

                # Recursively check nested parts
                if "parts" in part:
                    nested_text, nested_html = self._extract_body(part)
                    if not body_text:
                        body_text = nested_text
                    if not body_html:
                        body_html = nested_html

        return body_text, body_html

    def _extract_attachments(self, payload: Dict[str, Any]) -> List[GmailAttachment]:
        """
        Extract attachment metadata from message payload.

        Args:
            payload: Message payload

        Returns:
            List[GmailAttachment]: List of attachments
        """
        attachments = []

        if "parts" in payload:
            for part in payload["parts"]:
                if part.get("filename") and part.get("body", {}).get("attachmentId"):
                    attachment = GmailAttachment(
                        filename=part["filename"],
                        mime_type=part.get("mimeType", "application/octet-stream"),
                        size=part["body"].get("size", 0),
                        attachment_id=part["body"]["attachmentId"]
                    )
                    attachments.append(attachment)

                # Recursively check nested parts
                if "parts" in part:
                    nested_attachments = self._extract_attachments(part)
                    attachments.extend(nested_attachments)

        return attachments


def create_client(credentials: Credentials) -> GmailClient:
    """
    Create a Gmail client.

    Args:
        credentials: Google OAuth credentials

    Returns:
        GmailClient: Gmail client instance
    """
    return GmailClient(credentials)
