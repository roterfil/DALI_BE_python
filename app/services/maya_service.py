"""
Maya payment gateway integration service.
"""
import httpx
import base64
from typing import Dict
from app.core.config import settings
from app.models import Order


class MayaService:
    """Service for Maya payment gateway integration."""
    
    @staticmethod
    async def create_checkout(order: Order) -> Dict:
        """
        Create a Maya checkout session for an order.
        Returns checkout URL and checkout ID.
        """
        # Prepare checkout data
        checkout_data = {
            "totalAmount": {
                "value": float(order.total_price),
                "currency": "PHP"
            },
            "buyer": {
                "firstName": order.account.account_first_name or "Customer",
                "lastName": order.account.account_last_name or "",
                "email": order.account.email,
                "contact": {
                    "phone": order.account.phone_number or "+63"
                }
            },
            "items": [
                {
                    "name": item.product.product_name,
                    "quantity": item.quantity,
                    "amount": {
                        "value": float(item.product.product_price),
                        "currency": "PHP"
                    },
                    "totalAmount": {
                        "value": float(item.product.product_price) * item.quantity,
                        "currency": "PHP"
                    }
                }
                for item in order.order_items
            ],
            "redirectUrl": {
                "success": f"{settings.PAYMENT_SUCCESS_URL}?orderId={order.order_id}",
                "failure": f"{settings.PAYMENT_FAILURE_URL}?orderId={order.order_id}",
                "cancel": f"{settings.PAYMENT_CANCEL_URL}?orderId={order.order_id}"
            },
            "requestReferenceNumber": str(order.order_id)
        }
        
        # Prepare auth header
        auth_string = f"{settings.MAYA_PUBLIC_KEY}:"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth_b64}"
        }
        
        # Make API request
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.MAYA_BASE_URL}/checkout/v1/checkouts",
                json=checkout_data,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Maya API error: {response.text}")
            
            result = response.json()
            
            return {
                "checkoutId": result.get("checkoutId"),
                "redirectUrl": result.get("redirectUrl")
            }
