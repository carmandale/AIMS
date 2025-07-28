# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-28-performance-dashboard-#60/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Test Coverage

### Unit Tests

**PerformanceCalculator**
- test_daily_return_calculation - Verify accurate daily return calculations with various scenarios
- test_time_weighted_return_calculation - Test TWR with cash flows and multiple periods
- test_sharpe_ratio_calculation - Validate Sharpe ratio with different risk-free rates
- test_volatility_calculation - Test standard deviation and annualized volatility
- test_max_drawdown_calculation - Verify max drawdown identification from price series
- test_cumulative_return_calculation - Test compound returns over multiple periods
- test_handling_missing_data - Verify graceful handling of gaps in price data
- test_zero_division_protection - Ensure safe handling of zero values in ratios

**BenchmarkService**
- test_fetch_benchmark_data - Verify external API data retrieval and formatting
- test_benchmark_return_calculation - Test benchmark performance calculations
- test_cache_benchmark_data - Verify caching mechanism for benchmark prices
- test_custom_benchmark_configuration - Test user-defined benchmark setup
- test_benchmark_data_validation - Validate incoming benchmark data format

**PerformanceController**
- test_get_performance_metrics_valid_user - Test successful metrics retrieval
- test_get_performance_metrics_invalid_period - Test error handling for bad periods
- test_get_historical_data_date_validation - Test date range validation
- test_update_benchmark_success - Test successful benchmark configuration
- test_performance_calculation_caching - Verify caching of expensive calculations

### Integration Tests

**Performance API Endpoints**
- test_performance_metrics_endpoint_authenticated - Full API flow with valid auth
- test_performance_metrics_endpoint_unauthenticated - Verify auth requirement
- test_performance_historical_endpoint_date_ranges - Test various date range scenarios
- test_benchmark_update_endpoint_workflow - Complete benchmark update flow
- test_performance_data_consistency - Verify data consistency across endpoints

**Database Performance Operations**
- test_performance_snapshot_creation - Test daily snapshot creation process
- test_performance_snapshot_retrieval - Test querying historical snapshots
- test_benchmark_config_crud_operations - Test all benchmark config operations
- test_performance_data_migration - Verify database schema migration success
- test_concurrent_performance_calculations - Test thread safety of calculations

**SnapTrade Integration**
- test_portfolio_data_to_performance_metrics - End-to-end data flow from SnapTrade
- test_performance_calculation_with_real_positions - Test with actual position data
- test_performance_update_on_position_change - Verify updates when positions change

### Feature Tests

**Performance Dashboard User Workflows**
- test_dashboard_loads_with_default_metrics - Complete dashboard load scenario
- test_time_period_selection_updates_charts - Interactive chart functionality
- test_benchmark_comparison_toggle - User can enable/disable benchmark comparison
- test_performance_metrics_real_time_updates - Metrics update when portfolio changes
- test_mobile_responsive_dashboard_layout - Dashboard works on mobile devices

**Performance Calculation Workflows**
- test_new_user_performance_initialization - First-time performance setup
- test_daily_performance_snapshot_creation - Automated daily snapshot process
- test_performance_calculation_after_trades - Performance updates after trades
- test_multi_account_performance_aggregation - Performance across multiple accounts

### Mocking Requirements

**External Services**
- **yfinance API:** Mock S&P 500 and benchmark data responses
  - Mock strategy: Return static benchmark data for consistent test results
  - Test both successful responses and API failure scenarios

**SnapTrade API:** Mock portfolio position data
  - Mock strategy: Use fixture data representing various portfolio scenarios
  - Include edge cases like zero positions, negative returns, missing data

**Time-based Tests**
- **Date/Time:** Mock current date for consistent performance calculations
  - Mock strategy: Use freezegun to control time for reproducible tests
  - Test calculations across different time periods and market conditions

**Database Queries**
- **Performance Data:** Mock complex aggregation queries for unit tests
  - Mock strategy: Use in-memory SQLite for fast test execution
  - Fixture data representing various portfolio states and time periods

## Test Data Fixtures

### Portfolio Performance Scenarios
```python
# High-performing portfolio scenario
PORTFOLIO_BULL_MARKET = {
    "start_value": 600000,
    "end_value": 675000,
    "daily_returns": [0.002, 0.015, -0.005, 0.008, 0.012],
    "benchmark_returns": [0.001, 0.010, -0.003, 0.006, 0.009]
}

# Volatile market scenario
PORTFOLIO_VOLATILE_MARKET = {
    "start_value": 600000,
    "end_value": 598000,
    "daily_returns": [0.025, -0.030, 0.020, -0.025, 0.015],
    "benchmark_returns": [0.015, -0.020, 0.012, -0.018, 0.010]
}

# Bear market scenario
PORTFOLIO_BEAR_MARKET = {
    "start_value": 600000,
    "end_value": 540000,
    "daily_returns": [-0.015, -0.020, 0.005, -0.012, -0.008],
    "benchmark_returns": [-0.012, -0.018, 0.003, -0.010, -0.006]
}
```

### Benchmark Data Fixtures
```python
SP500_HISTORICAL_DATA = [
    {"date": "2025-07-01", "price": 4500.00, "return": 0.0000},
    {"date": "2025-07-02", "price": 4512.50, "return": 0.0028},
    {"date": "2025-07-03", "price": 4498.75, "return": -0.0030}
]
```

## Performance Test Requirements

### Load Testing
- Test performance calculation with 1 year of daily data (252 data points)
- Verify dashboard renders within 2 seconds with full year of data
- Test concurrent user access to performance endpoints

### Calculation Accuracy
- Compare calculated returns against known financial calculation tools
- Verify Sharpe ratio calculations match industry standard formulas
- Test edge cases: leap years, market holidays, weekends

### Memory Usage
- Monitor memory usage during large dataset calculations
- Verify no memory leaks in long-running performance calculations
- Test garbage collection of cached performance data