# Quick Start Guide - DALI E-Commerce JSON API

## ✅ Setup Complete!

Your backend has been converted to a **pure JSON REST API** ready for React frontend integration.

---

## 🚀 Running the Server

### Option 1: Using Python directly
```powershell
python main.py
```

### Option 2: Using Uvicorn (recommended for development)
```powershell
uvicorn main:app --reload
```

The server will start at: **`http://localhost:8000`**

---

## 📋 Before First Run

### 1. Install Dependencies (if not already done)
```powershell
pip install -r requirements.txt
```

### 2. Setup PostgreSQL Database
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE dali_db;"

# Run schema
psql -U postgres -d dali_db -f schema.sql

# Load sample data
psql -U postgres -d dali_db -f data.sql
```

### 3. Configure Environment
The `.env` file has been created with secure keys. Update these if needed:
- `DATABASE_URL` - PostgreSQL connection (default: `postgresql://postgres:password@localhost:5432/dali_db`)
- `SMTP_*` - Email settings (optional for development)
- `MAYA_*` - Payment gateway credentials (optional for development)

---

## 🧪 Testing the API

### 1. Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy"}
```

### 2. View API Documentation
Open your browser and visit:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 📚 API Reference

See **`API_REFERENCE.md`** for complete endpoint documentation.

### Quick Examples:

#### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

#### Get Products
```bash
curl http://localhost:8000/api/products
```

#### Get Product by ID
```bash
curl http://localhost:8000/api/products/1
```

---

## 🔧 For React Frontend Development

### CORS is Already Enabled
The API allows all origins in development mode.

### Session-Based Authentication
Make sure to include credentials in your fetch requests:

```javascript
// React example
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  credentials: 'include', // Important for sessions!
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
```

### All API Endpoints Return JSON
No more HTML templates - everything returns JSON objects perfect for React state management!

---

## 📂 API Structure

```
/api/auth          - Authentication & user management
/api/products      - Product catalog
/api/cart          - Shopping cart operations
/api/checkout      - Checkout process
/api/orders        - Order management
/api/addresses     - User address management
/api/stores        - Store locations
/api/locations     - Philippines location data (provinces/cities/barangays)
/api/admin         - Admin panel operations
```

---

## 🐛 Troubleshooting

### Import errors in VSCode
The LSP shows import errors but they're false positives. The code works at runtime since packages are installed in the venv.

### Database connection errors
Make sure PostgreSQL is running and the credentials in `.env` are correct.

### Port already in use
Change the port in `main.py`:
```python
uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
```

---

## 🎯 Next Steps

1. **Start the server:** `python main.py`
2. **Test endpoints:** Visit `http://localhost:8000/docs`
3. **Setup database:** Run the PostgreSQL scripts
4. **Build React frontend:** Use the API endpoints documented in `API_REFERENCE.md`

---

## 📝 What Changed

✅ Removed all Jinja2 template rendering  
✅ Converted all routes to return JSON  
✅ Added proper API prefixes (`/api/*`)  
✅ Restructured for RESTful standards  
✅ Added Pydantic request/response models  
✅ Session-based auth (cookie-based, works great with React)  
✅ Auto-generated API documentation (Swagger/ReDoc)  
✅ CORS enabled for frontend development  

---

Happy coding! 🚀
