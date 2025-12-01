"""
Shipping service for calculating shipping fees.
"""
from decimal import Decimal
from geopy.distance import geodesic
from app.models import Address
from app.core.config import settings


class ShippingService:
    """Service for shipping calculations."""
    
    # Constants
    BASE_RATE = 50.0  # Base shipping rate
    PER_KM_RATE = 5.0  # Rate per kilometer
    PRIORITY_FEE_ADDITION = 100.0  # Additional fee for priority delivery
    
    @staticmethod
    def calculate_shipping_fee(address: Address, delivery_method: str) -> float:
        """Calculate shipping fee based on distance and delivery method."""
        if not address.latitude or not address.longitude:
            # Default fee if coordinates not available
            return ShippingService.BASE_RATE
        
        # Calculate distance from warehouse
        warehouse_coords = (settings.WAREHOUSE_LAT, settings.WAREHOUSE_LON)
        customer_coords = (float(address.latitude), float(address.longitude))
        
        distance_km = geodesic(warehouse_coords, customer_coords).kilometers
        
        # Calculate fee
        fee = ShippingService.BASE_RATE + (distance_km * ShippingService.PER_KM_RATE)
        
        # Add priority fee if needed
        if delivery_method == "Priority Delivery":
            fee += ShippingService.PRIORITY_FEE_ADDITION
        
        return round(fee, 2)
