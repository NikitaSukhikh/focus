"""
Simple examples showing how to use the LLM provider abstraction.

These examples demonstrate the most common use cases for switching
between local and cloud LLM providers.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


async def example_1_use_default_provider():
    """Example 1: Use the default provider from config."""
    print("\n" + "="*60)
    print("Example 1: Using Default Provider")
    print("="*60 + "\n")

    from app.core.llm_provider import LLMProviderFactory

    # Get the default provider (from ALFY_LLM_PROVIDER env var)
    provider = await LLMProviderFactory.get_provider()

    # Generate a response
    response = await provider.generate(
        prompt="What is the capital of France?",
        system_prompt="You are a helpful geography tutor. Be concise.",
        max_tokens=50
    )

    print(f"Response: {response}")

    # Cleanup
    await provider.cleanup()


async def example_2_use_specific_provider():
    """Example 2: Use a specific provider regardless of config."""
    print("\n" + "="*60)
    print("Example 2: Using Specific Provider (Claude)")
    print("="*60 + "\n")

    from app.core.llm_provider import LLMProviderFactory
    from app.config import LLMProvider

    try:
        # Force use of Claude even if config says local
        provider = await LLMProviderFactory.get_provider(LLMProvider.CLAUDE)

        response = await provider.generate(
            prompt="Explain quantum entanglement in one sentence.",
            max_tokens=100
        )

        print(f"Response: {response}")

        await provider.cleanup()

    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure ANTHROPIC_API_KEY is set in your .env file")


async def example_3_streaming_response():
    """Example 3: Stream response token by token."""
    print("\n" + "="*60)
    print("Example 3: Streaming Response")
    print("="*60 + "\n")

    from app.core.llm_provider import LLMProviderFactory

    provider = await LLMProviderFactory.get_provider()

    print("Streaming response: ", end="", flush=True)

    async for chunk in provider.generate_stream(
        prompt="Count from 1 to 5 with a word after each number.",
        max_tokens=50
    ):
        print(chunk, end="", flush=True)

    print("\n")

    await provider.cleanup()


async def example_4_switch_providers():
    """Example 4: Switch between providers in the same session."""
    print("\n" + "="*60)
    print("Example 4: Switching Between Providers")
    print("="*60 + "\n")

    from app.core.llm_provider import LLMProviderFactory
    from app.config import LLMProvider, settings

    # Check which providers are available
    available = []

    if settings.anthropic_api_key:
        available.append(LLMProvider.CLAUDE)

    if settings.openai_api_key:
        available.append(LLMProvider.OPENAI)

    if Path(settings.local_agent_model_path).exists():
        available.append(LLMProvider.LOCAL)

    print(f"Available providers: {[p.value for p in available]}\n")

    if len(available) < 2:
        print("Need at least 2 providers configured to test switching")
        return

    # Test each provider
    for provider_type in available[:2]:  # Test first 2
        print(f"Using {provider_type.value}...")

        provider = await LLMProviderFactory.get_provider(provider_type)

        response = await provider.generate(
            prompt="Say hello!",
            max_tokens=20
        )

        print(f"  Response: {response}\n")

    await LLMProviderFactory.cleanup()


async def example_5_conversation_context():
    """Example 5: Multi-turn conversation with context."""
    print("\n" + "="*60)
    print("Example 5: Multi-Turn Conversation")
    print("="*60 + "\n")

    from app.core.llm_provider import LLMProviderFactory

    provider = await LLMProviderFactory.get_provider()

    # First turn
    context = ""
    system_prompt = "You are a helpful math tutor. Be concise."

    prompt1 = "What is 15 multiplied by 7?"
    response1 = await provider.generate(
        prompt=prompt1,
        system_prompt=system_prompt,
        max_tokens=50
    )

    print(f"User: {prompt1}")
    print(f"Assistant: {response1}\n")

    # Build context for next turn
    context = f"User: {prompt1}\nAssistant: {response1}\n\n"

    # Second turn
    prompt2 = "Now add 20 to that number."
    full_prompt = context + f"User: {prompt2}"

    response2 = await provider.generate(
        prompt=full_prompt,
        system_prompt=system_prompt,
        max_tokens=50
    )

    print(f"User: {prompt2}")
    print(f"Assistant: {response2}\n")

    await provider.cleanup()


async def example_6_error_handling():
    """Example 6: Proper error handling."""
    print("\n" + "="*60)
    print("Example 6: Error Handling")
    print("="*60 + "\n")

    from app.core.llm_provider import LLMProviderFactory
    from app.config import LLMProvider

    try:
        # Try to use Claude without API key
        import os
        original_key = os.environ.get("ANTHROPIC_API_KEY")

        # Temporarily remove key
        if "ANTHROPIC_API_KEY" in os.environ:
            del os.environ["ANTHROPIC_API_KEY"]

        provider = await LLMProviderFactory.get_provider(LLMProvider.CLAUDE)

        response = await provider.generate(
            prompt="This should fail",
            max_tokens=10
        )

        print(f"Response: {response}")

    except ValueError as e:
        print(f"✓ Caught expected error: {e}")

    except Exception as e:
        print(f"✓ Caught error: {type(e).__name__}: {e}")

    finally:
        # Restore key
        if original_key:
            os.environ["ANTHROPIC_API_KEY"] = original_key

        await LLMProviderFactory.cleanup()


async def main():
    """Run all examples."""
    print("\n" + "="*60)
    print("LLM Provider Usage Examples")
    print("="*60)

    examples = [
        ("Use Default Provider", example_1_use_default_provider),
        ("Use Specific Provider", example_2_use_specific_provider),
        ("Streaming Response", example_3_streaming_response),
        ("Switch Providers", example_4_switch_providers),
        ("Conversation Context", example_5_conversation_context),
        ("Error Handling", example_6_error_handling),
    ]

    for name, example_func in examples:
        try:
            await example_func()
        except Exception as e:
            print(f"\n✗ Example '{name}' failed: {e}\n")

    print("\n" + "="*60)
    print("All examples completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
