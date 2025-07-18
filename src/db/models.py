"""SQLAlchemy database models"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING, List, Any

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Numeric,
    Text,
    JSON,
    Date,
    Index,
    Enum as SQLEnum,
    Boolean,
    ForeignKey,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.data.models import BrokerType, TransactionType

# Create base class for SQLAlchemy models
Base = declarative_base()


class User(Base):  # type: ignore
    """User database model"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)

    # Relationships
    brokerage_accounts = relationship("BrokerageAccount", back_populates="user")  # type: ignore
    snaptrade_user = relationship("SnapTradeUser", back_populates="user", uselist=False)  # type: ignore


class SnapTradeUser(Base):  # type: ignore
    """SnapTrade user integration data"""

    __tablename__ = "snaptrade_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        String(100), ForeignKey("users.user_id"), unique=True, nullable=False, index=True
    )
    snaptrade_user_secret = Column(String(255), nullable=False)  # Encrypted SnapTrade user secret
    registration_date = Column(DateTime, server_default=func.now())
    last_sync = Column(DateTime, nullable=True)
    sync_status = Column(String(20), default="registered")  # registered, connected, synced, error
    connection_count = Column(Integer, default=0)  # Number of connected brokerage accounts
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="snaptrade_user")  # type: ignore


class BrokerageAccount(Base):  # type: ignore  # type: ignore
    """Brokerage account database model"""

    __tablename__ = "brokerage_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), ForeignKey("users.user_id"), nullable=False, index=True)
    brokerage_type = Column(SQLEnum(BrokerType), nullable=False)
    account_number = Column(String(50), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)  # individual, joint, ira, 401k
    is_active = Column(Boolean, default=True)
    last_synced = Column(DateTime, nullable=True)
    sync_status = Column(String(20), default="pending")  # success, failed, in_progress, pending
    connection_status = Column(
        String(20), default="disconnected"
    )  # connected, disconnected, expired
    encrypted_credentials = Column(Text, nullable=True)  # Encrypted credential data
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="brokerage_accounts")  # type: ignore
    positions = relationship("Position", back_populates="account")  # type: ignore
    transactions = relationship("Transaction", back_populates="account")  # type: ignore

    # Indexes
    __table_args__ = (
        Index("idx_user_brokerage", "user_id", "brokerage_type"),
        Index("idx_account_number", "account_number"),
    )


class Position(Base):  # type: ignore  # type: ignore
    """Position database model"""

    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("brokerage_accounts.id"), nullable=False)
    broker = Column(SQLEnum(BrokerType), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    quantity = Column(Numeric(20, 8), nullable=False)
    cost_basis = Column(Numeric(20, 2), nullable=False)
    current_price = Column(Numeric(20, 2), nullable=False)
    position_type = Column(String(20), default="stock")  # stock, bond, etf, crypto, option
    sector = Column(String(50), nullable=True)
    industry = Column(String(100), nullable=True)
    country = Column(String(50), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    account = relationship("BrokerageAccount", back_populates="positions")  # type: ignore

    # Create composite index for broker + symbol
    __table_args__ = (
        Index("idx_broker_symbol", "broker", "symbol"),
        Index("idx_account_symbol", "account_id", "symbol"),
    )


class Balance(Base):  # type: ignore  # type: ignore
    """Balance database model"""

    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, index=True)
    broker = Column(SQLEnum(BrokerType), nullable=False, unique=True, index=True)
    cash = Column(Numeric(20, 2), default=0)
    margin = Column(Numeric(20, 2), default=0)
    crypto = Column(Numeric(20, 8), default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Transaction(Base):  # type: ignore
    """Transaction database model"""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("brokerage_accounts.id"), nullable=False)
    broker = Column(SQLEnum(BrokerType), nullable=False, index=True)
    type = Column(SQLEnum(TransactionType), nullable=False, index=True)
    symbol = Column(String(20), nullable=True)
    quantity = Column(Numeric(20, 8), nullable=True)
    price = Column(Numeric(20, 2), nullable=True)
    amount = Column(Numeric(20, 2), nullable=False)
    fees = Column(Numeric(20, 2), default=0)
    timestamp = Column(DateTime, nullable=False, index=True)
    settlement_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    account = relationship("BrokerageAccount", back_populates="transactions")  # type: ignore

    # Index for efficient date range queries
    __table_args__ = (
        Index("idx_timestamp_broker", "timestamp", "broker"),
        Index("idx_account_timestamp", "account_id", "timestamp"),
    )


class MorningBrief(Base):  # type: ignore
    """Morning brief database model"""

    __tablename__ = "morning_brief"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    portfolio_value = Column(Numeric(20, 2), nullable=False)
    overnight_pnl = Column(Numeric(20, 2), nullable=False)
    overnight_pnl_percent = Column(Numeric(5, 2), nullable=False)
    cash_available = Column(Numeric(20, 2), nullable=False)
    volatility_alerts = Column(JSON, default=list)
    key_positions = Column(JSON, default=list)
    market_summary = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())


class CachedData(Base):  # type: ignore
    """Cache for API responses"""

    __tablename__ = "cached_data"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), unique=True, nullable=False, index=True)
    data = Column(JSON, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class TaskStatus(Base):  # type: ignore
    """Task status for TODO tracking"""

    __tablename__ = "task_status"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(100), unique=True, nullable=False, index=True)
    task_name = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TaskTemplate(Base):  # type: ignore
    """Template for recurring tasks"""

    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    rrule = Column(String(500), nullable=False)  # RFC 5545 RRULE format
    is_blocking = Column(Boolean, default=False)
    category = Column(String(50), default="general")  # daily, weekly, monthly
    priority = Column(Integer, default=1)  # 1=high, 2=medium, 3=low
    estimated_duration = Column(Integer, nullable=True)  # minutes
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TaskInstance(Base):  # type: ignore
    """Individual task instances generated from templates"""

    __tablename__ = "task_instances"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("task_templates.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), default="pending")  # pending, in_progress, completed, skipped
    is_blocking = Column(Boolean, default=False)
    priority = Column(Integer, default=1)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String(100), nullable=True)  # user identifier
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TaskAuditLog(Base):  # type: ignore
    """Audit trail for task changes"""

    __tablename__ = "task_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    task_instance_id = Column(Integer, ForeignKey("task_instances.id"), nullable=False)
    action = Column(String(50), nullable=False)  # created, started, completed, skipped, modified
    old_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=True)
    user_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)


class TaxLot(Base):  # type: ignore
    """Tax lot information for positions"""

    __tablename__ = "tax_lots"

    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    quantity = Column(Numeric(20, 8), nullable=False)
    cost_basis = Column(Numeric(20, 2), nullable=False)
    acquisition_date = Column(Date, nullable=False)
    is_long_term = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    position = relationship("Position")  # type: ignore

    # Indexes
    __table_args__ = (Index("idx_position_date", "position_id", "acquisition_date"),)


class SyncLog(Base):  # type: ignore
    """Synchronization log for portfolio data"""

    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("brokerage_accounts.id"), nullable=False)
    sync_type = Column(String(50), nullable=False)  # full, incremental, positions, transactions
    status = Column(String(20), nullable=False)  # success, failed, in_progress
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    records_processed = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)

    # Relationships
    account = relationship("BrokerageAccount")  # type: ignore

    # Indexes
    __table_args__ = (
        Index("idx_account_date", "account_id", "started_at"),
        Index("idx_sync_status", "status", "started_at"),
    )


class PerformanceSnapshot(Base):  # type: ignore
    """Performance metrics snapshot"""

    __tablename__ = "performance_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), ForeignKey("users.user_id"), nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False)
    total_value = Column(Numeric(20, 2), nullable=False)
    cash_value = Column(Numeric(20, 2), nullable=False)
    positions_value = Column(Numeric(20, 2), nullable=False)
    daily_pnl = Column(Numeric(20, 2), nullable=False)
    daily_pnl_percent = Column(Numeric(10, 4), nullable=False)
    weekly_pnl = Column(Numeric(20, 2), nullable=True)
    weekly_pnl_percent = Column(Numeric(10, 4), nullable=True)
    monthly_pnl = Column(Numeric(20, 2), nullable=True)
    monthly_pnl_percent = Column(Numeric(10, 4), nullable=True)
    ytd_pnl = Column(Numeric(20, 2), nullable=True)
    ytd_pnl_percent = Column(Numeric(10, 4), nullable=True)
    volatility = Column(Numeric(10, 4), nullable=True)
    sharpe_ratio = Column(Numeric(10, 4), nullable=True)
    max_drawdown = Column(Numeric(10, 4), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Indexes
    __table_args__ = (Index("idx_performance_user_date", "user_id", "snapshot_date"),)


class Report(Base):  # type: ignore
    """Generated portfolio reports"""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), ForeignKey("users.user_id"), nullable=False, index=True)
    report_type = Column(String(50), nullable=False)  # summary, performance, tax, allocation
    title = Column(String(255), nullable=False)
    parameters = Column(JSON, nullable=False)  # Report generation parameters
    file_format = Column(String(10), nullable=False)  # pdf, csv, xlsx
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    status = Column(String(20), default="generating")  # generating, ready, failed, expired
    error_message = Column(Text, nullable=True)
    generated_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    downloaded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_user_type", "user_id", "report_type"),
        Index("idx_status_expires", "status", "expires_at"),
    )


class AssetAllocation(Base):  # type: ignore
    """Asset allocation snapshot"""

    __tablename__ = "asset_allocations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), ForeignKey("users.user_id"), nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False)
    total_value = Column(Numeric(20, 2), nullable=False)
    by_asset_class = Column(JSON, nullable=False)  # {stocks: 0.6, bonds: 0.3, cash: 0.1}
    by_sector = Column(JSON, nullable=False)  # {tech: 0.3, healthcare: 0.2, ...}
    by_geography = Column(JSON, nullable=False)  # {us: 0.7, international: 0.3}
    by_brokerage = Column(JSON, nullable=False)  # {fidelity: 0.5, robinhood: 0.3, ...}
    concentration_risks = Column(JSON, nullable=False)  # List of concentration risk objects
    diversification_score = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Indexes
    __table_args__ = (Index("idx_allocation_user_date", "user_id", "snapshot_date"),)
