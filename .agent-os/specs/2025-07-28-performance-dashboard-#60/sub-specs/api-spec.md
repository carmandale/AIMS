# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-28-performance-dashboard-#60/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Endpoints

### GET /api/performance/metrics

**Purpose:** Retrieve comprehensive performance metrics for the authenticated user's portfolio
**Parameters:** 
- `period` (query, optional): "1D", "7D", "1M", "3M", "6M", "1Y", "YTD", "ALL" (default: "1M")
- `benchmark` (query, optional): "SPY", "QQQ", "NONE" (default: "SPY")

**Response:**
```json
{
  "portfolio_metrics": {
    "total_return": 0.1247,
    "daily_return": 0.0012,
    "monthly_return": 0.0234,
    "yearly_return": 0.1247,
    "sharpe_ratio": 1.45,
    "volatility": 0.1823,
    "max_drawdown": -0.0845,
    "current_value": 624750.00,
    "period_start_value": 600000.00
  },
  "benchmark_metrics": {
    "total_return": 0.1012,
    "volatility": 0.1456,
    "sharpe_ratio": 1.32
  },
  "time_series": [
    {
      "date": "2025-07-01",
      "portfolio_value": 600000.00,
      "portfolio_return": 0.0000,
      "benchmark_return": 0.0000
    },
    {
      "date": "2025-07-02", 
      "portfolio_value": 602100.00,
      "portfolio_return": 0.0035,
      "benchmark_return": 0.0028
    }
  ],
  "last_updated": "2025-07-28T20:15:30Z"
}
```

**Errors:**
- 400: Invalid period or benchmark parameter
- 401: Authentication required
- 500: Calculation error or external data unavailable

### GET /api/performance/historical

**Purpose:** Retrieve historical performance data for extended time periods
**Parameters:**
- `start_date` (query, required): ISO date string (YYYY-MM-DD)
- `end_date` (query, required): ISO date string (YYYY-MM-DD)
- `frequency` (query, optional): "daily", "weekly", "monthly" (default: "daily")

**Response:**
```json
{
  "data": [
    {
      "date": "2025-01-01",
      "portfolio_value": 580000.00,
      "cumulative_return": 0.0000,
      "period_return": 0.0000
    }
  ],
  "summary": {
    "total_return": 0.1247,
    "annualized_return": 0.1156,
    "max_drawdown": -0.0845,
    "volatility": 0.1823,
    "sharpe_ratio": 1.45
  }
}
```

### POST /api/performance/benchmark

**Purpose:** Update or configure custom benchmark for performance comparison
**Parameters:** None (data in request body)

**Request Body:**
```json
{
  "benchmark_type": "custom",
  "symbol": "VTI",
  "name": "Total Stock Market Index",
  "allocation": 1.0
}
```

**Response:**
```json
{
  "message": "Benchmark updated successfully",
  "benchmark": {
    "id": 1,
    "symbol": "VTI", 
    "name": "Total Stock Market Index",
    "allocation": 1.0,
    "created_at": "2025-07-28T20:15:30Z"
  }
}
```

## Controllers

### PerformanceController

**calculate_portfolio_metrics(user_id: int, period: str, benchmark: str)**
- Retrieves portfolio positions from SnapTrade
- Calculates time-weighted returns for specified period
- Computes risk metrics (Sharpe ratio, volatility, max drawdown)
- Fetches benchmark data for comparison
- Returns formatted performance metrics

**get_historical_data(user_id: int, start_date: date, end_date: date, frequency: str)**
- Queries historical portfolio values from database
- Calculates returns for each period based on frequency
- Handles missing data points and holidays
- Returns time series data for charting

**update_benchmark(user_id: int, benchmark_data: dict)**
- Validates benchmark symbol and allocation
- Updates user's custom benchmark configuration
- Triggers recalculation of comparison metrics
- Returns confirmation of benchmark update

## Business Logic

### Returns Calculation Service
- Time-weighted return methodology to handle cash flows
- Daily return calculation: (end_value - start_value + cash_flows) / start_value
- Compound annual growth rate for multi-period returns
- Handles dividends and distributions from SnapTrade data

### Risk Metrics Service  
- Sharpe ratio using 3-month Treasury rate as risk-free rate
- Rolling volatility using standard deviation of daily returns
- Maximum drawdown calculation from peak-to-trough analysis
- Downside deviation for alternative risk measures

### Benchmark Integration Service
- Real-time S&P 500 data fetching via yfinance
- Custom benchmark portfolio construction and tracking
- Correlation analysis between portfolio and benchmark
- Beta calculation for market sensitivity analysis

## Error Handling

### Data Availability Errors
- Handle missing SnapTrade data gracefully
- Fallback to last known values with timestamp indicators
- Clear error messages for calculation failures

### External Service Errors
- Benchmark data service unavailable
- Rate limiting from financial data providers
- Network timeout handling with retry logic

### Calculation Errors
- Invalid date ranges (start > end, future dates)
- Insufficient data points for meaningful calculations
- Division by zero in ratio calculations