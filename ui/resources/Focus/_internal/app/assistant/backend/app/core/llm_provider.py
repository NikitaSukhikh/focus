"""Unified LLM provider abstraction for easy switching between local and external LLMs."""

import logging
from typing import Optional, AsyncIterator, List, Dict, Any
from abc import ABC, abstractmethod

from app.config import settings, LLMProvider
from app.core.simple_llm import SimpleLLM
from app.services.external_llm import ExternalLLMService

logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """Generate a response from the LLM."""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncIterator[str]:
        """Generate a streaming response from the LLM."""
        pass

    @abstractmethod
    async def generate_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generate a response with tool calling support.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            tools: List of tool definitions
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            Dict with keys:
                - stop_reason: Why generation stopped
                - content: List of content blocks (text/tool_use)
                - tool_calls: List of tool calls if any
        """
        pass

    @abstractmethod
    async def cleanup(self):
        """Clean up resources."""
        pass


class LocalLLMProvider(BaseLLMProvider):
    """Provider for local LLM using llama-cpp-python."""

    def __init__(self):
        """Initialize local LLM provider."""
        self.llm = SimpleLLM()
        self._loaded = False

    async def _ensure_loaded(self):
        """Ensure the local model is loaded."""
        if not self._loaded:
            await self.llm._load_model()
            self._loaded = True

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """Generate a response from the local LLM."""
        await self._ensure_loaded()
        return await self.llm.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncIterator[str]:
        """Generate a streaming response from the local LLM."""
        await self._ensure_loaded()

        # Build messages for streaming
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async for chunk in self.llm.generate_stream(messages):
            yield chunk

    async def generate_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generate with tools - local LLMs don't support native tool calling.

        This is a fallback that returns text-only responses.
        For true tool calling, use Claude or OpenAI providers.
        """
        logger.warning("Local LLM does not support native tool calling. Returning text-only response.")

        # Convert messages to simple prompt
        prompt_parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if isinstance(content, list):
                # Extract text from content blocks
                text_parts = [block.get("text", "") for block in content if block.get("type") == "text"]
                content = "\n".join(text_parts)

            prompt_parts.append(f"{role}: {content}")

        prompt = "\n".join(prompt_parts)

        # Generate response
        response_text = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )

        return {
            "stop_reason": "end_turn",
            "content": [{"type": "text", "text": response_text}],
            "tool_calls": []
        }

    async def cleanup(self):
        """Clean up local LLM resources."""
        if self._loaded and self.llm.model:
            logger.info("Unloading local LLM model")
            self.llm.model = None
            self._loaded = False


class ClaudeLLMProvider(BaseLLMProvider):
    """Provider for Claude API."""

    def __init__(self):
        """Initialize Claude LLM provider."""
        self.service = ExternalLLMService()

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """Generate a response from Claude API."""
        return await self.service.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            provider="claude"
        )

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncIterator[str]:
        """Generate a streaming response from Claude API."""
        async for chunk in self.service.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            provider="claude"
        ):
            yield chunk

    async def generate_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate a response with tool calling support using Claude API."""
        return await self.service.generate_with_tools(
            messages=messages,
            tools=tools,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            provider="claude"
        )

    async def cleanup(self):
        """Clean up Claude API resources."""
        # No cleanup needed for API client
        pass


class OpenAILLMProvider(BaseLLMProvider):
    """Provider for OpenAI API."""

    def __init__(self):
        """Initialize OpenAI LLM provider."""
        self.service = ExternalLLMService()

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """Generate a response from OpenAI API."""
        return await self.service.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            provider="openai"
        )

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncIterator[str]:
        """Generate a streaming response from OpenAI API."""
        async for chunk in self.service.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            provider="openai"
        ):
            yield chunk

    async def generate_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate a response with tool calling support using OpenAI API."""
        return await self.service.generate_with_tools(
            messages=messages,
            tools=tools,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            provider="openai"
        )

    async def cleanup(self):
        """Clean up OpenAI API resources."""
        # No cleanup needed for API client
        pass


class LLMProviderFactory:
    """Factory for creating LLM providers based on configuration."""

    _instance: Optional[BaseLLMProvider] = None
    _current_provider_type: Optional[LLMProvider] = None

    @classmethod
    async def get_provider(cls, provider_type: Optional[LLMProvider] = None) -> BaseLLMProvider:
        """
        Get or create an LLM provider instance.

        Args:
            provider_type: Type of provider to create. If None, uses config default.

        Returns:
            LLM provider instance
        """
        # Use config default if not specified
        if provider_type is None:
            provider_type = settings.llm_provider

        # If provider type changed, cleanup old instance
        if cls._instance and cls._current_provider_type != provider_type:
            logger.info(f"Provider type changed from {cls._current_provider_type} to {provider_type}")
            await cls._instance.cleanup()
            cls._instance = None

        # Create new instance if needed
        if cls._instance is None:
            logger.info(f"Creating new LLM provider: {provider_type}")

            if provider_type == LLMProvider.LOCAL:
                cls._instance = LocalLLMProvider()
            elif provider_type == LLMProvider.CLAUDE:
                cls._instance = ClaudeLLMProvider()
            elif provider_type == LLMProvider.OPENAI:
                cls._instance = OpenAILLMProvider()
            else:
                raise ValueError(f"Unsupported provider type: {provider_type}")

            cls._current_provider_type = provider_type

        return cls._instance

    @classmethod
    async def cleanup(cls):
        """Clean up current provider instance."""
        if cls._instance:
            await cls._instance.cleanup()
            cls._instance = None
            cls._current_provider_type = None
