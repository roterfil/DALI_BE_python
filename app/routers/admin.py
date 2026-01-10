"""
Admin router - handles admin panel functionality (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_admin, verify_password
import json
import os
import uuid
from app.models import Product, Order, AdminAccount, ShippingStatus, Account, AuditLog
from app.schemas import OrderResponse, ProductResponse, LoginRequest, ProductCreate
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

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


@router.post("/products", response_model=ProductResponse)
async def create_product(
    product_name: str = Form(...),
    product_description: str = Form(None),
    product_price: float = Form(...),
    product_category: str = Form(None),
    product_subcategory: str = Form(None),
    product_quantity: int = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Create a new product (super-admin only). Accepts multipart/form-data with optional image."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin privileges required")

    # handle image upload (store under frontend/public/images/products)
    image_url = None
    stored_image_name = None
    if image:
        try:
            images_dir = os.path.join(os.getcwd(), 'frontend', 'public', 'images', 'products')
            os.makedirs(images_dir, exist_ok=True)
            orig_name = os.path.basename(image.filename)
            ext = os.path.splitext(orig_name)[1]
            fname = f"{uuid.uuid4().hex}{ext}"
            dest = os.path.join(images_dir, fname)
            content = await image.read()
            with open(dest, 'wb') as f:
                f.write(content)
            # URL used by clients is /images/products/<fname>
            image_url = f"/images/products/{fname}"
            # store only the filename in the DB to avoid double-prefixing on frontend
            stored_image_name = fname
        except Exception:
            image_url = None
            stored_image_name = None

    product = Product(
        product_name=product_name,
        product_description=product_description,
        product_price=product_price,
        product_category=product_category,
        product_subcategory=product_subcategory,
        product_quantity=product_quantity,
        image=stored_image_name if stored_image_name else None,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Audit log for product creation
    try:
        actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
        actor = db.query(Account).filter(Account.account_email == actor_email).first()
        actor_name = actor.full_name if actor else None
        # For CREATE_PRODUCT include explicit before/after fields so frontend can render diffs
        audit_details = {
            'product_id': product.product_id,
            'product_name': product.product_name,
            'sku': None,
            'old_price': 0.0,
            'new_price': float(product.product_price),
            'old_quantity': 0,
            'new_quantity': int(product.product_quantity),
        }
        if actor_name:
            audit_details['actor_name'] = actor_name
        audit = AuditLog(
            actor_email=actor_email,
            action='CREATE_PRODUCT',
            entity_type='product',
            entity_id=product.product_id,
            details=json.dumps(audit_details)
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

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
    new_qty = int(stock_data.quantity)

    # If there's no change, skip DB write and audit
    if old_qty == new_qty:
        return {"message": "No change", "product_id": product_id, "quantity": old_qty}

    product.product_quantity = new_qty
    db.commit()

    # Audit log entry (include actor name when available)
    try:
        actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
        actor = db.query(Account).filter(Account.account_email == actor_email).first()
        actor_name = actor.full_name if actor else None
        audit_details = {'old_quantity': old_qty, 'new_quantity': new_qty}
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

    return {"message": "Stock updated", "product_id": product_id, "quantity": new_qty}


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
    # Normalize to two decimals for comparison
    try:
        old_price = round(float(product.product_price), 2)
    except Exception:
        old_price = float(product.product_price) if product.product_price is not None else 0.0

    new_price = round(float(price_data.price), 2)

    # If price unchanged, skip audit and DB write
    if old_price == new_price:
        return {"message": "No change", "product_id": product_id, "price": old_price}

    product.product_price = new_price
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


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    product_name: Optional[str] = Form(None),
    product_description: Optional[str] = Form(None),
    product_category: Optional[str] = Form(None),
    product_subcategory: Optional[str] = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Update product details (name, description, category, subcategory, image).
    Image upload is optional and stored under frontend/public/images/products; DB stores filename only.
    """
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    changes = {}
    # Compare and set fields
    if product_name is not None and product.product_name != product_name:
        changes['product_name'] = {'old': product.product_name, 'new': product_name}
        product.product_name = product_name
    if product_description is not None and product.product_description != product_description:
        changes['product_description'] = {'old': product.product_description, 'new': product_description}
        product.product_description = product_description
    if product_category is not None and product.product_category != product_category:
        changes['product_category'] = {'old': product.product_category, 'new': product_category}
        product.product_category = product_category
    if product_subcategory is not None and product.product_subcategory != product_subcategory:
        changes['product_subcategory'] = {'old': product.product_subcategory, 'new': product_subcategory}
        product.product_subcategory = product_subcategory

    # handle image upload
    if image:
        try:
            images_dir = os.path.join(os.getcwd(), 'frontend', 'public', 'images', 'products')
            os.makedirs(images_dir, exist_ok=True)
            orig_name = os.path.basename(image.filename)
            ext = os.path.splitext(orig_name)[1]
            fname = f"{uuid.uuid4().hex}{ext}"
            dest = os.path.join(images_dir, fname)
            content = await image.read()
            with open(dest, 'wb') as f:
                f.write(content)
            new_image_name = fname
            # record change
            changes['image'] = {'old': product.image, 'new': new_image_name}
            product.image = new_image_name
        except Exception:
            pass

    if changes:
        db.add(product)
        db.commit()

        # Audit log entry
        try:
            actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
            actor = db.query(Account).filter(Account.account_email == actor_email).first()
            actor_name = actor.full_name if actor else None
            audit_details = {'changes': changes}
            if actor_name:
                audit_details['actor_name'] = actor_name
            audit = AuditLog(
                actor_email=actor_email,
                action='UPDATE_PRODUCT',
                entity_type='product',
                entity_id=product_id,
                details=json.dumps(audit_details)
            )
            db.add(audit)
            db.commit()
        except Exception:
            db.rollback()

    return {"message": "Product updated", "product_id": product_id, "changes": changes}

@router.put("/products/{product_id}/discount")
async def update_product_discount(
    product_id: int,
    discount_data: UpdateDiscountRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Update product discount price and sale status (super admin only)."""
    # Require super admin
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin privileges required")
    
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update fields
    product.product_discount_price = discount_data.product_discount_price
    product.is_on_sale = discount_data.is_on_sale
    
    db.commit()

    # Log the action in the Audit Log
    try:
        actor_email = getattr(admin, 'account_email', 'unknown')
        audit = AuditLog(
            actor_email=actor_email,
            action='UPDATE_DISCOUNT',
            entity_type='product',
            entity_id=product_id,
            details=f"Sale set to {product.is_on_sale} with price {product.product_discount_price}"
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Discount updated successfully"}

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Delete a product (super-admin only). Removes image file when possible and logs an audit entry."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin privileges required")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # capture product snapshot for audit
    snapshot = {
        'product_id': product.product_id,
        'product_name': product.product_name,
        'product_description': product.product_description,
        'product_category': product.product_category,
        'product_subcategory': product.product_subcategory,
        'product_price': float(product.product_price) if product.product_price is not None else None,
        'product_quantity': product.product_quantity,
        'image': product.image,
    }

    # attempt to remove image file
    try:
        if product.image:
            img_path = os.path.join(os.getcwd(), 'frontend', 'public', 'images', 'products', product.image)
            if os.path.exists(img_path):
                os.remove(img_path)
    except Exception:
        # non-fatal
        pass

    try:
        db.delete(product)
        db.commit()

        # write audit log
        actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
        actor = db.query(Account).filter(Account.account_email == actor_email).first()
        actor_name = actor.full_name if actor else None
        audit_details = {'deleted_product': snapshot}
        if actor_name:
            audit_details['actor_name'] = actor_name
        audit = AuditLog(
            actor_email=actor_email,
            action='DELETE_PRODUCT',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps(audit_details)
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Failed to delete product')

    return {"message": "Product deleted", "product_id": product_id}


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
