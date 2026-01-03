# Invoice Generation Tools - Implementation Summary

## Overview

Successfully implemented professional invoice generation tools using invoice-generator.com API, following the modular LLM connector pattern. Works with **any LLM provider** - Claude, OpenAI, or local models.

## What Was Added

### 1. Invoice Generator API Client

**Location:** `app/tools/invoicing/invoice_generator.py`

- HTTP client for invoice-generator.com API
- PDF invoice generation
- Helper function `create_invoice_data()` for formatting invoice data
- Supports custom branding, line items, tax, discounts, shipping

### 2. Invoice Operations Tool

**Location:** `app/tools/invoicing/invoice_operations.py`

**Capabilities:**
- `generate_invoice()` - Create professional invoice PDFs
- `save_template()` - Save reusable invoice templates
- `load_template()` - Load saved templates
- `list_templates()` - List all available templates

**Features:**
- Template system for recurring invoices
- Comprehensive invoice customization
- Auto-generated invoice numbers
- Support for multiple currencies

### 3. Invoice Tool Definitions

**Location:** `app/tools/invoicing/invoice_tools.py`

**4 LLM-callable tools:**
1. **generate_invoice** - Generate invoice PDFs
2. **save_invoice_template** - Save templates
3. **load_invoice_template** - Load templates
4. **list_invoice_templates** - List templates

### 4. Integration

**Updated Files:**
- `app/config.py` - Added `INVOICE_GEN_API_KEY` configuration
- `app/tools/tool_definitions.py` - Added invoice tools to registry
- `app/tools/tool_executor.py` - Added invoice tool execution

### 5. Test Suite

**Location:** `app/examples/test_invoice_tools.py`

```bash
# Test with configured provider
python -m app.examples.test_invoice_tools

# Simple test
python -m app.examples.test_invoice_tools --simple
```

## Invoice Features

### Supported Fields

**Company/Sender Information:**
- Name, Address, Email, Phone
- Company logo (via URL)

**Client/Recipient Information:**
- Name, Address, Email

**Invoice Details:**
- Invoice number (auto-generated or custom)
- Date (defaults to today)
- Due date
- Payment terms
- Notes

**Line Items:**
- Item name/description
- Quantity
- Unit cost
- Automatic subtotal calculation

**Financial Calculations:**
- Tax rate (percentage)
- Discount rate (percentage)
- Shipping costs
- Automatic total calculation

**Customization:**
- Currency selection (USD, EUR, GBP, etc.)
- Custom branding via logo
- Template system for reuse

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           LLM Provider (Abstract)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Claude  │  │  OpenAI  │  │   Local  │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       └─────────────┴──────────────┘               │
│              ▼ generate_with_tools()               │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         Tool Executor (tool_executor.py)            │
│  Dispatches to appropriate tool implementation       │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │   Invoice Tools   │
    │  (invoice-gen.com)│
    └──────────────────┘
```

## Configuration

### 1. Get API Key

Sign up at [invoice-generator.com](https://invoice-generator.com) to get your API key.
- Free plan: 100 invoices/month
- Paid plans available for higher volume

### 2. Set Environment Variable

Add to your `.env` file (keep it private and never commit it):

```bash
INVOICE_GEN_API_KEY=your_api_key_here
```

### 3. Configuration in Code

The API key is automatically loaded from `settings.invoice_gen_api_key` via `app/config.py`.

## Usage Examples

### Example 1: Generate Invoice via LLM

```python
from app.core.llm_provider import LLMProviderFactory
from app.tools.tool_definitions import get_all_tools
from app.tools.tool_executor import tool_executor

# Get any configured provider
provider = await LLMProviderFactory.get_provider()
tools = get_all_tools()

# Ask LLM to create an invoice
response = await provider.generate_with_tools(
    messages=[{
        "role": "user",
        "content": """Create an invoice:
From: My Company, 123 Main St, contact@company.com
To: Client Corp, 456 Business Ave
Items:
- Web Development: 40 hours @ $150/hour
- Design Services: 20 hours @ $100/hour
Tax: 10%
Due: 2025-02-15
Save to: invoices/INV-001.pdf"""
    }],
    tools=tools,
    system_prompt="You are a helpful assistant with invoice tools."
)

# Execute tool calls
for tool_call in response['tool_calls']:
    result = await tool_executor.execute_tool(
        tool_name=tool_call['name'],
        tool_input=tool_call['input']
    )
    print(f"Invoice created: {result['path']}")
```

### Example 2: Direct Tool Usage

```python
from app.tools.invoicing import invoice_operations_tool

# Generate invoice directly
result = await invoice_operations_tool.generate_invoice(
    output_path="invoices/my-invoice.pdf",
    from_name="My Company",
    from_email="hello@mycompany.com",
    to_name="Client Name",
    to_email="client@example.com",
    items=[
        {"name": "Consulting", "quantity": 10, "unit_cost": 150},
        {"name": "Support", "quantity": 5, "unit_cost": 100}
    ],
    tax_rate=10,
    currency="USD",
    terms="Net 30"
)

if result['success']:
    print(f"Invoice created: {result['path']}")
```

### Example 3: Using Templates

```python
# Save a template for recurring invoices
template_data = {
    "from_name": "My Company",
    "from_address": "123 Main Street, City, State 12345",
    "from_email": "billing@mycompany.com",
    "from_phone": "+1-555-0100",
    "currency": "USD",
    "tax_rate": 10,
    "terms": "Net 30 days",
    "logo_url": "https://mycompany.com/logo.png"
}

await invoice_operations_tool.save_template(
    template_name="standard",
    template_data=template_data
)

# Use template when generating invoice
result = await invoice_operations_tool.generate_invoice(
    output_path="invoices/INV-002.pdf",
    to_name="Another Client",
    items=[...],
    template_name="standard"  # Uses template defaults
)
```

## Template System

Templates are stored as JSON files in `app/tools/invoicing/templates/`.

**Template Structure:**
```json
{
  "from_name": "Your Company Name",
  "from_address": "123 Business St",
  "from_email": "contact@company.com",
  "from_phone": "+1-555-0100",
  "currency": "USD",
  "tax_rate": 8.5,
  "terms": "Payment due within 30 days",
  "logo_url": "https://yourcompany.com/logo.png",
  "notes": "Thank you for your business!"
}
```

## Testing

```bash
cd D:\alfy\backend

# Full test suite
python -m app.examples.test_invoice_tools

# Simple invoice test
python -m app.examples.test_invoice_tools --simple
```

## API Documentation

Invoice-generator.com API: https://invoice-generator.com/developers

**Key Features:**
- No authentication required for basic use
- Bearer token authentication for API key
- PDF generation in under 1 second
- Professional invoice templates
- Automatic calculations
- Multiple currency support

## Files Created

1. `app/tools/invoicing/__init__.py`
2. `app/tools/invoicing/invoice_generator.py` - API client
3. `app/tools/invoicing/invoice_operations.py` - Tool operations
4. `app/tools/invoicing/invoice_tools.py` - LLM tool definitions
5. `app/examples/test_invoice_tools.py` - Test suite

## Files Modified

1. `app/config.py` - Added invoice API key config
2. `app/tools/tool_definitions.py` - Added invoice tools
3. `app/tools/tool_executor.py` - Added invoice execution
4. `.env` - API key configured

## Benefits

✅ Works with Claude, OpenAI, and local LLMs
✅ Professional PDF invoices via API
✅ Template system for recurring invoices
✅ Comprehensive customization options
✅ Automatic calculations (tax, discounts, totals)
✅ Multi-currency support
✅ Free tier: 100 invoices/month
✅ Fast generation (< 1 second)
✅ No complex PDF libraries needed

## Next Steps

To use the invoice tools:

1. **API Key is already configured** in `.env`
2. **Run test** to verify:
   ```bash
   python -m app.examples.test_invoice_tools --simple
   ```
3. **Create templates** for your company info
4. **Use with any LLM** - tools are now available through `get_all_tools()`

## Future Enhancements

Potential additions:
- Recurring invoice automation
- Invoice status tracking
- Payment reminders
- Multiple template designs
- Batch invoice generation
- Invoice history/archive
- Export to accounting software
- Email delivery integration
