"""Asset allocation analysis service"""

import logging
from decimal import Decimal
from typing import List, Dict, Optional, Any
from collections import defaultdict
import math

from src.data.models.portfolio import (
    Position,
    AssetAllocation,
    ConcentrationRisk,
    RebalancingAction,
)

logger = logging.getLogger(__name__)


class AllocationAnalyzer:
    """Service for analyzing portfolio allocation and diversification"""

    def __init__(self):
        # Asset classification mappings
        self.asset_class_mapping = {
            "stock": "stocks",
            "etf": "etfs",
            "bond": "bonds",
            "crypto": "crypto",
            "option": "options",
            "cash": "cash",
        }

        # Sector mappings (simplified)
        self.sector_mapping = {
            "AAPL": "Technology",
            "MSFT": "Technology",
            "GOOGL": "Technology",
            "AMZN": "Consumer Discretionary",
            "TSLA": "Consumer Discretionary",
            "NVDA": "Technology",
            "META": "Technology",
            "JPM": "Financials",
            "JNJ": "Healthcare",
            "PG": "Consumer Staples",
            "SPY": "Diversified",
            "QQQ": "Technology",
            "VTI": "Diversified",
            "BTC": "Crypto",
            "ETH": "Crypto",
            "SOL": "Crypto",
            "MATIC": "Crypto",
        }

        # Geography mappings
        self.geography_mapping = {
            "AAPL": "US",
            "MSFT": "US",
            "GOOGL": "US",
            "AMZN": "US",
            "TSLA": "US",
            "NVDA": "US",
            "META": "US",
            "JPM": "US",
            "JNJ": "US",
            "PG": "US",
            "SPY": "US",
            "QQQ": "US",
            "VTI": "US",
            "BTC": "Global",
            "ETH": "Global",
            "SOL": "Global",
            "MATIC": "Global",
        }

        # Concentration risk thresholds
        self.concentration_thresholds = {
            "position": 0.10,  # 10% for individual positions
            "sector": 0.25,  # 25% for sectors
            "geography": 0.30,  # 30% for geography
        }

    async def analyze_allocation(
        self, positions: List[Position], cash_balance: Decimal = Decimal("0")
    ) -> AssetAllocation:
        """Analyze portfolio asset allocation"""

        if not positions:
            return AssetAllocation(
                by_asset_class={"cash": 1.0},
                by_sector={"cash": 1.0},
                by_geography={"cash": 1.0},
                by_brokerage={"cash": 1.0},
                concentration_risks=[],
                diversification_score=0.0,
            )

        # Calculate total portfolio value
        total_value = sum(p.market_value or 0 for p in positions) + cash_balance

        if total_value <= 0:
            return AssetAllocation(
                by_asset_class={},
                by_sector={},
                by_geography={},
                by_brokerage={},
                concentration_risks=[],
                diversification_score=0.0,
            )

        # Calculate allocation breakdowns
        by_asset_class = self._calculate_asset_class_allocation(
            positions, cash_balance, total_value
        )
        by_sector = self._calculate_sector_allocation(positions, total_value)
        by_geography = self._calculate_geography_allocation(positions, total_value)
        by_brokerage = self._calculate_brokerage_allocation(positions, total_value)

        # Detect concentration risks
        concentration_risks = self._detect_concentration_risks(
            positions, by_sector, by_geography, total_value
        )

        # Calculate diversification score
        diversification_score = self._calculate_diversification_score(
            by_asset_class, by_sector, by_geography, len(positions)
        )

        # Calculate position concentration metrics
        position_values = [float(p.market_value or 0) for p in positions]
        position_percentages = [val / float(total_value) * 100 for val in position_values]

        largest_position_percent = max(position_percentages) if position_percentages else 0
        top_5_positions_percent = sum(sorted(position_percentages, reverse=True)[:5])

        return AssetAllocation(
            by_asset_class=by_asset_class,
            by_sector=by_sector,
            by_geography=by_geography,
            by_brokerage=by_brokerage,
            concentration_risks=[risk.model_dump() for risk in concentration_risks],
            diversification_score=diversification_score,
            largest_position_percent=largest_position_percent,
            top_5_positions_percent=top_5_positions_percent,
        )

    async def compare_to_target_allocation(
        self, current_allocation: AssetAllocation, target_allocation: Dict[str, float]
    ) -> Dict[str, Any]:
        """Compare current allocation to target allocation"""

        drift_analysis = {}
        total_drift = 0.0

        for category, target_percent in target_allocation.items():
            current_percent = current_allocation.by_asset_class.get(category, 0.0)
            drift = abs(current_percent - target_percent)
            total_drift += drift

            drift_analysis[category] = {
                "target": target_percent,
                "current": current_percent,
                "drift": drift,
                "needs_rebalancing": drift > 0.05,  # 5% threshold
            }

        return {
            "drift_analysis": drift_analysis,
            "total_drift": total_drift,
            "rebalancing_needed": total_drift > 0.10,  # 10% total drift threshold
        }

    async def suggest_rebalancing_actions(
        self,
        positions: List[Position],
        target_allocation: Dict[str, float],
        total_portfolio_value: Decimal,
        drift_threshold: float = 0.05,
    ) -> List[RebalancingAction]:
        """Suggest rebalancing actions based on allocation drift"""

        current_allocation = await self.analyze_allocation(positions)
        actions = []

        for asset_class, target_percent in target_allocation.items():
            current_percent = current_allocation.by_asset_class.get(asset_class, 0.0)
            drift = current_percent - target_percent

            if abs(drift) > drift_threshold:
                # Find positions in this asset class
                relevant_positions = [
                    p
                    for p in positions
                    if self.asset_class_mapping.get(p.position_type, "unknown") == asset_class
                ]

                if drift > 0:  # Overweight - need to sell
                    # Find the largest position to sell
                    if relevant_positions:
                        largest_position = max(
                            relevant_positions, key=lambda p: p.market_value or 0
                        )
                        suggested_amount = total_portfolio_value * Decimal(str(abs(drift) / 100))

                        actions.append(
                            RebalancingAction(
                                action_type="sell",
                                symbol=largest_position.symbol,
                                current_allocation=current_percent,
                                target_allocation=target_percent,
                                drift=drift,
                                suggested_amount=suggested_amount,
                                priority="high" if abs(drift) > 0.10 else "medium",
                                reason=f"Reduce overweight in {asset_class} ({drift:.1f}% over target)",
                            )
                        )

                else:  # Underweight - need to buy
                    suggested_amount = total_portfolio_value * Decimal(str(abs(drift) / 100))

                    # Suggest a representative symbol for the asset class
                    suggested_symbol = self._get_representative_symbol(asset_class)

                    actions.append(
                        RebalancingAction(
                            action_type="buy",
                            symbol=suggested_symbol,
                            current_allocation=current_percent,
                            target_allocation=target_percent,
                            drift=drift,
                            suggested_amount=suggested_amount,
                            priority="high" if abs(drift) > 0.10 else "medium",
                            reason=f"Increase underweight in {asset_class} ({abs(drift):.1f}% under target)",
                        )
                    )

        # Sort actions by priority and drift magnitude
        actions.sort(key=lambda x: (x.priority == "high", abs(x.drift)), reverse=True)

        return actions

    def _calculate_asset_class_allocation(
        self, positions: List[Position], cash_balance: Decimal, total_value: Decimal
    ) -> Dict[str, float]:
        """Calculate allocation by asset class"""

        allocation: Dict[str, float] = defaultdict(float)

        # Add cash allocation
        if cash_balance > 0:
            allocation["cash"] = float(cash_balance / total_value * 100)

        # Add positions allocation
        for position in positions:
            asset_class = self.asset_class_mapping.get(position.position_type, "other")
            value_percent = float((position.market_value or 0) / total_value * 100)
            allocation[asset_class] += value_percent

        return dict(allocation)

    def _calculate_sector_allocation(
        self, positions: List[Position], total_value: Decimal
    ) -> Dict[str, float]:
        """Calculate allocation by sector"""

        allocation: Dict[str, float] = defaultdict(float)

        for position in positions:
            sector = self.sector_mapping.get(position.symbol, "Other")
            value_percent = float((position.market_value or 0) / total_value * 100)
            allocation[sector] += value_percent

        return dict(allocation)

    def _calculate_geography_allocation(
        self, positions: List[Position], total_value: Decimal
    ) -> Dict[str, float]:
        """Calculate allocation by geography"""

        allocation: Dict[str, float] = defaultdict(float)

        for position in positions:
            geography = self.geography_mapping.get(position.symbol, "Other")
            value_percent = float((position.market_value or 0) / total_value * 100)
            allocation[geography] += value_percent

        return dict(allocation)

    def _calculate_brokerage_allocation(
        self, positions: List[Position], total_value: Decimal
    ) -> Dict[str, float]:
        """Calculate allocation by brokerage"""

        allocation: Dict[str, float] = defaultdict(float)

        for position in positions:
            brokerage = position.broker.value
            value_percent = float((position.market_value or 0) / total_value * 100)
            allocation[brokerage] += value_percent

        return dict(allocation)

    def _detect_concentration_risks(
        self,
        positions: List[Position],
        by_sector: Dict[str, float],
        by_geography: Dict[str, float],
        total_value: Decimal,
    ) -> List[ConcentrationRisk]:
        """Detect concentration risks in the portfolio"""

        risks = []

        # Check individual position concentration
        for position in positions:
            position_percent = float((position.market_value or 0) / total_value * 100)
            threshold = self.concentration_thresholds["position"] * 100

            if position_percent > threshold:
                severity = "high" if position_percent > 20 else "medium"
                risks.append(
                    ConcentrationRisk(
                        type="position",
                        identifier=position.symbol,
                        percentage=position_percent,
                        threshold=threshold,
                        severity=severity,
                        recommendation=f"Consider reducing position in {position.symbol} to below {threshold}%",
                    )
                )

        # Check sector concentration
        for sector, percentage in by_sector.items():
            threshold = self.concentration_thresholds["sector"] * 100

            if percentage > threshold:
                severity = "high" if percentage > 40 else "medium"
                risks.append(
                    ConcentrationRisk(
                        type="sector",
                        identifier=sector,
                        percentage=percentage,
                        threshold=threshold,
                        severity=severity,
                        recommendation=f"Consider diversifying {sector} sector exposure below {threshold}%",
                    )
                )

        # Check geography concentration
        for geography, percentage in by_geography.items():
            threshold = self.concentration_thresholds["geography"] * 100

            if percentage > threshold:
                severity = "high" if percentage > 50 else "medium"
                risks.append(
                    ConcentrationRisk(
                        type="geography",
                        identifier=geography,
                        percentage=percentage,
                        threshold=threshold,
                        severity=severity,
                        recommendation=f"Consider diversifying {geography} geographic exposure below {threshold}%",
                    )
                )

        return risks

    def _calculate_diversification_score(
        self,
        by_asset_class: Dict[str, float],
        by_sector: Dict[str, float],
        by_geography: Dict[str, float],
        num_positions: int,
    ) -> float:
        """Calculate a diversification score (0-100)"""

        if not by_asset_class:
            return 0.0

        # Calculate entropy-based diversification for each dimension
        asset_class_diversity = self._calculate_entropy(by_asset_class)
        sector_diversity = self._calculate_entropy(by_sector)
        geography_diversity = self._calculate_entropy(by_geography)

        # Position count factor (more positions = better diversification)
        position_factor = min(num_positions / 20, 1.0)  # Normalize to max 20 positions

        # Combine factors (weighted average)
        diversification_score = (
            asset_class_diversity * 0.3
            + sector_diversity * 0.4
            + geography_diversity * 0.2
            + position_factor * 0.1
        ) * 100

        return min(diversification_score, 100.0)

    def _calculate_entropy(self, allocation: Dict[str, float]) -> float:
        """Calculate entropy of an allocation (higher entropy = more diversified)"""

        if not allocation:
            return 0.0

        # Convert percentages to probabilities
        probabilities = [p / 100 for p in allocation.values() if p > 0]

        if not probabilities:
            return 0.0

        # Calculate entropy
        entropy = -sum(p * math.log2(p) for p in probabilities)

        # Normalize by maximum possible entropy
        max_entropy = math.log2(len(probabilities))

        return entropy / max_entropy if max_entropy > 0 else 0.0

    def _get_representative_symbol(self, asset_class: str) -> str:
        """Get a representative symbol for an asset class"""

        representatives = {
            "stocks": "VTI",
            "etfs": "SPY",
            "bonds": "BND",
            "crypto": "BTC",
            "options": "SPY",
            "cash": "CASH",
        }

        return representatives.get(asset_class, "VTI")

    async def calculate_correlation_matrix(
        self, positions: List[Position]
    ) -> Dict[str, Dict[str, float]]:
        """Calculate correlation matrix between assets"""

        # This would typically require historical price data
        # For now, return a mock correlation matrix
        correlation_matrix: Dict[str, Dict[str, float]] = {}

        symbols = [p.symbol for p in positions]

        for symbol1 in symbols:
            correlation_matrix[symbol1] = {}
            for symbol2 in symbols:
                if symbol1 == symbol2:
                    correlation_matrix[symbol1][symbol2] = 1.0
                else:
                    # Mock correlation based on symbol hash
                    # In production, this would be calculated from historical data
                    correlation = (hash(symbol1 + symbol2) % 100 - 50) / 100
                    correlation_matrix[symbol1][symbol2] = correlation

        return correlation_matrix
