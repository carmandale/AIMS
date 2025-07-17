"""Performance calculation service"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any
import statistics
import math

from src.data.models.portfolio import (
    Position, Transaction, PerformanceMetrics, RiskMetrics, 
    BrokerageAccount, PortfolioSummary
)

logger = logging.getLogger(__name__)


class PerformanceCalculator:
    """Service for calculating portfolio performance metrics"""
    
    def __init__(self):
        self.risk_free_rate = 0.05  # 5% annual risk-free rate (configurable)
        self.trading_days_per_year = 252
    
    async def calculate_performance_metrics(
        self, 
        positions: List[Position],
        transactions: List[Transaction],
        timeframe: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> PerformanceMetrics:
        """Calculate performance metrics for a portfolio"""
        
        if not end_date:
            end_date = datetime.utcnow()
        
        if not start_date:
            start_date = self._get_start_date_for_timeframe(timeframe, end_date)
        
        # Get historical portfolio values
        portfolio_values = await self._get_portfolio_values(
            positions, transactions, start_date, end_date
        )
        
        if len(portfolio_values) < 2:
            # Not enough data for meaningful calculations
            return PerformanceMetrics(
                timeframe=timeframe,
                start_date=start_date,
                end_date=end_date,
                starting_value=Decimal("0"),
                ending_value=Decimal("0"),
                absolute_change=Decimal("0"),
                percent_change=0.0,
                annualized_return=0.0,
                volatility=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0,
                periodic_returns={}
            )
        
        starting_value = portfolio_values[0]["value"]
        ending_value = portfolio_values[-1]["value"]
        absolute_change = ending_value - starting_value
        
        # Calculate percent change
        percent_change = float(
            (absolute_change / starting_value * 100) if starting_value > 0 else 0
        )
        
        # Calculate annualized return
        days_diff = (end_date - start_date).days
        if days_diff > 0:
            annualized_return = float(
                (((ending_value / starting_value) ** (365.25 / days_diff)) - 1) * 100
            )
        else:
            annualized_return = 0.0
        
        # Calculate daily returns for risk metrics
        daily_returns = self._calculate_daily_returns(portfolio_values)
        
        # Calculate volatility (standard deviation of returns)
        volatility = self._calculate_volatility(daily_returns)
        
        # Calculate Sharpe ratio
        sharpe_ratio = self._calculate_sharpe_ratio(daily_returns, volatility)
        
        # Calculate maximum drawdown
        max_drawdown = self._calculate_max_drawdown(portfolio_values)
        
        # Calculate periodic returns
        periodic_returns = self._calculate_periodic_returns(
            portfolio_values, timeframe
        )
        
        return PerformanceMetrics(
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date,
            starting_value=starting_value,
            ending_value=ending_value,
            absolute_change=absolute_change,
            percent_change=percent_change,
            annualized_return=annualized_return,
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            periodic_returns=periodic_returns
        )
    
    async def calculate_risk_metrics(
        self,
        positions: List[Position],
        transactions: List[Transaction],
        timeframe: str = "ytd"
    ) -> RiskMetrics:
        """Calculate comprehensive risk metrics"""
        
        end_date = datetime.utcnow()
        start_date = self._get_start_date_for_timeframe(timeframe, end_date)
        
        # Get portfolio values for calculations
        portfolio_values = await self._get_portfolio_values(
            positions, transactions, start_date, end_date
        )
        
        if len(portfolio_values) < 2:
            return RiskMetrics(
                volatility=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0
            )
        
        # Calculate daily returns
        daily_returns = self._calculate_daily_returns(portfolio_values)
        
        # Calculate volatility (annualized standard deviation)
        volatility = self._calculate_volatility(daily_returns)
        
        # Calculate Sharpe ratio
        sharpe_ratio = self._calculate_sharpe_ratio(daily_returns, volatility)
        
        # Calculate Sortino ratio (downside deviation)
        sortino_ratio = self._calculate_sortino_ratio(daily_returns)
        
        # Calculate maximum drawdown
        max_drawdown = self._calculate_max_drawdown(portfolio_values)
        max_drawdown_start, max_drawdown_end = self._get_max_drawdown_period(
            portfolio_values
        )
        
        # Calculate Value at Risk (VaR)
        var_95 = self._calculate_var(daily_returns, 0.95)
        var_99 = self._calculate_var(daily_returns, 0.99)
        
        return RiskMetrics(
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_drawdown,
            max_drawdown_start=max_drawdown_start,
            max_drawdown_end=max_drawdown_end,
            var_95=var_95,
            var_99=var_99
        )
    
    async def compare_to_benchmark(
        self,
        portfolio_performance: PerformanceMetrics,
        benchmark_symbol: str = "SPY"
    ) -> Dict[str, float]:
        """Compare portfolio performance to benchmark"""
        
        # For now, return mock benchmark data
        # In production, this would fetch actual benchmark data
        benchmark_data = {
            "SPY": {
                "daily": 0.05,
                "weekly": 0.12,
                "monthly": 0.45,
                "ytd": 8.5,
                "all": 10.2
            },
            "QQQ": {
                "daily": 0.08,
                "weekly": 0.18,
                "monthly": 0.65,
                "ytd": 12.3,
                "all": 15.8
            }
        }
        
        if benchmark_symbol not in benchmark_data:
            benchmark_symbol = "SPY"
        
        benchmark_return = benchmark_data[benchmark_symbol].get(
            portfolio_performance.timeframe, 0.0
        )
        
        return {
            "benchmark_symbol": benchmark_symbol,
            "benchmark_return": benchmark_return,
            "portfolio_return": portfolio_performance.percent_change,
            "relative_performance": portfolio_performance.percent_change - benchmark_return,
            "outperformed": portfolio_performance.percent_change > benchmark_return
        }
    
    def _get_start_date_for_timeframe(self, timeframe: str, end_date: datetime) -> datetime:
        """Get start date based on timeframe"""
        if timeframe == "daily":
            return end_date - timedelta(days=1)
        elif timeframe == "weekly":
            return end_date - timedelta(weeks=1)
        elif timeframe == "monthly":
            return end_date - timedelta(days=30)
        elif timeframe == "ytd":
            return datetime(end_date.year, 1, 1)
        elif timeframe == "all":
            return end_date - timedelta(days=365 * 5)  # 5 years
        else:
            return end_date - timedelta(days=30)
    
    async def _get_portfolio_values(
        self,
        positions: List[Position],
        transactions: List[Transaction],
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get historical portfolio values"""
        
        # For now, generate mock historical data
        # In production, this would query actual historical data
        portfolio_values = []
        current_date = start_date
        
        # Calculate current total value
        current_value = sum(p.market_value or 0 for p in positions)
        
        # Generate daily values with some variation
        days_diff = (end_date - start_date).days
        if days_diff <= 0:
            days_diff = 1
        
        for i in range(days_diff + 1):
            date = start_date + timedelta(days=i)
            
            # Simple simulation: start with 90% of current value and grow to current
            base_value = current_value * Decimal("0.9")
            growth_factor = Decimal(str(i / days_diff * 0.1))
            daily_variation = Decimal(str((hash(str(date)) % 1000 - 500) / 50000))  # ±1% variation
            
            value = base_value + (current_value * growth_factor) + (current_value * daily_variation)
            
            portfolio_values.append({
                "date": date,
                "value": max(value, Decimal("1000"))  # Minimum value
            })
        
        return portfolio_values
    
    def _calculate_daily_returns(self, portfolio_values: List[Dict[str, Any]]) -> List[float]:
        """Calculate daily returns from portfolio values"""
        if len(portfolio_values) < 2:
            return []
        
        returns = []
        for i in range(1, len(portfolio_values)):
            prev_value = float(portfolio_values[i-1]["value"])
            curr_value = float(portfolio_values[i]["value"])
            
            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                returns.append(daily_return)
        
        return returns
    
    def _calculate_volatility(self, daily_returns: List[float]) -> float:
        """Calculate annualized volatility"""
        if len(daily_returns) < 2:
            return 0.0
        
        std_dev = statistics.stdev(daily_returns)
        # Annualize the daily volatility
        annualized_volatility = std_dev * math.sqrt(self.trading_days_per_year)
        return annualized_volatility * 100  # Convert to percentage
    
    def _calculate_sharpe_ratio(self, daily_returns: List[float], volatility: float) -> float:
        """Calculate Sharpe ratio"""
        if len(daily_returns) < 2 or volatility == 0:
            return 0.0
        
        avg_daily_return = statistics.mean(daily_returns)
        annualized_return = (1 + avg_daily_return) ** self.trading_days_per_year - 1
        
        excess_return = annualized_return - self.risk_free_rate
        return excess_return / (volatility / 100)  # Convert volatility back to decimal
    
    def _calculate_sortino_ratio(self, daily_returns: List[float]) -> float:
        """Calculate Sortino ratio (uses downside deviation)"""
        if len(daily_returns) < 2:
            return 0.0
        
        avg_return = statistics.mean(daily_returns)
        downside_returns = [r for r in daily_returns if r < 0]
        
        if not downside_returns:
            return float('inf')  # No downside risk
        
        downside_deviation = statistics.stdev(downside_returns)
        annualized_downside_deviation = downside_deviation * math.sqrt(self.trading_days_per_year)
        
        annualized_return = (1 + avg_return) ** self.trading_days_per_year - 1
        excess_return = annualized_return - self.risk_free_rate
        
        return excess_return / annualized_downside_deviation
    
    def _calculate_max_drawdown(self, portfolio_values: List[Dict[str, Any]]) -> float:
        """Calculate maximum drawdown"""
        if len(portfolio_values) < 2:
            return 0.0
        
        peak = float(portfolio_values[0]["value"])
        max_drawdown = 0.0
        
        for value_data in portfolio_values[1:]:
            current_value = float(value_data["value"])
            peak = max(peak, current_value)
            
            if peak > 0:
                drawdown = (peak - current_value) / peak
                max_drawdown = max(max_drawdown, drawdown)
        
        return max_drawdown * 100  # Convert to percentage
    
    def _get_max_drawdown_period(
        self, portfolio_values: List[Dict[str, Any]]
    ) -> tuple[Optional[datetime], Optional[datetime]]:
        """Get the period when maximum drawdown occurred"""
        if len(portfolio_values) < 2:
            return None, None
        
        peak = float(portfolio_values[0]["value"])
        max_drawdown = 0.0
        max_drawdown_start = None
        max_drawdown_end = None
        current_peak_date = portfolio_values[0]["date"]
        
        for value_data in portfolio_values[1:]:
            current_value = float(value_data["value"])
            current_date = value_data["date"]
            
            if current_value > peak:
                peak = current_value
                current_peak_date = current_date
            elif peak > 0:
                drawdown = (peak - current_value) / peak
                if drawdown > max_drawdown:
                    max_drawdown = drawdown
                    max_drawdown_start = current_peak_date
                    max_drawdown_end = current_date
        
        return max_drawdown_start, max_drawdown_end
    
    def _calculate_var(self, daily_returns: List[float], confidence_level: float) -> float:
        """Calculate Value at Risk (VaR) at given confidence level"""
        if len(daily_returns) < 10:  # Need sufficient data
            return 0.0
        
        sorted_returns = sorted(daily_returns)
        index = int((1 - confidence_level) * len(sorted_returns))
        
        if index >= len(sorted_returns):
            index = len(sorted_returns) - 1
        
        return abs(sorted_returns[index] * 100)  # Convert to percentage
    
    def _calculate_periodic_returns(
        self, portfolio_values: List[Dict[str, Any]], timeframe: str
    ) -> Dict[str, float]:
        """Calculate returns for different periods"""
        if len(portfolio_values) < 2:
            return {}
        
        # For simplicity, return mock periodic returns
        # In production, this would calculate actual periodic returns
        returns = {}
        
        if timeframe in ["weekly", "monthly", "ytd", "all"]:
            # Calculate weekly returns for the period
            weekly_returns = []
            for i in range(0, len(portfolio_values), 7):
                if i + 7 < len(portfolio_values):
                    start_val = float(portfolio_values[i]["value"])
                    end_val = float(portfolio_values[i + 7]["value"])
                    if start_val > 0:
                        weekly_return = (end_val - start_val) / start_val * 100
                        weekly_returns.append(weekly_return)
            
            if weekly_returns:
                returns["weekly_avg"] = statistics.mean(weekly_returns)
                returns["weekly_std"] = statistics.stdev(weekly_returns) if len(weekly_returns) > 1 else 0
        
        return returns