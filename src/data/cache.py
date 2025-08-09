"""Caching layer for data fetching"""

import json
import hashlib
from datetime import datetime, timedelta, date
from typing import Any, Optional, Dict, Union, List
from functools import wraps
from decimal import Decimal

from sqlalchemy.orm import Session

from src.db.models import CachedData


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal types"""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return {"__decimal__": str(obj)}
        return super().default(obj)


def decimal_decoder(obj):
    """Custom JSON decoder to handle Decimal types"""
    if isinstance(obj, dict) and "__decimal__" in obj:
        return Decimal(obj["__decimal__"])
    return obj


def decode_decimals(obj):
    """Recursively decode decimal objects"""
    if isinstance(obj, dict):
        if "__decimal__" in obj:
            return Decimal(obj["__decimal__"])
        return {k: decode_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decode_decimals(item) for item in obj]
    return obj


class CacheManager:
    """Manages caching of fetched data"""

    def __init__(self, default_ttl_hours: int = 24):
        self.default_ttl_hours = default_ttl_hours

    def _generate_key(self, prefix: str, params: Dict[str, Any]) -> str:
        """Generate cache key from prefix and parameters"""
        # Sort params for consistent key generation
        sorted_params = json.dumps(params, sort_keys=True, cls=DecimalEncoder)
        hash_object = hashlib.md5(sorted_params.encode())
        return f"{prefix}:{hash_object.hexdigest()}"

    def get(self, db: Session, key: str) -> Union[Dict[str, Any], List[Any], None]:
        """Get cached data if not expired"""
        cached = (
            db.query(CachedData)
            .filter(CachedData.cache_key == key, CachedData.expires_at > datetime.utcnow())
            .first()
        )

        if cached:
            # Decode any decimal objects back to Decimal instances
            return decode_decimals(cached.data)  # type: ignore[return-value]
        return None

    def _convert_decimals(self, obj: Any) -> Any:
        """Recursively convert Decimal objects to special dict and datetime/date to ISO string"""
        if isinstance(obj, Decimal):
            return {"__decimal__": str(obj)}
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_decimals(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self._convert_decimals(item) for item in obj)
        return obj

    def set(
        self, db: Session, key: str, data: Dict[str, Any], ttl_hours: Optional[int] = None
    ) -> None:
        """Set cache data with expiration"""
        ttl = ttl_hours or self.default_ttl_hours
        expires_at = datetime.utcnow() + timedelta(hours=ttl)

        # Convert any Decimal objects to float for JSON serialization
        converted_data = self._convert_decimals(data)

        # Check if key exists
        cached = db.query(CachedData).filter(CachedData.cache_key == key).first()

        if cached:
            cached.data = converted_data  # type: ignore[assignment]
            cached.expires_at = expires_at  # type: ignore[assignment]
        else:
            cached = CachedData(cache_key=key, data=converted_data, expires_at=expires_at)
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
