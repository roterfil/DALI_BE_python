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
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func, extract
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_admin, verify_password, get_password_hash
import json
import os
import uuid
from app.models import Product, Order, AdminAccount, ShippingStatus, Account, AuditLog, Store, Voucher, VoucherUsage, OrderItem
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
    store_id: Optional[int] = None
    store_name: Optional[str] = None


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
    
    # Get store info if assigned
    store_name = None
    if admin.store_id and admin.store:
        store_name = admin.store.store_name
    
    return AdminLoginResponse(
        message="Login successful",
        admin_email=admin.account_email,
        is_super_admin=getattr(admin, 'is_super_admin', False),
        store_id=admin.store_id,
        store_name=store_name
    )


@router.post("/logout")
async def admin_logout(request: Request):
    """Admin logout."""
    request.session.pop("admin_email", None)
    return {"message": "Logged out successfully"}


@router.get("/inventory")
async def get_inventory(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get all products in inventory with store-specific quantities."""
    from app.models import StoreInventory
    from sqlalchemy import func
    import logging
    
    logger = logging.getLogger(__name__)
    
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    
    logger.info(f"Inventory request - Admin: {admin.account_email}, Store: {store_id}, Is Super: {is_super}")
    logger.info(f"Filters - search: {search}, category: {category}, subcategory: {subcategory}")
    
    if is_super:
        # Super admin sees all products with minimum quantity across all stores
        # This way low stock filter will show products that are low in ANY store
        
        # Start with base product query and apply filters FIRST
        base_query = db.query(Product)
        
        if search:
            base_query = base_query.filter(Product.product_name.ilike(f"%{search}%"))
        if category:
            base_query = base_query.filter(Product.product_category == category)
        if subcategory:
            base_query = base_query.filter(Product.product_subcategory == subcategory)
        
        # Create subquery for filtered products
        filtered_products = base_query.subquery()
        
        # Now join with inventory and group
        query = db.query(
            filtered_products.c.product_id,
            filtered_products.c.product_name,
            filtered_products.c.product_description,
            filtered_products.c.product_price,
            filtered_products.c.product_category,
            filtered_products.c.product_subcategory,
            func.min(StoreInventory.quantity).label('product_quantity'),
            filtered_products.c.image,
            filtered_products.c.is_on_sale,
            filtered_products.c.product_discount_price
        ).outerjoin(
            StoreInventory,
            filtered_products.c.product_id == StoreInventory.product_id
        ).group_by(
            filtered_products.c.product_id,
            filtered_products.c.product_name,
            filtered_products.c.product_description,
            filtered_products.c.product_price,
            filtered_products.c.product_category,
            filtered_products.c.product_subcategory,
            filtered_products.c.image,
            filtered_products.c.is_on_sale,
            filtered_products.c.product_discount_price
        )
        
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
                "product_quantity": row.product_quantity or 0,
                "image": row.image,
                "is_on_sale": row.is_on_sale,
                "product_discount_price": float(row.product_discount_price) if row.product_discount_price else None
            })
        
        logger.info(f"Super admin inventory: {len(products)} products")
        return products
    else:
        # Regular admin sees products with store-specific quantities
        if not store_id:
            raise HTTPException(status_code=400, detail="Regular admin must have a store assignment")
        
        # Join Product with StoreInventory for this store
        query = db.query(
            Product.product_id,
            Product.product_name,
            Product.product_description,
            Product.product_price,
            Product.product_category,
            Product.product_subcategory,
            StoreInventory.quantity.label('product_quantity'),
            Product.image,
            Product.is_on_sale,
            Product.product_discount_price
        ).join(
            StoreInventory,
            Product.product_id == StoreInventory.product_id
        ).filter(
            StoreInventory.store_id == store_id
        )
        
        # Apply search filter
        if search:
            query = query.filter(Product.product_name.ilike(f"%{search}%"))
        
        # Apply category filter
        if category:
            query = query.filter(Product.product_category == category)
        
        # Apply subcategory filter
        if subcategory:
            query = query.filter(Product.product_subcategory == subcategory)
        
        results = query.all()
        
        # Convert to dict format
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
        
        logger.info(f"Store {store_id} inventory: {len(products)} products")
        return products


@router.get("/products/{product_id}")
async def get_product_detail(
    product_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get product details with store-specific quantity for regular admins."""
    from app.models import StoreInventory
    import logging
    
    logger = logging.getLogger(__name__)
    
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # For regular admins, get store-specific quantity
    if not is_super and store_id:
        inventory = db.query(StoreInventory).filter(
            StoreInventory.product_id == product_id,
            StoreInventory.store_id == store_id
        ).first()
        
        if inventory:
            # Return product with store-specific quantity
            return {
                "product_id": product.product_id,
                "product_name": product.product_name,
                "product_description": product.product_description,
                "product_price": float(product.product_price),
                "product_category": product.product_category,
                "product_subcategory": product.product_subcategory,
                "product_quantity": inventory.quantity,  # Store-specific quantity
                "image": product.image,
                "is_on_sale": product.is_on_sale,
                "product_discount_price": float(product.product_discount_price) if product.product_discount_price else None,
                "created_at": product.created_at,
                "updated_at": product.updated_at
            }
        else:
            logger.warning(f"No inventory record for product {product_id} in store {store_id}")
    
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
    """Update product stock quantity - updates store_inventory for regular admins."""
    from app.models import StoreInventory
    import logging
    
    logger = logging.getLogger(__name__)
    
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    new_qty = int(stock_data.quantity)
    
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if is_super:
        # Super admin updates global product quantity
        old_qty = product.product_quantity
        
        if old_qty == new_qty:
            return {"message": "No change", "product_id": product_id, "quantity": old_qty}
        
        product.product_quantity = new_qty
        db.commit()
        logger.info(f"Super admin updated global stock for product {product_id}: {old_qty} -> {new_qty}")
        
    else:
        # Regular admin updates store_inventory
        if not store_id:
            raise HTTPException(status_code=400, detail="Regular admin must have a store assignment")
        
        inventory = db.query(StoreInventory).filter(
            StoreInventory.product_id == product_id,
            StoreInventory.store_id == store_id
        ).first()
        
        if not inventory:
            raise HTTPException(status_code=404, detail=f"Product not found in store {store_id} inventory")
        
        old_qty = inventory.quantity
        
        if old_qty == new_qty:
            return {"message": "No change", "product_id": product_id, "quantity": old_qty, "store_id": store_id}
        
        inventory.quantity = new_qty
        db.commit()
        logger.info(f"Store {store_id} admin updated stock for product {product_id}: {old_qty} -> {new_qty}")

    # Audit log entry
    try:
        actor_email = getattr(admin, 'account_email', None) or getattr(admin, 'email', None) or 'unknown'
        actor = db.query(Account).filter(Account.account_email == actor_email).first()
        actor_name = actor.full_name if actor else None
        audit_details = {
            'old_quantity': old_qty, 
            'new_quantity': new_qty,
            'store_id': store_id if not is_super else 'global'
        }
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
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")
        db.rollback()

    return {
        "message": "Stock updated", 
        "product_id": product_id, 
        "quantity": new_qty,
        "store_id": store_id if not is_super else None
    }


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
    
    # If product is on sale and new price is less than or equal to discount price, disable sale
    if product.is_on_sale and product.product_discount_price:
        if new_price <= float(product.product_discount_price):
            product.is_on_sale = False
            product.product_discount_price = None
    
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
    """Update product details (name, description, category, subcategory, image) - super admin only.
    Image upload is optional and stored under frontend/public/images/products; DB stores filename only.
    """
    # Require super admin
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin privileges required")
    
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
    """Update order shipping status (super admin only)."""
    # Require super admin
    if not getattr(admin, 'is_super_admin', False):
        raise HTTPException(status_code=403, detail="Super admin privileges required")
    
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
    """Get dashboard statistics - now shows global data for all admins."""
    from sqlalchemy import func
    from app.models import OrderPickup, StoreInventory
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Check admin type (for logging and future use)
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    
    logger.info(f"Admin stats request - Email: {admin.account_email}, Store ID: {store_id}, Is Super: {is_super}")
    
    # ALL ADMINS: Get statistics across ALL stores (global data)
    logger.info("Fetching global statistics for admin")
    
    # Total orders (all orders in system)
    total_orders = db.query(Order).count()
    
    # Total products (all unique products in system)
    total_products = db.query(Product).count()
    
    # Total revenue (all paid orders)
    total_revenue = db.query(func.sum(Order.total_price)).filter(
        Order.payment_status == "PAID"
    ).scalar() or 0
    
    # Pending orders
    pending_orders = db.query(Order).filter(
        Order.shipping_status == ShippingStatus.PROCESSING
    ).count()
    
    # Active orders (processing, preparing, in transit)
    active_orders = db.query(Order).filter(
        Order.shipping_status.in_([
            ShippingStatus.PROCESSING,
            ShippingStatus.PREPARING_FOR_SHIPMENT,
            ShippingStatus.IN_TRANSIT
        ])
    ).count()
    
    # Completed orders (delivered or collected)
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
    
    # Stock alerts (distinct products with low stock in any store)
    stock_alerts_subquery = db.query(
        StoreInventory.product_id
    ).filter(
        StoreInventory.quantity < StoreInventory.low_stock_threshold
    ).distinct().subquery()
    
    stock_alerts = db.query(func.count()).select_from(stock_alerts_subquery).scalar() or 0
    
    logger.info(f"Global Stats for {admin.account_email} - Orders: {total_orders}, Products: {total_products}, Revenue: {total_revenue}, Alerts: {stock_alerts}")

    response_data = {
        "total_orders": total_orders,
        "total_products": total_products,
        "pending_orders": pending_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "total_revenue": float(total_revenue),
        "stock_alerts": stock_alerts,
        "store_id": store_id,
        "is_store_filtered": False  # Now always false since all admins see global data
    }
    
    logger.info(f"Returning global stats: {response_data}")
    return response_data


@router.get("/stats/revenue-by-month")
async def get_revenue_by_month(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get revenue data grouped by month for the last N months.
    Returns array of {month, year, revenue} objects.
    Now shows global data for all admins.
    """
    from app.models import OrderPickup
    import logging
    from calendar import month_abbr
    
    logger = logging.getLogger(__name__)
    
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 31)  # Approximate
    
    logger.info(f"Revenue by month - Admin: {admin.account_email}, Store: {store_id}, Months: {months} (showing global data)")
    
    # Base query for paid orders (ALL ORDERS - no store filtering)
    query = db.query(
        extract('year', Order.created_at).label('year'),
        extract('month', Order.created_at).label('month'),
        func.sum(Order.total_price).label('revenue')
    ).filter(
        Order.payment_status == "PAID",
        Order.created_at >= start_date
    )
    
    # Group by year and month
    results = query.group_by(
        extract('year', Order.created_at),
        extract('month', Order.created_at)
    ).order_by(
        extract('year', Order.created_at),
        extract('month', Order.created_at)
    ).all()
    
    # Format response
    revenue_data = []
    for row in results:
        year = int(row.year)
        month = int(row.month)
        revenue = float(row.revenue) if row.revenue else 0
        
        # Format month name
        month_name = month_abbr[month] if 1 <= month <= 12 else str(month)
        
        revenue_data.append({
            "month": month_name,
            "year": year,
            "month_year": f"{month_name} {year}",
            "revenue": revenue
        })
    
    logger.info(f"Returning {len(revenue_data)} months of revenue data")
    return revenue_data


@router.get("/stats/top-products")
async def get_top_products(
    period: str = Query("monthly", pattern="^(weekly|monthly)$"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get top selling products by quantity sold.
    Period can be 'weekly' (last 7 days) or 'monthly' (last 30 days).
    Now shows global data for all admins.
    """
    from app.models import OrderPickup
    import logging
    
    logger = logging.getLogger(__name__)
    
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    
    # Calculate date range based on period
    end_date = datetime.now()
    if period == "weekly":
        start_date = end_date - timedelta(days=7)
        period_label = "Last 7 Days"
    else:  # monthly
        start_date = end_date - timedelta(days=30)
        period_label = "Last 30 Days"
    
    logger.info(f"Top products - Admin: {admin.account_email}, Store: {store_id}, Period: {period} (showing global data)")
    
    # Base query: Join OrderItem -> Order -> Product (ALL ORDERS - no store filtering)
    query = db.query(
        Product.product_id,
        Product.product_name,
        Product.image,
        func.sum(OrderItem.quantity).label('total_quantity'),
        func.sum(OrderItem.quantity * Product.product_price).label('total_revenue')
    ).join(
        Order,
        OrderItem.order_id == Order.order_id
    ).join(
        Product,
        OrderItem.product_id == Product.product_id
    ).filter(
        Order.payment_status == "PAID",
        Order.created_at >= start_date,
        Order.created_at <= end_date
    )
    
    # Group by product and order by quantity sold
    results = query.group_by(
        Product.product_id,
        Product.product_name,
        Product.image
    ).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(limit).all()
    
    # Format response
    top_products = []
    for row in results:
        top_products.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "image": row.image,
            "quantity_sold": int(row.total_quantity) if row.total_quantity else 0,
            "revenue": float(row.total_revenue) if row.total_revenue else 0
        })
    
    logger.info(f"Returning {len(top_products)} top products for {period}")
    return {
        "period": period,
        "period_label": period_label,
        "products": top_products
    }


@router.get("/low-stock-products")
async def get_low_stock_products(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Get low stock products filtered by store for regular admins."""
    from app.models import StoreInventory
    
    store_id = getattr(admin, 'store_id', None)
    is_super = getattr(admin, 'is_super_admin', False)
    
    # Build query for low stock inventory items
    query = db.query(StoreInventory, Product).join(
        Product, StoreInventory.product_id == Product.product_id
    ).filter(
        StoreInventory.quantity < StoreInventory.low_stock_threshold
    )
    
    # Filter by store for regular admins
    if not is_super and store_id:
        query = query.filter(StoreInventory.store_id == store_id)
    
    # Get results and order by quantity (lowest first)
    results = query.order_by(StoreInventory.quantity.asc()).limit(10).all()
    
    # Format response
    low_stock_items = []
    for inventory, product in results:
        low_stock_items.append({
            "product_id": product.product_id,
            "product_name": product.product_name,
            "quantity": inventory.quantity,
            "low_stock_threshold": inventory.low_stock_threshold,
            "store_id": inventory.store_id,
            "image": product.image,
            "status": "out_of_stock" if inventory.quantity == 0 else "low_stock"
        })
    
    return low_stock_items


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


