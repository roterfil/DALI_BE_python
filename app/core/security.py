"""
Security utilities for authentication and password hashing.
"""
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models import Account, AdminAccount

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    # Ensure password is within bcrypt's 72 byte limit
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password is too long (max 72 bytes)")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[Account]:
    """
    Get current user from session (for regular users).
    Returns None if not authenticated (allows optional authentication).
    """
    email = request.session.get("user_email")
    if not email:
        return None
    
    user = db.query(Account).filter(Account.account_email == email).first()
    return user


def get_current_user_required(
    request: Request,
    db: Session = Depends(get_db)
) -> Account:
    """
    Get current user from session (required).
    Raises exception if not authenticated.
    """
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db)
) -> AdminAccount:
    """
    Get current admin user from session.
    Raises exception if not authenticated or not admin.
    """
    email = request.session.get("admin_email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as admin"
        )
    
    admin = db.query(AdminAccount).filter(AdminAccount.account_email == email).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    return admin
