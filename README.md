# DALI E-Commerce Platform

> **Full-stack e-commerce solution** for grocery and everyday essentials with multi-delivery options, payment integration, and comprehensive admin management.

---

## 📋 Table of Contents

- [Objective](#-objective)
- [System Purpose](#-system-purpose)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Technical Stack](#-technical-stack)
- [Database Schema](#-database-schema)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Objective

DALI (Everyday Grocery) is designed to **modernize the grocery shopping experience** by providing:

1. **Seamless Online Shopping** - Browse, search, and purchase grocery items online
2. **Flexible Delivery Options** - Home delivery with distance-based pricing or in-store pickup
3. **Integrated Payment Solutions** - Support for digital payments (Maya/PayMaya) and Cash on Delivery
4. **Real-time Inventory Management** - Admin controls for stock, pricing, and order fulfillment
5. **Enhanced Customer Experience** - Product reviews, order tracking, and profile management

---

## 🏗️ System Purpose

### **For Customers**
- **Convenience**: Shop from home 24/7 without visiting physical stores
- **Price Transparency**: View regular prices, sale discounts, and delivery fees upfront
- **Delivery Flexibility**: Choose between doorstep delivery or pickup at nearby stores
- **Order Tracking**: Real-time status updates from order placement to delivery
- **Informed Decisions**: Read product reviews and ratings from other customers

### **For Business Owners**
- **Inventory Control**: Manage product stock, prices, and discounts in real-time
- **Order Management**: Track orders, update statuses, and manage fulfillment
- **Business Analytics**: Monitor revenue, sales trends, and inventory levels
- **Customer Insights**: Understand buying patterns through order history and reviews
- **Operational Efficiency**: Automate order processing and reduce manual errors

### **For Administrators**
- **Multi-Store Support**: Manage multiple store locations with pickup capabilities
- **User Management**: Handle customer accounts and admin permissions
- **Voucher System**: Create promotional codes and track usage
- **Audit Trail**: Complete history of all system changes and order updates
- **Security Controls**: Role-based access (Super Admin, Store Admin, Customer)

---

## ✨ Features

### 🛒 **Customer Features**

#### Authentication & Profile
- **User Registration** with email verification
- **Secure Login** with session-based authentication
- **Password Reset** via email token
- **Profile Management** - Update name, phone, profile picture
- **Password Change** with old password verification
- **Multiple Address Management** with Philippine location hierarchy (Province → City → Barangay)

#### Shopping Experience
- **Product Browsing** by category and subcategory
- **Advanced Search** with filters (price range, on-sale items, in-stock)
- **Sale Page** showing all discounted products with percentage badges
- **Product Details** with images, descriptions, pricing, and stock availability
- **Product Reviews** - Rate 1-5 stars, add comments and images, edit once after posting
- **Anonymous Reviews** option for privacy

#### Cart & Checkout
- **Shopping Cart** - Add, remove, update quantities
- **Guest Cart** - Shop without account (session-based)
- **Cart Merge** - Combine guest cart with user cart on login
- **Delivery Options**:
  - **Standard Delivery** - Distance-based shipping fee (₱50 base + ₱20/km)
  - **Priority Delivery** - Faster delivery with additional fee (₱100)
  - **Click & Collect** - Pickup at nearby store with fixed fee
- **Voucher System** - Apply discount codes at checkout
- **Payment Methods**:
  - **Maya (PayMaya)** - Digital payment with redirect flow
  - **Cash on Delivery (COD)** - Pay when order arrives

#### Order Management
- **Order Tracking** with status timeline:
  - PENDING → PROCESSING → SHIPPED → DELIVERED (for delivery)
  - PENDING → PROCESSING → READY_FOR_PICKUP → PICKED_UP (for pickup)
- **Order History** with detailed item breakdown
- **Order Details** - View items, pricing, delivery info, payment method
- **Email Confirmations** for order placement and updates

#### Store Locator
- **Interactive Map** showing all store locations
- **Distance Calculation** from user's address
- **Store Details** - Address, contact, operating hours

---

### 🔧 **Admin Features**

#### Dashboard & Analytics
- **Revenue Overview** - Daily, weekly, monthly sales
- **Order Statistics** - Pending, processing, completed counts
- **Low Stock Alerts** - Products below threshold
- **Top Products** - Best-selling items by quantity and revenue
- **Revenue Charts** - Visual representation of sales trends

#### Order Management
- **View All Orders** with filters (status, date range, search)
- **Order Details** - Customer info, items, delivery/pickup details
- **Status Updates** - Change order status with notes
- **Order History Timeline** - Complete audit trail of status changes
- **Search Orders** by Order ID or customer email

#### Inventory Management
- **Product List** with search and filters
- **Update Stock Quantities** - Adjust inventory levels
- **Price Management** - Change regular prices
- **Discount Management**:
  - Activate/deactivate sales
  - Set discounted prices
  - Preview discount percentage
- **Add New Products** - Create products with images, categories, pricing
- **Product Images** - Upload and manage product photos

#### Voucher Management (Super Admin)
- **Create Vouchers** - Discount codes with:
  - Percentage or fixed amount discounts
  - Usage limits (per voucher and per user)
  - Validity periods
  - Minimum order amounts
- **View Voucher Usage** - Track redemptions and users
- **Delete Vouchers** - Remove expired or unused codes

#### Audit & Security
- **Audit Logs** - Complete record of:
  - Product updates (price, stock, discounts)
  - Order status changes
  - Admin actions
- **Role-Based Access**:
  - **Super Admin** - Full system access, create admins, manage vouchers
  - **Store Admin** - Manage orders and inventory for assigned store
- **Admin Login** - Separate authentication from customer accounts

---

## 🏛️ System Architecture

### **Architecture Pattern**
- **Backend**: RESTful API (FastAPI) with service layer pattern
- **Frontend**: Single Page Application (React with Vite)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Session-based with secure HTTP-only cookies
- **File Storage**: Local filesystem for images (products, reviews, profiles)

### **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  Components: Pages, Forms, Modals, Charts                   │
│  State Management: Context API (Auth, Cart)                 │
│  Routing: React Router v6                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/HTTPS
                       │ (Axios)
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │  Routers   │  │  Services   │  │    Core      │        │
│  │  (API)     │──│  (Logic)    │──│  (Config)    │        │
│  └────────────┘  └─────────────┘  └──────────────┘        │
│         │                │                  │               │
│         └────────────────┴──────────────────┘               │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ SQLAlchemy ORM
┌──────────────────────────▼───────────────────────────────────┐
│                   PostgreSQL Database                         │
│  Tables: accounts, products, orders, cart_items,             │
│          addresses, reviews, admin_accounts, etc.            │
└───────────────────────────────────────────────────────────────┘

External Integrations:
├─ Maya (PayMaya) API - Payment Processing
├─ Gmail SMTP - Email Notifications
└─ Google Maps - Store Locator (Frontend)
```

### **Data Flow: Shopping Cart (Hybrid Approach)**

```
┌────────────────────────────────────────────────────────────┐
│                    Guest User                               │
│  Cart stored in: request.session["cart"]                   │
│  Format: {product_id: quantity}                            │
└───────────────────┬────────────────────────────────────────┘
                    │
                    ▼ (User logs in)
┌────────────────────────────────────────────────────────────┐
│              Cart Merge Process                             │
│  1. Load session cart                                       │
│  2. Load database cart (cart_items table)                  │
│  3. Merge: DB quantity += Session quantity                  │
│  4. Clear session cart                                      │
└───────────────────┬────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────┐
│                 Logged-in User                              │
│  Cart stored in: cart_items table                          │
│  Foreign Key: account_id → accounts table                  │
└────────────────────────────────────────────────────────────┘
```

### **Order Processing Flow**

```
1. Checkout Initiated
   ├─ User selects delivery method (delivery/pickup)
   ├─ Chooses address (delivery) or store (pickup)
   ├─ Applies voucher (optional)
   └─ Calculates shipping fee

2. Payment Method Selected
   ├─ Maya (PayMaya)
   │   ├─ Create checkout session
   │   ├─ Redirect to Maya payment page
   │   ├─ User completes payment
   │   └─ Webhook confirms payment
   │
   └─ Cash on Delivery (COD)
       └─ Order confirmed immediately

3. Order Created
   ├─ Insert into orders table
   ├─ Create order_items (cart → order items)
   ├─ Decrement product stock
   ├─ Create order_history (PROCESSING status)
   ├─ Create order_pickups (if pickup)
   └─ Send confirmation email

4. Order Fulfillment
   ├─ Admin updates status
   ├─ Status progression:
   │   ├─ PROCESSING → SHIPPED → DELIVERED (delivery)
   │   └─ PROCESSING → READY_FOR_PICKUP → PICKED_UP (pickup)
   └─ Customer receives email notifications
```

---

## 🛠️ Technical Stack

### **Backend**

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | FastAPI | 0.115+ | Async REST API framework |
| **ORM** | SQLAlchemy | 2.0+ | Database abstraction layer |
| **Database** | PostgreSQL | 14+ | Primary data store |
| **Session** | Starlette SessionMiddleware | - | Session management |
| **Password** | bcrypt | - | Password hashing |
| **Email** | aiosmtplib | - | Async SMTP client |
| **Payment** | Maya API | Sandbox | Payment gateway integration |
| **Validation** | Pydantic | 2.0+ | Request/response validation |
| **CORS** | FastAPI CORSMiddleware | - | Cross-origin resource sharing |

### **Frontend**

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 18+ | UI library |
| **Build Tool** | Vite | 5+ | Fast build and dev server |
| **Routing** | React Router | 6+ | Client-side routing |
| **HTTP Client** | Axios | 1.6+ | API requests |
| **State Management** | Context API | - | Global state (auth, cart) |
| **Charts** | Recharts | 2.13+ | Admin analytics |
| **Maps** | Google Maps API | - | Store locator |
| **Styling** | CSS Modules | - | Component-scoped styles |

### **Development Tools**

- **Version Control**: Git
- **Python Environment**: venv
- **Package Manager**: pip (Python), npm (JavaScript)
- **Code Editor**: VS Code recommended
- **API Testing**: Postman

---

## 🗄️ Database Schema

### **Entity Relationship Diagram**

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  accounts   │────────<│ addresses    │>────────│  provinces  │
│             │         │              │         │  cities     │
│ *account_id │         │ *address_id  │         │  barangays  │
│  email      │         │  account_id  │         └─────────────┘
│  password   │         │  province_id │
│  name       │         │  city_id     │
│  phone      │         │  barangay_id │
│  verified   │         │  lat/lng     │
└──────┬──────┘         └──────────────┘
       │                                            ┌─────────────┐
       ├───────────────────<┐                      │  products   │
       │                    │                      │             │
       │              ┌─────┴──────┐              │ *product_id │
       │              │ cart_items │<─────────────│  name       │
       │              │            │              │  price      │
       │              │ *cart_id   │              │  discount   │
       │              │ account_id │              │  is_on_sale │
       │              │ product_id │              │  category   │
       │              │ quantity   │              │  stock      │
       │              └────────────┘              │  image      │
       │                                          └──────┬──────┘
       │                                                 │
       │              ┌──────────────┐                  │
       └──────────────│   orders     │<─────────────────┤
                      │              │                  │
                      │ *order_id    │                  │
                      │  account_id  │            ┌─────┴────────┐
                      │  total       │            │ order_items  │
                      │  status      │───────────<│              │
                      │  payment     │            │ *order_id    │
                      │  address_id  │            │  product_id  │
                      │  created_at  │            │  quantity    │
                      └──────┬───────┘            │  price       │
                             │                    └──────────────┘
                   ┌─────────┼─────────┐
                   │         │         │
           ┌───────▼──┐  ┌───▼──────┐  ┌────────────┐
           │ order_   │  │ order_   │  │  reviews   │
           │ history  │  │ pickups  │  │            │
           │          │  │          │  │ *review_id │
           │ status   │  │ store_id │  │ account_id │
           │ notes    │  │ picked_at│  │ product_id │
           │ date     │  └──────────┘  │ rating     │
           └──────────┘                │ comment    │
                                       │ images     │
                                       └────────────┘

┌──────────────┐         ┌─────────────┐
│ admin_       │         │   stores    │
│ accounts     │>────────│             │
│              │         │ *store_id   │
│ *admin_id    │         │  name       │
│  email       │         │  lat/lng    │
│  password    │         └─────────────┘
│  store_id    │
│  super_admin │
└──────────────┘
```

### **Key Tables**

#### **accounts** - Customer accounts
- Primary authentication table
- Stores hashed passwords (bcrypt)
- Email verification status
- Password reset tokens
- Super admin flag

#### **products** - Product catalog
- Product information and pricing
- Sale/discount management
- Stock tracking
- Category/subcategory organization

#### **cart_items** - Shopping cart (logged-in users)
- Links accounts to products
- Quantity management
- Used in conjunction with session cart for guests

#### **orders** - Order records
- Master order information
- Links to account, address, payment method
- Status tracking (PENDING, PROCESSING, SHIPPED, etc.)
- Delivery method and fees

#### **order_items** - Order line items
- Individual products in an order
- Captures price at time of purchase
- Quantity ordered

#### **order_history** - Order status audit trail
- Complete timeline of order status changes
- Admin notes for each status update
- Timestamps for all transitions

#### **order_pickups** - Click & Collect information
- Links orders to pickup stores
- Pickup time tracking
- Store location details

#### **addresses** - Customer delivery addresses
- Philippine location hierarchy (Province, City, Barangay)
- GPS coordinates for distance calculation
- Default address flag

#### **reviews** - Product reviews
- Star rating (1-5)
- Comment text
- Image uploads
- Anonymous option
- Edit tracking (edited_at timestamp)

#### **admin_accounts** - Admin users
- Separate from customer accounts
- Store assignment (for store admins)
- Super admin permissions

#### **stores** - Physical store locations
- GPS coordinates
- Used for pickup options
- Distance calculations

#### **audit_logs** - System audit trail
- Admin actions tracking
- Product updates (price, stock, discount changes)
- Entity type and ID references

---

## 📦 Installation & Setup

### **Prerequisites**

- **Python** 3.10 or higher
- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **Git** for version control

### **1. Clone Repository**

```powershell
git clone <repository-url>
cd DALI_BE_Python
```

### **2. Backend Setup**

#### Create Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate    # macOS/Linux
```

#### Install Dependencies
```powershell
pip install -r requirements.txt
```

#### Database Setup

**Create Database:**
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE dali_db;
\q
```

**Initialize Schema:**
```powershell
# Run schema creation
psql -U postgres -d dali_db -f schema.sql

# (Optional) Seed sample data
psql -U postgres -d dali_db -f data.sql
```

#### Environment Configuration

Create `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/dali_db

# Security (Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
SECRET_KEY=your-secret-key-here
SESSION_SECRET_KEY=your-session-secret-key-here

# Super Admin (for initial setup)
SUPER_ADMIN_EMAIL=admin@dali.com
SUPER_ADMIN_PASSWORD=SecurePassword123!

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@dali.com

# Maya (PayMaya) Sandbox
MAYA_API_KEY=pk-test-your-key-here
MAYA_API_SECRET=sk-test-your-secret-here
MAYA_BASE_URL=https://pg-sandbox.paymaya.com

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173

# Warehouse Location (for shipping calculations)
WAREHOUSE_LAT=14.5995
WAREHOUSE_LNG=120.9842
```

**Gmail App Password Setup:**
1. Go to Google Account Settings → Security
2. Enable 2-Factor Authentication
3. Generate App Password for "Mail"
4. Use app password in `SMTP_PASSWORD`

#### Run Backend Server

```powershell
uvicorn main:app --reload
```

Backend runs on: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

---

### **3. Frontend Setup**

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## ⚙️ Configuration

### **Backend Settings** (`app/core/config.py`)

All settings are loaded from environment variables with fallback defaults.

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| Database URL | `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| Secret Key | `SECRET_KEY` | `(must set)` | JWT/session encryption key |
| Session Secret | `SESSION_SECRET_KEY` | `(must set)` | Session cookie encryption |
| Session Max Age | `SESSION_MAX_AGE` | `86400` | Session expiry (seconds) |
| SMTP Host | `SMTP_HOST` | `smtp.gmail.com` | Email server |
| SMTP Port | `SMTP_PORT` | `587` | Email port |
| SMTP User | `SMTP_USER` | - | Email account |
| SMTP Password | `SMTP_PASSWORD` | - | Email password/app password |
| Maya API Key | `MAYA_API_KEY` | - | PayMaya public key |
| Maya Secret | `MAYA_API_SECRET` | - | PayMaya secret key |
| Frontend URL | `FRONTEND_URL` | `http://localhost:5173` | CORS origin |
| Warehouse Lat | `WAREHOUSE_LAT` | `14.5995` | Shipping origin latitude |
| Warehouse Lng | `WAREHOUSE_LNG` | `120.9842` | Shipping origin longitude |

### **Frontend Configuration** (`frontend/src/api/api.js`)

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

Set in `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

---

## 📚 API Documentation

### **Interactive API Docs**

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### **API Endpoints Overview**

#### **Authentication** (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /verify-email` - Verify email with token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token

#### **Products** (`/api/products`)
- `GET /` - List products (with filters, pagination)
- `GET /{id}` - Get product details
- `GET /category/{category}` - Products by category
- `GET /search` - Search products

#### **Cart** (`/api/cart`)
- `GET /` - Get user's cart
- `POST /add` - Add item to cart
- `PUT /update` - Update item quantity
- `DELETE /remove/{product_id}` - Remove item
- `DELETE /clear` - Clear entire cart

#### **Checkout** (`/api/checkout`)
- `POST /set-address` - Set delivery address
- `POST /set-delivery` - Set delivery method
- `POST /apply-voucher` - Apply discount code
- `POST /payment` - Process payment
- `GET /details` - Get checkout state

#### **Orders** (`/api/orders`)
- `GET /` - List user's orders
- `GET /{order_id}` - Get order details
- `GET /{order_id}/timeline` - Order status history

#### **Addresses** (`/api/addresses`)
- `GET /` - List user's addresses
- `POST /` - Create new address
- `PUT /{id}` - Update address
- `DELETE /{id}` - Delete address
- `POST /{id}/set-default` - Set default address

#### **Reviews** (`/api/reviews`)
- `GET /product/{product_id}` - Get product reviews
- `POST /product/{product_id}` - Create review
- `PUT /{review_id}` - Edit review (once)
- `DELETE /{review_id}` - Delete review

#### **Admin** (`/api/admin`)
- `POST /login` - Admin login
- `GET /dashboard` - Dashboard statistics
- `GET /orders` - List all orders
- `PUT /orders/{id}/status` - Update order status
- `GET /products` - List products for inventory
- `PUT /products/{id}/stock` - Update stock
- `PUT /products/{id}/price` - Update price
- `PUT /products/{id}/discount` - Manage sale pricing
- `POST /products` - Add new product
- `GET /audit-logs` - View audit trail
- `POST /vouchers` - Create voucher (super admin)
- `GET /vouchers` - List vouchers
- `DELETE /vouchers/{code}` - Delete voucher

---

## 🔒 Security

### **Authentication & Authorization**

#### **Session-Based Authentication**
- Sessions stored in encrypted cookies (HTTP-only, secure in production)
- Session secret key from environment variable
- 24-hour session expiry (configurable)

#### **Password Security**
- Bcrypt hashing with salt
- Minimum password requirements enforced
- Password reset via time-limited email tokens

#### **Email Verification**
- Users must verify email before accessing protected features
- Verification tokens expire after use
- Resend verification email option

#### **Role-Based Access Control (RBAC)**
- **Customer**: Access to shopping, orders, reviews
- **Admin**: Access to orders and inventory management
- **Super Admin**: Full system access including:
  - Voucher creation/deletion
  - Admin account creation
  - All admin features

### **Security Best Practices**

#### **Production Checklist**

- [ ] Change `SECRET_KEY` and `SESSION_SECRET_KEY` to strong random values
- [ ] Set `https_only=True` for session middleware
- [ ] Configure CORS to specific origins (not `"*"`)
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Set secure database credentials
- [ ] Configure firewall rules
- [ ] Regular database backups
- [ ] Monitor audit logs
- [ ] Update dependencies regularly

#### **Input Validation**
- Pydantic schemas validate all request data
- SQL injection prevention via SQLAlchemy ORM
- XSS protection via React's built-in escaping
- CSRF protection via session cookies

#### **Rate Limiting**
- Consider implementing rate limiting for:
  - Login attempts
  - Password reset requests
  - API endpoints

---

## 🚀 Deployment

### **Backend Deployment** (Production)

#### **1. Environment Configuration**

Update `.env` for production:
```env
DATABASE_URL=postgresql://user:password@production-db-host:5432/dali_db
SECRET_KEY=<strong-random-secret>
SESSION_SECRET_KEY=<strong-random-secret>
FRONTEND_URL=https://yourdomain.com
MAYA_BASE_URL=https://pg.paymaya.com  # Production Maya URL
```

#### **2. Database Migration**

```powershell
psql -U postgres -h production-db-host -d dali_db -f schema.sql
```

#### **3. Run with Gunicorn** (Linux/Unix)

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### **4. Reverse Proxy** (Nginx)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### **5. SSL Certificate** (Let's Encrypt)

```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

### **Frontend Deployment**

#### **1. Build Production Bundle**

```powershell
cd frontend
npm run build
```

Output: `frontend/dist/`

#### **2. Deploy Static Files**

Upload `dist/` folder to:
- **Netlify**: Drag & drop `dist/` folder
- **Vercel**: Connect Git repository
- **AWS S3 + CloudFront**: Upload and configure CDN
- **Apache/Nginx**: Serve static files

#### **3. Nginx Configuration** (SPA)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/dali-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Backend won't start**
- ✅ Check Python version: `python --version` (3.10+)
- ✅ Activate virtual environment: `.\venv\Scripts\Activate.ps1`
- ✅ Install dependencies: `pip install -r requirements.txt`
- ✅ Verify `.env` file exists with correct values
- ✅ Test database connection: `psql -U postgres -d dali_db`

#### **Frontend shows CORS errors**
- ✅ Check `FRONTEND_URL` in backend `.env` matches frontend URL
- ✅ Verify CORS middleware in `main.py` includes frontend origin
- ✅ Ensure backend is running on `http://localhost:8000`
- ✅ Check browser console for exact error

#### **Database connection fails**
- ✅ Verify PostgreSQL is running: `pg_isready`
- ✅ Check `DATABASE_URL` in `.env`
- ✅ Test connection: `psql -U postgres -d dali_db`
- ✅ Ensure database exists: `CREATE DATABASE dali_db;`

#### **Email not sending**
- ✅ Use Gmail App Password (not regular password)
- ✅ Check `SMTP_*` settings in `.env`
- ✅ Verify Gmail 2FA is enabled
- ✅ Check backend logs for SMTP errors

#### **Maya payment fails**
- ✅ Verify sandbox API keys in `.env`
- ✅ Check `MAYA_BASE_URL` is `https://pg-sandbox.paymaya.com`
- ✅ Ensure redirect URLs are whitelisted in Maya dashboard
- ✅ Test with Maya sandbox test cards

#### **Session/Login issues**
- ✅ Check `SESSION_SECRET_KEY` is set in `.env`
- ✅ Clear browser cookies and cache
- ✅ Verify `httpOnly` cookie is set by backend
- ✅ Check if `SameSite` cookie settings are compatible

---

## 📄 License

This project is developed for educational/commercial purposes. All rights reserved.

---

## 👥 Contact & Support

For issues, questions, or contributions:
- **Email**: support@dali.com
- **Documentation**: See `USER_MANUAL.md` for user guide
- **API Docs**: `http://localhost:8000/docs`

---

**Last Updated**: January 2026
**Version**: 1.0.0
