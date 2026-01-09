"""
Invoice operations tool for generating professional invoices.

Provides invoice generation functionality using invoice-generator.com API.
"""

import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
import json
from app.tools.invoicing.invoice_generator import InvoiceGeneratorClient, create_invoice_data
from app.config import settings

logger = logging.getLogger(__name__)


class InvoiceOperationsTool:
    """Tool for generating invoices using invoice-generator.com API."""

    def __init__(self):
        """Initialize the invoice operations tool."""
        self.api_key = getattr(settings, 'invoice_gen_api_key', None)
        if self.api_key:
            self.client = InvoiceGeneratorClient(self.api_key)
        else:
            self.client = None
            logger.warning("INVOICE_GEN_API_KEY not configured")

        # Directory for storing invoice templates
        self.templates_dir = Path("app/tools/invoicing/templates").absolute()
        self.templates_dir.mkdir(parents=True, exist_ok=True)

        # Default directory for generated invoices (at project root)
        # Get the backend directory (3 levels up from this file)
        backend_dir = Path(__file__).parent.parent.parent.parent
        self.invoices_dir = (backend_dir / "generated_invoices").absolute()
        self.invoices_dir.mkdir(parents=True, exist_ok=True)

    async def generate_invoice(
        self,
        output_path: str,
        from_name: str,
        to_name: str,
        items: List[Dict[str, Any]],
        from_address: Optional[str] = None,
        from_email: Optional[str] = None,
        from_phone: Optional[str] = None,
        to_address: Optional[str] = None,
        to_email: Optional[str] = None,
        invoice_number: Optional[str] = None,
        date: Optional[str] = None,
        due_date: Optional[str] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        currency: str = "USD",
        tax_rate: float = 0.0,
        discount_rate: float = 0.0,
        shipping: float = 0.0,
        logo_url: Optional[str] = None,
        template_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate an invoice PDF.

        Args:
            output_path: Path where invoice PDF should be saved
            from_name: Sender/Company name
            to_name: Recipient/Client name
            items: List of line items [{"name": "Item", "quantity": 1, "unit_cost": 100}]
            from_address: Sender address
            from_email: Sender email
            from_phone: Sender phone
            to_address: Recipient address
            to_email: Recipient email
            invoice_number: Invoice number (auto-generated if not provided)
            date: Invoice date (YYYY-MM-DD, defaults to today)
            due_date: Payment due date (YYYY-MM-DD)
            notes: Additional notes on invoice
            terms: Payment terms
            currency: Currency code (default: USD)
            tax_rate: Tax percentage (e.g., 10 for 10%)
            discount_rate: Discount percentage
            shipping: Shipping cost
            logo_url: URL to company logo
            template_name: Optional template name to use

        Returns:
            Dictionary with operation result
        """
        try:
            if not self.client:
                return {
                    "success": False,
                    "error": "Invoice Generator API key not configured. Set INVOICE_GEN_API_KEY in .env"
                }

            # Build sender info
            from_info = {"name": from_name}
            if from_address:
                from_info["address"] = from_address
            if from_email:
                from_info["email"] = from_email
            if from_phone:
                from_info["phone"] = from_phone

            # Build recipient info
            to_info = {"name": to_name}
            if to_address:
                to_info["address"] = to_address
            if to_email:
                to_info["email"] = to_email

            # Handle output path
            from datetime import datetime

            # Check if output_path is just a filename (no directory separators)
            output_path_obj = Path(output_path) if output_path else None

            # Auto-generate filename if no path or just a simple filename
            if not output_path or output_path.endswith('/'):
                # Sanitize sender name for filename
                safe_sender = "".join(c for c in from_name if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_sender = safe_sender.replace(' ', '_')[:30]  # Limit to 30 chars
                # Sanitize recipient name for filename
                safe_recipient = "".join(c for c in to_name if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_recipient = safe_recipient.replace(' ', '_')[:30]  # Limit to 30 chars
                date_str = datetime.now().strftime('%d_%m_%Y')
                filename = f"Invoice_{safe_sender}_{safe_recipient}_{date_str}.pdf"
                output_path = str(self.invoices_dir / filename)
                logger.info(f"Auto-generated filename: {filename}")
            elif output_path_obj and len(output_path_obj.parts) == 1:
                # Just a filename without directory - prepend default directory
                output_path = str(self.invoices_dir / output_path)
                logger.info(f"Prepended default directory to filename: {output_path}")
            else:
                # Full path provided - ensure it's absolute
                output_path_obj = Path(output_path)
                if not output_path_obj.is_absolute():
                    # Relative path - resolve relative to backend directory
                    backend_dir = Path(__file__).parent.parent.parent.parent
                    output_path = str((backend_dir / output_path).resolve())
                    logger.info(f"Resolved relative path to: {output_path}")
                else:
                    output_path = str(output_path_obj)
                    logger.info(f"Using absolute path: {output_path}")

            # Load template if specified
            template_data = None
            if template_name:
                template_result = await self.load_template(template_name)
                if template_result.get("success"):
                    template_data = template_result.get("template")
                    logger.info(f"Using template: {template_name}")

            # Create invoice data
            invoice_data = create_invoice_data(
                from_info=from_info,
                to_info=to_info,
                items=items,
                invoice_number=invoice_number,
                date=date,
                due_date=due_date,
                notes=notes,
                terms=terms,
                currency=currency,
                logo_url=logo_url,
                tax_rate=tax_rate,
                discount_rate=discount_rate,
                shipping=shipping
            )

            # Merge template data if available
            if template_data:
                # Template data overrides defaults but not explicit parameters
                for key, value in template_data.items():
                    if key not in invoice_data or not invoice_data[key]:
                        invoice_data[key] = value

            # Generate invoice via API
            result = await self.client.generate_invoice(
                invoice_data=invoice_data,
                output_path=output_path,
                template=template_name
            )

            return result

        except Exception as e:
            logger.error(f"Error generating invoice: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def save_template(
        self,
        template_name: str,
        template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save an invoice template for reuse.

        Args:
            template_name: Name for the template
            template_data: Template data (defaults for invoice generation)

        Returns:
            Dictionary with operation result
        """
        try:
            template_path = self.templates_dir / f"{template_name}.json"

            with open(template_path, 'w') as f:
                json.dump(template_data, f, indent=2)

            return {
                "success": True,
                "path": str(template_path),
                "message": f"Template '{template_name}' saved successfully"
            }

        except Exception as e:
            logger.error(f"Error saving template: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def load_template(
        self,
        template_name: str
    ) -> Dict[str, Any]:
        """
        Load an invoice template.

        Args:
            template_name: Name of the template to load

        Returns:
            Dictionary with template data
        """
        try:
            template_path = self.templates_dir / f"{template_name}.json"

            if not template_path.exists():
                return {
                    "success": False,
                    "error": f"Template '{template_name}' not found"
                }

            with open(template_path, 'r') as f:
                template_data = json.load(f)

            return {
                "success": True,
                "template": template_data,
                "path": str(template_path),
                "message": f"Template '{template_name}' loaded successfully"
            }

        except Exception as e:
            logger.error(f"Error loading template: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def list_templates(self) -> Dict[str, Any]:
        """
        List all available invoice templates.

        Returns:
            Dictionary with list of templates
        """
        try:
            templates = []

            if self.templates_dir.exists():
                for template_file in self.templates_dir.glob("*.json"):
                    templates.append({
                        "name": template_file.stem,
                        "path": str(template_file)
                    })

            return {
                "success": True,
                "templates": templates,
                "count": len(templates),
                "message": f"Found {len(templates)} template(s)"
            }

        except Exception as e:
            logger.error(f"Error listing templates: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
invoice_operations_tool = InvoiceOperationsTool()
