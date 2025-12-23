# LLM wrapper for local Qwen models via llama.cpp.

"""
LLM module for Alfy - Lazy loading inference engine.

This module implements lazy loading for both the Router (1.7B) and Agent (8B) models,
significantly reducing startup time and idle memory usage.

Startup RAM without lazy loading: ~7.5GB
Startup RAM with lazy loading: ~0.5GB (models loaded on first use)
"""

import asyncio
from typing import Optional, AsyncGenerator, Dict, Any, List
import gc
from pathlib import Path
import logging
import time


class LLM:
    """
    Lazy-loading LLM manager for Alfy's two-model architecture.

    Models are loaded on first use, not at initialization:
    - Router Model (Qwen3-1.7B): For domain classification
    - Agent Model (Qwen3-8B): For actual task execution
    """

    def __init__(
        self,
        router_model_path: str = "llm_models/qwen3-1.7b-q4_k_m.gguf",
        agent_model_path: str = "llm_models/qwen3-8b-q4_k_m.gguf",
    ):
        """
        Initialize LLM manager with model paths.

        Args:
            router_model_path: Path to the small router model (1.7B)
            agent_model_path: Path to the large agent model (8B)
        """
        self.router_model_path = router_model_path
        self.agent_model_path = agent_model_path

        # Models are None until first use (lazy loading)
        self._router_model: Optional[Any] = None
        self._agent_model: Optional[Any] = None

        # Async locks for safe lazy initialization
        self._lock = asyncio.Lock()
        # Serialize generation calls to avoid llama.cpp concurrency issues
        self._gen_lock = asyncio.Lock()

        # NOTE: Using asyncio.to_thread() instead of ThreadPoolExecutor
        # for better Windows compatibility with llama.cpp (prevents deadlocks)

        # Track loading state
        self._router_loaded = False
        self._agent_loaded = False
        self._loading_router = False
        self._loading_agent = False
        self.logger = logging.getLogger(__name__)

    def _resolve_model_path(self, configured_path: str, glob_pattern: str) -> str:
        """
        Resolve a model path, allowing for case-insensitive filename differences.

        Args:
            configured_path: Path provided in settings/init
            glob_pattern: Glob to search under llm_models if configured path missing

        Returns:
            Resolved file path as string

        Raises:
            FileNotFoundError if no model file is found
        """
        path = Path(configured_path)
        if path.exists():
            return str(path)

        # Try matching with glob (case-insensitive names from downloaded models)
        candidates = sorted(Path("llm_models").glob(glob_pattern))
        if candidates:
            resolved = str(candidates[0])
            self.logger.info(f"Resolved model path via glob '{glob_pattern}': {resolved}")
            return resolved

        raise FileNotFoundError(f"Model path does not exist: {configured_path}")

    async def _load_router(self):
        """
        Lazy load the router model (Qwen3-1.7B).

        This is called automatically on first classification request.
        Uses double-check locking pattern for async safety.

        Memory: ~1.5GB
        Load time: ~2-3 seconds
        """
        if self._router_model is None:
            async with self._lock:
                # Double-check: another coroutine might have loaded it
                if self._router_model is None:
                    if self._loading_router:
                        self.logger.warning("Router model is already being loaded, waiting...")
                        # Wait a bit and return None to retry
                        await asyncio.sleep(1)
                        return self._router_model

                    self._loading_router = True
                    start_time = time.time()

                    try:
                        from llama_cpp import Llama

                        router_path = self._resolve_model_path(
                            self.router_model_path, "*1.7B*Q4_K_M*.gguf"
                        )

                        self.logger.info(f"[ROUTER] Loading model from {router_path}...")
                        print(f"[ROUTER] Loading model from {router_path}...")

                        # Load model using asyncio.to_thread (Windows-safe)
                        self._router_model = await asyncio.to_thread(
                            Llama,
                            model_path=router_path,
                            n_ctx=2048,  # Smaller context for classification
                            n_threads=2,  # Fewer threads = faster load
                            n_batch=512,
                            n_gpu_layers=0,  # CPU only (set >0 for GPU)
                            verbose=False,
                        )

                        load_time = time.time() - start_time
                        self._router_loaded = True
                        self._loading_router = False
                        self.logger.info(f"[ROUTER] Model loaded successfully in {load_time:.2f}s")
                        print(f"[ROUTER] Model loaded successfully in {load_time:.2f}s")

                    except ImportError as e:
                        self._loading_router = False
                        self.logger.error(f"[ROUTER] ImportError: {e}")
                        raise ImportError(
                            "llama-cpp-python not installed. "
                            "Install with: pip install llama-cpp-python"
                        )
                    except FileNotFoundError as e:
                        self._loading_router = False
                        self.logger.error(f"[ROUTER] Model file not found: {e}")
                        raise
                    except Exception as e:
                        self._loading_router = False
                        self.logger.error(f"[ROUTER] Failed to load model: {e}")
                        raise RuntimeError(f"Failed to load router model: {e}")

        return self._router_model

    async def _load_agent(self):
        """
        Lazy load the agent model (Qwen3-8B).

        This is called automatically on first generation request.
        Uses double-check locking pattern for async safety.

        Memory: ~6GB
        Load time: ~5-8 seconds
        """
        if self._agent_model is None:
            async with self._lock:
                # Double-check: another coroutine might have loaded it
                if self._agent_model is None:
                    if self._loading_agent:
                        self.logger.warning("Agent model is already being loaded, waiting...")
                        # Wait a bit and return None to retry
                        await asyncio.sleep(1)
                        return self._agent_model

                    self._loading_agent = True
                    start_time = time.time()

                    try:
                        from llama_cpp import Llama

                        agent_path = self._resolve_model_path(
                            self.agent_model_path, "*8B*Q4_K_M*.gguf"
                        )

                        self.logger.info(f"[AGENT] Loading model from {agent_path}...")
                        print(f"[AGENT] Loading model from {agent_path}... (this may take 5-10 seconds)")

                        # Load model using asyncio.to_thread (Windows-safe)
                        self._agent_model = await asyncio.to_thread(
                            Llama,
                            model_path=agent_path,
                            n_ctx=2048,  # Reduced to match router (prevent hangs)
                            n_threads=4,  # Reduced threads for stability
                            n_batch=256,  # Smaller batch size for stability
                            n_gpu_layers=0,  # CPU only (set >0 for GPU)
                            verbose=False,  # Disable verbose (less noise in logs)
                        )

                        load_time = time.time() - start_time
                        self._agent_loaded = True
                        self._loading_agent = False
                        self.logger.info(f"[AGENT] Model loaded successfully in {load_time:.2f}s")
                        print(f"[AGENT] Model loaded successfully in {load_time:.2f}s")

                    except ImportError as e:
                        self._loading_agent = False
                        self.logger.error(f"[AGENT] ImportError: {e}")
                        raise ImportError(
                            "llama-cpp-python not installed. "
                            "Install with: pip install llama-cpp-python"
                        )
                    except FileNotFoundError as e:
                        self._loading_agent = False
                        self.logger.error(f"[AGENT] Model file not found: {e}")
                        raise
                    except Exception as e:
                        self._loading_agent = False
                        self.logger.error(f"[AGENT] Failed to load model: {e}")
                        raise RuntimeError(f"Failed to load agent model: {e}")

        return self._agent_model

    async def classify(self, user_input: str) -> str:
        """
        Classify user input into a domain using the router model.

        This is Tier 1 routing - called when heuristics are ambiguous.

        Args:
            user_input: The user's query

        Returns:
            Domain name (files, email, calendar, etc.)
        """
        router = await self._load_router()

        if router is None:
            self.logger.error("[ROUTER] Failed to load router model")
            return "general"

        # System prompt for classification
        system_prompt = """You are a domain classifier for Alfy, a personal assistant.

Given a user query, classify it into ONE of these domains:
- files: File operations, document management
- external_llm: Requests to use Claude or ChatGPT
- general: General questions, casual conversation

Respond with ONLY the domain name, nothing else."""

        try:
            start_time = time.time()
            # Use asyncio.to_thread for Windows compatibility
            response = await asyncio.to_thread(
                router.create_chat_completion,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                max_tokens=10,
                temperature=0.0,  # Deterministic for consistent classification
                stop=["\n", " "],
            )

            classify_time = time.time() - start_time
            domain = response["choices"][0]["message"]["content"].strip().lower()

            # Clean up thinking tokens and extract domain
            # Qwen models sometimes output <think> tags or extra text
            if '<' in domain or '>' in domain:
                # Remove thinking tags
                domain = domain.replace('<think>', '').replace('</think>', '')
                domain = domain.replace('<', '').replace('>', '')
                domain = domain.strip()

            # Extract first word if multiple words
            if ' ' in domain:
                domain = domain.split()[0]

            self.logger.info(f"[ROUTER] Classified to '{domain}' in {classify_time:.2f}s")
            return domain

        except Exception as e:
            self.logger.error(f"[ROUTER] Classification error: {e}")
            return "general"

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,  # Reduced from 2048 to prevent hangs
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a response using the agent model.

        Args:
            prompt: User's query
            system_prompt: System instructions for the agent
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            Generated response text
        """
        agent = await self._load_agent()

        if agent is None:
            self.logger.error("[AGENT] Failed to load agent model")
            return "I apologize, but I'm having trouble loading the language model. Please try again."

        try:
            self.logger.info(f"[AGENT] Acquiring generation lock...")
            async with self._gen_lock:
                self.logger.info(f"[AGENT] Lock acquired, preparing messages...")
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                start_time = time.time()
                self.logger.info(f"[AGENT] Generating response for prompt: {prompt[:50]}...")

                # Add timeout to prevent infinite hangs
                try:
                    self.logger.info(f"[AGENT] Calling llama.cpp create_chat_completion with max_tokens={max_tokens}, temp={temperature}...")

                    # Use asyncio.to_thread for Windows compatibility
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            agent.create_chat_completion,
                            messages=messages,
                            max_tokens=max_tokens,
                            temperature=temperature,
                            stream=False,
                        ),
                        timeout=120.0  # 2 minute timeout
                    )
                    self.logger.info(f"[AGENT] LLM call completed successfully")
                except asyncio.TimeoutError:
                    self.logger.error(f"[AGENT] Generation timeout after 120 seconds")
                    self.logger.error(f"[AGENT] This may indicate the model is stuck or too slow")
                    return "I apologize, the model took too long to respond (>2 minutes). Please try a shorter query or restart the backend."

                gen_time = time.time() - start_time
                result = response["choices"][0]["message"]["content"]
                self.logger.info(f"[AGENT] Generated {len(result)} chars in {gen_time:.2f}s")

                if not result or len(result.strip()) == 0:
                    self.logger.warning("[AGENT] Generated empty response")
                    return "I apologize, but I couldn't generate a response. Please try rephrasing your question."

                return result

        except asyncio.TimeoutError:
            self.logger.error(f"[AGENT] Generation timeout")
            return "I apologize, the model took too long to respond. Please try again."
        except Exception as e:
            self.logger.error(f"[AGENT] Generation error: {e}", exc_info=True)
            return f"Error generating response: {str(e)}"

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str = "",
        max_tokens: int = 2048,
        temperature: float = 0.7,
        tools: Optional[List] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a streaming response using the agent model.

        This method yields tokens as they're generated for real-time UI updates.

        Args:
            messages: List of chat messages
            system_prompt: System instructions
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            tools: Optional list of tools (for future function calling)

        Yields:
            Dict with type 'token' and 'content' key, or 'complete' when done
        """
        agent = await self._load_agent()

        if agent is None:
            yield {
                "type": "error",
                "error": "Failed to load agent model"
            }
            return

        try:
            # Prepend system message if provided
            full_messages = []
            if system_prompt:
                full_messages.append({"role": "system", "content": system_prompt})
            full_messages.extend(messages)

            self.logger.info(f"[AGENT] Starting streaming generation...")

            # Stream tokens
            # Note: Streaming is disabled on Windows due to llama.cpp issues
            # Using non-streaming with manual chunking instead
            response = await asyncio.to_thread(
                agent.create_chat_completion,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=False,
            )

            result = response["choices"][0]["message"]["content"]

            if result and len(result.strip()) > 0:
                yield {"type": "token", "token": result}
                yield {"type": "complete"}
            else:
                self.logger.warning("[AGENT] Stream generated empty response")
                yield {
                    "type": "error",
                    "error": "Generated empty response"
                }

        except Exception as e:
            self.logger.error(f"[AGENT] Stream generation error: {e}", exc_info=True)
            yield {
                "type": "error",
                "error": str(e)
            }

    def unload_router(self):
        """
        Unload the router model to free memory.

        Useful after initial classification when only the agent is needed.
        Frees ~1.5GB of RAM.
        """
        with self._lock:
            if self._router_model is not None:
                self.logger.info("Unloading router model...")
                del self._router_model
                self._router_model = None
                self._router_loaded = False
                gc.collect()  # Force garbage collection
                self.logger.info("Router model unloaded.")

    def unload_agent(self):
        """
        Unload the agent model to free memory.

        Frees ~6GB of RAM.
        """
        with self._lock:
            if self._agent_model is not None:
                self.logger.info("Unloading agent model...")
                del self._agent_model
                self._agent_model = None
                self._agent_loaded = False
                gc.collect()  # Force garbage collection
                self.logger.info("Agent model unloaded.")

    def unload_all(self):
        """Unload both models to free all LLM memory."""
        self.unload_router()
        self.unload_agent()

    def shutdown(self):
        """Shutdown the LLM manager and cleanup resources."""
        self.logger.info("Shutting down LLM manager...")
        self.unload_all()
        self.logger.info("LLM manager shutdown complete")

    def get_status(self) -> Dict[str, bool]:
        """
        Get the loading status of both models.

        Returns:
            Dictionary with router_loaded and agent_loaded booleans
        """
        return {
            "router_loaded": self._router_loaded,
            "agent_loaded": self._agent_loaded,
        }

    @property
    def is_router_loaded(self) -> bool:
        """Check if router model is currently loaded."""
        return self._router_loaded

    @property
    def is_agent_loaded(self) -> bool:
        """Check if agent model is currently loaded."""
        return self._agent_loaded
