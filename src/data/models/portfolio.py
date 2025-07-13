"""Portfolio data models"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


class BrokerType(str, Enum):
    """Supported broker types"""
    FIDELITY = "fidelity"
    ROBINHOOD = "robinhood"
    COINBASE = "coinbase"


class TransactionType(str, Enum):
    """Transaction types"""
    BUY = "buy"
    SELL = "sell"
    DIVIDEND = "dividend"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    FEE = "fee"


class Position(BaseModel):
    """Individual position in portfolio"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    broker: BrokerType
    symbol: str
    quantity: Decimal = Field(decimal_places=8)
    cost_basis: Decimal = Field(decimal_places=2)
    current_price: Decimal = Field(decimal_places=2)
    market_value: Optional[Decimal] = Field(default=None, decimal_places=2)
    unrealized_pnl: Optional[Decimal] = Field(default=None, decimal_places=2)
    unrealized_pnl_percent: Optional[float] = None
    position_type: str = "stock"  # stock, option, crypto
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def calculate_metrics(self) -> None:
        """Calculate derived metrics"""
        self.market_value = self.quantity * self.current_price
        self.unrealized_pnl = self.market_value - (self.quantity * self.cost_basis)
        if self.cost_basis > 0:
            self.unrealized_pnl_percent = float(
                (self.unrealized_pnl / (self.quantity * self.cost_basis)) * 100
            )


class Balance(BaseModel):
    """Account balance for a broker"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    broker: BrokerType
    cash: Decimal = Field(default=Decimal("0"), decimal_places=2)
    margin: Decimal = Field(default=Decimal("0"), decimal_places=2)
    crypto: Decimal = Field(default=Decimal("0"), decimal_places=8)
    total_value: Optional[Decimal] = Field(default=None, decimal_places=2)
    buying_power: Optional[Decimal] = Field(default=None, decimal_places=2)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def calculate_total(self) -> None:
        """Calculate total balance"""
        self.total_value = self.cash + self.margin + self.crypto
        self.buying_power = self.cash + (self.margin * Decimal("2"))  # 2x margin


class Transaction(BaseModel):
    """Transaction record"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    broker: BrokerType
    type: TransactionType
    symbol: Optional[str] = None
    quantity: Optional[Decimal] = Field(default=None, decimal_places=8)
    price: Optional[Decimal] = Field(default=None, decimal_places=2)
    amount: Decimal = Field(decimal_places=2)
    fees: Decimal = Field(default=Decimal("0"), decimal_places=2)
    timestamp: datetime
    description: Optional[str] = None


class PortfolioSummary(BaseModel):
    """Overall portfolio summary"""
    total_value: Decimal = Field(decimal_places=2)
    cash_buffer: Decimal = Field(decimal_places=2)
    total_positions_value: Decimal = Field(decimal_places=2)
    total_cash: Decimal = Field(decimal_places=2)
    daily_pnl: Decimal = Field(decimal_places=2)
    daily_pnl_percent: float
    weekly_pnl: Decimal = Field(decimal_places=2)
    weekly_pnl_percent: float
    positions: List[Position]
    balances: List[Balance]
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def cash_buffer_percent(self) -> float:
        """Calculate cash buffer as percentage of total"""
        if self.total_value > 0:
            return float((self.cash_buffer / self.total_value) * 100)
        return 0.0