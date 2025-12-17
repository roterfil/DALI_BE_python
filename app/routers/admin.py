"""
Admin router - handles admin panel functionality (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_admin, verify_password
import json
from app.models import Product, Order, AdminAccount, ShippingStatus, Account, AuditLog
from app.schemas import OrderResponse, ProductResponse, LoginRequest
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminLoginResponse(BaseModel):
    message: str
    admin_email: str
    is_super_admin: bool = False


class UpdateStockRequest(BaseModel):
    quantity: int


class UpdatePriceRequest(BaseModel):
    price: float


class UpdateStatusRequest(BaseModel):
    status: ShippingStatus
    notes: str = None


class AuditLogResponse(BaseModel):
    audit_id: int
    actor_email: str
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    created_at: Optional[str]


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Admin login."""
    admin = db.query(AdminAccount).filter(
        AdminAccount.account_email == credentials.email
    ).first()
    
    if not admin or not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    request.session["admin_email"] = admin.account_email
    return AdminLoginResponse(
        message="Login successful",
        admin_email=admin.account_email,
        is_super_admin=getattr(admin, 'is_super_admin', False)
    )


@router.post("/logout")
async def admin_logout(request: Request):
    """Admin logout."""
    request.session.pop("admin_email", None)
    return {"message": "Logged out successfully"}


@router.get("/inventory", response_model=List[ProductResponse])
async def get_inventory(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get all products in inventory."""
    query = db.query(Product)
    
    if search and category:
        query = query.filter(
            Product.product_name.ilike(f"%{search}%"),
            Product.product_category == category
        )
    elif search:
        query = query.filter(Product.product_name.ilike(f"%{search}%"))
    elif category:
        query = query.filter(Product.product_category == category)
    
    products = query.all()
    return products


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product_detail(
    product_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get product details."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}/stock")
async def update_stock(
    product_id: int,
    stock_data: UpdateStockRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Update product stock quantity."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    old_qty = product.product_quantity
    product.product_quantity = stock_data.quantity
    db.commit()

    # Audit log entry (include actor name when available)
    try:
        actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
        actor = db.query(Account).filter(Account.account_email == actor_email).first()
        actor_name = actor.full_name if actor else None
        audit_details = {'old_quantity': old_qty, 'new_quantity': stock_data.quantity}
        if actor_name:
            audit_details['actor_name'] = actor_name
        audit = AuditLog(
            actor_email=actor_email,
            action='UPDATE_STOCK',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps(audit_details)
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Stock updated", "product_id": product_id, "quantity": stock_data.quantity}


@router.put("/products/{product_id}/price")
async def update_price(
    product_id: int,
    price_data: UpdatePriceRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Update product price (super admin only)."""
    # Require super admin
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin privileges required")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_price = float(product.product_price)
    product.product_price = price_data.price
    db.commit()

    # Audit log entry (include actor name when available)
    try:
        actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
        actor = db.query(Account).filter(Account.account_email == actor_email).first()
        actor_name = actor.full_name if actor else None
        audit_details = {'old_price': old_price, 'new_price': float(product.product_price)}
        if actor_name:
            audit_details['actor_name'] = actor_name
        audit = AuditLog(
            actor_email=actor_email,
            action='UPDATE_PRICE',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps(audit_details)
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Price updated", "product_id": product_id, "old_price": old_price, "new_price": float(product.product_price)}


@router.get("/orders", response_model=List[OrderResponse])
async def get_all_orders(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get all orders."""
    if search:
        # Search by order ID, customer name, or email
        orders = db.query(Order).join(Order.account).filter(
            or_(
                Order.order_id == int(search) if search.isdigit() else False,
                Account.account_first_name.ilike(f"%{search}%"),
                Account.account_last_name.ilike(f"%{search}%"),
                Account.account_email.ilike(f"%{search}%")
            )
        ).order_by(desc(Order.created_at)).all()
    else:
        orders = db.query(Order).order_by(desc(Order.created_at)).all()
    
    return orders


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get order details."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_data: UpdateStatusRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Update order shipping status."""
    from app.services.order_service import OrderService
    try:
        OrderService.update_shipping_status(db, order_id, status_data.status, status_data.notes)
        return {"message": "Status updated", "order_id": order_id, "status": status_data.status.value}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get dashboard statistics."""
    total_orders = db.query(Order).count()
    total_products = db.query(Product).count()
    pending_orders = db.query(Order).filter(
        Order.shipping_status == ShippingStatus.PROCESSING
    ).count()
    
    # Calculate total revenue
    from sqlalchemy import func
    total_revenue = db.query(func.sum(Order.total_price)).filter(
        Order.payment_status == "PAID"
    ).scalar() or 0
    # Active orders = processing, preparing, in transit
    active_orders = db.query(Order).filter(
        Order.shipping_status.in_([
            ShippingStatus.PROCESSING,
            ShippingStatus.PREPARING_FOR_SHIPMENT,
            ShippingStatus.IN_TRANSIT
        ])
    ).count()

    # Completed orders = delivered or collected
    completed_orders = db.query(Order).filter(
        Order.shipping_status.in_([
            ShippingStatus.DELIVERED,
            ShippingStatus.COLLECTED
        ])
    ).count()

    # Cancelled orders
    cancelled_orders = db.query(Order).filter(
        Order.shipping_status == ShippingStatus.CANCELLED
    ).count()

    return {
        "total_orders": total_orders,
        "total_products": total_products,
        "pending_orders": pending_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "total_revenue": float(total_revenue)
    }



@router.get("/audit", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: Optional[int] = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Retrieve recent audit log entries (admin access)."""
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    logs = query.all()
    # Convert datetime to ISO string for response_model compatibility
    result = []
    for l in logs:
        result.append(AuditLogResponse(
            audit_id=l.audit_id,
            actor_email=l.actor_email,
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            details=l.details,
            created_at=l.created_at.isoformat() if l.created_at else None
        ))
    return result
