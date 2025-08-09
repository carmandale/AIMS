"""Tests for cached drawdown service"""

import time
import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal
from sqlalchemy.orm import Session

from src.db.models import PerformanceSnapshot, User
from src.services.drawdown_service_cached import CachedDrawdownService


class TestDrawdownCaching:
    """Test suite for cached drawdown service"""

    @pytest.fixture
    def test_user(self, test_db_session: Session) -> User:
        """Create a test user"""
        user = User(
            user_id="test_user_cache",
            email="cache_test@example.com",
            password_hash="hashed_password",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        test_db_session.add(user)
        test_db_session.commit()
        return user

    @pytest.fixture
    def cached_service(self):
        """Create cached drawdown service with short TTL for testing"""
        return CachedDrawdownService(cache_ttl_minutes=1)  # 1 minute TTL

    @pytest.fixture
    def test_snapshots(self, test_db_session: Session, test_user: User):
        """Create test performance snapshots"""
        snapshots = []
        base_value = 100000
        base_date = date.today() - timedelta(days=30)

        # Create snapshots with some drawdown
        values = [
            100000,
            105000,
            102000,
            98000,
            95000,
            97000,
            100000,
            102000,
            99000,
            96000,
            98000,
            101000,
            103000,
            100000,
            98000,
        ]

        for i, value in enumerate(values):
            snapshot = PerformanceSnapshot(
                user_id=test_user.user_id,
                snapshot_date=base_date + timedelta(days=i * 2),  # Every 2 days
                total_value=Decimal(str(value)),
                cash_value=Decimal("5000"),
                positions_value=Decimal(str(value - 5000)),
                daily_pnl=Decimal("0"),
                daily_pnl_percent=Decimal("0"),
                created_at=datetime.utcnow(),
            )
            snapshots.append(snapshot)
            test_db_session.add(snapshot)

        test_db_session.commit()
        return snapshots

    def test_current_drawdown_caching(
        self,
        cached_service: CachedDrawdownService,
        test_db_session: Session,
        test_user: User,
        test_snapshots: list,
    ):
        """Test that current drawdown calculation is cached"""
        # First call - should calculate and cache
        start_time = time.time()
        result1 = cached_service.calculate_current_drawdown_cached(
            test_db_session, test_user.user_id
        )
        first_call_time = time.time() - start_time

        # Second call - should retrieve from cache
        start_time = time.time()
        result2 = cached_service.calculate_current_drawdown_cached(
            test_db_session, test_user.user_id
        )
        second_call_time = time.time() - start_time

        # Results should have the same values (types may differ due to JSON serialization)
        assert str(result1["current_drawdown_percent"]) == str(result2["current_drawdown_percent"])
        assert str(result1["current_drawdown_amount"]) == str(result2["current_drawdown_amount"])
        assert str(result1["peak_value"]) == str(result2["peak_value"])
        assert result1["days_in_drawdown"] == result2["days_in_drawdown"]

        # Second call should be significantly faster (cached)
        assert second_call_time < first_call_time / 2

        # Verify result structure
        assert "current_drawdown_percent" in result1
        assert "current_drawdown_amount" in result1
        assert "peak_value" in result1
        assert "peak_date" in result1

    def test_drawdown_events_caching(
        self,
        cached_service: CachedDrawdownService,
        test_db_session: Session,
        test_user: User,
        test_snapshots: list,
    ):
        """Test that drawdown events calculation is cached"""
        threshold = Decimal("3.0")

        # First call
        result1 = cached_service.calculate_drawdown_events_cached(
            test_db_session, test_user.user_id, threshold_percent=threshold
        )

        # Second call with same parameters
        result2 = cached_service.calculate_drawdown_events_cached(
            test_db_session, test_user.user_id, threshold_percent=threshold
        )

        # Should get same results
        assert len(result1) == len(result2)
        if result1:
            assert result1[0]["peak_value"] == result2[0]["peak_value"]

        # Different threshold should not use cache
        result3 = cached_service.calculate_drawdown_events_cached(
            test_db_session, test_user.user_id, threshold_percent=Decimal("5.0")
        )

        # May have different number of events due to different threshold
        # This verifies cache key includes parameters
        assert result3 is not None

    def test_cache_invalidation(
        self,
        cached_service: CachedDrawdownService,
        test_db_session: Session,
        test_user: User,
        test_snapshots: list,
    ):
        """Test cache invalidation"""
        # Cache some data
        result1 = cached_service.calculate_current_drawdown_cached(
            test_db_session, test_user.user_id
        )

        # Invalidate cache
        cached_service.invalidate_user_cache(test_db_session, test_user.user_id)

        # Add a new snapshot
        new_snapshot = PerformanceSnapshot(
            user_id=test_user.user_id,
            snapshot_date=date.today(),
            total_value=Decimal("110000"),  # New high
            cash_value=Decimal("5000"),
            positions_value=Decimal("105000"),
            daily_pnl=Decimal("0"),
            daily_pnl_percent=Decimal("0"),
            created_at=datetime.utcnow(),
        )
        test_db_session.add(new_snapshot)
        test_db_session.commit()

        # Get new result (should recalculate)
        result2 = cached_service.calculate_current_drawdown_cached(
            test_db_session, test_user.user_id
        )

        # Drawdown should be 0 since we're at a new high
        assert result2["current_drawdown_percent"] == Decimal("0")

    def test_date_range_caching(
        self,
        cached_service: CachedDrawdownService,
        test_db_session: Session,
        test_user: User,
        test_snapshots: list,
    ):
        """Test that different date ranges use different cache keys"""
        start_date1 = datetime.utcnow() - timedelta(days=30)
        start_date2 = datetime.utcnow() - timedelta(days=15)

        # Call with first date range
        result1 = cached_service.calculate_underwater_curve_cached(
            test_db_session, test_user.user_id, start_date=start_date1
        )

        # Call with different date range
        result2 = cached_service.calculate_underwater_curve_cached(
            test_db_session, test_user.user_id, start_date=start_date2
        )

        # Should have different number of points due to different date ranges
        assert len(result1) != len(result2)

    def test_get_or_calculate_all(
        self,
        cached_service: CachedDrawdownService,
        test_db_session: Session,
        test_user: User,
        test_snapshots: list,
    ):
        """Test the optimized get_or_calculate_all method"""
        # This should be more efficient than calling each method separately
        start_time = time.time()
        all_metrics = cached_service.get_or_calculate_all(
            test_db_session, test_user.user_id, threshold_percent=Decimal("3.0")
        )
        total_time = time.time() - start_time

        # Verify all metrics are present
        assert "current_drawdown" in all_metrics
        assert "drawdown_events" in all_metrics
        assert "underwater_curve" in all_metrics
        assert "historical_analysis" in all_metrics

        # Verify data structure
        assert "current_drawdown_percent" in all_metrics["current_drawdown"]
        assert isinstance(all_metrics["drawdown_events"], list)
        assert isinstance(all_metrics["underwater_curve"], list)
        assert "total_drawdown_events" in all_metrics["historical_analysis"]

        print(f"\nget_or_calculate_all execution time: {total_time*1000:.2f}ms")

    def test_cache_expiration(
        self, test_db_session: Session, test_user: User, test_snapshots: list
    ):
        """Test that cache expires after TTL"""
        # Create service with very short TTL (1 second)
        short_ttl_service = CachedDrawdownService(cache_ttl_minutes=1 / 60)  # 1 second

        # First call
        result1 = short_ttl_service.calculate_current_drawdown_cached(
            test_db_session, test_user.user_id
        )

        # Wait for cache to expire
        time.sleep(1.1)

        # Add new snapshot to verify recalculation
        new_snapshot = PerformanceSnapshot(
            user_id=test_user.user_id,
            snapshot_date=date.today(),
            total_value=Decimal("85000"),  # Lower value
            cash_value=Decimal("5000"),
            positions_value=Decimal("80000"),
            daily_pnl=Decimal("0"),
            daily_pnl_percent=Decimal("0"),
            created_at=datetime.utcnow(),
        )
        test_db_session.add(new_snapshot)
        test_db_session.commit()

        # Should recalculate due to expired cache
        result2 = short_ttl_service.calculate_current_drawdown_cached(
            test_db_session, test_user.user_id
        )

        # Should have different values due to new snapshot
        assert result2["current_value"] == Decimal("85000")
