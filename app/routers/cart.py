"""
Cart router - handles shopping cart operations (JSON API).
"""
import logging
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.cart_service import CartService
from app.models import Product, Voucher, VoucherUsage
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cart", tags=["cart"])


class CartItemRequest(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemResponse(BaseModel):
    product_id: int
    product_name: str
    product_price: float
    product_discount_price: Optional[float] = None
    is_on_sale: bool = False
    quantity: int
    subtotal: float
    image: Optional[str] = None
    available_stock: int = 0


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    subtotal: float
    total: float
    voucher_code: Optional[str] = None
    voucher_discount: Optional[float] = None


class ApplyVoucherRequest(BaseModel):
    voucher_code: str


class VoucherResponse(BaseModel):
    voucher_code: str
    description: str
    discount_type: str
    discount_value: float
    discount_amount: float
    new_total: float


@router.get("", response_model=CartResponse)
async def get_cart(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get shopping cart."""
    try:
        cart_items = CartService.get_cart_items(db, request, current_user)
        subtotal = CartService.get_cart_total(cart_items)
        
        items = []
        for item in cart_items:
            product = item["product"]
            quantity = item["quantity"]
            
            # Safely get attributes with defaults
            try:
                is_on_sale = product.is_on_sale if product.is_on_sale is not None else False
            except AttributeError:
                is_on_sale = False
            
            try:
                discount_price = product.product_discount_price
            except AttributeError:
                discount_price = None
            
            # Use discount price if sale is active
            if is_on_sale and discount_price is not None:
                price_to_use = float(discount_price)
            else:
                price_to_use = float(product.product_price)
            
            items.append(CartItemResponse(
                product_id=product.product_id,
                product_name=product.product_name,
                product_price=float(product.product_price),
                product_discount_price=float(discount_price) if discount_price is not None else None,
                is_on_sale=is_on_sale,
                quantity=quantity,
                subtotal=price_to_use * quantity,
                image=product.image if hasattr(product, 'image') else None,
                available_stock=product.product_quantity
            ))
        
        # Check for applied voucher and validate it
        applied_voucher = request.session.get("applied_voucher")
        voucher_code = None
        voucher_discount = 0.0
        total = subtotal
        
        if applied_voucher:
            voucher_code = applied_voucher.get("voucher_code")
            stored_discount = applied_voucher.get("discount_amount", 0)
            
            # Re-validate voucher against current cart
            voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code).first()
            if voucher and voucher.is_active:
                # Check minimum purchase requirement
                if voucher.min_purchase_amount and subtotal < float(voucher.min_purchase_amount):
                    # Cart total dropped below minimum, remove voucher
                    if "applied_voucher" in request.session:
                        del request.session["applied_voucher"]
                    voucher_code = None
                    voucher_discount = 0.0
                else:
                    # Voucher still valid, recalculate discount to ensure accuracy
                    if voucher.discount_type == "percentage":
                        recalculated_discount = subtotal * (float(voucher.discount_value) / 100)
                        if voucher.max_discount_amount:
                            recalculated_discount = min(recalculated_discount, float(voucher.max_discount_amount))
                    else:  # fixed_amount
                        recalculated_discount = min(float(voucher.discount_value), subtotal)
                    
                    voucher_discount = recalculated_discount
                    # Update session with recalculated discount
                    request.session["applied_voucher"]["discount_amount"] = voucher_discount
            else:
                # Voucher no longer valid, clear session
                if "applied_voucher" in request.session:
                    del request.session["applied_voucher"]
                voucher_code = None
                voucher_discount = 0.0
        
        if voucher_discount > 0:
            total = subtotal - voucher_discount
        
        return CartResponse(
            items=items,
            subtotal=subtotal,
            total=total,
            voucher_code=voucher_code,
            voucher_discount=voucher_discount
        )
    except Exception as e:
        logger.exception(f"Cart error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading cart: {str(e)}")


@router.post("/items")
async def add_to_cart(
    request: Request,
    item: CartItemRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add item to cart."""
    try:
        # Verify product exists
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")
        
        CartService.add_to_cart(db, request, item.product_id, item.quantity, current_user)
        return {"message": "Item added to cart"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/items/{product_id}")
async def update_cart_item(
    request: Request,
    product_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update cart item quantity."""
    try:
        if quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")
        
        CartService.update_quantity(db, request, product_id, quantity, current_user)
        return {"message": "Cart updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/items/{product_id}")
async def remove_from_cart(
    request: Request,
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Remove item from cart."""
    CartService.remove_from_cart(db, request, product_id, current_user)
    return {"message": "Item removed from cart"}


@router.delete("")
async def clear_cart(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Clear all items from cart."""
    CartService.clear_cart(db, request, current_user)
    return {"message": "Cart cleared"}


# =====================================================================
# VOUCHER ENDPOINTS
# =====================================================================

@router.post("/apply-voucher", response_model=VoucherResponse)
async def apply_voucher(
    voucher_request: ApplyVoucherRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Apply a voucher code to the cart."""
    voucher_code = voucher_request.voucher_code.strip().upper()
    
    # Get voucher from database
    voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code).first()
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher code not found")
    
    # Check if voucher is active
    if not voucher.is_active:
        raise HTTPException(status_code=400, detail="This voucher is no longer active")
    
    # Check if voucher is expired - simplified comparison
    from datetime import datetime
    now = datetime.utcnow()
    
    # Convert to naive datetime for comparison
    valid_from = voucher.valid_from.replace(tzinfo=None) if voucher.valid_from.tzinfo else voucher.valid_from
    valid_until = voucher.valid_until.replace(tzinfo=None) if voucher.valid_until.tzinfo else voucher.valid_until
    
    if now < valid_from:
        raise HTTPException(status_code=400, detail="This voucher is not yet valid")
    if now > valid_until:
        raise HTTPException(status_code=400, detail="This voucher has expired")
    
    # Check usage limit
    if voucher.usage_limit and voucher.usage_count >= voucher.usage_limit:
        raise HTTPException(status_code=400, detail="This voucher has reached its usage limit")
    
    # Check if user has already used this voucher
    if current_user:
        existing_usage = db.query(VoucherUsage).filter(
            VoucherUsage.voucher_code == voucher_code,
            VoucherUsage.account_id == current_user.account_id
        ).first()
        
        if existing_usage:
            raise HTTPException(status_code=400, detail="You have already used this voucher")
    
    # Get cart subtotal
    cart_items = CartService.get_cart_items(db, request, current_user)
    subtotal = CartService.get_cart_total(cart_items)
    
    if subtotal == 0:
        raise HTTPException(status_code=400, detail="Cannot apply voucher to an empty cart")
    
    # Check minimum purchase amount
    if voucher.min_purchase_amount and subtotal < float(voucher.min_purchase_amount):
        raise HTTPException(
            status_code=400,
            detail=f"Minimum purchase of ₱{voucher.min_purchase_amount:,.2f} required for this voucher"
        )
    
    # Calculate discount
    if voucher.discount_type == "percentage":
        discount_amount = subtotal * (float(voucher.discount_value) / 100)
        # Apply max discount cap if specified
        if voucher.max_discount_amount:
            discount_amount = min(discount_amount, float(voucher.max_discount_amount))
    else:  # fixed_amount
        discount_amount = float(voucher.discount_value)
        # Discount cannot exceed subtotal
        discount_amount = min(discount_amount, subtotal)
    
    # Store voucher in session
    request.session["applied_voucher"] = {
        "voucher_code": voucher_code,
        "discount_amount": discount_amount
    }
    
    new_total = subtotal - discount_amount
    
    return VoucherResponse(
        voucher_code=voucher_code,
        description=voucher.description,
        discount_type=voucher.discount_type,
        discount_value=float(voucher.discount_value),
        discount_amount=discount_amount,
        new_total=new_total
    )


@router.delete("/remove-voucher")
async def remove_voucher(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Remove applied voucher from cart."""
    if "applied_voucher" in request.session:
        del request.session["applied_voucher"]
    
    return {"message": "Voucher removed"}


@router.get("/voucher-info")
async def get_voucher_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get currently applied voucher information."""
    applied_voucher = request.session.get("applied_voucher")
    
    if not applied_voucher:
        return {"voucher_applied": False}
    
    voucher_code = applied_voucher["voucher_code"]
    voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code).first()
    
    if not voucher:
        # Voucher deleted, clear from session
        del request.session["applied_voucher"]
        return {"voucher_applied": False}
    
    return {
        "voucher_applied": True,
        "voucher_code": voucher_code,
        "description": voucher.description,
        "discount_amount": applied_voucher["discount_amount"]
    }

