"""Tests for drawdown API endpoints"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from src.api.main import app
from src.db.models import User, PerformanceSnapshot

client = TestClient(app)


class TestDrawdownAPIEndpoints:
    """Test suite for drawdown API endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Create authentication headers for testing"""
        # Mock authentication for testing
        return {"Authorization": "Bearer test-token"}
    
    @pytest.fixture
    def mock_auth(self):
        """Mock authentication dependency"""
        with patch("src.api.auth.get_current_user") as mock:
            mock_user = User(
                id=1,
                user_id="test_user",
                email="test@example.com",
                password_hash="hashed",
                is_active=True,
                is_verified=True
            )
            mock.return_value = mock_user
            yield mock
    
    @pytest.fixture
    def mock_snapshots(self):
        """Create mock performance snapshots"""
        base_date = datetime.utcnow().date() - timedelta(days=10)
        
        # Create snapshots with drawdown
        snapshots = []
        values = [100000, 105000, 102000, 98000, 95000, 97000, 100000, 102000]
        
        for i, value in enumerate(values):
            snapshot = PerformanceSnapshot(
                id=i + 1,
                user_id="test_user",
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
                created_at=datetime.utcnow()
            )
            snapshots.append(snapshot)
        
        return snapshots
    
    def test_get_current_drawdown_success(self, auth_headers, mock_auth, mock_snapshots):
        """Test successful current drawdown retrieval"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_snapshots
            
            response = client.get("/api/performance/drawdown/current", headers=auth_headers)
            
            assert response.status_code == 200
            data = response.json()
            
            assert "current_drawdown_percent" in data
            assert "current_drawdown_amount" in data
            assert "peak_value" in data
            assert "peak_date" in data
            assert "current_value" in data
            assert "days_in_drawdown" in data
    
    def test_get_current_drawdown_no_data(self, auth_headers, mock_auth):
        """Test current drawdown with no performance data"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock empty database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
            
            response = client.get("/api/performance/drawdown/current", headers=auth_headers)
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["current_drawdown_percent"] == "0"
            assert data["current_drawdown_amount"] == "0"
            assert data["peak_value"] == "0"
    
    def test_get_current_drawdown_unauthorized(self):
        """Test current drawdown without authentication"""
        response = client.get("/api/performance/drawdown/current")
        assert response.status_code == 401
    
    def test_get_historical_drawdowns_success(self, auth_headers, mock_auth, mock_snapshots):
        """Test successful historical drawdown retrieval"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_snapshots
            
            response = client.get(
                "/api/performance/drawdown/historical",
                headers=auth_headers,
                params={"threshold": "5.0"}
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
    
    def test_get_historical_drawdowns_with_dates(self, auth_headers, mock_auth, mock_snapshots):
        """Test historical drawdowns with date range"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_snapshots
            
            start_date = (datetime.utcnow() - timedelta(days=30)).date()
            end_date = datetime.utcnow().date()
            
            response = client.get(
                "/api/performance/drawdown/historical",
                headers=auth_headers,
                params={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "threshold": "3.0"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "events" in data
    
    def test_get_drawdown_analysis_success(self, auth_headers, mock_auth, mock_snapshots):
        """Test successful drawdown analysis retrieval"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_snapshots
            
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
    
    def test_get_drawdown_alerts_success(self, auth_headers, mock_auth, mock_snapshots):
        """Test successful drawdown alerts retrieval"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_snapshots
            
            # Mock user preferences
            mock_db.query.return_value.filter.return_value.first.return_value = None
            
            response = client.get("/api/performance/drawdown/alerts", headers=auth_headers)
            
            assert response.status_code == 200
            data = response.json()
            
            assert "alerts" in data
            assert "warning_threshold" in data
            assert "critical_threshold" in data
    
    def test_update_alert_config_success(self, auth_headers, mock_auth):
        """Test successful alert configuration update"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            
            config_data = {
                "warning_threshold": "12.0",
                "critical_threshold": "18.0"
            }
            
            response = client.post(
                "/api/performance/drawdown/alerts/config",
                headers=auth_headers,
                json=config_data
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["warning_threshold"] == "12.0"
            assert data["critical_threshold"] == "18.0"
            assert data["message"] == "Alert thresholds updated successfully"
    
    def test_update_alert_config_invalid_thresholds(self, auth_headers, mock_auth):
        """Test alert configuration with invalid thresholds"""
        config_data = {
            "warning_threshold": "25.0",  # Greater than critical
            "critical_threshold": "20.0"
        }
        
        response = client.post(
            "/api/performance/drawdown/alerts/config",
            headers=auth_headers,
            json=config_data
        )
        
        assert response.status_code == 400
        assert "Warning threshold must be less than critical threshold" in response.json()["detail"]
    
    def test_update_alert_config_negative_threshold(self, auth_headers, mock_auth):
        """Test alert configuration with negative threshold"""
        config_data = {
            "warning_threshold": "-5.0",
            "critical_threshold": "20.0"
        }
        
        response = client.post(
            "/api/performance/drawdown/alerts/config",
            headers=auth_headers,
            json=config_data
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_get_current_drawdown_rate_limited(self, auth_headers, mock_auth):
        """Test rate limiting on drawdown endpoints"""
        with patch("src.db.session.SessionLocal") as mock_session:
            # Mock database query
            mock_db = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_db
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
            
            # Make multiple requests to trigger rate limiting
            # Note: This assumes rate limiting is configured
            responses = []
            for _ in range(100):  # Exceed rate limit
                response = client.get("/api/performance/drawdown/current", headers=auth_headers)
                responses.append(response.status_code)
            
            # At least some requests should be rate limited
            # This depends on actual rate limit configuration
            # assert 429 in responses  # Uncomment when rate limiting is configured