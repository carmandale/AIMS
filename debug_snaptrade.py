#!/usr/bin/env python3
"""
SnapTrade Integration Debug Script

This script tests the various components of the SnapTrade integration to identify
why get_user_secret() returns None even though the user exists in the database.

Focus areas:
1. SnapTrade service initialization
2. Database connectivity and user lookup
3. Encryption/decryption functionality
4. Configuration validation
"""

import sys
import os
import logging
import asyncio
from datetime import datetime
from typing import Optional

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy.orm import Session
from src.db import get_db
from src.db.models import SnapTradeUser, User
from src.core.config import settings
from src.services.snaptrade_service import snaptrade_service
from src.utils.encryption import encryption_service

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_result(test_name: str, success: bool, details: str = ""):
    """Print a formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")

def test_configuration():
    """Test SnapTrade configuration"""
    print_section("1. CONFIGURATION TEST")
    
    print(f"SNAPTRADE_CLIENT_ID: {settings.snaptrade_client_id}")
    print(f"SNAPTRADE_CONSUMER_KEY: {settings.snaptrade_consumer_key[:10]}...")
    print(f"SNAPTRADE_ENVIRONMENT: {settings.snaptrade_environment}")
    print(f"SECRET_KEY: {settings.secret_key[:10]}...")
    print(f"DATABASE_URL: {settings.database_url}")
    
    # Test configuration completeness
    config_complete = bool(settings.snaptrade_client_id and settings.snaptrade_consumer_key)
    print_result("Configuration Complete", config_complete, 
                f"Client ID: {'Present' if settings.snaptrade_client_id else 'Missing'}, "
                f"Consumer Key: {'Present' if settings.snaptrade_consumer_key else 'Missing'}")
    
    return config_complete

def test_snaptrade_service():
    """Test SnapTrade service initialization"""
    print_section("2. SNAPTRADE SERVICE TEST")
    
    # Test service initialization
    service_enabled = snaptrade_service.is_enabled()
    print_result("Service Enabled", service_enabled)
    
    # Test client initialization
    client_initialized = snaptrade_service.client is not None
    print_result("Client Initialized", client_initialized)
    
    if snaptrade_service.client:
        print(f"    Client Type: {type(snaptrade_service.client)}")
        print(f"    Consumer Key Present: {bool(snaptrade_service.client.consumer_key)}")
    
    return service_enabled and client_initialized

def test_encryption_service():
    """Test encryption/decryption functionality"""
    print_section("3. ENCRYPTION SERVICE TEST")
    
    test_data = "test_user_secret_12345"
    
    try:
        # Test encryption
        encrypted = encryption_service.encrypt(test_data)
        print_result("Encryption", True, f"Original: {test_data[:10]}..., Encrypted: {encrypted[:20]}...")
        
        # Test decryption
        decrypted = encryption_service.decrypt(encrypted)
        decryption_success = decrypted == test_data
        print_result("Decryption", decryption_success, f"Decrypted: {decrypted[:10]}...")
        
        # Test round-trip
        round_trip_success = test_data == decrypted
        print_result("Round Trip", round_trip_success)
        
        return round_trip_success
        
    except Exception as e:
        print_result("Encryption/Decryption", False, f"Error: {str(e)}")
        return False

def test_database_connection():
    """Test database connectivity"""
    print_section("4. DATABASE CONNECTION TEST")
    
    try:
        # Get database session
        db_gen = get_db()
        db: Session = next(db_gen)
        
        # Test basic query
        user_count = db.query(User).count()
        snaptrade_user_count = db.query(SnapTradeUser).count()
        
        print_result("Database Connection", True)
        print(f"    Total Users: {user_count}")
        print(f"    Total SnapTrade Users: {snaptrade_user_count}")
        
        # Close the session
        db.close()
        
        return True
        
    except Exception as e:
        print_result("Database Connection", False, f"Error: {str(e)}")
        return False

def test_get_user_secret_function(test_user_id: str = "test_user"):
    """Test the get_user_secret function step by step"""
    print_section("5. GET_USER_SECRET FUNCTION TEST")
    
    try:
        # Get database session
        db_gen = get_db()
        db: Session = next(db_gen)
        
        # Recreate the get_user_secret logic step by step
        print(f"Testing with user_id: {test_user_id}")
        
        # Step 1: Query for SnapTrade user
        print("\nStep 1: Querying SnapTradeUser table...")
        query = db.query(SnapTradeUser).filter(
            SnapTradeUser.user_id == test_user_id, 
            SnapTradeUser.is_active == True
        )
        print(f"    Query: {query}")
        
        snaptrade_user = query.first()
        
        if not snaptrade_user:
            print_result("User Found", False, "No SnapTradeUser found with is_active=True")
            
            # Check if user exists with is_active=False
            inactive_user = db.query(SnapTradeUser).filter(
                SnapTradeUser.user_id == test_user_id, 
                SnapTradeUser.is_active == False
            ).first()
            
            if inactive_user:
                print(f"    ⚠️  Found user but is_active=False")
                print(f"    User details: ID={inactive_user.id}, sync_status={inactive_user.sync_status}")
            
            # Check if user exists without is_active filter
            any_user = db.query(SnapTradeUser).filter(
                SnapTradeUser.user_id == test_user_id
            ).first()
            
            if any_user:
                print(f"    ⚠️  Found user without is_active filter:")
                print(f"    User details: ID={any_user.id}, is_active={any_user.is_active}, sync_status={any_user.sync_status}")
            else:
                print(f"    ❌ No user found with user_id '{test_user_id}' at all")
            
            db.close()
            return None
        
        print_result("User Found", True, f"ID={snaptrade_user.id}, sync_status={snaptrade_user.sync_status}")
        
        # Step 2: Check encrypted secret
        print(f"\nStep 2: Checking encrypted secret...")
        encrypted_secret = snaptrade_user.snaptrade_user_secret
        print(f"    Encrypted secret length: {len(encrypted_secret) if encrypted_secret else 0}")
        print(f"    Encrypted secret (first 20 chars): {encrypted_secret[:20] if encrypted_secret else 'None'}")
        
        if not encrypted_secret:
            print_result("Encrypted Secret Present", False, "No encrypted secret stored")
            db.close()
            return None
        
        print_result("Encrypted Secret Present", True)
        
        # Step 3: Attempt decryption
        print(f"\nStep 3: Attempting decryption...")
        try:
            decrypted_secret = encryption_service.decrypt(encrypted_secret)
            print_result("Decryption Success", True, f"Decrypted length: {len(decrypted_secret)}")
            print(f"    Decrypted secret (first 10 chars): {decrypted_secret[:10]}...")
            
            db.close()
            return decrypted_secret
            
        except Exception as decrypt_error:
            print_result("Decryption Success", False, f"Decryption error: {str(decrypt_error)}")
            db.close()
            return None
        
    except Exception as e:
        print_result("get_user_secret Test", False, f"Error: {str(e)}")
        return None

def find_actual_users():
    """Find actual users in the database for testing"""
    print_section("6. FIND ACTUAL USERS")
    
    try:
        db_gen = get_db()
        db: Session = next(db_gen)
        
        # Get all users
        users = db.query(User).all()
        print(f"Total Users in database: {len(users)}")
        
        for user in users:
            print(f"    User: {user.user_id} (email: {user.email}, active: {user.is_active})")
        
        # Get all SnapTrade users
        snaptrade_users = db.query(SnapTradeUser).all()
        print(f"\nTotal SnapTrade Users in database: {len(snaptrade_users)}")
        
        for st_user in snaptrade_users:
            print(f"    SnapTradeUser: {st_user.user_id} (active: {st_user.is_active}, sync_status: {st_user.sync_status})")
        
        db.close()
        
        return [user.user_id for user in users] if users else []
        
    except Exception as e:
        print_result("Find Users", False, f"Error: {str(e)}")
        return []

async def test_snaptrade_api_call():
    """Test actual SnapTrade API call"""
    print_section("7. SNAPTRADE API TEST")
    
    if not snaptrade_service.is_enabled():
        print_result("API Test", False, "SnapTrade service not enabled")
        return False
    
    try:
        # Test user registration with a test user
        test_user_id = f"debug_test_user_{int(datetime.now().timestamp())}"
        print(f"Testing registration with user_id: {test_user_id}")
        
        user_secret = await snaptrade_service.register_user(test_user_id)
        
        if user_secret:
            print_result("API Registration", True, f"Received user secret: {user_secret[:10]}...")
            
            # Test connection URL generation
            connection_url = await snaptrade_service.generate_connection_url(
                test_user_id, user_secret, "read"
            )
            
            if connection_url:
                print_result("Connection URL Generation", True, f"URL: {connection_url[:50]}...")
            else:
                print_result("Connection URL Generation", False, "No URL returned")
            
            # Clean up test user
            await snaptrade_service.delete_user(test_user_id)
            print("    Cleaned up test user")
            
            return True
        else:
            print_result("API Registration", False, "No user secret returned")
            return False
            
    except Exception as e:
        print_result("API Test", False, f"Error: {str(e)}")
        return False

def main():
    """Main debug function"""
    print("🔍 SnapTrade Integration Debug Script")
    print("=" * 60)
    
    # Run all tests
    config_ok = test_configuration()
    service_ok = test_snaptrade_service()
    encryption_ok = test_encryption_service()
    db_ok = test_database_connection()
    
    # Find actual users for testing
    actual_user_ids = find_actual_users()
    
    # Test get_user_secret with actual users
    if actual_user_ids:
        print_section("TESTING get_user_secret WITH ACTUAL USERS")
        for user_id in actual_user_ids:
            print(f"\n--- Testing user_id: {user_id} ---")
            secret = test_get_user_secret_function(user_id)
            if secret:
                print(f"✅ Successfully retrieved secret for {user_id}")
                break
            else:
                print(f"❌ Could not retrieve secret for {user_id}")
    
    # Test SnapTrade API
    if config_ok and service_ok:
        print("\n🌐 Testing SnapTrade API...")
        asyncio.run(test_snaptrade_api_call())
    
    # Summary
    print_section("SUMMARY")
    print(f"Configuration: {'✅' if config_ok else '❌'}")
    print(f"SnapTrade Service: {'✅' if service_ok else '❌'}")
    print(f"Encryption: {'✅' if encryption_ok else '❌'}")
    print(f"Database: {'✅' if db_ok else '❌'}")
    print(f"Users Found: {len(actual_user_ids)}")
    
    print("\n🎯 LIKELY ISSUE DIAGNOSIS:")
    if not actual_user_ids:
        print("❌ No users found in database - registration may not have completed properly")
    elif not config_ok:
        print("❌ SnapTrade configuration is incomplete")
    elif not service_ok:
        print("❌ SnapTrade service failed to initialize")
    elif not encryption_ok:
        print("❌ Encryption service is not working properly")
    else:
        print("✅ All basic services working - issue likely in get_user_secret logic or user data")
    
    print("\n💡 RECOMMENDATIONS:")
    print("1. Check if user registration actually completed successfully")
    print("2. Verify is_active flag is set to True in snaptrade_users table")
    print("3. Check if encryption/decryption is working with actual stored data")
    print("4. Enable debug logging in the API to see exact error messages")

if __name__ == "__main__":
    main()