# DALI E-Commerce API - Postman Test Scenarios

Complete end-to-end testing scenarios for all API endpoints.

**Base URL:** `http://localhost:8000`

---

## 🚀 Getting Started

### 1. Health Check
**Method:** `GET`  
**URL:** `http://localhost:8000/health`

**Expected Response:**
```json
{
  "status": "healthy"
}
```

### 2. API Home
**Method:** `GET`  
**URL:** `http://localhost:8000/`

**Expected Response:**
```json
{
  "message": "Welcome to DALI E-Commerce API",
  "version": "1.0.0",
  "status": "active"
}
```

---

## 📦 Scenario 1: Browse Products (No Login Required)

### 1.1 Get All Products
**Method:** `GET`  
**URL:** `http://localhost:8000/api/products`

**Expected:** Array of all products

### 1.2 Get Product Categories
**Method:** `GET`  
**URL:** `http://localhost:8000/api/products/categories`

**Expected:**
```json
{
  "categories": ["Electronics", "Clothing", "Home & Garden", ...]
}
```

### 1.3 Get Subcategories
**Method:** `GET`  
**URL:** `http://localhost:8000/api/products/categories/Electronics/subcategories`

**Expected:**
```json
{
  "subcategories": ["Smartphones", "Laptops", "Tablets", ...]
}
```

### 1.4 Filter Products by Category
**Method:** `GET`  
**URL:** `http://localhost:8000/api/products?category=Electronics`

### 1.5 Search Products
**Method:** `GET`  
**URL:** `http://localhost:8000/api/products?search=laptop`

### 1.6 Get Product Details
**Method:** `GET`  
**URL:** `http://localhost:8000/api/products/1`

**Expected:** Single product object

---

## 🛒 Scenario 2: Shopping as Guest (Anonymous Cart)

### 2.1 Add Item to Cart (No Login)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/cart/items`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

### 2.2 View Cart
**Method:** `GET`  
**URL:** `http://localhost:8000/api/cart`

**Expected:**
```json
{
  "items": [
    {
      "product_id": 1,
      "product_name": "Laptop",
      "product_price": 45000.00,
      "quantity": 2,
      "subtotal": 90000.00,
      "image": "laptop.jpg"
    }
  ],
  "subtotal": 90000.00,
  "total": 90000.00
}
```

### 2.3 Add More Items
**Method:** `POST`  
**URL:** `http://localhost:8000/api/cart/items`  
**Body:**
```json
{
  "product_id": 5,
  "quantity": 1
}
```

### 2.4 Update Cart Item Quantity
**Method:** `PUT`  
**URL:** `http://localhost:8000/api/cart/items/1?quantity=3`

### 2.5 Remove Item from Cart
**Method:** `DELETE`  
**URL:** `http://localhost:8000/api/cart/items/5`

---

## 👤 Scenario 3: User Registration & Authentication

### 3.1 Register New User
**Method:** `POST`  
**URL:** `http://localhost:8000/api/auth/register`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "email": "juan.delacruz@example.com",
  "password": "SecurePass123",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "phone_number": "+639171234567"
}
```

**Expected:** User account object + auto-login (session cookie set)

**Note:** Cart items from guest session are automatically merged!

### 3.2 Logout
**Method:** `POST`  
**URL:** `http://localhost:8000/api/auth/logout`

### 3.3 Login
**Method:** `POST`  
**URL:** `http://localhost:8000/api/auth/login`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "email": "juan.delacruz@example.com",
  "password": "SecurePass123"
}
```

### 3.4 Get Current User Info
**Method:** `GET`  
**URL:** `http://localhost:8000/api/auth/me`

**Note:** Must be logged in

### 3.5 Update Profile
**Method:** `PUT`  
**URL:** `http://localhost:8000/api/auth/profile`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "first_name": "Juan Carlos",
  "last_name": "Dela Cruz",
  "phone_number": "+639171234567"
}
```

---

## 📍 Scenario 4: Manage Addresses

### 4.1 Get Provinces
**Method:** `GET`  
**URL:** `http://localhost:8000/api/locations/provinces`

**Expected:** List of all provinces in Philippines

### 4.2 Get Cities for Province
**Method:** `GET`  
**URL:** `http://localhost:8000/api/locations/provinces/1/cities`

Replace `1` with actual province_id from step 4.1

### 4.3 Get Barangays for City
**Method:** `GET`  
**URL:** `http://localhost:8000/api/locations/cities/1/barangays`

Replace `1` with actual city_id from step 4.2

### 4.4 Create Address
**Method:** `POST`  
**URL:** `http://localhost:8000/api/addresses`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "province_id": 39,
  "city_id": 1376,
  "barangay_id": 41163,
  "additional_info": "123 Rizal Street, Unit 4B, Green Building",
  "phone_number": "+639171234567",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "is_default": true
}
```

**Note:** Use actual IDs from the location endpoints

### 4.5 Get User's Addresses
**Method:** `GET`  
**URL:** `http://localhost:8000/api/addresses`

### 4.6 Update Address
**Method:** `PUT`  
**URL:** `http://localhost:8000/api/addresses/1`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "additional_info": "123 Rizal Street, Unit 5A, Green Building (Updated)",
  "is_default": true
}
```

---

## 🏪 Scenario 5: Browse Stores (For Pickup)

### 5.1 Get All Stores
**Method:** `GET`  
**URL:** `http://localhost:8000/api/stores`

### 5.2 Search Stores
**Method:** `GET`  
**URL:** `http://localhost:8000/api/stores?search=manila`

### 5.3 Get Store Details
**Method:** `GET`  
**URL:** `http://localhost:8000/api/stores/1`

---

## 💳 Scenario 6: Checkout Process

### 6.1 Get Checkout Session
**Method:** `GET`  
**URL:** `http://localhost:8000/api/checkout/details`

### 6.2 Set Delivery Address
**Method:** `POST`  
**URL:** `http://localhost:8000/api/checkout/address`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "address_id": 1
}
```

**Note:** Use address_id from your created address

### 6.3 Calculate Shipping Fee
**Method:** `GET`  
**URL:** `http://localhost:8000/api/checkout/calculate-shipping?address_id=1&delivery_method=Standard Delivery`

**Expected:**
```json
{
  "delivery_method": "Standard Delivery",
  "shipping_fee": 125.50
}
```

### 6.3a Verify Shipping Fee Calculation (Distance-based)
This scenario validates that shipping fee changes with address distance using geodesic calculation.

Prerequisites:
- You are logged in and cookies are enabled.
- You have at least two addresses on your account with lat/lon:
  - Address A (near warehouse): `latitude=14.5995`, `longitude=120.9842` (Manila)
  - Address B (farther away): for example `latitude=14.6760`, `longitude=121.0437` (Quezon City)

1) Create Address A (near warehouse)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/addresses`  
**Body:**
```json
{
  "province_id": 39,
  "city_id": 1376,
  "barangay_id": 41163,
  "additional_info": "Near warehouse (Manila)",
  "phone_number": "+639171234567",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "is_default": false
}
```
Save `address_id` as `address_id_near`.

2) Create Address B (farther)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/addresses`  
**Body:**
```json
{
  "province_id": 39,
  "city_id": 1376,
  "barangay_id": 41163,
  "additional_info": "Farther (Quezon City)",
  "phone_number": "+639171234567",
  "latitude": 14.6760,
  "longitude": 121.0437,
  "is_default": false
}
```
Save `address_id` as `address_id_far`.

3) Calculate shipping for Address A (near)
**Method:** `GET`  
**URL:** `http://localhost:8000/api/checkout/calculate-shipping?address_id={{address_id_near}}&delivery_method=Standard Delivery`

**Expected:**
```json
{
  "delivery_method": "Standard Delivery",
  "shipping_fee": 50.0
}
```
Note: Close to base rate (₱50) because distance is near-zero.

4) Calculate shipping for Address B (far)
**Method:** `GET`  
**URL:** `http://localhost:8000/api/checkout/calculate-shipping?address_id={{address_id_far}}&delivery_method=Standard Delivery`

**Expected:**
```json
{
  "delivery_method": "Standard Delivery",
  "shipping_fee": 50.0
}
```
Note: Value should be higher than Address A. Formula: `fee = 50 + distance_km * 5`.

5) Priority Delivery surcharge
**Method:** `GET`  
**URL:** `http://localhost:8000/api/checkout/calculate-shipping?address_id={{address_id_far}}&delivery_method=Priority Delivery`

**Expected:** `shipping_fee` equals Standard Delivery fee + 100.

Warehouse reference (from `.env`): `WAREHOUSE_LAT=14.5995`, `WAREHOUSE_LON=120.9842`.

### 6.4 Set Shipping Method (Home Delivery)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/checkout/shipping`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "delivery_method": "Standard Delivery"
}
```

**Delivery Options:**
- `"Standard Delivery"` - Normal shipping
- `"Priority Delivery"` - +100 PHP extra
- `"Pickup Delivery"` - Free (requires store_id)

### 6.5 Set Shipping Method (Store Pickup)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/checkout/shipping`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "delivery_method": "Pickup Delivery",
  "store_id": 1
}
```

### 6.6 Process Payment (Cash on Delivery)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/checkout/payment`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "payment_method": "Cash on delivery (COD)"
}
```

**Expected:**
```json
{
  "success": true,
  "order_id": 1,
  "message": "Order placed successfully"
}
```

### 6.7 Process Payment (Online - Maya)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/checkout/payment`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "payment_method": "Maya"
}
```

**Expected:**
```json
{
  "success": true,
  "order_id": 2,
  "payment_url": "https://pg-sandbox.paymaya.com/checkout/...",
  "message": "Redirecting to payment gateway"
}
```

---

## 📦 Scenario 7: Order Management

### 7.1 Get User's Orders
**Method:** `GET`  
**URL:** `http://localhost:8000/api/orders`

**Expected:** List of all user's orders

### 7.2 Get Order Details
**Method:** `GET`  
**URL:** `http://localhost:8000/api/orders/1`

**Expected:** Full order details with items

### 7.3 Cancel Order
**Method:** `POST`  
**URL:** `http://localhost:8000/api/orders/1/cancel`

**Note:** Can only cancel if status is PROCESSING

---

## 🔐 Scenario 8: Password Management

### 8.1 Change Password (Logged In)
**Method:** `POST`  
**URL:** `http://localhost:8000/api/auth/change-password`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "current_password": "SecurePass123",
  "new_password": "NewSecurePass456",
  "confirm_password": "NewSecurePass456"
}
```

**Expected:** Session cleared, must login again

### 8.2 Forgot Password Request
**Method:** `POST`  
**URL:** `http://localhost:8000/api/auth/forgot-password?email=juan.delacruz@example.com`

**Expected:** Email sent with reset token (check console logs)

### 8.3 Reset Password with Token
**Method:** `POST`  
**URL:** `http://localhost:8000/api/auth/reset-password`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "BrandNewPass789",
  "confirm_password": "BrandNewPass789"
}
```

---

## 👨‍💼 Scenario 9: Admin Operations

### 9.1 Admin Login
**Method:** `POST`  
**URL:** `http://localhost:8000/api/admin/login`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "email": "admin@dali.com",
  "password": "password@1"
}
```

**Note:** Create admin account in database first

### 9.2 Get Dashboard Stats
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/stats`

**Expected:**
```json
{
  "total_orders": 150,
  "total_products": 200,
  "pending_orders": 25,
  "total_revenue": 150000.00
}
```

### 9.3 Get All Inventory
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/inventory`

### 9.4 Search Inventory
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/inventory?search=laptop&category=Electronics`

### 9.5 Get Product Details
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/products/1`

### 9.6 Update Product Stock
**Method:** `PUT`  
**URL:** `http://localhost:8000/api/admin/products/1/stock`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "quantity": 50
}
```

### 9.7 Get All Orders
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/orders`

### 9.8 Search Orders
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/orders?search=juan`

### 9.9 Get Order Details
**Method:** `GET`  
**URL:** `http://localhost:8000/api/admin/orders/1`

### 9.10 Update Order Status
**Method:** `PUT`  
**URL:** `http://localhost:8000/api/admin/orders/1/status`  
**Headers:** `Content-Type: application/json`  
**Body:**
```json
{
  "status": "PREPARING_FOR_SHIPMENT"
}
```

**Valid Statuses:**
- `PROCESSING`
- `PREPARING_FOR_SHIPMENT`
- `IN_TRANSIT`
- `DELIVERED`
- `COLLECTED` (for pickup orders)
- `CANCELLED`
- `DELIVERY_FAILED`

### 9.11 Admin Logout
**Method:** `POST`  
**URL:** `http://localhost:8000/api/admin/logout`

---

## 🎯 Complete User Journey Test

Follow this sequence for a complete end-to-end test:

1. ✅ Health check
2. ✅ Browse products (no login)
3. ✅ Add items to cart as guest
4. ✅ Register account (cart merges automatically)
5. ✅ Get provinces/cities/barangays
6. ✅ Create delivery address
7. ✅ View cart (now saved to database)
8. ✅ Set checkout address
9. ✅ Calculate shipping
10. ✅ Set delivery method
11. ✅ Process payment (COD)
12. ✅ View order details
13. ✅ View all orders
14. ✅ Update profile
15. ✅ Logout

---

## 💡 Postman Tips

### Enable Cookie Jar
1. Settings → General → Cookie jar: ON
2. This automatically saves session cookies between requests

### Create Environment Variables
```
base_url = http://localhost:8000
user_email = juan.delacruz@example.com
user_password = SecurePass123
```

### Save Test Collection
Organize requests by scenario folders:
- 📁 Authentication
- 📁 Products
- 📁 Cart
- 📁 Checkout
- 📁 Orders
- 📁 Admin

### Auto-Save IDs
Use Postman Tests tab to auto-save response IDs:
```javascript
// After creating address
pm.environment.set("address_id", pm.response.json().address_id);

// After creating order
pm.environment.set("order_id", pm.response.json().order_id);
```

---

## ⚠️ Common Issues

**401 Unauthorized:** Make sure you're logged in and cookies are enabled

**404 Not Found:** Database might not be initialized with data

**500 Server Error:** Check server logs for details

**CORS Error:** Server has CORS enabled for all origins in dev mode
