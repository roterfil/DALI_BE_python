-- =====================================================================
-- COMPLETE DATABASE RESET - DALI Admin Dashboard Fix
-- =====================================================================
-- This script will:
-- 1. Drop ALL tables (clean slate)
-- 2. Recreate schema
-- 3. Load essential data (locations, stores, products)
-- 4. Create admin accounts
-- 5. Create test orders with order_pickups
-- 6. Populate store_inventory for test stores
-- 
-- WARNING: This will DELETE ALL DATA in your database!
-- Make sure you want to do this before running.
-- =====================================================================

-- =====================================================================
-- STEP 1: Drop all tables in correct order (respecting foreign keys)
-- =====================================================================
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS voucher_usage CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS order_pickups CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS store_inventory CASCADE;
DROP TABLE IF EXISTS admin_accounts CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS barangays CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

-- =====================================================================
-- STEP 2: Recreate schema
-- =====================================================================

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

-- Stores Table
CREATE TABLE stores (
    store_id        SERIAL PRIMARY KEY,
    store_name      VARCHAR(255) NOT NULL,
    store_lat       NUMERIC(10, 7),
    store_lng       NUMERIC(10, 7)
);

-- Products Table
CREATE TABLE products (
    product_id          SERIAL PRIMARY KEY,
    product_name        VARCHAR(255) NOT NULL,
    product_description TEXT,
    product_price       NUMERIC(10, 2) NOT NULL,
    product_discount_price NUMERIC(10, 2),
    is_on_sale          BOOLEAN DEFAULT FALSE,
    product_category    VARCHAR(255),
    product_subcategory VARCHAR(255),
    product_quantity    INTEGER NOT NULL,
    image               VARCHAR(255)
);

-- Store Inventory Table
CREATE TABLE store_inventory (
    inventory_id        SERIAL PRIMARY KEY,
    store_id            INTEGER NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    product_id          INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity            INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, product_id)
);

CREATE INDEX idx_store_inventory_store ON store_inventory(store_id);
CREATE INDEX idx_store_inventory_product ON store_inventory(product_id);
CREATE INDEX idx_store_inventory_quantity ON store_inventory(quantity);

CREATE INDEX idx_voucher_usage_code ON voucher_usage(voucher_code);
CREATE INDEX idx_orders_voucher ON orders(voucher_code);

-- Add foreign key constraint for voucher_code in orders
ALTER TABLE orders
ADD CONSTRAINT fk_orders_voucher_code FOREIGN KEY (voucher_code) REFERENCES vouchers(voucher_code) ON DELETE SET NULL;

CREATE TABLE accounts (
    account_id              SERIAL PRIMARY KEY,
    account_first_name      VARCHAR(255),
    account_last_name       VARCHAR(255),
    account_email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    phone_number            VARCHAR(50),
    reset_password_token    VARCHAR(255),
    is_email_verified       BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    is_super_admin          BOOLEAN DEFAULT FALSE
);

-- Admin Accounts Table
CREATE TABLE admin_accounts (
    admin_id        SERIAL PRIMARY KEY,
    account_email   VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    is_super_admin  BOOLEAN DEFAULT FALSE,
    store_id        INTEGER REFERENCES stores(store_id)
);

-- Addresses Table
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

-- Cart Items Table
CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    account_id   INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity     INTEGER NOT NULL,
    UNIQUE(account_id, product_id)
);

-- Orders Table
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

-- Order Items Table
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(product_id),
    quantity      INTEGER NOT NULL
);

-- Order Pickups Table
CREATE TABLE order_pickups (
    order_pickup_id SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
    store_id        INTEGER NOT NULL REFERENCES stores(store_id)
);

-- Order History Table
CREATE TABLE order_history (
    history_id      SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    status          VARCHAR(255) NOT NULL,
    notes           VARCHAR(1024) NOT NULL,
    event_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE audit_log (
    audit_id    SERIAL PRIMARY KEY,
    actor_email VARCHAR(255) NOT NULL,
    action      VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id   INTEGER,
    details     TEXT,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- STEP 3: Seed Essential Data (ALL STORES AND LOCATIONS)
-- =====================================================================
-- NOTE: This section includes ALL data from data.sql:
-- - All provinces, cities, and barangays in the Philippines
-- - All DALI store locations
-- =====================================================================

-- =================================================================
--  Seed the 'stores' table
-- =================================================================
INSERT INTO stores (store_name, store_lat, store_lng) VALUES
('DALI EVERYDAY GROCERY LALUD CALAPAN',13.4006319,121.1709454),
('DALI EVERYDAY GROCERY SOUTHCREST DASMA',14.3175479,120.9547456),
('DALI EVERYDAY GROCERY TROPICAL AVENUE',14.4508535,121.0006727),
('DALI EVERYDAY GROCERY STA.MARIA',14.073808,121.166151),
('DALI EVERYDAY GROCERY PUREZA',14.6007053,121.00457),
('DALI EVERYDAY GROCERY TROPICANA CASTLE SABANG',13.5195202,120.9754679),
('DALI EVERYDAY GROCERY AMUNTAY DASMA',14.3136817,120.9354039),
('DALI EVERYDAY GROCERY ELANG',14.3222888,120.9130979),
('DALI EVERYDAY GROCERY SHELL PATAG',14.8264575,120.9810946),
('DALI EVERYDAY GROCERY JADE HEIGHTS',14.3671093,121.0194842),
('DALI EVERYDAY GROCERY JUSTINVILLE',14.4361913,120.9497644),
('DALI EVERYDAY GROCERY SAHUD ULAN 2',14.3699505,120.8224897),
('DALI EVERYDAY GROCERY WHITE BEACH CORNER. BRGY SAN ISIDRO PUERTO GALERA',13.5039665,120.9076568),
('DALI EVERYDAY GROCERY ALFONSO TERMINAL',14.133754,120.85863),
('DALI EVERYDAY GROCERY MAGDIWANG 2',14.4054294,120.9852463),
('DALI EVERYDAY GROCERY PADRE PIO',14.0736447,121.1771502),
('DALI EVERYDAY GROCERY SAN ANTONIO 2 BINAN',14.3391743,121.0862868),
('DALI EVERYDAY GROCERY POBLACION SAN LUIS',13.8552253,120.9174854),
('DALI EVERYDAY GROCERY DULANGAN SAN LUIS',13.8470593,120.9178691),
('DALI EVERYDAY GROCERY CENTRAL',14.6448003,121.0514439),
('DALI EVERYDAY GROCERY SAPANG',14.2815977,120.7092333),
('DALI EVERYDAY GROCERY CALAPAN CITIMALL BRGY. LIBIS',13.4135989,121.1841158),
('DALI EVERYDAY GROCERY BATIA 2',14.8392749,120.9440626),
('DALI EVERYDAY GROCERY BATIA 1',14.8336595,120.9403469),
('DALI EVERYDAY GROCERY PINUGAY',14.609179,121.2602401),
('DALI EVERYDAY GROCERY SAGAD',14.5669597,121.079919),
('DALI EVERYDAY GROCERY NIOG HIGHWAY',14.4554644,120.9577158),
('DALI EVERYDAY GROCERY COMEMBO',14.5521126,121.0633272),
('DALI EVERYDAY GROCERY LAKE MIMOSA',14.5305827,121.0826293),
('DALI EVERYDAY GROCERY CALAPAN TOWN CENTER CAMILMIL',13.4064273,121.1761171),
('DALI EVERYDAY GROCERY ST. FRANCIS',14.4920358,121.0132584),
('DALI EVERYDAY GROCERY SJDM HEIGHTS',14.8090125,121.0420781),
('DALI EVERYDAY GROCERY BUBUKAL HIGHWAY',14.2615646,121.4017249),
('DALI EVERYDAY GROCERY BATINGAN',14.4752182,121.2004872),
('DALI EVERYDAY GROCERY PUNTA',14.1821231,121.1248215),
('DALI EVERYDAY GROCERY CALTEX RD. SAN PASCUAL',13.7838831,121.0332201),
('DALI EVERYDAY GROCERY UWISAN',14.2374724,121.1729525),
('DALI EVERYDAY GROCERY REDWOOD',14.5429968,121.1291894),
('DALI EVERYDAY GROCERY JAVIER TAYTAY',14.5711164,121.1306629),
('DALI EVERYDAY GROCERY MATAGBAK',14.1303607,120.8367982),
('DALI EVERYDAY GROCERY MARTINVILLE',14.4666273,120.9961112),
('DALI EVERYDAY GROCERY TOCLONG',14.4386608,120.9301939),
('DALI EVERYDAY GROCERY MONTEREY HILLS MARIKINA',14.6553632,121.1311045),
('DALI EVERYDAY GROCERY STO. NINO',14.6400292,121.0943998),
('DALI EVERYDAY GROCERY T. SULIT',14.5417072,121.0632968),
('DALI EVERYDAY GROCERY BANTAYAN RD. CALAMBA CITY',14.2106483,121.159424),
('DALI EVERYDAY GROCERY STO.TOMAS ROAD BINAN',14.3092313,121.0627115),
('DALI EVERYDAY GROCERY STA. MARIA BYPASS',14.8222603,120.9528519),
('DALI EVERYDAY GROCERY MATAAS NA LUPA',14.226934,120.883695),
('DALI EVERYDAY GROCERY WINDFIELDS',14.2587665,121.1473398),
('DALI EVERYDAY GROCERY CALUMPANG LEJOS',14.2368609,120.8452588),
('DALI EVERYDAY GROCERY CAMINO REAL',14.4170069,121.0063604),
('DALI EVERYDAY GROCERY STO.DOMINGO',14.1805875,121.2646383),
('DALI EVERYDAY GROCERY MAXIMA',14.4290772,120.9441036),
('DALI EVERYDAY GROCERY KATARUNGAN',14.775196,121.057839),
('DALI EVERYDAY GROCERY SAN JUAN',14.3875191,120.8693862),
('DALI EVERYDAY GROCERY C5 QUIRINO',14.6910317,121.0280207),
('DALI EVERYDAY GROCERY PASONG BUAYA',14.3936657,120.9665953),
('DALI EVERYDAY GROCERY BANJO EAST',14.0570229,121.1440056),
('DALI EVERYDAY GROCERY EDSA BANGKAL',14.5404375,121.0154899),
('DALI EVERYDAY GROCERY EL CAMINO',14.7665315,120.9997611),
('DALI EVERYDAY GROCERY TANDANG SORA AVE.',14.6767989,121.032712),
('DALI EVERYDAY GROCERY MAJADA OUT',14.194682,121.106623),
('DALI EVERYDAY GROCERY LLANO',14.7331944,121.0121667),
('DALI EVERYDAY GROCERY MARCOS HWAY BARAS',14.6242372,121.2499456),
('DALI EVERYDAY GROCERY TOCS',14.6256209,121.1317915),
('DALI EVERYDAY GROCERY KABESANG IMO',14.7117094,120.940902),
('DALI EVERYDAY GROCERY BAGONG SILANG PH. 2',14.7744141,121.0525775),
('DALI EVERYDAY GROCERY ARNALDO HIGHWAY',14.306723,120.921691),
('DALI EVERYDAY GROCERY MERIDIAN PLACE',14.3201751,120.8817419),
('DALI EVERYDAY GROCERY GEN T. DE LEON',14.6879299,120.9988995),
('DALI EVERYDAY GROCERY KING SOLOMON',14.7633446,121.0529476),
('DALI EVERYDAY GROCERY SAN GREGORIO',14.0561898,121.3296665),
('DALI EVERYDAY GROCERY LUYOS TANAUAN CITY',14.1236982,121.0720196),
('DALI EVERYDAY GROCERY CAPIPISA',14.3504196,120.7980721),
('DALI EVERYDAY GROCERY TIERRA DE STA. MARIA',14.8716944,121.0105278),
('DALI EVERYDAY GROCERY SAN GABRIEL',14.3519151,120.9140592),
('DALI EVERYDAY GROCERY GARDEN GROVE',14.3515125,120.9523424),
('DALI EVERYDAY GROCERY MESCOBIN ST.',14.1930661,121.2354231),
('DALI EVERYDAY GROCERY BSU NASUGBU',14.0675501,120.6285347),
('DALI EVERYDAY GROCERY CAYBUNGA BALAYAN',13.945617,120.758593),
('DALI EVERYDAY GROCERY SEVERINA',14.465876,121.0436198),
('DALI EVERYDAY GROCERY STA CLARA GENTRI',14.3801395,120.8821731),
('DALI EVERYDAY GROCERY SAN ANTONIO BAY',14.1886425,121.2825626),
('DALI EVERYDAY GROCERY LORETTO',14.6578806,120.988595),
('DALI EVERYDAY GROCERY MANGAS ALFONSO',14.1164888,120.8667035),
('DALI EVERYDAY GROCERY CONGRESSIONAL AVE. QC.',14.673456,121.0543333),
('DALI EVERYDAY GROCERY LUCSUHIN CALATAGAN',13.8805302,120.6411728),
('DALI EVERYDAY GROCERY TAMBO PARANAQUE',14.510876,120.9948792),
('DALI EVERYDAY GROCERY RIVERBANKS',14.6287626,121.0823453),
('DALI EVERYDAY GROCERY SANDIA HOMES',14.1124524,121.1014106),
('DALI EVERYDAY GROCERY LAMBAKIN',14.7730277,120.9772521),
('DALI EVERYDAY GROCERY MAPULANG LUPA',14.883666,120.9650498),
('DALI EVERYDAY GROCERY MAY IBA',14.5638317,121.2065331),
('DALI EVERYDAY GROCERY SOUTHBREEZE',14.3288216,121.0429186),
('DALI EVERYDAY GROCERY TANZA UNO NAVOTAS',14.6787439,120.9364276),
('DALI EVERYDAY GROCERY BUNGAD BAGTAS',14.3363133,120.8593156),
('DALI EVERYDAY GROCERY PASONG BUAYA',14.3873175,120.971086),
('DALI EVERYDAY GROCERY BUHAY NA TUBIG',14.3965045,120.9633729),
('DALI EVERYDAY GROCERY LAKANDULA',14.6443577,121.116831),
('DALI EVERYDAY GROCERY NHA TANGLAO',14.6168032,121.1856332),
('DALI EVERYDAY GROCERY UGBO',14.6238412,120.9643881),
('DALI EVERYDAY GROCERY AGA NASUGBU',14.0957363,120.7940378),
('DALI EVERYDAY GROCERY QUEENSROW EAST',14.3983734,120.9912193),
('DALI EVERYDAY GROCERY STO. SEPULCRO',14.579556,120.996273),
('DALI EVERYDAY GROCERY NOVELETA 2',14.4273482,120.8825747),
('DALI EVERYDAY GROCERY KABATUHAN',14.7406359,121.0073082),
('DALI EVERYDAY GROCERY APOLLO III',14.4268358,120.9983597),
('DALI EVERYDAY GROCERY ARIA',14.4460698,120.9843461),
('DALI EVERYDAY GROCERY MOJON',14.8640506,120.8197088),
('DALI EVERYDAY GROCERY CENTRAL PARK',14.8377778,120.814),
('DALI EVERYDAY GROCERY PALANGUE NAIC',14.2860827,120.8098942),
('DALI EVERYDAY GROCERY F MANALO',14.5814221,121.1773787),
('DALI EVERYDAY GROCERY BRGY. PAGASPAS TANAUAN',14.1040688,121.1342801),
('DALI EVERYDAY GROCERY PLATERO BINAN',14.3252168,121.0936182),
('DALI EVERYDAY GROCERY LAYUNAN',14.4678574,121.193363),
('DALI EVERYDAY GROCERY SAN CRISTOBAL VILLA CRISPINA RD. CALAMBA',14.2249304,121.1407142),
('DALI EVERYDAY GROCERY MENDEZ MARKET',14.1274633,120.9074502),
('DALI EVERYDAY GROCERY PLEASANT VILLAGE',14.4073479,121.0370633),
('DALI EVERYDAY GROCERY CALATAGAN POB',13.8309908,120.6311773),
('DALI EVERYDAY GROCERY DR. EDUARDO',14.8503611,121.0789722),
('DALI EVERYDAY GROCERY LIAS ROAD',14.7605693,120.9595451),
('DALI EVERYDAY GROCERY P. HERRERA ST.',13.759233,121.0629771),
('DALI EVERYDAY GROCERY A. CARANDANG ST. POBLACION D',13.8440973,121.202551),
('DALI EVERYDAY GROCERY STA. RITA GUIGUINTO',14.8550892,120.8603093),
('DALI EVERYDAY GROCERY CALUBCOB NAIC',14.2987968,120.7879674),
('DALI EVERYDAY GROCERY SAN JOSE RODRIGUEZ',14.7345634,121.1277095),
('DALI EVERYDAY GROCERY EAST SERVICE ROAD MUNTINLUPA',14.4385099,121.0456607),
('DALI EVERYDAY GROCERY BRGY. BAGONG POOK ROSARIO',13.8453711,121.2210467),
('DALI EVERYDAY GROCERY BAUTISTA DASMA',14.3135018,120.9764127),
('DALI EVERYDAY GROCERY CARASUCHI INDANG',14.1459136,120.8795666),
('DALI EVERYDAY GROCERY SAN JUAN BINANGONAN',14.4854638,121.1865314),
('DALI EVERYDAY GROCERY MARULAS',14.6748294,120.9811872),
('DALI EVERYDAY GROCERY MARIGMAN',14.5752533,121.1709314),
('DALI EVERYDAY GROCERY AMANG MANGGAHAN',14.600388,121.0915497),
('DALI EVERYDAY GROCERY PANTAY BUHANGIN RD.',14.5664794,121.229718),
('DALI EVERYDAY GROCERY NHA BAGONG NAYON 2',14.6190565,121.1732504),
('DALI EVERYDAY GROCERY BAGUMBONG',14.7502219,121.0074886),
('DALI EVERYDAY GROCERY BRGY. ANILAO LIPA CITY',13.908267,121.1728907),
('DALI EVERYDAY GROCERY PAMPLONA DOS',14.4529206,120.9757342),
('DALI EVERYDAY GROCERY BAGONG CALZADA',14.5296421,121.0727319),
('DALI EVERYDAY GROCERY SGT. MARIANO',14.5369488,121.0016978),
('DALI EVERYDAY GROCERY JANOPOL OCCIDENTAL',14.0820096,121.087417),
('DALI EVERYDAY GROCERY BRGY. PLARIDEL',14.00217,121.1790183),
('DALI EVERYDAY GROCERY MERCADO',14.2769481,121.0833102),
('DALI EVERYDAY GROCERY A. REYES AVE',14.5738737,121.0162338);

-- =================================================================
--  Seed the 'provinces' table
-- =================================================================
INSERT INTO provinces (province_id, province_name) VALUES
    (1, 'Metro Manila'),
    (67, 'Abra'),
    (72, 'Apayao'),
    (68, 'Benguet'),
    (69, 'Ifugao'),
    (70, 'Kalinga'),
    (71, 'Mountain Province'),
    (2, 'Ilocos Norte'),
    (3, 'Ilocos Sur'),
    (4, 'La Union'),
    (5, 'Pangasinan'),
    (6, 'Batanes'),
    (7, 'Cagayan'),
    (8, 'Isabela'),
    (9, 'Nueva Vizcaya'),
    (10, 'Quirino'),
    (17, 'Aurora'),
    (11, 'Bataan'),
    (12, 'Bulacan'),
    (13, 'Nueva Ecija'),
    (14, 'Pampanga'),
    (15, 'Tarlac'),
    (16, 'Zambales'),
    (18, 'Batangas'),
    (19, 'Cavite'),
    (20, 'Laguna'),
    (21, 'Quezon'),
    (22, 'Rizal'),
    (23, 'Marinduque'),
    (24, 'Occidental Mindoro'),
    (25, 'Oriental Mindoro'),
    (26, 'Palawan'),
    (27, 'Romblon'),
    (28, 'Albay'),
    (29, 'Camarines Norte'),
    (30, 'Camarines Sur'),
    (31, 'Catanduanes'),
    (32, 'Masbate'),
    (33, 'Sorsogon'),
    (34, 'Aklan'),
    (35, 'Antique'),
    (36, 'Capiz'),
    (39, 'Guimaras'),
    (37, 'Iloilo'),
    (38, 'Negros Occidental'),
    (40, 'Bohol'),
    (41, 'Cebu'),
    (42, 'Negros Oriental'),
    (43, 'Siquijor'),
    (49, 'Biliran'),
    (44, 'Eastern Samar'),
    (45, 'Leyte'),
    (46, 'Northern Samar'),
    (47, 'Samar'),
    (48, 'Southern Leyte'),
    (50, 'Zamboanga del Norte'),
    (51, 'Zamboanga del Sur'),
    (52, 'Zamboanga Sibugay'),
    (53, 'Bukidnon'),
    (54, 'Camiguin'),
    (55, 'Lanao del Norte'),
    (56, 'Misamis Occidental'),
    (57, 'Misamis Oriental'),
    (61, 'Davao de Oro'),
    (58, 'Davao del Norte'),
    (59, 'Davao del Sur'),
    (62, 'Davao Occidental'),
    (60, 'Davao Oriental'),
    (63, 'Cotabato'),
    (66, 'Sarangani'),
    (64, 'South Cotabato'),
    (65, 'Sultan Kudarat'),
    (78, 'Agusan del Norte'),
    (79, 'Agusan del Sur'),
    (82, 'Dinagat Islands'),
    (80, 'Surigao del Norte'),
    (81, 'Surigao del Sur'),
    (73, 'Basilan'),
    (74, 'Lanao del Sur'),
    (75, 'Maguindanao'),
    (76, 'Sulu'),
    (77, 'Tawi-Tawi')
ON CONFLICT (province_id) DO NOTHING;

-- NOTE: Cities and Barangays data is VERY LARGE (40,000+ barangays)
-- For the complete list, please refer to data.sql lines 1091-44777
-- Below are sample entries from Metro Manila for testing purposes:

INSERT INTO cities (city_id, province_id, city_name) VALUES
(1356, 1, 'Caloocan City'),
(1360, 1, 'Las Piñas City'),
(1361, 1, 'Makati City'),
(1357, 1, 'Malabon City'),
(1351, 1, 'Mandaluyong City'),
(1350, 1, 'Manila'),
(1352, 1, 'Marikina City'),
(1362, 1, 'Muntinlupa City'),
(1358, 1, 'Navotas City'),
(1353, 1, 'Parañaque City'),
(1354, 1, 'Pasay City'),
(1355, 1, 'Pasig City'),
(1359, 1, 'Quezon City'),
(1363, 1, 'San Juan City'),
(1364, 1, 'Taguig City'),
(1365, 1, 'Valenzuela City'),
(1366, 1, 'Pateros')
ON CONFLICT (city_id) DO NOTHING;

INSERT INTO barangays (barangay_id, city_id, barangay_name) VALUES
(17659, 1350, 'Ermita'),
(17660, 1350, 'Intramuros'),
(17661, 1350, 'Malate'),
(17662, 1350, 'Paco'),
(17663, 1350, 'Pandacan'),
(17664, 1350, 'Port Area'),
(17665, 1350, 'Quiapo'),
(17666, 1350, 'Sampaloc'),
(17667, 1350, 'San Miguel'),
(17668, 1350, 'San Nicolas'),
(17669, 1350, 'Santa Ana'),
(17670, 1350, 'Santa Cruz'),
(17671, 1350, 'Santa Mesa'),
(17672, 1350, 'Tondo')
ON CONFLICT (barangay_id) DO NOTHING;

-- =================================================================
-- IMPORTANT NOTE: 
-- For production use, you should run the FULL data.sql file which contains
-- ALL 1,634 cities and 42,000+ barangays across the Philippines.
-- This sample includes only Metro Manila cities and Manila barangays for testing.
-- =================================================================

-- Insert sample products (40 products total - matching actual image files)
INSERT INTO products (product_name, product_description, product_price, product_category, product_subcategory, product_quantity, image) VALUES
('Frozen Pork Shoulder 500g', 'Versatile and affordable. Perfect for adobo, sinigang, or stews.', 199.00, 'Frozen Goods', 'Pork', 55, 'frozen-pork-shoulder.png'),
('Pork Liempo (Belly) 500g', 'The perfect cut for grilling or frying to a crispy perfection. Marinate it for an unforgettable inihaw na liempo.', 225.50, 'Frozen Goods', 'Pork', 75, 'pork-liempo.png'),
('Beef Cubes for Stew 500g', 'Ideal for slow-cooking, caldereta, or mechado. These tender beef cubes will make your stews rich and flavorful.', 280.00, 'Frozen Goods', 'Beef', 40, 'beef-cubes.png'),
('Choice Ground Beef 500g', 'Versatile ground beef for making burgers, spaghetti sauce, or picadillo. Lean and full of flavor.', 275.00, 'Frozen Goods', 'Beef', 60, 'ground-beef.png'),
('Fresh Chicken Drumsticks 1kg', 'Juicy and meaty, perfect for your favorite fried chicken recipe, grilling, or tinola. A family favorite.', 250.00, 'Frozen Goods', 'Chicken', 80, 'chicken-drumstick.png'),
('Whole Dressed Chicken (1.2kg)', 'A whole chicken ready for roasting, lechon manok style, or for a hearty chicken soup. A versatile centerpiece for any meal.', 290.00, 'Frozen Goods', 'Chicken', 30, 'whole-chicken.png'),
('Oishi Prawn Crackers 90g', 'A classic Filipino snack, crispy and full of flavor.', 25.00, 'Snacks', 'Chips', 100, 'prawn.png'),
('Piattos Cheese Flavor 85g', 'Hexagon-shaped potato crisps with a rich cheese taste.', 35.00, 'Snacks', 'Chips', 120, 'piattos-cheese.png'),
('Cloud 9 Classic Chocolate Bar', 'A delicious combination of nougat, caramel, and peanuts, coated in rich chocolate.', 12.00, 'Snacks', 'Chocolates & Sweets', 200, 'cloud9.jpg'),
('Pinoy Cola 1.5L', 'The classic, refreshing taste of pinoy cola in a family-size bottle.', 45.00, 'Beverages', 'Sodas', 90, 'pinoycola.png'),
('AllTime Premium Hotdog Cocktail 500g', 'Juicy and flavorful bite-sized hotdogs. Perfect for snacks, parties, or quick meals.', 115.00, 'Frozen Goods', 'Processed', 30, 'hotdog-cocktails.png'),
('AllTime Lumpiang Shanghai 200g', 'Crispy spring rolls filled with savory meat. Great for frying and serving as a quick ulam or snack.', 55.00, 'Frozen Goods','Processed', 30, 'lumpiang-shanghai.jpg'),
('Healthy Cow Cream Cheese 180g', 'Smooth and creamy cheese spread. Ideal for bread, dips, baking, or cooking.', 85.00, 'Chiller', 'Dairy', 30, 'cream-cheese.png'),
('Pinoy Softdrinks 290 ml', 'Local fizzy drinks packed with classic Filipino flavors that is refreshing and perfect for any meal.', 14.00, 'Beverage', 'Sodas', 30, 'pinoy-softdrinks.png'),
('Healthy Cow Chocolate Milk Drink 100 ml', 'Delicious and creamy chocolate milk. Perfect for  baon or a quick sweet drink.', 12.25, 'Beverage', 'Milk', 40, 'choco-milk.png'),
('Healthy Cow Fortified Milk Drink 1L', 'Nutritious and creamy milk with essential vitamins. Ideal for daily family nutrition.', 78.00, 'Beverage', 'Milk', 40, 'fortified-milk.jpg'),
('Sparkling Wine Pink 750ml', 'Refreshing pink sparkling wine with crisp and fruity notes.', 199.00, 'Beverage', 'Alcoholic Beverages', 40, 'sparkling-wine-pink.jpg'),
('Rioja Red Wine 750ml', 'Full-bodied Rioja red wine with rich berry flavors and smooth finish.', 359.00, 'Beverage', 'Alcoholic Beverages', 40, 'oros.jpg'),
('Rioja Semi-Sweet White Wine 750ml', 'Delicate semi-sweet white wine with floral and fruity aromas.', 239.00, 'Beverage', 'Alcoholic Beverages', 40, 'oros.jpg'),
('Kilda Tequila - Lemon with Cream 700 ml', 'Smooth tequila blend with creamy texture and zesty lemon flavor.', 350.00, 'Beverage', 'Alcoholic Beverages', 40, 'kilda.jpg'),
('Kilda Tequila - Strawberry with Cream 700 ml', 'Creamy tequila with a sweet and tangy strawberry twist.', 350.00, 'Beverage', 'Alcoholic Beverages', 40, 'kilda.jpg'),
('Kandie Honey Lemon Menthol Candy 50s', 'Soothing menthol candies with a blend of honey and lemon. Perfect for cooling relief and fresh breath.', 33.00, 'Snacks', 'Candy', 100, 'kandie-lemon.png'),
('GrandBisco Cheese Cupcake 300g', 'Soft, cheesy cupcakes ideal for snacking or baon. Deliciously fluffy and satisfying.', 65.00, 'Snacks', 'Bread', 100, 'cheese-cupcake.png'),
('GrandBisco Choco Filled Crackers 30g', 'Crispy crackers with a rich chocolate center great for quick, sweet cravings.', 6.75, 'Snacks', 'Bread', 100, 'choco-filled-crackers.png'),
('Gonutt Choco Sticks 100g', 'Crunchy biscuit sticks dipped in smooth chocolate. A sweet and satisfying snack for sharing.', 19.00, 'Snacks', 'Chocolates & Sweets', 100, 'choco-sticks.png'),
('Chipsy Corn Chips Nacho Crispies Cheese 70g', 'Corn chips with rich cheesy nacho flavor. Great for merienda or movie-time snacks.', 19.50, 'Snacks', 'Chips',  30, 'corn-chips-cheese-bbq.png'),
('Chipsy Corn Chips Nacho Crispies BBQ 70g', 'Bold and smoky barbecue-flavored corn chips. Crunchy and flavorful in every bite.', 19.50, 'Snacks', 'Chips', 30, 'corn-chips-cheese-bbq.png'),
('Brownies with Choco Chip 20s 280g', 'Soft brownies with chocolate chips. Perfect for sharing, baon, or sweet cravings.', 67.00, 'Snacks', 'Chocolates & Sweets', 30, 'brownies-choco-chip.jpg'),
('Chipsy Cheesy Chips 24g', 'Crispy corn chips with bold cheesy flavor. A fun and tasty snack for all ages.', 6.00, 'Snacks', 'Chips', 30, 'chipsy-cheesy-chips.png'),
('GrandBisco Chocolate Chip Cookies 40g', 'Crunchy cookies packed with chocolate chips. Perfect for sweet cravings and quick snacks.', 11.50, 'Snacks', 'Chocolates & Sweets', 30, 'choco-chip.jpg'),
('Chipsy Caramel Puffs 25g', 'Light and crunchy puffs coated in sweet caramel. A satisfying treat anytime.', 5.50, 'Snacks', 'Chocolates & Sweets', 30, 'chipsy-caramel-puffs.png'),
('K-GO Crispy Seaweed 5g', 'Roasted crispy seaweed with a savory crunch. A healthy and flavorful snack choice.', 16.75, 'Snacks', 'Chocolates & Sweets', 30, 'crispy-seaweed.png'),
('Seapoint Corned Tuna Corned Tuna Chili 150g', 'Tasty corned tuna with a spicy chili blend. Great for quick, flavorful rice meals.', 33.75, 'Canned Goods', 'Fish', 30, 'corned-tuna-chili-nonspicy.png'),
('Seapoint Sardines Chunks In Chili Tomato Sauce 155g', 'Hearty sardine chunks in spicy tomato sauce. A delicious and convenient ulam option.', 20.00, 'Canned Goods', 'Fish', 30, 'sardines-chunks.png'),
('Seapoint Sardines Chunks In Tomato Sauce 155g', 'Savory sardines in rich tomato sauce. Perfect with rice for an affordable, filling meal.', 19.00, 'Canned Goods', 'Fish', 30, 'sardines-chunks.png'),
('Kulina Tomato Sauce 200g', 'Classic tomato sauce with a rich, tangy flavor perfect for cooking and dipping.', 17.50, 'Cooking Essentials', 'Sauce and Paste', 30, 'tomatosauce.jpg'),
('Kulina Tomato Paste 70g', 'Concentrated tomato paste that enhances the taste of your favorite dishes.', 9.00, 'Cooking Essentials', 'Sauce and Paste', 30, 'tomatosauce.jpg'),
('Kleanne Papaya Lotion 100 ml', 'Gentle moisturizing lotion with papaya extract. Helps brighten and smoothen skin with regular use.', 45.00, 'Hygiene', 'Body', 30, 'kleanee-papaya.png'),
('AllTime Premium Frozen Hotdog 1kg', 'Premium quality hotdogs perfect for breakfast, snacks, or hotdog sandwiches.', 180.00, 'Frozen Goods', 'Processed', 45, 'frozen-hotdog.png'),
('Blissful Chocolate Cake', 'Rich and moist chocolate cake perfect for celebrations or dessert.', 125.00, 'Snacks', 'Bread', 20, 'blissful.jpg');

-- =====================================================================
-- STEP 4: Create Admin Accounts for Test Stores
-- =====================================================================
-- Password: Admin@123
-- Hash: $2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm (CORRECT)

-- Super Admin Account (no store assignment)
INSERT INTO admin_accounts (account_email, password_hash, is_super_admin, store_id) VALUES
('superadmin@dali.com', '$2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm', TRUE, NULL);

-- Regular Store Admin Accounts
INSERT INTO admin_accounts (account_email, password_hash, is_super_admin, store_id) VALUES
('admin.calapan.citimall@dali.com', '$2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm', FALSE, 22),
('admin.manila.edsa@dali.com', '$2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm', FALSE, 60),
('admin.marikina.riverbanks@dali.com', '$2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm', FALSE, 90);

-- =====================================================================
-- STEP 5: Create Test Customer and Orders
-- =====================================================================

-- Create test customer
-- Email: testcustomer@dali.com
-- Password: Admin@123 (same as admin accounts for consistency)
-- Hash: $2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm (CORRECT - VERIFIED)
INSERT INTO accounts (account_first_name, account_last_name, account_email, password_hash, phone_number, is_email_verified)
VALUES ('Test', 'Customer', 'testcustomer@dali.com', '$2b$12$NWHfXy5vtA.ZGAoL7gka6eHOQvrGQBkE/pvfT5NDODJPUl7hBqmYm', '09171234567', TRUE);

-- Create test address (using Manila city and Ermita barangay)
INSERT INTO addresses (account_id, province_id, city_id, barangay_id, additional_info, phone_number, latitude, longitude, is_default)
VALUES (1, 1, 1350, 17659, 'Test Address for Orders', '09171234567', 14.5995, 120.9842, TRUE);

-- Store 22: 3 orders (₱45,250 total)
INSERT INTO orders (account_id, address_id, payment_status, shipping_status, delivery_method, payment_method, total_price, created_at)
VALUES 
    (1, 1, 'PAID', 'DELIVERED', 'DELIVERY', 'MAYA', 12500.00, NOW() - INTERVAL '5 days'),
    (1, 1, 'PAID', 'IN_TRANSIT', 'DELIVERY', 'MAYA', 8750.00, NOW() - INTERVAL '1 day'),
    (1, 1, 'PAID', 'COLLECTED', 'PICKUP', 'MAYA', 24000.00, NOW() - INTERVAL '2 days');

-- Order items for Store 22 orders
INSERT INTO order_items (order_id, product_id, quantity) VALUES
    (1, 1, 5), (1, 5, 3), (1, 10, 2),
    (2, 15, 4), (2, 20, 6),
    (3, 25, 8), (3, 30, 10);

-- Order pickups for Store 22
INSERT INTO order_pickups (order_id, store_id) VALUES (1, 22), (2, 22), (3, 22);

-- Store 60: 2 orders (₱18,900 total)
INSERT INTO orders (account_id, address_id, payment_status, shipping_status, delivery_method, payment_method, total_price, created_at)
VALUES
    (1, 1, 'PAID', 'PROCESSING', 'DELIVERY', 'MAYA', 6400.00, NOW() - INTERVAL '6 hours'),
    (1, 1, 'PAID', 'DELIVERED', 'DELIVERY', 'MAYA', 12500.00, NOW() - INTERVAL '3 days');

-- Order items for Store 60 orders
INSERT INTO order_items (order_id, product_id, quantity) VALUES
    (4, 11, 3), (4, 16, 5),
    (5, 21, 7), (5, 26, 4);

-- Order pickups for Store 60
INSERT INTO order_pickups (order_id, store_id) VALUES (4, 60), (5, 60);

-- Store 90: 4 orders (₱56,300 total)
INSERT INTO orders (account_id, address_id, payment_status, shipping_status, delivery_method, payment_method, total_price, created_at)
VALUES
    (1, 1, 'PAID', 'DELIVERED', 'DELIVERY', 'MAYA', 15200.00, NOW() - INTERVAL '7 days'),
    (1, 1, 'PAID', 'PREPARING_FOR_SHIPMENT', 'DELIVERY', 'MAYA', 9800.00, NOW() - INTERVAL '12 hours'),
    (1, 1, 'PAID', 'COLLECTED', 'PICKUP', 'MAYA', 18500.00, NOW() - INTERVAL '4 days'),
    (1, 1, 'PAID', 'IN_TRANSIT', 'DELIVERY', 'MAYA', 12800.00, NOW() - INTERVAL '1 day');

-- Order items for Store 90 orders
INSERT INTO order_items (order_id, product_id, quantity) VALUES
    (6, 31, 6), (6, 36, 8),
    (7, 1, 4), (7, 14, 5),
    (8, 22, 9), (8, 28, 7),
    (9, 33, 3), (9, 39, 11);

-- Order pickups for Store 90
INSERT INTO order_pickups (order_id, store_id) VALUES (6, 90), (7, 90), (8, 90), (9, 90);

-- =====================================================================
-- STEP 6: Populate Store Inventory for ALL Test Stores
-- =====================================================================

-- Store 22: ALL products with default stock
INSERT INTO store_inventory (store_id, product_id, quantity, low_stock_threshold)
SELECT 22, product_id, 50, 10 FROM products;

-- Store 60: ALL products with default stock
INSERT INTO store_inventory (store_id, product_id, quantity, low_stock_threshold)
SELECT 60, product_id, 50, 10 FROM products;

-- Store 90: ALL products with default stock
INSERT INTO store_inventory (store_id, product_id, quantity, low_stock_threshold)
SELECT 90, product_id, 50, 10 FROM products;

-- =====================================================================
-- STEP 7: Set Low Stock Items for Alerts
-- =====================================================================

-- Store 22: 6 low stock items
UPDATE store_inventory SET quantity = 2 WHERE store_id = 22 AND product_id = 15;  -- Rice 5kg
UPDATE store_inventory SET quantity = 3 WHERE store_id = 22 AND product_id = 20;  -- Soy Sauce
UPDATE store_inventory SET quantity = 4 WHERE store_id = 22 AND product_id = 10;  -- Eggs
UPDATE store_inventory SET quantity = 7 WHERE store_id = 22 AND product_id = 5;   -- Cheddar Cheese
UPDATE store_inventory SET quantity = 8 WHERE store_id = 22 AND product_id = 25;  -- Coffee
UPDATE store_inventory SET quantity = 9 WHERE store_id = 22 AND product_id = 30;  -- Canned Tuna

-- Store 60: 4 low stock items
UPDATE store_inventory SET quantity = 2 WHERE store_id = 60 AND product_id = 21;  -- Sugar
UPDATE store_inventory SET quantity = 3 WHERE store_id = 60 AND product_id = 26;  -- Green Tea
UPDATE store_inventory SET quantity = 7 WHERE store_id = 60 AND product_id = 11;  -- White Bread
UPDATE store_inventory SET quantity = 8 WHERE store_id = 60 AND product_id = 16;  -- Cooking Oil

-- Store 90: 7 low stock items
UPDATE store_inventory SET quantity = 2 WHERE store_id = 90 AND product_id = 31;  -- Canned Sardines
UPDATE store_inventory SET quantity = 3 WHERE store_id = 90 AND product_id = 33;  -- Corned Beef
UPDATE store_inventory SET quantity = 4 WHERE store_id = 90 AND product_id = 22;  -- Salt
UPDATE store_inventory SET quantity = 4 WHERE store_id = 90 AND product_id = 28;  -- Instant Noodles
UPDATE store_inventory SET quantity = 7 WHERE store_id = 90 AND product_id = 36;  -- Biscuits
UPDATE store_inventory SET quantity = 8 WHERE store_id = 90 AND product_id = 39;  -- Potato Chips
UPDATE store_inventory SET quantity = 9 WHERE store_id = 90 AND product_id = 14;  -- Pandesal

-- =====================================================================
-- STEP 8: Verification Queries
-- =====================================================================

-- Verify store inventory counts
SELECT 
    store_id,
    COUNT(*) as total_products,
    COUNT(CASE WHEN quantity < low_stock_threshold THEN 1 END) as low_stock_alerts
FROM store_inventory
WHERE store_id IN (22, 60, 90)
GROUP BY store_id
ORDER BY store_id;

-- Verify order counts and revenue
SELECT 
    s.store_id,
    s.store_name,
    COUNT(DISTINCT o.order_id) as total_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' THEN o.total_price ELSE 0 END), 0) as total_revenue
FROM stores s
LEFT JOIN order_pickups op ON s.store_id = op.store_id
LEFT JOIN orders o ON op.order_id = o.order_id
WHERE s.store_id IN (22, 60, 90)
GROUP BY s.store_id, s.store_name
ORDER BY s.store_id;

-- Verify admin accounts
SELECT account_email, store_id, is_super_admin FROM admin_accounts WHERE store_id IN (22, 60, 90);

-- =====================================================================
-- RESET COMPLETE!
-- =====================================================================
-- Expected Results:
-- 
-- Store 22 (admin.calapan.citimall@dali.com):
--   - Products: 40 (all products in inventory)
--   - Low Stock Alerts: 6
--   - Orders: 3
--   - Revenue: ₱45,250
--
-- Store 60 (admin.manila.edsa@dali.com):
--   - Products: 40 (all products in inventory)
--   - Low Stock Alerts: 4
--   - Orders: 2
--   - Revenue: ₱18,900
--
-- Store 90 (admin.marikina.riverbanks@dali.com):
--   - Products: 40 (all products in inventory)
--   - Low Stock Alerts: 7
--   - Orders: 4
--   - Revenue: ₱56,300
-- =====================================================================
