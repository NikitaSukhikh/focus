"""Token usage tracking for LLM providers."""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class TokenUsage:
    """Token usage for a single query."""
    timestamp: datetime
    provider: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    conversation_id: Optional[str] = None
    endpoint: Optional[str] = None


@dataclass
class TokenStatistics:
    """Aggregated token statistics."""
    total_queries: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_tokens: int = 0
    queries_by_provider: Dict[str, int] = field(default_factory=dict)
    tokens_by_provider: Dict[str, int] = field(default_factory=dict)
    queries: List[TokenUsage] = field(default_factory=list)


class TokenTracker:
    """Global token usage tracker for all LLM providers."""

    _instance: Optional['TokenTracker'] = None
    _statistics: TokenStatistics = None
    _last_usage: Optional[TokenUsage] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._statistics = TokenStatistics()
        return cls._instance

    @classmethod
    def track_usage(
        cls,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        conversation_id: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> TokenUsage:
        """
        Track token usage for a query.

        Args:
            provider: Provider name (claude, openai, local)
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            conversation_id: Optional conversation ID
            endpoint: Optional endpoint name

        Returns:
            TokenUsage object with the tracked usage
        """
        if cls._statistics is None:
            cls._statistics = TokenStatistics()

        total_tokens = input_tokens + output_tokens

        # Create usage record
        usage = TokenUsage(
            timestamp=datetime.now(),
            provider=provider,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            conversation_id=conversation_id,
            endpoint=endpoint
        )

        # Update statistics
        cls._statistics.total_queries += 1
        cls._statistics.total_input_tokens += input_tokens
        cls._statistics.total_output_tokens += output_tokens
        cls._statistics.total_tokens += total_tokens

        # Update provider-specific stats
        if provider not in cls._statistics.queries_by_provider:
            cls._statistics.queries_by_provider[provider] = 0
            cls._statistics.tokens_by_provider[provider] = 0

        cls._statistics.queries_by_provider[provider] += 1
        cls._statistics.tokens_by_provider[provider] += total_tokens

        # Add to query list
        cls._statistics.queries.append(usage)

        # Store as last usage
        cls._last_usage = usage

        logger.debug(
            f"Token usage tracked: {provider} - "
            f"Input: {input_tokens}, Output: {output_tokens}, Total: {total_tokens}"
        )

        return usage

    @classmethod
    def get_last_usage(cls) -> Optional[TokenUsage]:
        """Get the last tracked token usage."""
        return cls._last_usage

    @classmethod
    def get_statistics(cls) -> TokenStatistics:
        """Get current token statistics."""
        if cls._statistics is None:
            cls._statistics = TokenStatistics()
        return cls._statistics

    @classmethod
    def get_formatted_summary(cls) -> str:
        """
        Get a formatted summary of token usage.

        Returns:
            Formatted string with token statistics
        """
        stats = cls.get_statistics()

        if stats.total_queries == 0:
            return "No LLM queries made during this session."

        lines = [
            "=" * 80,
            "TOKEN USAGE SUMMARY",
            "=" * 80,
            f"Total Queries: {stats.total_queries}",
            f"Total Tokens: {stats.total_tokens:,}",
            f"  - Input Tokens:  {stats.total_input_tokens:,}",
            f"  - Output Tokens: {stats.total_output_tokens:,}",
            ""
        ]

        # Provider breakdown
        if stats.queries_by_provider:
            lines.append("Breakdown by Provider:")
            for provider, query_count in sorted(stats.queries_by_provider.items()):
                token_count = stats.tokens_by_provider.get(provider, 0)
                lines.append(f"  {provider.upper()}:")
                lines.append(f"    Queries: {query_count}")
                lines.append(f"    Tokens:  {token_count:,}")

        lines.append("")

        # Recent queries
        if stats.queries:
            lines.append("Recent Queries:")
            # Show last 10 queries
            for usage in stats.queries[-10:]:
                timestamp_str = usage.timestamp.strftime("%H:%M:%S")
                endpoint_str = f" [{usage.endpoint}]" if usage.endpoint else ""
                lines.append(
                    f"  {timestamp_str} - {usage.provider.upper()}{endpoint_str}: "
                    f"{usage.input_tokens}in + {usage.output_tokens}out = {usage.total_tokens} tokens"
                )

        lines.append("=" * 80)
        return "\n".join(lines)

    @classmethod
    def reset(cls):
        """Reset all statistics."""
        cls._statistics = TokenStatistics()
        logger.info("Token statistics reset")


# Global singleton instance
token_tracker = TokenTracker()
