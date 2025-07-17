"""Pydantic models for portfolio API input validation"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

from pydantic import BaseModel, Field, validator


class PerformanceMetricsRequest(BaseModel):
    """Request model for performance metrics endpoint"""
    
    timeframe: str = Field(
        default="ytd",
        description="Timeframe for performance calculation",
        pattern="^(daily|weekly|monthly|ytd|all)$"
    )
    benchmark: Optional[str] = Field(
        default=None,
        description="Benchmark symbol (e.g., SPY, QQQ)",
        max_length=10
    )
    
    @validator('timeframe')
    def validate_timeframe(cls, v):
        valid_timeframes = ['daily', 'weekly', 'monthly', 'ytd', 'all']
        if v not in valid_timeframes:
            raise ValueError(f'Timeframe must be one of: {", ".join(valid_timeframes)}')
        return v
    
    @validator('benchmark')
    def validate_benchmark(cls, v):
        if v is not None:
            # Basic validation for stock symbols
            if not v.isalpha() or len(v) > 10:
                raise ValueError('Benchmark must be a valid stock symbol')
            return v.upper()
        return v


class RiskMetricsRequest(BaseModel):
    """Request model for risk metrics endpoint"""
    
    timeframe: str = Field(
        default="ytd",
        description="Timeframe for risk calculations",
        pattern="^(daily|weekly|monthly|ytd|all)$"
    )
    
    @validator('timeframe')
    def validate_timeframe(cls, v):
        valid_timeframes = ['daily', 'weekly', 'monthly', 'ytd', 'all']
        if v not in valid_timeframes:
            raise ValueError(f'Timeframe must be one of: {", ".join(valid_timeframes)}')
        return v


class RebalancingSuggestionsRequest(BaseModel):
    """Request model for rebalancing suggestions endpoint"""
    
    target_allocation: Dict[str, float] = Field(
        ...,
        description="Target allocation percentages by asset class"
    )
    drift_threshold: float = Field(
        default=0.05,
        description="Drift threshold for rebalancing (0.05 = 5%)",
        ge=0.001,
        le=0.5
    )
    
    @validator('target_allocation')
    def validate_target_allocation(cls, v):
        if not v:
            raise ValueError('Target allocation cannot be empty')
        
        # Check that all values are between 0 and 1
        for asset_class, percentage in v.items():
            if not isinstance(percentage, (int, float)) or percentage < 0 or percentage > 1:
                raise ValueError(f'Allocation for {asset_class} must be between 0 and 1')
        
        # Check that total allocation is approximately 1.0 (allowing for small rounding errors)
        total = sum(v.values())
        if abs(total - 1.0) > 0.01:
            raise ValueError('Total allocation must sum to 1.0 (100%)')
        
        return v
    
    @validator('drift_threshold')
    def validate_drift_threshold(cls, v):
        if v <= 0:
            raise ValueError('Drift threshold must be greater than 0')
        if v > 0.5:
            raise ValueError('Drift threshold cannot exceed 0.5 (50%)')
        return v


class StressTestRequest(BaseModel):
    """Request model for stress test endpoint"""
    
    scenarios: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Custom stress test scenarios"
    )
    
    @validator('scenarios')
    def validate_scenarios(cls, v):
        if v is not None:
            if not isinstance(v, list):
                raise ValueError('Scenarios must be a list')
            
            for i, scenario in enumerate(v):
                if not isinstance(scenario, dict):
                    raise ValueError(f'Scenario {i} must be a dictionary')
                
                # Validate required fields
                required_fields = ['name', 'market_shock']
                for field in required_fields:
                    if field not in scenario:
                        raise ValueError(f'Scenario {i} missing required field: {field}')
                
                # Validate market shock percentage
                market_shock = scenario.get('market_shock')
                if not isinstance(market_shock, (int, float)) or market_shock < -1 or market_shock > 1:
                    raise ValueError(f'Market shock in scenario {i} must be between -1 and 1')
        
        return v


class PositionsRequest(BaseModel):
    """Request model for positions endpoint"""
    
    broker: Optional[str] = Field(
        default=None,
        description="Filter by broker",
        max_length=20
    )
    
    @validator('broker')
    def validate_broker(cls, v):
        if v is not None:
            valid_brokers = ['fidelity', 'robinhood', 'coinbase']
            if v.lower() not in valid_brokers:
                raise ValueError(f'Broker must be one of: {", ".join(valid_brokers)}')
            return v.lower()
        return v


class TransactionsRequest(BaseModel):
    """Request model for transactions endpoint"""
    
    days: int = Field(
        default=7,
        description="Number of days to fetch",
        ge=1,
        le=365
    )
    broker: Optional[str] = Field(
        default=None,
        description="Filter by broker",
        max_length=20
    )
    
    @validator('broker')
    def validate_broker(cls, v):
        if v is not None:
            valid_brokers = ['fidelity', 'robinhood', 'coinbase']
            if v.lower() not in valid_brokers:
                raise ValueError(f'Broker must be one of: {", ".join(valid_brokers)}')
            return v.lower()
        return v
    
    @validator('days')
    def validate_days(cls, v):
        if v < 1:
            raise ValueError('Days must be at least 1')
        if v > 365:
            raise ValueError('Days cannot exceed 365')
        return v


class AuthResponse(BaseModel):
    """Response model for authentication endpoints"""
    
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str


class LoginRequest(BaseModel):
    """Request model for login endpoint"""
    
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password", min_length=8)
    
    @validator('email')
    def validate_email(cls, v):
        # Basic email validation
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v.lower()


class UserRegistrationRequest(BaseModel):
    """Request model for user registration"""
    
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password", min_length=8)
    confirm_password: str = Field(..., description="Confirm password")
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v.lower()
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v