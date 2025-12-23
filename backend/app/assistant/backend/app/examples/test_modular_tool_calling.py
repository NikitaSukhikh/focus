"""
Test modular tool calling with different LLM providers.

This demonstrates that tool calling now works through the provider abstraction,
making it compatible with any LLM provider (Claude, OpenAI, or Local).
"""

import asyncio
from app.core.llm_provider import LLMProviderFactory
from app.config import settings, LLMProvider
from app.tools.tool_definitions import get_all_tools


async def test_provider_tool_calling():
    """Test that the current provider supports tool calling."""
    print("\n" + "="*60)
    print("Testing Modular Tool Calling")
    print("="*60 + "\n")

    # Get the current provider
    provider = await LLMProviderFactory.get_provider()
    provider_name = provider.__class__.__name__

    print(f"Current LLM Provider: {provider_name}")
    print(f"Provider Type: {settings.llm_provider.value}\n")

    # Get available tools
    tools = get_all_tools()
    print(f"Available tools: {len(tools)}")
    for tool in tools:
        print(f"  - {tool['name']}")
    print()

    # Test message
    messages = [
        {
            "role": "user",
            "content": "Find all Python files in d:\\alfy\\backend\\app\\tools directory"
        }
    ]

    system_prompt = "You are Alfy, a helpful AI assistant with access to file system tools."

    print("Sending test request with tool calling support...")
    print(f"User message: {messages[0]['content']}\n")

    try:
        # Call generate_with_tools through provider abstraction
        response = await provider.generate_with_tools(
            messages=messages,
            tools=tools,
            system_prompt=system_prompt,
            max_tokens=1024,
            temperature=0.3
        )

        print("="*60)
        print("Response Details:")
        print("="*60)
        print(f"Stop reason: {response['stop_reason']}")
        print(f"Content blocks: {len(response['content'])}")
        print(f"Tool calls: {len(response['tool_calls'])}")
        print()

        # Display content
        for i, block in enumerate(response['content']):
            print(f"Content block {i+1}:")
            print(f"  Type: {block['type']}")
            if block['type'] == 'text':
                print(f"  Text: {block['text'][:200]}...")
            print()

        # Display tool calls
        if response['tool_calls']:
            print("Tool calls requested:")
            for i, call in enumerate(response['tool_calls']):
                print(f"  {i+1}. {call['name']}")
                print(f"     ID: {call['id']}")
                print(f"     Input: {call['input']}")
                print()
        else:
            print("No tool calls were made.")
            if settings.llm_provider.value == "local":
                print("(Note: Local LLM does not support native tool calling)")

        print("="*60)
        print("Test completed successfully!")
        print("="*60)

    except Exception as e:
        print(f"Error during tool calling test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        await LLMProviderFactory.cleanup()


async def test_all_providers():
    """Test tool calling with all available providers."""
    print("\n" + "="*60)
    print("Testing Tool Calling Across All Providers")
    print("="*60 + "\n")

    providers_to_test = []

    # Claude
    if settings.anthropic_api_key:
        providers_to_test.append(("Claude", LLMProvider.CLAUDE))

    # OpenAI
    if settings.openai_api_key:
        providers_to_test.append(("OpenAI", LLMProvider.OPENAI))

    # Local (always available)
    providers_to_test.append(("Local", LLMProvider.LOCAL))

    for provider_name, provider_type in providers_to_test:
        print(f"\nTesting {provider_name} provider...")
        print("-" * 60)

        try:
            # Get provider instance
            provider = await LLMProviderFactory.get_provider(provider_type)

            # Simple test
            messages = [{"role": "user", "content": "Hello, can you help me with files?"}]
            tools = get_all_tools()

            response = await provider.generate_with_tools(
                messages=messages,
                tools=tools,
                system_prompt="You are a helpful assistant.",
                max_tokens=512
            )

            print(f"  Success! Stop reason: {response['stop_reason']}")
            print(f"  Tool calls: {len(response['tool_calls'])}")

            # Cleanup
            await LLMProviderFactory.cleanup()

        except Exception as e:
            print(f"  Error: {e}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        # Test all providers
        asyncio.run(test_all_providers())
    else:
        # Test current provider only
        asyncio.run(test_provider_tool_calling())
