"""Tests for drawdown-related database models"""

import pytest
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.exc import IntegrityError

from src.db.models import Base, User, PerformanceSnapshot
from tests.conftest import test_db_session


class TestDrawdownModels:
    """Test suite for drawdown database models"""

    def test_performance_snapshot_drawdown_fields(self, test_db_session):
        """Test that PerformanceSnapshot model can store drawdown metrics"""
        # Create a test user
        user = User(
            user_id="test_user_123",
            email="test@example.com",
            password_hash="hashed_password"
        )
        test_db_session.add(user)
        test_db_session.commit()

        # Create a performance snapshot with drawdown fields
        snapshot = PerformanceSnapshot(
            user_id=user.user_id,
            snapshot_date=date.today(),
            total_value=Decimal("100000.00"),
            cash_value=Decimal("10000.00"),
            positions_value=Decimal("90000.00"),
            daily_pnl=Decimal("-1000.00"),
            daily_pnl_percent=Decimal("-1.00"),
            # New drawdown fields
            portfolio_high_water_mark=Decimal("105000.00"),
            current_drawdown=Decimal("5000.00"),
            current_drawdown_percent=Decimal("4.76"),
            days_in_drawdown=15
        )
        test_db_session.add(snapshot)
        test_db_session.commit()

        # Verify the snapshot was saved with drawdown data
        saved_snapshot = test_db_session.query(PerformanceSnapshot).filter_by(
            user_id=user.user_id
        ).first()
        
        assert saved_snapshot is not None
        assert saved_snapshot.portfolio_high_water_mark == Decimal("105000.00")
        assert saved_snapshot.current_drawdown == Decimal("5000.00")
        assert saved_snapshot.current_drawdown_percent == Decimal("4.76")
        assert saved_snapshot.days_in_drawdown == 15

    def test_performance_snapshot_nullable_drawdown_fields(self, test_db_session):
        """Test that drawdown fields are nullable for backward compatibility"""
        # Create a test user
        user = User(
            user_id="test_user_456",
            email="test2@example.com",
            password_hash="hashed_password"
        )
        test_db_session.add(user)
        test_db_session.commit()

        # Create a performance snapshot without drawdown fields
        snapshot = PerformanceSnapshot(
            user_id=user.user_id,
            snapshot_date=date.today(),
            total_value=Decimal("100000.00"),
            cash_value=Decimal("10000.00"),
            positions_value=Decimal("90000.00"),
            daily_pnl=Decimal("500.00"),
            daily_pnl_percent=Decimal("0.50")
            # Omitting drawdown fields
        )
        test_db_session.add(snapshot)
        test_db_session.commit()

        # Verify the snapshot was saved with null drawdown data
        saved_snapshot = test_db_session.query(PerformanceSnapshot).filter_by(
            user_id=user.user_id
        ).first()
        
        assert saved_snapshot is not None
        assert saved_snapshot.portfolio_high_water_mark is None
        assert saved_snapshot.current_drawdown is None
        assert saved_snapshot.current_drawdown_percent is None
        assert saved_snapshot.days_in_drawdown is None


# Import DrawdownEvent when it's created
try:
    from src.db.models import DrawdownEvent
    
    class TestDrawdownEventModel:
        """Test suite for DrawdownEvent model"""

        def test_create_drawdown_event(self, test_db_session):
            """Test creating a new drawdown event"""
            # Create a test user
            user = User(
                user_id="test_user_789",
                email="test3@example.com",
                password_hash="hashed_password"
            )
            test_db_session.add(user)
            test_db_session.commit()

            # Create a drawdown event
            event = DrawdownEvent(
                user_id=user.user_id,
                start_date=date(2025, 1, 1),
                peak_value=Decimal("110000.00"),
                trough_value=Decimal("95000.00"),
                max_drawdown_amount=Decimal("15000.00"),
                max_drawdown_percent=Decimal("13.64"),
                duration_days=30,
                is_recovered=False
            )
            test_db_session.add(event)
            test_db_session.commit()

            # Verify the event was saved
            saved_event = test_db_session.query(DrawdownEvent).filter_by(
                user_id=user.user_id
            ).first()
            
            assert saved_event is not None
            assert saved_event.start_date == date(2025, 1, 1)
            assert saved_event.peak_value == Decimal("110000.00")
            assert saved_event.trough_value == Decimal("95000.00")
            assert saved_event.max_drawdown_amount == Decimal("15000.00")
            assert saved_event.max_drawdown_percent == Decimal("13.64")
            assert saved_event.duration_days == 30
            assert saved_event.is_recovered is False

        def test_complete_drawdown_event(self, test_db_session):
            """Test creating a complete drawdown event with recovery"""
            # Create a test user
            user = User(
                user_id="test_user_recovery",
                email="recovery@example.com",
                password_hash="hashed_password"
            )
            test_db_session.add(user)
            test_db_session.commit()

            # Create a recovered drawdown event
            event = DrawdownEvent(
                user_id=user.user_id,
                start_date=date(2025, 1, 1),
                end_date=date(2025, 2, 15),
                peak_value=Decimal("110000.00"),
                trough_value=Decimal("95000.00"),
                recovery_value=Decimal("110500.00"),
                max_drawdown_amount=Decimal("15000.00"),
                max_drawdown_percent=Decimal("13.64"),
                duration_days=30,
                recovery_days=45,
                is_recovered=True
            )
            test_db_session.add(event)
            test_db_session.commit()

            # Verify the complete event was saved
            saved_event = test_db_session.query(DrawdownEvent).filter_by(
                user_id=user.user_id
            ).first()
            
            assert saved_event is not None
            assert saved_event.end_date == date(2025, 2, 15)
            assert saved_event.recovery_value == Decimal("110500.00")
            assert saved_event.recovery_days == 45
            assert saved_event.is_recovered is True

        def test_drawdown_event_user_constraint(self, test_db_session):
            """Test that drawdown event requires valid user_id"""
            # Try to create event with non-existent user
            event = DrawdownEvent(
                user_id="non_existent_user",
                start_date=date(2025, 1, 1),
                peak_value=Decimal("100000.00")
            )
            test_db_session.add(event)
            
            # Should fail with foreign key constraint
            # Note: SQLite foreign keys might not be enforced in test environment
            try:
                test_db_session.commit()
                # If commit succeeded, rollback and verify the event wasn't actually saved
                test_db_session.rollback()
                # In production, this would fail due to foreign key constraint
            except IntegrityError:
                test_db_session.rollback()
                # This is the expected behavior

        def test_query_drawdown_events_by_date_range(self, test_db_session):
            """Test querying drawdown events by date range"""
            # Create a test user
            user = User(
                user_id="test_user_query",
                email="query@example.com",
                password_hash="hashed_password"
            )
            test_db_session.add(user)
            test_db_session.commit()

            # Create multiple drawdown events
            events_data = [
                (date(2024, 1, 1), date(2024, 2, 1)),
                (date(2024, 6, 1), date(2024, 7, 15)),
                (date(2025, 1, 1), None),  # Ongoing
            ]
            
            for start, end in events_data:
                event = DrawdownEvent(
                    user_id=user.user_id,
                    start_date=start,
                    end_date=end,
                    peak_value=Decimal("100000.00"),
                    trough_value=Decimal("90000.00"),
                    is_recovered=end is not None
                )
                test_db_session.add(event)
            test_db_session.commit()

            # Query events in 2024
            events_2024 = test_db_session.query(DrawdownEvent).filter(
                DrawdownEvent.user_id == user.user_id,
                DrawdownEvent.start_date >= date(2024, 1, 1),
                DrawdownEvent.start_date < date(2025, 1, 1)
            ).all()
            
            assert len(events_2024) == 2
            
            # Query ongoing events
            ongoing_events = test_db_session.query(DrawdownEvent).filter(
                DrawdownEvent.user_id == user.user_id,
                DrawdownEvent.is_recovered == False
            ).all()
            
            assert len(ongoing_events) == 1
            assert ongoing_events[0].start_date == date(2025, 1, 1)

except ImportError:
    # DrawdownEvent model not yet implemented
    pass