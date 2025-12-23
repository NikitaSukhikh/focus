# Document Manipulation Tools

This directory contains tools for creating, editing, and reading PDF, DOCX, and Excel files, integrated with Claude API for AI-powered document manipulation.

## Overview

Three new tool modules have been added to enable comprehensive document operations:

1. **PDF Operations** (`pdf_operations.py`)
2. **DOCX Operations** (`docx_operations.py`)
3. **Excel Operations** (`excel_operations.py`)

All tools are integrated with Claude's tool calling API, allowing Claude to manipulate documents based on natural language requests.

## Available Tools

### PDF Tools

- **create_pdf**: Create a new PDF with text content and metadata
- **read_pdf**: Extract text content from existing PDFs
- **merge_pdfs**: Combine multiple PDF files into one
- **add_text_to_pdf**: Add text pages to existing PDFs
- **split_pdf**: Split PDF into separate files

### DOCX (Word) Tools

- **create_docx**: Create new Word documents with text
- **read_docx**: Read content from Word documents
- **append_to_docx**: Add content to existing documents
- **add_table_to_docx**: Insert tables into documents
- **replace_text_in_docx**: Find and replace text

### Excel (XLSX) Tools

- **create_excel**: Create new spreadsheets with data
- **read_excel**: Read data from spreadsheets
- **append_to_excel**: Add rows to existing sheets
- **update_excel_cell**: Modify specific cells
- **create_sheet**: Add new sheets to workbooks
- **delete_sheet**: Remove sheets from workbooks
- **get_excel_info**: Get metadata about Excel files

## Integration

### Tool Definitions

All tools are defined in `document_tools.py` with Claude-compatible schemas:

```python
from app.tools.document_tools import DOCUMENT_TOOLS
```

### Tool Executor

The `tool_executor.py` has been updated to handle document tools:

```python
from app.tools.tool_executor import tool_executor

# Execute a tool
result = await tool_executor.execute_tool(
    tool_name="create_pdf",
    tool_input={"file_path": "report.pdf", "content": "Hello World"}
)
```

### Claude Integration

Document tools are automatically available when using Claude through the LLM provider:

```python
from app.core.llm_provider import LLMProviderFactory
from app.tools.tool_definitions import get_all_tools

provider = await LLMProviderFactory.get_provider()
tools = get_all_tools()  # Includes document tools

response = await provider.generate_with_tools(
    messages=[{"role": "user", "content": "Create a PDF report"}],
    tools=tools
)
```

## Testing

Run the test script to see the tools in action:

```bash
# Full test suite
python -m app.examples.test_document_tools

# Simple test
python -m app.examples.test_document_tools --simple
```

## Examples

### Example 1: Create a PDF with Claude

```python
query = "Create a PDF at reports/monthly.pdf with title 'Monthly Report' and content about Q4 sales"

response = await provider.generate_with_tools(
    messages=[{"role": "user", "content": query}],
    tools=get_document_tools()
)

# Claude will call create_pdf tool with appropriate parameters
```

### Example 2: Create Excel Spreadsheet

```python
query = "Create an Excel file at data/sales.xlsx with headers 'Month', 'Revenue', 'Profit' and add data for Jan-Mar"

# Claude will:
# 1. Parse the request
# 2. Call create_excel with proper data structure
# 3. Return confirmation with file path
```

### Example 3: Read and Summarize PDF

```python
query = "Read the PDF at reports/monthly.pdf and summarize the key points"

# Claude will:
# 1. Call read_pdf to extract text
# 2. Analyze the content
# 3. Provide a summary
```

## Requirements

The following Python packages are required (already in `requirements.txt`):

- `PyPDF2>=3.0.0` - PDF reading/manipulation
- `reportlab>=4.0.0` - PDF creation
- `python-docx>=1.1.0` - Word document operations
- `openpyxl>=3.1.0` - Excel file operations

Install with:

```bash
pip install -r requirements.txt
```

## Architecture

```
app/tools/
├── system/                    # System-level tools
│   ├── pdf_operations.py     # PDF tool implementations
│   ├── docx_operations.py    # DOCX tool implementations
│   ├── excel_operations.py   # Excel tool implementations
│   └── __init__.py           # Exports all tools
├── document_tools.py          # Claude API schemas & handler
├── tool_definitions.py        # Combined tool definitions
└── tool_executor.py           # Tool execution dispatcher
```

## Error Handling

All tools return a consistent result format:

```python
{
    "success": bool,
    "path": str,           # File path (on success)
    "error": str,          # Error message (on failure)
    "message": str,        # Success message
    # ... additional tool-specific fields
}
```

## File Size Limits

- PDF reading: 50 MB max
- DOCX reading: 50 MB max
- Excel reading: 50 MB max

These limits can be adjusted in each tool's `__init__` method.

## Future Enhancements

Potential additions:
- PDF form filling
- DOCX template support
- Excel formula evaluation
- Chart creation in Excel
- Image insertion in documents
- Document format conversion
