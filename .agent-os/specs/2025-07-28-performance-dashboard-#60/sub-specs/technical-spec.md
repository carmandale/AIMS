# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-28-performance-dashboard-#60/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Technical Requirements

- **Performance Calculations**: Time-weighted return calculations for daily, monthly, and yearly periods
- **Risk Metrics**: Sharpe ratio calculation using 3-month Treasury rate as risk-free rate
- **Volatility Analysis**: Rolling volatility calculations using standard deviation of daily returns
- **Benchmark Integration**: S&P 500 index data integration for comparison charts
- **Real-time Updates**: Performance metrics refresh automatically when portfolio data changes
- **Responsive Design**: Dashboard works seamlessly on desktop, tablet, and mobile devices
- **Chart Interactions**: Zoom, pan, and time period selection on all performance charts
- **Data Caching**: Efficient caching of calculated metrics to minimize computation overhead

## Approach Options

**Option A:** Separate Performance Service
- Pros: Clean separation of concerns, dedicated performance logic, easier testing
- Cons: Additional service complexity, potential data synchronization issues

**Option B:** Integrated Portfolio Analytics (Selected)
- Pros: Leverages existing portfolio data flow, simpler architecture, faster development
- Cons: Portfolio service becomes larger, mixed responsibilities

**Rationale:** Option B chosen because the performance calculations are tightly coupled with existing portfolio data. This approach minimizes data movement and leverages the established SnapTrade integration patterns.

## External Dependencies

- **numpy** - Efficient numerical calculations for returns and volatility
- **Justification:** Required for fast mathematical operations on large datasets of historical prices

- **yfinance** - S&P 500 benchmark data retrieval
- **Justification:** Reliable source for index data to enable benchmark comparisons

## Frontend Architecture

### Component Structure
```
/components/performance/
  PerformanceDashboard.tsx     # Main dashboard page
  MetricsOverview.tsx          # Key metrics cards (returns, Sharpe, volatility)
  PerformanceChart.tsx         # Main performance chart with time controls
  BenchmarkComparison.tsx      # Portfolio vs benchmark comparison
  RiskMetrics.tsx              # Risk-specific metrics and visualizations
```

### State Management
- Use existing Zustand store pattern for performance data
- React Query for API data fetching and caching
- Local state for chart interactions and time period selection

### Chart Implementation
- Recharts LineChart for performance trends
- ComposedChart for portfolio vs benchmark comparison  
- AreaChart for volatility visualization
- Custom tooltip components matching AIMS design system

## Performance Data Flow

### Backend Flow
1. SnapTrade portfolio data → Portfolio positions
2. Historical price data → Returns calculation engine
3. Returns time series → Risk metrics calculator
4. Cached metrics → API response

### Frontend Flow
1. Dashboard mount → API request for performance data
2. Performance data → Chart rendering with Recharts
3. User interaction → Time period filter → Data refetch
4. Real-time updates → Portfolio change notifications → Metrics refresh

## Calculation Methodologies

### Time-Weighted Returns
```python
# Daily return calculation
daily_return = (end_value - start_value + dividends) / start_value

# Compound annual growth rate (CAGR)
cagr = (end_value / start_value) ** (365 / days) - 1
```

### Sharpe Ratio
```python
# Risk-adjusted return calculation
excess_return = portfolio_return - risk_free_rate
sharpe_ratio = excess_return / portfolio_volatility
```

### Volatility (Standard Deviation)
```python
# Rolling volatility calculation
volatility = np.std(daily_returns) * np.sqrt(252)  # Annualized
```