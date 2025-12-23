## File Tools for Alfy

Comprehensive file system tools that allow Alfy to search for, read, and modify files on your local system.

## Overview

Alfy now has powerful local file manipulation capabilities through two main tools:

1. **File Search Tool** - Find files by name, extension, or modification date
2. **File Operations Tool** - Read, write, copy, move, and delete files

## Features

### 🔍 File Search Tool

**Capabilities:**
- Search by filename (partial or exact match)
- Search by file extension
- Find recently modified files
- Recursive directory search with depth limits
- Wildcards support (`*` and `?`)
- Smart directory skipping (ignores system folders, .git, node_modules, etc.)

**Safety Features:**
- Maximum result limits (default: 100)
- Maximum search depth (default: 10 levels)
- Automatic permission handling
- Skip system and hidden directories

### 📝 File Operations Tool

**Capabilities:**
- **Read files** with encoding support
- **Write files** with automatic backup
- **Append to files**
- **Copy files** with overwrite protection
- **Move/rename files**
- **Delete files** with confirmation requirement
- **Get file info** (size, dates, permissions, etc.)

**Safety Features:**
- File size limits for reading (10 MB default)
- Automatic backup before overwriting
- Explicit confirmation required for deletions
- Directory creation for new files
- Proper error handling and validation

## Location

All file tools are located in:
```
d:\alfy\backend\app\tools\system\
├── file_search.py        # File search functionality
├── file_operations.py    # File manipulation operations
└── __init__.py           # Package exports
```

## Usage Examples

### File Search

#### 1. Search by Filename (Partial Match)

```python
from app.tools.system import file_search_tool

# Find all files containing "config" in their name
result = await file_search_tool.search_by_name(
    query="config",
    search_paths=["D:\\alfy\\backend"],
    case_sensitive=False,
    max_results=10
)

# Result structure:
{
    "success": True,
    "total_found": 5,
    "results": [
        {
            "path": "D:\\alfy\\backend\\app\\config.py",
            "name": "config.py",
            "type": "file",
            "size": 2834,
            "size_human": "2.77 KB",
            "modified": "2025-12-11T00:01:31.215180",
            "extension": ".py"
        }
    ]
}
```

#### 2. Search by Extension

```python
# Find all Python files
result = await file_search_tool.search_by_extension(
    extension="py",
    search_paths=["D:\\alfy\\backend\\app"],
    max_results=20
)
```

#### 3. Find Recent Files

```python
# Find files modified in last 24 hours
result = await file_search_tool.search_recent_files(
    hours=24,
    max_results=50
)
```

#### 4. Exact Match Search

```python
# Find exact filename match
result = await file_search_tool.search_by_name(
    query="main.py",
    exact_match=True,
    file_type="file"  # Only files, not directories
)
```

#### 5. Wildcard Search

```python
# Use wildcards for pattern matching
result = await file_search_tool.search_by_name(
    query="test_*.py",  # Matches test_config.py, test_main.py, etc.
    search_paths=["D:\\alfy\\backend"]
)
```

### File Operations

#### 1. Read a File

```python
from app.tools.system import file_operations_tool

# Read entire file
result = await file_operations_tool.read_file(
    file_path="D:\\alfy\\backend\\app\\config.py"
)

# Result:
{
    "success": True,
    "path": "D:\\alfy\\backend\\app\\config.py",
    "content": "... file content ...",
    "size": 2834,
    "encoding": "utf-8"
}
```

#### 2. Read Partial File (First N Lines)

```python
# Read only first 10 lines
result = await file_operations_tool.read_file(
    file_path="D:\\logs\\app.log",
    max_lines=10
)
```

#### 3. Write to a File

```python
# Write content (creates backup of existing file)
result = await file_operations_tool.write_file(
    file_path="D:\\notes\\todo.txt",
    content="1. Task one\n2. Task two\n3. Task three",
    backup=True,  # Create backup if file exists
    create_dirs=True  # Create parent directories if needed
)
```

#### 4. Append to a File

```python
# Add content to end of file
result = await file_operations_tool.append_to_file(
    file_path="D:\\logs\\activity.log",
    content=f"\n{datetime.now()}: User logged in"
)
```

#### 5. Copy a File

```python
# Copy file to backup location
result = await file_operations_tool.copy_file(
    source="D:\\documents\\report.docx",
    destination="D:\\backups\\report_backup.docx",
    overwrite=True
)
```

#### 6. Move/Rename a File

```python
# Move or rename file
result = await file_operations_tool.move_file(
    source="D:\\downloads\\file.txt",
    destination="D:\\documents\\organized_file.txt"
)
```

#### 7. Get File Information

```python
# Get detailed file metadata
result = await file_operations_tool.get_file_info(
    file_path="D:\\documents\\report.pdf"
)

# Returns:
{
    "success": True,
    "name": "report.pdf",
    "size": 1234567,
    "size_human": "1.18 MB",
    "extension": ".pdf",
    "created": "2025-12-10T10:30:00",
    "modified": "2025-12-11T09:15:23",
    "is_file": True,
    "permissions": "666"
}
```

#### 8. Delete a File (Requires Confirmation)

```python
# Delete file (requires explicit confirm=True)
result = await file_operations_tool.delete_file(
    file_path="D:\\temp\\old_file.txt",
    confirm=True  # Safety: must explicitly confirm
)
```

## Integration with Claude API

When using Claude API as your LLM provider, you can instruct Alfy to use these tools:

### Example Conversations

**User:** "Find all Python files in my backend folder"

**Alfy response would trigger:**
```python
await file_search_tool.search_by_extension(
    extension="py",
    search_paths=["D:\\alfy\\backend"]
)
```

**User:** "Read the content of config.py"

**Alfy response would trigger:**
```python
await file_operations_tool.read_file(
    file_path="D:\\alfy\\backend\\app\\config.py"
)
```

**User:** "Create a new file called notes.txt with my todo list"

**Alfy response would trigger:**
```python
await file_operations_tool.write_file(
    file_path="D:\\notes.txt",
    content="[Generated todo list based on conversation]"
)
```

## Safety Mechanisms

### File Search Safety
1. **Result Limits** - Max 100 results by default to prevent memory issues
2. **Depth Limits** - Max 10 directory levels to prevent infinite recursion
3. **Directory Skipping** - Automatically skips:
   - Hidden directories (`.git`, `.vscode`)
   - System folders (`Windows`, `Program Files`)
   - Package folders (`node_modules`, `__pycache__`)
   - Virtual environments (`.venv`, `venv`)

### File Operations Safety
1. **Size Limits** - Won't read files larger than 10 MB
2. **Automatic Backups** - Creates timestamped backups before overwriting
3. **Confirmation Required** - Deletions require explicit `confirm=True`
4. **Path Validation** - Validates paths exist before operations
5. **Error Handling** - Graceful error messages for permission/encoding issues

## Testing

Run the comprehensive test suite:

```bash
cd d:\alfy\backend
python -m app.examples.test_file_tools
```

This will test:
- File search by name
- File search by extension
- Recent file search
- File reading/writing
- File appending
- File copying
- File info retrieval
- Partial file reading

## Common Use Cases

### 1. Find Configuration Files
```python
result = await file_search_tool.search_by_name(
    query="config",
    search_paths=["D:\\projects"]
)
```

### 2. Backup Important Documents
```python
# Find all .docx files
docs = await file_search_tool.search_by_extension(
    extension="docx",
    search_paths=["D:\\Documents"]
)

# Copy each to backup folder
for doc in docs['results']:
    await file_operations_tool.copy_file(
        source=doc['path'],
        destination=f"D:\\Backups\\{doc['name']}"
    )
```

### 3. Read and Analyze Logs
```python
# Read first 100 lines of log file
result = await file_operations_tool.read_file(
    file_path="D:\\logs\\app.log",
    max_lines=100
)

# Analyze content
log_content = result['content']
# ... process log content ...
```

### 4. Organize Files
```python
# Find all downloads
files = await file_search_tool.search_by_name(
    query="*",
    search_paths=["D:\\Downloads"]
)

# Move PDFs to Documents
for file in files['results']:
    if file['extension'] == '.pdf':
        await file_operations_tool.move_file(
            source=file['path'],
            destination=f"D:\\Documents\\{file['name']}"
        )
```

## Configuration

### Customize Search Limits

```python
# Increase max results
file_search_tool.max_results = 200

# Increase search depth
file_search_tool.max_depth = 15
```

### Customize Operation Limits

```python
# Increase max file size for reading (50 MB)
file_operations_tool.max_file_size = 50 * 1024 * 1024
```

## Error Handling

All tools return structured responses with success status:

```python
result = await file_search_tool.search_by_name(query="test")

if result['success']:
    # Operation succeeded
    print(f"Found {result['total_found']} files")
    for file in result['results']:
        print(file['path'])
else:
    # Operation failed
    print(f"Error: {result['error']}")
```

## Future Enhancements

Planned features:
- [ ] Content-based search (search inside files)
- [ ] Advanced filtering (by size, date ranges)
- [ ] Batch operations
- [ ] File compression/decompression
- [ ] Checksum verification
- [ ] File encryption/decryption

## Security Considerations

1. **Permission-based Access** - Tools respect OS file permissions
2. **Path Validation** - All paths are resolved and validated
3. **No Privilege Escalation** - Runs with user's permissions only
4. **Backup Protection** - Automatic backups prevent accidental data loss
5. **Confirmation Gates** - Destructive operations require explicit confirmation

## Troubleshooting

### "Permission Denied" Errors
- Check that Alfy has read/write permissions for the target directory
- Try running with appropriate permissions
- Some system folders are protected and cannot be accessed

### "File Too Large" Errors
- Increase `max_file_size` limit
- Or read file in chunks using `max_lines` parameter

### "File Not Found" Errors
- Verify the file path is correct
- Use file search to find the file first
- Check that the file hasn't been moved or deleted

## Support

For issues or questions:
- Review [CLAUDE_API_SETUP.md](CLAUDE_API_SETUP.md) for Claude integration
- Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for quick tips
- See test examples in `app/examples/test_file_tools.py`
