"""Tests for position sizing service"""

import pytest

from src.services.position_sizing import (
    PositionSizingService,
    SizingMethod,
    ValidationError,
)


class TestPositionSizingService:
    """Test suite for PositionSizingService"""

    @pytest.fixture
    def service(self):
        """Create a position sizing service instance"""
        return PositionSizingService()

    @pytest.fixture
    def base_params(self):
        """Base parameters for position sizing calculations"""
        return {
            "account_value": 100000.0,
            "risk_percentage": 0.02,  # 2% risk
            "entry_price": 50.0,
            "stop_loss": 48.0,
        }

    def test_fixed_risk_calculation(self, service, base_params):
        """Test fixed risk position sizing calculation"""
        params = {**base_params, "method": SizingMethod.FIXED_RISK}

        result = service.calculate_position_size(**params)

        assert result.position_size == 1000  # (100000 * 0.02) / (50 - 48) = 1000
        assert result.position_value == 50000.0  # 1000 * 50
        assert result.risk_amount == 2000.0  # 100000 * 0.02
        assert result.risk_percentage == 0.02
        assert result.stop_loss_percentage == 0.04  # (50 - 48) / 50
        assert result.method_used == SizingMethod.FIXED_RISK

    def test_fixed_risk_with_target_price(self, service, base_params):
        """Test fixed risk calculation with target price for risk/reward ratio"""
        params = {**base_params, "method": SizingMethod.FIXED_RISK, "target_price": 56.0}

        result = service.calculate_position_size(**params)

        assert result.position_size == 1000
        assert result.risk_reward_ratio == 3.0  # (56 - 50) / (50 - 48) = 3.0

    def test_kelly_criterion_calculation(self, service):
        """Test Kelly criterion position sizing calculation"""
        params = {
            "account_value": 100000.0,
            "win_rate": 0.6,  # 60% win rate
            "avg_win_loss_ratio": 2.0,  # Average win is 2x average loss
            "method": SizingMethod.KELLY,
            "confidence_level": 0.25,  # Quarter Kelly
        }

        result = service.calculate_position_size(**params)

        # Kelly percentage = (p * b - q) / b where p=0.6, q=0.4, b=2.0
        # Full Kelly = (0.6 * 2 - 0.4) / 2 = 0.8 / 2 = 0.4 (40%)
        # Quarter Kelly = 0.4 * 0.25 = 0.1 (10%)
        assert result.kelly_percentage == pytest.approx(0.1, rel=1e-9)
        assert result.position_value == pytest.approx(10000.0, rel=1e-9)  # 100000 * 0.1
        assert result.method_used == SizingMethod.KELLY

    def test_kelly_with_entry_and_stop(self, service):
        """Test Kelly criterion with entry and stop loss prices"""
        params = {
            "account_value": 100000.0,
            "win_rate": 0.6,
            "avg_win_loss_ratio": 2.0,
            "method": SizingMethod.KELLY,
            "confidence_level": 0.5,  # Half Kelly
            "entry_price": 50.0,
            "stop_loss": 45.0,
        }

        result = service.calculate_position_size(**params)

        # Half Kelly = 0.4 * 0.5 = 0.2 (20%)
        assert result.kelly_percentage == pytest.approx(0.2, rel=1e-9)
        assert result.position_value == pytest.approx(20000.0, rel=1e-9)
        assert result.position_size == 400  # 20000 / 50

    def test_volatility_based_sizing(self, service):
        """Test volatility-based position sizing"""
        params = {
            "account_value": 100000.0,
            "entry_price": 50.0,
            "atr": 2.5,  # Average True Range
            "atr_multiplier": 2.0,  # Stop at 2x ATR
            "method": SizingMethod.VOLATILITY_BASED,
            "risk_percentage": 0.02,
        }

        result = service.calculate_position_size(**params)

        # Stop loss = 50 - (2.5 * 2) = 45
        # Position size = (100000 * 0.02) / 5 = 400
        assert result.position_size == 400
        assert result.stop_loss_percentage == 0.1  # 5 / 50

    def test_position_size_limited_by_account_balance(self, service, base_params):
        """Test position size is limited by available account balance"""
        params = {
            **base_params,
            "account_value": 10000.0,  # Small account
            "risk_percentage": 0.5,  # 50% risk (unrealistic)
            "method": SizingMethod.FIXED_RISK,
        }

        result = service.calculate_position_size(**params)

        # Without limit: (10000 * 0.5) / 2 = 2500 shares = $125,000
        # With limit: 10000 / 50 = 200 shares max
        assert result.position_size == 200
        assert result.position_value == 10000.0
        assert "Position size limited by account balance" in result.warnings

    def test_invalid_stop_loss_for_long_position(self, service, base_params):
        """Test validation error when stop loss is above entry for long position"""
        params = {
            **base_params,
            "stop_loss": 52.0,  # Above entry price
            "method": SizingMethod.FIXED_RISK,
        }

        with pytest.raises(ValidationError, match="Stop loss must be below entry price"):
            service.calculate_position_size(**params)

    def test_invalid_win_rate_for_kelly(self, service):
        """Test validation error for invalid win rate in Kelly criterion"""
        params = {
            "account_value": 100000.0,
            "win_rate": 1.5,  # Invalid: > 1.0
            "avg_win_loss_ratio": 2.0,
            "method": SizingMethod.KELLY,
        }

        with pytest.raises(ValidationError, match="Win rate must be between 0 and 1"):
            service.calculate_position_size(**params)

    def test_negative_kelly_percentage(self, service):
        """Test Kelly criterion with negative expectancy"""
        params = {
            "account_value": 100000.0,
            "win_rate": 0.3,  # Low win rate
            "avg_win_loss_ratio": 1.5,  # Not enough to overcome low win rate
            "method": SizingMethod.KELLY,
        }

        result = service.calculate_position_size(**params)

        # Kelly = (0.3 * 1.5 - 0.7) / 1.5 = -0.25 / 1.5 = -0.167
        # Should return 0 position size with warning
        assert result.position_size == 0
        assert result.kelly_percentage == 0
        assert "Negative Kelly percentage" in result.warnings[0]

    def test_get_available_methods(self, service):
        """Test getting available position sizing methods"""
        methods = service.get_available_methods()

        assert len(methods) == 3
        assert any(m["id"] == SizingMethod.FIXED_RISK for m in methods)
        assert any(m["id"] == SizingMethod.KELLY for m in methods)
        assert any(m["id"] == SizingMethod.VOLATILITY_BASED for m in methods)

        # Check method structure
        fixed_risk = next(m for m in methods if m["id"] == SizingMethod.FIXED_RISK)
        assert "required_fields" in fixed_risk
        assert "optional_fields" in fixed_risk
        assert "description" in fixed_risk

    def test_validate_position_size(self, service):
        """Test position size validation against portfolio rules"""
        validation_params = {
            "symbol": "AAPL",
            "position_size": 1000,
            "entry_price": 150.0,
            "account_id": 1,
            "account_value": 100000.0,
            "max_position_pct": 0.25,  # 25% max per position
        }

        result = service.validate_position_size(**validation_params)

        # Position value = 1000 * 150 = 150,000 (150% of account)
        assert not result["valid"]
        assert "Exceeds maximum position percentage" in result["violations"][0]
        assert result["max_allowed_size"] == 166  # 25,000 / 150

    def test_precision_handling(self, service, base_params):
        """Test proper handling of decimal precision"""
        params = {
            **base_params,
            "account_value": 10000.0,
            "risk_percentage": 0.015,  # 1.5%
            "entry_price": 33.33,
            "stop_loss": 32.50,
            "method": SizingMethod.FIXED_RISK,
        }

        result = service.calculate_position_size(**params)

        # (10000 * 0.015) / (33.33 - 32.50) = 150 / 0.83 = 180.72
        assert result.position_size == 180  # Rounded down
        assert result.position_value == pytest.approx(5999.4, rel=0.01)

    def test_metadata_in_result(self, service, base_params):
        """Test that result includes calculation metadata"""
        params = {**base_params, "method": SizingMethod.FIXED_RISK}

        result = service.calculate_position_size(**params)

        assert result.metadata is not None
        assert result.metadata["method_used"] == SizingMethod.FIXED_RISK
        assert "calculations" in result.metadata
        assert "risk_per_share" in result.metadata["calculations"]
