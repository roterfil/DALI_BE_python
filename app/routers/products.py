"""
Products router - handles product listing, search, and details (JSON API).
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models import Product
from app.schemas import ProductResponse

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
async def list_products(
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all products with optional filtering."""
    query = db.query(Product)
    
    # Apply filters
    if subcategory:
        query = query.filter(
            Product.product_category == category,
            Product.product_subcategory == subcategory
        )
    elif category:
        query = query.filter(Product.product_category == category)
    
    # Order by product_id to maintain consistent order
    products = query.order_by(Product.product_id).all()
    
    # Apply search filter
    if search:
        products = [p for p in products if search.lower() in p.product_name.lower()]
    
    return products


@router.get("/sale", response_model=List[ProductResponse])
async def list_sale_products(
    db: Session = Depends(get_db)
):
    """Get all products currently on sale."""
    products = db.query(Product).filter(
        Product.is_on_sale == True,
        Product.product_discount_price.isnot(None)
    ).all()
    return products


@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all product categories."""
    categories = db.query(Product.product_category).distinct().all()
    return {"categories": [c[0] for c in categories if c[0]]}


@router.get("/categories/{category}/subcategories")
async def get_subcategories(
    category: str,
    db: Session = Depends(get_db)
):
    """Get subcategories for a category."""
    subcategories = db.query(Product.product_subcategory).filter(
        Product.product_category == category
    ).distinct().all()
    return {"subcategories": [s[0] for s in subcategories if s[0]]}


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get product details by ID."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
