"""
Admin router - handles admin panel functionality (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_admin, verify_password
from app.models import Product, Order, AdminAccount, ShippingStatus, Account
from app.schemas import OrderResponse, ProductResponse, LoginRequest
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminLoginResponse(BaseModel):
    message: str
    admin_email: str


class UpdateStockRequest(BaseModel):
    quantity: int


class UpdateStatusRequest(BaseModel):
    status: ShippingStatus


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
        admin_email=admin.account_email
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
    
    product.product_quantity = stock_data.quantity
    db.commit()
    
    return {"message": "Stock updated", "product_id": product_id, "quantity": stock_data.quantity}


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
        OrderService.update_shipping_status(db, order_id, status_data.status)
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
    
    return {
        "total_orders": total_orders,
        "total_products": total_products,
        "pending_orders": pending_orders,
        "total_revenue": float(total_revenue)
    }
