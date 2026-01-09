# Coordinates routing and delegates work to domain agents.

"""
Orchestrator module for Alfy - Coordinates routing and agent execution.

The orchestrator is the central coordinator that:
1. Routes queries to appropriate domains using the Router
2. Instantiates and manages domain agents
3. Handles multi-domain requests by chaining agents
4. Streams responses back to the UI

Flow:
User Input  Router  Orchestrator  Domain Agent  Tools  Response
"""

from typing import AsyncGenerator, Dict, Any, Optional
from app.core.router import Router
from app.core.llm import LLM
import logging
from app.agents.general import GeneralAgent


class Orchestrator:
    """
    Central coordinator for query routing and agent execution.

    The orchestrator manages the complete request lifecycle from user input
    to response generation, handling routing, agent instantiation, and
    streaming responses.
    """

    def __init__(self):
        """Initialize orchestrator with router and LLM."""
        self.llm = LLM()
        self.router = Router(llm_router=self.llm)
        self._agent_cache: Dict[str, Any] = {}  # Cache agent instances
        self.logger = logging.getLogger(__name__)

    def _get_agent(self, domain: str):
        """
        Get or create agent instance for a domain.

        Agents are cached to avoid re-instantiation overhead.

        Args:
            domain: Domain name (files, email, calendar, etc.)

        Returns:
            Agent instance for the domain
        """
        # Check cache first
        if domain in self._agent_cache:
            return self._agent_cache[domain]

        # Import and instantiate agent
        agent = self._create_agent(domain)

        # Cache for future use
        self._agent_cache[domain] = agent

        return agent

    def _create_agent(self, domain: str):
        """
        Create a new agent instance for a domain.

        Args:
            domain: Domain name

        Returns:
            Agent instance

        Raises:
            ValueError: If domain is not recognized
        """
        # Import agents dynamically to avoid circular imports
        from app.agents.general import GeneralAgent
        from app.agents.files import FilesAgent
        from app.agents.external_llm import ExternalLLMAgent

        # Map domain to agent class
        agent_map = {
            'files': FilesAgent,
            'external_llm': ExternalLLMAgent,
            'general': GeneralAgent,
        }

        agent_class = agent_map.get(domain)

        if not agent_class:
            # Fallback to general agent for unknown domains
            agent_class = GeneralAgent

        # Instantiate agent with LLM
        # Note: Tools will be loaded by the agent's __init__
        return agent_class(llm=self.llm)

    async def process_stream(
        self,
        user_input: str,
        conversation_id: Optional[str] = None,
        model: str = "local",
        attachments: Optional[list] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process user input with streaming response.

        This is the main entry point for handling user queries. It:
        1. Routes to appropriate domain
        2. Gets/creates agent for that domain
        3. Executes agent and streams results
        4. Handles errors gracefully

        Args:
            user_input: User's query
            conversation_id: Optional conversation ID for context
            model: Model to use ("local", "claude", "chatgpt")
            attachments: Optional file attachments
            context: Optional context dictionary

        Yields:
            Event dictionaries with streaming updates
        """
        context = context or {}

        try:
            # Step 1: Route to domain
            domain = await self.router.route(user_input)

            yield {
                "type": "routing",
                "domain": domain,
                "query": user_input
            }
            self.logger.info(f"Routing result: domain={domain}")

            # Step 2: Get agent for domain
            agent = self._get_agent(domain)
            self.logger.info(f"Using agent: {agent.__class__.__name__}")

            # Step 3: Prepare context
            execution_context = {
                **context,
                "conversation_id": conversation_id,
                "attachments": attachments,
                "model": model,
            }

            # Step 4: Execute agent with streaming
            async for event in agent.handle_stream(user_input, execution_context):
                yield event
                if event["type"] == "error":
                    self.logger.error(f"Agent error: {event.get('error')}")

        except Exception as e:
            self.logger.exception("Orchestrator process_stream error")
            yield {
                "type": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }

    async def process(
        self,
        user_input: str,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Process user input (non-streaming version).

        This is a convenience method that collects the full response.
        For better UX, use process_stream() instead.

        Args:
            user_input: User's query
            conversation_id: Optional conversation ID
            context: Optional context dictionary

        Returns:
            Complete response string
        """
        result = []
        error_message = None
        produced = False
        fallback_used = False

        async for event in self.process_stream(
            user_input=user_input,
            conversation_id=conversation_id,
            context=context
        ):
            if event["type"] == "token":
                result.append(event["token"])
                produced = True
            elif event["type"] == "error":
                error_message = event.get("error")
                break

        if error_message:
            return f"Error: {error_message}"

        if not produced:
            # Fallback to general agent non-streaming response to avoid empty replies
            try:
                general_agent = GeneralAgent(llm=self.llm)
                fallback = await general_agent.handle(query=user_input)
                if fallback:
                    fallback_used = True
                    return fallback
            except Exception as e:
                self.logger.error(f"General fallback failed: {e}")

        if not produced:
            return (
                "I’m Alfy Advanced (local). I couldn’t generate a response from the model. "
                "Please try rephrasing your request."
            )

        return "".join(result)

    def clear_agent_cache(self):
        """
        Clear cached agents.

        Useful for:
        - Freeing memory
        - Forcing reload of agent configurations
        - Testing
        """
        self._agent_cache.clear()

    def get_router_stats(self) -> Dict[str, Any]:
        """
        Get statistics from the router.

        Returns:
            Dictionary with routing performance stats
        """
        return self.router.get_stats()

    def get_llm_status(self) -> Dict[str, bool]:
        """
        Get LLM loading status.

        Returns:
            Dictionary with router_loaded and agent_loaded booleans
        """
        return self.llm.get_status()

    def get_cached_domains(self) -> list:
        """
        Get list of domains with cached agents.

        Returns:
            List of domain names that have cached agents
        """
        return list(self._agent_cache.keys())
