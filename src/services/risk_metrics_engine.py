"""Risk metrics calculation engine"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any, Tuple
import statistics
import math

from src.data.models.portfolio import Position, Transaction, RiskMetrics
from src.services.performance_calculator import PerformanceCalculator

logger = logging.getLogger(__name__)


class RiskMetricsEngine:
    """Engine for calculating comprehensive portfolio risk metrics"""

    def __init__(self):
        self.performance_calculator = PerformanceCalculator()
        self.risk_free_rate = 0.05  # 5% annual risk-free rate
        self.trading_days_per_year = 252
        self.confidence_levels = [0.95, 0.99]

    async def calculate_comprehensive_risk_metrics(
        self, positions: List[Position], transactions: List[Transaction], timeframe: str = "ytd"
    ) -> RiskMetrics:
        """Calculate comprehensive risk metrics for the portfolio"""

        end_date = datetime.utcnow()
        start_date = self._get_start_date_for_timeframe(timeframe, end_date)

        # Get portfolio value history
        portfolio_values = await self.performance_calculator._get_portfolio_values(
            positions, transactions, start_date, end_date
        )

        if len(portfolio_values) < 2:
            return self._get_default_risk_metrics()

        # Calculate daily returns
        daily_returns = self._calculate_daily_returns(portfolio_values)

        if len(daily_returns) < 2:
            return self._get_default_risk_metrics()

        # Calculate core risk metrics
        volatility = self._calculate_volatility(daily_returns)
        sharpe_ratio = self._calculate_sharpe_ratio(daily_returns)
        sortino_ratio = self._calculate_sortino_ratio(daily_returns)
        max_drawdown = self._calculate_max_drawdown(portfolio_values)

        # Calculate drawdown period
        max_drawdown_start, max_drawdown_end = self._calculate_max_drawdown_period(portfolio_values)

        # Calculate Value at Risk (VaR)
        var_95 = self._calculate_var(daily_returns, 0.95)
        var_99 = self._calculate_var(daily_returns, 0.99)

        # Calculate beta and alpha (against market benchmark)
        beta, alpha, r_squared = await self._calculate_beta_alpha(daily_returns, timeframe)

        return RiskMetrics(
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            max_drawdown=max_drawdown,
            max_drawdown_start=max_drawdown_start,
            max_drawdown_end=max_drawdown_end,
            beta=beta,
            alpha=alpha,
            r_squared=r_squared,
            var_95=var_95,
            var_99=var_99,
        )

    async def calculate_position_risk_contribution(
        self, positions: List[Position], total_portfolio_value: Decimal
    ) -> Dict[str, Dict[str, float]]:
        """Calculate risk contribution of each position"""

        risk_contributions = {}

        for position in positions:
            if not position.market_value or total_portfolio_value <= 0:
                continue

            weight = float(position.market_value / total_portfolio_value)

            # Get position-specific risk metrics
            position_volatility = await self._estimate_position_volatility(position)
            position_beta = await self._estimate_position_beta(position)

            # Calculate risk contribution
            risk_contributions[position.symbol] = {
                "weight": weight,
                "volatility": position_volatility,
                "beta": position_beta,
                "risk_contribution": weight * position_volatility,
                "systematic_risk": weight * position_beta,
                "specific_risk": weight
                * math.sqrt(max(0, position_volatility**2 - position_beta**2)),
            }

        return risk_contributions

    async def calculate_portfolio_stress_test(
        self, positions: List[Position], scenarios: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Dict[str, float]]:
        """Run stress tests on the portfolio"""

        if not scenarios:
            scenarios = [
                {"name": "Market Crash", "market_change": -0.30, "volatility_multiplier": 2.0},
                {"name": "Recession", "market_change": -0.20, "volatility_multiplier": 1.5},
                {
                    "name": "Interest Rate Spike",
                    "market_change": -0.15,
                    "volatility_multiplier": 1.3,
                },
                {"name": "Inflation Surge", "market_change": -0.10, "volatility_multiplier": 1.2},
                {"name": "Bull Market", "market_change": 0.25, "volatility_multiplier": 0.8},
            ]

        stress_results = {}
        current_value = sum(p.market_value or 0 for p in positions)

        for scenario in scenarios:
            scenario_name = scenario["name"]
            market_change = scenario["market_change"]
            volatility_multiplier = scenario.get("volatility_multiplier", 1.0)

            # Calculate scenario impact
            scenario_value = current_value * (1 + Decimal(str(market_change)))
            absolute_change = scenario_value - current_value

            # Calculate position-specific impacts
            position_impacts = {}
            for position in positions:
                if not position.market_value:
                    continue

                # Apply scenario-specific adjustments based on asset type
                position_multiplier = self._get_scenario_multiplier(position, scenario_name)

                position_scenario_change = (
                    market_change * position_multiplier * volatility_multiplier
                )
                position_new_value = position.market_value * (
                    1 + Decimal(str(position_scenario_change))
                )

                position_impacts[position.symbol] = {
                    "current_value": float(position.market_value),
                    "scenario_value": float(position_new_value),
                    "absolute_change": float(position_new_value - position.market_value),
                    "percent_change": position_scenario_change * 100,
                }

            stress_results[scenario_name] = {  # type: ignore
                "portfolio_impact": {
                    "current_value": float(current_value),
                    "scenario_value": float(scenario_value),
                    "absolute_change": float(absolute_change),
                    "percent_change": market_change * 100,
                },
                "position_impacts": position_impacts,
            }

        return stress_results

    async def calculate_concentration_risk(
        self, positions: List[Position], total_portfolio_value: Decimal
    ) -> Dict[str, Any]:
        """Calculate concentration risk metrics"""

        if not positions or total_portfolio_value <= 0:
            return {}

        # Calculate position weights
        weights = []
        position_data = []

        for position in positions:
            if position.market_value:
                weight = float(position.market_value / total_portfolio_value)
                weights.append(weight)
                position_data.append(
                    {
                        "symbol": position.symbol,
                        "weight": weight,
                        "value": float(position.market_value),
                    }
                )

        if not weights:
            return {}

        # Calculate concentration metrics
        herfindahl_index = sum(w**2 for w in weights)
        effective_positions = 1 / herfindahl_index if herfindahl_index > 0 else 0

        # Calculate largest positions
        sorted_positions = sorted(
            position_data, key=lambda x: x["weight"], reverse=True
        )  # type: ignore

        top_5_concentration = sum(p["weight"] for p in sorted_positions[:5])  # type: ignore
        top_10_concentration = sum(p["weight"] for p in sorted_positions[:10])  # type: ignore

        return {
            "herfindahl_index": herfindahl_index,
            "effective_number_of_positions": effective_positions,
            "largest_position_weight": sorted_positions[0]["weight"] if sorted_positions else 0,
            "top_5_concentration": top_5_concentration,
            "top_10_concentration": top_10_concentration,
            "number_of_positions": len(positions),
            "concentration_score": self._calculate_concentration_score(
                herfindahl_index, len(positions)
            ),
        }

    def _get_default_risk_metrics(self) -> RiskMetrics:
        """Return default risk metrics when insufficient data"""
        return RiskMetrics(volatility=0.0, sharpe_ratio=0.0, max_drawdown=0.0)

    def _get_start_date_for_timeframe(self, timeframe: str, end_date: datetime) -> datetime:
        """Get start date based on timeframe"""
        if timeframe == "daily":
            return end_date - timedelta(days=1)
        elif timeframe == "weekly":
            return end_date - timedelta(weeks=1)
        elif timeframe == "monthly":
            return end_date - timedelta(days=30)
        elif timeframe == "quarterly":
            return end_date - timedelta(days=90)
        elif timeframe == "ytd":
            return datetime(end_date.year, 1, 1)
        elif timeframe == "1y":
            return end_date - timedelta(days=365)
        elif timeframe == "all":
            return end_date - timedelta(days=365 * 5)
        else:
            return end_date - timedelta(days=252)  # 1 trading year

    def _calculate_daily_returns(self, portfolio_values: List[Dict[str, Any]]) -> List[float]:
        """Calculate daily returns from portfolio values"""
        if len(portfolio_values) < 2:
            return []

        returns = []
        for i in range(1, len(portfolio_values)):
            prev_value = float(portfolio_values[i - 1]["value"])
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
        annualized_volatility = std_dev * math.sqrt(self.trading_days_per_year)
        return annualized_volatility * 100

    def _calculate_sharpe_ratio(self, daily_returns: List[float]) -> float:
        """Calculate Sharpe ratio"""
        if len(daily_returns) < 2:
            return 0.0

        avg_daily_return = statistics.mean(daily_returns)
        annualized_return = ((1 + avg_daily_return) ** self.trading_days_per_year) - 1

        if len(daily_returns) < 2:
            return 0.0

        daily_volatility = statistics.stdev(daily_returns)
        annualized_volatility = daily_volatility * math.sqrt(self.trading_days_per_year)

        if annualized_volatility == 0:
            return 0.0

        excess_return = annualized_return - self.risk_free_rate
        return excess_return / annualized_volatility

    def _calculate_sortino_ratio(self, daily_returns: List[float]) -> float:
        """Calculate Sortino ratio"""
        if len(daily_returns) < 2:
            return 0.0

        avg_return = statistics.mean(daily_returns)
        downside_returns = [r for r in daily_returns if r < 0]

        if not downside_returns:
            return float("inf")

        downside_deviation = statistics.stdev(downside_returns)
        annualized_downside_deviation = downside_deviation * math.sqrt(self.trading_days_per_year)

        if annualized_downside_deviation == 0:
            return 0.0

        annualized_return = ((1 + avg_return) ** self.trading_days_per_year) - 1
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

        return max_drawdown * 100

    def _calculate_max_drawdown_period(
        self, portfolio_values: List[Dict[str, Any]]
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        """Calculate the period of maximum drawdown"""
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
        """Calculate Value at Risk"""
        if len(daily_returns) < 10:
            return 0.0

        sorted_returns = sorted(daily_returns)
        index = int((1 - confidence_level) * len(sorted_returns))

        if index >= len(sorted_returns):
            index = len(sorted_returns) - 1

        return abs(sorted_returns[index] * 100)

    async def _calculate_beta_alpha(
        self, daily_returns: List[float], timeframe: str
    ) -> Tuple[Optional[float], Optional[float], Optional[float]]:
        """Calculate beta and alpha against market benchmark"""

        if len(daily_returns) < 20:  # Need sufficient data
            return None, None, None

        # Generate mock market returns (in production, fetch actual market data)
        market_returns = self._generate_mock_market_returns(len(daily_returns))

        if len(market_returns) != len(daily_returns):
            return None, None, None

        # Calculate beta using covariance
        portfolio_variance = statistics.variance(daily_returns)
        market_variance = statistics.variance(market_returns)

        if market_variance == 0:
            return None, None, None

        # Calculate covariance
        mean_portfolio = statistics.mean(daily_returns)
        mean_market = statistics.mean(market_returns)

        covariance = sum(
            (p - mean_portfolio) * (m - mean_market) for p, m in zip(daily_returns, market_returns)
        ) / len(daily_returns)

        beta = covariance / market_variance

        # Calculate alpha
        portfolio_return = statistics.mean(daily_returns) * self.trading_days_per_year
        market_return = statistics.mean(market_returns) * self.trading_days_per_year
        alpha = portfolio_return - (
            self.risk_free_rate + beta * (market_return - self.risk_free_rate)
        )

        # Calculate R-squared
        correlation = covariance / (math.sqrt(portfolio_variance) * math.sqrt(market_variance))
        r_squared = correlation**2

        return beta, alpha, r_squared

    def _generate_mock_market_returns(self, num_returns: int) -> List[float]:
        """Generate mock market returns for beta calculation"""
        # In production, this would fetch actual market data
        import random

        random.seed(42)  # For reproducibility

        returns = []
        for _ in range(num_returns):
            # Generate returns with market-like characteristics
            base_return = random.normalvariate(0.0005, 0.01)  # ~0.05% daily mean, 1% std
            returns.append(base_return)

        return returns

    async def _estimate_position_volatility(self, position: Position) -> float:
        """Estimate volatility for individual position"""
        # In production, this would use historical price data
        # For now, return estimated volatility based on asset type

        volatility_estimates = {
            "crypto": 0.80,  # 80% annualized volatility
            "stock": 0.25,  # 25% annualized volatility
            "etf": 0.18,  # 18% annualized volatility
            "bond": 0.05,  # 5% annualized volatility
            "option": 0.50,  # 50% annualized volatility
        }

        return volatility_estimates.get(position.position_type, 0.20)

    async def _estimate_position_beta(self, position: Position) -> float:
        """Estimate beta for individual position"""
        # In production, this would calculate actual beta from historical data
        # For now, return estimated beta based on asset type and symbol

        beta_estimates = {
            "AAPL": 1.2,
            "MSFT": 0.9,
            "GOOGL": 1.1,
            "AMZN": 1.3,
            "TSLA": 2.0,
            "SPY": 1.0,
            "QQQ": 1.1,
            "VTI": 1.0,
            "BTC": 2.5,
            "ETH": 2.2,
        }

        return beta_estimates.get(position.symbol, 1.0)

    def _get_scenario_multiplier(self, position: Position, scenario_name: str) -> float:
        """Get scenario-specific multiplier for position"""

        # Different asset types react differently to scenarios
        multipliers = {
            "Market Crash": {"crypto": 2.0, "stock": 1.0, "etf": 1.0, "bond": -0.2, "option": 3.0},
            "Recession": {"crypto": 1.5, "stock": 1.0, "etf": 1.0, "bond": -0.1, "option": 2.0},
            "Interest Rate Spike": {
                "crypto": 1.2,
                "stock": 0.8,
                "etf": 0.8,
                "bond": 1.5,
                "option": 1.5,
            },
            "Bull Market": {"crypto": 1.5, "stock": 1.0, "etf": 1.0, "bond": 0.3, "option": 2.0},
        }

        scenario_multipliers = multipliers.get(scenario_name, {})
        return scenario_multipliers.get(position.position_type, 1.0)

    def _calculate_concentration_score(self, herfindahl_index: float, num_positions: int) -> float:
        """Calculate concentration score (0-100, lower is better)"""

        # Ideal diversification benchmarks
        ideal_herfindahl = 0.05  # 20 equal positions
        ideal_positions = 20

        # Herfindahl component (0-50 points)
        herfindahl_score = min(herfindahl_index / ideal_herfindahl * 50, 50)

        # Position count component (0-50 points)
        position_score = max(0, 50 - (num_positions / ideal_positions * 50))

        return herfindahl_score + position_score
