# DALI E-Commerce Platform

A full-stack e-commerce application built with **FastAPI** (backend) and **React + Vite** (frontend).

---

## 🚀 Features

### Customer Features
- **User Authentication** - Registration, login, email verification, password reset
- **Profile Management** - Update profile info, upload profile picture
- **Product Browsing** - Browse by category, search products, view details
- **Shopping Cart** - Add/remove items, update quantities
- **Checkout** - Standard delivery or Click & Collect (pickup)
- **Payment Integration** - Maya (PayMaya) sandbox and Cash on Delivery
- **Order Tracking** - View order status, history timeline
- **Product Reviews** - Star ratings (1-5), comments, images, anonymous option
- **One-Time Review Edit** - Edit your review once after posting
- **Address Management** - Multiple addresses with Philippine location hierarchy

### Admin Features
- **Dashboard** - Order stats, revenue, low stock alerts
- **Order Management** - View all orders, update status
- **Inventory Management** - Update stock quantities and prices

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | React 18, Vite, Axios |
| Authentication | Session-based (secure cookies), bcrypt |
| Payment | Maya (PayMaya) Sandbox |
| Email | SMTP (Gmail compatible) |

---

## 📁 Project Structure

```
DALI_BE_Python/
├── app/
│   ├── core/           # Config, database, security
│   ├── models/         # SQLAlchemy models
│   ├── routers/        # API endpoints (auth, products, cart, orders, reviews, admin, etc.)
│   ├── schemas/        # Pydantic request/response schemas
│   ├── services/       # Business logic (email, shipping, Maya, etc.)
│   └── utils/          # Utility functions
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── context/    # React contexts (Auth, Cart)
│   │   ├── services/   # API service modules
│   │   └── styles/     # CSS files
│   └── public/         # Static assets
├── main.py             # FastAPI entrypoint
├── schema.sql          # Database schema
├── data.sql            # Sample data
├── requirements.txt    # Python dependencies
├── DOCUMENTATION.md    # Complete API & schema documentation
└── README.md           # This file
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE dali_db"

# Run schema
psql -U postgres -d dali_db -f schema.sql

# (Optional) Load sample data
psql -U postgres -d dali_db -f data.sql
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env  # Then edit with your credentials

# Start backend
python main.py
```

Backend runs at: `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`


---

## 📖 Documentation

For complete API reference, database schema details, and user flows, see:

📄 **[DOCUMENTATION.md](DOCUMENTATION.md)**

This includes:
- All 16 database tables with column definitions
- All API endpoints organized by router
- User flow diagrams (registration, shopping, checkout, reviews)
- Admin flow diagrams (orders, inventory)
- Payment integration details

---

## 🗄️ Database Overview

The application uses **17 tables**:

| Category | Tables |
|----------|--------|
| Users | `accounts`, `admin_accounts` |
| Products | `products` |
| Cart | `cart_items` |
| Orders | `orders`, `order_items`, `order_pickups`, `order_history` |
| Addresses | `addresses`, `provinces`, `cities`, `barangays` |
| Stores | `stores` |
| Reviews | `reviews`, `review_images` |
| Audit | `audit_logs` |

See [DOCUMENTATION.md](DOCUMENTATION.md) for complete schema details.

---

## 🔌 API Endpoints

| Router | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/api/auth` | register, login, logout, profile, password reset |
| Products | `/api/products` | list, search, categories, details |
| Cart | `/api/cart` | view, add, update, remove, clear |
| Checkout | `/api/checkout` | calculate shipping, place order, Maya callback |
| Orders | `/api/orders` | list, details, cancel |
| Addresses | `/api/addresses` | CRUD operations |
| Reviews | `/api/reviews` | create, edit (one-time), delete, images |
| Admin | `/api/admin` | dashboard, orders, inventory |
| Locations | `/api/locations` | provinces, cities, barangays |
| Stores | `/api/stores` | list pickup locations |

See [DOCUMENTATION.md](DOCUMENTATION.md) for complete API reference.

---

## 📱 Key User Flows

### Shopping Flow
1. Browse products → Add to cart → View cart
2. Proceed to checkout → Select delivery method
3. Choose payment → Place order
4. Track order status → Receive delivery/pickup

### Review Flow
1. Order must be DELIVERED or COLLECTED
2. Go to order details → Click "Write Review"
3. Rate 1-5 stars, add comment/images (optional)
4. Submit → Can edit ONE TIME if needed

---

## 🧪 Development

### Running Tests
```bash
# Backend
pytest

# Frontend
cd frontend && npm test
```

### Code Style
- Backend: Black + isort
- Frontend: ESLint + Prettier

---

## 📄 License

This project is for educational purposes.

---
