# Three-tier intent router for domain selection.

"""
Router module for Alfy - Three-tier routing system.

Tier 0: Heuristic pattern matching (~0.1ms)
Tier 1: LLM-based classification (~200-400ms, lazy loaded)
Tier 2: Domain agents (handled by orchestrator)
"""

import re
from typing import Optional
from functools import lru_cache


class Router:
    """
    Intelligent router that uses heuristic patterns first (Tier 0),
    falling back to LLM classification (Tier 1) for ambiguous cases.
    """

    # Tier 0: Compiled regex patterns for fast keyword matching
    # These patterns are optimized to catch 70-80% of requests instantly
    PATTERNS = {
        'files': re.compile(
            r'\b(file|files|folder|folders|document|documents|pdf|docx|xlsx|txt|'
            r'open.*file|find.*file|search.*file|move|rename|delete|copy|'
            r'directory|path|download|upload)\b',
            re.IGNORECASE
        ),
        'external_llm': re.compile(
            r'\b(ask claude|ask chatgpt|claude|chatgpt|gpt-4|gpt-3|'
            r'anthropic|openai|use claude|use chatgpt)\b',
            re.IGNORECASE
        ),
    }

    def __init__(self, llm_router=None):
        """
        Initialize the router.

        Args:
            llm_router: Optional LLM instance for Tier 1 classification.
                       Will be lazy-loaded if not provided.
        """
        self.llm_router = llm_router
        self._heuristic_stats = {
            'hits': 0,
            'misses': 0,
            'ambiguous': 0
        }

    @lru_cache(maxsize=1024)
    def _heuristic_route(self, user_input: str) -> Optional[str]:
        """
        Tier 0: Fast heuristic routing using compiled regex patterns.

        This method is cached to avoid re-processing identical queries.
        Returns None if the query is ambiguous or doesn't match any pattern.

        Args:
            user_input: The user's query string

        Returns:
            Domain name if clear match, None if ambiguous or no match
        """
        matches = []

        # Check each domain pattern
        for domain, pattern in self.PATTERNS.items():
            if pattern.search(user_input):
                matches.append(domain)

        # Clear winner: exactly one domain matched
        if len(matches) == 1:
            self._heuristic_stats['hits'] += 1
            return matches[0]

        # Multiple matches or no matches: ambiguous, needs LLM
        if len(matches) > 1:
            self._heuristic_stats['ambiguous'] += 1
        else:
            self._heuristic_stats['misses'] += 1

        return None

    async def route(self, user_input: str) -> str:
        """
        Main routing method with three-tier fallback strategy.

        1. Try Tier 0 (heuristics) - ~0.1ms
        2. If ambiguous, use Tier 1 (LLM) - ~200-400ms
        3. Default to "general" if all else fails

        Args:
            user_input: The user's query string

        Returns:
            Domain name (files, external_llm, or general)
        """
        # Tier 0: Try heuristic matching first
        domain = self._heuristic_route(user_input)
        if domain:
            return domain

        # Tier 1: Use LLM router for ambiguous cases
        if self.llm_router:
            try:
                classified_domain = await self.llm_router.classify(user_input)
                # Validate the domain is recognized
                valid_domains = {
                    'files', 'external_llm', 'general'
                }
                if classified_domain in valid_domains:
                    return classified_domain
            except Exception as e:
                # Log the error but continue gracefully
                print(f"LLM classification failed: {e}")

        # Fallback: default to general agent
        return "general"

    def get_stats(self) -> dict:
        """
        Get statistics about heuristic routing performance.

        Returns:
            Dictionary with hit/miss/ambiguous counts and hit rate
        """
        total = sum(self._heuristic_stats.values())
        hit_rate = (
            self._heuristic_stats['hits'] / total * 100
            if total > 0 else 0
        )

        return {
            **self._heuristic_stats,
            'total': total,
            'hit_rate_percent': round(hit_rate, 2)
        }

    def clear_cache(self):
        """Clear the LRU cache for heuristic routing."""
        self._heuristic_route.cache_clear()