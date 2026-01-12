# Voucher System Database Update

## Summary of Changes

The database schema has been updated to support voucher display in order summaries. The following changes were made:

### Files Updated:
1. **schema.sql** - Updated orders table and added vouchers/voucher_usage tables
2. **COMPLETE_DATABASE_RESET.sql** - Updated to include all voucher table definitions
3. **data.sql** - Added sample voucher data
4. **frontend/src/pages/OrderDetailsPage.jsx** - Updated to display voucher information in order summary

### Database Schema Changes:

#### Orders Table
Added two new columns:
- `voucher_code` VARCHAR(50) - Foreign key to vouchers table
- `voucher_discount` NUMERIC(10, 2) DEFAULT 0 - Discount amount applied from voucher

#### New Tables:

**vouchers** table:
- `voucher_code` VARCHAR(50) PRIMARY KEY
- `description` VARCHAR(255)
- `discount_type` VARCHAR(50) - Either 'percentage' or 'fixed_amount'
- `discount_value` NUMERIC(10, 2)
- `min_purchase_amount` NUMERIC(10, 2)
- `max_discount_amount` NUMERIC(10, 2)
- `valid_from` TIMESTAMP
- `valid_until` TIMESTAMP
- `usage_limit` INTEGER
- `current_usage_count` INTEGER
- `is_active` BOOLEAN

**voucher_usage** table:
- Tracks which users have used which vouchers
- `voucher_code` + `account_id` unique constraint prevents multiple uses per user

### Sample Vouchers Added:
- **ZXCVBN100** - ₱100 fixed discount (min purchase ₱200)
- **WELCOME20** - 20% discount for new users
- **SUMMER50** - ₱50 off summer sale
- **FLAT15** - 15% discount on all products

## How to Apply Changes

### Option 1: Complete Database Reset (Recommended for Fresh Setup)
```powershell
# Run complete reset script - this will delete all data!
psql -U postgres -d dali_db -f COMPLETE_DATABASE_RESET.sql

# Load sample data
psql -U postgres -d dali_db -f data.sql
```

### Option 2: Migrate Existing Database
If you want to keep existing data, run the migration manually:

```powershell
# Connect to database
psql -U postgres -d dali_db

# Add voucher columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_discount NUMERIC(10, 2) DEFAULT 0;

# Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    voucher_code VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_purchase_amount NUMERIC(10, 2) DEFAULT 0,
    max_discount_amount NUMERIC(10, 2),
    valid_from TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    usage_limit INTEGER,
    current_usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

# Create voucher_usage table
CREATE TABLE IF NOT EXISTS voucher_usage (
    usage_id SERIAL PRIMARY KEY,
    voucher_code VARCHAR(50) NOT NULL REFERENCES vouchers(voucher_code) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    used_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_voucher UNIQUE (voucher_code, account_id)
);

# Add foreign key constraint
ALTER TABLE orders
ADD CONSTRAINT IF NOT EXISTS fk_orders_voucher_code 
FOREIGN KEY (voucher_code) REFERENCES vouchers(voucher_code) ON DELETE SET NULL;

# Create indexes
CREATE INDEX IF NOT EXISTS idx_voucher_usage_code ON voucher_usage(voucher_code);
CREATE INDEX IF NOT EXISTS idx_orders_voucher ON orders(voucher_code);

# Insert sample vouchers
INSERT INTO vouchers (
    voucher_code, description, discount_type, discount_value, 
    min_purchase_amount, max_discount_amount, valid_from, 
    valid_until, usage_limit, is_active
) VALUES
    ('ZXCVBN100', 'PHP 100 Discount', 'fixed_amount', 100.00, 200.00, 100.00, NOW(), NOW() + INTERVAL '365 days', 100, TRUE),
    ('WELCOME20', '20% Discount for New Users', 'percentage', 20.00, 0.00, 500.00, NOW(), NOW() + INTERVAL '365 days', 50, TRUE),
    ('SUMMER50', 'PHP 50 Off Summer Sale', 'fixed_amount', 50.00, 150.00, 50.00, NOW(), NOW() + INTERVAL '180 days', 200, TRUE),
    ('FLAT15', '15% Discount on All Products', 'percentage', 15.00, 0.00, 300.00, NOW(), NOW() + INTERVAL '90 days', 300, TRUE)
ON CONFLICT (voucher_code) DO NOTHING;
```

## Frontend Changes

The **OrderDetailsPage.jsx** has been updated to:
1. Display voucher code and discount in the Order Summary section
2. Properly position voucher between Subtotal and Shipping (matching checkout layout)
3. Only show voucher line if voucher_code exists AND discount > 0
4. Added console logging for debugging voucher data

## Testing

### To verify vouchers are displaying:
1. Go to an order details page
2. Check browser console for voucher data logging
3. Order Summary should show:
   ```
   Subtotal      ₱199.00
   Voucher (CODE)  -₱100.00
   Shipping      ₱186.80
   Total         ₱385.80
   ```

### Sample Test Cases:
- Order #18 in your current data should now display voucher info if one is associated
- Create new orders with vouchers to test full flow
- Verify voucher discount is correctly calculated and displayed

## Backend Requirements

The backend must be returning voucher data:
- `voucher_code` from Orders table
- `voucher_discount` from Orders table

Verify in API response: `GET /api/orders/{order_id}`

Example response:
```json
{
  "order_id": 18,
  "total_price": "385.80",
  "subtotal": "199.00",
  "shipping_fee": "186.80",
  "voucher_code": "ZXCVBN100",
  "voucher_discount": "100.00",
  ...
}
```
