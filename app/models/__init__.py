"""
SQLAlchemy models for the DALI e-commerce application.
These models match the PostgreSQL schema defined in schema.sql
"""
from sqlalchemy import (
    Boolean, Column, Integer, String, Numeric, DateTime, ForeignKey,
    Text, CheckConstraint, UniqueConstraint, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.core.database import Base


# Enums
class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class ShippingStatus(str, enum.Enum):
    PROCESSING = "PROCESSING"
    PREPARING_FOR_SHIPMENT = "PREPARING_FOR_SHIPMENT"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    COLLECTED = "COLLECTED"
    CANCELLED = "CANCELLED"
    DELIVERY_FAILED = "DELIVERY_FAILED"


# Location Models
class Province(Base):
    __tablename__ = "provinces"
    
    province_id = Column(Integer, primary_key=True, index=True)
    province_name = Column(String(255), nullable=False, unique=True)
    
    # Relationships
    cities = relationship("City", back_populates="province", cascade="all, delete-orphan")
    addresses = relationship("Address", back_populates="province")


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (
        UniqueConstraint('province_id', 'city_name', name='_province_city_uc'),
    )
    
    city_id = Column(Integer, primary_key=True, index=True)
    province_id = Column(Integer, ForeignKey("provinces.province_id", ondelete="CASCADE"), nullable=False)
    city_name = Column(String(255), nullable=False)
    
    # Relationships
    province = relationship("Province", back_populates="cities")
    barangays = relationship("Barangay", back_populates="city", cascade="all, delete-orphan")
    addresses = relationship("Address", back_populates="city")


class Barangay(Base):
    __tablename__ = "barangays"
    __table_args__ = (
        UniqueConstraint('city_id', 'barangay_name', name='_city_barangay_uc'),
    )
    
    barangay_id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.city_id", ondelete="CASCADE"), nullable=False)
    barangay_name = Column(String(255), nullable=False)
    
    # Relationships
    city = relationship("City", back_populates="barangays")
    addresses = relationship("Address", back_populates="barangay")


# Store Model
class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(255), nullable=False)
    store_lat = Column(Numeric(10, 7))
    store_lng = Column(Numeric(10, 7))
    
    # Relationships
    order_pickups = relationship("OrderPickup", back_populates="store")


# Product Model
class Product(Base):
    __tablename__ = "products"
    
    product_id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(255), nullable=False)
    product_description = Column(Text)
    product_price = Column(Numeric(10, 2), nullable=False)
    product_category = Column(String(255))
    product_subcategory = Column(String(255))
    product_quantity = Column(Integer, nullable=False)
    image = Column(String(255))
    
    # Relationships
    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")


# Account Model
class Account(Base):
    __tablename__ = "accounts"
    
    account_id = Column(Integer, primary_key=True, index=True)
    account_first_name = Column(String(255))
    account_last_name = Column(String(255))
    account_email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone_number = Column(String(50))
    profile_picture = Column(String(255))
    reset_password_token = Column(String(255))
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255))
    is_super_admin = Column(Boolean, default=False)
    
    # Relationships
    addresses = relationship("Address", back_populates="account", cascade="all, delete-orphan", order_by="Address.is_default.desc(), Address.address_id")
    cart_items = relationship("CartItem", back_populates="account", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="account", cascade="all, delete-orphan", order_by="Order.created_at.desc()")
    reviews = relationship("Review", back_populates="account", cascade="all, delete-orphan")
    
    @property
    def email(self):
        """Alias for account_email to maintain consistency across codebase."""
        return self.account_email
    
    @email.setter
    def email(self, value):
        self.account_email = value
    
    @property
    def first_name(self):
        """Alias for account_first_name."""
        return self.account_first_name
    
    @first_name.setter
    def first_name(self, value):
        self.account_first_name = value
    
    @property
    def last_name(self):
        """Alias for account_last_name."""
        return self.account_last_name
    
    @last_name.setter
    def last_name(self, value):
        self.account_last_name = value
    
    @property
    def full_name(self):
        return f"{self.account_first_name} {self.account_last_name}"


# Admin Account Model
class AdminAccount(Base):
    __tablename__ = "admin_accounts"
    
    admin_id = Column(Integer, primary_key=True, index=True)
    account_email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_super_admin = Column(Boolean, default=False)


# Address Model
class Address(Base):
    __tablename__ = "addresses"
    
    address_id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), nullable=False)
    province_id = Column(Integer, ForeignKey("provinces.province_id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.city_id"), nullable=False)
    barangay_id = Column(Integer, ForeignKey("barangays.barangay_id"), nullable=False)
    additional_info = Column(String(1024))
    phone_number = Column(String(50))
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_default = Column(Boolean, default=False)
    
    # Relationships
    account = relationship("Account", back_populates="addresses")
    province = relationship("Province", back_populates="addresses")
    city = relationship("City", back_populates="addresses")
    barangay = relationship("Barangay", back_populates="addresses")
    orders = relationship("Order", back_populates="address")


# Cart Item Model
class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint('account_id', 'product_id', name='_account_product_uc'),
    )
    
    cart_item_id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    
    # Relationships
    account = relationship("Account", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


# Order Model
class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.address_id"), nullable=False)
    payment_status = Column(SQLEnum(PaymentStatus), nullable=False)
    shipping_status = Column(SQLEnum(ShippingStatus), nullable=False)
    payment_transaction_id = Column(String(255))
    delivery_method = Column(String(255), nullable=False)
    payment_method = Column(String(255), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    account = relationship("Account", back_populates="orders")
    address = relationship("Address", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    order_history = relationship("OrderHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderHistory.event_timestamp.desc()")
    order_pickup = relationship("OrderPickup", back_populates="order", uselist=False, cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="order", cascade="all, delete-orphan")
    
    @property
    def subtotal(self):
        """Calculate subtotal from order items."""
        return sum(item.subtotal for item in self.order_items)
    
    @property
    def shipping_fee(self):
        """Calculate shipping fee."""
        return float(self.total_price) - self.subtotal
    
    @property
    def total_item_count(self):
        """Get total item count."""
        return sum(item.quantity for item in self.order_items)


# Order Item Model
class OrderItem(Base):
    __tablename__ = "order_items"
    
    order_item_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
    review = relationship("Review", back_populates="order_item", uselist=False)
    
    @property
    def subtotal(self):
        """Calculate subtotal for this order item."""
        return float(self.product.product_price) * self.quantity


# Order Pickup Model
class OrderPickup(Base):
    __tablename__ = "order_pickups"
    
    order_pickup_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, unique=True)
    store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="order_pickup")
    store = relationship("Store", back_populates="order_pickups")


# Order History Model
class OrderHistory(Base):
    __tablename__ = "order_history"
    
    history_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    status = Column(String(255), nullable=False)
    notes = Column(String(1024), nullable=False)
    event_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="order_history")


# Audit Log Model
class AuditLog(Base):
    __tablename__ = "audit_logs"

    # DB currently has column `log_id`; map it to attribute `audit_id` for consistency
    audit_id = Column('log_id', Integer, primary_key=True, index=True)
    actor_email = Column(String(255), nullable=False)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(255), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# Review Model
class Review(Base):
    __tablename__ = "reviews"
    
    review_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    order_item_id = Column(Integer, ForeignKey("order_items.order_item_id", ondelete="CASCADE"), nullable=False, unique=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    is_anonymous = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="reviews")
    account = relationship("Account", back_populates="reviews")
    order = relationship("Order", back_populates="reviews")
    order_item = relationship("OrderItem", back_populates="review")
    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")


# Review Image Model
class ReviewImage(Base):
    __tablename__ = "review_images"
    
    image_id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.review_id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    review = relationship("Review", back_populates="images")
