"""Integration tests for position sizing API endpoints"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.db.models import User, BrokerageAccount


class TestPositionSizingAPI:
    """Test suite for position sizing API endpoints"""

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
    def test_account(self, test_db_session: Session, test_user: User) -> BrokerageAccount:
        """Create a test brokerage account"""
        from src.data.models import BrokerType

        account = BrokerageAccount(
            user_id=test_user.user_id,
            brokerage_type=BrokerType.FIDELITY,
            account_number="12345",
            account_type="individual",
            account_name="Test Investment Account",
            is_active=True,
        )
        test_db_session.add(account)
        test_db_session.commit()
        return account

    @pytest.fixture
    def auth_headers(self, test_user: User) -> dict:
        """Get authentication headers for test user"""
        from src.api.auth import create_access_token

        token = create_access_token(data={"sub": test_user.user_id, "email": test_user.email})
        return {"Authorization": f"Bearer {token}"}

    def test_calculate_fixed_risk(self, client: TestClient, auth_headers: dict):
        """Test fixed risk position size calculation"""
        payload = {
            "method": "fixed_risk",
            "account_value": 100000,
            "risk_percentage": 0.02,
            "entry_price": 50,
            "stop_loss": 48,
            "target_price": 56,
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["position_size"] == 1000
        assert data["position_value"] == 50000
        assert data["risk_amount"] == 2000
        assert data["risk_percentage"] == 0.02
        assert data["stop_loss_percentage"] == 0.04
        assert data["risk_reward_ratio"] == 3.0
        assert data["metadata"]["method_used"] == "fixed_risk"

    def test_calculate_kelly_criterion(self, client: TestClient, auth_headers: dict):
        """Test Kelly criterion position size calculation"""
        payload = {
            "method": "kelly",
            "account_value": 100000,
            "win_rate": 0.6,
            "avg_win_loss_ratio": 2.0,
            "confidence_level": 0.25,
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["kelly_percentage"] == pytest.approx(0.1, rel=1e-9)
        assert data["position_value"] == pytest.approx(10000, rel=1e-9)
        assert data["metadata"]["method_used"] == "kelly"

    def test_calculate_volatility_based(self, client: TestClient, auth_headers: dict):
        """Test volatility-based position size calculation"""
        payload = {
            "method": "volatility_based",
            "account_value": 100000,
            "risk_percentage": 0.02,
            "entry_price": 50,
            "atr": 2.5,
            "atr_multiplier": 2.0,
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["position_size"] == 400
        assert data["stop_loss_percentage"] == 0.1
        # The metadata might vary based on implementation
        assert "metadata" in data

    def test_calculate_missing_required_fields(self, client: TestClient, auth_headers: dict):
        """Test calculation with missing required fields"""
        payload = {
            "method": "fixed_risk",
            "account_value": 100000,
            # Missing risk_percentage, entry_price, stop_loss
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert "fixed risk method requires" in response.json()["detail"].lower()

    def test_calculate_invalid_method(self, client: TestClient, auth_headers: dict):
        """Test calculation with invalid method"""
        payload = {
            "method": "invalid_method",
            "account_value": 100000,
            "risk_percentage": 0.02,
            "entry_price": 50,
            "stop_loss": 48,
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 422
        # The error comes from Pydantic validation
        error_detail = response.json()["detail"]
        assert isinstance(error_detail, list)
        assert any("method" in str(err).lower() for err in error_detail)

    def test_calculate_excessive_risk(self, client: TestClient, auth_headers: dict):
        """Test calculation with excessive risk percentage"""
        payload = {
            "method": "fixed_risk",
            "account_value": 100000,
            "risk_percentage": 0.5,  # 50% risk - excessive
            "entry_price": 50,
            "stop_loss": 48,
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 200  # Should succeed but with warnings
        data = response.json()
        assert len(data["warnings"]) > 0
        assert "limited by account balance" in data["warnings"][0]

    def test_get_methods(self, client: TestClient, auth_headers: dict):
        """Test getting available position sizing methods"""
        response = client.get(
            "/api/position-sizing/methods",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "methods" in data
        assert len(data["methods"]) == 3

        # Check fixed_risk method
        fixed_risk = next(m for m in data["methods"] if m["id"] == "fixed_risk")
        assert fixed_risk["name"] == "Fixed Risk"
        assert "account_value" in fixed_risk["required_fields"]
        assert "target_price" in fixed_risk["optional_fields"]

    def test_validate_position_size(
        self, client: TestClient, auth_headers: dict, test_account: BrokerageAccount
    ):
        """Test position size validation"""
        payload = {
            "symbol": "AAPL",
            "position_size": 1000,
            "entry_price": 150,
            "account_id": test_account.id,
        }

        response = client.post(
            "/api/position-sizing/validate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "violations" in data
        assert "warnings" in data
        assert "max_allowed_size" in data

    def test_validate_oversized_position(
        self, client: TestClient, auth_headers: dict, test_account: BrokerageAccount
    ):
        """Test validation of oversized position"""
        payload = {
            "symbol": "AAPL",
            "position_size": 10000,  # Very large position
            "entry_price": 150,
            "account_id": test_account.id,
        }

        response = client.post(
            "/api/position-sizing/validate",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["violations"]) > 0
        assert "exceeds maximum" in data["violations"][0].lower()

    def test_unauthenticated_access(self, client: TestClient):
        """Test that endpoints require authentication"""
        payload = {
            "method": "fixed_risk",
            "account_value": 100000,
            "risk_percentage": 0.02,
            "entry_price": 50,
            "stop_loss": 48,
        }

        response = client.post(
            "/api/position-sizing/calculate",
            json=payload,
        )

        assert response.status_code == 403

    def test_rate_limiting(self, client: TestClient, auth_headers: dict):
        """Test rate limiting on position sizing endpoints"""
        payload = {
            "method": "fixed_risk",
            "account_value": 100000,
            "risk_percentage": 0.02,
            "entry_price": 50,
            "stop_loss": 48,
        }

        # Make multiple rapid requests - portfolio_rate_limiter is set to 30/minute
        responses = []
        for _ in range(35):  # Exceed the 30 requests per minute limit
            response = client.post(
                "/api/position-sizing/calculate",
                json=payload,
                headers=auth_headers,
            )
            responses.append(response.status_code)

        # At least one should be rate limited
        assert 429 in responses
