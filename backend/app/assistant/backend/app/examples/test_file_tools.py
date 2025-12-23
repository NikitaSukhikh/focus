"""
Test script for file search and file operations tools.

Demonstrates how to use the file search and file operations tools
that Alfy can use to interact with the file system.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.tools.files import file_search_tool, file_operations_tool


async def test_file_search():
    """Test file search functionality."""
    print("\n" + "="*60)
    print("Testing File Search Tool")
    print("="*60 + "\n")

    # Test 1: Search for Python files in current directory
    print("Test 1: Search for Python files (.py) in backend directory")
    print("-" * 60)

    result = await file_search_tool.search_by_extension(
        extension="py",
        search_paths=["D:\\alfy\\backend\\app"],
        max_results=10
    )

    print(f"Success: {result['success']}")
    print(f"Found: {result['total_found']} files")
    print("\nFirst 5 results:")
    for item in result['results'][:5]:
        print(f"  - {item['name']} ({item['size_human']}) - {item['path']}")

    # Test 2: Search by partial name
    print("\n\nTest 2: Search for files containing 'config'")
    print("-" * 60)

    result = await file_search_tool.search_by_name(
        query="config",
        search_paths=["D:\\alfy\\backend"],
        case_sensitive=False,
        max_results=5
    )

    print(f"Success: {result['success']}")
    print(f"Found: {result['total_found']} files/directories")
    print("\nResults:")
    for item in result['results']:
        print(f"  - {item['name']} ({item['type']}) - {item['path']}")

    # Test 3: Search for recent files
    print("\n\nTest 3: Find files modified in last 24 hours")
    print("-" * 60)

    result = await file_search_tool.search_recent_files(
        search_paths=["D:\\alfy\\backend\\app"],
        hours=24,
        max_results=5
    )

    print(f"Success: {result['success']}")
    print(f"Found: {result['total_found']} recent files")
    print("\nResults:")
    for item in result['results']:
        print(f"  - {item['name']} - Modified: {item['modified']}")


async def test_file_operations():
    """Test file operations functionality."""
    print("\n" + "="*60)
    print("Testing File Operations Tool")
    print("="*60 + "\n")

    test_dir = Path("D:\\alfy\\backend\\test_files")
    test_dir.mkdir(exist_ok=True)
    test_file = test_dir / "test_document.txt"

    # Test 1: Write a file
    print("Test 1: Write content to a new file")
    print("-" * 60)

    result = await file_operations_tool.write_file(
        file_path=str(test_file),
        content="Hello, Alfy!\nThis is a test document.\nLine 3 here.",
        backup=False
    )

    print(f"Success: {result['success']}")
    print(f"Message: {result.get('message', 'N/A')}")
    print(f"Path: {result.get('path', 'N/A')}")

    # Test 2: Read the file
    print("\n\nTest 2: Read the file we just created")
    print("-" * 60)

    result = await file_operations_tool.read_file(
        file_path=str(test_file)
    )

    print(f"Success: {result['success']}")
    print(f"Size: {result.get('size', 'N/A')} bytes")
    print(f"Content:\n{result.get('content', 'N/A')}")

    # Test 3: Append to file
    print("\n\nTest 3: Append additional content")
    print("-" * 60)

    result = await file_operations_tool.append_to_file(
        file_path=str(test_file),
        content="\nAppended line 4.\nAppended line 5."
    )

    print(f"Success: {result['success']}")
    print(f"Appended: {result.get('appended_size', 'N/A')} characters")

    # Test 4: Read updated file
    print("\n\nTest 4: Read updated file")
    print("-" * 60)

    result = await file_operations_tool.read_file(
        file_path=str(test_file)
    )

    print(f"Content:\n{result.get('content', 'N/A')}")

    # Test 5: Get file info
    print("\n\nTest 5: Get detailed file information")
    print("-" * 60)

    result = await file_operations_tool.get_file_info(
        file_path=str(test_file)
    )

    if result['success']:
        print(f"Name: {result['name']}")
        print(f"Size: {result['size_human']}")
        print(f"Created: {result['created']}")
        print(f"Modified: {result['modified']}")
        print(f"Extension: {result['extension']}")

    # Test 6: Copy file
    print("\n\nTest 6: Copy file to backup location")
    print("-" * 60)

    backup_file = test_dir / "test_document_backup.txt"
    result = await file_operations_tool.copy_file(
        source=str(test_file),
        destination=str(backup_file),
        overwrite=True
    )

    print(f"Success: {result['success']}")
    print(f"Message: {result.get('message', 'N/A')}")

    # Test 7: Read partial file (first 2 lines)
    print("\n\nTest 7: Read only first 2 lines")
    print("-" * 60)

    result = await file_operations_tool.read_file(
        file_path=str(test_file),
        max_lines=2
    )

    print(f"Content:\n{result.get('content', 'N/A')}")
    print(f"Truncated: {result.get('truncated', False)}")

    # Cleanup
    print("\n\nCleaning up test files...")
    if test_file.exists():
        test_file.unlink()
    if backup_file.exists():
        backup_file.unlink()
    if test_dir.exists() and not list(test_dir.iterdir()):
        test_dir.rmdir()
    print("Cleanup complete!")


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("File Tools Test Suite")
    print("="*60)

    # Run tests
    await test_file_search()
    await test_file_operations()

    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
