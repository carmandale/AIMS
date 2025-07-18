"""Portfolio API request/response schemas"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """User login request"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password", min_length=8)


class UserRegistrationRequest(BaseModel):
    """User registration request"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password", min_length=8)


class AuthResponse(BaseModel):
    """Authentication response"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user_id: str = Field(..., description="User identifier")


class PerformanceMetricsRequest(BaseModel):
    """Performance metrics request parameters"""
    timeframe: str = Field(default="1M", description="Time period (1D, 1W, 1M, 3M, 6M, 1Y)")
    benchmark: Optional[str] = Field(default="SPY", description="Benchmark symbol for comparison")


class RiskMetricsRequest(BaseModel):
    """Risk metrics request parameters"""
    timeframe: str = Field(default="1M", description="Time period for risk calculation")


class RebalancingSuggestionsRequest(BaseModel):
    """Rebalancing suggestions request"""
    target_allocation: Dict[str, float] = Field(..., description="Target allocation percentages")
    drift_threshold: float = Field(default=0.05, description="Drift threshold for rebalancing")


class StressTestRequest(BaseModel):
    """Stress test request parameters"""
    scenarios: List[Dict[str, Any]] = Field(..., description="Stress test scenarios")


class PositionsRequest(BaseModel):
    """Positions request parameters"""
    broker: Optional[str] = Field(default=None, description="Filter by specific broker")


class TransactionsRequest(BaseModel):
    """Transactions request parameters"""
    days: int = Field(default=30, description="Number of days to look back")
    broker: Optional[str] = Field(default=None, description="Filter by specific broker")

