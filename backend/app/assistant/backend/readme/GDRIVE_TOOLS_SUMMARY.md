# Google Drive Tools Summary

## Overview

The Google Drive tools enable Claude to interact with files stored in Google Drive directly from the conversation panel. Users can share Google Drive links, and Claude can read the content, download files, and work with them seamlessly.

## Implementation Complete

✅ **Created:** `backend/app/tools/gdrive/` folder with complete functionality

## Module Components

### 1. Link Parser (`link_parser.py`)
- Detects Google Drive URLs in conversation
- Extracts file IDs from various URL formats
- Identifies file types (documents, spreadsheets, presentations, etc.)
- Generates export URLs for different formats

**Supported URL patterns:**
- `drive.google.com/file/d/FILE_ID`
- `drive.google.com/open?id=FILE_ID`
- `docs.google.com/document/d/FILE_ID`
- `docs.google.com/spreadsheets/d/FILE_ID`
- `docs.google.com/presentation/d/FILE_ID`
- `docs.google.com/forms/d/FILE_ID`

### 2. Google Drive Client (`gdrive_client.py`)
- Makes HTTP requests to Google Drive
- Fetches file content with proper export formats
- Downloads files to local storage
- Handles both text and binary content
- Includes error handling and timeout management

**Key features:**
- 60-second timeout for large files
- Automatic redirect following
- Content type detection
- Binary vs text file handling

### 3. Tool Definitions (`gdrive_tools.py`)
Three tools available to Claude:

#### `read_gdrive_file`
Read and display content from Google Drive files
- **Input:** URL, optional export format
- **Output:** File content, metadata (ID, type, size)

#### `download_gdrive_file`
Download files to local storage
- **Input:** URL, destination path, optional export format
- **Output:** File path, metadata
- **Storage:** `backend/data/gdrive_downloads/`

#### `get_gdrive_metadata`
Get information about a file without downloading
- **Input:** URL
- **Output:** File ID, type, original URL

### 4. Integration
- Added to `tool_definitions.py` - included in `ALL_TOOLS`
- Added to `tool_executor.py` - mapped to execution functions
- Follows same pattern as document and invoice tools

## Export Formats

### Google Docs
- `txt` (default for reading)
- `docx` (Word document)
- `pdf`

### Google Sheets
- `csv` (default for reading)
- `xlsx` (Excel)
- `pdf`

### Google Slides
- `pdf` (default)
- `pptx` (PowerPoint)

### Regular Files
- Direct download (preserves original format)

## Usage Examples

### User shares a Google Doc
**User:** "Here's the document: https://docs.google.com/document/d/abc123/edit"

**Claude:** Automatically uses `read_gdrive_file` to fetch and display the content

### User requests download
**User:** "Download this spreadsheet as Excel: https://docs.google.com/spreadsheets/d/xyz789"

**Claude:** Uses `download_gdrive_file` with:
```json
{
  "url": "https://docs.google.com/spreadsheets/d/xyz789",
  "destination_path": "spreadsheet.xlsx",
  "export_format": "xlsx"
}
```

### User asks about a file
**User:** "What kind of file is this? https://drive.google.com/file/d/def456"

**Claude:** Uses `get_gdrive_metadata` to identify file type

## File Storage

Downloaded files are stored in:
```
backend/data/gdrive_downloads/
```

This directory is created automatically and organized by user requests.

## Requirements

Already included in `requirements.txt`:
- `httpx>=0.27.0` - For HTTP requests to Google Drive

## Important Notes

### Permissions
Files must be:
- Publicly accessible, OR
- Shared with "Anyone with the link"

### Limitations
- Requires internet connection to fetch files
- Google Drive may rate-limit excessive requests
- Large files subject to 60-second timeout
- Binary files (images, PDFs) shown as metadata when reading, downloadable via download tool

### Error Handling
All tools return structured responses:
```json
{
  "success": true/false,
  "content": "...",          // For text content
  "error": "...",            // If failed
  "file_id": "...",
  "file_type": "...",
  "size": 12345
}
```

## Testing

A test script is available at `backend/test_gdrive.py` to verify:
- Link parsing functionality
- Client initialization
- URL pattern recognition

Run with:
```bash
cd backend
python test_gdrive.py
```

## Integration with Main Application

The Google Drive tools are now part of Claude's capabilities and will be automatically available when:
1. Backend server is running
2. User provides Google Drive links in conversation
3. User explicitly requests reading or downloading from Google Drive

No additional configuration needed!

## Future Enhancements (Optional)

Potential improvements for later:
- OAuth authentication for private files
- Folder listing and navigation
- File upload to Google Drive
- Real-time collaboration features
- Thumbnail generation
- File search within Drive

## Files Created

```
backend/app/tools/gdrive/
├── __init__.py                 # Module initialization
├── link_parser.py             # URL parsing (4.6 KB)
├── gdrive_client.py           # HTTP client (6.9 KB)
├── gdrive_tools.py            # Tool definitions (7.2 KB)
└── README.md                  # Documentation (4.3 KB)

backend/data/
└── gdrive_downloads/          # Download storage directory

backend/
├── test_gdrive.py             # Test script
└── GDRIVE_TOOLS_SUMMARY.md    # This file
```

## Integration Changes

### Modified Files
1. **`backend/app/tools/tool_definitions.py`**
   - Added import: `from app.tools.gdrive import GDRIVE_TOOLS`
   - Added to ALL_TOOLS: `+ GDRIVE_TOOLS`
   - Added getter: `get_gdrive_tools()`

2. **`backend/app/tools/tool_executor.py`**
   - Added import: `from app.tools.gdrive import execute_gdrive_tool`
   - Added tool mappings for: `read_gdrive_file`, `download_gdrive_file`, `get_gdrive_metadata`
   - Added executor method: `_execute_gdrive_tool()`

## Status

✅ **Implementation Complete**
✅ **Integrated with Main System**
✅ **Ready for Use**

Claude can now open, read, and download files from any Google Drive link shared in the conversation!
