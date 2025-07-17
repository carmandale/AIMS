"""Mock Coinbase data fetcher"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any

from src.data.models import Position, Balance, Transaction, BrokerType, TransactionType
from .base import BaseFetcher


class CoinbaseFetcher(BaseFetcher):
    """Mock fetcher for Coinbase - cryptocurrency holdings"""

    def __init__(self):
        super().__init__(BrokerType.COINBASE)
        self._mock_positions = self._generate_mock_positions()

    def _generate_mock_positions(self) -> List[Dict[str, Any]]:
        """Generate realistic mock crypto positions"""
        return [
            {
                "symbol": "BTC",
                "quantity": Decimal("1.5"),
                "cost_basis": Decimal("65000.00"),
                "current_price": Decimal("101250.00"),
                "position_type": "crypto",
            },
            {
                "symbol": "ETH",
                "quantity": Decimal("15.0"),
                "cost_basis": Decimal("3200.00"),
                "current_price": Decimal("3875.50"),
                "position_type": "crypto",
            },
            {
                "symbol": "SOL",
                "quantity": Decimal("250.0"),
                "cost_basis": Decimal("145.00"),
                "current_price": Decimal("215.25"),
                "position_type": "crypto",
            },
            {
                "symbol": "MATIC",
                "quantity": Decimal("5000.0"),
                "cost_basis": Decimal("0.85"),
                "current_price": Decimal("0.52"),
                "position_type": "crypto",
            },
        ]

    async def fetch_positions(self) -> List[Position]:
        """Fetch current positions"""
        positions = []
        for pos_data in self._mock_positions:
            # Crypto is more volatile
            base_price = pos_data["current_price"]
            price_change = base_price * Decimal(str(round(random.uniform(-0.05, 0.05), 4)))
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
        # Calculate crypto value in USD
        positions = await self.fetch_positions()
        crypto_value = sum(p.market_value or Decimal("0") for p in positions)

        balance = Balance(
            broker=self.broker_type,
            cash=Decimal("5000.00"),  # USD balance
            margin=Decimal("0.00"),  # No margin on Coinbase
            crypto=Decimal(str(crypto_value)),  # Total crypto value in USD
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
                symbol="BTC",
                quantity=Decimal("0.1"),
                price=Decimal("98000.00"),
                amount=Decimal("9800.00"),
                fees=Decimal("49.00"),  # 0.5% fee
                timestamp=datetime.utcnow() - timedelta(days=2),
                description="Buy 0.1 BTC",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.BUY,
                symbol="SOL",
                quantity=Decimal("50"),
                price=Decimal("200.00"),
                amount=Decimal("10000.00"),
                fees=Decimal("50.00"),
                timestamp=datetime.utcnow() - timedelta(days=8),
                description="Buy 50 SOL",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.SELL,
                symbol="ETH",
                quantity=Decimal("2.0"),
                price=Decimal("3900.00"),
                amount=Decimal("7800.00"),
                fees=Decimal("39.00"),
                timestamp=datetime.utcnow() - timedelta(days=14),
                description="Sell 2 ETH",
            ),
            Transaction(
                broker=self.broker_type,
                type=TransactionType.DEPOSIT,
                amount=Decimal("5000.00"),
                fees=Decimal("0.00"),
                timestamp=datetime.utcnow() - timedelta(days=20),
                description="USD deposit",
            ),
        ]

        # Filter by date range
        return [t for t in transactions if start_date <= t.timestamp <= end_date]

    async def fetch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch real-time crypto quotes"""
        quotes = {}

        # Mock crypto prices
        mock_prices = {
            "BTC": Decimal("101250.00"),
            "ETH": Decimal("3875.50"),
            "SOL": Decimal("215.25"),
            "MATIC": Decimal("0.52"),
            "ADA": Decimal("0.98"),
            "DOT": Decimal("8.45"),
            "AVAX": Decimal("42.15"),
            "LINK": Decimal("15.82"),
        }

        for symbol in symbols:
            # Handle both BTC and BTC-USD formats
            clean_symbol = symbol.replace("-USD", "")

            if clean_symbol in mock_prices:
                base_price = mock_prices[clean_symbol]
                # Crypto is 24/7 and more volatile
                change = base_price * Decimal(random.uniform(-0.08, 0.08))

                quotes[symbol] = {
                    "symbol": symbol,
                    "price": float(base_price + change),
                    "change": float(change),
                    "change_percent": float((change / base_price) * 100),
                    "volume": random.randint(1000000, 100000000),
                    "bid": float(base_price + change - (base_price * Decimal("0.0001"))),
                    "ask": float(base_price + change + (base_price * Decimal("0.0001"))),
                    "high": float(base_price + abs(change) * 3),
                    "low": float(base_price - abs(change) * 3),
                    "open": float(base_price - change * Decimal("0.5")),
                    "previous_close": float(base_price),
                }

        return quotes
