"""Adapters for external LLM providers (Claude/ChatGPT)."""

import logging
from typing import Optional, AsyncIterator, List, Dict, Any
from app.config import settings, LLMProvider
from app.core.token_tracker import token_tracker

logger = logging.getLogger(__name__)


class ExternalLLMService:
    """Service for calling external LLM providers (Claude, OpenAI)."""

    def __init__(self):
        """Initialize the external LLM service."""
        self._anthropic_client = None
        self._openai_client = None

    async def _get_anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            try:
                from anthropic import AsyncAnthropic

                if not settings.anthropic_api_key:
                    raise ValueError("ANTHROPIC_API_KEY not configured")

                self._anthropic_client = AsyncAnthropic(
                    api_key=settings.anthropic_api_key
                )
                logger.info("Anthropic client initialized")
            except ImportError:
                raise ImportError(
                    "anthropic package not installed. Install with: pip install anthropic"
                )
        return self._anthropic_client

    async def _get_openai_client(self):
        """Lazy-load OpenAI client."""
        if self._openai_client is None:
            try:
                from openai import AsyncOpenAI

                if not settings.openai_api_key:
                    raise ValueError("OPENAI_API_KEY not configured")

                self._openai_client = AsyncOpenAI(
                    api_key=settings.openai_api_key
                )
                logger.info("OpenAI client initialized")
            except ImportError:
                raise ImportError(
                    "openai package not installed. Install with: pip install openai"
                )
        return self._openai_client

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        provider: Optional[str] = None
    ) -> str:
        """
        Generate a response from an external LLM.

        Args:
            prompt: User prompt/message
            system_prompt: Optional system prompt for context
            model: Specific model to use (overrides config)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            provider: 'claude' or 'openai' (uses config if not specified)

        Returns:
            Generated text response
        """
        # Determine which provider to use
        if provider is None:
            provider = settings.llm_provider.value

        if provider == LLMProvider.CLAUDE.value:
            return await self._generate_claude(
                prompt, system_prompt, model, max_tokens, temperature
            )
        elif provider == LLMProvider.OPENAI.value:
            return await self._generate_openai(
                prompt, system_prompt, model, max_tokens, temperature
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def _generate_claude(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """Generate response using Claude API."""
        client = await self._get_anthropic_client()

        # Use config defaults if not specified
        model = model or settings.claude_model.value
        max_tokens = max_tokens or settings.claude_max_tokens
        temperature = temperature or settings.claude_temperature

        # Build messages
        messages = [{"role": "user", "content": prompt}]

        try:
            logger.info(f"Calling Claude API with model: {model}")

            # Make API call
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            response = await client.messages.create(**kwargs)

            # Track token usage
            if hasattr(response, 'usage'):
                token_tracker.track_usage(
                    provider="claude",
                    input_tokens=response.usage.input_tokens,
                    output_tokens=response.usage.output_tokens
                )

            # Extract text from response
            text_content = ""
            for block in response.content:
                if hasattr(block, 'text'):
                    text_content += block.text

            logger.info(f"Claude API response received ({len(text_content)} chars)")
            return text_content

        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise

    async def _generate_openai(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """Generate response using OpenAI API."""
        client = await self._get_openai_client()

        # Use config defaults if not specified
        model = model or settings.openai_model
        max_tokens = max_tokens or 4096
        temperature = temperature or 0.7

        # Build messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            logger.info(f"Calling OpenAI API with model: {model}")

            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )

            # Track token usage
            if hasattr(response, 'usage') and response.usage:
                token_tracker.track_usage(
                    provider="openai",
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens
                )

            text_content = response.choices[0].message.content
            logger.info(f"OpenAI API response received ({len(text_content)} chars)")
            return text_content

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        provider: Optional[str] = None
    ) -> AsyncIterator[str]:
        """
        Generate a streaming response from an external LLM.

        Args:
            prompt: User prompt/message
            system_prompt: Optional system prompt for context
            model: Specific model to use (overrides config)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            provider: 'claude' or 'openai' (uses config if not specified)

        Yields:
            Text chunks as they arrive
        """
        # Determine which provider to use
        if provider is None:
            provider = settings.llm_provider.value

        if provider == LLMProvider.CLAUDE.value:
            async for chunk in self._generate_claude_stream(
                prompt, system_prompt, model, max_tokens, temperature
            ):
                yield chunk
        elif provider == LLMProvider.OPENAI.value:
            async for chunk in self._generate_openai_stream(
                prompt, system_prompt, model, max_tokens, temperature
            ):
                yield chunk
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def _generate_claude_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncIterator[str]:
        """Generate streaming response using Claude API."""
        client = await self._get_anthropic_client()

        # Use config defaults if not specified
        model = model or settings.claude_model.value
        max_tokens = max_tokens or settings.claude_max_tokens
        temperature = temperature or settings.claude_temperature

        # Build messages
        messages = [{"role": "user", "content": prompt}]

        try:
            logger.info(f"Calling Claude API (streaming) with model: {model}")

            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            async with client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text

            logger.info("Claude API streaming completed")

        except Exception as e:
            logger.error(f"Claude API streaming error: {e}")
            raise

    async def _generate_openai_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncIterator[str]:
        """Generate streaming response using OpenAI API."""
        client = await self._get_openai_client()

        # Use config defaults if not specified
        model = model or settings.openai_model
        max_tokens = max_tokens or 4096
        temperature = temperature or 0.7

        # Build messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            logger.info(f"Calling OpenAI API (streaming) with model: {model}")

            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

            logger.info("OpenAI API streaming completed")

        except Exception as e:
            logger.error(f"OpenAI API streaming error: {e}")
            raise

    async def generate_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a response with tool calling support.

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            tools: List of tool definitions
            system_prompt: Optional system prompt
            model: Specific model to use
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            provider: 'claude' or 'openai'

        Returns:
            Dictionary with response and tool calls
        """
        # Determine which provider to use
        if provider is None:
            provider = settings.llm_provider.value

        if provider == LLMProvider.CLAUDE.value:
            return await self._generate_claude_with_tools(
                messages, tools, system_prompt, model, max_tokens, temperature
            )
        elif provider == LLMProvider.OPENAI.value:
            return await self._generate_openai_with_tools(
                messages, tools, system_prompt, model, max_tokens, temperature
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def _generate_claude_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate response with tools using Claude API."""
        client = await self._get_anthropic_client()

        # Use config defaults if not specified
        model = model or settings.claude_model.value
        max_tokens = max_tokens or settings.claude_max_tokens
        temperature = temperature or settings.claude_temperature

        try:
            logger.info(f"Calling Claude API with {len(tools)} tools")

            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
                "tools": tools
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            response = await client.messages.create(**kwargs)

            # Track token usage
            if hasattr(response, 'usage'):
                token_tracker.track_usage(
                    provider="claude",
                    input_tokens=response.usage.input_tokens,
                    output_tokens=response.usage.output_tokens,
                    endpoint="tool_calling"
                )

            # Parse response
            result = {
                "stop_reason": response.stop_reason,
                "content": [],
                "tool_calls": []
            }

            # Extract content and tool calls
            for block in response.content:
                if block.type == "text":
                    result["content"].append({
                        "type": "text",
                        "text": block.text
                    })
                elif block.type == "tool_use":
                    result["tool_calls"].append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })

            logger.info(f"Claude response: {len(result['content'])} content blocks, {len(result['tool_calls'])} tool calls")
            return result

        except Exception as e:
            logger.error(f"Claude API error with tools: {e}")
            raise

    async def _generate_openai_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate response with tools using OpenAI API."""
        client = await self._get_openai_client()

        # Use config defaults
        model = model or settings.openai_model
        max_tokens = max_tokens or 4096
        temperature = temperature or 0.7

        # Add system prompt to messages if provided
        msgs = messages.copy()
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        try:
            logger.info(f"Calling OpenAI API with {len(tools)} tools")

            response = await client.chat.completions.create(
                model=model,
                messages=msgs,
                tools=tools,
                max_tokens=max_tokens,
                temperature=temperature
            )

            # Track token usage
            if hasattr(response, 'usage') and response.usage:
                token_tracker.track_usage(
                    provider="openai",
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    endpoint="tool_calling"
                )

            # Parse response
            result = {
                "stop_reason": response.choices[0].finish_reason,
                "content": [],
                "tool_calls": []
            }

            message = response.choices[0].message

            if message.content:
                result["content"].append({
                    "type": "text",
                    "text": message.content
                })

            if message.tool_calls:
                for tool_call in message.tool_calls:
                    result["tool_calls"].append({
                        "id": tool_call.id,
                        "name": tool_call.function.name,
                        "input": tool_call.function.arguments
                    })

            logger.info(f"OpenAI response: {len(result['content'])} content blocks, {len(result['tool_calls'])} tool calls")
            return result

        except Exception as e:
            logger.error(f"OpenAI API error with tools: {e}")
            raise
