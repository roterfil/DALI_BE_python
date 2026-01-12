"""
Shipping service for calculating shipping fees.
"""
import logging
from decimal import Decimal
from geopy.distance import geodesic
from app.models import Address
from app.core.config import settings

logger = logging.getLogger(__name__)


class ShippingService:
    """Service for shipping calculations."""
    
    # Constants
    BASE_RATE = 50.0  # Base shipping rate in pesos
    PER_KM_RATE = 20.0  # Rate per kilometer (₱20/km)
    PRIORITY_FEE_ADDITION = 100.0  # Additional fee for priority delivery
    
    @staticmethod
    def calculate_shipping_fee(address: Address, delivery_method: str) -> float:
        """Calculate shipping fee based on distance and delivery method.
        
        Formula: BASE_RATE + (distance_km * PER_KM_RATE)
        For Priority Delivery: add PRIORITY_FEE_ADDITION
        """
        # Check if address has coordinates
        if not address.latitude or not address.longitude:
            # Return base rate if no coordinates (shouldn't happen with new validation)
            logger.warning(f"Address {address.address_id} has no coordinates, using base rate")
            return ShippingService.BASE_RATE
        
        # Calculate distance from warehouse to customer
        warehouse_coords = (settings.WAREHOUSE_LAT, settings.WAREHOUSE_LON)
        customer_coords = (float(address.latitude), float(address.longitude))
        
        distance_km = geodesic(warehouse_coords, customer_coords).kilometers
        
        # Calculate fee: base + (distance * per_km_rate)
        fee = ShippingService.BASE_RATE + (distance_km * ShippingService.PER_KM_RATE)
        
        # Add priority fee if needed
        if delivery_method == "Priority Delivery":
            fee += ShippingService.PRIORITY_FEE_ADDITION
        
        return round(fee, 2)
    
    @staticmethod
    def calculate_distance(address: Address) -> float:
        """Calculate distance in km from warehouse to address."""
        if not address.latitude or not address.longitude:
            return 0.0
        
        warehouse_coords = (settings.WAREHOUSE_LAT, settings.WAREHOUSE_LON)
        customer_coords = (float(address.latitude), float(address.longitude))
        
        return round(geodesic(warehouse_coords, customer_coords).kilometers, 2)
