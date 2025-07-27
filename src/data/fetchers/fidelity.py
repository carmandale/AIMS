"""Mock Fidelity data fetcher"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any

from src.data.models import Position, Balance, Transaction, BrokerType, TransactionType
from .base import BaseFetcher


class FidelityFetcher(BaseFetcher):
    """Mock fetcher for Fidelity - traditional stocks and ETFs"""

    def __init__(self):
        super().__init__(BrokerType.FIDELITY)
        self._mock_positions = self._generate_mock_positions()

    def _generate_mock_positions(self) -> List[Dict[str, Any]]:
        """Generate realistic mock positions"""
        return [
            {
                "symbol": "SPY",
                "quantity": Decimal("150"),
                "cost_basis": Decimal("580.25"),
                "current_price": Decimal("598.74"),
                "position_type": "stock",
            },
            {
                "symbol": "AAPL",
                "quantity": Decimal("200"),
                "cost_basis": Decimal("195.50"),
                "current_price": Decimal("229.87"),
                "position_type": "stock",
            },
            {
                "symbol": "GOOGL",
                "quantity": Decimal("50"),
                "cost_basis": Decimal("142.30"),
                "current_price": Decimal("182.63"),
                "position_type": "stock",
            },
            {
                "symbol": "MSFT",
                "quantity": Decimal("100"),
                "cost_basis": Decimal("380.00"),
                "current_price": Decimal("415.26"),
                "position_type": "stock",
            },
            {
                "symbol": "VTI",
                "quantity": Decimal("300"),
                "cost_basis": Decimal("250.00"),
                "current_price": Decimal("278.91"),
                "position_type": "stock",
            },
            {
                "symbol": "QQQ",
                "quantity": Decimal("75"),
                "cost_basis": Decimal("480.00"),
                "current_price": Decimal("505.32"),
                "position_type": "stock",
            },
        ]

    async def fetch_positions(self) -> List[Position]:
        """Fetch current positions"""
        positions = []
        for pos_data in self._mock_positions:
            # Add some random price movement
            base_price = pos_data["current_price"]
            price_change = base_price * Decimal(str(round(random.uniform(-0.02, 0.02), 4)))
            current_price = (base_price + price_change).quantize(Decimal("0.01"))

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
            cash=Decimal("45000.00"),
            margin=Decimal("0.00"),  # No margin in this account
            crypto=Decimal("0.00"),  # No crypto in Fidelity
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
                symbol="AAPL",
                quantity=Decimal("50"),
                price=Decimal("220.00"),
                amount=Decimal("11000.00"),
                fees=Decimal("0.00"),
                timestamp=datetime.utcnow() - timedelta(days=5),
                description="Buy 50 shares of AAPL",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.DIVIDEND,
                symbol="SPY",
                amount=Decimal("225.00"),
                fees=Decimal("0.00"),
                timestamp=datetime.utcnow() - timedelta(days=10),
                description="SPY dividend payment",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.SELL,
                symbol="TSLA",
                quantity=Decimal("20"),
                price=Decimal("385.00"),
                amount=Decimal("7700.00"),
                fees=Decimal("0.00"),
                timestamp=datetime.utcnow() - timedelta(days=15),
                description="Sell 20 shares of TSLA",
            ),
        ]

        # Filter by date range
        return [t for t in transactions if start_date <= t.timestamp <= end_date]

    async def fetch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch real-time quotes"""
        quotes = {}

        # Mock quote data
        mock_prices = {
            "SPY": Decimal("598.74"),
            "AAPL": Decimal("229.87"),
            "GOOGL": Decimal("182.63"),
            "MSFT": Decimal("415.26"),
            "VTI": Decimal("278.91"),
            "QQQ": Decimal("505.32"),
            "TSLA": Decimal("412.35"),
            "NVDA": Decimal("135.58"),
        }

        for symbol in symbols:
            if symbol in mock_prices:
                base_price = mock_prices[symbol]
                change = base_price * Decimal(random.uniform(-0.02, 0.02))

                quotes[symbol] = {
                    "symbol": symbol,
                    "price": float(base_price + change),
                    "change": float(change),
                    "change_percent": float((change / base_price) * 100),
                    "volume": random.randint(1000000, 50000000),
                    "bid": float(base_price + change - Decimal("0.01")),
                    "ask": float(base_price + change + Decimal("0.01")),
                    "high": float(base_price + abs(change) * 2),
                    "low": float(base_price - abs(change) * 2),
                    "open": float(base_price),
                    "previous_close": float(base_price),
                }

        return quotes
