"""Mock Robinhood data fetcher"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any

from src.data.models import Position, Balance, Transaction, BrokerType, TransactionType
from .base import BaseFetcher


class RobinhoodFetcher(BaseFetcher):
    """Mock fetcher for Robinhood - mix of stocks and options"""

    def __init__(self):
        super().__init__(BrokerType.ROBINHOOD)
        self._mock_positions = self._generate_mock_positions()

    def _generate_mock_positions(self) -> List[Dict[str, Any]]:
        """Generate realistic mock positions including options"""
        return [
            {
                "symbol": "TSLA",
                "quantity": Decimal("50"),
                "cost_basis": Decimal("385.00"),
                "current_price": Decimal("412.35"),
                "position_type": "stock",
            },
            {
                "symbol": "NVDA",
                "quantity": Decimal("100"),
                "cost_basis": Decimal("125.00"),
                "current_price": Decimal("135.58"),
                "position_type": "stock",
            },
            {
                "symbol": "AMD",
                "quantity": Decimal("200"),
                "cost_basis": Decimal("155.00"),
                "current_price": Decimal("122.45"),
                "position_type": "stock",
            },
            {
                "symbol": "SPY_010325C600",  # SPY Call Option Jan 3, 2025 $600 strike
                "quantity": Decimal("10"),
                "cost_basis": Decimal("8.50"),
                "current_price": Decimal("12.25"),
                "position_type": "option",
            },
            {
                "symbol": "QQQ_122724P500",  # QQQ Put Option Dec 27, 2024 $500 strike
                "quantity": Decimal("5"),
                "cost_basis": Decimal("4.25"),
                "current_price": Decimal("2.85"),
                "position_type": "option",
            },
        ]

    async def fetch_positions(self) -> List[Position]:
        """Fetch current positions"""
        positions = []
        for pos_data in self._mock_positions:
            # Add some random price movement
            base_price = pos_data["current_price"]
            if pos_data["position_type"] == "option":
                # Options are more volatile
                price_change = base_price * Decimal(str(round(random.uniform(-0.10, 0.10), 4)))
            else:
                price_change = base_price * Decimal(str(round(random.uniform(-0.03, 0.03), 4)))

            current_price = round(max(base_price + price_change, Decimal("0.01")), 2)

            position = Position(
                broker=self.broker_type,
                symbol=pos_data["symbol"],
                quantity=pos_data["quantity"],
                cost_basis=pos_data["cost_basis"],
                current_price=current_price,
                position_type=pos_data["position_type"],
            )
            position.calculate_metrics()
            positions.append(position)

        return positions

    async def fetch_balance(self) -> Balance:
        """Fetch account balance"""
        balance = Balance(
            broker=self.broker_type,
            cash=Decimal("15000.00"),
            margin=Decimal("25000.00"),  # Margin enabled
            crypto=Decimal("0.00"),  # Crypto moved to Coinbase
        )
        balance.calculate_total()
        return balance

    async def fetch_transactions(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """Fetch recent transactions"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        # Generate some mock transactions
        transactions = [
            Transaction(
                broker=self.broker_type,
                type=TransactionType.BUY,
                symbol="NVDA",
                quantity=Decimal("25"),
                price=Decimal("130.00"),
                amount=Decimal("3250.00"),
                fees=Decimal("0.00"),
                timestamp=datetime.utcnow() - timedelta(days=3),
                description="Buy 25 shares of NVDA",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.BUY,
                symbol="SPY_010325C600",
                quantity=Decimal("5"),
                price=Decimal("10.00"),
                amount=Decimal("5000.00"),  # 5 contracts * 100 shares * $10
                fees=Decimal("3.25"),  # Options fees
                timestamp=datetime.utcnow() - timedelta(days=7),
                description="Buy 5 SPY Call options",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.SELL,
                symbol="GME",
                quantity=Decimal("100"),
                price=Decimal("45.00"),
                amount=Decimal("4500.00"),
                fees=Decimal("0.00"),
                timestamp=datetime.utcnow() - timedelta(days=12),
                description="Sell 100 shares of GME",
            ),
        ]

        # Filter by date range
        return [t for t in transactions if start_date <= t.timestamp <= end_date]

    async def fetch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch real-time quotes"""
        quotes = {}

        # Mock quote data
        mock_prices = {
            "TSLA": Decimal("412.35"),
            "NVDA": Decimal("135.58"),
            "AMD": Decimal("122.45"),
            "GME": Decimal("48.75"),
            "AMC": Decimal("5.82"),
            "PLTR": Decimal("42.15"),
        }

        # Option pricing (simplified)
        option_prices = {"SPY_010325C600": Decimal("12.25"), "QQQ_122724P500": Decimal("2.85")}

        all_prices = {**mock_prices, **option_prices}

        for symbol in symbols:
            if symbol in all_prices:
                base_price = all_prices[symbol]

                # Options have higher volatility
                if "_" in symbol:  # Simple check for options
                    change = base_price * Decimal(random.uniform(-0.15, 0.15))
                else:
                    change = base_price * Decimal(random.uniform(-0.03, 0.03))

                quotes[symbol] = {
                    "symbol": symbol,
                    "price": float(base_price + change),
                    "change": float(change),
                    "change_percent": float((change / base_price) * 100),
                    "volume": random.randint(100000, 10000000),
                    "bid": float(base_price + change - Decimal("0.01")),
                    "ask": float(base_price + change + Decimal("0.01")),
                    "high": float(base_price + abs(change) * 2),
                    "low": float(base_price - abs(change) * 2),
                    "open": float(base_price),
                    "previous_close": float(base_price),
                }

        return quotes
