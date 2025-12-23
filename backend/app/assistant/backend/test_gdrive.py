"""
Test script for Google Drive functionality.

This script tests the Google Drive link parser and client.
"""

import asyncio
from app.tools.gdrive.link_parser import GDriveLinkParser
from app.tools.gdrive.gdrive_client import GDriveClient


async def test_link_parser():
    """Test the link parser with various URL formats."""
    print("=" * 60)
    print("Testing Google Drive Link Parser")
    print("=" * 60)

    test_urls = [
        "https://drive.google.com/file/d/1abc123def456/view",
        "https://drive.google.com/open?id=1xyz789abc123",
        "https://docs.google.com/document/d/1doc123abc456/edit",
        "https://docs.google.com/spreadsheets/d/1sheet123xyz789/edit",
        "https://docs.google.com/presentation/d/1pres123abc456/edit",
    ]

    parser = GDriveLinkParser()

    for url in test_urls:
        print(f"\nTesting URL: {url}")
        print(f"  Is GDrive link: {parser.is_gdrive_link(url)}")

        link_info = parser.parse_link(url)
        print(f"  File ID: {link_info['file_id']}")
        print(f"  File Type: {link_info['file_type']}")
        print(f"  Is Valid: {link_info['is_valid']}")

        if link_info['file_type'] in ['document', 'spreadsheet', 'presentation']:
            export_url = parser.get_export_url(
                link_info['file_id'],
                link_info['file_type'],
                'pdf'
            )
            print(f"  Export URL: {export_url}")


async def test_gdrive_client():
    """Test the Google Drive client (requires a public file)."""
    print("\n" + "=" * 60)
    print("Testing Google Drive Client")
    print("=" * 60)

    # Note: This test requires a publicly accessible Google Drive file
    # You can create a test file and share it with "Anyone with the link"

    print("\nTo test the client, you need a publicly accessible Google Drive file.")
    print("Please provide a Google Drive URL to test, or press Enter to skip:")

    # For automated testing, we'll just show the structure
    client = GDriveClient()
    print(f"\nClient initialized successfully")
    print(f"  Timeout: {client.timeout}s")
    print(f"  Parser: {type(client.parser).__name__}")


async def main():
    """Run all tests."""
    await test_link_parser()
    await test_gdrive_client()

    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
