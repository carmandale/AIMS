#!/usr/bin/env python3
"""Update test user to be verified."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from src.db.session import get_db
from src.db.models import User
from src.api.auth import hash_password, verify_password

def update_test_user():
    """Update test user to be verified and reset password."""
    # Get database session
    db = next(get_db())
    
    try:
        # Find test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("Test user not found!")
            return
        
        print(f"Found test user:")
        print(f"  User ID: {test_user.user_id}")
        print(f"  Email: {test_user.email}")
        print(f"  Is Active: {test_user.is_active}")
        print(f"  Is Verified: {test_user.is_verified}")
        print(f"  Current password hash: {test_user.password_hash[:20]}...")
        
        # Update user to be verified and reset password
        test_user.is_verified = True
        test_user.is_active = True
        
        # Reset password to ensure it's correct
        new_password_hash = hash_password("testpassword")
        test_user.password_hash = new_password_hash
        
        db.commit()
        db.refresh(test_user)
        
        print(f"\nTest user updated successfully!")
        print(f"  Is Active: {test_user.is_active}")
        print(f"  Is Verified: {test_user.is_verified}")
        print(f"  New password hash: {test_user.password_hash[:20]}...")
        print(f"  Password: testpassword")
        
        # Verify password works
        if verify_password("testpassword", test_user.password_hash):
            print("\n✓ Password verification successful!")
        else:
            print("\n✗ Password verification failed!")
        
    except Exception as e:
        print(f"Error updating test user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_test_user()