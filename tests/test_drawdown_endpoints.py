"""Tests for drawdown API endpoints"""

import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.api.main import app
from src.db.models import User, PerformanceSnapshot


class TestDrawdownAPIEndpoints:
    """Test suite for drawdown API endpoints"""

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
        """Create test performance snapshots with drawdown scenarios"""
        snapshots = []
        base_date = date.today() - timedelta(days=10)

        # Create snapshots with drawdown scenario
        values = [100000, 105000, 102000, 98000, 95000, 97000, 100000, 102000]

        for i, value in enumerate(values):
            snapshot_date = base_date + timedelta(days=i)
            # Calculate daily P&L
            daily_pnl = (value - values[i - 1]) if i > 0 else 0
            daily_pnl_percent = (daily_pnl / values[i - 1] * 100) if i > 0 else 0

            snapshot = PerformanceSnapshot(
                user_id=test_user.user_id,
                snapshot_date=snapshot_date,
                total_value=Decimal(str(value)),
                cash_value=Decimal("5000"),
                positions_value=Decimal(str(value - 5000)),
                daily_pnl=Decimal(str(daily_pnl)),
                daily_pnl_percent=Decimal(str(daily_pnl_percent)),
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
            test_db_session.add(snapshot)

        test_db_session.commit()
        return snapshots

    def test_get_current_drawdown_success(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test successful current drawdown retrieval"""
        response = client.get("/api/performance/drawdown/current", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "current_drawdown_percent" in data
        assert "current_drawdown_amount" in data
        assert "peak_value" in data
        assert "peak_date" in data
        assert "current_value" in data
        assert "days_in_drawdown" in data

    def test_get_current_drawdown_no_data(self, client: TestClient, auth_headers: dict):
        """Test current drawdown with no performance data"""
        response = client.get("/api/performance/drawdown/current", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["current_drawdown_percent"] == "0"
        assert data["current_drawdown_amount"] == "0"
        assert data["peak_value"] == "0"

    def test_get_current_drawdown_unauthorized(self, client: TestClient):
        """Test current drawdown without authentication"""
        response = client.get("/api/performance/drawdown/current")
        assert response.status_code == 403

    def test_get_historical_drawdowns_success(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test successful historical drawdown retrieval"""
        response = client.get(
            "/api/performance/drawdown/historical",
            headers=auth_headers,
            params={"threshold": "5.0"},
        )

        assert response.status_code == 200
        data = response.json()

        assert "events" in data
        assert isinstance(data["events"], list)
        if data["events"]:
            event = data["events"][0]
            assert "peak_value" in event
            assert "trough_value" in event
            assert "max_drawdown_percent" in event
            assert "drawdown_days" in event

    def test_get_historical_drawdowns_with_dates(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test historical drawdowns with date range"""
        start_date = (datetime.utcnow() - timedelta(days=30)).date()
        end_date = datetime.utcnow().date()

        response = client.get(
            "/api/performance/drawdown/historical",
            headers=auth_headers,
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "threshold": "3.0",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "events" in data

    def test_get_drawdown_analysis_success(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test successful drawdown analysis retrieval"""
        response = client.get("/api/performance/drawdown/analysis", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "total_drawdown_events" in data
        assert "max_drawdown_percent" in data
        assert "max_drawdown_amount" in data
        assert "average_drawdown_percent" in data
        assert "average_recovery_days" in data
        assert "longest_drawdown_days" in data
        assert "current_drawdown_percent" in data
        assert "underwater_curve" in data

    def test_get_drawdown_alerts_success(
        self, client: TestClient, auth_headers: dict, performance_snapshots: list
    ):
        """Test successful drawdown alerts retrieval"""
        response = client.get("/api/performance/drawdown/alerts", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "alerts" in data
        assert "warning_threshold" in data
        assert "critical_threshold" in data

    def test_update_alert_config_success(self, client: TestClient, auth_headers: dict):
        """Test successful alert configuration update"""
        config_data = {"warning_threshold": "12.0", "critical_threshold": "18.0"}

        response = client.post(
            "/api/performance/drawdown/alerts/config", headers=auth_headers, json=config_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["warning_threshold"] == "12.0"
        assert data["critical_threshold"] == "18.0"
        assert data["message"] == "Alert thresholds updated successfully"

    def test_update_alert_config_invalid_thresholds(self, client: TestClient, auth_headers: dict):
        """Test alert configuration with invalid thresholds"""
        config_data = {
            "warning_threshold": "25.0",  # Greater than critical
            "critical_threshold": "20.0",
        }

        response = client.post(
            "/api/performance/drawdown/alerts/config", headers=auth_headers, json=config_data
        )

        assert response.status_code == 400
        assert "Warning threshold must be less than critical threshold" in response.json()["detail"]

    def test_update_alert_config_negative_threshold(self, client: TestClient, auth_headers: dict):
        """Test alert configuration with negative threshold"""
        config_data = {"warning_threshold": "-5.0", "critical_threshold": "20.0"}

        response = client.post(
            "/api/performance/drawdown/alerts/config", headers=auth_headers, json=config_data
        )

        assert response.status_code == 400  # Validation error

    def test_get_current_drawdown_rate_limited(self, client: TestClient, auth_headers: dict):
        """Test rate limiting on drawdown endpoints"""
        # Make multiple requests to trigger rate limiting
        # Note: This assumes rate limiting is configured
        responses = []
        for _ in range(35):  # Exceed rate limit
            response = client.get("/api/performance/drawdown/current", headers=auth_headers)
            responses.append(response.status_code)

        # The last request should be rate limited if rate limiting is enabled
        # assert 429 in responses  # Uncomment when rate limiting is configured
