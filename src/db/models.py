"""SQLAlchemy database models"""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, DateTime, Numeric, 
    Text, JSON, Date, Index, Enum as SQLEnum, Boolean, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

from src.data.models import BrokerType, TransactionType

Base = declarative_base()


class Position(Base):
    """Position database model"""
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    broker = Column(SQLEnum(BrokerType), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    quantity = Column(Numeric(20, 8), nullable=False)
    cost_basis = Column(Numeric(20, 2), nullable=False)
    current_price = Column(Numeric(20, 2), nullable=False)
    position_type = Column(String(20), default="stock")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Create composite index for broker + symbol
    __table_args__ = (
        Index("idx_broker_symbol", "broker", "symbol"),
    )


class Balance(Base):
    """Balance database model"""
    __tablename__ = "balances"
    
    id = Column(Integer, primary_key=True, index=True)
    broker = Column(SQLEnum(BrokerType), nullable=False, unique=True, index=True)
    cash = Column(Numeric(20, 2), default=0)
    margin = Column(Numeric(20, 2), default=0)
    crypto = Column(Numeric(20, 8), default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Transaction(Base):
    """Transaction database model"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    broker = Column(SQLEnum(BrokerType), nullable=False, index=True)
    type = Column(SQLEnum(TransactionType), nullable=False, index=True)
    symbol = Column(String(20), nullable=True)
    quantity = Column(Numeric(20, 8), nullable=True)
    price = Column(Numeric(20, 2), nullable=True)
    amount = Column(Numeric(20, 2), nullable=False)
    fees = Column(Numeric(20, 2), default=0)
    timestamp = Column(DateTime, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Index for efficient date range queries
    __table_args__ = (
        Index("idx_timestamp_broker", "timestamp", "broker"),
    )


class MorningBrief(Base):
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


class CachedData(Base):
    """Cache for API responses"""
    __tablename__ = "cached_data"
    
    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), unique=True, nullable=False, index=True)
    data = Column(JSON, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class TaskStatus(Base):
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


class TaskTemplate(Base):
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


class TaskInstance(Base):
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


class TaskAuditLog(Base):
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