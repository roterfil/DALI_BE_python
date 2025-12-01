# Quick Start Guide - DALI FastAPI Backend

## Installation Steps

### 1. Install Python Dependencies
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit .env with your settings
notepad .env
```

**Minimum required settings in .env:**
```ini
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/dali_db
SECRET_KEY=change-this-to-a-random-secret-key
SESSION_SECRET_KEY=change-this-to-another-random-key
```

### 3. Setup Database
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE dali_db;"

# Run schema
psql -U postgres -d dali_db -f schema.sql

# (Optional) Load seed data
psql -U postgres -d dali_db -f data.sql
```

### 4. Run Application
```powershell
# Run with auto-reload
python main.py

# Or with uvicorn directly
uvicorn main:app --reload
```

Visit: **http://localhost:8000**

## Project Structure Summary

```
app/
├── core/              # Configuration, database, security
├── models/            # SQLAlchemy ORM models
├── schemas/           # Pydantic validation schemas
├── routers/           # API endpoint handlers
├── services/          # Business logic layer
└── utils/             # Helper functions

main.py                # Application entry point
requirements.txt       # Python dependencies
.env                   # Configuration (create from .env.example)
```

## Key Differences from Spring Boot

1. **Language**: Python instead of Java
2. **Framework**: FastAPI instead of Spring Boot
3. **Templates**: Jinja2 (need minor conversion from Thymeleaf)
4. **Session**: Cookie-based with Starlette
5. **Validation**: Pydantic instead of Jakarta Validation

## Template Migration Required

The existing Thymeleaf templates need to be converted to Jinja2 syntax:

### Common Conversions:

**Variables:**
- `th:text="${variable}"` → `{{ variable }}`
- `th:value="${variable}"` → `value="{{ variable }}"`

**Conditionals:**
- `th:if="${condition}"` → `{% if condition %}...{% endif %}`

**Loops:**
- `th:each="item : ${items}"` → `{% for item in items %}...{% endfor %}`

**Forms:**
- `th:action="@{/path}"` → `action="/path"`
- `th:field="*{field}"` → `name="field" value="{{ field }}"`

## Testing the Application

1. **Home Page**: http://localhost:8000
2. **Register**: http://localhost:8000/register
3. **Login**: http://localhost:8000/login
4. **Shop**: http://localhost:8000/shop
5. **Admin**: http://localhost:8000/admin/login

## Troubleshooting

**Module not found errors:**
```powershell
pip install -r requirements.txt
```

**Database connection error:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

**Template not found:**
- Check TEMPLATES_PATH in .env
- Ensure templates directory exists

## Next Steps

1. Install dependencies: `pip install -r requirements.txt`
2. Configure .env file
3. Setup database and run schema
4. Convert Thymeleaf templates to Jinja2 (see README_FASTAPI.md)
5. Run the application: `python main.py`
6. Test all endpoints

## Documentation

- Full README: `README_FASTAPI.md`
- API Documentation: `API_DOCUMENTATION.md`
- FastAPI Docs (auto-generated): http://localhost:8000/docs
