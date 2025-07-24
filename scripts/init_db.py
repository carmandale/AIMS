#!/usr/bin/env python3
"""Database initialization script for AIMS

This script handles:
- Database creation and table setup
- Migration support
- Development/test data seeding
- Database validation
"""

import sys
import os
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from src.db.models import Base, User, TaskTemplate, TaskInstance
from src.db.session import engine, SessionLocal, init_db
from src.core.config import settings
from scripts.utils import setup_logging, confirm_action


logger = setup_logging("init_db")


def check_database_exists() -> bool:
    """Check if database already exists with tables"""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return len(tables) > 0
    except Exception as e:
        logger.debug(f"Database check error: {e}")
        return False


def create_tables(force: bool = False) -> bool:
    """Create all database tables"""
    try:
        if check_database_exists() and not force:
            logger.warning("Database already exists with tables")
            if not confirm_action("Do you want to recreate all tables? This will DELETE all data!"):
                return False

            logger.info("Dropping all existing tables...")
            Base.metadata.drop_all(bind=engine)
            logger.info("All tables dropped")

        logger.info("Creating database tables...")
        init_db()

        # Verify tables were created
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"Created {len(tables)} tables: {', '.join(sorted(tables))}")

        return True

    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        return False


def seed_development_data(db: Session) -> bool:
    """Seed database with development/test data"""
    try:
        logger.info("Seeding development data...")

        # Check if data already exists
        existing_users = db.query(User).count()
        if existing_users > 0:
            logger.info(f"Found {existing_users} existing users, skipping user seed")
        else:
            # Create test user
            test_user = User(
                user_id="test_user_001",
                email="test@aims.local",
                password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGPKd",  # 'password'
                is_active=True,
                is_verified=True,
            )
            db.add(test_user)
            db.commit()
            logger.info("Created test user: test@aims.local")

        # Seed task templates
        existing_templates = db.query(TaskTemplate).count()
        if existing_templates > 0:
            logger.info(f"Found {existing_templates} existing task templates, skipping task seed")
        else:
            try:
                from src.db.seed_tasks import seed_tasks

                seed_tasks(db)
                logger.info("Task templates seeded successfully")
            except ImportError as e:
                logger.warning(f"Could not import seed_tasks: {e}")
                logger.info("Skipping task template seeding")

        return True

    except Exception as e:
        logger.error(f"Failed to seed development data: {e}")
        db.rollback()
        return False


def verify_database_setup(db: Session) -> bool:
    """Verify database is properly set up"""
    try:
        logger.info("Verifying database setup...")

        # Check all expected tables exist
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())

        expected_tables = {
            "users",
            "snaptrade_users",
            "brokerage_accounts",
            "positions",
            "balances",
            "transactions",
            "morning_brief",
            "cached_data",
            "task_status",
            "task_templates",
            "task_instances",
            "task_audit_log",
            "tax_lots",
            "sync_logs",
            "performance_snapshots",
            "reports",
            "asset_allocations",
        }

        missing_tables = expected_tables - tables
        if missing_tables:
            logger.error(f"Missing tables: {', '.join(sorted(missing_tables))}")
            return False

        # Test basic queries
        user_count = db.query(User).count()
        template_count = db.query(TaskTemplate).count()

        logger.info(f"Database verification passed:")
        logger.info(f"  - All {len(expected_tables)} required tables exist")
        logger.info(f"  - Users: {user_count}")
        logger.info(f"  - Task templates: {template_count}")

        return True

    except Exception as e:
        logger.error(f"Database verification failed: {e}")
        return False


def run_migrations() -> bool:
    """Run any pending database migrations"""
    logger.info("Checking for migrations...")
    # TODO: Implement Alembic migration support
    logger.info("Migration support not yet implemented")
    return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Initialize AIMS database")
    parser.add_argument(
        "--force", action="store_true", help="Force recreate all tables (DELETES ALL DATA)"
    )
    parser.add_argument("--no-seed", action="store_true", help="Skip seeding development data")
    parser.add_argument("--verify-only", action="store_true", help="Only verify database setup")
    parser.add_argument("--migrate", action="store_true", help="Run database migrations")

    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("AIMS Database Initialization")
    logger.info("=" * 60)
    logger.info(f"Database URL: {settings.database_url}")

    # Just verify if requested
    if args.verify_only:
        db = SessionLocal()
        try:
            success = verify_database_setup(db)
            sys.exit(0 if success else 1)
        finally:
            db.close()

    # Run migrations if requested
    if args.migrate:
        success = run_migrations()
        if not success:
            logger.error("Migration failed")
            sys.exit(1)

    # Create tables
    success = create_tables(force=args.force)
    if not success:
        logger.error("Failed to create tables")
        sys.exit(1)

    # Seed development data
    if not args.no_seed:
        db = SessionLocal()
        try:
            success = seed_development_data(db)
            if not success:
                logger.error("Failed to seed development data")
                sys.exit(1)
        finally:
            db.close()

    # Final verification
    db = SessionLocal()
    try:
        success = verify_database_setup(db)
        if success:
            logger.info("=" * 60)
            logger.info("Database initialization completed successfully!")
            logger.info("=" * 60)
        else:
            logger.error("Database verification failed")
            sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
