"""
Pydantic schemas for request/response validation and serialization.
"""
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


# Enums
class PaymentStatusEnum(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class ShippingStatusEnum(str, Enum):
    PROCESSING = "PROCESSING"
    PREPARING_FOR_SHIPMENT = "PREPARING_FOR_SHIPMENT"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    COLLECTED = "COLLECTED"
    CANCELLED = "CANCELLED"
    DELIVERY_FAILED = "DELIVERY_FAILED"


# Account Schemas
class AccountBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None


class AccountCreate(AccountBase):
    password: str = Field(..., min_length=6, max_length=72)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password cannot exceed 72 bytes')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v and not v.startswith(('+63', '0')):
            raise ValueError('Phone number must start with +63 or 0')
        return v


class AccountUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=72)
    confirm_password: str


class PasswordReset(BaseModel):
    token: str
    password: str = Field(..., min_length=6, max_length=72)
    confirm_password: str


class AccountResponse(AccountBase):
    account_id: int
    is_email_verified: bool = False
    profile_picture: Optional[str] = None
    
    class Config:
        from_attributes = True


# Product Schemas
class ProductBase(BaseModel):
    product_name: str
    product_description: Optional[str] = None
    product_price: Decimal
    product_category: Optional[str] = None
    product_subcategory: Optional[str] = None
    product_quantity: int
    image: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    product_quantity: Optional[int] = None


class ProductResponse(ProductBase):
    product_id: int
    
    class Config:
        from_attributes = True


# Location Schemas
class ProvinceResponse(BaseModel):
    province_id: int
    province_name: str
    
    class Config:
        from_attributes = True


class CityResponse(BaseModel):
    city_id: int
    city_name: str
    province_id: int
    
    class Config:
        from_attributes = True


class BarangayResponse(BaseModel):
    barangay_id: int
    barangay_name: str
    city_id: int
    
    class Config:
        from_attributes = True


# Address Schemas
class AddressBase(BaseModel):
    additional_info: Optional[str] = None
    phone_number: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_default: bool = False


class AddressCreate(AddressBase):
    province_id: int
    city_id: int
    barangay_id: int


class AddressUpdate(AddressBase):
    province_id: Optional[int] = None
    city_id: Optional[int] = None
    barangay_id: Optional[int] = None


class AddressResponse(AddressBase):
    address_id: int
    account_id: int
    province_id: int
    city_id: int
    barangay_id: int
    created_at: datetime
    province: Optional[ProvinceResponse] = None
    city: Optional[CityResponse] = None
    barangay: Optional[BarangayResponse] = None
    
    class Config:
        from_attributes = True


# Cart Schemas
class CartItemBase(BaseModel):
    product_id: int
    quantity: int


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    cart_item_id: int
    product_id: int
    quantity: int
    product: ProductResponse
    
    class Config:
        from_attributes = True


# Store Schemas
class StoreResponse(BaseModel):
    store_id: int
    store_name: str
    store_lat: Optional[Decimal] = None
    store_lng: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


# Order Schemas
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int


class OrderItemResponse(OrderItemBase):
    order_item_id: int
    product: ProductResponse
    
    @property
    def subtotal(self):
        return float(self.product.product_price) * self.quantity
    
    class Config:
        from_attributes = True


class OrderHistoryResponse(BaseModel):
    history_id: int
    status: str
    notes: str
    event_timestamp: datetime
    
    class Config:
        from_attributes = True


class OrderPickupResponse(BaseModel):
    order_pickup_id: int
    store_id: int
    store: Optional[StoreResponse] = None
    
    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    address_id: int
    delivery_method: str
    payment_method: str
    store_id: Optional[int] = None


class OrderResponse(BaseModel):
    order_id: int
    account_id: int
    address_id: int
    payment_status: PaymentStatusEnum
    shipping_status: ShippingStatusEnum
    payment_transaction_id: Optional[str] = None
    delivery_method: str
    payment_method: str
    total_price: Decimal
    created_at: datetime
    updated_at: datetime
    account: Optional[AccountResponse] = None
    address: Optional[AddressResponse] = None
    order_items: List[OrderItemResponse] = []
    order_history: List[OrderHistoryResponse] = []
    order_pickup: Optional[OrderPickupResponse] = None
    
    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.order_items)
    
    @property
    def shipping_fee(self):
        return float(self.total_price) - self.subtotal
    
    @property
    def total_item_count(self):
        return sum(item.quantity for item in self.order_items)
    
    class Config:
        from_attributes = True


# Checkout Schemas
class CheckoutDetails(BaseModel):
    address_id: Optional[int] = None
    delivery_method: Optional[str] = None
    shipping_fee: float = 0.0
    store_id: Optional[int] = None
    payment_method: Optional[str] = None


# Admin Schemas
class AdminLogin(BaseModel):
    email: EmailStr
    password: str


# Login Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Review Schemas
class ReviewImageResponse(BaseModel):
    image_id: int
    image_url: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    order_item_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_anonymous: bool = False


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    is_anonymous: Optional[bool] = None


class ReviewerInfo(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReviewResponse(BaseModel):
    review_id: int
    product_id: int
    account_id: int
    order_id: int
    order_item_id: int
    rating: int
    comment: Optional[str] = None
    is_anonymous: bool
    created_at: datetime
    updated_at: datetime
    reviewer_name: Optional[str] = None
    images: List[ReviewImageResponse] = []
    
    class Config:
        from_attributes = True


class ProductReviewSummary(BaseModel):
    average_rating: float
    total_reviews: int
    rating_distribution: dict  # {1: count, 2: count, ...}
