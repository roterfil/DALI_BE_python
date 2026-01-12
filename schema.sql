-- Drop tables in order of dependency to avoid foreign key constraints errors.
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS review_images CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS order_pickups CASCADE;
DROP TABLE IF EXISTS admin_accounts CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS barangays CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stores CASCADE;


-- Location Tables
CREATE TABLE provinces (
                           province_id     SERIAL PRIMARY KEY,
                           province_name   VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE cities (
                        city_id         SERIAL PRIMARY KEY,
                        province_id     INTEGER NOT NULL REFERENCES provinces(province_id) ON DELETE CASCADE,
                        city_name       VARCHAR(255) NOT NULL,
                        UNIQUE(province_id, city_name)
);

CREATE TABLE barangays (
                           barangay_id     SERIAL PRIMARY KEY,
                           city_id         INTEGER NOT NULL REFERENCES cities(city_id) ON DELETE CASCADE,
                           barangay_name   VARCHAR(255) NOT NULL,
                           UNIQUE(city_id, barangay_name)
);


CREATE TABLE stores (
                        store_id        SERIAL PRIMARY KEY,
                        store_name      VARCHAR(255) NOT NULL,
                        store_lat  NUMERIC(10, 7),
                        store_lng  NUMERIC(10, 7)
);

CREATE TABLE products (
                          product_id          SERIAL PRIMARY KEY,
                          product_name        VARCHAR(255) NOT NULL,
                          product_description TEXT,
                          product_price       NUMERIC(10, 2) NOT NULL, -- Use NUMERIC for currency
                          product_discount_price NUMERIC(10, 2),       -- Sale/discount price
                          is_on_sale          BOOLEAN DEFAULT FALSE,  -- Whether product is currently on sale
                          product_category    VARCHAR(255),
                          product_subcategory VARCHAR(255),
                          product_quantity    INTEGER NOT NULL,
                          image               VARCHAR(255)
);

CREATE TABLE accounts (
                          account_id          SERIAL PRIMARY KEY,
                          account_first_name  VARCHAR(255),
                          account_last_name   VARCHAR(255),
                          account_email       VARCHAR(255) UNIQUE NOT NULL,
                          password_hash       VARCHAR(255) NOT NULL,
                          phone_number        VARCHAR(50),
                          profile_picture     VARCHAR(255),
                          reset_password_token VARCHAR(255),
                          is_email_verified   BOOLEAN DEFAULT FALSE,
                          email_verification_token VARCHAR(255),
                          is_super_admin      BOOLEAN DEFAULT FALSE
);

CREATE TABLE admin_accounts (
                                admin_id      SERIAL PRIMARY KEY,
                                account_email   VARCHAR(255) UNIQUE NOT NULL,
                                password_hash   VARCHAR(255) NOT NULL,
                                is_super_admin  BOOLEAN DEFAULT FALSE,
                                store_id        INTEGER REFERENCES stores(store_id)
);

CREATE TABLE addresses (
                           address_id      SERIAL PRIMARY KEY,
                           account_id      INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                           province_id     INTEGER NOT NULL REFERENCES provinces(province_id),
                           city_id         INTEGER NOT NULL REFERENCES cities(city_id),
                           barangay_id     INTEGER NOT NULL REFERENCES barangays(barangay_id),
                           additional_info VARCHAR(1024),
                           phone_number    VARCHAR(50),
                           latitude        NUMERIC(10, 7),
                           longitude       NUMERIC(10, 7),
                           created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                           is_default      BOOLEAN DEFAULT FALSE
);

CREATE TABLE cart_items (
                            cart_item_id SERIAL PRIMARY KEY,
                            account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                            product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                            quantity INTEGER NOT NULL,
                            UNIQUE(account_id, product_id)
);

CREATE TABLE orders (
                        order_id                SERIAL PRIMARY KEY,
                        account_id              INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                        address_id              INTEGER NOT NULL REFERENCES addresses(address_id),
                        payment_status          VARCHAR(255) NOT NULL CHECK (payment_status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')),
                        shipping_status         VARCHAR(255) NOT NULL CHECK (shipping_status IN ('PROCESSING', 'PREPARING_FOR_SHIPMENT', 'IN_TRANSIT', 'DELIVERED', 'COLLECTED', 'CANCELLED', 'DELIVERY_FAILED')),
                        payment_transaction_id  VARCHAR(255),
                        delivery_method         VARCHAR(255) NOT NULL,
                        payment_method          VARCHAR(255) NOT NULL,
                        total_price             NUMERIC(10, 2) NOT NULL,
                        voucher_code            VARCHAR(50),
                        voucher_discount        NUMERIC(10, 2) DEFAULT 0,
                        created_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
                             order_item_id SERIAL PRIMARY KEY,
                             order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
                             product_id    INTEGER NOT NULL REFERENCES products(product_id),
                             quantity      INTEGER NOT NULL,
                             unit_price    NUMERIC(10, 2) NOT NULL  -- Price at time of purchase (may be discounted)
);

CREATE TABLE order_pickups (
                               order_pickup_id SERIAL PRIMARY KEY,
                               order_id        INTEGER NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE, -- The link to the orders table. It MUST be unique.
                               store_id        INTEGER NOT NULL REFERENCES stores(store_id)
);

CREATE TABLE order_history (
                               history_id      SERIAL PRIMARY KEY,
                               order_id        INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
                               status          VARCHAR(255) NOT NULL,
                               notes           VARCHAR(1024) NOT NULL,
                               event_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Reviews
CREATE TABLE reviews (
                         review_id       SERIAL PRIMARY KEY,
                         product_id      INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                         account_id      INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
                         order_id        INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
                         order_item_id   INTEGER NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
                         rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                         comment         TEXT,
                         is_anonymous    BOOLEAN DEFAULT FALSE,
                         is_edited       BOOLEAN DEFAULT FALSE,
                         created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                         updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                         UNIQUE(order_item_id)
);

CREATE TABLE review_images (
                               image_id        SERIAL PRIMARY KEY,
                               review_id       INTEGER NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
                               image_url       VARCHAR(512) NOT NULL,
                               created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs for tracking admin actions
CREATE TABLE audit_logs (
                            log_id          SERIAL PRIMARY KEY,
                            actor_email     VARCHAR(255) NOT NULL,
                            action          VARCHAR(255) NOT NULL,
                            entity_type     VARCHAR(255) NOT NULL,
                            entity_id       INTEGER,
                            details         TEXT,
                            created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers
CREATE TABLE vouchers (
    voucher_code            VARCHAR(50) PRIMARY KEY,
    description             VARCHAR(255) NOT NULL,
    discount_type           VARCHAR(50) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value          NUMERIC(10, 2) NOT NULL,
    min_purchase_amount     NUMERIC(10, 2) DEFAULT 0,
    max_discount_amount     NUMERIC(10, 2),
    valid_from              TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    valid_until             TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    usage_limit             INTEGER,
    current_usage_count     INTEGER DEFAULT 0,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voucher_usage (
    usage_id                SERIAL PRIMARY KEY,
    voucher_code            VARCHAR(50) NOT NULL REFERENCES vouchers(voucher_code) ON DELETE CASCADE,
    account_id              INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    used_at                 TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_voucher UNIQUE (voucher_code, account_id)
);

CREATE INDEX IF NOT EXISTS idx_voucher_usage_code ON voucher_usage(voucher_code);
CREATE INDEX IF NOT EXISTS idx_orders_voucher ON orders(voucher_code);

ALTER TABLE orders
ADD CONSTRAINT fk_orders_voucher_code FOREIGN KEY (voucher_code) REFERENCES vouchers(voucher_code) ON DELETE SET NULL;
