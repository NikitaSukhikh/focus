"""
Example script to test Claude API integration with Alfy.

This script demonstrates how to use the LLM provider abstraction
to switch between local and Claude API modes.

Usage:
    # Test with local LLM
    python -m app.examples.test_claude_integration --provider local

    # Test with Claude API
    python -m app.examples.test_claude_integration --provider claude

    # Test with OpenAI API
    python -m app.examples.test_claude_integration --provider openai
"""

import asyncio
import argparse
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.config import settings, LLMProvider
from app.core.llm_provider import LLMProviderFactory


async def test_provider(provider_type: str):
    """Test a specific LLM provider."""
    print(f"\n{'='*60}")
    print(f"Testing {provider_type.upper()} Provider")
    print(f"{'='*60}\n")

    # Override settings for this test
    original_provider = settings.llm_provider
    settings.llm_provider = LLMProvider(provider_type)

    try:
        # Get provider instance
        provider = await LLMProviderFactory.get_provider()
        print(f"✓ Provider initialized: {provider.__class__.__name__}\n")

        # Test prompts
        test_prompts = [
            {
                "prompt": "Say hello and introduce yourself in one sentence.",
                "system_prompt": "You are Alfy, a helpful personal assistant."
            },
            {
                "prompt": "What is 2+2? Answer in one word.",
                "system_prompt": None
            }
        ]

        # Test non-streaming generation
        print("Testing Non-Streaming Generation:")
        print("-" * 60)

        for i, test in enumerate(test_prompts, 1):
            print(f"\nTest {i}:")
            print(f"Prompt: {test['prompt']}")

            try:
                response = await provider.generate(
                    prompt=test['prompt'],
                    system_prompt=test['system_prompt'],
                    max_tokens=100
                )

                print(f"Response: {response}")
                print("✓ Success")

            except Exception as e:
                print(f"✗ Error: {e}")

        # Test streaming generation
        print(f"\n\nTesting Streaming Generation:")
        print("-" * 60)
        print(f"Prompt: {test_prompts[0]['prompt']}")
        print("Streaming response: ", end="", flush=True)

        try:
            chunks = []
            async for chunk in provider.generate_stream(
                prompt=test_prompts[0]['prompt'],
                system_prompt=test_prompts[0]['system_prompt'],
                max_tokens=100
            ):
                print(chunk, end="", flush=True)
                chunks.append(chunk)

            print("\n✓ Streaming success")

        except Exception as e:
            print(f"\n✗ Streaming error: {e}")

        # Cleanup
        await provider.cleanup()
        print("\n✓ Provider cleaned up")

    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Restore original provider
        settings.llm_provider = original_provider

    print(f"\n{'='*60}\n")


async def test_provider_switching():
    """Test switching between providers."""
    print(f"\n{'='*60}")
    print(f"Testing Provider Switching")
    print(f"{'='*60}\n")

    providers = []

    # Test which providers are available
    if settings.anthropic_api_key:
        providers.append(LLMProvider.CLAUDE)

    if settings.openai_api_key:
        providers.append(LLMProvider.OPENAI)

    # Always test local (if models exist)
    if Path(settings.local_router_model_path).exists():
        providers.append(LLMProvider.LOCAL)

    if not providers:
        print("✗ No providers configured!")
        print("\nTo test providers, configure at least one:")
        print("  - Local: Download models to llm_models/")
        print("  - Claude: Set ANTHROPIC_API_KEY in .env")
        print("  - OpenAI: Set OPENAI_API_KEY in .env")
        return

    print(f"Testing {len(providers)} available provider(s):")
    for p in providers:
        print(f"  - {p.value}")
    print()

    # Test switching between providers
    for provider_type in providers:
        print(f"\nSwitching to {provider_type.value}...")

        try:
            provider = await LLMProviderFactory.get_provider(provider_type)
            print(f"✓ Successfully switched to {provider.__class__.__name__}")

            # Quick test
            response = await provider.generate(
                prompt="Say 'Hello from {provider_type.value}!' and nothing else.",
                max_tokens=20
            )
            print(f"  Response: {response[:100]}...")

        except Exception as e:
            print(f"✗ Error switching to {provider_type.value}: {e}")

    # Cleanup
    await LLMProviderFactory.cleanup()
    print("\n✓ All providers cleaned up")
    print(f"\n{'='*60}\n")


def check_configuration():
    """Check current configuration and display status."""
    print(f"\n{'='*60}")
    print(f"Current Configuration")
    print(f"{'='*60}\n")

    print(f"Default Provider: {settings.llm_provider.value}")
    print()

    # Check Claude configuration
    print("Claude API:")
    if settings.anthropic_api_key:
        print(f"  ✓ API Key: {settings.anthropic_api_key[:8]}...")
        print(f"  ✓ Model: {settings.claude_model.value}")
        print(f"  ✓ Max Tokens: {settings.claude_max_tokens}")
    else:
        print("  ✗ Not configured (ANTHROPIC_API_KEY not set)")

    print()

    # Check OpenAI configuration
    print("OpenAI API:")
    if settings.openai_api_key:
        print(f"  ✓ API Key: {settings.openai_api_key[:8]}...")
        print(f"  ✓ Model: {settings.openai_model}")
    else:
        print("  ✗ Not configured (OPENAI_API_KEY not set)")

    print()

    # Check Local LLM configuration
    print("Local LLM:")
    router_exists = Path(settings.local_router_model_path).exists()
    agent_exists = Path(settings.local_agent_model_path).exists()

    if router_exists:
        print(f"  ✓ Router Model: {settings.local_router_model_path}")
    else:
        print(f"  ✗ Router Model: {settings.local_router_model_path} (not found)")

    if agent_exists:
        print(f"  ✓ Agent Model: {settings.local_agent_model_path}")
    else:
        print(f"  ✗ Agent Model: {settings.local_agent_model_path} (not found)")

    print(f"\n{'='*60}\n")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Test Alfy LLM provider integration")
    parser.add_argument(
        "--provider",
        choices=["local", "claude", "openai", "all"],
        default="all",
        help="Which provider to test (default: all available)"
    )
    parser.add_argument(
        "--check-config",
        action="store_true",
        help="Only check configuration without testing"
    )

    args = parser.parse_args()

    # Always show configuration
    check_configuration()

    if args.check_config:
        return

    # Run tests
    if args.provider == "all":
        await test_provider_switching()
    else:
        await test_provider(args.provider)


if __name__ == "__main__":
    asyncio.run(main())
