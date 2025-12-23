"""
Test document manipulation tools with any LLM provider.

This script demonstrates using the modular LLM provider system to create, edit,
and read PDF, DOCX, and Excel files. Works with Claude, OpenAI, or local LLMs.
"""

import asyncio
from pathlib import Path
from app.core.llm_provider import LLMProviderFactory
from app.config import settings, LLMProvider
from app.tools.tool_definitions import get_all_tools, get_document_tools
from app.tools.tool_executor import tool_executor


async def test_document_tools():
    """Test document manipulation tools with the configured LLM provider."""
    print("\n" + "="*70)
    print("Testing Document Manipulation Tools")
    print("="*70 + "\n")

    # Get the configured provider (works with any: Claude, OpenAI, local)
    provider = await LLMProviderFactory.get_provider()
    provider_name = provider.__class__.__name__
    print(f"Using LLM Provider: {provider_name}")
    print(f"Provider Type: {settings.llm_provider.value}\n")

    # Get all tools including document tools
    all_tools = get_all_tools()
    doc_tools = get_document_tools()

    print(f"Total tools available: {len(all_tools)}")
    print(f"Document tools: {len(doc_tools)}")
    for tool in doc_tools:
        print(f"  - {tool['name']}")
    print()

    # Create test directory
    test_dir = Path("test_documents")
    test_dir.mkdir(exist_ok=True)
    print(f"Test directory: {test_dir.absolute()}\n")

    # Test scenarios
    scenarios = [
        {
            "name": "Create PDF Report",
            "query": "Create a PDF file at test_documents/report.pdf with title 'Monthly Sales Report' and this content:\n\nExecutive Summary:\nQ4 sales exceeded expectations with a 15% growth.\n\nKey Metrics:\n- Total Revenue: $1.2M\n- New Customers: 450\n- Customer Retention: 92%",
        },
        {
            "name": "Create Excel Spreadsheet",
            "query": "Create an Excel file at test_documents/sales.xlsx with monthly sales data. Use these headers: Month, Revenue, Expenses. Add data for Jan (10000, 7000), Feb (12000, 7500), and Mar (15000, 8000).",
        },
        {
            "name": "Create Word Document",
            "query": "Create a Word document at test_documents/notes.docx with title 'Meeting Notes' containing:\n\nDate: December 11, 2025\n\nAttendees: John, Jane, Bob\n\nTopics Discussed:\n1. Project timeline\n2. Budget allocation\n3. Team resources",
        },
    ]

    system_prompt = """You are a helpful AI assistant with access to document manipulation tools.
You can create, read, and edit PDF, Word (DOCX), and Excel (XLSX) files.

When asked to create or manipulate documents:
- Use the appropriate tool for the file type
- Follow the user's instructions carefully
- Provide clear feedback about what you did

Always use the tools available to you."""

    # Run each test scenario
    for i, scenario in enumerate(scenarios, 1):
        print("\n" + "-"*70)
        print(f"Test {i}: {scenario['name']}")
        print("-"*70)
        print(f"Query: {scenario['query'][:100]}...\n")

        messages = [
            {"role": "user", "content": scenario["query"]}
        ]

        try:
            # Call LLM with tools (works with any provider)
            response = await provider.generate_with_tools(
                messages=messages,
                tools=all_tools,  # Provide all tools so LLM can choose
                system_prompt=system_prompt,
                max_tokens=2048,
                temperature=0.3
            )

            print(f"Stop reason: {response['stop_reason']}")
            print(f"Tool calls requested: {len(response['tool_calls'])}\n")

            # Display LLM's initial response
            for block in response['content']:
                if block['type'] == 'text' and block.get('text'):
                    print(f"LLM Response:\n{block['text']}\n")

            # Execute tool calls
            if response['tool_calls']:
                print("Executing tools:")
                for tool_call in response['tool_calls']:
                    print(f"\n  → {tool_call['name']}")
                    print(f"    Parameters: {tool_call['input']}")

                    # Execute the tool
                    result = await tool_executor.execute_tool(
                        tool_name=tool_call['name'],
                        tool_input=tool_call['input']
                    )

                    success = result.get('success', False)
                    print(f"    Status: {'✓ Success' if success else '✗ Failed'}")

                    if success:
                        if 'path' in result:
                            print(f"    File: {result['path']}")
                        if 'message' in result:
                            print(f"    {result['message']}")
                    else:
                        print(f"    Error: {result.get('error', 'Unknown error')}")

                # Continue conversation with tool results (for supported providers)
                if response['tool_calls'] and settings.llm_provider != LLMProvider.LOCAL:
                    print("\nGetting final response from LLM...")

                    # Add assistant's message with tool calls
                    messages.append({
                        "role": "assistant",
                        "content": response['content']
                    })

                    # Add tool results
                    for tool_call in response['tool_calls']:
                        result = await tool_executor.execute_tool(
                            tool_name=tool_call['name'],
                            tool_input=tool_call['input']
                        )

                        messages.append({
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tool_call['id'],
                                    "content": str(result)
                                }
                            ]
                        })

                    # Get final response
                    final_response = await provider.generate_with_tools(
                        messages=messages,
                        tools=all_tools,
                        system_prompt=system_prompt,
                        max_tokens=1024,
                        temperature=0.3
                    )

                    for block in final_response['content']:
                        if block['type'] == 'text' and block.get('text'):
                            print(f"\nFinal Response:\n{block['text']}")

        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "="*70)
    print("Testing Complete!")
    print("="*70)

    # List created files
    print("\nCreated files:")
    if test_dir.exists():
        for file in test_dir.glob("*"):
            size_kb = file.stat().st_size / 1024
            print(f"  - {file.name} ({size_kb:.1f} KB)")
    else:
        print("  (no files created)")

    # Cleanup
    await LLMProviderFactory.cleanup()


async def test_simple_pdf_creation():
    """Simple test: Ask LLM to create a PDF."""
    print("\n" + "="*70)
    print("Simple Test: Create PDF")
    print("="*70 + "\n")

    provider = await LLMProviderFactory.get_provider()
    print(f"Provider: {provider.__class__.__name__}\n")

    all_tools = get_all_tools()

    messages = [
        {
            "role": "user",
            "content": "Create a simple PDF at test_documents/hello.pdf that says 'Hello, World! This is a test PDF.'"
        }
    ]

    system_prompt = "You are a helpful assistant with document creation tools. Use them when appropriate."

    try:
        # Call LLM with tools
        response = await provider.generate_with_tools(
            messages=messages,
            tools=all_tools,
            system_prompt=system_prompt,
            max_tokens=1024
        )

        print("LLM Response:")
        for block in response['content']:
            if block['type'] == 'text':
                print(f"  {block.get('text', '')}")

        print(f"\nTool calls: {len(response['tool_calls'])}")

        # Execute tools
        if response['tool_calls']:
            for call in response['tool_calls']:
                print(f"\nExecuting: {call['name']}")
                print(f"Input: {call['input']}")

                result = await tool_executor.execute_tool(call['name'], call['input'])

                if result.get('success'):
                    print(f"✓ Success: {result.get('path')}")
                else:
                    print(f"✗ Error: {result.get('error')}")
        else:
            print("\nNo tools were called. The LLM might not support tool calling.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await LLMProviderFactory.cleanup()


async def test_all_providers():
    """Test document tools with all configured LLM providers."""
    print("\n" + "="*70)
    print("Testing Document Tools Across All Providers")
    print("="*70 + "\n")

    providers_to_test = []

    # Check which providers are configured
    if settings.anthropic_api_key:
        providers_to_test.append(("Claude", LLMProvider.CLAUDE))

    if settings.openai_api_key:
        providers_to_test.append(("OpenAI", LLMProvider.OPENAI))

    # Local is always available
    providers_to_test.append(("Local LLM", LLMProvider.LOCAL))

    for provider_name, provider_type in providers_to_test:
        print(f"\n{'='*70}")
        print(f"Testing with {provider_name}")
        print('='*70)

        try:
            provider = await LLMProviderFactory.get_provider(provider_type)
            all_tools = get_all_tools()

            messages = [{
                "role": "user",
                "content": "Create a PDF at test_documents/test.pdf with the text 'Test document'"
            }]

            response = await provider.generate_with_tools(
                messages=messages,
                tools=all_tools,
                system_prompt="You are a helpful assistant with document tools.",
                max_tokens=512
            )

            print(f"✓ {provider_name} responded successfully")
            print(f"  Tool calls: {len(response['tool_calls'])}")

            if response['tool_calls']:
                for call in response['tool_calls']:
                    result = await tool_executor.execute_tool(call['name'], call['input'])
                    status = "✓" if result.get('success') else "✗"
                    print(f"  {status} {call['name']}: {result.get('message', result.get('error', ''))}")

            await LLMProviderFactory.cleanup()

        except Exception as e:
            print(f"✗ {provider_name} failed: {e}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--simple":
            # Run simple test
            asyncio.run(test_simple_pdf_creation())
        elif sys.argv[1] == "--all":
            # Test all providers
            asyncio.run(test_all_providers())
    else:
        # Run full test suite with configured provider
        asyncio.run(test_document_tools())
