"""
Order service for order management.
"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import (
    Order, OrderItem, OrderHistory, OrderPickup,
    Account, Address, Product, PaymentStatus, ShippingStatus
)
from app.services.cart_service import CartService


class OrderService:
    """Service for order operations."""
    
    @staticmethod
    def create_order(
        db: Session,
        request,
        user_email: str,
        checkout_details: Dict
    ) -> Order:
        """Create a new order from cart items."""
        # Get user
        user = db.query(Account).filter(Account.email == user_email).first()
        if not user:
            raise ValueError("User not found")
        
        # Get cart items
        cart_items = CartService.get_cart_items(db, request, user)
        if not cart_items:
            raise ValueError("Cart is empty")
        
        # Validate address
        address_id = checkout_details.get("addressId")
        address = db.query(Address).filter(
            Address.address_id == address_id,
            Address.account_id == user.account_id
        ).first()
        if not address:
            raise ValueError("Invalid address")
        
        # Calculate total
        subtotal = CartService.get_cart_total(cart_items)
        shipping_fee = checkout_details.get("shippingFee", 0.0)
        total = subtotal + shipping_fee
        
        # Create order
        order = Order(
            account_id=user.account_id,
            address_id=address_id,
            payment_status=PaymentStatus.PAID,  # For COD, mark as PAID immediately
            shipping_status=ShippingStatus.PROCESSING,
            delivery_method=checkout_details.get("deliveryMethod"),
            payment_method=checkout_details.get("paymentMethod"),
            total_price=total
        )
        
        db.add(order)
        db.flush()  # Get order ID
        
        # Create order items and update product quantities
        for item in cart_items:
            product = item["product"]
            quantity = item["quantity"]
            
            # Check stock
            if product.product_quantity < quantity:
                raise ValueError(f"Insufficient stock for {product.product_name}")
            
            # Create order item
            order_item = OrderItem(
                order_id=order.order_id,
                product_id=product.product_id,
                quantity=quantity
            )
            db.add(order_item)
            
            # Update product quantity
            product.product_quantity -= quantity
        
        # Create pickup record if needed
        if checkout_details.get("deliveryMethod") == "Pickup Delivery":
            store_id = checkout_details.get("storeId")
            if store_id:
                order_pickup = OrderPickup(
                    order_id=order.order_id,
                    store_id=store_id
                )
                db.add(order_pickup)
        
        # Create order history
        history = OrderHistory(
            order_id=order.order_id,
            status="PROCESSING",
            notes="Order placed successfully"
        )
        db.add(history)
        
        # Clear cart
        CartService.clear_cart(db, request, user)
        
        db.commit()
        db.refresh(order)
        
        return order
    
    @staticmethod
    def create_pending_order(
        db: Session,
        request,
        user_email: str,
        checkout_details: Dict
    ) -> Order:
        """Create a pending order for payment gateway processing."""
        # Get user
        user = db.query(Account).filter(Account.email == user_email).first()
        if not user:
            raise ValueError("User not found")
        
        # Get cart items
        cart_items = CartService.get_cart_items(db, request, user)
        if not cart_items:
            raise ValueError("Cart is empty")
        
        # Calculate total
        subtotal = CartService.get_cart_total(cart_items)
        shipping_fee = checkout_details.get("shippingFee", 0.0)
        total = subtotal + shipping_fee
        
        # Create order with PENDING status
        order = Order(
            account_id=user.account_id,
            address_id=checkout_details.get("addressId"),
            payment_status=PaymentStatus.PENDING,
            shipping_status=ShippingStatus.PROCESSING,
            delivery_method=checkout_details.get("deliveryMethod"),
            payment_method=checkout_details.get("paymentMethod"),
            total_price=total
        )
        
        db.add(order)
        db.flush()
        
        # Create order items (don't update stock yet)
        for item in cart_items:
            order_item = OrderItem(
                order_id=order.order_id,
                product_id=item["product"].product_id,
                quantity=item["quantity"]
            )
            db.add(order_item)
        
        # Create pickup record if needed
        if checkout_details.get("deliveryMethod") == "Pickup Delivery":
            store_id = checkout_details.get("storeId")
            if store_id:
                order_pickup = OrderPickup(
                    order_id=order.order_id,
                    store_id=store_id
                )
                db.add(order_pickup)
        
        db.commit()
        db.refresh(order)
        
        return order
    
    @staticmethod
    def confirm_payment(db: Session, request, order_id: int):
        """Confirm payment and update product stock."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        if order.payment_status != PaymentStatus.PENDING:
            raise ValueError("Order is not pending payment")
        
        # Update product quantities
        for item in order.order_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            if product.product_quantity < item.quantity:
                raise ValueError(f"Insufficient stock for {product.product_name}")
            product.product_quantity -= item.quantity
        
        # Update order status
        order.payment_status = PaymentStatus.PAID
        order.updated_at = datetime.utcnow()
        
        # Add history
        history = OrderHistory(
            order_id=order.order_id,
            status="PAID",
            notes="Payment confirmed successfully"
        )
        db.add(history)
        
        # Clear cart
        account = db.query(Account).filter(Account.account_id == order.account_id).first()
        CartService.clear_cart(db, request, account)
        
        db.commit()
    
    @staticmethod
    def fail_payment(db: Session, order_id: int):
        """Mark order payment as failed."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            return
        
        order.payment_status = PaymentStatus.CANCELLED
        order.shipping_status = ShippingStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        
        history = OrderHistory(
            order_id=order.order_id,
            status="CANCELLED",
            notes="Payment failed or cancelled"
        )
        db.add(history)
        
        db.commit()
    
    @staticmethod
    def cancel_order(db: Session, order_id: int, user_email: str):
        """Cancel an order."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        # Verify ownership
        if order.account.email != user_email:
            raise ValueError("Unauthorized")
        
        # Can only cancel if not yet shipped
        if order.shipping_status in [ShippingStatus.DELIVERED, ShippingStatus.IN_TRANSIT]:
            raise ValueError("Cannot cancel order that is already in transit or delivered")
        
        # Restore product quantities
        for item in order.order_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            product.product_quantity += item.quantity
        
        # Update order
        order.shipping_status = ShippingStatus.CANCELLED
        order.payment_status = PaymentStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        
        history = OrderHistory(
            order_id=order.order_id,
            status="CANCELLED",
            notes="Order cancelled by customer"
        )
        db.add(history)
        
        db.commit()
    
    @staticmethod
    def update_shipping_status(
        db: Session,
        order_id: int,
        status: ShippingStatus
    ):
        """Update order shipping status (admin only)."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        order.shipping_status = status
        order.updated_at = datetime.utcnow()
        
        history = OrderHistory(
            order_id=order.order_id,
            status=status.value,
            notes=f"Status updated to {status.value}"
        )
        db.add(history)
        
        db.commit()
    
    @staticmethod
    def get_order_by_id(db: Session, order_id: int) -> Optional[Order]:
        """Get order by ID."""
        return db.query(Order).filter(Order.order_id == order_id).first()
    
    @staticmethod
    def set_payment_transaction_id(db: Session, order_id: int, transaction_id: str):
        """Set payment transaction ID."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if order:
            order.payment_transaction_id = transaction_id
            db.commit()
