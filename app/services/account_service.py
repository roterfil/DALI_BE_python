"""
Account service for user account management.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Account
from app.core.security import get_password_hash, verify_password
from app.schemas import AccountCreate, AccountUpdate
import uuid


class AccountService:
    """Service for account operations."""
    
    @staticmethod
    def create_account(db: Session, account_data: AccountCreate) -> Account:
        """Create a new user account."""
        # Check if email already exists
        existing = db.query(Account).filter(Account.account_email == account_data.email).first()
        if existing:
            raise ValueError("Email already registered")
        
        # Create new account
        account = Account(
            account_email=account_data.email,
            password_hash=get_password_hash(account_data.password),
            account_first_name=account_data.first_name,
            account_last_name=account_data.last_name,
            phone_number=account_data.phone_number
        )
        
        db.add(account)
        db.commit()
        db.refresh(account)
        
        return account
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[Account]:
        """Authenticate user by email and password."""
        user = db.query(Account).filter(Account.account_email == email).first()
        if not user:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        return user
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Account]:
        """Get account by email."""
        return db.query(Account).filter(Account.account_email == email).first()
    
    @staticmethod
    def get_by_id(db: Session, account_id: int) -> Optional[Account]:
        """Get account by ID."""
        return db.query(Account).filter(Account.account_id == account_id).first()
    
    @staticmethod
    def update_profile(db: Session, email: str, update_data: AccountUpdate) -> Account:
        """Update user profile."""
        account = AccountService.get_by_email(db, email)
        if not account:
            raise ValueError("Account not found")
        
        if update_data.first_name is not None:
            account.account_first_name = update_data.first_name
        if update_data.last_name is not None:
            account.account_last_name = update_data.last_name
        if update_data.phone_number is not None:
            account.phone_number = update_data.phone_number
        
        db.commit()
        db.refresh(account)
        
        return account
    
    @staticmethod
    def change_password(
        db: Session,
        email: str,
        current_password: str,
        new_password: str
    ):
        """Change user password."""
        account = AccountService.get_by_email(db, email)
        if not account:
            raise ValueError("Account not found")
        
        # Verify current password
        if not verify_password(current_password, account.password_hash):
            raise ValueError("Current password is incorrect")
        
        # Update password
        account.password_hash = get_password_hash(new_password)
        db.commit()
    
    @staticmethod
    def create_password_reset_token(db: Session, email: str) -> str:
        """Create a password reset token for user."""
        account = AccountService.get_by_email(db, email)
        if not account:
            raise ValueError("Account not found")
        
        # Generate unique token
        token = str(uuid.uuid4())
        account.reset_password_token = token
        
        db.commit()
        
        return token
    
    @staticmethod
    def get_by_reset_token(db: Session, token: str) -> Optional[Account]:
        """Get account by password reset token."""
        return db.query(Account).filter(Account.reset_password_token == token).first()
    
    @staticmethod
    def reset_password(db: Session, token: str, new_password: str):
        """Reset password using token."""
        account = AccountService.get_by_reset_token(db, token)
        if not account:
            raise ValueError("Invalid or expired token")
        
        # Update password and clear token
        account.password_hash = get_password_hash(new_password)
        account.reset_password_token = None
        
        db.commit()
