"""
Addresses router - handles address management (JSON API).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user_required
from app.models import Address
from app.schemas import AddressCreate, AddressUpdate, AddressResponse

router = APIRouter(prefix="/api/addresses", tags=["addresses"])


@router.get("", response_model=List[AddressResponse])
async def get_addresses(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Get all addresses for current user."""
    return current_user.addresses


@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Get address by ID."""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.account_id == current_user.account_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return address


@router.post("", response_model=AddressResponse)
async def create_address(
    address_data: AddressCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Create new address."""
    address = Address(
        account_id=current_user.account_id,
        province_id=address_data.province_id,
        city_id=address_data.city_id,
        barangay_id=address_data.barangay_id,
        additional_info=address_data.additional_info,
        phone_number=address_data.phone_number,
        latitude=address_data.latitude,
        longitude=address_data.longitude,
        is_default=address_data.is_default
    )
    
    db.add(address)
    db.commit()
    db.refresh(address)
    
    return address


@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    address_data: AddressUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Update existing address."""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.account_id == current_user.account_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Update fields if provided
    if address_data.province_id is not None:
        address.province_id = address_data.province_id
    if address_data.city_id is not None:
        address.city_id = address_data.city_id
    if address_data.barangay_id is not None:
        address.barangay_id = address_data.barangay_id
    if address_data.additional_info is not None:
        address.additional_info = address_data.additional_info
    if address_data.phone_number is not None:
        address.phone_number = address_data.phone_number
    if address_data.latitude is not None:
        address.latitude = address_data.latitude
    if address_data.longitude is not None:
        address.longitude = address_data.longitude
    if address_data.is_default is not None:
        address.is_default = address_data.is_default
    
    db.commit()
    db.refresh(address)
    
    return address


@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Delete address."""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.account_id == current_user.account_id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    db.delete(address)
    db.commit()
    
    return {"message": "Address deleted successfully"}
