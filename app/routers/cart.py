"""
Cart router - handles shopping cart operations (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
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
        
        return CartResponse(
            items=items,
            subtotal=subtotal,
            total=subtotal
        )
    except Exception as e:
        print(f"Cart error: {str(e)}")
        import traceback
        traceback.print_exc()
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
