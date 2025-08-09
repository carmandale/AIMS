#!/usr/bin/env python3
"""
Fix SnapTrade encryption issue by re-registering users

This script identifies users whose encrypted secrets cannot be decrypted
and re-registers them with SnapTrade to get fresh secrets.
"""

import sys
import os
import logging
import asyncio

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from sqlalchemy.orm import Session
from src.db import get_db
from src.db.models import SnapTradeUser
from src.services.snaptrade_service import snaptrade_service
from src.utils.encryption import encryption_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fix_encryption_issues():
    """Fix encryption issues by re-registering affected users"""

    if not snaptrade_service.is_enabled():
        print("❌ SnapTrade service is not enabled")
        return

    db_gen = get_db()
    db: Session = next(db_gen)

    try:
        # Get all SnapTrade users
        snaptrade_users = db.query(SnapTradeUser).filter(SnapTradeUser.is_active == True).all()

        print(f"Found {len(snaptrade_users)} active SnapTrade users")

        fixed_count = 0
        error_count = 0

        for st_user in snaptrade_users:
            print(f"\n--- Checking user: {st_user.user_id} ---")

            # Try to decrypt the current secret
            try:
                decrypted_secret = encryption_service.decrypt(st_user.snaptrade_user_secret)
                print(f"✅ User {st_user.user_id} - encryption is working")
                continue
            except Exception as e:
                print(f"❌ User {st_user.user_id} - decryption failed: {str(e)}")

            # Re-register the user with SnapTrade
            print(f"🔄 Re-registering user {st_user.user_id} with SnapTrade...")

            try:
                # First, delete the existing SnapTrade user if it exists
                await snaptrade_service.delete_user(st_user.user_id)
                print(f"   Deleted existing SnapTrade registration")

                # Register fresh
                new_secret = await snaptrade_service.register_user(st_user.user_id)

                if new_secret:
                    # Encrypt the new secret with current encryption key
                    encrypted_new_secret = encryption_service.encrypt(new_secret)

                    # Update the database
                    st_user.snaptrade_user_secret = encrypted_new_secret
                    st_user.sync_status = "registered"

                    db.commit()

                    print(f"✅ Successfully fixed user {st_user.user_id}")
                    fixed_count += 1
                else:
                    print(f"❌ Failed to get new secret for user {st_user.user_id}")
                    error_count += 1

            except Exception as e:
                print(f"❌ Error re-registering user {st_user.user_id}: {str(e)}")
                error_count += 1
                db.rollback()

        print(f"\n🎯 SUMMARY:")
        print(f"   Fixed: {fixed_count} users")
        print(f"   Errors: {error_count} users")
        print(f"   Total: {len(snaptrade_users)} users processed")

    finally:
        db.close()


if __name__ == "__main__":
    print("🔧 SnapTrade Encryption Fix Script")
    print("=" * 50)

    # Confirm before proceeding
    response = input("This will re-register users with SnapTrade. Continue? (yes/no): ")
    if response.lower() != "yes":
        print("Aborted.")
        sys.exit(0)

    asyncio.run(fix_encryption_issues())
