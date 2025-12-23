"""
Simplified LLM wrapper using only Qwen 1.7B for direct chat.

This replaces the complex three-tier routing system with a single model
that handles all user queries directly.
"""

import asyncio
import logging
import time
from pathlib import Path
from typing import Optional, Any, List, Dict

logger = logging.getLogger(__name__)


class SimpleLLM:
    """
    Simple LLM manager using only Qwen 1.7B model.

    No routing, no agents, just direct chat with the user.
    """

    def __init__(self, model_path: str = "llm_models/qwen3-1.7b-q4_k_m.gguf"):
        self.model_path = model_path
        self._model: Optional[Any] = None
        self._lock = asyncio.Lock()
        # Semaphore to prevent CPU overload (1 = sequential, prevents crashes)
        self._inference_semaphore = asyncio.Semaphore(1)
        self._loaded = False
        self._loading = False
        self.logger = logging.getLogger(__name__)

    def _resolve_model_path(self) -> str:
        """Resolve the model path, supporting glob patterns."""
        path = Path(self.model_path)
        if path.exists():
            return str(path)

        # Try case-insensitive glob
        candidates = sorted(Path("llm_models").glob("*1.7B*Q4_K_M*.gguf"))
        if candidates:
            resolved = str(candidates[0])
            self.logger.info(f"[OK] Resolved model path: {resolved}")
            return resolved

        raise FileNotFoundError(f"[FAIL] Model not found: {self.model_path}")

    async def _load_model(self):
        """Lazy load the Qwen 1.7B model."""
        if self._model is None:
            async with self._lock:
                # Double-check locking
                if self._model is None:
                    if self._loading:
                        self.logger.warning("Model is already being loaded, waiting...")
                        await asyncio.sleep(1)
                        return self._model

                    self._loading = True
                    start_time = time.time()

                    try:
                        from llama_cpp import Llama

                        model_path = self._resolve_model_path()
                        self.logger.info(f"[INFO] Loading Qwen 1.7B from {model_path}...")
                        print(f"[LLM] Loading Qwen 1.7B from {model_path}...")

                        # Load model using asyncio.to_thread (Windows-safe)
                        self._model = await asyncio.to_thread(
                            Llama,
                            model_path=model_path,
                            n_ctx=2048,  # Reduced context for faster inference
                            n_threads=2,  # Ultra-conservative: only 2 threads to prevent crash
                            n_batch=256,  # Reduced batch size for lower memory usage
                            n_gpu_layers=0,  # CPU only (set >0 for GPU)
                            verbose=False,
                        )

                        load_time = time.time() - start_time
                        self._loaded = True
                        self._loading = False
                        self.logger.info(f"[OK] Model loaded successfully in {load_time:.2f}s")
                        print(f"[LLM] Model loaded successfully in {load_time:.2f}s")

                    except ImportError:
                        self._loading = False
                        raise ImportError(
                            "llama-cpp-python not installed. "
                            "Install with: pip install llama-cpp-python"
                        )
                    except FileNotFoundError as e:
                        self._loading = False
                        self.logger.error(f"[FAIL] Model file not found: {e}")
                        raise
                    except Exception as e:
                        self._loading = False
                        self.logger.error(f"[FAIL] Failed to load model: {e}")
                        raise RuntimeError(f"Failed to load model: {e}")

        return self._model

    async def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 512,  # Reduced for faster responses
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a chat response.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            Assistant's response text
        """
        model = await self._load_model()

        if model is None:
            self.logger.error("[FAIL] Failed to load model")
            return "I apologize, but I'm having trouble loading the language model. Please try again."

        try:
            # Use semaphore to limit concurrent inferences (2 at a time)
            async with self._inference_semaphore:
                start_time = time.time()
                self.logger.info(f"[INFO] Generating response for {len(messages)} messages...")

                # Use asyncio.to_thread for Windows compatibility
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        model.create_chat_completion,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        stream=False,
                    ),
                    timeout=30.0  # 30 second timeout (should be much faster)
                )

                gen_time = time.time() - start_time
                result = response["choices"][0]["message"]["content"]
                self.logger.info(f"[OK] Generated {len(result)} chars in {gen_time:.2f}s")

            if not result or len(result.strip()) == 0:
                self.logger.warning("[WARN] Generated empty response")
                return "I apologize, but I couldn't generate a response. Please try rephrasing your question."

            return result

        except asyncio.TimeoutError:
            self.logger.error("[FAIL] Generation timeout after 30 seconds")
            return "I apologize, the model took too long to respond. Please try a shorter query."
        except Exception as e:
            self.logger.error(f"[FAIL] Generation error: {e}", exc_info=True)
            return f"I encountered an error: {str(e)}"

    @property
    def is_loaded(self) -> bool:
        """Check if model is currently loaded."""
        return self._loaded

    def get_status(self) -> Dict[str, Any]:
        """Get model loading status."""
        return {
            "loaded": self._loaded,
            "loading": self._loading,
            "model_path": self.model_path,
        }
