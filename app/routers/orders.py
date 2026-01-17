"""
Orders router - handles order viewing and management (JSON API).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user_required
from app.services.order_service import OrderService
from app.schemas import OrderResponse
from app.models import Order, OrderItem, OrderPickup

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
async def get_user_orders(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Get all orders for current user."""
    orders = db.query(Order).options(
        joinedload(Order.account),
        joinedload(Order.address),
        joinedload(Order.order_items).joinedload(OrderItem.product),
        joinedload(Order.order_pickup).joinedload(OrderPickup.store),
        joinedload(Order.order_history)
    ).filter(Order.account_id == current_user.account_id).order_by(Order.created_at.desc()).all()
    return orders


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
    if order.account_id != current_user.account_id:
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


@router.post("/{order_id}/mark-collected")
async def mark_order_collected(
    order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Mark a pickup order as collected by the customer."""
    from app.models import OrderHistory, ShippingStatus
    from app.core.timezone import get_philippine_time
    
    order = OrderService.get_order_by_id(db, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Security check - user can only collect their own orders
    if order.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if order is pickup delivery
    if order.delivery_method != "Pickup Delivery":
        raise HTTPException(status_code=400, detail="This is not a pickup order")
    
    # Check if order is ready for pickup
    if order.shipping_status != ShippingStatus.READY_FOR_PICKUP:
        raise HTTPException(status_code=400, detail="Order is not ready for pickup yet")
    
    # Mark as collected
    order.shipping_status = ShippingStatus.COLLECTED
    order.updated_at = get_philippine_time()
    
    # Create order history record
    history = OrderHistory(
        order_id=order_id,
        status=ShippingStatus.COLLECTED,
        notes="Order collected by customer"
    )
    db.add(history)
    db.commit()
    
    return {"message": "Order marked as collected successfully"}
