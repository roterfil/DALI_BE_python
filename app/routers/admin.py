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
from app.core.timezone import get_philippine_time
from app.core.config import settings
import json
import os
import uuid
import shutil
from app.models import (
    Product, Order, AdminAccount, ShippingStatus, 
    Account, AuditLog, Voucher, VoucherUsage, OrderItem, OrderPickup, OrderHistory
)
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
            details=json.dumps({
                'product_name': product.product_name,
                'old_price': old_price,
                'new_price': new_price
            })
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

@router.post("/products")
async def create_product(
    product_name: str = Form(...),
    product_description: Optional[str] = Form(None),
    product_price: float = Form(...),
    product_category: str = Form(...),
    product_subcategory: Optional[str] = Form(None),
    product_quantity: int = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Create a new product (Super Admin only)."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Validate price
    if product_price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")
    
    # Validate quantity
    if product_quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    
    # Handle image upload
    image_filename = None
    if image:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid image type. Allowed: JPEG, PNG, WebP, GIF"
            )
        
        # Generate unique filename
        ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        image_filename = f"{uuid.uuid4()}.{ext}"
        
        # Save image to frontend public directory
        image_dir = os.path.join("frontend", "public", "images", "products")
        os.makedirs(image_dir, exist_ok=True)
        image_path = os.path.join(image_dir, image_filename)
        
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    
    # Create product
    new_product = Product(
        product_name=product_name,
        product_description=product_description,
        product_price=product_price,
        product_category=product_category,
        product_subcategory=product_subcategory,
        product_quantity=product_quantity,
        image=image_filename,
        is_on_sale=False,
        product_discount_price=None
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Audit Log
    try:
        audit = AuditLog(
            actor_email=admin.account_email,
            action='CREATE',
            entity_type='product',
            entity_id=new_product.product_id,
            details=json.dumps({
                'product_name': product_name,
                'product_price': product_price,
                'product_category': product_category,
                'product_quantity': product_quantity
            })
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()
    
    return {
        "message": "Product created successfully",
        "product_id": new_product.product_id,
        "product_name": new_product.product_name
    }

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
            details=json.dumps({
                'product_name': product.product_name,
                'old_quantity': old_qty,
                'new_quantity': new_qty
            })
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
        # If no previous discount, show original price as "before" value
        before_value = float(old_discount) if old_discount else float(product.product_price)
        after_value = float(product.product_discount_price) if product.product_discount_price else float(product.product_price)
        
        audit = AuditLog(
            actor_email=admin.account_email,
            action='UPDATE_DISCOUNT',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps({
                'product_name': product.product_name,
                'old_discount': float(old_discount) if old_discount else None,
                'new_discount': float(product.product_discount_price) if product.product_discount_price else None,
                'old_sale_status': old_sale_status,
                'new_sale_status': product.is_on_sale,
                'before': before_value,
                'after': after_value,
                'original_price': float(product.product_price)
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


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get product details by ID (admin access)."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    product_name: Optional[str] = Form(None),
    product_description: Optional[str] = Form(None),
    product_category: Optional[str] = Form(None),
    product_subcategory: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Update product details (Super Admin only)."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin access required")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {}
    
    # Update text fields if provided
    if product_name is not None:
        product.product_name = product_name
        update_data['product_name'] = product_name
    if product_description is not None:
        product.product_description = product_description
        update_data['product_description'] = product_description
    if product_category is not None:
        product.product_category = product_category
        update_data['product_category'] = product_category
    if product_subcategory is not None:
        product.product_subcategory = product_subcategory
        update_data['product_subcategory'] = product_subcategory
    
    # Handle image upload
    if image and image.filename:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type '{image.content_type}'. Allowed: JPEG, PNG, WebP, GIF"
            )
        
        # Delete old image if it exists
        if product.image:
            old_image_path = os.path.join("frontend", "public", "images", "products", product.image)
            if os.path.exists(old_image_path):
                try:
                    os.remove(old_image_path)
                except Exception as e:
                    print(f"Warning: Could not delete old product image: {e}")
        
        # Generate unique filename
        ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
        image_filename = f"{uuid.uuid4()}.{ext}"
        
        # Save new image to frontend public directory
        image_dir = os.path.join("frontend", "public", "images", "products")
        os.makedirs(image_dir, exist_ok=True)
        image_path = os.path.join(image_dir, image_filename)
        
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        # Update product and track in update_data
        product.image = image_filename
        update_data['image'] = image_filename
    
    # At least one field must be provided
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

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


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Delete a product (Super Admin only)."""
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Check if product exists
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if product has ever been ordered (preserve order history)
    order_items = db.query(OrderItem).filter(OrderItem.product_id == product_id).first()
    if order_items:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete product. It has been used in orders. Products with order history cannot be deleted to preserve records."
        )
    
    # Store product info for audit log before deletion
    product_name = product.product_name
    product_image = product.image
    
    # Delete product image file if it exists
    if product_image:
        image_path = os.path.join("frontend", "public", "images", "products", product_image)
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception as e:
                # Log but don't fail if image deletion fails
                print(f"Warning: Could not delete product image: {e}")
    
    # Delete product from database
    db.delete(product)
    db.commit()
    
    # Audit Log
    try:
        audit = AuditLog(
            actor_email=admin.account_email,
            action='DELETE',
            entity_type='product',
            entity_id=product_id,
            details=json.dumps({
                'product_name': product_name,
                'product_image': product_image
            })
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()
    
    return {
        "message": "Product deleted successfully",
        "product_id": product_id
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
    
    # Order counts by status
    pending_orders = db.query(Order).filter(Order.shipping_status == ShippingStatus.PROCESSING).count()
    processing_orders = db.query(Order).filter(Order.shipping_status == ShippingStatus.PREPARING_FOR_SHIPMENT).count()
    shipped_orders = db.query(Order).filter(Order.shipping_status == ShippingStatus.IN_TRANSIT).count()
    completed_orders = db.query(Order).filter(
        or_(Order.shipping_status == ShippingStatus.DELIVERED, Order.shipping_status == ShippingStatus.COLLECTED)
    ).count()
    cancelled_orders = db.query(Order).filter(Order.shipping_status == ShippingStatus.CANCELLED).count()
    
    # Active orders (pending + processing + shipped)
    active_orders = pending_orders + processing_orders + shipped_orders
    
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
        "pending_orders": pending_orders,
        "processing_orders": processing_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "recent_orders": serialized_recent_orders,
        "low_stock_count": low_stock_count,
        "stock_alerts": low_stock_count  # Alias for frontend compatibility
    }

@router.get("/stats/revenue-by-month")
async def get_revenue_by_month(
    months: int = Query(default=12, ge=1, le=24),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get revenue grouped by month for the specified number of months."""
    # Calculate the start date
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)  # Approximate month calculation
    
    # Query orders grouped by month
    revenue_by_month = db.query(
        extract('year', Order.created_at).label('year'),
        extract('month', Order.created_at).label('month'),
        func.sum(Order.total_price).label('revenue'),
        func.count(Order.order_id).label('order_count')
    ).filter(
        Order.created_at >= start_date
    ).group_by(
        extract('year', Order.created_at),
        extract('month', Order.created_at)
    ).order_by(
        extract('year', Order.created_at),
        extract('month', Order.created_at)
    ).all()
    
    # Format the results
    result = []
    for row in revenue_by_month:
        month_name = datetime(int(row.year), int(row.month), 1).strftime('%B %Y')
        result.append({
            "month": month_name,
            "month_year": month_name,  # Frontend expects month_year
            "year": int(row.year),
            "month_number": int(row.month),
            "revenue": float(row.revenue or 0),
            "order_count": int(row.order_count or 0)
        })
    
    return result

@router.get("/stats/revenue-trends")
async def get_revenue_trends(
    period: str = Query(default="monthly", regex="^(monthly|quarterly|yearly)$"),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get revenue trends by period (monthly, quarterly, or yearly)."""
    now = datetime.now()
    
    if period == "monthly":
        # Last 12 months
        start_date = now - timedelta(days=365)
        revenue_data = db.query(
            extract('year', Order.created_at).label('year'),
            extract('month', Order.created_at).label('month'),
            func.sum(Order.total_price).label('revenue'),
            func.count(Order.order_id).label('order_count')
        ).filter(
            Order.created_at >= start_date
        ).group_by(
            extract('year', Order.created_at),
            extract('month', Order.created_at)
        ).order_by(
            extract('year', Order.created_at),
            extract('month', Order.created_at)
        ).all()
        
        result = []
        for row in revenue_data:
            month_name = datetime(int(row.year), int(row.month), 1).strftime('%b %Y')
            result.append({
                "period": month_name,
                "revenue": float(row.revenue or 0),
                "order_count": int(row.order_count or 0)
            })
            
    elif period == "quarterly":
        # Last 8 quarters (2 years)
        start_date = now - timedelta(days=730)
        revenue_data = db.query(
            extract('year', Order.created_at).label('year'),
            extract('quarter', Order.created_at).label('quarter'),
            func.sum(Order.total_price).label('revenue'),
            func.count(Order.order_id).label('order_count')
        ).filter(
            Order.created_at >= start_date
        ).group_by(
            extract('year', Order.created_at),
            extract('quarter', Order.created_at)
        ).order_by(
            extract('year', Order.created_at),
            extract('quarter', Order.created_at)
        ).all()
        
        result = []
        for row in revenue_data:
            quarter_name = f"Q{int(row.quarter)} {int(row.year)}"
            result.append({
                "period": quarter_name,
                "revenue": float(row.revenue or 0),
                "order_count": int(row.order_count or 0)
            })
            
    else:  # yearly
        # Last 5 years
        start_date = now - timedelta(days=1825)
        revenue_data = db.query(
            extract('year', Order.created_at).label('year'),
            func.sum(Order.total_price).label('revenue'),
            func.count(Order.order_id).label('order_count')
        ).filter(
            Order.created_at >= start_date
        ).group_by(
            extract('year', Order.created_at)
        ).order_by(
            extract('year', Order.created_at)
        ).all()
        
        result = []
        for row in revenue_data:
            result.append({
                "period": str(int(row.year)),
                "revenue": float(row.revenue or 0),
                "order_count": int(row.order_count or 0)
            })
    
    return result

@router.get("/stats/top-products")
async def get_top_products(
    period: str = Query(default="monthly", regex="^(weekly|monthly|quarterly|yearly|all)$"),
    limit: int = Query(default=10, ge=1, le=50),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get top-selling products for the specified period."""
    # Calculate date filter based on period
    now = datetime.now()
    if period == "weekly":
        start_date = now - timedelta(days=7)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
    elif period == "quarterly":
        start_date = now - timedelta(days=90)
    elif period == "yearly":
        start_date = now - timedelta(days=365)
    else:  # all
        start_date = datetime(2000, 1, 1)  # Far past date to include all orders
    
    # Query top products by total quantity sold
    top_products = db.query(
        Product.product_id,
        Product.product_name,
        Product.product_category,
        Product.product_price,
        func.sum(OrderItem.quantity).label('total_sold'),
        func.sum(OrderItem.quantity * OrderItem.unit_price).label('total_revenue')
    ).join(
        OrderItem, Product.product_id == OrderItem.product_id
    ).join(
        Order, OrderItem.order_id == Order.order_id
    ).filter(
        Order.created_at >= start_date
    ).group_by(
        Product.product_id,
        Product.product_name,
        Product.product_category,
        Product.product_price
    ).order_by(
        desc('total_sold')
    ).limit(limit).all()
    
    # Format the results
    result = []
    for row in top_products:
        result.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "category": row.product_category,
            "price": float(row.product_price),
            "quantity_sold": int(row.total_sold or 0),  # Frontend expects quantity_sold
            "total_sold": int(row.total_sold or 0),  # Keep for backwards compatibility
            "total_revenue": float(row.total_revenue or 0)
        })
    
    return {"products": result}  # Wrap in object with products key

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
        joinedload(Order.order_items).joinedload(OrderItem.product),
        joinedload(Order.order_history)
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
        joinedload(Order.order_pickup),
        joinedload(Order.order_history)
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
    """Update order shipping status (All admins can update)."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    notes = status_data.get("notes", "")
    
    # Convert string status to ShippingStatus enum
    try:
        status_enum = ShippingStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    
    # Get old status before update
    old_status = order.shipping_status
    
    # Use OrderService to properly handle status updates (including inventory restoration)
    from app.services.order_service import OrderService
    try:
        OrderService.update_shipping_status(db, order_id, status_enum, notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Log the status change in audit log with structured details
    log = AuditLog(
        actor_email=admin.account_email,
        action="UPDATE",
        entity_type="Order",
        entity_id=order_id,
        details=json.dumps({
            'order_id': order_id,
            'old_status': old_status.value if hasattr(old_status, 'value') else str(old_status),
            'new_status': new_status,
            'before': old_status.value if hasattr(old_status, 'value') else str(old_status),
            'after': new_status,
            'notes': notes if notes else ''
        })
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
    
    - All admins can see all audit logs (including super admin actions)
    """
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    
    # All admins see all logs (no filter applied)
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
    show_inactive: bool = Query(default=True, description="Include inactive vouchers"),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all vouchers (Super Admin only)."""
    if not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    query = db.query(Voucher)
    
    # Filter out inactive vouchers if requested
    if not show_inactive:
        query = query.filter(Voucher.is_active == True)
    
    vouchers = query.order_by(desc(Voucher.created_at)).all()
    
    # Get current time in Philippines timezone
    from app.core.timezone import get_philippine_time
    now = get_philippine_time()
    
    voucher_list = []
    for voucher in vouchers:
        # Check if voucher is currently active based on dates
        is_active_now = voucher.is_active
        if voucher.is_active:
            # Also check date validity
            if voucher.valid_from and now < voucher.valid_from:
                is_active_now = False  # Not yet started
            elif voucher.valid_until and now > voucher.valid_until:
                is_active_now = False  # Already expired
        
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
            "is_active_now": is_active_now,
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
    
    # Determine if voucher should be active based on current date
    from app.core.timezone import get_philippine_time
    now = get_philippine_time()
    is_active = valid_from <= now <= valid_until
    
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
        is_active=is_active
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
        details=json.dumps({
            'voucher_code': voucher.voucher_code,
            'product_name': f"Voucher: {voucher.voucher_code}",
            'description': voucher.description,
            'discount_type': voucher.discount_type,
            'discount_value': float(voucher.discount_value)
        })
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
        details=json.dumps({
            'voucher_code': voucher.voucher_code,
            'product_name': f"Voucher: {voucher.voucher_code}",
            'description': voucher.description,
            'updated_fields': {
                'discount_value': float(voucher.discount_value) if voucher.discount_value else None,
                'is_active': voucher.is_active
            }
        })
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
        details=json.dumps({
            'voucher_code': voucher_code,
            'product_name': f"Voucher: {voucher_code}",
            'action_taken': 'deactivated' if usage_count > 0 else 'deleted',
            'usage_count': usage_count
        })
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

