"""
Configuration settings for the DALI FastAPI application.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/dali_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SESSION_SECRET_KEY: str = "your-session-secret-key-change-this"
    SESSION_MAX_AGE: int = 86400
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@dalicommerce.com"
    SMTP_FROM_NAME: str = "DALI E-Commerce"
    
    # Payment Gateway (Maya)
    MAYA_API_KEY: str = ""
    MAYA_SECRET_KEY: str = ""
    MAYA_BASE_URL: str = "https://pg-sandbox.paymaya.com"
    MAYA_PUBLIC_KEY: str = ""
    
    # Application URLs
    FRONTEND_URL: str = "http://localhost:8000"
    PAYMENT_SUCCESS_URL: str = "http://localhost:8000/payment/callback/success"
    PAYMENT_FAILURE_URL: str = "http://localhost:8000/payment/callback/failure"
    PAYMENT_CANCEL_URL: str = "http://localhost:8000/payment/callback/cancel"
    
    # Warehouse Location
    WAREHOUSE_LAT: float = 14.5995
    WAREHOUSE_LON: float = 120.9842
    
    # Static files
    STATIC_FILES_PATH: str = "src/main/resources/static"
    TEMPLATES_PATH: str = "src/main/resources/templates"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Admin (optional - for seeding admin accounts)
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
