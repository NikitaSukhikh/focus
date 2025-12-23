"""
Conversation storage service - persists conversations to disk as JSON files.
"""

import json
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from app.models.conversation import Conversation, Message


class ConversationStore:
    """
    Manages conversation persistence in JSON format.

    Structure:
        data/conversations/
            conversation_id_1.json
            conversation_id_2.json
            ...
    """

    def __init__(self, storage_dir: str = "data/conversations"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"[OK] ConversationStore initialized at {self.storage_dir.absolute()}")

    def _get_conversation_path(self, conversation_id: str) -> Path:
        """Get the file path for a conversation."""
        return self.storage_dir / f"{conversation_id}.json"

    def save(self, conversation: Conversation) -> None:
        """Save a conversation to disk."""
        try:
            path = self._get_conversation_path(conversation.id)
            # Use model_dump() instead of dict() for Pydantic v2
            data = conversation.model_dump(mode='json')
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            self.logger.debug(f"[OK] Saved conversation {conversation.id}")
        except Exception as e:
            self.logger.error(f"[FAIL] Failed to save conversation {conversation.id}: {e}")
            raise

    def load(self, conversation_id: str) -> Optional[Conversation]:
        """Load a conversation from disk."""
        try:
            path = self._get_conversation_path(conversation_id)
            if not path.exists():
                return None

            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Parse datetime strings back to datetime objects
            if 'created_at' in data and isinstance(data['created_at'], str):
                data['created_at'] = datetime.fromisoformat(data['created_at'])
            if 'updated_at' in data and isinstance(data['updated_at'], str):
                data['updated_at'] = datetime.fromisoformat(data['updated_at'])

            for msg in data.get('messages', []):
                if 'timestamp' in msg and isinstance(msg['timestamp'], str):
                    msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])

            return Conversation(**data)
        except Exception as e:
            self.logger.error(f"[FAIL] Failed to load conversation {conversation_id}: {e}")
            return None

    def list_all(self, limit: Optional[int] = None) -> List[Conversation]:
        """
        List all conversations, sorted by updated_at (most recent first).

        Args:
            limit: Maximum number of conversations to return

        Returns:
            List of Conversation objects
        """
        try:
            conversations = []
            for path in self.storage_dir.glob("*.json"):
                conv = self.load(path.stem)
                if conv:
                    conversations.append(conv)

            # Sort by updated_at descending (most recent first)
            conversations.sort(key=lambda c: c.updated_at, reverse=True)

            if limit:
                conversations = conversations[:limit]

            return conversations
        except Exception as e:
            self.logger.error(f"[FAIL] Failed to list conversations: {e}")
            return []

    def delete(self, conversation_id: str) -> bool:
        """Delete a conversation from disk."""
        try:
            path = self._get_conversation_path(conversation_id)
            if path.exists():
                path.unlink()
                self.logger.info(f"[OK] Deleted conversation {conversation_id}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"[FAIL] Failed to delete conversation {conversation_id}: {e}")
            return False

    def create_new(self, title: str = "New Conversation") -> Conversation:
        """Create a new empty conversation."""
        conversation = Conversation(title=title)
        self.save(conversation)
        return conversation

    def get_summaries(self, limit: Optional[int] = None) -> List[dict]:
        """
        Get conversation summaries for sidebar display.

        Returns:
            List of dicts with id, title, preview, updated_at, and token usage
        """
        conversations = self.list_all(limit=limit)
        return [
            {
                "id": conv.id,
                "title": conv.title,
                "preview": conv.get_preview(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": len(conv.messages),
                "total_tokens": conv.total_tokens,
                "total_input_tokens": conv.total_input_tokens,
                "total_output_tokens": conv.total_output_tokens
            }
            for conv in conversations
        ]
