"""
Invoice Generator API Client.

Integrates with invoice-generator.com API to generate professional invoices.
API Documentation: https://invoice-generator.com/developers
"""

import logging
import httpx
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class InvoiceGeneratorClient:
    """Client for invoice-generator.com API."""

    def __init__(self, api_key: str):
        """
        Initialize the invoice generator client.

        Args:
            api_key: API key for invoice-generator.com
        """
        self.api_key = api_key
        self.base_url = "https://invoice-generator.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    async def generate_invoice(
        self,
        invoice_data: Dict[str, Any],
        output_path: str,
        template: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate an invoice PDF using the API.

        Args:
            invoice_data: Invoice data matching invoice-generator.com schema
            output_path: Path where PDF should be saved
            template: Optional template name/path

        Returns:
            Dictionary with operation result
        """
        try:
            logger.info("Generating invoice via invoice-generator.com API")

            # Prepare the request data
            request_data = invoice_data.copy()

            # If template is provided, merge it with invoice data
            if template:
                # Template will be merged when you provide it
                logger.info(f"Using template: {template}")

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Call the invoice generator API
                response = await client.post(
                    f"{self.base_url}",
                    headers=self.headers,
                    json=request_data
                )

                if response.status_code == 200:
                    # Save the PDF
                    output_file = Path(output_path).resolve()
                    output_file.parent.mkdir(parents=True, exist_ok=True)

                    with open(output_file, 'wb') as f:
                        f.write(response.content)

                    file_size = output_file.stat().st_size

                    logger.info(f"Invoice generated successfully: {output_file}")

                    return {
                        "success": True,
                        "path": str(output_file),
                        "size": file_size,
                        "size_human": self._format_size(file_size),
                        "message": f"Successfully generated invoice: {output_file.name}"
                    }
                else:
                    error_msg = f"API returned status {response.status_code}: {response.text}"
                    logger.error(error_msg)
                    return {
                        "success": False,
                        "error": error_msg
                    }

        except httpx.TimeoutException:
            error_msg = "Request timed out while generating invoice"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            error_msg = f"Error generating invoice: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }

    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"


def create_invoice_data(
    from_info: Dict[str, str],
    to_info: Dict[str, str],
    items: List[Dict[str, Any]],
    invoice_number: Optional[str] = None,
    date: Optional[str] = None,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    terms: Optional[str] = None,
    currency: str = "USD",
    logo_url: Optional[str] = None,
    tax_rate: float = 0.0,
    discount_rate: float = 0.0,
    shipping: float = 0.0
) -> Dict[str, Any]:
    """
    Helper function to create properly formatted invoice data.

    Args:
        from_info: Sender information (name, address, email, phone, etc.)
        to_info: Recipient information (name, address, email, etc.)
        items: List of line items with name, quantity, unit_cost
        invoice_number: Invoice number (auto-generated if not provided)
        date: Invoice date (today if not provided)
        due_date: Payment due date
        notes: Additional notes
        terms: Payment terms
        currency: Currency code (default: USD)
        logo_url: URL to company logo
        tax_rate: Tax percentage (e.g., 10 for 10%)
        discount_rate: Discount percentage
        shipping: Shipping cost

    Returns:
        Dictionary formatted for invoice-generator.com API
    """
    # Auto-generate invoice number if not provided
    if not invoice_number:
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Use today's date if not provided
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    # Build the invoice data structure
    invoice_data = {
        "from": from_info.get("name", ""),
        "to": to_info.get("name", ""),
        "logo": logo_url or "",
        "number": invoice_number,
        "date": date,
        "payment_terms": terms or "",
        "due_date": due_date or "",
        "items": [],
        "fields": {
            "tax": "%",
            "discounts": False,
            "shipping": False
        },
        "tax": tax_rate,
        "notes": notes or "",
        "terms": terms or "",
        "currency": currency
    }

    # Add sender address details
    if "address" in from_info:
        invoice_data["from"] += f"\n{from_info['address']}"
    if "city" in from_info:
        invoice_data["from"] += f"\n{from_info['city']}"
    if "state" in from_info:
        invoice_data["from"] += f", {from_info['state']}"
    if "zip" in from_info:
        invoice_data["from"] += f" {from_info['zip']}"
    if "country" in from_info:
        invoice_data["from"] += f"\n{from_info['country']}"
    if "email" in from_info:
        invoice_data["from"] += f"\n{from_info['email']}"
    if "phone" in from_info:
        invoice_data["from"] += f"\n{from_info['phone']}"

    # Add recipient address details
    if "address" in to_info:
        invoice_data["to"] += f"\n{to_info['address']}"
    if "city" in to_info:
        invoice_data["to"] += f"\n{to_info['city']}"
    if "state" in to_info:
        invoice_data["to"] += f", {to_info['state']}"
    if "zip" in to_info:
        invoice_data["to"] += f" {to_info['zip']}"
    if "country" in to_info:
        invoice_data["to"] += f"\n{to_info['country']}"
    if "email" in to_info:
        invoice_data["to"] += f"\n{to_info['email']}"

    # Add line items
    for item in items:
        invoice_data["items"].append({
            "name": item.get("name", ""),
            "quantity": item.get("quantity", 1),
            "unit_cost": item.get("unit_cost", 0)
        })

    # Add optional fields
    if discount_rate > 0:
        invoice_data["fields"]["discounts"] = True
        invoice_data["discounts"] = discount_rate

    if shipping > 0:
        invoice_data["fields"]["shipping"] = True
        invoice_data["shipping"] = shipping

    return invoice_data
