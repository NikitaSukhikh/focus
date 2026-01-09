"""Application configuration with environment-backed settings."""

import os
from enum import Enum
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)


class LLMProvider(str, Enum):
    """Available LLM provider options."""
    LOCAL = "local"
    CLAUDE = "claude"
    OPENAI = "openai"


class ClaudeModel(str, Enum):
    """Available Claude models."""
    SONNET_3_5 = "claude-3-5-sonnet-20241022"
    SONNET_3_7 = "claude-3-7-sonnet-20250219"
    OPUS_3_5 = "claude-3-5-opus-20241022"
    OPUS_4_5 = "claude-opus-4-5-20251101"
    HAIKU_3_5 = "claude-3-5-haiku-20241022"


class Settings:
    """Application settings with environment variable support."""

    def __init__(self):
        # LLM Provider Configuration
        self.llm_provider: LLMProvider = LLMProvider(
            os.getenv("ALFY_LLM_PROVIDER", "local")
        )

        # Local LLM Configuration
        self.local_router_model_path: str = os.getenv(
            "ALFY_LOCAL_ROUTER_MODEL",
            "llm_models/qwen3-1.7b-q4_k_m.gguf"
        )
        self.local_agent_model_path: str = os.getenv(
            "ALFY_LOCAL_AGENT_MODEL",
            "llm_models/qwen3-8b-q4_k_m.gguf"
        )
        self.local_n_ctx: int = int(os.getenv("ALFY_LOCAL_N_CTX", "2048"))
        self.local_n_threads: int = int(os.getenv("ALFY_LOCAL_N_THREADS", "4"))
        self.local_n_batch: int = int(os.getenv("ALFY_LOCAL_N_BATCH", "512"))
        self.local_max_tokens: int = int(os.getenv("ALFY_LOCAL_MAX_TOKENS", "512"))
        self.local_temperature: float = float(os.getenv("ALFY_LOCAL_TEMPERATURE", "0.7"))

        # Claude API Configuration
        self.anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
        self.claude_model: ClaudeModel = ClaudeModel(
            os.getenv("ALFY_CLAUDE_MODEL", ClaudeModel.HAIKU_3_5.value)
        )
        self.claude_max_tokens: int = int(os.getenv("ALFY_CLAUDE_MAX_TOKENS", "4096"))
        self.claude_temperature: float = float(os.getenv("ALFY_CLAUDE_TEMPERATURE", "0.7"))

        # OpenAI API Configuration (for future use)
        self.openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
        self.openai_model: str = os.getenv("ALFY_OPENAI_MODEL", "gpt-4")

        # API Server Configuration
        self.api_host: str = os.getenv("ALFY_API_HOST", "127.0.0.1")
        self.api_port: int = int(os.getenv("ALFY_API_PORT", "8001"))
        self.api_reload: bool = os.getenv("ALFY_API_RELOAD", "false").lower() == "true"

        # Database Configuration
        self.database_url: str = os.getenv(
            "ALFY_DATABASE_URL",
            "sqlite:///./alfy.db"
        )

        # Invoice Generator API Configuration
        self.invoice_gen_api_key: Optional[str] = os.getenv("INVOICE_GEN_API_KEY")

    def validate(self) -> None:
        """Validate configuration based on selected provider."""
        if self.llm_provider == LLMProvider.CLAUDE:
            if not self.anthropic_api_key:
                raise ValueError(
                    "ANTHROPIC_API_KEY environment variable is required when using Claude provider"
                )
        elif self.llm_provider == LLMProvider.OPENAI:
            if not self.openai_api_key:
                raise ValueError(
                    "OPENAI_API_KEY environment variable is required when using OpenAI provider"
                )
        elif self.llm_provider == LLMProvider.LOCAL:
            # Check if local model files exist
            if not Path(self.local_router_model_path).exists():
                raise ValueError(
                    f"Local router model not found at: {self.local_router_model_path}"
                )
            if not Path(self.local_agent_model_path).exists():
                raise ValueError(
                    f"Local agent model not found at: {self.local_agent_model_path}"
                )


settings = Settings()