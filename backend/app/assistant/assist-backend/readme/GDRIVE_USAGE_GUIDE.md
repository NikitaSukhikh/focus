# Google Drive Integration - Usage Guide

## Quick Start

The Google Drive functionality is now fully integrated into your Alfy assistant! Claude can automatically detect and work with Google Drive links shared in the conversation.

## How It Works

When you share a Google Drive link in the conversation, Claude can:

1. **Automatically read the content** of documents, spreadsheets, and presentations
2. **Download files** to your local storage when requested
3. **Get metadata** about files without downloading them

## Usage Examples

### Example 1: Reading a Google Doc

**You:** Can you read this document?
https://docs.google.com/document/d/1abcdefg123456/edit

**Claude:** *Automatically uses `read_gdrive_file` to fetch and display the content*

"I've read the document. Here's what it contains: [content shown]"

---

### Example 2: Reading a Spreadsheet as CSV

**You:** What's in this spreadsheet?
https://docs.google.com/spreadsheets/d/1xyz789abc/edit

**Claude:** *Uses `read_gdrive_file` with default CSV format*

"Here's the data from the spreadsheet: [CSV content shown]"

---

### Example 3: Downloading a File

**You:** Please download this presentation as PDF
https://docs.google.com/presentation/d/1presentation123/edit

**Claude:** *Uses `download_gdrive_file` with PDF format*

"I've downloaded the presentation to `backend/data/gdrive_downloads/presentation.pdf`"

---

### Example 4: Specific Export Format

**You:** Export this document as Word format
https://docs.google.com/document/d/1doc456/edit

**Claude:** *Uses `download_gdrive_file` with DOCX format*

"Downloaded the document as `document.docx`"

---

### Example 5: Check File Type

**You:** What type of file is this?
https://drive.google.com/file/d/1file789/view

**Claude:** *Uses `get_gdrive_metadata`*

"This is a file stored in Google Drive (File ID: 1file789)"

## Supported File Types

### Google Workspace Files

| File Type | Read Format | Export Options |
|-----------|-------------|----------------|
| Google Docs | Text (default) | `txt`, `docx`, `pdf` |
| Google Sheets | CSV (default) | `csv`, `xlsx`, `pdf` |
| Google Slides | - | `pdf`, `pptx` |
| Google Forms | - | `pdf` |

### Regular Files

Any file stored in Google Drive can be downloaded directly:
- PDFs
- Images (PNG, JPG, etc.)
- Videos
- Archives (ZIP, RAR, etc.)
- And more...

## File Permissions

### Public Files (No Authentication Required)

Files must be shared with "Anyone with the link" or be publicly accessible for Alfy to read them without authentication.

To share a file publicly:
1. Open the file in Google Drive
2. Click "Share" button
3. Click "Change to anyone with the link"
4. Copy the link and share it with Alfy

### Private Files (OAuth Authentication Required)

**NEW:** Alfy now supports accessing private and shared files using OAuth 2.0 authentication!

To access private files:
1. Set up Google OAuth credentials (see [GDRIVE_OAUTH_SETUP.md](GDRIVE_OAUTH_SETUP.md))
2. Authenticate with Google Drive by asking Alfy: "Authenticate with Google Drive"
3. Grant permissions in the browser window
4. Access any private or shared files in your Google Drive

**Benefits of OAuth:**
- Access your private files without making them public
- Access files shared with you by others
- No need to change file permissions
- Automatic fallback to public access if authentication fails

## Download Location

Downloaded files are saved to:
```
backend/data/gdrive_downloads/
```

You can specify subdirectories:
- `documents/report.pdf`
- `spreadsheets/data.xlsx`
- `images/photo.jpg`

## Commands & Phrasing

Alfy understands natural language requests:

### Authentication Commands (New!)
- "Authenticate with Google Drive"
- "Connect to my Google Drive"
- "Check my Google Drive authentication"
- "Am I authenticated with Google Drive?"
- "Revoke my Google Drive access"
- "Disconnect my Google account"

### Reading Files
- "Read this document: [link]"
- "What's in this file?"
- "Can you show me the contents?"
- "Open this Google Doc"
- "Read this private document: [link]" (requires authentication)

### Downloading Files
- "Download this file"
- "Save this to my computer"
- "Export as PDF/Word/Excel"
- "Download as [format]"
- "Download this shared file" (works with OAuth)

### Getting Info
- "What type of file is this?"
- "Tell me about this file"
- "What's the file ID?"

## Export Format Reference

### For Documents
```
read_gdrive_file:
  - txt (default, best for reading in chat)
  - docx (Microsoft Word)
  - pdf (Portable Document Format)
```

### For Spreadsheets
```
read_gdrive_file:
  - csv (default, best for data analysis)
  - xlsx (Microsoft Excel)
  - pdf (for printing/viewing)
```

### For Presentations
```
download_gdrive_file:
  - pdf (default, best for viewing)
  - pptx (Microsoft PowerPoint)
```

## Technical Details

### Timeout
- Default timeout: 60 seconds
- Suitable for most files
- Very large files (>100MB) may timeout

### Rate Limiting
- Google Drive may rate-limit excessive requests
- Wait a few moments between multiple downloads

### Binary Files
When reading binary files (PDFs, images), Claude will:
1. Detect that it's binary
2. Show metadata (file ID, type, size)
3. Suggest using download function instead

### Error Messages

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid Google Drive URL" | Malformed link | Check the URL format |
| "HTTP error 403" | File not shared | Make file publicly accessible |
| "HTTP error 404" | File doesn't exist | Verify the file ID |
| "Request timeout" | File too large | Try downloading smaller file |

## Privacy & Security

### Public Access Mode
- Files must be publicly accessible for Alfy to read them
- No authentication or login required
- Alfy only accesses files you explicitly share

### OAuth Authentication Mode
- Secure OAuth 2.0 authentication with Google
- Access tokens stored locally on your machine
- You control what permissions to grant
- Can revoke access at any time
- Read-only access by default (configurable)

### General Security
- Downloaded files stored locally on your machine
- No data sent to third parties
- All credentials stored securely in local files

## Integration Status

✅ **Fully Integrated** - No additional setup required!

The Google Drive tools are automatically available when:
1. Backend server is running
2. You share a Google Drive link in conversation

## Testing

To test the functionality, you can:

1. **Share a test document:**
   - Create a Google Doc/Sheet/Slide
   - Share it with "Anyone with the link"
   - Share the link with Claude

2. **Run the test script:**
   ```bash
   cd backend
   python test_gdrive.py
   ```

## Troubleshooting

### Claude doesn't recognize the link
- Ensure the link is a valid Google Drive URL
- Try sharing the full URL (not shortened)
- Check if the link is properly formatted

### Can't read file content
- Verify file is shared with "Anyone with the link"
- Check your internet connection
- Try downloading the file instead

### Download fails
- Check disk space
- Verify destination path is writable
- Ensure parent directories exist

## Support

For issues or questions:
1. Check the error message
2. Review the [README](app/tools/gdrive/README.md)
3. Check server logs at `backend/logs/`
4. Consult the technical summary at `GDRIVE_TOOLS_SUMMARY.md`

## Examples in Action

Try these sample commands:

1. "Can you read this doc? https://docs.google.com/document/d/YOUR_DOC_ID"
2. "Download this spreadsheet as Excel"
3. "What format is this file?"
4. "Export this presentation as PDF"
5. "Show me what's in this sheet"

---

**Happy Drive-ing! 🚗📄**

Claude can now seamlessly work with your Google Drive files!
