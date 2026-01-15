"""
Admin router - handles admin panel functionality (JSON API).

Permission Structure:
- ALL ADMINS can:
  * View inventory (GET /inventory)
  * View product details (GET /products/{id})
  * Update stock quantities (PUT /products/{id}/stock)
  * View orders (GET /orders, GET /orders/{id})
  * View dashboard stats (GET /stats)
  * View audit logs (GET /audit)

- SUPER ADMINS ONLY can:
  * Create products (POST /products)
  * Update product details (PUT /products/{id})
  * Update product prices (PUT /products/{id}/price)
  * Update product discounts (PUT /products/{id}/discount)
  * Delete products (DELETE /products/{id})
  * Update order status (PUT /orders/{id}/status)
"""
from fastapi import APIRouter, Request, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, func, extract, String, cast
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_admin, verify_password
import json
import os
import uuid
from app.models import (
    Product, Order, AdminAccount, ShippingStatus, 
    Account, AuditLog, Voucher, VoucherUsage, OrderItem, OrderPickup
)
from app.schemas import OrderResponse, ProductResponse, LoginRequest, ProductCreate
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

# --- SCHEMAS ---
class UpdateDiscountRequest(BaseModel):
    product_discount_price: Optional[float] = None
    is_on_sale: bool

class AdminLoginResponse(BaseModel):
    message: str
    admin_email: str
    is_super_admin: bool = False

class UpdateStockRequest(BaseModel):
    quantity: int


class UpdatePriceRequest(BaseModel):
    price: float

@router.put("/products/{product_id}/price")
async def update_price(
    product_id: int,
    price_data: UpdatePriceRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Update product price (Super Admin only)."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin access required")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_price = float(product.product_price)
    new_price = price_data.price

    if old_price == new_price:
        return {"message": "No change", "product_id": product_id, "product_price": old_price}

    product.product_price = new_price
    # If discount price is set, ensure it is still less than new price
    if product.is_on_sale and product.product_discount_price is not None:
        if float(product.product_discount_price) >= new_price:
            raise HTTPException(status_code=400, detail="Discount price must be less than the new price.")

    db.commit()

    # Audit Log
    try:
        audit = AuditLog(
            actor_email=admin.account_email,
            action='UPDATE_PRICE',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps({'old_price': old_price, 'new_price': new_price})
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Price updated", "product_id": product_id, "product_price": float(product.product_price)}

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

class ProductUpdateRequest(BaseModel):
    product_name: Optional[str] = None
    product_description: Optional[str] = None
    product_category: Optional[str] = None
    product_subcategory: Optional[str] = None

# --- ENDPOINTS ---

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminAccount).filter(AdminAccount.account_email == credentials.email).first()
    
    if not admin or not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    request.session["admin_email"] = admin.account_email
    
    return AdminLoginResponse(
        message="Login successful",
        admin_email=admin.account_email,
        is_super_admin=getattr(admin, 'is_super_admin', False)
    )

@router.get("/inventory")
async def get_inventory(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get all products in global inventory."""
    query = db.query(Product)
    
    if search:
        query = query.filter(Product.product_name.ilike(f"%{search}%"))
    if category:
        query = query.filter(Product.product_category == category)
    if subcategory:
        query = query.filter(Product.product_subcategory == subcategory)
        
    results = query.all()
    products = []
    for row in results:
        products.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "product_description": row.product_description,
            "product_price": float(row.product_price),
            "product_category": row.product_category,
            "product_subcategory": row.product_subcategory,
            "product_quantity": row.product_quantity,
            "image": row.image,
            "is_on_sale": row.is_on_sale,
            "product_discount_price": float(row.product_discount_price) if row.product_discount_price else None
        })
    return products

@router.put("/products/{product_id}/stock")
async def update_stock(
    product_id: int,
    stock_data: UpdateStockRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Update global product stock quantity."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    old_qty = product.product_quantity
    new_qty = stock_data.quantity
    
    if old_qty == new_qty:
        return {"message": "No change", "product_id": product_id, "quantity": old_qty}
        
    product.product_quantity = new_qty
    db.commit()

    # Audit Log
    try:
        audit = AuditLog(
            actor_email=admin.account_email,
            action='UPDATE_STOCK',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps({'old_quantity': old_qty, 'new_quantity': new_qty})
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Stock updated", "product_id": product_id, "quantity": new_qty}


@router.put("/products/{product_id}/discount")
async def update_discount(
    product_id: int,
    discount_data: UpdateDiscountRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Update product discount (Super Admin only)."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin access required")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_discount = product.product_discount_price
    old_sale_status = product.is_on_sale
    
    product.is_on_sale = discount_data.is_on_sale
    
    # If the product is on sale, a discount price must be provided.
    if product.is_on_sale:
        if discount_data.product_discount_price is None:
            raise HTTPException(status_code=400, detail="Discount price is required when product is on sale.")
        
        # The discount price should be less than the original price.
        if discount_data.product_discount_price >= product.product_price:
            raise HTTPException(status_code=400, detail="Discount price must be less than the original price.")
            
        product.product_discount_price = discount_data.product_discount_price
    else:
        # If the product is not on sale, remove the discount price.
        product.product_discount_price = None

    db.commit()

    # Audit Log
    try:
        audit = AuditLog(
            actor_email=admin.account_email,
            action='UPDATE_DISCOUNT',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps({
                'old_discount': float(old_discount) if old_discount else None,
                'new_discount': float(product.product_discount_price) if product.product_discount_price else None,
                'old_sale_status': old_sale_status,
                'new_sale_status': product.is_on_sale
            })
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "message": "Discount updated",
        "product_id": product_id,
        "is_on_sale": product.is_on_sale,
        "product_discount_price": float(product.product_discount_price) if product.product_discount_price else None
    }


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    product_data: ProductUpdateRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Update product details (Super Admin only)."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin access required")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    # Audit Log
    try:
        audit = AuditLog(
            actor_email=admin.account_email,
            action='UPDATE_PRODUCT',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps(update_data)
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "message": "Product updated successfully",
        "product_id": product.product_id,
        "updated_fields": list(update_data.keys())
    }



@router.get("/stats")
async def get_dashboard_stats(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get overview statistics for the admin dashboard."""
    # Counts
    total_orders = db.query(Order).count()
    total_revenue = db.query(func.sum(Order.total_price)).scalar() or 0
    total_products = db.query(Product).count()
    total_customers = db.query(Account).count()
    
    # Recent orders with relationships loaded
    recent_orders = db.query(Order).options(
        joinedload(Order.account),
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).order_by(desc(Order.created_at)).limit(5).all()

    # Serialize recent orders using OrderResponse
    from app.schemas import OrderResponse
    serialized_recent_orders = [OrderResponse.from_orm(order).dict() for order in recent_orders]

    # Low stock
    low_stock_count = db.query(Product).filter(Product.product_quantity <= 10).count()

    return {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "total_products": total_products,
        "total_customers": total_customers,
        "recent_orders": serialized_recent_orders,
        "low_stock_count": low_stock_count
    }
@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    search: Optional[str] = None,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get list of all orders with search functionality."""
    # Base query with all relationships loaded for OrderCard components
    query = db.query(Order).options(
        joinedload(Order.account),
        joinedload(Order.order_items).joinedload(OrderItem.product)
    )

    if search:
        # Filter by Order ID or Customer Email
        query = query.join(Account).filter(
            or_(
                cast(Order.order_id, String).ilike(f"%{search}%"),
                Account.account_email.ilike(f"%{search}%")
            )
        )
    
    orders = query.order_by(desc(Order.created_at)).all()
    return orders

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_admin_order(
    order_id: int,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed view of a specific order."""
    order = db.query(Order).options(
        joinedload(Order.account),
        joinedload(Order.order_items).joinedload(OrderItem.product),
        joinedload(Order.pickup_details)
    ).filter(Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    return order

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_data: dict,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update order shipping status (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
        
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
        
    order.shipping_status = new_status
    order.updated_at = datetime.utcnow()
    
    # Log the status change
    log = AuditLog(
        admin_id=admin.admin_id,
        action="UPDATE",
        entity_type="Order",
        entity_id=order_id,
        details=f"Updated status to {new_status}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Order status updated to {new_status}"}

@router.get("/low-stock-products")
async def get_low_stock_products(db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    """Get products with quantity less than 10."""
    results = db.query(Product).filter(Product.product_quantity <= 10).all()
    return [{
        "product_id": p.product_id,
        "product_name": p.product_name,
        "quantity": p.product_quantity,
        "status": "out_of_stock" if p.product_quantity == 0 else "low_stock"
    } for p in results]


@router.get("/audit", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: Optional[int] = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Retrieve recent audit log entries (admin access).
    
    - Super admins see all audit logs (global)
    - Regular admins only see their own audit logs (their store's activities)
    """
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    
    # Filter for regular admins - only show their own actions
    if not getattr(admin, 'is_super_admin', False):
        actor_email = getattr(admin, 'account_email', None)
        if actor_email:
            query = query.filter(AuditLog.actor_email == actor_email)
    
    # Super admins see all logs (no filter applied)
    logs = query.limit(limit).all()
    
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


@router.get("/debug/store-orders/{store_id}")
async def debug_store_orders(
    store_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Debug endpoint to check orders for a specific store."""
    from app.models import OrderPickup
    
    # Get all order_pickups for this store
    pickups = db.query(OrderPickup).filter(OrderPickup.store_id == store_id).all()
    
    pickup_data = []
    for pickup in pickups:
        order = db.query(Order).filter(Order.order_id == pickup.order_id).first()
        if order:
            pickup_data.append({
                "order_id": order.order_id,
                "total_price": float(order.total_price),
                "payment_status": order.payment_status.value,
                "shipping_status": order.shipping_status.value,
                "created_at": order.created_at.isoformat() if order.created_at else None
            })
    
    return {
        "store_id": store_id,
        "total_pickups": len(pickups),
        "orders": pickup_data
    }


# =====================================================================
# VOUCHER MANAGEMENT ENDPOINTS (SUPER ADMIN ONLY)
# =====================================================================

class VoucherCreateRequest(BaseModel):
    voucher_code: str
    description: str
    discount_type: str  # "percentage" or "fixed_amount"
    discount_value: float
    min_purchase_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    valid_from: str  # ISO datetime string
    valid_until: str  # ISO datetime string
    usage_limit: Optional[int] = None
    is_active: bool = True


class VoucherUpdateRequest(BaseModel):
    description: Optional[str] = None
    discount_value: Optional[float] = None
    min_purchase_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/vouchers")
async def get_all_vouchers(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all vouchers (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    vouchers = db.query(Voucher).order_by(desc(Voucher.created_at)).all()
    
    voucher_list = []
    for voucher in vouchers:
        voucher_list.append({
            "voucher_code": voucher.voucher_code,
            "description": voucher.description,
            "discount_type": voucher.discount_type,
            "discount_value": float(voucher.discount_value),
            "min_purchase_amount": float(voucher.min_purchase_amount) if voucher.min_purchase_amount else None,
            "max_discount_amount": float(voucher.max_discount_amount) if voucher.max_discount_amount else None,
            "valid_from": voucher.valid_from.isoformat() if voucher.valid_from else None,
            "valid_until": voucher.valid_until.isoformat() if voucher.valid_until else None,
            "usage_limit": voucher.usage_limit,
            "usage_count": voucher.usage_count,
            "is_active": voucher.is_active,
            "created_at": voucher.created_at.isoformat() if voucher.created_at else None
        })
    
    return {"vouchers": voucher_list}


@router.post("/vouchers")
async def create_voucher(
    voucher_data: VoucherCreateRequest,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new voucher (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if voucher code already exists
    existing = db.query(Voucher).filter(Voucher.voucher_code == voucher_data.voucher_code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Voucher code already exists")
    
    # Validate discount type
    if voucher_data.discount_type not in ["percentage", "fixed_amount"]:
        raise HTTPException(status_code=400, detail="Invalid discount type")
    
    # Parse dates
    from datetime import datetime
    try:
        valid_from = datetime.fromisoformat(voucher_data.valid_from.replace('Z', '+00:00'))
        valid_until = datetime.fromisoformat(voucher_data.valid_until.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    if valid_until <= valid_from:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Create voucher
    voucher = Voucher(
        voucher_code=voucher_data.voucher_code.upper(),
        description=voucher_data.description,
        discount_type=voucher_data.discount_type,
        discount_value=voucher_data.discount_value,
        min_purchase_amount=voucher_data.min_purchase_amount,
        max_discount_amount=voucher_data.max_discount_amount,
        valid_from=valid_from,
        valid_until=valid_until,
        usage_limit=voucher_data.usage_limit,
        is_active=voucher_data.is_active
    )
    
    db.add(voucher)
    db.commit()
    db.refresh(voucher)
    
    # Log action
    log_entry = AuditLog(
        actor_email=admin.account_email,
        action="CREATE",
        entity_type="Voucher",
        entity_id=None,
        details=f"Created voucher: {voucher.voucher_code}"
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "message": "Voucher created successfully",
        "voucher_code": voucher.voucher_code
    }


@router.put("/vouchers/{voucher_code}")
async def update_voucher(
    voucher_code: str,
    voucher_data: VoucherUpdateRequest,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a voucher (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code.upper()).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    
    # Update fields if provided
    if voucher_data.description is not None:
        voucher.description = voucher_data.description
    if voucher_data.discount_value is not None:
        voucher.discount_value = voucher_data.discount_value
    if voucher_data.min_purchase_amount is not None:
        voucher.min_purchase_amount = voucher_data.min_purchase_amount
    if voucher_data.max_discount_amount is not None:
        voucher.max_discount_amount = voucher_data.max_discount_amount
    if voucher_data.usage_limit is not None:
        voucher.usage_limit = voucher_data.usage_limit
    if voucher_data.is_active is not None:
        voucher.is_active = voucher_data.is_active
    
    # Update dates if provided
    if voucher_data.valid_from or voucher_data.valid_until:
        from datetime import datetime
        try:
            if voucher_data.valid_from:
                voucher.valid_from = datetime.fromisoformat(voucher_data.valid_from.replace('Z', '+00:00'))
            if voucher_data.valid_until:
                voucher.valid_until = datetime.fromisoformat(voucher_data.valid_until.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    db.commit()
    
    # Log action
    log_entry = AuditLog(
        actor_email=admin.account_email,
        action="UPDATE",
        entity_type="Voucher",
        entity_id=None,
        details=f"Updated voucher: {voucher.voucher_code}"
    )
    db.add(log_entry)
    db.commit()
    
    return {"message": "Voucher updated successfully"}


@router.delete("/vouchers/{voucher_code}")
async def delete_voucher(
    voucher_code: str,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a voucher (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code.upper()).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    
    # Check if voucher has been used
    usage_count = db.query(VoucherUsage).filter(VoucherUsage.voucher_code == voucher_code.upper()).count()
    
    if usage_count > 0:
        # Don't delete, just deactivate
        voucher.is_active = False
        db.commit()
        message = f"Voucher deactivated (cannot delete - used {usage_count} times)"
    else:
        # Safe to delete
        db.delete(voucher)
        db.commit()
        message = "Voucher deleted successfully"
    
    # Log action
    log_entry = AuditLog(
        actor_email=admin.account_email,
        action="DELETE",
        entity_type="Voucher",
        entity_id=None,
        details=f"Deleted/deactivated voucher: {voucher_code}"
    )
    db.add(log_entry)
    db.commit()
    
    return {"message": message}


@router.get("/vouchers/{voucher_code}/usage")
async def get_voucher_usage(
    voucher_code: str,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get usage history for a voucher (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code.upper()).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    
    usages = db.query(VoucherUsage).filter(VoucherUsage.voucher_code == voucher_code.upper()).all()
    
    usage_list = []
    for usage in usages:
        account = db.query(Account).filter(Account.account_id == usage.account_id).first()
        usage_list.append({
            "usage_id": usage.usage_id,
            "account_email": account.account_email if account else "Unknown",
            "order_id": usage.order_id,
            "discount_amount": float(usage.discount_amount),
            "used_at": usage.used_at.isoformat() if usage.used_at else None
        })
    
    return {
        "voucher_code": voucher_code,
        "total_uses": len(usage_list),
        "usages": usage_list
    }

