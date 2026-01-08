"""
Invoice tool definitions for LLM integration.

Provides tool schemas and execution functions for invoice generation.
Works with any LLM provider through the abstract connector pattern.
"""

import logging
from typing import Dict, Any, List
from app.tools.invoicing.invoice_operations import invoice_operations_tool

logger = logging.getLogger(__name__)


# Tool definitions compatible with any LLM provider
INVOICE_TOOLS = [
    {
        "name": "generate_invoice",
        "description": "Generate a professional invoice PDF using invoice-generator.com API. Creates invoices with line items, tax, discounts, and company branding.",
        "input_schema": {
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "Path where invoice PDF should be saved (e.g., 'invoices/INV-001.pdf')"
                },
                "from_name": {
                    "type": "string",
                    "description": "Your company/sender name"
                },
                "to_name": {
                    "type": "string",
                    "description": "Client/recipient name"
                },
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Item/service name"
                            },
                            "quantity": {
                                "type": "number",
                                "description": "Quantity"
                            },
                            "unit_cost": {
                                "type": "number",
                                "description": "Price per unit"
                            }
                        },
                        "required": ["name", "quantity", "unit_cost"]
                    },
                    "description": "List of invoice line items"
                },
                "from_address": {
                    "type": "string",
                    "description": "Your company address"
                },
                "from_email": {
                    "type": "string",
                    "description": "Your company email"
                },
                "from_phone": {
                    "type": "string",
                    "description": "Your company phone"
                },
                "to_address": {
                    "type": "string",
                    "description": "Client address"
                },
                "to_email": {
                    "type": "string",
                    "description": "Client email"
                },
                "invoice_number": {
                    "type": "string",
                    "description": "Invoice number (auto-generated if not provided)"
                },
                "date": {
                    "type": "string",
                    "description": "Invoice date in YYYY-MM-DD format (defaults to today)"
                },
                "due_date": {
                    "type": "string",
                    "description": "Payment due date in YYYY-MM-DD format"
                },
                "notes": {
                    "type": "string",
                    "description": "Additional notes to include on invoice"
                },
                "terms": {
                    "type": "string",
                    "description": "Payment terms (e.g., 'Net 30', 'Due on receipt')"
                },
                "currency": {
                    "type": "string",
                    "description": "Currency code (e.g., USD, EUR, GBP). Default: USD"
                },
                "tax_rate": {
                    "type": "number",
                    "description": "Tax percentage (e.g., 10 for 10%). Default: 0"
                },
                "discount_rate": {
                    "type": "number",
                    "description": "Discount percentage. Default: 0"
                },
                "shipping": {
                    "type": "number",
                    "description": "Shipping cost. Default: 0"
                },
                "logo_url": {
                    "type": "string",
                    "description": "URL to company logo image"
                },
                "template_name": {
                    "type": "string",
                    "description": "Optional template name to use for default values"
                }
            },
            "required": ["output_path", "from_name", "to_name", "items"]
        }
    },
    {
        "name": "save_invoice_template",
        "description": "Save an invoice template with default values for reuse. Templates can include company info, payment terms, and styling preferences.",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_name": {
                    "type": "string",
                    "description": "Name for the template"
                },
                "template_data": {
                    "type": "object",
                    "description": "Template data including default values (from_name, from_address, terms, currency, tax_rate, etc.)"
                }
            },
            "required": ["template_name", "template_data"]
        }
    },
    {
        "name": "load_invoice_template",
        "description": "Load a saved invoice template to view its contents.",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_name": {
                    "type": "string",
                    "description": "Name of the template to load"
                }
            },
            "required": ["template_name"]
        }
    },
    {
        "name": "list_invoice_templates",
        "description": "List all available invoice templates.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]


# Mapping of tool names to their implementation functions
INVOICE_TOOL_FUNCTION_MAP = {
    "generate_invoice": invoice_operations_tool.generate_invoice,
    "save_invoice_template": invoice_operations_tool.save_template,
    "load_invoice_template": invoice_operations_tool.load_template,
    "list_invoice_templates": invoice_operations_tool.list_templates,
}


async def execute_invoice_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an invoice tool.

    This is a generic function that works with any LLM provider.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool

    Returns:
        Result dictionary from the tool execution
    """
    try:
        if tool_name not in INVOICE_TOOL_FUNCTION_MAP:
            return {
                "success": False,
                "error": f"Unknown invoice tool: {tool_name}"
            }

        logger.info(f"Executing invoice tool: {tool_name}")

        # Get the tool function and execute it
        tool_func = INVOICE_TOOL_FUNCTION_MAP[tool_name]
        result = await tool_func(**tool_input)

        logger.info(f"Invoice tool {tool_name} completed: {result.get('success', False)}")
        return result

    except Exception as e:
        logger.error(f"Error executing invoice tool {tool_name}: {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Tool execution error: {str(e)}"
        }
