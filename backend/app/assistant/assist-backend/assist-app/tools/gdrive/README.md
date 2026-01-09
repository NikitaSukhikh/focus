# Google Drive Tools

This module provides functionality for Claude to interact with Google Drive files through share links.

## Features

- **Read Google Drive Files**: Extract and read content from Google Docs, Sheets, Presentations, and regular files
- **Download Files**: Download files from Google Drive to local storage
- **Support Multiple Formats**: Export Google Docs to various formats (PDF, DOCX, TXT, etc.)
- **Link Detection**: Automatically detect and parse various Google Drive URL formats
- **Folder Support**: List and download PDFs (or exportable Google Docs/Sheets/Slides as PDF) from shared folders for merging/splitting

## Supported URL Formats

The module supports the following Google Drive URL patterns:

- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- `https://docs.google.com/document/d/FILE_ID/...`
- `https://docs.google.com/spreadsheets/d/FILE_ID/...`
- `https://docs.google.com/presentation/d/FILE_ID/...`
- `https://docs.google.com/forms/d/FILE_ID/...`

## Available Tools

### 1. `read_gdrive_file`

Read content from a Google Drive file using its share link.

**Parameters:**
- `url` (required): Google Drive share URL
- `export_format` (optional): Export format for Google Docs/Sheets/Slides
  - Documents: `txt`, `docx`, `pdf`
  - Spreadsheets: `csv`, `xlsx`, `pdf`
  - Presentations: `pdf`, `pptx`

**Example:**
```json
{
  "url": "https://docs.google.com/document/d/abc123/edit",
  "export_format": "txt"
}
```

### 2. `download_gdrive_file`

Download a file from Google Drive to local storage.

**Parameters:**
- `url` (required): Google Drive share URL
- `destination_path` (required): Local path where the file should be saved
- `export_format` (optional): Export format (same options as read_gdrive_file)

**Example:**
```json
{
  "url": "https://drive.google.com/file/d/xyz789/view",
  "destination_path": "documents/my_file.pdf",
  "export_format": "pdf"
}
```

**Note:** Files are saved relative to `backend/data/gdrive_downloads/` unless an absolute path is provided.

### 3. `get_gdrive_metadata`

Get metadata about a Google Drive file without downloading it.

**Parameters:**
- `url` (required): Google Drive share URL

**Returns:**
- `file_id`: Extracted Google Drive file ID
- `file_type`: Type of file (document, spreadsheet, presentation, form, file)
- `original_url`: The original URL provided

### 4. `list_gdrive_folder`

List files inside a Google Drive folder (requires OAuth).

**Parameters:**
- `url` (required): Google Drive folder share URL

**Returns:**
- `files`: Array with `id`, `name`, `mimeType`, `size`, `modifiedTime`

### 5. `download_gdrive_folder_pdfs`

Download all PDF-compatible items in a folder (PDFs and Google Docs/Sheets/Slides exported as PDF) to local storage (requires OAuth).

**Parameters:**
- `url` (required): Google Drive folder share URL
- `destination_dir` (optional): Local directory. Defaults to `backend/data/gdrive_downloads/<folder_id>`

**Returns:**
- `downloaded`: List of downloaded files with `path`
- `failed`: Any failures encountered

## Module Structure

```
gdrive/
├── __init__.py           # Module initialization
├── link_parser.py        # URL parsing and file ID extraction
├── gdrive_client.py      # HTTP client for Google Drive
├── gdrive_tools.py       # Tool definitions and executors
└── README.md            # This file
```

## Usage Example

When a user provides a Google Drive link in conversation, Claude can automatically:

1. **Read the content:**
   - User: "Can you read this document? https://docs.google.com/document/d/abc123"
   - Claude uses `read_gdrive_file` to fetch and display the content

2. **Download files:**
   - User: "Download this spreadsheet as Excel: https://docs.google.com/spreadsheets/d/xyz789"
   - Claude uses `download_gdrive_file` with `export_format="xlsx"`

3. **Get metadata:**
   - User: "What type of file is this? https://drive.google.com/file/d/def456"
   - Claude uses `get_gdrive_metadata` to identify the file

## Requirements

The module requires the following dependencies:
- `httpx` - For making HTTP requests to Google Drive

These are already included in the main `requirements.txt` file.

## Important Notes

1. **File Permissions**: The files must be publicly accessible or shared with "Anyone with the link" for this to work.

2. **Large Files**: Very large files may take longer to download and could timeout. The default timeout is 60 seconds.

3. **Binary Files**: When reading binary files (PDFs, images, etc.), the tool will inform you that it's binary and suggest using the download function instead.

4. **Rate Limiting**: Google Drive may rate-limit requests if too many are made in quick succession.

5. **OAuth Flow**: If a link requires access, the tools will initiate the OAuth browser flow automatically (tab closes after consent). Once authorized, subsequent calls reuse the saved token.

6. **Supplying OAuth Client**: Each user must provide their own Google OAuth Client. You can either:
   - Place your downloaded `client_secret.json` at `backend/data/gdrive_tokens/client_secret.json`, or
   - Set `GOOGLE_CREDENTIALS_PATH` to point to your OAuth client JSON, or
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.

## Error Handling

The tools return structured responses with success/error status:

```json
{
  "success": true/false,
  "content": "file content (for text files)",
  "error": "error message (if failed)",
  "file_id": "extracted file ID",
  "file_type": "document/spreadsheet/presentation/file",
  "size": 12345
}
```
