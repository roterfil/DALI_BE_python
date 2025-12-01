"""
Locations router - API endpoints for location cascading (Province -> City -> Barangay).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import Province, City, Barangay
from app.schemas import ProvinceResponse, CityResponse, BarangayResponse

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("/provinces", response_model=List[ProvinceResponse])
async def get_provinces(db: Session = Depends(get_db)):
    """Get all provinces."""
    provinces = db.query(Province).all()
    return provinces


@router.get("/provinces/{province_id}/cities", response_model=List[CityResponse])
async def get_cities(
    province_id: int,
    db: Session = Depends(get_db)
):
    """Get cities for a province."""
    cities = db.query(City).filter(City.province_id == province_id).all()
    return cities


@router.get("/cities/{city_id}/barangays", response_model=List[BarangayResponse])
async def get_barangays(
    city_id: int,
    db: Session = Depends(get_db)
):
    """Get barangays for a city."""
    barangays = db.query(Barangay).filter(Barangay.city_id == city_id).all()
    return barangays
