"""External LLM agent for delegating to hosted models (Claude/ChatGPT)."""

import logging
from typing import AsyncGenerator, Dict, Any

from .base import BaseAgent
from app.services.external_llm import ExternalLLMService
from app.config import settings, LLMProvider

logger = logging.getLogger(__name__)


class ExternalLLMAgent(BaseAgent):
    """Agent that delegates queries to external LLM providers (Claude, OpenAI)."""

    def __init__(self, llm=None, tools=None):
        """
        Initialize external LLM agent.

        Args:
            llm: Local LLM instance (not used by this agent)
            tools: List of tools (not used by this agent)
        """
        # Call parent init but we won't use the local LLM
        super().__init__(llm, tools)
        self.external_service = ExternalLLMService()

    def _get_system_prompt(self) -> str:
        """Return system prompt for external LLM delegation."""
        return (
            "You are Alfy, a helpful personal assistant powered by an external LLM. "
            "Respond naturally to user queries with helpful, accurate information. "
            "Be conversational and concise."
        )

    async def handle_stream(
        self,
        query: str,
        context: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Handle a user query by delegating to external LLM.

        Args:
            query: User's query string
            context: Optional context dictionary

        Yields:
            Event dictionaries with streaming response
        """
        context = context or {}

        try:
            # Determine which provider to use
            provider = None
            model = None

            # Check if user explicitly requested a specific provider
            query_lower = query.lower()
            if "claude" in query_lower or "anthropic" in query_lower:
                provider = "claude"
                logger.info("User explicitly requested Claude")
            elif "gpt" in query_lower or "openai" in query_lower or "chatgpt" in query_lower:
                provider = "openai"
                logger.info("User explicitly requested OpenAI")
            else:
                # Use configured default
                provider = settings.llm_provider.value
                logger.info(f"Using configured provider: {provider}")

            # Validate provider is configured
            if provider == LLMProvider.CLAUDE.value and not settings.anthropic_api_key:
                yield {
                    "type": "error",
                    "error": "Claude API not configured. Please set ANTHROPIC_API_KEY environment variable.",
                    "domain": self.domain
                }
                return

            if provider == LLMProvider.OPENAI.value and not settings.openai_api_key:
                yield {
                    "type": "error",
                    "error": "OpenAI API not configured. Please set OPENAI_API_KEY environment variable.",
                    "domain": self.domain
                }
                return

            # Build context from conversation history
            messages_context = self._build_messages(query, context)

            # Combine history into prompt (for now - can be enhanced later)
            full_prompt = query
            if len(messages_context) > 1:
                # Include previous messages as context
                history_text = "\n".join(
                    f"{msg['role']}: {msg['content']}"
                    for msg in messages_context[:-1]
                )
                full_prompt = f"Previous conversation:\n{history_text}\n\nCurrent query: {query}"

            logger.info(f"Calling {provider} API for external LLM agent")

            # Stream response from external LLM
            async for chunk in self.external_service.generate_stream(
                prompt=full_prompt,
                system_prompt=self.system_prompt,
                provider=provider,
                model=model
            ):
                yield {"type": "token", "token": chunk}

            yield {"type": "complete", "domain": self.domain}

        except ImportError as e:
            logger.error(f"External LLM SDK not installed: {e}")
            error_msg = str(e)
            if "anthropic" in error_msg:
                error_msg = "Claude SDK not installed. Run: pip install anthropic"
            elif "openai" in error_msg:
                error_msg = "OpenAI SDK not installed. Run: pip install openai"

            yield {
                "type": "error",
                "error": error_msg,
                "domain": self.domain
            }

        except ValueError as e:
            logger.error(f"Configuration error: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "domain": self.domain
            }

        except Exception as e:
            logger.exception(f"External LLM agent error")
            yield {
                "type": "error",
                "error": f"External LLM error: {str(e)}",
                "domain": self.domain
            }
