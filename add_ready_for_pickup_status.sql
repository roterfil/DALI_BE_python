-- Migration to add READY_FOR_PICKUP status to shipping_status check constraint
-- Run this against your database to fix the constraint error

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shipping_status_check;

-- Add the new constraint with READY_FOR_PICKUP included
ALTER TABLE orders ADD CONSTRAINT orders_shipping_status_check 
CHECK (shipping_status IN ('PROCESSING', 'PREPARING_FOR_SHIPMENT', 'IN_TRANSIT', 'DELIVERED', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED', 'DELIVERY_FAILED'));
