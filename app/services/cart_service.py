"""
Cart service for managing shopping cart operations.
Supports both session-based (anonymous) and database-based (authenticated) carts.
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from fastapi import Request
from app.models import CartItem, Product, Account
from app.schemas import CartItemCreate


class CartService:
    """Service for cart operations."""
    
    @staticmethod
    def get_session_cart(request: Request) -> Dict[int, int]:
        """Get cart from session (for anonymous users)."""
        return request.session.get("cart", {})
    
    @staticmethod
    def set_session_cart(request: Request, cart: Dict[int, int]):
        """Save cart to session."""
        # Convert int keys to strings for JSON serialization
        request.session["cart"] = {str(k): v for k, v in cart.items()}
    
    @staticmethod
    def get_cart_items(
        db: Session,
        request: Request,
        user: Optional[Account] = None
    ) -> List[Dict]:
        """
        Get cart items for the current user (authenticated or anonymous).
        Returns list of dictionaries with product and quantity information.
        """
        cart_items = []
        
        if user:
            # Authenticated user - get from database
            db_cart_items = db.query(CartItem).filter(
                CartItem.account_id == user.account_id
            ).all()
            
            for item in db_cart_items:
                cart_items.append({
                    "product": item.product,
                    "quantity": item.quantity,
                    "cart_item_id": item.cart_item_id
                })
        else:
            # Anonymous user - get from session
            session_cart = CartService.get_session_cart(request)
            
            for product_id_str, quantity in session_cart.items():
                product_id = int(product_id_str)
                product = db.query(Product).filter(Product.product_id == product_id).first()
                if product:
                    cart_items.append({
                        "product": product,
                        "quantity": quantity,
                        "cart_item_id": None
                    })
        
        return cart_items
    
    @staticmethod
    def get_cart_total(cart_items: List[Dict]) -> float:
        """Calculate total price of cart items, respecting active discounts."""
        total = 0.0
        for item in cart_items:
            product = item["product"]
            quantity = item["quantity"]
            
            # Use discount price if sale is active and price is set
            if product.is_on_sale and product.product_discount_price is not None:
                price = float(product.product_discount_price)
            else:
                price = float(product.product_price)
                
            total += price * quantity
        return total
    
    @staticmethod
    def add_to_cart(
        db: Session,
        request: Request,
        product_id: int,
        quantity: int = 1,
        user: Optional[Account] = None
    ):
        """Add item to cart (database or session)."""
        # Check if product exists and has sufficient stock
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            raise ValueError("Product not found")
        
        # Get current quantity in cart
        current_cart_qty = 0
        if user:
            existing_item = db.query(CartItem).filter(
                CartItem.account_id == user.account_id,
                CartItem.product_id == product_id
            ).first()
            if existing_item:
                current_cart_qty = existing_item.quantity
        else:
            session_cart = CartService.get_session_cart(request)
            current_cart_qty = session_cart.get(str(product_id), 0)
        
        # Check if total quantity would exceed available stock
        total_requested = current_cart_qty + quantity
        if total_requested > product.product_quantity:
            available = product.product_quantity - current_cart_qty
            if available <= 0:
                raise ValueError(f"Sorry, no more stock available. You already have {current_cart_qty} in your cart.")
            raise ValueError(f"Only {available} more available. You have {current_cart_qty} in cart, stock is {product.product_quantity}.")
        
        if user:
            # Authenticated user - add to database
            existing_item = db.query(CartItem).filter(
                CartItem.account_id == user.account_id,
                CartItem.product_id == product_id
            ).first()
            
            if existing_item:
                existing_item.quantity += quantity
            else:
                cart_item = CartItem(
                    account_id=user.account_id,
                    product_id=product_id,
                    quantity=quantity
                )
                db.add(cart_item)
            
            db.commit()
        else:
            # Anonymous user - add to session
            session_cart = CartService.get_session_cart(request)
            product_id_str = str(product_id)
            
            if product_id_str in session_cart:
                session_cart[product_id_str] += quantity
            else:
                session_cart[product_id_str] = quantity
            
            CartService.set_session_cart(request, {int(k): v for k, v in session_cart.items()})
    
    @staticmethod
    def update_quantity(
        db: Session,
        request: Request,
        product_id: int,
        quantity: int,
        user: Optional[Account] = None
    ):
        """Update quantity of item in cart."""
        if quantity < 1:
            raise ValueError("Quantity must be at least 1")
        
        # Check stock availability
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if product and quantity > product.product_quantity:
            raise ValueError(f"Only {product.product_quantity} available in stock.")
        
        if user:
            # Authenticated user - update database
            cart_item = db.query(CartItem).filter(
                CartItem.account_id == user.account_id,
                CartItem.product_id == product_id
            ).first()
            
            if cart_item:
                cart_item.quantity = quantity
                db.commit()
        else:
            # Anonymous user - update session
            session_cart = CartService.get_session_cart(request)
            product_id_str = str(product_id)
            
            if product_id_str in session_cart:
                session_cart[product_id_str] = quantity
                CartService.set_session_cart(request, {int(k): v for k, v in session_cart.items()})
    
    @staticmethod
    def remove_from_cart(
        db: Session,
        request: Request,
        product_id: int,
        user: Optional[Account] = None
    ):
        """Remove item from cart."""
        if user:
            # Authenticated user - remove from database
            cart_item = db.query(CartItem).filter(
                CartItem.account_id == user.account_id,
                CartItem.product_id == product_id
            ).first()
            
            if cart_item:
                db.delete(cart_item)
                db.commit()
        else:
            # Anonymous user - remove from session
            session_cart = CartService.get_session_cart(request)
            product_id_str = str(product_id)
            
            if product_id_str in session_cart:
                del session_cart[product_id_str]
                CartService.set_session_cart(request, {int(k): v for k, v in session_cart.items()})
    
    @staticmethod
    def clear_cart(
        db: Session,
        request: Request,
        user: Optional[Account] = None
    ):
        """Clear all items from cart."""
        if user:
            # Authenticated user - clear database cart
            db.query(CartItem).filter(CartItem.account_id == user.account_id).delete()
            db.commit()
        else:
            # Anonymous user - clear session cart
            request.session["cart"] = {}
    
    @staticmethod
    def merge_session_cart_with_db_cart(
        db: Session,
        request: Request,
        user_email: str
    ):
        """
        Merge session cart into database cart when user logs in.
        This is called after successful login/registration.
        """
        user = db.query(Account).filter(Account.email == user_email).first()
        if not user:
            return
        
        session_cart = CartService.get_session_cart(request)
        
        for product_id_str, quantity in session_cart.items():
            product_id = int(product_id_str)
            
            # Check if item already exists in user's cart
            existing_item = db.query(CartItem).filter(
                CartItem.account_id == user.account_id,
                CartItem.product_id == product_id
            ).first()
            
            if existing_item:
                existing_item.quantity += quantity
            else:
                cart_item = CartItem(
                    account_id=user.account_id,
                    product_id=product_id,
                    quantity=quantity
                )
                db.add(cart_item)
        
        db.commit()
        
        # Clear session cart
        request.session["cart"] = {}
