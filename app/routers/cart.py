"""
Cart router - handles shopping cart operations (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.cart_service import CartService
from app.models import Product
from pydantic import BaseModel

router = APIRouter(prefix="/api/cart", tags=["cart"])


class CartItemRequest(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemResponse(BaseModel):
    product_id: int
    product_name: str
    product_price: float
    quantity: int
    subtotal: float
    image: str = None


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    subtotal: float
    total: float


@router.get("", response_model=CartResponse)
async def get_cart(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get shopping cart."""
    cart_items = CartService.get_cart_items(db, request, current_user)
    subtotal = CartService.get_cart_total(cart_items)
    
    items = []
    for item in cart_items:
        product = item["product"]
        quantity = item["quantity"]
        items.append(CartItemResponse(
            product_id=product.product_id,
            product_name=product.product_name,
            product_price=float(product.product_price),
            quantity=quantity,
            subtotal=float(product.product_price) * quantity,
            image=product.image
        ))
    
    return CartResponse(
        items=items,
        subtotal=subtotal,
        total=subtotal  # Will add shipping in checkout
    )


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
