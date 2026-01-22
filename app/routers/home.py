"""
Home router - handles home page.
"""
from fastapi import APIRouter

router = APIRouter(tags=["home"])


@router.get("/")
async def home():
    """API home endpoint."""
    return {
        "message": "Welcome to DALI E-Commerce API",
        "version": "1.0.0",
        "status": "active"
    }
