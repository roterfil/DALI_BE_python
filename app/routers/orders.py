"""
Orders router - handles order viewing and management (JSON API).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user_required
from app.services.order_service import OrderService
from app.schemas import OrderResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
async def get_user_orders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Get all orders for current user."""
    return current_user.orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Get order details by ID."""
    order = OrderService.get_order_by_id(db, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Security check - user can only view their own orders
    if order.account.email != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Cancel an order."""
    try:
        OrderService.cancel_order(db, order_id, current_user.email)
        return {"message": "Order cancelled successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
