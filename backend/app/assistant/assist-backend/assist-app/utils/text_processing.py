"""
Text processing utilities for cleaning LLM outputs.
"""

import re
from typing import Tuple


def remove_thinking_tags(text: str) -> str:
    """
    Remove <think>...</think> tags from text.

    This filters out the model's internal reasoning process,
    showing only the final answer to users.

    Args:
        text: Raw text potentially containing thinking tags

    Returns:
        Cleaned text without thinking tags

    Examples:
        >>> remove_thinking_tags("Hello <think>reasoning</think> world")
        'Hello  world'

        >>> remove_thinking_tags("<think>Let me think...</think>The answer is 42")
        'The answer is 42'
    """
    # Remove <think>...</think> blocks (non-greedy)
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)

    # Also remove standalone <think> or </think> tags if any
    cleaned = re.sub(r'</?think>', '', cleaned, flags=re.IGNORECASE)

    # Clean up extra whitespace
    cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)  # Max 2 consecutive newlines
    cleaned = cleaned.strip()

    return cleaned


def clean_llm_response(raw_response: str) -> Tuple[str, str]:
    """
    Clean LLM response for display while preserving raw version for logging.

    Args:
        raw_response: Raw response from LLM

    Returns:
        Tuple of (cleaned_response, raw_response)
        - cleaned_response: User-facing text without thinking tags
        - raw_response: Original text with thinking tags (for logging)
    """
    cleaned = remove_thinking_tags(raw_response)
    return cleaned, raw_response
