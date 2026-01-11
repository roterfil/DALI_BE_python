"""
Authentication router - handles login, register, password reset (JSON API).
"""
import os
import uuid
import shutil
from fastapi import APIRouter, Request, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_required
from app.core.config import settings
from app.services.account_service import AccountService
from app.services.cart_service import CartService
from app.services.email_service import EmailService
from app.schemas import (
    AccountCreate, AccountUpdate, AccountResponse,
    LoginRequest, PasswordChange, PasswordReset
)
from app.models import Account

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Directory for storing profile pictures
PROFILE_PICTURES_DIR = os.path.join(settings.STATIC_FILES_PATH, "images", "profiles")


def ensure_profile_pictures_dir():
    """Ensure the profile pictures directory exists."""
    os.makedirs(PROFILE_PICTURES_DIR, exist_ok=True)


@router.post("/register")
async def register(
    request: Request,
    account_data: AccountCreate,
    db: Session = Depends(get_db)
):
    """Register a new user account."""
    try:
        account = AccountService.create_account(db, account_data)
        
        # Don't auto-login - user must verify email first
        return {
            "message": "Registration successful! Please check your email to verify your account before logging in.",
            "email": account.email
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=AccountResponse)
async def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user."""
    user = AccountService.authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if email is verified
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link."
        )
    
    # Set session
    request.session["user_email"] = user.email
    
    # Merge session cart with user cart
    CartService.merge_session_cart_with_db_cart(db, request, user.email)
    
    return user


@router.post("/logout")
async def logout(request: Request):
    """Logout user."""
    request.session.clear()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AccountResponse)
async def get_current_user_info(
    current_user = Depends(get_current_user_required)
):
    """Get current authenticated user information."""
    return current_user


@router.put("/profile", response_model=AccountResponse)
async def update_profile(
    update_data: AccountUpdate,
    current_user = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Update user profile."""
    updated_account = AccountService.update_profile(db, current_user.email, update_data)
    return updated_account


@router.post("/profile/picture", response_model=AccountResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: Account = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Upload or update profile picture."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
        )
    
    # Validate file size (max 5MB)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB"
        )
    
    # Delete old profile picture if exists
    if current_user.profile_picture:
        old_filename = current_user.profile_picture.split("/")[-1]
        old_path = os.path.join(PROFILE_PICTURES_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{current_user.account_id}_{uuid.uuid4()}.{ext}"
    
    # Ensure directory exists and save file
    ensure_profile_pictures_dir()
    file_path = os.path.join(PROFILE_PICTURES_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update database
    account = db.query(Account).filter(Account.account_id == current_user.account_id).first()
    account.profile_picture = f"/static/images/profiles/{filename}"
    db.commit()
    db.refresh(account)
    
    return account


@router.delete("/profile/picture", response_model=AccountResponse)
async def delete_profile_picture(
    current_user: Account = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Delete profile picture."""
    if current_user.profile_picture:
        # Delete file
        filename = current_user.profile_picture.split("/")[-1]
        file_path = os.path.join(PROFILE_PICTURES_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Update database
        account = db.query(Account).filter(Account.account_id == current_user.account_id).first()
        account.profile_picture = None
        db.commit()
        db.refresh(account)
        return account
    
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Change user password."""
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    try:
        AccountService.change_password(
            db,
            current_user.email,
            password_data.current_password,
            password_data.new_password
        )
        # Clear session and require re-login
        request.session.clear()
        return {"message": "Password changed successfully. Please log in again."}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    """Request password reset."""
    try:
        token = AccountService.create_password_reset_token(db, email)
        EmailService.send_password_reset_email(email, token)
        return {"message": "Password reset link sent to your email"}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that email"
        )


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Reset password using token."""
    if reset_data.password != reset_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    try:
        AccountService.reset_password(db, reset_data.token, reset_data.password)
        return {"message": "Password reset successfully. Please log in."}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify email address using token from verification link."""
    try:
        account = AccountService.verify_email(db, token)
        return {
            "message": "Email verified successfully! You can now use all features.",
            "email": account.account_email
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/resend-verification")
async def resend_verification_email(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Resend verification email to current user."""
    try:
        AccountService.resend_verification_email(db, current_user.email)
        return {"message": "Verification email sent! Please check your inbox."}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
