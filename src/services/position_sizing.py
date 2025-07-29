"""Position sizing calculation service"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class SizingMethod(str, Enum):
    """Position sizing calculation methods"""

    FIXED_RISK = "fixed_risk"
    KELLY = "kelly"
    VOLATILITY_BASED = "volatility_based"


class ValidationError(Exception):
    """Raised when input validation fails"""

    pass


@dataclass
class PositionSizeResult:
    """Result of position size calculation"""

    position_size: int
    position_value: float
    risk_amount: float
    risk_percentage: float
    stop_loss_percentage: float
    risk_reward_ratio: float | None = None
    kelly_percentage: float | None = None
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    method_used: SizingMethod | None = None


class PositionSizingService:
    """Service for calculating optimal position sizes based on risk parameters"""

    def __init__(self):
        self.max_kelly_percentage = 0.25  # Maximum 25% Kelly to prevent over-leveraging

    def calculate_position_size(
        self,
        method: SizingMethod,
        account_value: float,
        risk_percentage: float | None = None,
        entry_price: float | None = None,
        stop_loss: float | None = None,
        target_price: float | None = None,
        win_rate: float | None = None,
        avg_win_loss_ratio: float | None = None,
        confidence_level: float | None = 1.0,
        atr: float | None = None,
        atr_multiplier: float | None = 2.0,
    ) -> PositionSizeResult:
        """
        Calculate position size based on selected method and parameters

        Args:
            method: Calculation method to use
            account_value: Total account value
            risk_percentage: Risk per trade (e.g., 0.02 for 2%)
            entry_price: Planned entry price
            stop_loss: Stop loss price
            target_price: Target/take profit price
            win_rate: Historical win rate for Kelly
            avg_win_loss_ratio: Average win/loss ratio for Kelly
            confidence_level: Kelly fraction (e.g., 0.25 for quarter Kelly)
            atr: Average True Range for volatility-based sizing
            atr_multiplier: Multiplier for ATR to set stop loss

        Returns:
            PositionSizeResult with calculated values
        """

        if method == SizingMethod.FIXED_RISK:
            return self._calculate_fixed_risk(
                account_value, risk_percentage, entry_price, stop_loss, target_price
            )
        elif method == SizingMethod.KELLY:
            return self._calculate_kelly(
                account_value,
                win_rate,
                avg_win_loss_ratio,
                confidence_level,
                entry_price,
                stop_loss,
            )
        elif method == SizingMethod.VOLATILITY_BASED:
            return self._calculate_volatility_based(
                account_value, risk_percentage, entry_price, atr, atr_multiplier
            )
        else:
            raise ValueError(f"Unknown sizing method: {method}")

    def _calculate_fixed_risk(
        self,
        account_value: float,
        risk_percentage: float,
        entry_price: float,
        stop_loss: float,
        target_price: float | None = None,
    ) -> PositionSizeResult:
        """Calculate position size using fixed risk method"""

        # Validate inputs
        if stop_loss >= entry_price:
            raise ValidationError("Stop loss must be below entry price for long positions")

        # Calculate risk amount
        risk_amount = account_value * risk_percentage

        # Calculate risk per share
        risk_per_share = entry_price - stop_loss

        # Calculate position size
        position_size = int(risk_amount / risk_per_share)

        # Calculate position value
        position_value = position_size * entry_price

        # Check if position size is limited by account balance
        warnings = []
        max_shares_by_balance = int(account_value / entry_price)
        if position_size > max_shares_by_balance:
            position_size = max_shares_by_balance
            position_value = position_size * entry_price
            risk_amount = position_size * risk_per_share
            warnings.append("Position size limited by account balance")

        # Calculate stop loss percentage
        stop_loss_percentage = (entry_price - stop_loss) / entry_price

        # Calculate risk/reward ratio if target price provided
        risk_reward_ratio = None
        if target_price and target_price > entry_price:
            potential_profit = target_price - entry_price
            risk_reward_ratio = potential_profit / risk_per_share

        metadata = {
            "method_used": SizingMethod.FIXED_RISK,
            "calculations": {
                "risk_per_share": risk_per_share,
                "max_shares_by_balance": max_shares_by_balance,
            },
        }

        return PositionSizeResult(
            position_size=position_size,
            position_value=position_value,
            risk_amount=risk_amount,
            risk_percentage=risk_percentage,
            stop_loss_percentage=stop_loss_percentage,
            risk_reward_ratio=risk_reward_ratio,
            warnings=warnings,
            metadata=metadata,
            method_used=SizingMethod.FIXED_RISK,
        )

    def _calculate_kelly(
        self,
        account_value: float,
        win_rate: float,
        avg_win_loss_ratio: float,
        confidence_level: float = 1.0,
        entry_price: float | None = None,
        stop_loss: float | None = None,
    ) -> PositionSizeResult:
        """Calculate position size using Kelly criterion"""

        # Validate inputs
        if win_rate < 0 or win_rate > 1:
            raise ValidationError("Win rate must be between 0 and 1")

        # Kelly formula: f = (p * b - q) / b
        # where f = fraction of capital to risk
        # p = probability of winning
        # q = probability of losing (1 - p)
        # b = ratio of win to loss

        p = win_rate
        q = 1 - win_rate
        b = avg_win_loss_ratio

        kelly_percentage = (p * b - q) / b

        # Apply confidence level (fractional Kelly)
        kelly_percentage *= confidence_level

        # Handle negative Kelly (negative expectancy)
        warnings = []
        if kelly_percentage < 0:
            kelly_percentage = 0
            warnings.append("Negative Kelly percentage indicates negative expectancy")

        # Limit maximum Kelly percentage
        if kelly_percentage > self.max_kelly_percentage:
            kelly_percentage = self.max_kelly_percentage
            warnings.append(f"Kelly percentage limited to {self.max_kelly_percentage * 100}%")

        # Calculate position value
        position_value = account_value * kelly_percentage

        # Calculate position size if entry price provided
        position_size = 0
        if entry_price and entry_price > 0:
            position_size = int(position_value / entry_price)
            position_value = position_size * entry_price  # Recalculate based on whole shares

        # Calculate stop loss percentage if provided
        stop_loss_percentage = 0.0
        if entry_price and stop_loss and stop_loss < entry_price:
            stop_loss_percentage = (entry_price - stop_loss) / entry_price

        metadata = {
            "method_used": SizingMethod.KELLY,
            "calculations": {
                "win_probability": p,
                "loss_probability": q,
                "win_loss_ratio": b,
                "raw_kelly": (p * b - q) / b,
                "confidence_level": confidence_level,
            },
        }

        return PositionSizeResult(
            position_size=position_size,
            position_value=position_value,
            risk_amount=position_value,  # In Kelly, the position value is the risk
            risk_percentage=kelly_percentage,
            stop_loss_percentage=stop_loss_percentage,
            kelly_percentage=kelly_percentage,
            warnings=warnings,
            metadata=metadata,
            method_used=SizingMethod.KELLY,
        )

    def _calculate_volatility_based(
        self,
        account_value: float,
        risk_percentage: float,
        entry_price: float,
        atr: float,
        atr_multiplier: float = 2.0,
    ) -> PositionSizeResult:
        """Calculate position size based on volatility (ATR)"""

        # Calculate stop loss based on ATR
        stop_distance = atr * atr_multiplier
        stop_loss = entry_price - stop_distance

        # Use fixed risk calculation with ATR-based stop
        result = self._calculate_fixed_risk(account_value, risk_percentage, entry_price, stop_loss)

        # Update metadata to reflect volatility-based method
        result.metadata["method_used"] = "volatility_based"
        result.metadata["atr"] = atr
        result.metadata["atr_multiplier"] = atr_multiplier

        return result

    def get_available_methods(self) -> list[dict[str, Any]]:
        """Get list of available position sizing methods with their requirements"""

        return [
            {
                "id": SizingMethod.FIXED_RISK,
                "name": "Fixed Risk",
                "description": "Size positions based on fixed risk amount",
                "required_fields": ["account_value", "risk_percentage", "entry_price", "stop_loss"],
                "optional_fields": ["target_price"],
            },
            {
                "id": SizingMethod.KELLY,
                "name": "Kelly Criterion",
                "description": "Optimize size based on edge and win rate",
                "required_fields": ["account_value", "win_rate", "avg_win_loss_ratio"],
                "optional_fields": ["confidence_level", "entry_price", "stop_loss"],
            },
            {
                "id": SizingMethod.VOLATILITY_BASED,
                "name": "Volatility-Based",
                "description": "Size positions based on volatility (ATR)",
                "required_fields": ["account_value", "risk_percentage", "entry_price", "atr"],
                "optional_fields": ["atr_multiplier"],
            },
        ]

    def validate_position_size(
        self,
        symbol: str,  # noqa: ARG002
        position_size: int,
        entry_price: float,
        account_id: int,  # noqa: ARG002
        account_value: float,
        max_position_pct: float = 0.25,
        existing_positions: dict[str, float] | None = None,  # noqa: ARG002
    ) -> dict[str, Any]:
        """
        Validate position size against portfolio rules and constraints

        Args:
            symbol: Asset symbol
            position_size: Proposed position size
            entry_price: Entry price
            account_id: Trading account ID
            account_value: Current account value
            max_position_pct: Maximum percentage per position
            existing_positions: Dict of symbol to position value

        Returns:
            Dict with validation results
        """

        position_value = position_size * entry_price
        position_pct = position_value / account_value

        violations = []
        warnings = []

        # Check maximum position percentage
        if position_pct > max_position_pct:
            violations.append(
                f"Exceeds maximum position percentage: {position_pct:.1%} > {max_position_pct:.1%}"
            )

        # Warning for large positions
        if position_pct > 0.15 and position_pct <= max_position_pct:
            warnings.append(f"Position represents {position_pct:.0%} of portfolio")

        # Calculate maximum allowed size
        max_allowed_value = account_value * max_position_pct
        max_allowed_size = int(max_allowed_value / entry_price)

        # Adjust size if needed
        adjusted_size = min(position_size, max_allowed_size)

        return {
            "valid": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "adjusted_size": adjusted_size,
            "max_allowed_size": max_allowed_size,
        }
