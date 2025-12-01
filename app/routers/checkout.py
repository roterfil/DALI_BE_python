"""
Checkout router - handles multi-step checkout process (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user_required
from app.models import Address, Store
from app.services.cart_service import CartService
from app.services.shipping_service import ShippingService
from app.services.order_service import OrderService
from app.services.maya_service import MayaService
from pydantic import BaseModel

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


class CheckoutAddressRequest(BaseModel):
    address_id: int


class CheckoutShippingRequest(BaseModel):
    delivery_method: str  # "Standard Delivery", "Priority Delivery", "Pickup Delivery"
    store_id: Optional[int] = None


class CheckoutPaymentRequest(BaseModel):
    payment_method: str  # "Cash on delivery (COD)", "Maya", "Credit/Debit Card"


class CheckoutDetailsResponse(BaseModel):
    address_id: Optional[int] = None
    delivery_method: Optional[str] = None
    shipping_fee: float = 0.0
    store_id: Optional[int] = None
    payment_method: Optional[str] = None


def get_checkout_details(request: Request) -> dict:
    """Get or initialize checkout details from session."""
    if "checkoutDetails" not in request.session:
        request.session["checkoutDetails"] = {}
    return request.session["checkoutDetails"]


@router.get("/details", response_model=CheckoutDetailsResponse)
async def get_checkout_session(request: Request):
    """Get current checkout session details."""
    details = get_checkout_details(request)
    return CheckoutDetailsResponse(**details)


@router.post("/address")
async def set_address(
    request: Request,
    address_data: CheckoutAddressRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Set delivery address for checkout."""
    # Verify address belongs to user
    address = db.query(Address).filter(
        Address.address_id == address_data.address_id,
        Address.account_id == current_user.account_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    checkout_details = get_checkout_details(request)
    checkout_details["addressId"] = address_data.address_id
    request.session["checkoutDetails"] = checkout_details
    
    return {"message": "Address selected", "address_id": address_data.address_id}


@router.post("/shipping")
async def set_shipping(
    request: Request,
    shipping_data: CheckoutShippingRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Set delivery method and calculate shipping fee."""
    checkout_details = get_checkout_details(request)
    
    if not checkout_details.get("addressId"):
        raise HTTPException(status_code=400, detail="Please select an address first")
    
    if shipping_data.delivery_method == "Pickup Delivery":
        if not shipping_data.store_id:
            raise HTTPException(status_code=400, detail="Please select a pickup store")
        
        # Verify store exists
        store = db.query(Store).filter(Store.store_id == shipping_data.store_id).first()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        checkout_details["storeId"] = shipping_data.store_id
        checkout_details["shippingFee"] = 0.0
    else:
        checkout_details.pop("storeId", None)
        address_id = checkout_details.get("addressId")
        address = db.query(Address).filter(Address.address_id == address_id).first()
        checkout_details["shippingFee"] = ShippingService.calculate_shipping_fee(
            address, shipping_data.delivery_method
        )
    
    checkout_details["deliveryMethod"] = shipping_data.delivery_method
    request.session["checkoutDetails"] = checkout_details
    
    return {
        "message": "Shipping method selected",
        "delivery_method": shipping_data.delivery_method,
        "shipping_fee": checkout_details["shippingFee"]
    }


@router.post("/payment")
async def process_payment(
    request: Request,
    payment_data: CheckoutPaymentRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Process payment and create order."""
    checkout_details = get_checkout_details(request)
    
    if not checkout_details.get("deliveryMethod"):
        raise HTTPException(status_code=400, detail="Please select delivery method first")
    
    cart_items = CartService.get_cart_items(db, request, current_user)
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    checkout_details["paymentMethod"] = payment_data.payment_method
    request.session["checkoutDetails"] = checkout_details
    
    if payment_data.payment_method == "Cash on delivery (COD)":
        try:
            order = OrderService.create_order(db, request, current_user.email, checkout_details)
            request.session.pop("checkoutDetails", None)
            return {
                "success": True,
                "order_id": order.order_id,
                "message": "Order placed successfully"
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    elif payment_data.payment_method in ["Maya", "Credit/Debit Card"]:
        try:
            order = OrderService.create_pending_order(db, request, current_user.email, checkout_details)
            maya_response = await MayaService.create_checkout(order)
            OrderService.set_payment_transaction_id(db, order.order_id, maya_response["checkoutId"])
            return {
                "success": True,
                "order_id": order.order_id,
                "payment_url": maya_response["redirectUrl"],
                "message": "Redirecting to payment gateway"
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Payment gateway error: {str(e)}")
    
    raise HTTPException(status_code=400, detail="Invalid payment method")


@router.get("/calculate-shipping")
async def calculate_shipping(
    request: Request,
    address_id: int,
    delivery_method: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Calculate shipping fee for given address and delivery method."""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.account_id == current_user.account_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    if delivery_method == "Pickup Delivery":
        shipping_fee = 0.0
    else:
        shipping_fee = ShippingService.calculate_shipping_fee(address, delivery_method)
    
    return {
        "delivery_method": delivery_method,
        "shipping_fee": shipping_fee
    }
