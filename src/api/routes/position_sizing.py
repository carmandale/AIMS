"""Position sizing API endpoints"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from src.api.auth import CurrentUser, get_current_user, portfolio_rate_limiter
from src.db import get_db
from src.db.models import BrokerageAccount
from src.services.position_sizing import PositionSizingService, SizingMethod, ValidationError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/position-sizing", tags=["position-sizing"])


def check_portfolio_rate_limit(current_user: CurrentUser = Depends(get_current_user)):
    """Check rate limit for portfolio endpoints"""
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)


class CalculatePositionRequest(BaseModel):
    """Request model for position size calculation"""

    method: SizingMethod
    account_value: float = Field(..., gt=0, description="Total account value")
    risk_percentage: float | None = Field(
        None, ge=0, le=1, description="Risk per trade (0.01 = 1%)"
    )
    entry_price: float | None = Field(None, gt=0, description="Planned entry price")
    stop_loss: float | None = Field(None, gt=0, description="Stop loss price")
    target_price: float | None = Field(None, gt=0, description="Target/take profit price")
    win_rate: float | None = Field(None, ge=0, le=1, description="Historical win rate")
    avg_win_loss_ratio: float | None = Field(None, gt=0, description="Average win/loss ratio")
    confidence_level: float | None = Field(default=1.0, gt=0, le=1, description="Kelly fraction")
    atr: float | None = Field(None, gt=0, description="Average True Range")
    atr_multiplier: float | None = Field(default=2.0, gt=0, description="ATR multiplier for stop")

    @validator("risk_percentage")
    def validate_risk_percentage(cls, v):
        if v and v > 0.1:  # Warn if risk > 10%
            logger.warning(f"High risk percentage specified: {v:.1%}")
        return v

    @validator("method")
    def validate_method(cls, v):
        if v not in [SizingMethod.FIXED_RISK, SizingMethod.KELLY, SizingMethod.VOLATILITY_BASED]:
            raise ValueError(f"Invalid sizing method: {v}")
        return v

    class Config:
        schema_extra = {
            "example": {
                "method": "fixed_risk",
                "account_value": 100000,
                "risk_percentage": 0.02,
                "entry_price": 50,
                "stop_loss": 48,
                "target_price": 56,
            }
        }


class PositionSizeResponse(BaseModel):
    """Response model for position size calculation"""

    position_size: int
    position_value: float
    risk_amount: float
    risk_percentage: float
    stop_loss_percentage: float
    risk_reward_ratio: float | None = None
    kelly_percentage: float | None = None
    warnings: list[str] = []
    metadata: dict[str, Any] = {}


class ValidatePositionRequest(BaseModel):
    """Request model for position validation"""

    symbol: str = Field(..., min_length=1, description="Asset symbol")
    position_size: int = Field(..., gt=0, description="Proposed position size")
    entry_price: float = Field(..., gt=0, description="Entry price")
    account_id: int = Field(..., description="Trading account ID")


class ValidatePositionResponse(BaseModel):
    """Response model for position validation"""

    valid: bool
    violations: list[str] = []
    warnings: list[str] = []
    adjusted_size: int
    max_allowed_size: int


class MethodInfo(BaseModel):
    """Information about a position sizing method"""

    id: str
    name: str
    description: str
    required_fields: list[str]
    optional_fields: list[str]


@router.post(
    "/calculate",
    response_model=PositionSizeResponse,
    dependencies=[Depends(check_portfolio_rate_limit)],
)
async def calculate_position_size(
    request: CalculatePositionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),  # noqa: ARG001
) -> PositionSizeResponse:
    """Calculate position size based on selected method and parameters"""
    try:
        service = PositionSizingService()

        # Validate required fields based on method
        if request.method == SizingMethod.FIXED_RISK:
            if not all([request.risk_percentage, request.entry_price, request.stop_loss]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Fixed risk method requires: risk_percentage, entry_price, stop_loss",
                )
        elif request.method == SizingMethod.KELLY:
            if request.win_rate is None or request.avg_win_loss_ratio is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Kelly method requires: win_rate, avg_win_loss_ratio",
                )
        elif request.method == SizingMethod.VOLATILITY_BASED and not all(
            [request.risk_percentage, request.entry_price, request.atr]
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Volatility method requires: risk_percentage, entry_price, atr",
            )

        # Calculate position size
        result = service.calculate_position_size(
            method=request.method,
            account_value=request.account_value,
            risk_percentage=request.risk_percentage,
            entry_price=request.entry_price,
            stop_loss=request.stop_loss,
            target_price=request.target_price,
            win_rate=request.win_rate,
            avg_win_loss_ratio=request.avg_win_loss_ratio,
            confidence_level=request.confidence_level,
            atr=request.atr,
            atr_multiplier=request.atr_multiplier,
        )

        # Log calculation for analytics
        logger.info(
            f"Position size calculated for user {current_user.user_id}: "
            f"method={request.method}, size={result.position_size}, "
            f"value=${result.position_value:,.2f}"
        )

        return PositionSizeResponse(
            position_size=result.position_size,
            position_value=result.position_value,
            risk_amount=result.risk_amount,
            risk_percentage=result.risk_percentage,
            stop_loss_percentage=result.stop_loss_percentage,
            risk_reward_ratio=result.risk_reward_ratio,
            kelly_percentage=result.kelly_percentage,
            warnings=result.warnings,
            metadata=result.metadata,
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except HTTPException:
        # Re-raise HTTPExceptions (like 422 validation errors)
        raise
    except Exception as e:
        logger.error(f"Error calculating position size: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating position size",
        ) from e


@router.get(
    "/methods",
    response_model=dict[str, list[MethodInfo]],
    dependencies=[Depends(check_portfolio_rate_limit)],
)
async def get_position_sizing_methods(
    current_user: CurrentUser = Depends(get_current_user),  # noqa: ARG001
) -> dict[str, list[MethodInfo]]:
    """Get available position sizing methods and their requirements"""
    service = PositionSizingService()
    methods = service.get_available_methods()

    return {
        "methods": [
            MethodInfo(
                id=method["id"],
                name=method["name"],
                description=method["description"],
                required_fields=method["required_fields"],
                optional_fields=method["optional_fields"],
            )
            for method in methods
        ]
    }


@router.post(
    "/validate",
    response_model=ValidatePositionResponse,
    dependencies=[Depends(check_portfolio_rate_limit)],
)
async def validate_position_size(
    request: ValidatePositionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ValidatePositionResponse:
    """Validate position size against portfolio rules and constraints"""
    try:
        # Get account value from database
        account = (
            db.query(BrokerageAccount)
            .filter(
                BrokerageAccount.id == request.account_id,
                BrokerageAccount.user_id == current_user.user_id,
            )
            .first()
        )

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found",
            )

        # Get account value from most recent performance snapshot
        from sqlalchemy import desc

        from src.db.models import PerformanceSnapshot

        latest_snapshot = (
            db.query(PerformanceSnapshot)
            .filter(PerformanceSnapshot.user_id == current_user.user_id)
            .order_by(desc(PerformanceSnapshot.snapshot_date))
            .first()
        )

        # Use snapshot value or default
        account_value = float(latest_snapshot.total_value) if latest_snapshot else 100000.0

        service = PositionSizingService()
        result = service.validate_position_size(
            symbol=request.symbol,
            position_size=request.position_size,
            entry_price=request.entry_price,
            account_id=request.account_id,
            account_value=account_value,
        )

        # Log validation result
        logger.info(
            f"Position validation for user {current_user.user_id}: "
            f"symbol={request.symbol}, valid={result['valid']}"
        )

        return ValidatePositionResponse(
            valid=result["valid"],
            violations=result["violations"],
            warnings=result["warnings"],
            adjusted_size=result["adjusted_size"],
            max_allowed_size=result["max_allowed_size"],
        )

    except Exception as e:
        logger.error(f"Error validating position size: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating position size",
        ) from e
