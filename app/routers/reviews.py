"""
Reviews router - handles product reviews and ratings (JSON API).
"""
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user_required, get_current_user
from app.core.config import settings
from app.models import Review, ReviewImage, Product, Order, OrderItem, Account
from app.schemas import ReviewCreate, ReviewUpdate, ReviewResponse, ReviewImageResponse, ProductReviewSummary

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

# Directory for storing review images
REVIEW_IMAGES_DIR = os.path.join(settings.STATIC_FILES_PATH, "images", "reviews")


def ensure_review_images_dir():
    """Ensure the review images directory exists."""
    os.makedirs(REVIEW_IMAGES_DIR, exist_ok=True)


def get_reviewer_name(review: Review) -> Optional[str]:
    """Get reviewer name based on anonymity setting."""
    if review.is_anonymous:
        return "Anonymous"
    account = review.account
    if account.account_first_name or account.account_last_name:
        first = account.account_first_name or ""
        last = account.account_last_name or ""
        # Show first name and first letter of last name for privacy
        if last:
            return f"{first} {last[0]}."
        return first
    return "Customer"


def review_to_response(review: Review) -> dict:
    """Convert a Review model to ReviewResponse dict."""
    return {
        "review_id": review.review_id,
        "product_id": review.product_id,
        "account_id": review.account_id,
        "order_id": review.order_id,
        "order_item_id": review.order_item_id,
        "rating": review.rating,
        "comment": review.comment,
        "is_anonymous": review.is_anonymous,
        "is_edited": review.is_edited,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
        "reviewer_name": get_reviewer_name(review),
        "images": [
            {
                "image_id": img.image_id,
                "image_url": img.image_url,
                "created_at": img.created_at
            }
            for img in review.images
        ]
    }


@router.get("/product/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(
    product_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get all reviews for a product."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    reviews = db.query(Review).filter(
        Review.product_id == product_id
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    return [review_to_response(r) for r in reviews]


@router.get("/product/{product_id}/summary", response_model=ProductReviewSummary)
async def get_product_review_summary(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get review summary for a product (average rating, total count, distribution)."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    
    total_reviews = len(reviews)
    if total_reviews == 0:
        return {
            "average_rating": 0.0,
            "total_reviews": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        }
    
    # Calculate average
    total_rating = sum(r.rating for r in reviews)
    average_rating = round(total_rating / total_reviews, 1)
    
    # Calculate distribution
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        rating_distribution[r.rating] += 1
    
    return {
        "average_rating": average_rating,
        "total_reviews": total_reviews,
        "rating_distribution": rating_distribution
    }


@router.get("/order/{order_id}/reviewable")
async def get_reviewable_items(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Get order items that can be reviewed (delivered orders only)."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only delivered/collected orders can be reviewed
    if order.shipping_status not in ["DELIVERED", "COLLECTED"]:
        raise HTTPException(status_code=400, detail="Only delivered orders can be reviewed")
    
    # Get order items with their review status
    reviewable_items = []
    for item in order.order_items:
        existing_review = db.query(Review).filter(
            Review.order_item_id == item.order_item_id
        ).first()
        
        reviewable_items.append({
            "order_item_id": item.order_item_id,
            "product_id": item.product_id,
            "product_name": item.product.product_name,
            "product_image": item.product.image,
            "quantity": item.quantity,
            "is_reviewed": existing_review is not None,
            "review": review_to_response(existing_review) if existing_review else None
        })
    
    return {"order_id": order_id, "items": reviewable_items}


@router.post("", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Create a new review for an order item."""
    # Check if order item exists
    order_item = db.query(OrderItem).filter(
        OrderItem.order_item_id == review_data.order_item_id
    ).first()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    order = order_item.order
    
    # Verify ownership
    if order.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check order status
    if order.shipping_status not in ["DELIVERED", "COLLECTED"]:
        raise HTTPException(status_code=400, detail="Only delivered orders can be reviewed")
    
    # Check if already reviewed
    existing_review = db.query(Review).filter(
        Review.order_item_id == review_data.order_item_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="This item has already been reviewed")
    
    # Create review
    review = Review(
        product_id=order_item.product_id,
        account_id=current_user.account_id,
        order_id=order.order_id,
        order_item_id=review_data.order_item_id,
        rating=review_data.rating,
        comment=review_data.comment,
        is_anonymous=review_data.is_anonymous
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    return review_to_response(review)


@router.post("/{review_id}/images", response_model=ReviewImageResponse)
async def upload_review_image(
    review_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Upload an image for a review."""
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Limit images per review
    if len(review.images) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images per review")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    
    # Ensure directory exists
    ensure_review_images_dir()
    
    # Save file
    file_path = os.path.join(REVIEW_IMAGES_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save to database - URL path matches the static files mount
    review_image = ReviewImage(
        review_id=review_id,
        image_url=f"/static/images/reviews/{filename}"
    )
    
    db.add(review_image)
    db.commit()
    db.refresh(review_image)
    
    return review_image


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Update an existing review (one-time edit only)."""
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if already edited (one-time edit only)
    if review.is_edited:
        raise HTTPException(status_code=400, detail="Review can only be edited once")
    
    # Update fields
    if review_data.rating is not None:
        review.rating = review_data.rating
    if review_data.comment is not None:
        review.comment = review_data.comment
    if review_data.is_anonymous is not None:
        review.is_anonymous = review_data.is_anonymous
    
    # Mark as edited
    review.is_edited = True
    
    db.commit()
    db.refresh(review)
    
    return review_to_response(review)


@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Delete a review."""
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete associated images from filesystem
    for img in review.images:
        try:
            file_path = os.path.join(settings.STATIC_FILES_PATH, img.image_url.lstrip("/"))
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Ignore file deletion errors
    
    db.delete(review)
    db.commit()
    
    return {"message": "Review deleted successfully"}


@router.delete("/{review_id}/images/{image_id}")
async def delete_review_image(
    review_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Delete an image from a review."""
    review = db.query(Review).filter(Review.review_id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    review_image = db.query(ReviewImage).filter(
        ReviewImage.image_id == image_id,
        ReviewImage.review_id == review_id
    ).first()
    
    if not review_image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete from filesystem
    try:
        file_path = os.path.join(settings.STATIC_FILES_PATH, review_image.image_url.lstrip("/"))
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass  # Ignore file deletion errors
    
    db.delete(review_image)
    db.commit()
    
    return {"message": "Image deleted successfully"}


@router.get("/my-reviews", response_model=List[ReviewResponse])
async def get_my_reviews(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Account = Depends(get_current_user_required)
):
    """Get all reviews by the current user."""
    reviews = db.query(Review).filter(
        Review.account_id == current_user.account_id
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    return [review_to_response(r) for r in reviews]
