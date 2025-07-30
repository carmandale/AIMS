#!/usr/bin/env python3
"""Debug authentication process"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from src.db.session import get_db
from src.db.models import User
from src.api.auth import verify_password, hash_password

def debug_auth():
    """Debug authentication for test user"""
    # Get database session
    db = next(get_db())
    
    try:
        # Find test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ Test user not found!")
            return
        
        print(f"✅ Found test user:")
        print(f"  User ID: {test_user.user_id}")
        print(f"  Email: {test_user.email}")
        print(f"  Is Active: {test_user.is_active}")
        print(f"  Is Verified: {test_user.is_verified}")
        print(f"  Password hash: {test_user.password_hash[:50]}...")
        
        # Test password verification
        test_password = "testpassword"
        print(f"\n🔍 Testing password verification:")
        print(f"  Test password: '{test_password}'")
        
        is_valid = verify_password(test_password, test_user.password_hash)
        print(f"  Password valid: {is_valid}")
        
        if is_valid:
            print("\n✅ Authentication should work!")
        else:
            print("\n❌ Password verification failed!")
            print("  Trying to hash the test password:")
            new_hash = hash_password(test_password)
            print(f"  New hash: {new_hash[:50]}...")
            
            # Compare with current hash
            print(f"  Current: {test_user.password_hash[:50]}...")
            print(f"  New:     {new_hash[:50]}...")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    debug_auth()