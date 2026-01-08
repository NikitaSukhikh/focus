"""
Test Claude's ability to access and manipulate files using tool calling.

This demonstrates the full integration of file tools with Claude API.
"""

import asyncio
import requests
import json


async def test_claude_file_search():
    """Test Claude searching for files."""
    print("\n" + "="*60)
    print("Test: Ask Claude to find Python files")
    print("="*60 + "\n")

    # Send request to chat-with-tools endpoint
    response = requests.post(
        "http://127.0.0.1:8001/chat-with-tools",
        json={
            "message": "Find all Python files in d:\\alfy\\backend\\app\\tools directory"
        }
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Success!")
        print(f"\nClaude's response:\n{result['reply']}\n")
        print(f"Conversation ID: {result['conversation_id']}")
    else:
        print(f"✗ Error: {response.status_code}")
        print(f"Details: {response.text}")


async def test_claude_read_file():
    """Test Claude reading a file."""
    print("\n" + "="*60)
    print("Test: Ask Claude to read a configuration file")
    print("="*60 + "\n")

    response = requests.post(
        "http://127.0.0.1:8001/chat-with-tools",
        json={
            "message": "Read the first 20 lines of d:\\alfy\\backend\\app\\config.py and tell me what it contains"
        }
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Success!")
        print(f"\nClaude's response:\n{result['reply']}\n")
    else:
        print(f"✗ Error: {response.status_code}")
        print(f"Details: {response.text}")


async def test_claude_create_file():
    """Test Claude creating a file."""
    print("\n" + "="*60)
    print("Test: Ask Claude to create a test file")
    print("="*60 + "\n")

    response = requests.post(
        "http://127.0.0.1:8001/chat-with-tools",
        json={
            "message": "Create a file at d:\\alfy\\backend\\test_claude.txt with a greeting message"
        }
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Success!")
        print(f"\nClaude's response:\n{result['reply']}\n")
    else:
        print(f"✗ Error: {response.status_code}")
        print(f"Details: {response.text}")


async def test_claude_get_file_info():
    """Test Claude getting file information."""
    print("\n" + "="*60)
    print("Test: Ask Claude for file information")
    print("="*60 + "\n")

    response = requests.post(
        "http://127.0.0.1:8001/chat-with-tools",
        json={
            "message": "Tell me information about the file d:\\alfy\\backend\\app\\main.py - size, when it was modified, etc."
        }
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Success!")
        print(f"\nClaude's response:\n{result['reply']}\n")
    else:
        print(f"✗ Error: {response.status_code}")
        print(f"Details: {response.text}")


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("Claude File Access Test Suite")
    print("="*60)
    print("\nMake sure the Alfy server is running:")
    print("  python -m uvicorn app.main:app --host 127.0.0.1 --port 8001")
    print("\n" + "="*60)

    # Check if server is running
    try:
        response = requests.get("http://127.0.0.1:8001/health", timeout=2)
        if response.status_code != 200:
            print("\n✗ Server is not responding correctly!")
            return
    except requests.exceptions.RequestException:
        print("\n✗ Cannot connect to server! Make sure it's running.")
        return

    print("\n✓ Server is running\n")

    # Run tests
    tests = [
        ("File Search", test_claude_file_search),
        ("Read File", test_claude_read_file),
        ("Get File Info", test_claude_get_file_info),
        ("Create File", test_claude_create_file),
    ]

    for test_name, test_func in tests:
        try:
            await test_func()
        except Exception as e:
            print(f"\n✗ Test '{test_name}' failed: {e}\n")

    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
