"""Performance analytics service for calculating portfolio metrics"""

import math
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from src.db.models import PerformanceSnapshot
from src.data.models.portfolio import PerformanceMetrics, RiskMetrics


class PerformanceAnalyticsService:
    """Service for calculating performance metrics and analytics"""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.risk_free_rate = 0.02  # Default 2% risk-free rate (10-year Treasury)

    def calculate_returns_metrics(
        self, user_id: str, start_date: date, end_date: date, timeframe: str = "custom"
    ) -> Optional[PerformanceMetrics]:
        """
        Calculate comprehensive return metrics for a given period

        Args:
            user_id: User identifier
            start_date: Start date for calculation
            end_date: End date for calculation
            timeframe: Period identifier (daily, weekly, monthly, custom)

        Returns:
            PerformanceMetrics object with calculated values
        """
        # Get snapshots for the period
        snapshots = self._get_snapshots_for_period(user_id, start_date, end_date)

        if not snapshots:
            return None

        # If only a single snapshot exists, return a minimal metrics object rather than None
        # so API endpoints can respond with 200 and basic values for freshly seeded data
        if len(snapshots) == 1:
            single = snapshots[0]
            starting_value = Decimal(str(single.total_value))
            ending_value = starting_value
            absolute_change = Decimal("0")
            percent_change = 0.0
            annualized_return = None

            return PerformanceMetrics(
                timeframe=timeframe,
                start_date=datetime.combine(start_date, datetime.min.time()),
                end_date=datetime.combine(end_date, datetime.min.time()),
                starting_value=starting_value,
                ending_value=ending_value,
                absolute_change=absolute_change,
                percent_change=percent_change,
                annualized_return=annualized_return,
                volatility=None,
                sharpe_ratio=None,
                max_drawdown=None,
                periodic_returns={},
            )

        first_snapshot = snapshots[0]
        last_snapshot = snapshots[-1]

        starting_value = Decimal(str(first_snapshot.total_value))
        ending_value = Decimal(str(last_snapshot.total_value))
        absolute_change = ending_value - starting_value

        # Calculate percentage change
        if starting_value > 0:
            percent_change = float((absolute_change / starting_value) * 100)
        else:
            percent_change = 0.0

        # Calculate annualized return
        days_difference = (end_date - start_date).days
        if days_difference > 0 and starting_value > 0:
            daily_return = (float(ending_value) / float(starting_value)) ** (
                1 / days_difference
            ) - 1
            annualized_return = ((1 + daily_return) ** 365 - 1) * 100
        else:
            annualized_return = None

        # Calculate additional metrics
        volatility = self.calculate_volatility(user_id, start_date, end_date)
        sharpe_ratio = self.calculate_sharpe_ratio(user_id, start_date, end_date)
        max_drawdown = self.calculate_max_drawdown(user_id, start_date, end_date)

        # Generate periodic returns breakdown
        periodic_returns = self._calculate_periodic_returns(snapshots, timeframe)

        return PerformanceMetrics(
            timeframe=timeframe,
            start_date=datetime.combine(start_date, datetime.min.time()),
            end_date=datetime.combine(end_date, datetime.min.time()),
            starting_value=starting_value,
            ending_value=ending_value,
            absolute_change=absolute_change,
            percent_change=percent_change,
            annualized_return=annualized_return,
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            periodic_returns=periodic_returns,
        )

    def calculate_volatility(
        self, user_id: str, start_date: date, end_date: date, annualized: bool = True
    ) -> Optional[float]:
        """
        Calculate portfolio volatility (standard deviation of returns)

        Args:
            user_id: User identifier
            start_date: Start date for calculation
            end_date: End date for calculation
            annualized: Whether to annualize the volatility

        Returns:
            Volatility as a percentage
        """
        snapshots = self._get_snapshots_for_period(user_id, start_date, end_date)

        if not snapshots or len(snapshots) < 2:
            return None

        # Calculate daily returns
        daily_returns = []
        for i in range(1, len(snapshots)):
            prev_value = float(snapshots[i - 1].total_value)
            curr_value = float(snapshots[i].total_value)

            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                daily_returns.append(daily_return)

        if len(daily_returns) < 2:
            return None

        # Calculate standard deviation
        mean_return = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_return) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        std_dev = math.sqrt(variance)

        # Annualize if requested
        if annualized:
            std_dev = std_dev * math.sqrt(252)  # 252 trading days per year

        return std_dev * 100  # Return as percentage

    def calculate_sharpe_ratio(
        self, user_id: str, start_date: date, end_date: date, risk_free_rate: Optional[float] = None
    ) -> Optional[float]:
        """
        Calculate Sharpe ratio (risk-adjusted return)

        Args:
            user_id: User identifier
            start_date: Start date for calculation
            end_date: End date for calculation
            risk_free_rate: Risk-free rate (defaults to class default)

        Returns:
            Sharpe ratio
        """
        if risk_free_rate is None:
            risk_free_rate = self.risk_free_rate

        snapshots = self._get_snapshots_for_period(user_id, start_date, end_date)

        if not snapshots or len(snapshots) < 2:
            return None

        # Calculate annualized return
        first_value = float(snapshots[0].total_value)
        last_value = float(snapshots[-1].total_value)
        days = (end_date - start_date).days

        if days == 0 or first_value <= 0:
            return None

        annualized_return = (last_value / first_value) ** (365 / days) - 1

        # Calculate volatility
        volatility = self.calculate_volatility(user_id, start_date, end_date, annualized=True)

        if volatility is None or volatility == 0:
            return None

        # Sharpe ratio = (Portfolio Return - Risk Free Rate) / Portfolio Volatility
        sharpe = (annualized_return - risk_free_rate) / (volatility / 100)

        return sharpe

    def calculate_max_drawdown(
        self, user_id: str, start_date: date, end_date: date
    ) -> Optional[float]:
        """
        Calculate maximum drawdown (largest peak-to-trough decline)

        Args:
            user_id: User identifier
            start_date: Start date for calculation
            end_date: End date for calculation

        Returns:
            Maximum drawdown as negative percentage
        """
        snapshots = self._get_snapshots_for_period(user_id, start_date, end_date)

        if not snapshots or len(snapshots) < 2:
            return None

        max_drawdown = 0.0
        running_max = float(snapshots[0].total_value)

        for snapshot in snapshots:
            current_value = float(snapshot.total_value)

            # Update running maximum
            if current_value > running_max:
                running_max = current_value

            # Calculate drawdown from peak
            if running_max > 0:
                drawdown = (current_value - running_max) / running_max
                max_drawdown = min(max_drawdown, drawdown)

        return max_drawdown * 100  # Return as percentage

    def get_risk_metrics(
        self, user_id: str, start_date: date, end_date: date
    ) -> Optional[RiskMetrics]:
        """
        Get comprehensive risk metrics for a portfolio

        Args:
            user_id: User identifier
            start_date: Start date for calculation
            end_date: End date for calculation

        Returns:
            RiskMetrics object with all risk calculations
        """
        volatility = self.calculate_volatility(user_id, start_date, end_date)
        sharpe_ratio = self.calculate_sharpe_ratio(user_id, start_date, end_date)
        max_drawdown = self.calculate_max_drawdown(user_id, start_date, end_date)

        if volatility is None or sharpe_ratio is None:
            return None

        # Calculate Sortino ratio (downside deviation)
        sortino_ratio = self._calculate_sortino_ratio(user_id, start_date, end_date)

        # Find max drawdown periods
        max_dd_start, max_dd_end = self._find_max_drawdown_period(user_id, start_date, end_date)

        return RiskMetrics(
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_drawdown or 0.0,
            max_drawdown_start=max_dd_start,
            max_drawdown_end=max_dd_end,
        )

    def get_period_performance(self, user_id: str, period: str) -> Optional[PerformanceMetrics]:
        """
        Get performance metrics for standard periods

        Args:
            user_id: User identifier
            period: Period type (daily, weekly, monthly, ytd, all)

        Returns:
            PerformanceMetrics for the specified period
        """
        end_date = date.today()

        if period == "daily":
            start_date = end_date - timedelta(days=1)
        elif period == "weekly":
            start_date = end_date - timedelta(days=7)
        elif period == "monthly":
            start_date = end_date - timedelta(days=30)
        elif period == "ytd":
            start_date = date(end_date.year, 1, 1)
        elif period == "all":
            # Get earliest snapshot date
            earliest = (
                self.db.query(PerformanceSnapshot.snapshot_date)
                .filter(PerformanceSnapshot.user_id == user_id)
                .order_by(PerformanceSnapshot.snapshot_date)
                .first()
            )

            if not earliest:
                return None

            start_date = earliest[0]
        else:
            raise ValueError(f"Invalid period: {period}")

        return self.calculate_returns_metrics(user_id, start_date, end_date, period)

    def _get_snapshots_for_period(
        self, user_id: str, start_date: date, end_date: date
    ) -> List[PerformanceSnapshot]:
        """Get performance snapshots for a date range"""
        return (
            self.db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == user_id,
                    PerformanceSnapshot.snapshot_date >= start_date,
                    PerformanceSnapshot.snapshot_date <= end_date,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

    def _calculate_periodic_returns(
        self, snapshots: List[PerformanceSnapshot], timeframe: str
    ) -> Dict[str, float]:
        """Calculate returns broken down by periods"""
        if not snapshots or len(snapshots) < 2:
            return {}

        periodic_returns = {}

        # For now, just calculate basic metrics
        # Could be expanded to show weekly/monthly breakdown
        if len(snapshots) >= 7:
            weekly_return = self._calculate_period_return(snapshots[-7:])
            periodic_returns["last_7_days"] = weekly_return

        if len(snapshots) >= 30:
            monthly_return = self._calculate_period_return(snapshots[-30:])
            periodic_returns["last_30_days"] = monthly_return

        return periodic_returns

    def _calculate_period_return(self, snapshots: List[PerformanceSnapshot]) -> float:
        """Calculate return for a specific set of snapshots"""
        if not snapshots or len(snapshots) < 2:
            return 0.0

        start_value = float(snapshots[0].total_value)
        end_value = float(snapshots[-1].total_value)

        if start_value > 0:
            return ((end_value - start_value) / start_value) * 100
        return 0.0

    def _calculate_sortino_ratio(
        self, user_id: str, start_date: date, end_date: date
    ) -> Optional[float]:
        """Calculate Sortino ratio (uses downside deviation instead of total volatility)"""
        snapshots = self._get_snapshots_for_period(user_id, start_date, end_date)

        if not snapshots or len(snapshots) < 2:
            return None

        # Calculate daily returns
        daily_returns = []
        for i in range(1, len(snapshots)):
            prev_value = float(snapshots[i - 1].total_value)
            curr_value = float(snapshots[i].total_value)

            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                daily_returns.append(daily_return)

        if len(daily_returns) < 2:
            return None

        # Calculate downside deviation (only negative returns)
        negative_returns = [r for r in daily_returns if r < 0]

        if not negative_returns:
            return None  # No downside risk

        downside_variance = sum(r**2 for r in negative_returns) / len(negative_returns)
        downside_deviation = math.sqrt(downside_variance) * math.sqrt(252)  # Annualized

        # Calculate average return
        avg_return = sum(daily_returns) / len(daily_returns) * 252  # Annualized

        if downside_deviation == 0:
            return None

        return (avg_return - self.risk_free_rate) / downside_deviation

    def _find_max_drawdown_period(
        self, user_id: str, start_date: date, end_date: date
    ) -> tuple[Optional[datetime], Optional[datetime]]:
        """Find the start and end dates of the maximum drawdown period"""
        snapshots = self._get_snapshots_for_period(user_id, start_date, end_date)

        if not snapshots or len(snapshots) < 2:
            return None, None

        max_drawdown = 0.0
        max_dd_start = None
        max_dd_end = None
        running_max = float(snapshots[0].total_value)
        peak_date = snapshots[0].snapshot_date

        for snapshot in snapshots:
            current_value = float(snapshot.total_value)
            current_date = snapshot.snapshot_date

            # Update running maximum
            if current_value > running_max:
                running_max = current_value
                peak_date = current_date

            # Calculate drawdown from peak
            if running_max > 0:
                drawdown = (current_value - running_max) / running_max
                if drawdown < max_drawdown:
                    max_drawdown = drawdown
                    max_dd_start = datetime.combine(peak_date, datetime.min.time())  # type: ignore
                    max_dd_end = datetime.combine(current_date, datetime.min.time())  # type: ignore

        return max_dd_start, max_dd_end
