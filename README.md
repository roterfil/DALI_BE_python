# DALI E-Commerce Backend (FastAPI)

## Overview
DALI is a full-featured e-commerce backend built with FastAPI, SQLAlchemy, and PostgreSQL. It supports user registration, authentication, product browsing, cart management, checkout, order processing, address management, admin operations, and payment integration (Maya sandbox).

---

## Features
- RESTful JSON API for all operations
- Session-based authentication (secure cookies)
- Password hashing (bcrypt)
- CORS enabled for React frontend
- Comprehensive Postman test scenarios
- Email notifications (password reset, order confirmation)
- Shipping fee calculation based on geodesic distance
- Admin dashboard and inventory management
- Payment gateway integration (Maya sandbox, COD)

---

## Project Structure
```
DALI_BE_Python/
├── app/
│   ├── core/           # Config, database, security
│   ├── models/         # SQLAlchemy models
│   ├── routers/        # API endpoints
│   ├── schemas/        # Pydantic schemas
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── main.py             # FastAPI app entrypoint
├── requirements.txt    # Python dependencies
├── .env                # Environment variables
├── README.md           # Project documentation
├── QUICKSTART.md       # Setup guide
├── POSTMAN_TEST_SCENARIOS.md # API test cases
├── schema.sql          # Database schema
└── data.sql            # Sample data
```

---

## Database Schema Visual

Below is a simplified entity-relationship diagram (ERD) for the DALI E-Commerce database:

```mermaid
erDiagram
    ACCOUNTS ||--o{ ADDRESSES : has
    ACCOUNTS ||--o{ CART_ITEMS : has
    ACCOUNTS ||--o{ ORDERS : places
    ACCOUNTS ||--o{ ORDER_HISTORY : logs
    ACCOUNTS ||--o{ ADMIN_ACCOUNTS : admin
    ADDRESSES ||--|> PROVINCES : located_in
    ADDRESSES ||--|> CITIES : located_in
    ADDRESSES ||--|> BARANGAYS : located_in
    CART_ITEMS ||--|> PRODUCTS : contains
    ORDERS ||--o{ ORDER_ITEMS : includes
    ORDERS ||--o{ ORDER_PICKUPS : pickup
    ORDERS ||--o{ ORDER_HISTORY : history
    ORDERS ||--|> ADDRESSES : ships_to
    ORDER_ITEMS ||--|> PRODUCTS : product
    ORDER_PICKUPS ||--|> STORES : store
    CITIES ||--o{ PROVINCES : belongs_to
    BARANGAYS ||--o{ CITIES : belongs_to
```

- **ACCOUNTS**: Users, linked to addresses, cart items, orders, and admin accounts
- **ADDRESSES**: Linked to provinces, cities, barangays
- **ORDERS**: Linked to accounts, addresses, order items, pickups, history
- **ORDER_ITEMS**: Linked to products
- **ORDER_PICKUPS**: Linked to stores
- **CART_ITEMS**: Linked to products
- **ADMIN_ACCOUNTS**: Admin users
- **PROVINCES, CITIES, BARANGAYS**: Location hierarchy
- **PRODUCTS, STORES**: Inventory and pickup locations

This diagram shows the main relationships and dependencies between tables. For full details, see `schema.sql`.

---

## Database Setup

### 1. Install PostgreSQL
- Download and install from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- Create a database named `dali_db`

### 2. Create Tables
- Run the schema file:
  ```sh
  psql -U postgres -d dali_db -f schema.sql
  ```

### 3. (Optional) Load Sample Data
- Run:
  ```sh
  psql -U postgres -d dali_db -f data.sql
  ```

### 4. Configure Connection
- Edit `.env`:
  ```
  DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/dali_db
  ```

---

## Running the Backend

1. Install Python 3.10+
2. Create a virtual environment:
   ```sh
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Configure `.env` (see sample in repo)
5. Start the server:
   ```sh
   python main.py
   ```
6. API available at `http://localhost:8000`

---

## API Documentation
- See `POSTMAN_TEST_SCENARIOS.md` for full endpoint list and test cases
- All endpoints return JSON
- CORS enabled for frontend integration

---

## Email & Payment Setup
- Configure SMTP credentials in `.env` for email notifications
- Maya sandbox credentials required for online payment (see `.env`)

---

## Technical Progress Report

### Backend
- All core features implemented and tested
- Session-based authentication and password hashing working
- Cart, checkout, order, address, and admin endpoints functional
- Shipping fee calculation accurate and configurable
- Maya payment gateway integrated (sandbox)
- Email notifications working (SMTP required)
- Database schema and sample data provided

### Documentation
- Quickstart and full README included
- Postman test scenarios for all endpoints
- Inline code comments and docstrings

### Next Steps
- Add more unit tests
- Improve error handling and logging
- Expand admin features (optional)
- Add frontend integration guide

---
