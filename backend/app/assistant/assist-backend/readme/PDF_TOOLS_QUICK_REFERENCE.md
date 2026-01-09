# PDF Tools Quick Reference

## Available PDF Tools (7 total)

### Basic PDF Tools (from document_tools.py)

#### 1. create_pdf
Create a new PDF document with text content.
```json
{
  "file_path": "documents/report.pdf",
  "content": "Text content here...",
  "title": "Optional title",
  "author": "Optional author"
}
```

#### 2. read_pdf
Basic PDF reading (extract text).
```json
{
  "file_path": "document.pdf",
  "max_pages": 10  // optional
}
```

#### 3. merge_pdfs
Simple PDF merging.
```json
{
  "input_paths": ["file1.pdf", "file2.pdf"],
  "output_path": "merged.pdf"
}
```

---

### Enhanced PDF Tools (new)

#### 4. read_pdf_detailed
Read PDF with detailed analysis and summary.
```json
{
  "file_path": "document.pdf",
  "max_pages": 50,  // optional
  "include_summary": true  // optional, default true
}
```

**Returns:**
- Full text content (page by page)
- Total pages / pages read
- Metadata (title, author, subject, creator)
- Summary statistics:
  - Total characters
  - Total words
  - Average words per page
  - Has more pages indicator

**Use when:** User wants to understand PDF content with statistics

---

#### 5. merge_pdf_files
Advanced PDF merging with detailed reporting.
```json
{
  "input_paths": [
    "chapter1.pdf",
    "chapter2.pdf",
    "chapter3.pdf"
  ],
  "output_path": "complete_book.pdf"
}
```

**Returns:**
- Output file path
- Number of files merged
- Total pages across all PDFs
- Success message

**Use when:** User wants to combine multiple PDFs

---

#### 6. split_pdf_file
Split a PDF into multiple smaller PDFs.

**Mode 1: Split by Page Count**
```json
{
  "input_path": "large_document.pdf",
  "output_dir": "split_output",
  "split_mode": "pages",
  "pages_per_file": 10  // 10 pages per output file
}
```

**Example:** 100-page PDF → 10 files (10 pages each)

**Mode 2: Split by Page Ranges**
```json
{
  "input_path": "document.pdf",
  "output_dir": "split_output",
  "split_mode": "ranges",
  "page_ranges": [
    [1, 10],    // Pages 1-10
    [20, 30],   // Pages 20-30
    [50, 60]    // Pages 50-60
  ]
}
```

**Example:** Extract specific sections into separate files

**Returns:**
- List of output files with page ranges
- Number of files created
- Total pages processed

**Use when:**
- User wants to divide large PDF
- User wants specific page ranges as separate files

---

#### 7. extract_pdf_pages
Extract specific pages and create a new PDF.

```json
{
  "input_path": "document.pdf",
  "output_path": "extracted.pdf",
  "pages": [1, 5, 10, 15, 20]  // 1-indexed page numbers
}
```

**Returns:**
- Output file path
- Number of pages extracted
- List of page numbers extracted

**Use when:** User wants specific pages only (not ranges)

---

## Usage Patterns

### Pattern 1: Analyze Uploaded PDF
```
User: [Uploads report.pdf] "What's in this PDF?"
Tool: read_pdf_detailed
```

### Pattern 2: Merge Documents
```
User: "Combine part1.pdf and part2.pdf"
Tool: merge_pdf_files
```

### Pattern 3: Split Large Document
```
User: "Split this 100-page PDF into 25-page chunks"
Tool: split_pdf_file (split_mode: "pages", pages_per_file: 25)
```

### Pattern 4: Extract Sections
```
User: "I need pages 10-20 and 40-50 as separate files"
Tool: split_pdf_file (split_mode: "ranges", page_ranges: [[10,20], [40,50]])
```

### Pattern 5: Extract Specific Pages
```
User: "Give me just pages 3, 7, and 12"
Tool: extract_pdf_pages (pages: [3, 7, 12])
```

---

## split_pdf_file vs extract_pdf_pages

### Use split_pdf_file when:
- ✅ Creating multiple output files
- ✅ Splitting by page count (every N pages)
- ✅ Extracting multiple ranges into separate files
- ✅ Example: "Split into 10-page sections"

### Use extract_pdf_pages when:
- ✅ Creating ONE output file
- ✅ Extracting specific non-contiguous pages
- ✅ Example: "Get pages 1, 5, 9, 15"

---

## File Paths

### Uploaded Files
- Location: `backend/data/uploads/`
- Format: `filename_YYYYMMDD_HHMMSS.ext`
- Example: `document_20231216_143022.pdf`

### Output Files
- Relative paths are relative to `backend/` directory
- Absolute paths are used as-is
- Always use forward slashes or double backslashes

**Good:**
- `data/uploads/output.pdf`
- `output_files/merged.pdf`
- `D:\\Documents\\output.pdf` (absolute)

**Bad:**
- `output.pdf` (unclear location)
- `D:\Documents\output.pdf` (single backslash issues)

---

## Error Handling

### Common Errors

**File not found:**
```json
{
  "success": false,
  "error": "File not found: document.pdf"
}
```
**Solution:** Verify file path, ensure file was uploaded

**Invalid page numbers:**
```json
{
  "success": false,
  "error": "Invalid page numbers: [101]. PDF has 100 pages."
}
```
**Solution:** Check page count first with read_pdf_detailed

**Invalid page ranges:**
```json
{
  "success": false,
  "error": "Page ranges not provided for 'ranges' mode"
}
```
**Solution:** Include page_ranges parameter

---

## Tips for Claude

### When User Says "Read this PDF"
1. Use `read_pdf_detailed` (not basic `read_pdf`)
2. Include summary statistics
3. Provide intelligent summary of content

### When User Says "Merge PDFs"
1. Use `merge_pdf_files` (not basic `merge_pdfs`)
2. Report total page count
3. Confirm success with file path

### When User Says "Split this PDF"
1. Clarify: by page count or specific ranges?
2. Use `split_pdf_file` with appropriate mode
3. List all output files created

### When User Says "Extract pages [numbers]"
1. If creating ONE file: use `extract_pdf_pages`
2. If creating MULTIPLE files: use `split_pdf_file` with ranges mode

### Always Provide Feedback
- ✅ Confirm success
- ✅ Show page counts
- ✅ List output file paths
- ✅ Offer next steps

---

## Testing Commands

### Test in Python
```python
# In backend directory
from app.tools.pdf_enhanced import pdf_tools
import asyncio

# Test read
result = asyncio.run(pdf_tools.read_pdf_with_summary(
    "data/uploads/test.pdf",
    max_pages=5,
    include_summary=True
))
print(result)

# Test merge
result = asyncio.run(pdf_tools.merge_pdfs(
    ["file1.pdf", "file2.pdf"],
    "merged.pdf"
))
print(result)

# Test split
result = asyncio.run(pdf_tools.split_pdf(
    "large.pdf",
    "output_dir",
    split_mode="pages",
    pages_per_file=10
))
print(result)

# Test extract
result = asyncio.run(pdf_tools.extract_pages(
    "document.pdf",
    "extracted.pdf",
    [1, 5, 10]
))
print(result)
```

### Test via API
```bash
# Upload a file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@document.pdf"

# List uploads
curl http://localhost:8000/api/uploads
```

---

## Integration Checklist

✅ Enhanced PDF tools implemented
✅ Tool definitions created
✅ Tool executor configured
✅ Tools added to ALL_TOOLS list
✅ File upload API created
✅ Upload routes registered in main.py
✅ Frontend file attachment component
✅ Frontend upload service
✅ Enhanced input bar with attachments

**All systems ready! 🚀**
