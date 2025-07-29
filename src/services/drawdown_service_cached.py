"""Enhanced drawdown service with caching and performance optimizations"""

import hashlib
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any, Tuple

from sqlalchemy.orm import Session

from src.data.cache import cache_manager
from src.db.models import PerformanceSnapshot
from src.services.drawdown_service import DrawdownService


class CachedDrawdownService(DrawdownService):
    """Drawdown service with caching layer for performance optimization"""
    
    def __init__(self, cache_ttl_minutes: int = 5):
        """
        Initialize cached service
        
        Args:
            cache_ttl_minutes: Cache time-to-live in minutes (default 5)
        """
        super().__init__()
        self.cache_ttl_hours = cache_ttl_minutes / 60  # Convert to hours for cache manager
    
    def _get_cache_key(self, user_id: str, method: str, params: Dict[str, Any]) -> str:
        """Generate cache key for drawdown calculations"""
        cache_params = {
            "user_id": user_id,
            "method": method,
            **params
        }
        return cache_manager._generate_key("drawdown", cache_params)
    
    def calculate_current_drawdown_cached(
        self,
        db: Session,
        user_id: str,
        snapshots: Optional[List[PerformanceSnapshot]] = None
    ) -> Dict[str, Any]:
        """
        Calculate current drawdown with caching
        
        Args:
            db: Database session
            user_id: User ID for cache key
            snapshots: Optional pre-loaded snapshots
            
        Returns:
            Current drawdown metrics (cached)
        """
        # Generate cache key
        cache_key = self._get_cache_key(user_id, "current_drawdown", {})
        
        # Check cache
        cached_result = cache_manager.get(db, cache_key)
        if cached_result is not None:
            return cached_result
        
        # Load snapshots if not provided
        if snapshots is None:
            snapshots = (
                db.query(PerformanceSnapshot)
                .filter(PerformanceSnapshot.user_id == user_id)
                .order_by(PerformanceSnapshot.snapshot_date)
                .all()
            )
        
        # Calculate drawdown
        result = self.calculate_current_drawdown(snapshots)
        
        # Cache result
        cache_manager.set(db, cache_key, result, self.cache_ttl_hours)
        
        return result
    
    def calculate_drawdown_events_cached(
        self,
        db: Session,
        user_id: str,
        threshold_percent: Decimal = Decimal("5.0"),
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        snapshots: Optional[List[PerformanceSnapshot]] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculate drawdown events with caching
        
        Args:
            db: Database session
            user_id: User ID for cache key
            threshold_percent: Minimum drawdown to consider
            start_date: Optional start date filter
            end_date: Optional end date filter
            snapshots: Optional pre-loaded snapshots
            
        Returns:
            List of drawdown events (cached)
        """
        # Generate cache key with parameters
        cache_params = {
            "threshold": str(threshold_percent),
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None
        }
        cache_key = self._get_cache_key(user_id, "drawdown_events", cache_params)
        
        # Check cache
        cached_result = cache_manager.get(db, cache_key)
        if cached_result is not None:
            return cached_result
        
        # Load snapshots if not provided
        if snapshots is None:
            query = db.query(PerformanceSnapshot).filter(
                PerformanceSnapshot.user_id == user_id
            )
            
            if start_date:
                query = query.filter(PerformanceSnapshot.snapshot_date >= start_date.date())
            if end_date:
                query = query.filter(PerformanceSnapshot.snapshot_date <= end_date.date())
            
            snapshots = query.order_by(PerformanceSnapshot.snapshot_date).all()
        
        # Calculate events
        result = self.calculate_drawdown_events(snapshots, threshold_percent)
        
        # Cache result
        cache_manager.set(db, cache_key, result, self.cache_ttl_hours)
        
        return result
    
    def calculate_underwater_curve_cached(
        self,
        db: Session,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        snapshots: Optional[List[PerformanceSnapshot]] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculate underwater curve with caching
        
        Args:
            db: Database session
            user_id: User ID for cache key
            start_date: Optional start date filter
            end_date: Optional end date filter
            snapshots: Optional pre-loaded snapshots
            
        Returns:
            Underwater curve data (cached)
        """
        # Generate cache key
        cache_params = {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None
        }
        cache_key = self._get_cache_key(user_id, "underwater_curve", cache_params)
        
        # Check cache
        cached_result = cache_manager.get(db, cache_key)
        if cached_result is not None:
            return cached_result
        
        # Load snapshots if not provided
        if snapshots is None:
            query = db.query(PerformanceSnapshot).filter(
                PerformanceSnapshot.user_id == user_id
            )
            
            if start_date:
                query = query.filter(PerformanceSnapshot.snapshot_date >= start_date.date())
            if end_date:
                query = query.filter(PerformanceSnapshot.snapshot_date <= end_date.date())
            
            snapshots = query.order_by(PerformanceSnapshot.snapshot_date).all()
        
        # Calculate curve
        result = self.calculate_underwater_curve(snapshots)
        
        # Cache result
        cache_manager.set(db, cache_key, result, self.cache_ttl_hours)
        
        return result
    
    def get_historical_analysis_cached(
        self,
        db: Session,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        threshold_percent: Decimal = Decimal("5.0"),
        snapshots: Optional[List[PerformanceSnapshot]] = None
    ) -> Dict[str, Any]:
        """
        Get historical analysis with caching
        
        Args:
            db: Database session
            user_id: User ID for cache key
            start_date: Optional start date filter
            end_date: Optional end date filter
            threshold_percent: Minimum drawdown threshold
            snapshots: Optional pre-loaded snapshots
            
        Returns:
            Historical analysis results (cached)
        """
        # Generate cache key
        cache_params = {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "threshold": str(threshold_percent)
        }
        cache_key = self._get_cache_key(user_id, "historical_analysis", cache_params)
        
        # Check cache
        cached_result = cache_manager.get(db, cache_key)
        if cached_result is not None:
            return cached_result
        
        # Load snapshots if not provided
        if snapshots is None:
            query = db.query(PerformanceSnapshot).filter(
                PerformanceSnapshot.user_id == user_id
            )
            
            if start_date:
                query = query.filter(PerformanceSnapshot.snapshot_date >= start_date.date())
            if end_date:
                query = query.filter(PerformanceSnapshot.snapshot_date <= end_date.date())
            
            snapshots = query.order_by(PerformanceSnapshot.snapshot_date).all()
        
        # Get analysis
        result = self.get_historical_analysis(
            snapshots,
            start_date,
            end_date,
            threshold_percent
        )
        
        # Cache result
        cache_manager.set(db, cache_key, result, self.cache_ttl_hours)
        
        return result
    
    def invalidate_user_cache(self, db: Session, user_id: str):
        """
        Invalidate all cached drawdown data for a user
        
        Args:
            db: Database session
            user_id: User ID to invalidate cache for
        """
        # Invalidate all cache entries for this user's drawdown data
        cache_pattern = f"drawdown:*{user_id}*"
        cache_manager.invalidate(db, cache_pattern)
    
    def get_or_calculate_all(
        self,
        db: Session,
        user_id: str,
        threshold_percent: Decimal = Decimal("5.0"),
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get or calculate all drawdown metrics in one call (optimized)
        
        This method loads snapshots once and reuses them for all calculations,
        improving performance when multiple metrics are needed.
        
        Args:
            db: Database session
            user_id: User ID
            threshold_percent: Threshold for drawdown events
            start_date: Optional start date
            end_date: Optional end date
            
        Returns:
            Dict containing all drawdown metrics
        """
        # Load snapshots once
        query = db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == user_id
        )
        
        if start_date:
            query = query.filter(PerformanceSnapshot.snapshot_date >= start_date.date())
        if end_date:
            query = query.filter(PerformanceSnapshot.snapshot_date <= end_date.date())
        
        snapshots = query.order_by(PerformanceSnapshot.snapshot_date).all()
        
        # Calculate all metrics with the same snapshot data
        return {
            "current_drawdown": self.calculate_current_drawdown_cached(
                db, user_id, snapshots
            ),
            "drawdown_events": self.calculate_drawdown_events_cached(
                db, user_id, threshold_percent, start_date, end_date, snapshots
            ),
            "underwater_curve": self.calculate_underwater_curve_cached(
                db, user_id, start_date, end_date, snapshots
            ),
            "historical_analysis": self.get_historical_analysis_cached(
                db, user_id, start_date, end_date, threshold_percent, snapshots
            )
        }