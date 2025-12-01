"""
Home router - handles home page.
"""
from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter(tags=["home"])


@router.get("/")
async def home():
    """API home endpoint."""
    return {
        "message": "Welcome to DALI E-Commerce API",
        "version": "1.0.0",
        "status": "active"
    }
