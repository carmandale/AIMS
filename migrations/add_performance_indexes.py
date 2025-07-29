"""Add performance-related indexes for query optimization

This migration adds composite indexes to improve query performance for:
1. PerformanceSnapshot queries by user_id and date range
2. CachedData queries by cache_key

Run this migration with:
python migrations/add_performance_indexes.py
"""

import os
import sys
from sqlalchemy import create_engine, Index, text
from sqlalchemy.orm import sessionmaker

# Add src to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.db.models import Base, PerformanceSnapshot, CachedData
from src.core.config import settings


def add_indexes():
    """Add performance-related indexes to the database"""
    # Create engine
    engine = create_engine(settings.database_url)
    
    # Create indexes
    indexes = [
        # Composite index for user_id + snapshot_date (most common query pattern)
        Index(
            'idx_performance_user_date',
            PerformanceSnapshot.user_id,
            PerformanceSnapshot.snapshot_date
        ),
        
        # Index for snapshot_date alone (for date range queries)
        Index(
            'idx_performance_date',
            PerformanceSnapshot.snapshot_date
        ),
        
        # Index for cache_key lookups (already exists but verify)
        Index(
            'idx_cached_data_key',
            CachedData.cache_key
        ),
        
        # Index for cache expiration cleanup
        Index(
            'idx_cached_data_expires',
            CachedData.expires_at
        )
    ]
    
    # Create indexes
    with engine.connect() as conn:
        for index in indexes:
            try:
                index.create(conn)
                print(f"✓ Created index: {index.name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Index {index.name} already exists")
                else:
                    print(f"✗ Failed to create index {index.name}: {e}")
        
        # Commit the transaction
        conn.commit()
    
    print("\nDatabase indexes updated successfully!")


def verify_indexes():
    """Verify that indexes were created"""
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # SQLite specific query to list indexes
        result = conn.execute(text("""
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'index' 
            AND tbl_name IN ('performance_snapshots', 'cached_data')
            ORDER BY tbl_name, name
        """))
        
        print("\n📊 Current indexes:")
        for row in result:
            print(f"  - {row[0]}")
            if row[1]:  # SQL might be None for auto-created indexes
                print(f"    {row[1]}")


if __name__ == "__main__":
    print("Adding performance optimization indexes...")
    add_indexes()
    verify_indexes()