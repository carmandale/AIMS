from typing import Dict, Any

"""Portfolio data models"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, Any, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class BrokerType(str, Enum):
    """Supported broker types"""

    FIDELITY = "fidelity"
    ROBINHOOD = "robinhood"
    COINBASE = "coinbase"
    SNAPTRADE = "snaptrade"


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


class BrokerageAccount(BaseModel):
    """Brokerage account model"""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    user_id: str
    brokerage_type: BrokerType
    account_number: str
    account_name: str
    account_type: str
    is_active: bool = True
    last_synced: Optional[datetime] = None
    sync_status: str = "pending"
    connection_status: str = "disconnected"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaxLot(BaseModel):
    """Tax lot model"""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    position_id: int
    quantity: Decimal = Field(decimal_places=8)
    cost_basis: Decimal = Field(decimal_places=2)
    acquisition_date: datetime
    is_long_term: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PerformanceMetrics(BaseModel):
    """Performance metrics model"""

    timeframe: str  # daily, weekly, monthly, ytd, all
    start_date: datetime
    end_date: datetime
    starting_value: Decimal = Field(decimal_places=2)
    ending_value: Decimal = Field(decimal_places=2)
    absolute_change: Decimal = Field(decimal_places=2)
    percent_change: float
    annualized_return: Optional[float] = None
    volatility: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    benchmark_comparison: Optional[Dict[str, float]] = None
    periodic_returns: Dict[str, float] = Field(default_factory=dict)


class RiskMetrics(BaseModel):
    """Risk metrics model"""

    volatility: float
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    max_drawdown: float
    max_drawdown_start: Optional[datetime] = None
    max_drawdown_end: Optional[datetime] = None
    beta: Optional[float] = None
    alpha: Optional[float] = None
    r_squared: Optional[float] = None
    var_95: Optional[float] = None  # Value at Risk (95% confidence)
    var_99: Optional[float] = None  # Value at Risk (99% confidence)


class AssetAllocation(BaseModel):
    """Asset allocation model"""

    by_asset_class: Dict[str, float]
    by_sector: Dict[str, float]
    by_geography: Dict[str, float]
    by_brokerage: Dict[str, float]
    concentration_risks: List[Dict[str, Any]] = Field(default_factory=list)
    diversification_score: Optional[float] = None
    largest_position_percent: Optional[float] = None
    top_5_positions_percent: Optional[float] = None


class ConcentrationRisk(BaseModel):
    """Concentration risk model"""

    type: str  # "position", "sector", "geography"
    identifier: str  # symbol, sector name, country
    percentage: float
    threshold: float
    severity: str  # "low", "medium", "high"
    recommendation: str


class RebalancingAction(BaseModel):
    """Rebalancing action model"""

    action_type: str  # "buy", "sell", "rebalance"
    symbol: str
    current_allocation: float
    target_allocation: float
    drift: float
    suggested_amount: Decimal = Field(decimal_places=2)
    priority: str  # "high", "medium", "low"
    reason: str


class Report(BaseModel):
    """Report model"""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    user_id: str
    report_type: str
    title: str
    parameters: Dict[str, Any]
    file_format: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    status: str = "generating"
    error_message: Optional[str] = None
    generated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    downloaded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SyncResult(BaseModel):
    """Sync operation result"""

    account_id: int
    sync_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    records_processed: int = 0
    records_updated: int = 0
    records_failed: int = 0
    duration_seconds: Optional[float] = None
