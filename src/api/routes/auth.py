"""Authentication endpoints"""

import logging
import secrets
from datetime import timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.auth import (
    create_access_token,
    AuthenticationError,
    get_current_user,
    hash_password,
    verify_password,
)
from src.api.schemas.portfolio import LoginRequest, UserRegistrationRequest, AuthResponse
from src.db import get_db
from src.db.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


def generate_user_id() -> str:
    """Generate a unique user ID"""
    return f"user_{secrets.token_urlsafe(16)}"


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: UserRegistrationRequest, db: Session = Depends(get_db)
) -> AuthResponse:
    """Register a new user"""

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Generate user ID
    user_id = generate_user_id()

    # Hash password
    password_hash = hash_password(request.password)

    # Create user
    user = User(
        user_id=user_id,
        email=request.email,
        password_hash=password_hash,
        is_active=True,
        is_verified=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create access token
    access_token = create_access_token(
        data={"sub": user.user_id, "email": user.email}, expires_delta=timedelta(hours=24)
    )

    logger.info(f"User registered successfully: {user.email}")

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,  # 24 hours
        user_id=user.user_id,
    )


@router.post("/login", response_model=AuthResponse)
async def login_user(request: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate user and return access token"""

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise AuthenticationError("Invalid email or password")

    if not user.is_active:
        raise AuthenticationError("Account is deactivated")

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise AuthenticationError("Invalid email or password")

    # Update last login
    from datetime import datetime

    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token = create_access_token(
        data={"sub": user.user_id, "email": user.email}, expires_delta=timedelta(hours=24)
    )

    logger.info(f"User logged in successfully: {user.email}")

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,  # 24 hours
        user_id=user.user_id,
    )


@router.post("/logout")
async def logout_user() -> Dict[str, Any]:
    """Logout user (client should discard token)"""
    # In a more sophisticated implementation, you might maintain a token blacklist
    # For now, we just return success and rely on client to discard token
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_info(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get current user information"""

    user = db.query(User).filter(User.user_id == current_user.user_id).first()

    if not user:
        raise AuthenticationError("User not found")

    return {
        "user_id": user.user_id,
        "email": user.email,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "last_login": user.last_login,
    }
