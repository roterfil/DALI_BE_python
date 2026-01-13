"""
Quick script to apply database schema updates after merging.
Run this once to add missing columns and tables.
"""
from sqlalchemy import text
from app.core.database import engine

# SQL statements to update the database
updates = [
    # Add store_id to admin_accounts
    "ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(store_id);",
    
    # Add voucher columns to orders table
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50);",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_discount DECIMAL(10, 2) DEFAULT 0;",
    
    # Create vouchers table if not exists
    """
    CREATE TABLE IF NOT EXISTS vouchers (
        voucher_code VARCHAR(50) PRIMARY KEY,
        description TEXT NOT NULL,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
        discount_value DECIMAL(10, 2) NOT NULL,
        min_purchase_amount DECIMAL(10, 2),
        max_discount_amount DECIMAL(10, 2),
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    
    # Create voucher_usage table if not exists
    """
    CREATE TABLE IF NOT EXISTS voucher_usage (
        usage_id SERIAL PRIMARY KEY,
        voucher_code VARCHAR(50) NOT NULL REFERENCES vouchers(voucher_code) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
        discount_amount DECIMAL(10, 2) NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_voucher UNIQUE (voucher_code, account_id)
    );
    """,
    
    # Create store_inventory table if not exists  
    """
    CREATE TABLE IF NOT EXISTS store_inventory (
        inventory_id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    
    # Add discount columns to products if not exist
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS product_discount_price DECIMAL(10, 2);",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE;",
    
    # Add unit_price column to order_items to store price at time of purchase
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);",
    
    # Backfill existing order_items with product's current price (best effort for old orders)
    """
    UPDATE order_items 
    SET unit_price = p.product_price 
    FROM products p 
    WHERE order_items.product_id = p.product_id 
    AND order_items.unit_price IS NULL;
    """,
]

def apply_updates():
    print("Applying database updates...")
    with engine.connect() as conn:
        for i, sql in enumerate(updates, 1):
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"✓ Update {i} applied successfully")
            except Exception as e:
                print(f"✗ Update {i} error (may already exist): {e}")
                conn.rollback()
    print("\nDatabase updates complete!")

if __name__ == "__main__":
    apply_updates()
