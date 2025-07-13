"""Portfolio service for aggregating data across brokers"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from src.data.fetchers import FidelityFetcher, RobinhoodFetcher, CoinbaseFetcher
from src.data.models import (
    PortfolioSummary, Position, Balance, Transaction,
    MorningBrief, VolatilityAlert, KeyPosition
)
from src.data.cache import cached
from src.db import models as db_models

logger = logging.getLogger(__name__)


class PortfolioService:
    """Service for portfolio data management"""
    
    def __init__(self):
        self.fetchers = {
            "fidelity": FidelityFetcher(),
            "robinhood": RobinhoodFetcher(),
            "coinbase": CoinbaseFetcher()
        }
    
    async def fetch_all_positions(self, db: Session) -> List[Position]:
        """Fetch positions from all brokers"""
        all_positions = []
        
        for broker_name, fetcher in self.fetchers.items():
            try:
                positions = await fetcher.fetch_positions()
                
                # Save to database
                for position in positions:
                    # Check if position exists
                    db_position = db.query(db_models.Position).filter(
                        db_models.Position.broker == position.broker,
                        db_models.Position.symbol == position.symbol
                    ).first()
                    
                    if db_position:
                        # Update existing
                        db_position.quantity = position.quantity
                        db_position.cost_basis = position.cost_basis
                        db_position.current_price = position.current_price
                        db_position.position_type = position.position_type
                    else:
                        # Create new
                        db_position = db_models.Position(
                            broker=position.broker,
                            symbol=position.symbol,
                            quantity=position.quantity,
                            cost_basis=position.cost_basis,
                            current_price=position.current_price,
                            position_type=position.position_type
                        )
                        db.add(db_position)
                    
                    all_positions.append(position)
                
                db.commit()
                
            except Exception as e:
                logger.error(f"Failed to fetch positions from {broker_name}: {e}")
                # Fall back to database
                db_positions = db.query(db_models.Position).filter(
                    db_models.Position.broker == fetcher.broker_type
                ).all()
                
                for db_pos in db_positions:
                    position = Position.model_validate(db_pos)
                    position.calculate_metrics()
                    all_positions.append(position)
        
        return all_positions
    
    async def fetch_all_balances(self, db: Session) -> List[Balance]:
        """Fetch balances from all brokers"""
        all_balances = []
        
        for broker_name, fetcher in self.fetchers.items():
            try:
                balance = await fetcher.fetch_balance()
                
                # Save to database
                db_balance = db.query(db_models.Balance).filter(
                    db_models.Balance.broker == balance.broker
                ).first()
                
                if db_balance:
                    db_balance.cash = balance.cash
                    db_balance.margin = balance.margin
                    db_balance.crypto = balance.crypto
                else:
                    db_balance = db_models.Balance(
                        broker=balance.broker,
                        cash=balance.cash,
                        margin=balance.margin,
                        crypto=balance.crypto
                    )
                    db.add(db_balance)
                
                db.commit()
                all_balances.append(balance)
                
            except Exception as e:
                logger.error(f"Failed to fetch balance from {broker_name}: {e}")
                # Fall back to database
                db_balance = db.query(db_models.Balance).filter(
                    db_models.Balance.broker == fetcher.broker_type
                ).first()
                
                if db_balance:
                    balance = Balance.model_validate(db_balance)
                    balance.calculate_total()
                    all_balances.append(balance)
        
        return all_balances
    
    @cached("portfolio_summary", ttl_hours=1)
    async def get_portfolio_summary(self, db: Session) -> Dict[str, Any]:
        """Get complete portfolio summary with caching"""
        # Fetch all data
        positions = await self.fetch_all_positions(db)
        balances = await self.fetch_all_balances(db)
        
        # Calculate totals
        total_positions_value = sum(p.market_value for p in positions)
        total_cash = sum(b.cash for b in balances)
        total_margin = sum(b.margin for b in balances)
        total_crypto = sum(b.crypto for b in balances)
        
        # For Coinbase, crypto is already in USD
        total_value = total_positions_value + total_cash + total_margin
        
        # Calculate P&L (mock for now)
        # In production, this would compare against historical data
        daily_pnl = total_value * Decimal("0.012")  # Mock 1.2% daily gain
        daily_pnl_percent = 1.2
        
        weekly_pnl = total_value * Decimal("0.025")  # Mock 2.5% weekly gain
        weekly_pnl_percent = 2.5
        
        summary = PortfolioSummary(
            total_value=total_value,
            cash_buffer=total_cash,
            total_positions_value=total_positions_value,
            total_cash=total_cash,
            daily_pnl=daily_pnl,
            daily_pnl_percent=daily_pnl_percent,
            weekly_pnl=weekly_pnl,
            weekly_pnl_percent=weekly_pnl_percent,
            positions=positions,
            balances=balances
        )
        
        return summary.model_dump()
    
    async def get_transactions(
        self,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        broker: Optional[str] = None
    ) -> List[Transaction]:
        """Get transactions with optional filtering"""
        all_transactions = []
        
        # Default to last 30 days
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        fetchers_to_use = self.fetchers.items()
        if broker:
            fetchers_to_use = [(broker, self.fetchers.get(broker))]
        
        for broker_name, fetcher in fetchers_to_use:
            if not fetcher:
                continue
                
            try:
                transactions = await fetcher.fetch_transactions(start_date, end_date)
                all_transactions.extend(transactions)
            except Exception as e:
                logger.error(f"Failed to fetch transactions from {broker_name}: {e}")
        
        # Sort by timestamp descending
        all_transactions.sort(key=lambda x: x.timestamp, reverse=True)
        
        return all_transactions
    
    async def generate_morning_brief(self, db: Session) -> MorningBrief:
        """Generate morning brief with overnight changes and alerts"""
        # Get current portfolio
        summary = await self.get_portfolio_summary(db)
        positions = summary["positions"]
        
        # Calculate overnight changes (mock for now)
        overnight_pnl = summary["total_value"] * Decimal("0.003")  # 0.3% overnight
        overnight_pnl_percent = 0.3
        
        # Find volatility alerts (positions with >2% movement)
        volatility_alerts = []
        for position in positions:
            change_percent = float(position["unrealized_pnl_percent"])
            if abs(change_percent) > 2.0:
                alert = VolatilityAlert(
                    symbol=position["symbol"],
                    current_price=Decimal(str(position["current_price"])),
                    change_percent=change_percent,
                    threshold_exceeded=2.0,
                    alert_type="gain" if change_percent > 0 else "loss",
                    message=f"{position['symbol']} has moved {abs(change_percent):.1f}%",
                    severity="high" if abs(change_percent) > 5 else "medium"
                )
                volatility_alerts.append(alert)
        
        # Get top 5 positions by value
        sorted_positions = sorted(
            positions, 
            key=lambda x: x["market_value"], 
            reverse=True
        )[:5]
        
        key_positions = []
        for pos in sorted_positions:
            key_pos = KeyPosition(
                symbol=pos["symbol"],
                broker=pos["broker"],
                market_value=Decimal(str(pos["market_value"])),
                unrealized_pnl=Decimal(str(pos["unrealized_pnl"])),
                unrealized_pnl_percent=float(pos["unrealized_pnl_percent"]),
                overnight_change=Decimal(str(pos["market_value"])) * Decimal("0.003"),
                overnight_change_percent=0.3
            )
            key_positions.append(key_pos)
        
        # Market summary
        market_summary = {
            "SPY": {"price": 598.74, "change": 1.2},
            "QQQ": {"price": 505.32, "change": 1.5},
            "BTC": {"price": 101250, "change": 2.8},
            "VIX": {"price": 14.5, "change": -0.5}
        }
        
        # Generate recommendations
        recommendations = []
        if summary["cash_buffer_percent"] < 10:
            recommendations.append("Consider increasing cash buffer to 10% for opportunities")
        if volatility_alerts:
            recommendations.append(f"Review {len(volatility_alerts)} positions with high volatility")
        if summary["weekly_pnl_percent"] > 2.0:
            recommendations.append("Strong weekly performance - consider taking some profits")
        
        brief = MorningBrief(
            date=datetime.utcnow(),
            portfolio_value=Decimal(str(summary["total_value"])),
            overnight_pnl=overnight_pnl,
            overnight_pnl_percent=overnight_pnl_percent,
            cash_available=Decimal(str(summary["total_cash"])),
            volatility_alerts=volatility_alerts,
            key_positions=key_positions,
            market_summary=market_summary,
            recommendations=recommendations
        )
        
        # Save to database
        db_brief = db.query(db_models.MorningBrief).filter(
            db_models.MorningBrief.date == brief.date.date()
        ).first()
        
        if not db_brief:
            db_brief = db_models.MorningBrief(
                date=brief.date.date(),
                portfolio_value=brief.portfolio_value,
                overnight_pnl=brief.overnight_pnl,
                overnight_pnl_percent=brief.overnight_pnl_percent,
                cash_available=brief.cash_available,
                volatility_alerts=[alert.model_dump() for alert in brief.volatility_alerts],
                key_positions=[pos.model_dump() for pos in brief.key_positions],
                market_summary=brief.market_summary,
                recommendations=brief.recommendations
            )
            db.add(db_brief)
            db.commit()
        
        return brief
    
    async def get_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Get real-time quotes for symbols"""
        all_quotes = {}
        
        # Determine which fetcher to use based on symbol
        for symbol in symbols:
            if symbol in ["BTC", "ETH", "SOL", "MATIC"] or symbol.endswith("-USD"):
                fetcher = self.fetchers["coinbase"]
            elif "_" in symbol:  # Options
                fetcher = self.fetchers["robinhood"]
            else:  # Stocks
                fetcher = self.fetchers["fidelity"]
            
            try:
                quotes = await fetcher.fetch_quotes([symbol])
                all_quotes.update(quotes)
            except Exception as e:
                logger.error(f"Failed to fetch quote for {symbol}: {e}")
        
        return all_quotes