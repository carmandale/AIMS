"""Tests for DrawdownService"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from src.services.drawdown_service import DrawdownService
from src.db.models import PerformanceSnapshot


class TestDrawdownService:
    """Test suite for DrawdownService"""

    @pytest.fixture
    def drawdown_service(self):
        """Create DrawdownService instance"""
        return DrawdownService()

    @pytest.fixture
    def sample_snapshots(self) -> List[PerformanceSnapshot]:
        """Create sample performance snapshots for testing"""
        base_date = datetime.utcnow() - timedelta(days=30)

        # Simulate portfolio values with a drawdown
        values = [
            100000,  # Starting value
            102000,  # +2%
            105000,  # +5% (peak)
            103000,  # -1.9% from peak
            98000,  # -6.7% from peak
            95000,  # -9.5% from peak
            92000,  # -12.4% from peak (max drawdown)
            94000,  # Recovery begins
            97000,  # Continuing recovery
            105000,  # Back to peak
            108000,  # New high
        ]

        snapshots = []
        for i, value in enumerate(values):
            snapshot = PerformanceSnapshot(
                id=i + 1,
                user_id=1,
                snapshot_date=base_date + timedelta(days=i),
                total_value=Decimal(str(value)),
                cash_value=Decimal("5000"),
                positions_value=Decimal(str(value - 5000)),
                daily_pnl=Decimal("0"),
                daily_pnl_percent=Decimal("0"),
                weekly_pnl=Decimal("0"),
                weekly_pnl_percent=Decimal("0"),
                monthly_pnl=Decimal("0"),
                monthly_pnl_percent=Decimal("0"),
                ytd_pnl=Decimal("0"),
                ytd_pnl_percent=Decimal("0"),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("0"),
                created_at=datetime.utcnow(),
            )
            snapshots.append(snapshot)

        return snapshots

    def test_calculate_current_drawdown_no_data(self, drawdown_service):
        """Test current drawdown calculation with no data"""
        result = drawdown_service.calculate_current_drawdown([])

        assert result["current_drawdown_percent"] == Decimal("0")
        assert result["current_drawdown_amount"] == Decimal("0")
        assert result["peak_value"] == Decimal("0")
        assert result["peak_date"] is None
        assert result["current_value"] == Decimal("0")

    def test_calculate_current_drawdown_at_peak(self, drawdown_service, sample_snapshots):
        """Test current drawdown when portfolio is at all-time high"""
        # Use only snapshots up to the new high
        snapshots = sample_snapshots[:11]  # Ends at 108000
        result = drawdown_service.calculate_current_drawdown(snapshots)

        assert result["current_drawdown_percent"] == Decimal("0")
        assert result["current_drawdown_amount"] == Decimal("0")
        assert result["peak_value"] == Decimal("108000")
        assert result["current_value"] == Decimal("108000")
        assert result["peak_date"] == snapshots[-1].snapshot_date

    def test_calculate_current_drawdown_in_drawdown(self, drawdown_service, sample_snapshots):
        """Test current drawdown when portfolio is below peak"""
        # Use snapshots up to the max drawdown point
        snapshots = sample_snapshots[:7]  # Ends at 92000 (peak was 105000)
        result = drawdown_service.calculate_current_drawdown(snapshots)

        expected_drawdown_percent = Decimal("12.38")  # (105000 - 92000) / 105000 * 100
        expected_drawdown_amount = Decimal("13000")  # 105000 - 92000

        assert abs(result["current_drawdown_percent"] - expected_drawdown_percent) < Decimal("0.01")
        assert result["current_drawdown_amount"] == expected_drawdown_amount
        assert result["peak_value"] == Decimal("105000")
        assert result["current_value"] == Decimal("92000")
        assert result["peak_date"] == snapshots[2].snapshot_date

    def test_calculate_drawdown_events(self, drawdown_service, sample_snapshots):
        """Test identification of drawdown events"""
        events = drawdown_service.calculate_drawdown_events(
            sample_snapshots, threshold_percent=Decimal("5.0")
        )

        assert len(events) == 1  # One drawdown event exceeding 5%

        event = events[0]
        assert event["peak_value"] == Decimal("105000")
        assert event["trough_value"] == Decimal("92000")
        assert abs(event["max_drawdown_percent"] - Decimal("12.38")) < Decimal("0.01")
        assert event["drawdown_amount"] == Decimal("13000")
        assert event["recovery_days"] == 3  # Days from trough to recovery
        assert event["is_recovered"] is True

    def test_calculate_underwater_curve(self, drawdown_service, sample_snapshots):
        """Test underwater curve calculation"""
        curve = drawdown_service.calculate_underwater_curve(sample_snapshots)

        assert len(curve) == len(sample_snapshots)

        # Check specific points
        assert curve[0]["drawdown_percent"] == Decimal("0")  # Starting point
        assert curve[2]["drawdown_percent"] == Decimal("0")  # At peak
        assert abs(curve[6]["drawdown_percent"] - Decimal("12.38")) < Decimal(
            "0.01"
        )  # Max drawdown
        assert curve[9]["drawdown_percent"] == Decimal("0")  # Recovered

        # Verify all have required fields
        for point in curve:
            assert "date" in point
            assert "drawdown_percent" in point
            assert "portfolio_value" in point
            assert "peak_value" in point

    def test_check_alert_thresholds(self, drawdown_service, sample_snapshots):
        """Test alert threshold checking"""
        # Current drawdown at 12.38%
        snapshots = sample_snapshots[:7]

        alerts = drawdown_service.check_alert_thresholds(
            snapshots, warning_threshold=Decimal("10.0"), critical_threshold=Decimal("15.0")
        )

        assert len(alerts) == 1
        assert alerts[0]["level"] == "warning"
        assert alerts[0]["threshold"] == Decimal("10.0")
        assert abs(alerts[0]["current_drawdown"] - Decimal("12.38")) < Decimal("0.01")
        assert "Drawdown exceeds warning threshold" in alerts[0]["message"]

    def test_check_alert_thresholds_critical(self, drawdown_service):
        """Test critical alert threshold"""
        # Create snapshots with 20% drawdown
        snapshots = [
            PerformanceSnapshot(
                id=1,
                user_id=1,
                snapshot_date=datetime.utcnow() - timedelta(days=1),
                total_value=Decimal("100000"),
                cash_value=Decimal("5000"),
                positions_value=Decimal("95000"),
                daily_pnl=Decimal("0"),
                daily_pnl_percent=Decimal("0"),
                weekly_pnl=Decimal("0"),
                weekly_pnl_percent=Decimal("0"),
                monthly_pnl=Decimal("0"),
                monthly_pnl_percent=Decimal("0"),
                ytd_pnl=Decimal("0"),
                ytd_pnl_percent=Decimal("0"),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("0"),
                created_at=datetime.utcnow(),
            ),
            PerformanceSnapshot(
                id=2,
                user_id=1,
                snapshot_date=datetime.utcnow(),
                total_value=Decimal("80000"),  # 20% drawdown
                cash_value=Decimal("5000"),
                positions_value=Decimal("75000"),
                daily_pnl=Decimal("0"),
                daily_pnl_percent=Decimal("0"),
                weekly_pnl=Decimal("0"),
                weekly_pnl_percent=Decimal("0"),
                monthly_pnl=Decimal("0"),
                monthly_pnl_percent=Decimal("0"),
                ytd_pnl=Decimal("0"),
                ytd_pnl_percent=Decimal("0"),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("0"),
                created_at=datetime.utcnow(),
            ),
        ]

        alerts = drawdown_service.check_alert_thresholds(
            snapshots, warning_threshold=Decimal("15.0"), critical_threshold=Decimal("20.0")
        )

        assert len(alerts) == 2  # Both warning and critical
        assert any(alert["level"] == "critical" for alert in alerts)
        assert any(alert["level"] == "warning" for alert in alerts)

    def test_get_historical_analysis(self, drawdown_service, sample_snapshots):
        """Test historical drawdown analysis"""
        analysis = drawdown_service.get_historical_analysis(
            sample_snapshots,
            start_date=sample_snapshots[0].snapshot_date,
            end_date=sample_snapshots[-1].snapshot_date,
        )

        assert analysis["total_drawdown_events"] == 1
        assert abs(analysis["max_drawdown_percent"] - Decimal("12.38")) < Decimal("0.01")
        assert analysis["max_drawdown_amount"] == Decimal("13000")
        assert analysis["average_drawdown_percent"] > Decimal("0")
        assert analysis["average_recovery_days"] == 3
        assert analysis["current_drawdown_percent"] == Decimal("0")  # Recovered

    def test_empty_analysis(self, drawdown_service):
        """Test analysis with no drawdown events"""
        # Create snapshots that only go up
        snapshots = []
        base_date = datetime.utcnow() - timedelta(days=10)

        for i in range(10):
            snapshot = PerformanceSnapshot(
                id=i + 1,
                user_id=1,
                snapshot_date=base_date + timedelta(days=i),
                total_value=Decimal(str(100000 + i * 1000)),  # Always increasing
                cash_value=Decimal("5000"),
                positions_value=Decimal(str(95000 + i * 1000)),
                daily_pnl=Decimal("1000"),
                daily_pnl_percent=Decimal("1.0"),
                weekly_pnl=Decimal("0"),
                weekly_pnl_percent=Decimal("0"),
                monthly_pnl=Decimal("0"),
                monthly_pnl_percent=Decimal("0"),
                ytd_pnl=Decimal("0"),
                ytd_pnl_percent=Decimal("0"),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("0"),
                created_at=datetime.utcnow(),
            )
            snapshots.append(snapshot)

        analysis = drawdown_service.get_historical_analysis(snapshots)

        assert analysis["total_drawdown_events"] == 0
        assert analysis["max_drawdown_percent"] == Decimal("0")
        assert analysis["max_drawdown_amount"] == Decimal("0")
        assert analysis["average_drawdown_percent"] == Decimal("0")
        assert analysis["average_recovery_days"] == 0
        assert analysis["current_drawdown_percent"] == Decimal("0")
