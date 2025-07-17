"""Caching layer for data fetching"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional, Dict
from functools import wraps

from sqlalchemy.orm import Session

from src.db.models import CachedData


class CacheManager:
    """Manages caching of fetched data"""

    def __init__(self, default_ttl_hours: int = 24):
        self.default_ttl_hours = default_ttl_hours

    def _generate_key(self, prefix: str, params: Dict[str, Any]) -> str:
        """Generate cache key from prefix and parameters"""
        # Sort params for consistent key generation
        sorted_params = json.dumps(params, sort_keys=True)
        hash_object = hashlib.md5(sorted_params.encode())
        return f"{prefix}:{hash_object.hexdigest()}"

    def get(self, db: Session, key: str) -> Optional[Dict[str, Any]]:
        """Get cached data if not expired"""
        cached = (
            db.query(CachedData)
            .filter(CachedData.cache_key == key, CachedData.expires_at > datetime.utcnow())
            .first()
        )

        if cached:
            return cached.data
        return None

    def set(
        self, db: Session, key: str, data: Dict[str, Any], ttl_hours: Optional[int] = None
    ) -> None:
        """Set cache data with expiration"""
        ttl = ttl_hours or self.default_ttl_hours
        expires_at = datetime.utcnow() + timedelta(hours=ttl)

        # Check if key exists
        cached = db.query(CachedData).filter(CachedData.cache_key == key).first()

        if cached:
            cached.data = data
            cached.expires_at = expires_at
        else:
            cached = CachedData(cache_key=key, data=data, expires_at=expires_at)
            db.add(cached)

        db.commit()

    def invalidate(self, db: Session, key_pattern: str) -> None:
        """Invalidate cache entries matching pattern"""
        db.query(CachedData).filter(CachedData.cache_key.like(f"{key_pattern}%")).delete()
        db.commit()

    def cleanup_expired(self, db: Session) -> int:
        """Remove expired cache entries"""
        count = db.query(CachedData).filter(CachedData.expires_at <= datetime.utcnow()).delete()
        db.commit()
        return count


# Global cache manager instance
cache_manager = CacheManager()


def cached(prefix: str, ttl_hours: int = 24):
    """Decorator for caching async functions"""

    def decorator(func):
        @wraps(func)
        async def wrapper(self, db: Session, *args, **kwargs):
            # Generate cache key
            cache_params = {"args": str(args), "kwargs": str(kwargs)}
            cache_key = cache_manager._generate_key(prefix, cache_params)

            # Check cache
            cached_data = cache_manager.get(db, cache_key)
            if cached_data is not None:
                return cached_data

            # Call function and cache result
            result = await func(self, db, *args, **kwargs)
            cache_manager.set(db, cache_key, result, ttl_hours)

            return result

        return wrapper

    return decorator
