# DALI E-Commerce REST API Documentation

## Base URL
```
http://localhost:8000
```

## API Endpoints

### Health Check
- **GET** `/health` - Check if API is running

### Home
- **GET** `/` - API home and version info

---

## Authentication (`/api/auth`)

### Register
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+639123456789"
  }
  ```
- **Response:** Account object

### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** Account object

### Logout
- **POST** `/api/auth/logout`
- **Response:** Success message

### Get Current User
- **GET** `/api/auth/me` (requires authentication)
- **Response:** Current user account object

### Update Profile
- **PUT** `/api/auth/profile` (requires authentication)
- **Body:**
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+639123456789"
  }
  ```

### Change Password
- **POST** `/api/auth/change-password` (requires authentication)
- **Body:**
  ```json
  {
    "current_password": "oldpass",
    "new_password": "newpass",
    "confirm_password": "newpass"
  }
  ```

### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Body:** `email` (query parameter or form field)

### Reset Password
- **POST** `/api/auth/reset-password`
- **Body:**
  ```json
  {
    "token": "reset-token-from-email",
    "password": "newpassword",
    "confirm_password": "newpassword"
  }
  ```

---

## Products (`/api/products`)

### List Products
- **GET** `/api/products`
- **Query Params:**
  - `category` (optional) - Filter by category
  - `subcategory` (optional) - Filter by subcategory
  - `search` (optional) - Search by product name
- **Response:** Array of products

### Get Categories
- **GET** `/api/products/categories`
- **Response:** `{"categories": ["Category1", "Category2"]}`

### Get Subcategories
- **GET** `/api/products/categories/{category}/subcategories`
- **Response:** `{"subcategories": ["Sub1", "Sub2"]}`

### Get Product Details
- **GET** `/api/products/{product_id}`
- **Response:** Product object

---

## Shopping Cart (`/api/cart`)

### Get Cart
- **GET** `/api/cart`
- **Response:**
  ```json
  {
    "items": [
      {
        "product_id": 1,
        "product_name": "Product Name",
        "product_price": 99.99,
        "quantity": 2,
        "subtotal": 199.98,
        "image": "image.jpg"
      }
    ],
    "subtotal": 199.98,
    "total": 199.98
  }
  ```

### Add to Cart
- **POST** `/api/cart/items`
- **Body:**
  ```json
  {
    "product_id": 1,
    "quantity": 2
  }
  ```

### Update Cart Item
- **PUT** `/api/cart/items/{product_id}`
- **Query Param:** `quantity` (integer)

### Remove from Cart
- **DELETE** `/api/cart/items/{product_id}`

### Clear Cart
- **DELETE** `/api/cart`

---

## Checkout (`/api/checkout`)

### Get Checkout Details
- **GET** `/api/checkout/details`
- **Response:** Current checkout session

### Set Address
- **POST** `/api/checkout/address` (requires authentication)
- **Body:**
  ```json
  {
    "address_id": 1
  }
  ```

### Set Shipping Method
- **POST** `/api/checkout/shipping` (requires authentication)
- **Body:**
  ```json
  {
    "delivery_method": "Standard Delivery",
    "store_id": 1  // only for Pickup Delivery
  }
  ```

### Calculate Shipping
- **GET** `/api/checkout/calculate-shipping` (requires authentication)
- **Query Params:**
  - `address_id` - Address ID
  - `delivery_method` - Delivery method

### Process Payment
- **POST** `/api/checkout/payment` (requires authentication)
- **Body:**
  ```json
  {
    "payment_method": "Cash on delivery (COD)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "order_id": 123,
    "message": "Order placed successfully",
    "payment_url": "https://..." // only for online payment
  }
  ```

---

## Orders (`/api/orders`)

### Get User Orders
- **GET** `/api/orders` (requires authentication)
- **Response:** Array of user's orders

### Get Order Details
- **GET** `/api/orders/{order_id}` (requires authentication)
- **Response:** Order object with items

### Cancel Order
- **POST** `/api/orders/{order_id}/cancel` (requires authentication)

---

## Addresses (`/api/addresses`)

### List Addresses
- **GET** `/api/addresses` (requires authentication)
- **Response:** Array of user's addresses

### Get Address
- **GET** `/api/addresses/{address_id}` (requires authentication)

### Create Address
- **POST** `/api/addresses` (requires authentication)
- **Body:**
  ```json
  {
    "province_id": 1,
    "city_id": 1,
    "barangay_id": 1,
    "additional_info": "Street, building, unit",
    "phone_number": "+639123456789",
    "latitude": 14.5995,
    "longitude": 120.9842,
    "is_default": false
  }
  ```

### Update Address
- **PUT** `/api/addresses/{address_id}` (requires authentication)
- **Body:** Same as create (all fields optional)

### Delete Address
- **DELETE** `/api/addresses/{address_id}` (requires authentication)

---

## Locations (`/api/locations`)

### Get Provinces
- **GET** `/api/locations/provinces`
- **Response:** Array of provinces

### Get Cities
- **GET** `/api/locations/provinces/{province_id}/cities`
- **Response:** Array of cities

### Get Barangays
- **GET** `/api/locations/cities/{city_id}/barangays`
- **Response:** Array of barangays

---

## Stores (`/api/stores`)

### List Stores
- **GET** `/api/stores`
- **Query Param:** `search` (optional)
- **Response:** Array of stores

### Get Store
- **GET** `/api/stores/{store_id}`
- **Response:** Store object

---

## Admin (`/api/admin`)

### Admin Login
- **POST** `/api/admin/login`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "adminpass"
  }
  ```

### Admin Logout
- **POST** `/api/admin/logout`

### Get Inventory
- **GET** `/api/admin/inventory` (requires admin auth)
- **Query Params:**
  - `search` (optional)
  - `category` (optional)

### Get Product
- **GET** `/api/admin/products/{product_id}` (requires admin auth)

### Update Stock
- **PUT** `/api/admin/products/{product_id}/stock` (requires admin auth)
- **Body:**
  ```json
  {
    "quantity": 100
  }
  ```

### Get All Orders
- **GET** `/api/admin/orders` (requires admin auth)
- **Query Param:** `search` (optional)

### Get Order
- **GET** `/api/admin/orders/{order_id}` (requires admin auth)

### Update Order Status
- **PUT** `/api/admin/orders/{order_id}/status` (requires admin auth)
- **Body:**
  ```json
  {
    "status": "IN_TRANSIT"
  }
  ```
- **Valid statuses:** `PROCESSING`, `PREPARING_FOR_SHIPMENT`, `IN_TRANSIT`, `DELIVERED`, `COLLECTED`, `CANCELLED`, `DELIVERY_FAILED`

### Get Dashboard Stats
- **GET** `/api/admin/stats` (requires admin auth)
- **Response:**
  ```json
  {
    "total_orders": 150,
    "total_products": 200,
    "pending_orders": 25,
    "total_revenue": 50000.00
  }
  ```

---

## Authentication

The API uses **session-based authentication**. After login, a session cookie is set. Include this cookie in subsequent requests.

For **React**, use:
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // Important!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
```

---

## CORS

CORS is enabled for all origins in development. Update `main.py` for production.

---

## Auto-generated API Docs

Visit these URLs when the server is running:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`
