#!/usr/bin/env python3
"""Create a test user for development and testing."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from src.db.session import get_db
from src.db.models import User
from src.api.auth import hash_password
import secrets


def create_test_user():
    """Create a test user if it doesn't exist."""
    # Get database session
    db = next(get_db())

    try:
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            print("Test user already exists with ID:", existing_user.user_id)
            print("Email:", existing_user.email)
            print("Is Active:", existing_user.is_active)
            print("Is Verified:", existing_user.is_verified)
            return

        # Generate user ID
        user_id = f"user_{secrets.token_urlsafe(16)}"

        # Hash password
        password_hash = hash_password("testpassword")

        # Create new test user
        test_user = User(
            user_id=user_id,
            email="test@example.com",
            password_hash=password_hash,
            is_active=True,
            is_verified=True,
        )

        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        print(f"Test user created successfully!")
        print(f"User ID: {test_user.user_id}")
        print(f"Email: {test_user.email}")
        print(f"Password: testpassword")
        print(f"Is Active: {test_user.is_active}")
        print(f"Is Verified: {test_user.is_verified}")

    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_test_user()
