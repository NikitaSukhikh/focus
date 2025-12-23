"""
Conversation data models for chat history storage.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import uuid4


class Message(BaseModel):
    """A single message in a conversation."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content (cleaned, without thinking tags)")
    raw_content: Optional[str] = Field(None, description="Raw content with thinking tags (for logging)")
    timestamp: datetime = Field(default_factory=datetime.now)
    input_tokens: Optional[int] = Field(None, description="Input tokens for this message (if assistant)")
    output_tokens: Optional[int] = Field(None, description="Output tokens for this message (if assistant)")


class Conversation(BaseModel):
    """A conversation thread with multiple messages."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str = Field(..., description="Conversation title (auto-generated from first message)")
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    total_input_tokens: int = Field(default=0, description="Total input tokens used in this conversation")
    total_output_tokens: int = Field(default=0, description="Total output tokens used in this conversation")
    total_tokens: int = Field(default=0, description="Total tokens (input + output) used in this conversation")

    def add_message(
        self,
        role: str,
        content: str,
        raw_content: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None
    ) -> Message:
        """Add a new message to the conversation and update token counts."""
        msg = Message(
            role=role,
            content=content,
            raw_content=raw_content,
            input_tokens=input_tokens,
            output_tokens=output_tokens
        )
        self.messages.append(msg)
        self.updated_at = datetime.now()

        # Update token totals for assistant messages
        if role == "assistant" and input_tokens is not None and output_tokens is not None:
            self.total_input_tokens += input_tokens
            self.total_output_tokens += output_tokens
            self.total_tokens += (input_tokens + output_tokens)

        return msg

    def update_title(self, title: str):
        """Update conversation title."""
        self.title = title
        self.updated_at = datetime.now()

    def get_preview(self, max_length: int = 60) -> str:
        """Get a preview of the first user message."""
        if not self.messages:
            return "Empty conversation"
        first_msg = next((m for m in self.messages if m.role == "user"), None)
        if not first_msg:
            return "No user messages"
        preview = first_msg.content[:max_length]
        return preview + "..." if len(first_msg.content) > max_length else preview
