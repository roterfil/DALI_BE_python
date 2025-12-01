"""
Authentication router - handles login, register, password reset (JSON API).
"""
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_required
from app.services.account_service import AccountService
from app.services.cart_service import CartService
from app.services.email_service import EmailService
from app.schemas import (
    AccountCreate, AccountUpdate, AccountResponse,
    LoginRequest, PasswordChange, PasswordReset
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=AccountResponse)
async def register(
    request: Request,
    account_data: AccountCreate,
    db: Session = Depends(get_db)
):
    """Register a new user account."""
    try:
        account = AccountService.create_account(db, account_data)
        
        # Auto-login user
        request.session["user_email"] = account.email
        
        # Merge session cart with user cart
        CartService.merge_session_cart_with_db_cart(db, request, account.email)
        
        return account
        
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
