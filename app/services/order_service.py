"""
Order service for order management.
"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import (
    Order, OrderItem, OrderHistory, OrderPickup,
    Account, Address, Product, PaymentStatus, ShippingStatus,
    Voucher, VoucherUsage
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
        user = db.query(Account).filter(Account.account_email == user_email).first()
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
        subtotal = 0.0
        for item in cart_items:
            product = item["product"]
            qty = item["quantity"]
            
            # Logic: Determine the applicable price
            if product.is_on_sale and product.product_discount_price is not None:
                current_price = float(product.product_discount_price)
            else:
                current_price = float(product.product_price)
            
            subtotal += current_price * qty

        shipping_fee = checkout_details.get("shippingFee", 0.0)
        
        # Handle voucher discount
        voucher_code = None
        voucher_discount = 0.0
        applied_voucher = request.session.get("applied_voucher")
        
        if applied_voucher:
            voucher_code = applied_voucher.get("voucher_code")
            voucher_discount = applied_voucher.get("discount_amount", 0)
            
            # Re-validate voucher before creating order
            voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code).first()
            if voucher and voucher.is_active:
                now = datetime.utcnow()
                
                # Convert voucher dates to naive datetime for comparison
                valid_from = voucher.valid_from.replace(tzinfo=None) if voucher.valid_from.tzinfo else voucher.valid_from
                valid_until = voucher.valid_until.replace(tzinfo=None) if voucher.valid_until.tzinfo else voucher.valid_until
                
                if valid_from <= now <= valid_until:
                    # Check if already used by this user
                    existing_usage = db.query(VoucherUsage).filter(
                        VoucherUsage.voucher_code == voucher_code,
                        VoucherUsage.account_id == user.account_id
                    ).first()
                    
                    if existing_usage:
                        # User already used this voucher, clear it
                        voucher_code = None
                        voucher_discount = 0.0
                    elif voucher.usage_limit and voucher.usage_count >= voucher.usage_limit:
                        # Usage limit reached
                        voucher_code = None
                        voucher_discount = 0.0
                    else:
                        # Voucher is valid, recalculate discount to prevent tampering
                        if voucher.discount_type == "percentage":
                            calculated_discount = subtotal * (float(voucher.discount_value) / 100)
                            if voucher.max_discount_amount:
                                calculated_discount = min(calculated_discount, float(voucher.max_discount_amount))
                        else:
                            calculated_discount = min(float(voucher.discount_value), subtotal)
                        
                        voucher_discount = calculated_discount
                else:
                    # Voucher expired
                    voucher_code = None
                    voucher_discount = 0.0
            else:
                # Voucher not found or inactive
                voucher_code = None
                voucher_discount = 0.0
        
        total = subtotal + shipping_fee - voucher_discount
        
        # Determine payment status based on payment method
        payment_method = checkout_details.get("paymentMethod")
        # COD orders are PENDING until delivered; Maya/Card are PAID immediately (demo mode)
        if payment_method and "COD" in payment_method.upper():
            initial_payment_status = PaymentStatus.PENDING
        else:
            initial_payment_status = PaymentStatus.PAID
        
        # Create order
        order = Order(
            account_id=user.account_id,
            address_id=address_id,
            payment_status=initial_payment_status,
            shipping_status=ShippingStatus.PROCESSING,
            delivery_method=checkout_details.get("deliveryMethod"),
            payment_method=payment_method,
            total_price=total,
            voucher_code=voucher_code,
            voucher_discount=voucher_discount
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
            
            # Determine the price at time of purchase (use discount price if on sale)
            if product.is_on_sale and product.product_discount_price is not None:
                unit_price = float(product.product_discount_price)
            else:
                unit_price = float(product.product_price)
            
            # Create order item with the actual price paid
            order_item = OrderItem(
                order_id=order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                unit_price=unit_price
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
        # Create order history
        history = OrderHistory(
            order_id=order.order_id,
            status="PROCESSING",
            notes="Order placed successfully"
        )
        db.add(history)
        
        # Record voucher usage if applied
        if voucher_code and voucher_discount > 0:
            voucher = db.query(Voucher).filter(Voucher.voucher_code == voucher_code).first()
            if voucher:
                # Increment usage count
                voucher.usage_count += 1
                
                # Record usage in voucher_usage table
                voucher_usage = VoucherUsage(
                    voucher_code=voucher_code,
                    account_id=user.account_id,
                    order_id=order.order_id,
                    discount_amount=voucher_discount
                )
                db.add(voucher_usage)
        
        # Clear voucher from session
        if "applied_voucher" in request.session:
            del request.session["applied_voucher"]
        
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
        user = db.query(Account).filter(Account.account_email == user_email).first()
        if not user:
            raise ValueError("User not found")
        
        # Get cart items
        cart_items = CartService.get_cart_items(db, request, user)
        if not cart_items:
            raise ValueError("Cart is empty")
        
        # Calculate total
        subtotal = CartService.get_cart_total(cart_items)
        shipping_fee = checkout_details.get("shippingFee", 0.0)
        
        # Handle voucher discount
        voucher_code = None
        voucher_discount = 0.0
        applied_voucher = request.session.get("applied_voucher")
        
        if applied_voucher:
            voucher_code = applied_voucher.get("voucher_code")
            voucher_discount = applied_voucher.get("discount_amount", 0)
        
        total = subtotal + shipping_fee - voucher_discount
        
        # Create order with PENDING status
        order = Order(
            account_id=user.account_id,
            address_id=checkout_details.get("addressId"),
            payment_status=PaymentStatus.PENDING,
            shipping_status=ShippingStatus.PROCESSING,
            delivery_method=checkout_details.get("deliveryMethod"),
            payment_method=checkout_details.get("paymentMethod"),
            total_price=total,
            voucher_code=voucher_code,
            voucher_discount=voucher_discount
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
        # If already paid (Maya/Card), set to REFUNDED; otherwise CANCELLED
        if order.payment_status == PaymentStatus.PAID:
            order.payment_status = PaymentStatus.REFUNDED
        else:
            order.payment_status = PaymentStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        
        history = OrderHistory(
            order_id=order.order_id,
            status="CANCELLED",
            notes="Order cancelled by customer" + (" - Payment refunded" if order.payment_status == PaymentStatus.REFUNDED else "")
        )
        db.add(history)
        
        db.commit()
    
    @staticmethod
    def update_shipping_status(
        db: Session,
        order_id: int,
        status: ShippingStatus,
        notes: str = None
    ):
        """Update order shipping status (admin only)."""
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise ValueError("Order not found")
        
        order.shipping_status = status
        order.updated_at = datetime.utcnow()
        
        # If cancelled, also update payment status
        if status == ShippingStatus.CANCELLED:
            # If already paid (Maya/Card), set to REFUNDED; otherwise CANCELLED
            if order.payment_status == PaymentStatus.PAID:
                order.payment_status = PaymentStatus.REFUNDED
            else:
                order.payment_status = PaymentStatus.CANCELLED
            
            # Restore product quantities
            for item in order.order_items:
                product = db.query(Product).filter(Product.product_id == item.product_id).first()
                if product:
                    product.product_quantity += item.quantity

        # If collected (pickup completed), mark COD payments as PAID
        if status == ShippingStatus.COLLECTED:
            # Only update payment if it was pending (e.g., COD)
            if order.payment_status == PaymentStatus.PENDING:
                order.payment_status = PaymentStatus.PAID
                # Add history entry indicating payment received on collection
                paid_history = OrderHistory(
                    order_id=order.order_id,
                    status="PAID",
                    notes="Payment received on collection"
                )
                db.add(paid_history)
        
        # Use custom notes if provided, otherwise generate default
        history_notes = notes if notes else f"Status updated to {status.value}"
        
        history = OrderHistory(
            order_id=order.order_id,
            status=status.value,
            notes=history_notes
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
