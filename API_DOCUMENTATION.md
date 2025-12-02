# DALI E-Commerce API Documentation (FastAPI)

## Overview
This backend provides a full-featured RESTful JSON API for e-commerce operations. It is designed for integration with React or other modern frontends.

---

## Authentication
- Session-based (secure cookie)
- Register/login returns session cookie
- All endpoints under `/api/` prefix
- CORS enabled for frontend integration

---

## Key Endpoints & Examples

### Health Check
- `GET /health`
- Response: `{ "status": "healthy" }`

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user info
- `PUT /api/auth/profile` — Update profile
- `POST /api/auth/change-password` — Change password
- `POST /api/auth/forgot-password?email=...` — Request password reset
- `POST /api/auth/reset-password` — Reset password with token

### Products
- `GET /api/products` — List all products
- `GET /api/products/{id}` — Product details
- `GET /api/products/categories` — List categories
- `GET /api/products?category=...` — Filter by category
- `GET /api/products?search=...` — Search products

### Cart
- `GET /api/cart` — View cart
- `POST /api/cart/items` — Add item
- `PUT /api/cart/items/{id}?quantity=...` — Update quantity
- `DELETE /api/cart/items/{id}` — Remove item

### Addresses
- `GET /api/addresses` — List user addresses
- `POST /api/addresses` — Create address
- `PUT /api/addresses/{id}` — Update address

### Locations
- `GET /api/locations/provinces` — List provinces
- `GET /api/locations/provinces/{id}/cities` — Cities in province
- `GET /api/locations/cities/{id}/barangays` — Barangays in city

### Stores
- `GET /api/stores` — List stores
- `GET /api/stores/{id}` — Store details

### Checkout
- `GET /api/checkout/details` — Get checkout session
- `POST /api/checkout/address` — Set delivery address
- `GET /api/checkout/calculate-shipping?address_id=...&delivery_method=...` — Calculate shipping fee
- `POST /api/checkout/shipping` — Set delivery method
- `POST /api/checkout/payment` — Process payment (COD, Maya, Card)

### Orders
- `GET /api/orders` — List user orders
- `GET /api/orders/{id}` — Order details
- `POST /api/orders/{id}/cancel` — Cancel order

### Admin
- `POST /api/admin/login` — Admin login
- `GET /api/admin/stats` — Dashboard stats
- `GET /api/admin/inventory` — List inventory
- `GET /api/admin/orders` — List all orders
- `PUT /api/admin/products/{id}/stock` — Update product stock
- `PUT /api/admin/orders/{id}/status` — Update order status

---

## Request/Response Example

**Register:**
```http
POST /api/auth/register
Content-Type: application/json
{
  "email": "juan.delacruz@example.com",
  "password": "SecurePass123",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "phone_number": "+639171234567"
}
```
Response:
```json
{
  "account_id": 1,
  "email": "juan.delacruz@example.com",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "phone_number": "+639171234567"
}
```

**Get Products:**
```http
GET /api/products
```
Response:
```json
[
  {
    "product_id": 1,
    "product_name": "Laptop",
    "product_price": 45000.00,
    "product_quantity": 10,
    "image": "laptop.jpg"
  },
  ...
]
```

**Checkout Payment (COD):**
```http
POST /api/checkout/payment
Content-Type: application/json
{
  "payment_method": "Cash on delivery (COD)"
}
```
Response:
```json
{
  "success": true,
  "order_id": 1,
  "message": "Order placed successfully"
}
```

---

## Error Handling
- 401 Unauthorized: Not logged in or session expired
- 400 Bad Request: Invalid input or missing data
- 404 Not Found: Resource does not exist
- 500 Server Error: Internal error (see logs)

---

## Database Setup
- See `README.md` and `schema.sql` for full instructions
- PostgreSQL required
- Import schema and sample data
- Configure `.env` for connection and credentials

---

## Environment Configuration
- `.env` file for secrets, database, email, payment gateway
- Example:
  ```
  DATABASE_URL=postgresql://postgres:password@localhost:5432/dali_db
  SECRET_KEY=...
  SMTP_HOST=smtp.gmail.com
  SMTP_USERNAME=...
  SMTP_PASSWORD=...
  MAYA_API_KEY=...
  ...
  ```

---

## Notes
- All endpoints return JSON
- CORS enabled for frontend integration
- Session cookies required for authentication
- Shipping fee calculated by geodesic distance (see README)
- Maya payment gateway requires valid sandbox credentials
- Email notifications require SMTP setup

---

For full test scenarios, see `POSTMAN_TEST_SCENARIOS.md`.
