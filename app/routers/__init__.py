"""
Initialize router package.
Import all routers for easy access.
"""
from app.routers import (
    home,
    auth,
    products,
    cart,
    checkout,
    orders,
    addresses,
    stores,
    locations,
    admin
)

__all__ = [
    "home",
    "auth",
    "products",
    "cart",
    "checkout",
    "orders",
    "addresses",
    "stores",
    "locations",
    "admin"
]
