"""Market data models"""
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, Field


class Quote(BaseModel):
    """Real-time market quote"""
    symbol: str
    price: Decimal = Field(decimal_places=2)
    change: Decimal = Field(decimal_places=2)
    change_percent: float
    volume: int
    bid: Optional[Decimal] = Field(default=None, decimal_places=2)
    ask: Optional[Decimal] = Field(default=None, decimal_places=2)
    high: Optional[Decimal] = Field(default=None, decimal_places=2)
    low: Optional[Decimal] = Field(default=None, decimal_places=2)
    open: Optional[Decimal] = Field(default=None, decimal_places=2)
    previous_close: Optional[Decimal] = Field(default=None, decimal_places=2)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MarketData(BaseModel):
    """Market data container"""
    quotes: Dict[str, Quote]
    indices: Dict[str, Quote]  # SPY, QQQ, etc
    crypto: Dict[str, Quote]   # BTC-USD, ETH-USD, etc
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VolatilityAlert(BaseModel):
    """Volatility alert for positions"""
    symbol: str
    current_price: Decimal = Field(decimal_places=2)
    change_percent: float
    threshold_exceeded: float  # e.g., 2.0 for 2%
    alert_type: str  # "gain", "loss", "volatility"
    message: str
    severity: str = "medium"  # low, medium, high
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class KeyPosition(BaseModel):
    """Key position for morning brief"""
    symbol: str
    broker: str
    market_value: Decimal = Field(decimal_places=2)
    unrealized_pnl: Decimal = Field(decimal_places=2)
    unrealized_pnl_percent: float
    overnight_change: Decimal = Field(decimal_places=2)
    overnight_change_percent: float


class MorningBrief(BaseModel):
    """Morning brief data"""
    date: datetime
    portfolio_value: Decimal = Field(decimal_places=2)
    overnight_pnl: Decimal = Field(decimal_places=2)
    overnight_pnl_percent: float
    cash_available: Decimal = Field(decimal_places=2)
    volatility_alerts: List[VolatilityAlert]
    key_positions: List[KeyPosition]  # Top 5 by value
    market_summary: Dict[str, Any]
    recommendations: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def has_alerts(self) -> bool:
        """Check if there are any volatility alerts"""
        return len(self.volatility_alerts) > 0
    
    @property
    def alert_count(self) -> Dict[str, int]:
        """Count alerts by severity"""
        counts = {"low": 0, "medium": 0, "high": 0}
        for alert in self.volatility_alerts:
            counts[alert.severity] += 1
        return counts