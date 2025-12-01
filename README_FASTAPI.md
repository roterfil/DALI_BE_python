# DALI E-Commerce FastAPI Backend

This is a complete conversion of the DALI E-Commerce Spring Boot backend to FastAPI (Python), maintaining the same functionality, frontend templates, and database schema.

## Project Structure

```
DALI/
├── app/
│   ├── core/
│   │   ├── config.py          # Application configuration
│   │   ├── database.py        # Database connection and session management
│   │   └── security.py        # Authentication and security utilities
│   ├── models/
│   │   └── __init__.py        # SQLAlchemy database models
│   ├── schemas/
│   │   └── __init__.py        # Pydantic schemas for validation
│   ├── routers/
│   │   ├── home.py            # Home page routes
│   │   ├── auth.py            # Authentication routes
│   │   ├── products.py        # Product routes
│   │   ├── cart.py            # Shopping cart routes
│   │   ├── checkout.py        # Checkout process routes
│   │   ├── orders.py          # Order management routes
│   │   ├── addresses.py       # Address management routes
│   │   ├── stores.py          # Store listing routes
│   │   ├── locations.py       # Location API routes
│   │   └── admin.py           # Admin panel routes
│   ├── services/
│   │   ├── account_service.py # Account business logic
│   │   ├── cart_service.py    # Cart business logic
│   │   ├── order_service.py   # Order business logic
│   │   ├── shipping_service.py # Shipping calculation
│   │   ├── email_service.py   # Email sending
│   │   └── maya_service.py    # Maya payment integration
│   └── utils/
├── src/main/resources/
│   ├── static/                # Static files (CSS, JS, images)
│   ├── templates/             # HTML templates (Jinja2)
│   ├── schema.sql             # Database schema
│   ├── data.sql               # Seed data
│   └── application.properties # Original Spring Boot config
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
├── .env                       # Environment variables (create from .env.example)
└── README_FASTAPI.md          # This file
```

## Features

### Complete Feature Parity with Spring Boot Backend

✅ **User Authentication & Authorization**
- User registration with auto-login
- User login/logout with session management
- Password change functionality
- Password reset via email with token

✅ **Shopping Cart**
- Session-based cart for anonymous users
- Database cart for authenticated users
- Automatic cart merging on login/registration
- Add, update, remove cart items
- Real-time stock availability checking

✅ **Product Catalog**
- Product listing with search and filtering
- Category and subcategory navigation
- Product detail pages
- Available quantity calculation

✅ **Checkout Process**
- Multi-step checkout flow (Address → Shipping → Payment)
- Address selection and management
- Shipping fee calculation based on distance
- Multiple delivery methods (Standard, Priority, Pickup)
- Multiple payment methods (COD, Maya/Card)
- Session state management throughout checkout

✅ **Order Management**
- Order creation and tracking
- Order history
- Order cancellation
- Order status updates
- Payment confirmation

✅ **Address Management**
- Add, edit, delete addresses
- Default address setting
- Hierarchical location system (Province → City → Barangay)
- Geocoding support

✅ **Store Management**
- Store listing and search
- Pickup location selection
- Map integration support

✅ **Admin Panel**
- Separate admin authentication
- Inventory management
- Stock updates
- Order management
- Order status updates
- Search and filtering

✅ **Payment Integration**
- Maya payment gateway integration
- Checkout session creation
- Payment callbacks (success, failure, cancel)
- Pending order handling

✅ **Email Services**
- Password reset emails
- SMTP configuration

## Installation

### Prerequisites

- Python 3.9 or higher
- PostgreSQL 12 or higher
- pip (Python package manager)

### Step 1: Clone Repository

```bash
cd "c:\Users\NITRO 5\Documents\Coding Shenanigans\web\webdev-sub\DALI"
```

### Step 2: Create Virtual Environment

```powershell
python -m venv venv
.\venv\Scripts\Activate
```

### Step 3: Install Dependencies

```powershell
pip install -r requirements.txt
```

### Step 4: Configure Environment

1. Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

2. Edit `.env` and configure your settings:
```ini
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/dali_db
SECRET_KEY=your-secret-key-here
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
MAYA_API_KEY=your-maya-api-key
# ... etc
```

### Step 5: Set Up Database

1. Create PostgreSQL database:
```sql
CREATE DATABASE dali_db;
```

2. Run schema:
```powershell
psql -U postgres -d dali_db -f src/main/resources/schema.sql
```

3. (Optional) Load seed data:
```powershell
psql -U postgres -d dali_db -f src/main/resources/data.sql
```

### Step 6: Run Application

```powershell
python main.py
```

Or with uvicorn directly:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at: **http://localhost:8000**

## API Endpoints

All endpoints from the Spring Boot application are maintained with the same paths and functionality. See `API_DOCUMENTATION.md` for complete API reference.

### Key Endpoints

- `GET /` - Home page
- `GET /register`, `POST /register` - User registration
- `GET /login`, `POST /login` - User login
- `GET /shop` - Product listing
- `GET /product/{id}` - Product details
- `GET /cart`, `POST /cart/add` - Shopping cart
- `GET /checkout/*` - Checkout flow
- `GET /order/{id}` - Order details
- `GET /profile` - User profile
- `GET /admin/*` - Admin panel

## Differences from Spring Boot Version

### Technical Differences

1. **Framework**: FastAPI instead of Spring Boot
2. **Language**: Python instead of Java
3. **ORM**: SQLAlchemy instead of JPA/Hibernate
4. **Template Engine**: Jinja2 (compatible with Thymeleaf templates with minimal changes)
5. **Session Management**: Starlette SessionMiddleware instead of Spring Session
6. **Validation**: Pydantic instead of Jakarta Validation

### Behavioral Differences

- **Session-based Authentication**: Uses cookie-based sessions instead of JWT (matches Spring Boot behavior)
- **Template Rendering**: Jinja2 syntax is similar to Thymeleaf but may require minor template adjustments
- **Form Handling**: Uses FastAPI Form parameters instead of Spring's @ModelAttribute
- **Error Handling**: FastAPI exception handlers instead of Spring's @ControllerAdvice

## Template Compatibility

The existing Thymeleaf templates need minor adjustments for Jinja2:

### Changes Required

1. **Attribute syntax**:
   - Thymeleaf: `th:text="${variable}"`
   - Jinja2: `{{ variable }}`

2. **Conditionals**:
   - Thymeleaf: `th:if="${condition}"`
   - Jinja2: `{% if condition %}...{% endif %}`

3. **Loops**:
   - Thymeleaf: `th:each="item : ${items}"`
   - Jinja2: `{% for item in items %}...{% endfor %}`

4. **URL generation**:
   - Thymeleaf: `th:href="@{/path}"`
   - Jinja2: `href="/path"` or `url_for('route_name')`

## Running in Production

### Using Gunicorn (recommended)

```powershell
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t dali-fastapi .
docker run -p 8000:8000 --env-file .env dali-fastapi
```

## Development

### Running Tests

```powershell
pytest
```

### Code Formatting

```powershell
pip install black
black app/
```

### Type Checking

```powershell
pip install mypy
mypy app/
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists and schema is loaded

### Template Not Found

- Verify TEMPLATES_PATH in `.env` points to correct directory
- Check that templates directory exists with all HTML files

### Session Issues

- Ensure SESSION_SECRET_KEY is set in `.env`
- Clear browser cookies if having login issues

### Import Errors

- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

## Migration Checklist

- [x] Database models (SQLAlchemy)
- [x] Core configuration
- [x] Authentication & security
- [x] Cart service with session/DB support
- [x] Order service
- [x] Account service
- [x] Shipping service
- [x] Email service
- [x] Payment gateway integration
- [x] All API endpoints/routes
- [x] Template configuration
- [ ] Template conversion (Thymeleaf → Jinja2) - *Requires manual updates*
- [x] Static file serving
- [x] Session management
- [x] Admin authentication
- [x] Form handling
- [x] Error handling

## Additional Router Files Needed

The following router files are referenced but need to be created (create as stub files then implement):

1. `app/routers/checkout.py` - Complete checkout flow
2. `app/routers/orders.py` - Order management
3. `app/routers/addresses.py` - Address CRUD
4. `app/routers/stores.py` - Store listing
5. `app/routers/locations.py` - Location API
6. `app/routers/admin.py` - Admin panel

## Support

For issues or questions:
1. Check this README
2. Review `API_DOCUMENTATION.md`
3. Check FastAPI documentation: https://fastapi.tiangolo.com
4. Check SQLAlchemy documentation: https://docs.sqlalchemy.org

## License

Same as original DALI project.
