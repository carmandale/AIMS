"""Benchmark data service for fetching and caching benchmark performance data"""

import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any, Optional, List
from decimal import Decimal

from sqlalchemy.orm import Session
import yfinance as yf
import numpy as np

# Removed cache import - will implement custom caching if needed

logger = logging.getLogger(__name__)


class BenchmarkService:
    """Service for fetching and analyzing benchmark data"""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.risk_free_rate = 0.02  # Default 2% risk-free rate

    def get_benchmark_data(
        self, symbol: str, start_date: date, end_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch benchmark data from yfinance
        
        Args:
            symbol: Benchmark symbol (e.g., SPY, QQQ)
            start_date: Start date for data
            end_date: End date for data
            
        Returns:
            Dictionary with benchmark performance data
        """
        try:
            # Fetch data from yfinance
            ticker = yf.Ticker(symbol)
            
            # Add buffer days to ensure we get data for the full period
            buffer_start = start_date - timedelta(days=7)
            hist = ticker.history(start=buffer_start, end=end_date + timedelta(days=1))
            
            if hist.empty:
                logger.warning(f"No data found for benchmark {symbol}")
                return None
            
            # Calculate returns
            hist['Daily_Return'] = hist['Close'].pct_change()
            
            # Filter to actual date range
            hist = hist[hist.index.date >= start_date]
            hist = hist[hist.index.date <= end_date]
            
            if hist.empty:
                return None
            
            # Calculate metrics
            total_return = (hist['Close'].iloc[-1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0]
            
            # Calculate volatility (annualized)
            daily_returns = hist['Daily_Return'].dropna()
            volatility = daily_returns.std() * np.sqrt(252)  # Annualized
            
            # Calculate Sharpe ratio
            avg_daily_return = daily_returns.mean()
            annual_return = (1 + avg_daily_return) ** 252 - 1
            sharpe_ratio = (annual_return - self.risk_free_rate) / volatility if volatility > 0 else 0
            
            # Format returns for time series
            returns = {}
            cumulative_return = 1.0
            first_close = hist['Close'].iloc[0]
            
            for idx, row in hist.iterrows():
                date_str = idx.date().isoformat()
                current_return = (row['Close'] - first_close) / first_close
                returns[date_str] = current_return
            
            return {
                "symbol": symbol,
                "total_return": float(total_return),
                "volatility": float(volatility),
                "sharpe_ratio": float(sharpe_ratio),
                "returns": returns,
                "start_price": float(hist['Close'].iloc[0]),
                "end_price": float(hist['Close'].iloc[-1]),
                "data_points": len(hist),
            }
            
        except Exception as e:
            logger.error(f"Error fetching benchmark data for {symbol}: {e}")
            return None

    def validate_symbol(self, symbol: str) -> bool:
        """
        Validate if a symbol exists and has data
        
        Args:
            symbol: Ticker symbol to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Check if we got valid data
            if info and 'symbol' in info:
                return True
            
            # Try to fetch recent data as a backup check
            hist = ticker.history(period="5d")
            return not hist.empty
            
        except Exception as e:
            logger.warning(f"Symbol validation failed for {symbol}: {e}")
            return False

    def get_multiple_benchmarks(
        self, symbols: List[str], start_date: date, end_date: date
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch data for multiple benchmarks
        
        Args:
            symbols: List of benchmark symbols
            start_date: Start date for data
            end_date: End date for data
            
        Returns:
            Dictionary mapping symbols to their data
        """
        results = {}
        
        for symbol in symbols:
            data = self.get_benchmark_data(symbol, start_date, end_date)
            results[symbol] = data
            
        return results

    def calculate_correlation(
        self, portfolio_returns: List[float], benchmark_returns: List[float]
    ) -> Optional[float]:
        """
        Calculate correlation between portfolio and benchmark returns
        
        Args:
            portfolio_returns: List of portfolio returns
            benchmark_returns: List of benchmark returns
            
        Returns:
            Correlation coefficient
        """
        if len(portfolio_returns) != len(benchmark_returns) or len(portfolio_returns) < 2:
            return None
            
        try:
            correlation = np.corrcoef(portfolio_returns, benchmark_returns)[0, 1]
            return float(correlation)
        except Exception as e:
            logger.error(f"Error calculating correlation: {e}")
            return None

    def calculate_beta(
        self, portfolio_returns: List[float], benchmark_returns: List[float]
    ) -> Optional[float]:
        """
        Calculate beta (market sensitivity) of portfolio vs benchmark
        
        Args:
            portfolio_returns: List of portfolio returns
            benchmark_returns: List of benchmark returns
            
        Returns:
            Beta coefficient
        """
        if len(portfolio_returns) != len(benchmark_returns) or len(portfolio_returns) < 2:
            return None
            
        try:
            # Calculate covariance and variance
            covariance = np.cov(portfolio_returns, benchmark_returns)[0, 1]
            benchmark_variance = np.var(benchmark_returns)
            
            if benchmark_variance == 0:
                return None
                
            beta = covariance / benchmark_variance
            return float(beta)
        except Exception as e:
            logger.error(f"Error calculating beta: {e}")
            return None

    def get_risk_free_rate(self) -> float:
        """
        Get current risk-free rate (10-year Treasury yield)
        
        Returns:
            Current risk-free rate as decimal
        """
        try:
            # Fetch 10-year Treasury yield
            treasury = yf.Ticker("^TNX")
            hist = treasury.history(period="1d")
            
            if not hist.empty:
                # Convert from percentage to decimal
                return float(hist['Close'].iloc[-1] / 100)
            
        except Exception as e:
            logger.warning(f"Failed to fetch risk-free rate: {e}")
        
        # Return default if fetch fails
        return self.risk_free_rate