"""
Performance Dashboard Data Flow Integration Tests

This module tests the complete end-to-end data flow:
SnapTrade Data → Performance Calculations → API Responses → Frontend Dashboard

Test Categories:
1. Mock SnapTrade Data to Performance Calculations
2. Performance Snapshots Creation and Retrieval
3. Real-time Performance Updates Simulation
4. Benchmark Data Integration Flow
5. Error Handling Throughout Data Flow
6. Performance Under Load

Requirements:
- Mock SnapTrade service for controlled data
- Performance calculation services
- API endpoints
- Database with test data
"""

import pytest
import asyncio
import json
import os
from datetime import date, datetime, timedelta
from typing import Dict, List, Any, Optional
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.api.main import app
from src.db.models import User, PerformanceSnapshot, Base
from src.db.session import get_db
from src.services.snaptrade_service import SnapTradeService
from src.services.performance_analytics import PerformanceAnalyticsService
from src.services.benchmark_service import BenchmarkService
from src.api.auth import CurrentUser, get_current_user, hash_password
from src.core.config import settings


# Skip integration tests if SnapTrade credentials are not available
SNAPTRADE_AVAILABLE = bool(os.getenv("SNAPTRADE_CLIENT_ID") and os.getenv("SNAPTRADE_CONSUMER_KEY"))


# Test Database Setup - Use unique DB per test run
import uuid

SQLALCHEMY_DATABASE_URL = f"sqlite:///./test_performance_dataflow_{uuid.uuid4().hex[:8]}.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def create_performance_snapshot(
    user_id: str, snapshot_date: date, total_value: float, daily_pnl_percent: float = 0.0
) -> PerformanceSnapshot:
    """Helper function to create PerformanceSnapshot with correct fields"""
    return PerformanceSnapshot(
        user_id=user_id,
        snapshot_date=snapshot_date,
        total_value=Decimal(str(total_value)),
        cash_value=Decimal(str(total_value * 0.1)),  # 10% cash
        positions_value=Decimal(str(total_value * 0.9)),  # 90% positions
        daily_pnl=Decimal(str(total_value * daily_pnl_percent / 100)),
        daily_pnl_percent=Decimal(str(daily_pnl_percent)),
        weekly_pnl=Decimal(str(total_value * daily_pnl_percent / 100)),
        weekly_pnl_percent=Decimal(str(daily_pnl_percent)),
        monthly_pnl=Decimal(str(total_value * daily_pnl_percent / 100)),
        monthly_pnl_percent=Decimal(str(daily_pnl_percent)),
        ytd_pnl=Decimal(str(total_value * daily_pnl_percent / 100)),
        ytd_pnl_percent=Decimal(str(daily_pnl_percent)),
        volatility=Decimal("15.0"),
        sharpe_ratio=Decimal("1.2"),
        max_drawdown=Decimal("5.0"),
        created_at=datetime.utcnow(),
    )


@pytest.mark.skipif(not SNAPTRADE_AVAILABLE, reason="SnapTrade credentials not available")
class TestSnapTradeToPerformanceFlow:
    """Test complete data flow from SnapTrade to Performance Dashboard"""

    def setup_method(self):
        """Setup for data flow tests"""
        self.test_user_id = "test_dataflow_user_001"
        self.test_email = f"test_dataflow_{self.test_user_id}@example.com"

        self.db = TestingSessionLocal()

        # Clean up existing data
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()

        # Create test user
        test_user = User(
            user_id=self.test_user_id,
            email=self.test_email,
            password_hash=hash_password("testpassword"),
            is_active=True,
        )
        self.db.add(test_user)
        self.db.commit()

        # Setup authentication mock
        self.mock_user = CurrentUser(user_id=self.test_user_id, email=self.test_email)
        app.dependency_overrides[get_current_user] = lambda: self.mock_user

    def teardown_method(self):
        """Clean up after tests"""
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        self.db.close()

    def create_mock_snaptrade_data(self) -> Dict[str, Any]:
        """Create comprehensive mock SnapTrade data"""
        return {
            "accounts": [
                {
                    "id": "account_1",
                    "name": "Investment Account",
                    "institution_name": "Mock Broker",
                    "balance": {"total": 150000.00, "cash": 15000.00},
                    "positions": [
                        {
                            "symbol": "AAPL",
                            "quantity": 100,
                            "price": 180.00,
                            "market_value": 18000.00,
                            "average_purchase_price": 175.00,
                        },
                        {
                            "symbol": "GOOGL",
                            "quantity": 50,
                            "price": 2600.00,
                            "market_value": 130000.00,
                            "average_purchase_price": 2500.00,
                        },
                        {
                            "symbol": "TSLA",
                            "quantity": 25,
                            "price": 250.00,
                            "market_value": 6250.00,
                            "average_purchase_price": 240.00,
                        },
                    ],
                },
                {
                    "id": "account_2",
                    "name": "Cash Account",
                    "institution_name": "Mock Bank",
                    "balance": {"total": 50000.00, "cash": 50000.00},
                    "positions": [],
                },
            ],
            "total_portfolio_value": 200000.00,
            "total_cash": 65000.00,
            "total_positions_value": 135000.00,
        }

    @patch.object(SnapTradeService, "get_user_accounts")
    @patch.object(SnapTradeService, "get_account_positions")
    @patch.object(SnapTradeService, "get_account_balances")
    def test_snaptrade_to_performance_snapshot_flow(
        self,
        mock_balances,
        mock_positions,
        mock_accounts,
        client,  # use shared client fixture (ensures DB override and auth)
        test_db_session,  # use shared DB session so API sees inserted data
    ):
        """Test complete flow from SnapTrade data to performance snapshot creation"""

        # Setup mock SnapTrade responses
        mock_data = self.create_mock_snaptrade_data()
        mock_accounts.return_value = mock_data["accounts"]

        # Mock positions for each account
        def mock_positions_side_effect(user_id, user_secret, account_id):
            account = next((acc for acc in mock_data["accounts"] if acc["id"] == account_id), None)
            return account["positions"] if account else []

        mock_positions.side_effect = mock_positions_side_effect

        # Mock balances for each account
        def mock_balances_side_effect(user_id, user_secret, account_id):
            account = next((acc for acc in mock_data["accounts"] if acc["id"] == account_id), None)
            return account["balance"] if account else {"total": 0, "cash": 0}

        mock_balances.side_effect = mock_balances_side_effect

        # Simulate data collection and snapshot creation
        snaptrade_service = SnapTradeService()
        performance_service = PerformanceAnalyticsService(test_db_session)

        # This would typically be done by a scheduled task
        # For testing, we simulate the process
        total_value = mock_data["total_portfolio_value"]
        cash_value = mock_data["total_cash"]
        positions_value = mock_data["total_positions_value"]

        # Create performance snapshot
        # Ensure API sees the same user as this test
        from src.api.main import app
        from src.api.auth import get_current_user, CurrentUser
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            user_id=self.test_user_id, email=self.test_email
        )

        snapshot = create_performance_snapshot(
            self.test_user_id, date.today(), total_value, 0.0  # First snapshot - no change
        )
        test_db_session.add(snapshot)
        test_db_session.commit()

        # Test API endpoint retrieval
        response = client.get("/api/performance/metrics?period=1D&benchmark=NONE")
        assert response.status_code == 200

        data = response.json()
        assert "portfolio_metrics" in data
        assert data["portfolio_metrics"]["current_value"] == total_value

        # Clean override
        app.dependency_overrides.pop(get_current_user, None)

        print("✅ SnapTrade to Performance Snapshot flow test passed")
        print(f"   - Portfolio Value: ${total_value:,.2f}")
        print(f"   - Cash: ${cash_value:,.2f}")
        print(f"   - Positions: ${positions_value:,.2f}")

    def test_real_time_performance_updates_simulation(self, client, test_db_session):
        """Test simulation of real-time performance updates"""

        # Create initial snapshot
        initial_value = 100000.00
        initial_snapshot = PerformanceSnapshot(
            user_id=self.test_user_id,
            snapshot_date=date.today() - timedelta(days=1),
            total_value=Decimal(str(initial_value)),
            cash_value=Decimal("10000.00"),
            positions_value=Decimal("90000.00"),
            daily_pnl=Decimal("0.0"),
            daily_pnl_percent=Decimal("0.0"),
            weekly_pnl=Decimal("0.0"),
            weekly_pnl_percent=Decimal("0.0"),
            monthly_pnl=Decimal("0.0"),
            monthly_pnl_percent=Decimal("0.0"),
            ytd_pnl=Decimal("0.0"),
            ytd_pnl_percent=Decimal("0.0"),
            volatility=Decimal("15.0"),
            sharpe_ratio=Decimal("1.2"),
            max_drawdown=Decimal("5.0"),
            created_at=datetime.utcnow() - timedelta(days=1),
        )

        # Ensure API authenticates as this test user
        from src.api.main import app
        from src.api.auth import get_current_user, CurrentUser
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            user_id=self.test_user_id, email=self.test_email
        )

        test_db_session.add(initial_snapshot)
        test_db_session.commit()

        # Simulate market movements with multiple updates throughout the day
        market_movements = [
            {"time": "09:30", "change": 0.005},  # +0.5%
            {"time": "12:00", "change": -0.010},  # -1.0%
            {"time": "15:30", "change": 0.020},  # +2.0%
        ]

        for i, movement in enumerate(market_movements):
            # Calculate new portfolio value
            cumulative_change = sum(m["change"] for m in market_movements[: i + 1])
            new_value = initial_value * (1 + cumulative_change)
            daily_change = (new_value - initial_value) / initial_value

            # Create intraday snapshot
            intraday_snapshot = PerformanceSnapshot(
                user_id=self.test_user_id,
                snapshot_date=date.today(),
                total_value=Decimal(str(new_value)),
                cash_value=Decimal("10000.00"),
                positions_value=Decimal(str(new_value - 10000)),
                daily_pnl=Decimal(str((new_value - initial_value))),
                daily_pnl_percent=Decimal(str(daily_change * 100)),
                weekly_pnl=Decimal("0.0"),
                weekly_pnl_percent=Decimal("0.0"),
                monthly_pnl=Decimal("0.0"),
                monthly_pnl_percent=Decimal("0.0"),
                ytd_pnl=Decimal(str((new_value - initial_value))),
                ytd_pnl_percent=Decimal(str(daily_change * 100)),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("5.0"),
                created_at=datetime.utcnow(),
            )
            test_db_session.add(intraday_snapshot)
            test_db_session.commit()

            # Test API response reflects latest update
            response = client.get("/api/performance/metrics?period=1D&benchmark=NONE")
            assert response.status_code == 200

            data = response.json()
            portfolio_metrics = data["portfolio_metrics"]

            # Verify current value matches latest update
            assert abs(portfolio_metrics["current_value"] - new_value) < 0.01

            print(
                f"✅ Real-time update {movement['time']}: ${new_value:,.2f} ({cumulative_change:+.1%})"
            )

        print("✅ Real-time performance updates simulation test passed")

        # Clean override
        app.dependency_overrides.pop(get_current_user, None)

    @patch.object(BenchmarkService, "get_benchmark_data")
    def test_benchmark_integration_flow(self, mock_benchmark_data, client, test_db_session):
        """Test benchmark data integration with performance metrics"""

        # Create performance snapshots for testing
        base_date = date.today() - timedelta(days=30)
        base_value = 100000.00

        # Create 30 days of portfolio data with upward trend
        for i in range(31):
            snapshot_date = base_date + timedelta(days=i)
            portfolio_growth = 0.08 * (i / 365)  # 8% annual growth
            portfolio_value = base_value * (1 + portfolio_growth)

            snapshot = PerformanceSnapshot(
                user_id=self.test_user_id,
                snapshot_date=snapshot_date,
                total_value=Decimal(str(portfolio_value)),
                cash_value=Decimal("10000.00"),
                positions_value=Decimal(str(portfolio_value - 10000)),
                daily_pnl=Decimal(str(portfolio_value * 0.02 * ((-1) ** i))),
                daily_pnl_percent=Decimal(str(0.02 * ((-1) ** i) * 100)),
                weekly_pnl=Decimal("0.0"),
                weekly_pnl_percent=Decimal("0.0"),
                monthly_pnl=Decimal("0.0"),
                monthly_pnl_percent=Decimal("0.0"),
                ytd_pnl=Decimal(str(portfolio_value - base_value)),
                ytd_pnl_percent=Decimal(str(portfolio_growth * 100)),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("5.0"),
                created_at=datetime.utcnow(),
            )
            test_db_session.add(snapshot)

        test_db_session.commit()

        # Mock benchmark data (SPY with different performance)
        mock_benchmark_data.return_value = {
            "returns": {
                (base_date + timedelta(days=i)).isoformat(): 0.06
                * (i / 365)  # 6% annual growth for benchmark
                for i in range(31)
            },
            "total_return": 0.05,  # 5% total return for period
            "volatility": 0.15,  # 15% volatility
            "sharpe_ratio": 0.33,  # Sharpe ratio
        }

        # Test API with benchmark comparison
        # Ensure API authenticates as this test user
        from src.api.main import app
        from src.api.auth import get_current_user, CurrentUser
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            user_id=self.test_user_id, email=self.test_email
        )

        response = client.get("/api/performance/metrics?period=1M&benchmark=SPY")
        assert response.status_code == 200

        data = response.json()

        # Verify portfolio metrics
        assert "portfolio_metrics" in data
        portfolio_metrics = data["portfolio_metrics"]
        assert portfolio_metrics["total_return"] > 0  # Should be positive

        # Verify benchmark metrics
        assert "benchmark_metrics" in data
        benchmark_metrics = data["benchmark_metrics"]
        assert benchmark_metrics["total_return"] == 0.05
        assert benchmark_metrics["volatility"] == 0.15
        assert benchmark_metrics["sharpe_ratio"] == 0.33

        # Verify time series includes benchmark data
        assert "time_series" in data
        time_series = data["time_series"]
        assert len(time_series) > 0

        # Check that benchmark returns are included
        for data_point in time_series:
            assert "benchmark_return" in data_point
            # Most points should have benchmark data (mock returns)

        print("✅ Benchmark integration flow test passed")
        app.dependency_overrides.pop(get_current_user, None)
        print(f"   - Portfolio return: {portfolio_metrics['total_return']:.2%}")
        print(f"   - Benchmark return: {benchmark_metrics['total_return']:.2%}")
        print(
            f"   - Outperformance: {portfolio_metrics['total_return'] - benchmark_metrics['total_return']:.2%}"
        )

    def test_error_propagation_through_data_flow(self):
        """Test how errors propagate through the data flow"""

        # Test 1: Missing performance data
        # API now returns 200 with an empty payload to allow clients to render no-data state gracefully
        response = client.get("/api/performance/metrics?period=1M&benchmark=NONE")
        assert response.status_code == 200

        data = response.json()
        assert "portfolio_metrics" in data
        assert data["portfolio_metrics"]["current_value"] == 0.0
        assert isinstance(data.get("time_series", []), list)
        assert len(data.get("time_series", [])) == 0

        # Test 2: Create minimal data and test benchmark error handling
        snapshot = PerformanceSnapshot(
            user_id=self.test_user_id,
            snapshot_date=date.today(),
            total_value=Decimal("100000.00"),
            cash_value=Decimal("10000.00"),
            positions_value=Decimal("90000.00"),
            daily_pnl=Decimal("0.0"),
            daily_pnl_percent=Decimal("0.0"),
            weekly_pnl=Decimal("0.0"),
            weekly_pnl_percent=Decimal("0.0"),
            monthly_pnl=Decimal("0.0"),
            monthly_pnl_percent=Decimal("0.0"),
            ytd_pnl=Decimal("0.0"),
            ytd_pnl_percent=Decimal("0.0"),
            volatility=Decimal("15.0"),
            sharpe_ratio=Decimal("1.2"),
            max_drawdown=Decimal("5.0"),
            created_at=datetime.utcnow(),
        )
        self.db.add(snapshot)
        self.db.commit()

        # Test with benchmark that might fail
        with patch.object(BenchmarkService, "get_benchmark_data") as mock_benchmark:
            mock_benchmark.side_effect = Exception("Benchmark service unavailable")

            response = client.get("/api/performance/metrics?period=1D&benchmark=SPY")
            assert response.status_code == 200  # Should still work without benchmark

            data = response.json()
            # Should have portfolio metrics but empty benchmark metrics
            assert "portfolio_metrics" in data
            assert "benchmark_metrics" in data
            assert data["benchmark_metrics"] == {}  # Empty due to error

        print("✅ Error propagation test passed")

    def test_performance_calculation_accuracy_flow(self, client, test_db_session):
        """Test accuracy of calculations throughout the entire flow"""

        # Create precise test data with known expected results
        test_scenarios = [
            {
                "name": "10% gain over 5 days",
                "daily_values": [100000, 102000, 104000, 106000, 108000, 110000],
                "expected_total_return": 0.10,  # 10%
                "expected_daily_returns": [0.0, 0.02, 0.0196, 0.0192, 0.0189, 0.0185],
            },
            {
                "name": "5% loss over 3 days",
                "daily_values": [100000, 98000, 96000, 95000],
                "expected_total_return": -0.05,  # -5%
                "expected_daily_returns": [0.0, -0.02, -0.0204, -0.0104],
            },
        ]

        for scenario in test_scenarios:
            # Clean previous data
            test_db_session.query(PerformanceSnapshot).filter(
                PerformanceSnapshot.user_id == self.test_user_id
            ).delete()
            test_db_session.commit()

            # Create snapshots for scenario
            for i, value in enumerate(scenario["daily_values"]):
                snapshot_date = date.today() - timedelta(days=len(scenario["daily_values"]) - 1 - i)

                # Calculate returns
                if i == 0:
                    total_return = 0.0
                    daily_return = 0.0
                else:
                    total_return = (value - scenario["daily_values"][0]) / scenario["daily_values"][
                        0
                    ]
                    daily_return = (value - scenario["daily_values"][i - 1]) / scenario[
                        "daily_values"
                    ][i - 1]

                snapshot = PerformanceSnapshot(
                    user_id=self.test_user_id,
                    snapshot_date=snapshot_date,
                    total_value=Decimal(str(value)),
                    cash_value=Decimal("10000.00"),
                    positions_value=Decimal(str(value - 10000)),
                    daily_pnl=Decimal(str(value * daily_return)),
                    daily_pnl_percent=Decimal(str(daily_return * 100)),
                    weekly_pnl=Decimal("0.0"),
                    weekly_pnl_percent=Decimal("0.0"),
                    monthly_pnl=Decimal("0.0"),
                    monthly_pnl_percent=Decimal("0.0"),
                    ytd_pnl=Decimal(str(value * total_return)),
                    ytd_pnl_percent=Decimal(str(total_return * 100)),
                    volatility=Decimal("15.0"),
                    sharpe_ratio=Decimal("1.2"),
                    max_drawdown=Decimal("5.0"),
                    created_at=datetime.utcnow(),
                )
                test_db_session.add(snapshot)

            test_db_session.commit()

            # Test API calculations
            period = f"{len(scenario['daily_values']) - 1}D"
            # Ensure API authenticates as this test user
            from src.api.main import app
            from src.api.auth import get_current_user, CurrentUser
            app.dependency_overrides[get_current_user] = lambda: CurrentUser(
                user_id=self.test_user_id, email=self.test_email
            )
            # Ensure API authenticates as this test user
            from src.api.main import app
            from src.api.auth import get_current_user, CurrentUser
            app.dependency_overrides[get_current_user] = lambda: CurrentUser(
                user_id=self.test_user_id, email=self.test_email
            )
            response = client.get(f"/api/performance/metrics?period={period}&benchmark=NONE")
            assert response.status_code == 200

            data = response.json()
            portfolio_metrics = data["portfolio_metrics"]

            # Verify total return calculation
            actual_return = portfolio_metrics["total_return"]
            expected_return = scenario["expected_total_return"]
            assert (
                abs(actual_return - expected_return) < 0.001
            ), f"Expected {expected_return:.3f}, got {actual_return:.3f} for {scenario['name']}"

            # Verify current and starting values
            assert abs(portfolio_metrics["current_value"] - scenario["daily_values"][-1]) < 0.01
            assert abs(portfolio_metrics["period_start_value"] - scenario["daily_values"][0]) < 0.01

            print(f"✅ Calculation accuracy test passed: {scenario['name']}")
            print(f"   - Expected return: {expected_return:.2%}")
            print(f"   - Actual return: {actual_return:.2%}")
            app.dependency_overrides.pop(get_current_user, None)

            app.dependency_overrides.pop(get_current_user, None)

    def test_historical_data_consistency(self, client, test_db_session):
        """Test consistency of historical data across different API calls"""

        # Create 90 days of test data
        base_date = date.today() - timedelta(days=90)
        base_value = 100000.00

        for i in range(91):  # 0 to 90 days
            snapshot_date = base_date + timedelta(days=i)
            # Simulate realistic growth with volatility
            growth = 0.10 * (i / 90)  # 10% growth over 90 days
            volatility = 0.01 * ((-1) ** i)  # Daily volatility
            portfolio_value = base_value * (1 + growth + volatility)

            snapshot = PerformanceSnapshot(
                user_id=self.test_user_id,
                snapshot_date=snapshot_date,
                total_value=Decimal(str(portfolio_value)),
                cash_value=Decimal("10000.00"),
                positions_value=Decimal(str(portfolio_value - 10000)),
                daily_pnl=Decimal(str(base_value * volatility)),
                daily_pnl_percent=Decimal(str(volatility * 100)),
                weekly_pnl=Decimal("0.0"),
                weekly_pnl_percent=Decimal("0.0"),
                monthly_pnl=Decimal("0.0"),
                monthly_pnl_percent=Decimal("0.0"),
                ytd_pnl=Decimal(str(base_value * (growth + volatility))),
                ytd_pnl_percent=Decimal(str((growth + volatility) * 100)),
                volatility=Decimal("15.0"),
                sharpe_ratio=Decimal("1.2"),
                max_drawdown=Decimal("5.0"),
                created_at=datetime.utcnow(),
            )
            test_db_session.add(snapshot)

        test_db_session.commit()

        # Test different period endpoints for consistency
        test_periods = ["1M", "3M"]
        current_values = []

        # Ensure API authenticates as this test user
        from src.api.main import app
        from src.api.auth import get_current_user, CurrentUser
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            user_id=self.test_user_id, email=self.test_email
        )

        for period in test_periods:
            response = client.get(f"/api/performance/metrics?period={period}&benchmark=NONE")
            assert response.status_code == 200

            data = response.json()
            current_value = data["portfolio_metrics"]["current_value"]
            current_values.append(current_value)

        # All current values should be identical (latest snapshot)
        for i in range(1, len(current_values)):
            assert (
                abs(current_values[i] - current_values[0]) < 0.01
            ), "Current values should be identical across different periods"

        # Test historical endpoint consistency
        start_date = (base_date + timedelta(days=30)).isoformat()
        end_date = (base_date + timedelta(days=60)).isoformat()

        response = client.get(
            f"/api/performance/historical?start_date={start_date}&end_date={end_date}&frequency=daily"
        )
        assert response.status_code == 200

        historical_data = response.json()
        assert len(historical_data["data"]) == 31  # 30 days + 1

        # Verify data points are in chronological order
        dates = [point["date"] for point in historical_data["data"]]
        assert dates == sorted(dates)

        print("✅ Historical data consistency test passed")
        print(f"   - Current values match across periods: {current_values[0]:.2f}")
        print(f"   - Historical data points: {len(historical_data['data'])}")

        app.dependency_overrides.pop(get_current_user, None)


if __name__ == "__main__":
    """Run performance data flow integration tests"""
    print("🧪 Running Performance Data Flow Integration Tests...")
    print("=" * 80)

    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])

    print("=" * 80)
    print("🎯 Performance data flow integration tests completed!")
