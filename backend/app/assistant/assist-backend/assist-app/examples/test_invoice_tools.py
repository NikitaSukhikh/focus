"""
Test invoice generation tools with any LLM provider.

This script demonstrates using the modular LLM provider system to generate
professional invoices via invoice-generator.com API.
"""

import asyncio
from pathlib import Path
from app.core.llm_provider import LLMProviderFactory
from app.config import settings, LLMProvider
from app.tools.tool_definitions import get_all_tools, get_invoice_tools
from app.tools.tool_executor import tool_executor


async def test_invoice_generation():
    """Test invoice generation tools with the configured LLM provider."""
    print("\n" + "="*70)
    print("Testing Invoice Generation Tools")
    print("="*70 + "\n")

    # Check if API key is configured
    if not settings.invoice_gen_api_key:
        print("ERROR: INVOICE_GEN_API_KEY not configured!")
        print("Please set your invoice-generator.com API key in .env")
        return

    # Get the configured provider
    provider = await LLMProviderFactory.get_provider()
    provider_name = provider.__class__.__name__
    print(f"Using LLM Provider: {provider_name}")
    print(f"Provider Type: {settings.llm_provider.value}\n")

    # Get all tools including invoice tools
    all_tools = get_all_tools()
    invoice_tools = get_invoice_tools()

    print(f"Total tools available: {len(all_tools)}")
    print(f"Invoice tools: {len(invoice_tools)}")
    for tool in invoice_tools:
        print(f"  - {tool['name']}")
    print()

    # Create test directory
    test_dir = Path("generated_invoices")
    test_dir.mkdir(exist_ok=True)
    print(f"Invoice directory: {test_dir.absolute()}\n")

    # Test scenarios
    scenarios = [
        {
            "name": "Simple Service Invoice",
            "query": """Create an invoice for web development services:
- From: TechCorp Solutions, 123 Tech Street, San Francisco, CA 94105, contact@techcorp.com
- To: Acme Inc., 456 Business Ave, New York, NY 10001
- Invoice #: INV-2025-001
- Date: 2025-01-15
- Due Date: 2025-02-15
- Items:
  * Website Design: 40 hours at $150/hour
  * Backend Development: 60 hours at $120/hour
  * Testing & QA: 20 hours at $100/hour
- Tax: 10%
- Payment Terms: Net 30
- Notes: Thank you for your business!
Save to: generated_invoices/INV-2025-001.pdf""",
        },
        {
            "name": "Product Sales Invoice",
            "query": """Generate an invoice for product sales:
- From: Digital Goods Store, sales@digitalgoods.com
- To: John Smith, john@example.com
- Items:
  * Premium Software License: 5 units at $99 each
  * Support Package: 1 unit at $299
  * Training Session: 2 units at $150 each
- Discount: 10%
- Shipping: $25
- Currency: USD
Save to: generated_invoices/product-invoice.pdf""",
        },
    ]

    system_prompt = """You are a helpful AI assistant with access to invoice generation tools.
You can create professional invoices using the generate_invoice tool.

When asked to create an invoice:
1. Extract all the relevant information from the user's request
2. Use the generate_invoice tool with appropriate parameters
3. Provide clear feedback about the generated invoice

Always use the tools available to you."""

    # Run each test scenario
    for i, scenario in enumerate(scenarios, 1):
        print("\n" + "-"*70)
        print(f"Test {i}: {scenario['name']}")
        print("-"*70)
        print(f"Request: {scenario['query'][:100]}...\n")

        messages = [
            {"role": "user", "content": scenario["query"]}
        ]

        try:
            # Call LLM with tools
            response = await provider.generate_with_tools(
                messages=messages,
                tools=all_tools,
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
                    print(f"    Generating invoice...")

                    # Execute the tool
                    result = await tool_executor.execute_tool(
                        tool_name=tool_call['name'],
                        tool_input=tool_call['input']
                    )

                    success = result.get('success', False)
                    print(f"    Status: {'Success' if success else 'Failed'}")

                    if success:
                        if 'path' in result:
                            print(f"    File: {result['path']}")
                        if 'size_human' in result:
                            print(f"    Size: {result['size_human']}")
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

    # List created invoices
    print("\nGenerated invoices:")
    if test_dir.exists():
        for file in test_dir.glob("*.pdf"):
            size_kb = file.stat().st_size / 1024
            print(f"  - {file.name} ({size_kb:.1f} KB)")
    else:
        print("  (no invoices created)")

    # Cleanup
    await LLMProviderFactory.cleanup()


async def test_simple_invoice():
    """Simple test: Ask LLM to create a basic invoice."""
    print("\n" + "="*70)
    print("Simple Test: Create Basic Invoice")
    print("="*70 + "\n")

    if not settings.invoice_gen_api_key:
        print("ERROR: INVOICE_GEN_API_KEY not configured!")
        return

    provider = await LLMProviderFactory.get_provider()
    print(f"Provider: {provider.__class__.__name__}\n")

    all_tools = get_all_tools()

    messages = [
        {
            "role": "user",
            "content": """Create a simple invoice:
From: My Company
To: Client Name
Items: Consulting Service - 10 hours @ $100/hour
Save to: generated_invoices/simple-invoice.pdf"""
        }
    ]

    system_prompt = "You are a helpful assistant with invoice generation tools. Use them when appropriate."

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

                result = await tool_executor.execute_tool(call['name'], call['input'])

                if result.get('success'):
                    print(f"Success: {result.get('path')}")
                    print(f"  Size: {result.get('size_human', 'Unknown')}")
                else:
                    print(f"Error: {result.get('error')}")
        else:
            print("\nNo tools were called. The LLM might not support tool calling.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await LLMProviderFactory.cleanup()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--simple":
        # Run simple test
        asyncio.run(test_simple_invoice())
    else:
        # Run full test suite
        asyncio.run(test_invoice_generation())
