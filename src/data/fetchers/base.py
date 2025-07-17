"""Base fetcher interface"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional, Dict, Any

from src.data.models import Position, Balance, Transaction, BrokerType


class FetcherException(Exception):
    """Exception raised by fetchers"""

    pass


class BaseFetcher(ABC):
    """Abstract base class for broker data fetchers"""

    def __init__(self, broker_type: BrokerType):
        self.broker_type = broker_type
        self._last_fetch: Optional[datetime] = None

    @abstractmethod
    async def fetch_positions(self) -> List[Position]:
        """Fetch current positions"""
        pass

    @abstractmethod
    async def fetch_balance(self) -> Balance:
        """Fetch account balance"""
        pass

    @abstractmethod
    async def fetch_transactions(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """Fetch transactions within date range"""
        pass

    @abstractmethod
    async def fetch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch real-time quotes for symbols"""
        pass

    async def fetch_all(self) -> Dict[str, Any]:
        """Fetch all data from broker"""
        try:
            positions = await self.fetch_positions()
            balance = await self.fetch_balance()

            # Calculate metrics for positions
            for position in positions:
                position.calculate_metrics()

            # Calculate balance totals
            balance.calculate_total()

            self._last_fetch = datetime.utcnow()

            return {
                "broker": self.broker_type,
                "positions": positions,
                "balance": balance,
                "last_updated": self._last_fetch,
            }
        except Exception as e:
            raise FetcherException(f"Failed to fetch data from {self.broker_type}: {str(e)}")

    @property
    def last_fetch_time(self) -> Optional[datetime]:
        """Get the last fetch timestamp"""
        return self._last_fetch
