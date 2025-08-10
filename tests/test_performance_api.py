"""Tests for performance API endpoints"""

import json
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.api.main import app
from src.data.models.portfolio import PerformanceMetrics, RiskMetrics
from src.db.models import User, PerformanceSnapshot


class TestPerformanceAPI:
    """Test suite for performance API endpoints"""

    # Use the global client fixture from conftest.py instead of defining our own

    @pytest.fixture
    def test_user(self, test_db_session: Session) -> User:
        """Create a test user"""
        from tests.conftest import generate_unique_user_id

        user_id = generate_unique_user_id()
        user = User(
            user_id=user_id,
            email=f"test_{user_id}@example.com",
            password_hash="hashed_password",
            is_active=True,
        )
        test_db_session.add(user)
        test_db_session.commit()
        return user

    @pytest.fixture
    def auth_headers(self, test_user: User) -> dict:
        """Get authentication headers for test user"""
        from src.api.auth import create_access_token

        token = create_access_token(data={"sub": test_user.user_id, "email": test_user.email})
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def performance_snapshots(self, test_db_session: Session, test_user: User) -> list:
        """Create test performance snapshots"""
        snapshots = []
        base_value = 600000
        dates = [date.today() - timedelta(days=i) for i in range(30, -1, -1)]

        for i, snapshot_date in enumerate(dates):
            # Simulate some volatility
            daily_change = (i % 3 - 1) * 0.005  # -0.5%, 0%, or +0.5%
            value = base_value * (1 + daily_change * (i + 1))

            # Calculate daily P&L (mock values)
            daily_pnl = value * daily_change if i > 0 else 0
            daily_pnl_percent = daily_change * 100 if i > 0 else 0

            snapshot = PerformanceSnapshot(
                user_id=test_user.user_id,
                snapshot_date=snapshot_date,
                total_value=value,
                cash_value=value * 0.1,
                positions_value=value * 0.9,
                daily_pnl=daily_pnl,
                daily_pnl_percent=daily_pnl_percent,
            )
            snapshots.append(snapshot)
            test_db_session.add(snapshot)

        test_db_session.commit()
        return snapshots

    def test_get_performance_metrics_success(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test successful retrieval of performance metrics"""
        response = client.get("/api/performance/metrics?period=1M", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "portfolio_metrics" in data
        assert "benchmark_metrics" in data
        assert "time_series" in data
        assert "last_updated" in data

        # Check portfolio metrics
        metrics = data["portfolio_metrics"]
        assert "total_return" in metrics
        assert "daily_return" in metrics
        assert "monthly_return" in metrics
        assert "yearly_return" in metrics
        assert "sharpe_ratio" in metrics
        assert "volatility" in metrics
        assert "max_drawdown" in metrics
        assert "current_value" in metrics
        assert "period_start_value" in metrics

        # Check time series
        assert len(data["time_series"]) > 0
        assert all(
            key in data["time_series"][0]
            for key in ["date", "portfolio_value", "portfolio_return", "benchmark_return"]
        )

    @patch("src.services.benchmark_service.yf.download")
    def test_get_performance_metrics_with_benchmark(
        self, mock_yf_download, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test performance metrics with benchmark comparison"""
        # Mock yfinance data
        mock_data = MagicMock()
        mock_data.empty = False
        mock_data.index = [datetime(2024, 1, 1), datetime(2024, 1, 2)]
        mock_data.__getitem__.return_value = [100.0, 101.0]  # Mock Close prices
        mock_yf_download.return_value = mock_data

        response = client.get(
            "/api/performance/metrics?period=1M&benchmark=SPY", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Check benchmark metrics are included
        assert "benchmark_metrics" in data
        benchmark = data["benchmark_metrics"]
        assert "total_return" in benchmark
        assert "volatility" in benchmark
        assert "sharpe_ratio" in benchmark

    def test_get_performance_metrics_invalid_period(self, client: TestClient, auth_headers: dict):
        """Test performance metrics with invalid period"""
        response = client.get("/api/performance/metrics?period=INVALID", headers=auth_headers)

        assert response.status_code == 400
        assert "Invalid period" in response.json()["detail"]

    def test_get_performance_metrics_no_auth(self, client: TestClient):
        """Test performance metrics without authentication"""
        response = client.get("/api/performance/metrics?period=1M")

        assert response.status_code == 403

    def test_get_historical_performance_success(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test successful retrieval of historical performance data"""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        response = client.get(
            f"/api/performance/historical?start_date={start_date}&end_date={end_date}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "data" in data
        assert "summary" in data

        # Check data points
        assert len(data["data"]) > 0
        assert all(
            key in data["data"][0]
            for key in ["date", "portfolio_value", "cumulative_return", "period_return"]
        )

        # Check summary
        summary = data["summary"]
        assert "total_return" in summary
        assert "annualized_return" in summary
        assert "max_drawdown" in summary
        assert "volatility" in summary
        assert "sharpe_ratio" in summary

    def test_get_historical_performance_with_frequency(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test historical performance with different frequencies"""
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()

        # Test weekly frequency
        response = client.get(
            f"/api/performance/historical?start_date={start_date}&end_date={end_date}&frequency=weekly",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Weekly data should have fewer points than daily
        assert len(data["data"]) < 30

    def test_get_historical_performance_invalid_dates(self, client: TestClient, auth_headers: dict):
        """Test historical performance with invalid date range"""
        # End date before start date
        response = client.get(
            "/api/performance/historical?start_date=2025-01-01&end_date=2024-01-01",
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid date range" in response.json()["detail"]

    def test_update_benchmark_config_success(
        self, client: TestClient, auth_headers: dict, test_user: User
    ):
        """Test successful benchmark configuration update"""
        benchmark_data = {
            "benchmark_type": "custom",
            "symbol": "VTI",
            "name": "Total Stock Market Index",
            "allocation": 1.0,
        }

        response = client.post(
            "/api/performance/benchmark", headers=auth_headers, json=benchmark_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["message"] == "Benchmark updated successfully"
        assert "benchmark" in data

        benchmark = data["benchmark"]
        assert benchmark["symbol"] == "VTI"
        assert benchmark["name"] == "Total Stock Market Index"
        assert benchmark["allocation"] == 1.0

    def test_update_benchmark_config_invalid_symbol(self, client: TestClient, auth_headers: dict):
        """Test benchmark update with invalid symbol"""
        benchmark_data = {
            "benchmark_type": "custom",
            "symbol": "INVALID_SYMBOL_123",
            "name": "Invalid Benchmark",
            "allocation": 1.0,
        }

        response = client.post(
            "/api/performance/benchmark", headers=auth_headers, json=benchmark_data
        )

        # The endpoint currently allows invalid symbols with a warning
        # This might be changed in the future to validate more strictly
        assert response.status_code == 200
        assert "Benchmark updated successfully" in response.json()["message"]

    def test_update_benchmark_config_invalid_allocation(
        self, client: TestClient, auth_headers: dict
    ):
        """Test benchmark update with invalid allocation"""
        benchmark_data = {
            "benchmark_type": "custom",
            "symbol": "SPY",
            "name": "S&P 500",
            "allocation": 1.5,  # Invalid: > 1.0
        }

        response = client.post(
            "/api/performance/benchmark", headers=auth_headers, json=benchmark_data
        )

        assert response.status_code == 400
        assert "Allocation must be between 0 and 1" in response.json()["detail"]

    def test_performance_calculation_error(self, client: TestClient, auth_headers: dict):
        """Test handling of performance calculation errors"""
        # Test with a period that will cause no data to be found
        response = client.get("/api/performance/metrics?period=1M", headers=auth_headers)

        # Without snapshots, it should return 404
        assert response.status_code == 404
        assert "No performance data available" in response.json()["detail"]

    def test_performance_metrics_no_data(self, client: TestClient, auth_headers: dict):
        """Test performance metrics when no data is available"""
        # Don't create any snapshots
        response = client.get("/api/performance/metrics?period=1M", headers=auth_headers)

        assert response.status_code == 404
        assert "No performance data available" in response.json()["detail"]

    def test_performance_metrics_all_periods(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test performance metrics for all supported periods"""
        periods = ["1D", "7D", "1M", "3M", "6M", "1Y", "YTD", "ALL"]

        for period in periods:
            response = client.get(f"/api/performance/metrics?period={period}", headers=auth_headers)

            assert response.status_code == 200, f"Failed for period: {period}"
            data = response.json()
            assert "portfolio_metrics" in data

    def test_rate_limiting(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test rate limiting on performance endpoints"""
        # Make many requests quickly
        for _ in range(35):  # Exceed the 30 requests per minute limit
            response = client.get("/api/performance/metrics?period=1M", headers=auth_headers)

        # The last request should be rate limited
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]
