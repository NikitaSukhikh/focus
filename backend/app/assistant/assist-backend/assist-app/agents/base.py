# Abstract base class for all domain agents.

"""
Base Agent module for Alfy - Abstract base class for all domain agents.

All domain agents (files, email, finance, etc.) inherit from this base class,
which provides a consistent interface for handling user queries and executing tools.

Architecture:
- Each agent has a specific domain (files, email, etc.)
- Each agent has 5-10 relevant tools (not all 40+ tools)
- Each agent has a domain-specific system prompt
- Agents can stream responses token-by-token for better UX
"""

from typing import AsyncGenerator, Dict, Any, List
import logging
from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """
    Abstract base class for all domain agents.

    Subclasses must implement:
    - _get_system_prompt(): Return domain-specific instructions
    - Domain agents should define their tools in __init__
    """

    def __init__(self, llm, tools: List = None):
        """
        Initialize base agent.

        Args:
            llm: LLM instance for generation
            tools: List of Tool instances available to this agent
        """
        self.llm = llm
        self.tools = tools or []
        self.system_prompt = self._get_system_prompt()
        self.domain = self.__class__.__name__.replace("Agent", "").lower()
        self.logger = logging.getLogger(__name__)

    @abstractmethod
    def _get_system_prompt(self) -> str:
        """
        Return domain-specific system prompt.

        This prompt tells the LLM:
        - What domain it's operating in
        - What tools are available
        - How to respond to queries

        Must be implemented by subclasses.

        Returns:
            System prompt string
        """
        pass

    async def handle(self, query: str, context: Dict[str, Any] = None) -> str:
        """
        Handle a user query (non-streaming version).

        This is a convenience method that collects all streaming tokens
        and returns the complete response.

        Args:
            query: User's query string
            context: Optional context (conversation history, metadata)

        Returns:
            Complete response string
        """
        context = context or {}
        result = []

        async for event in self.handle_stream(query, context):
            if event["type"] == "token":
                result.append(event["token"])

        return "".join(result)

    async def handle_stream(
        self,
        query: str,
        context: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Handle a user query with streaming response.

        This is the main entry point for agent execution. It:
        1. Builds message history from context
        2. Calls LLM with domain-specific prompt and tools
        3. Executes any tool calls requested by LLM
        4. Streams response tokens back to caller

        Args:
            query: User's query string
            context: Optional context dictionary with:
                - history: List of previous messages
                - user_data: User preferences, settings
                - metadata: Any additional context

        Yields:
            Event dictionaries:
            - {"type": "token", "token": "..."}
            - {"type": "tool_call", "tool_name": "...", "tool_args": {...}}
            - {"type": "tool_result", "tool_name": "...", "result": {...}}
            - {"type": "complete", "domain": "..."}
            - {"type": "error", "error": "..."}
        """
        context = context or {}

        try:
            # Build message history
            messages = self._build_messages(query, context)

            # Non-streaming generate for stability (streaming can stall with llama.cpp on Windows)
            full = await self.llm.generate(
                prompt="\n".join(m["content"] for m in messages if m.get("content")),
                system_prompt=self.system_prompt,
            )

            if not full:
                self.logger.error(f"{self.domain}: LLM returned empty response")
                yield {
                    "type": "error",
                    "error": "LLM returned empty response",
                    "domain": self.domain,
                }
                return

            self.logger.info(f"{self.domain}: generated {len(full)} chars")

            # Emit as a single token event
            yield {"type": "token", "token": full}
            yield {"type": "complete", "domain": self.domain}

        except Exception as e:
            self.logger.exception(f"{self.domain}: handle_stream error")
            yield {
                "type": "error",
                "error": str(e),
                "domain": self.domain
            }

    async def _execute_tool(self, tool_name: str, args: Dict) -> Any:
        """
        Execute a tool by name with given arguments.

        Args:
            tool_name: Name of the tool to execute
            args: Dictionary of tool arguments

        Returns:
            Tool execution result

        Raises:
            ValueError: If tool not found
        """
        # Find the tool
        tool = next((t for t in self.tools if t.name == tool_name), None)

        if not tool:
            raise ValueError(
                f"Tool '{tool_name}' not found in {self.domain} agent. "
                f"Available tools: {[t.name for t in self.tools]}"
            )

        # Execute the tool
        try:
            result = await tool.execute(**args)
            return result
        except Exception as e:
            # Return error as result (don't crash the agent)
            return {
                "error": str(e),
                "tool": tool_name,
                "args": args
            }

    def _build_messages(self, query: str, context: Dict) -> List[Dict[str, str]]:
        """
        Build message list from query and context.

        Args:
            query: Current user query
            context: Context dictionary (may contain 'history')

        Returns:
            List of message dicts with 'role' and 'content'
        """
        messages = []

        # Include conversation history if provided
        if "history" in context and context["history"]:
            messages.extend(context["history"])

        # Add current query
        messages.append({
            "role": "user",
            "content": query
        })

        return messages

    def get_tool_names(self) -> List[str]:
        """
        Get list of tool names available to this agent.

        Returns:
            List of tool name strings
        """
        return [tool.name for tool in self.tools]

    def get_tool_count(self) -> int:
        """
        Get count of tools available to this agent.

        Returns:
            Number of tools
        """
        return len(self.tools)

    def has_tool(self, tool_name: str) -> bool:
        """
        Check if agent has a specific tool.

        Args:
            tool_name: Name of tool to check

        Returns:
            True if tool exists
        """
        return any(t.name == tool_name for t in self.tools)


class GeneralAgent(BaseAgent):
    """
    General-purpose agent for queries that don't fit other domains.

    This agent handles:
    - Casual conversation
    - General questions
    - Queries that don't match any specific domain
    """

    def _get_system_prompt(self) -> str:
        return """You are Alfy, a helpful personal assistant.

You're handling a general query that doesn't fit into specific domains like files, email, or finance.

Be conversational, helpful, and concise. If the user's request would be better handled by a specific domain (files, email, calendar, finance, etc.), gently suggest they rephrase their question to be more specific.

Keep responses short and to the point."""
