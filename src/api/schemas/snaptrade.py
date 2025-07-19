"""SnapTrade API request/response schemas"""

from datetime import date, datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class SnapTradeUserRegistrationRequest(BaseModel):
    """SnapTrade user registration request"""

    # No additional fields needed - user_id comes from JWT token


class SnapTradeUserRegistrationResponse(BaseModel):
    """SnapTrade user registration response"""

    user_secret: str = Field(..., description="SnapTrade user secret")
    status: str = Field(..., description="Registration status")


class ConnectionURLRequest(BaseModel):
    """Connection URL generation request"""

    connection_type: str = Field(
        default="read",
        description="Connection type: 'read' for read-only, 'trade' for trading access",
    )


class ConnectionURLResponse(BaseModel):
    """Connection URL response"""

    connection_url: str = Field(..., description="SnapTrade connection portal URL")
    expires_at: Optional[datetime] = Field(None, description="URL expiration time")


class SnapTradeAccount(BaseModel):
    """SnapTrade account information"""

    id: str = Field(..., description="Account ID")
    name: str = Field(..., description="Account name")
    number: Optional[str] = Field(None, description="Account number")
    institution_name: str = Field(..., description="Institution name")
    sync_status: str = Field(..., description="Account sync status")
    balance: Optional[float] = Field(None, description="Account balance")


class AccountsResponse(BaseModel):
    """List of connected accounts response"""

    accounts: List[SnapTradeAccount] = Field(..., description="List of connected accounts")


class SnapTradePosition(BaseModel):
    """SnapTrade position information"""

    symbol: Optional[str] = Field(None, description="Security symbol")
    description: Optional[str] = Field(None, description="Security description")
    quantity: float = Field(..., description="Position quantity")
    average_purchase_price: float = Field(..., description="Average purchase price")
    last_ask_price: float = Field(..., description="Last ask price")
    market_value: float = Field(..., description="Current market value")
    currency: str = Field(default="USD", description="Currency code")


class PositionsResponse(BaseModel):
    """Account positions response"""

    positions: List[SnapTradePosition] = Field(..., description="List of positions")


class SnapTradeBalance(BaseModel):
    """SnapTrade balance information"""

    currency: str = Field(..., description="Currency code")
    cash: float = Field(..., description="Cash balance")
    buying_power: float = Field(..., description="Buying power")


class BalancesResponse(BaseModel):
    """Account balances response"""

    balances: Dict[str, float] = Field(..., description="Balance information by currency")


class TransactionsRequest(BaseModel):
    """Transaction history request parameters"""

    start_date: Optional[date] = Field(None, description="Start date for transaction history")
    end_date: Optional[date] = Field(None, description="End date for transaction history")
    accounts: Optional[str] = Field(None, description="Comma-separated account IDs")


class SnapTradeTransaction(BaseModel):
    """SnapTrade transaction information"""

    id: Optional[str] = Field(None, description="Transaction ID")
    account_id: Optional[str] = Field(None, description="Account ID")
    symbol: Optional[str] = Field(None, description="Security symbol")
    type: Optional[str] = Field(None, description="Transaction type")
    description: Optional[str] = Field(None, description="Transaction description")
    quantity: float = Field(..., description="Transaction quantity")
    price: float = Field(..., description="Transaction price")
    currency: str = Field(default="USD", description="Currency code")
    trade_date: Optional[str] = Field(None, description="Trade date")
    settlement_date: Optional[str] = Field(None, description="Settlement date")


class TransactionsResponse(BaseModel):
    """Transaction history response"""

    transactions: List[SnapTradeTransaction] = Field(..., description="List of transactions")


class SyncRequest(BaseModel):
    """Data sync request"""

    force: bool = Field(default=False, description="Force sync even if recently synced")


class SyncResponse(BaseModel):
    """Data sync response"""

    status: str = Field(..., description="Sync status")
    message: str = Field(..., description="Sync message")
    synced_at: datetime = Field(..., description="Sync timestamp")


class UserDeletionResponse(BaseModel):
    """User deletion response"""

    status: str = Field(..., description="Deletion status")
    message: str = Field(..., description="Deletion message")


class ErrorResponse(BaseModel):
    """Error response schema"""

    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
