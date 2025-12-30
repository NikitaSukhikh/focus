"""
Application configuration using Pydantic Settings.

This module provides centralized configuration management for the Ocean backend,
loading settings from environment variables with validation and type checking.
"""

from typing import List, Literal, Optional
from pathlib import Path
from pydantic import Field, field_validator, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerSettings(BaseSettings):
    """Server configuration settings."""

    host: str = Field(default="127.0.0.1", description="Server host address")
    port: int = Field(default=8000, ge=1024, le=65535, description="Server port")
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Application environment"
    )
    debug: bool = Field(default=True, description="Enable debug mode")

    model_config = SettingsConfigDict(
        env_prefix="SERVER_",
        case_sensitive=False
    )


class CORSSettings(BaseSettings):
    """CORS configuration settings."""

    origins: List[str] = Field(
        default=[
            "http://localhost:1420",
            "tauri://localhost",
            "http://localhost:5173",
            "http://127.0.0.1:1420",
            "http://127.0.0.1:5173",
        ],
        description="Allowed CORS origins"
    )
    allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    allow_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        description="Allowed HTTP methods"
    )
    allow_headers: List[str] = Field(
        default=["*"],
        description="Allowed HTTP headers"
    )

    model_config = SettingsConfigDict(
        env_prefix="CORS_",
        case_sensitive=False
    )

    @field_validator("origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        """Parse comma-separated origins string into list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""

    path: str = Field(
        default="./storage/local_files/data/ocean.db",
        description="Path to SQLite database file"
    )
    pool_size: int = Field(default=5, ge=1, description="Database connection pool size")
    max_overflow: int = Field(default=10, ge=0, description="Max overflow connections")
    echo: bool = Field(default=False, description="Enable SQL query logging")

    model_config = SettingsConfigDict(
        env_prefix="DATABASE_",
        case_sensitive=False
    )

    @property
    def url(self) -> str:
        """Generate SQLite database URL."""
        db_path = Path(self.path).resolve()
        return f"sqlite+aiosqlite:///{db_path}"

    def ensure_database_directory(self) -> None:
        """Ensure the database directory exists."""
        db_path = Path(self.path)
        db_path.parent.mkdir(parents=True, exist_ok=True)


class GoogleOAuthSettings(BaseSettings):
    """Google OAuth configuration settings."""

    client_id: str = Field(
        default="",
        description="Google OAuth client ID"
    )
    client_secret: str = Field(
        default="",
        description="Google OAuth client secret"
    )
    redirect_uri: str = Field(
        default="http://localhost:8000/api/google/auth/callback",
        description="OAuth redirect URI"
    )
    scopes: List[str] = Field(
        default=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
        ],
        description="OAuth scopes"
    )

    model_config = SettingsConfigDict(
        env_prefix="GOOGLE_",
        case_sensitive=False
    )

    @field_validator("scopes", mode="before")
    @classmethod
    def parse_scopes(cls, v):
        """Parse space-separated or comma-separated scopes string into list."""
        if isinstance(v, str):
            # Try space-separated first (OAuth standard)
            scopes = v.split()
            if len(scopes) == 1:
                # Try comma-separated
                scopes = [scope.strip() for scope in v.split(",") if scope.strip()]
            return scopes
        return v

    @property
    def is_configured(self) -> bool:
        """Check if Google OAuth is properly configured."""
        return bool(self.client_id and self.client_secret)


class AIAssistantSettings(BaseSettings):
    """AI Assistant configuration settings."""

    provider: Literal["anthropic", "openai"] = Field(
        default="anthropic",
        description="AI provider to use"
    )

    # Anthropic settings
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    anthropic_model: str = Field(
        default="claude-3-5-sonnet-20241022",
        description="Anthropic model ID"
    )

    # OpenAI settings
    openai_api_key: str = Field(default="", description="OpenAI API key")
    openai_model: str = Field(
        default="gpt-4-turbo-preview",
        description="OpenAI model ID"
    )

    # General AI settings
    max_tokens: int = Field(default=4096, ge=1, description="Max tokens for responses")
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Temperature for responses"
    )

    model_config = SettingsConfigDict(
        env_prefix="AI_",
        case_sensitive=False
    )

    @property
    def is_configured(self) -> bool:
        """Check if AI assistant is properly configured."""
        if self.provider == "anthropic":
            return bool(self.anthropic_api_key)
        elif self.provider == "openai":
            return bool(self.openai_api_key)
        return False

    @property
    def api_key(self) -> str:
        """Get the API key for the current provider."""
        if self.provider == "anthropic":
            return self.anthropic_api_key
        elif self.provider == "openai":
            return self.openai_api_key
        return ""

    @property
    def model(self) -> str:
        """Get the model ID for the current provider."""
        if self.provider == "anthropic":
            return self.anthropic_model
        elif self.provider == "openai":
            return self.openai_model
        return ""


class StorageSettings(BaseSettings):
    """Storage configuration settings."""

    base_path: str = Field(
        default="./storage/local_files",
        description="Base directory for file storage"
    )
    cache_dir: str = Field(
        default="./storage/local_files/cache",
        description="Cache directory for thumbnails and previews"
    )
    cache_max_size_mb: int = Field(
        default=500,
        ge=1,
        description="Maximum cache size in MB"
    )
    cache_cleanup_interval_hours: int = Field(
        default=24,
        ge=1,
        description="Cache cleanup interval in hours"
    )

    # Thumbnail settings
    thumbnail_max_width: int = Field(default=400, ge=50, description="Max thumbnail width")
    thumbnail_max_height: int = Field(default=400, ge=50, description="Max thumbnail height")
    thumbnail_quality: int = Field(
        default=85,
        ge=1,
        le=100,
        description="Thumbnail JPEG quality"
    )

    # Text preview settings
    text_preview_lines: int = Field(
        default=10,
        ge=1,
        description="Number of lines for text previews"
    )

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=False
    )

    @property
    def thumbnails_dir(self) -> Path:
        """Get the thumbnails directory path."""
        return Path(self.cache_dir) / "thumbnails"

    @property
    def previews_dir(self) -> Path:
        """Get the previews directory path."""
        return Path(self.cache_dir) / "previews"

    def ensure_directories(self) -> None:
        """Ensure all required storage directories exist."""
        Path(self.base_path).mkdir(parents=True, exist_ok=True)
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)

        # Create subdirectories
        self.thumbnails_dir.mkdir(exist_ok=True)
        self.previews_dir.mkdir(exist_ok=True)


class SecuritySettings(BaseSettings):
    """Security configuration settings."""

    secret_key: str = Field(
        default="change-this-to-a-random-secret-key-in-production",
        min_length=32,
        description="Secret key for encryption"
    )
    encryption_key: str = Field(
        default="change-this-to-a-random-encryption-key-in-production",
        description="Token encryption key (Fernet key)"
    )
    session_timeout_seconds: int = Field(
        default=2592000,  # 30 days
        ge=60,
        description="Session timeout in seconds"
    )

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=False
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v):
        """Validate secret key is not the default value in production."""
        if v == "change-this-to-a-random-secret-key-in-production":
            # This will be checked in the main Settings class
            pass
        return v

    @field_validator("encryption_key")
    @classmethod
    def validate_encryption_key(cls, v):
        """
        Ensure encryption key is sufficiently strong.
        Accepts either a Fernet urlsafe base64 key (44 chars ending with '=') or a raw string >=32 chars (derives).
        """
        key = (v or "").strip()
        if len(key) == 44 and key.endswith("="):
            return key
        if len(key) < 32:
            raise ValueError(
                f"ENCRYPTION_KEY must be a Fernet key or at least 32 characters (got {len(key)})."
            )
        return key


class LoggingSettings(BaseSettings):
    """Logging configuration settings."""

    level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="WARNING",
        description="Log level"
    )
    format: Literal["json", "text"] = Field(
        default="json",
        description="Log format"
    )
    output: Literal["console", "file", "both"] = Field(
        default="console",
        description="Log output destination"
    )
    file_path: str = Field(
        default="./logs/ocean.log",
        description="Log file path"
    )
    file_rotation: bool = Field(
        default=True,
        description="Enable log file rotation"
    )
    file_max_size_mb: int = Field(
        default=10,
        ge=1,
        description="Max log file size in MB before rotation"
    )
    file_backup_count: int = Field(
        default=5,
        ge=0,
        description="Number of backup log files to keep"
    )
    requests: bool = Field(
        default=False,
        description="Enable request/response logging"
    )

    model_config = SettingsConfigDict(
        env_prefix="LOG_",
        case_sensitive=False
    )

    def ensure_log_directory(self) -> None:
        """Ensure the log directory exists."""
        log_path = Path(self.file_path)
        log_path.parent.mkdir(parents=True, exist_ok=True)


class RateLimitSettings(BaseSettings):
    """Rate limiting configuration settings."""

    enabled: bool = Field(default=True, description="Enable rate limiting")
    per_minute: int = Field(
        default=60,
        ge=1,
        description="Requests per minute per IP"
    )

    model_config = SettingsConfigDict(
        env_prefix="RATE_LIMIT_",
        case_sensitive=False
    )


class FeatureFlagsSettings(BaseSettings):
    """Feature flags configuration settings."""

    google_integration: bool = Field(
        default=True,
        description="Enable Google integration features"
    )
    ai_assistant: bool = Field(
        default=True,
        description="Enable AI assistant features"
    )
    thumbnails: bool = Field(
        default=True,
        description="Enable thumbnail generation"
    )
    previews: bool = Field(
        default=True,
        description="Enable preview generation"
    )

    model_config = SettingsConfigDict(
        env_prefix="FEATURE_",
        case_sensitive=False
    )


class DevelopmentSettings(BaseSettings):
    """Development and testing configuration settings."""

    enable_api_docs: bool = Field(
        default=True,
        description="Enable API documentation (Swagger UI)"
    )
    enable_openapi_schema: bool = Field(
        default=True,
        description="Enable OpenAPI schema endpoint"
    )
    mock_external_apis: bool = Field(
        default=False,
        description="Mock external APIs for testing"
    )

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=False
    )


class Settings(BaseSettings):
    """Main application settings."""

    # Sub-settings
    server: ServerSettings = Field(default_factory=ServerSettings)
    cors: CORSSettings = Field(default_factory=CORSSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    google: GoogleOAuthSettings = Field(default_factory=GoogleOAuthSettings)
    ai: AIAssistantSettings = Field(default_factory=AIAssistantSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)
    rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)
    features: FeatureFlagsSettings = Field(default_factory=FeatureFlagsSettings)
    dev: DevelopmentSettings = Field(default_factory=DevelopmentSettings)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    def __init__(self, **kwargs):
        """Initialize settings and perform validation."""
        super().__init__(**kwargs)
        self._validate_production_settings()
        self._ensure_directories()

    def _validate_production_settings(self) -> None:
        """Validate settings for production environment."""
        if self.server.environment == "production":
            if self.security.secret_key == "change-this-to-a-random-secret-key-in-production":
                raise ValueError(
                    "SECRET_KEY must be changed from default value in production"
                )

            if self.security.encryption_key == "change-this-to-a-random-encryption-key-in-production":
                raise ValueError(
                    "ENCRYPTION_KEY must be changed from default value in production"
                )

            if self.server.debug:
                import warnings
                warnings.warn(
                    "DEBUG mode is enabled in production environment",
                    UserWarning
                )

    def _ensure_directories(self) -> None:
        """Ensure all required directories exist."""
        self.database.ensure_database_directory()
        self.storage.ensure_directories()
        if self.logging.output in ["file", "both"]:
            self.logging.ensure_log_directory()

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.server.environment == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.server.environment == "development"


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """
    Get the global settings instance.

    This function implements lazy loading and caching of settings.
    The settings are loaded once and reused for subsequent calls.

    Returns:
        Settings: The global settings instance
    """
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    """
    Reset the global settings instance.

    This is useful for testing when you need to reload settings
    with different environment variables.
    """
    global _settings
    _settings = None


# Convenience accessor
settings = get_settings()
