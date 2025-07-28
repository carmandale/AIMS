# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-28-drawdown-analysis-#63/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Test Coverage

### Unit Tests

**DrawdownCalculator Class**
- Test real-time drawdown calculation with sample portfolio data
- Test high-water mark tracking with multiple portfolio peaks
- Test drawdown percentage calculations with edge cases (zero values, negative returns)
- Test underwater curve generation for visualization data
- Test integration with existing PerformanceAnalyticsService methods

**DrawdownEvent Model**
- Test model creation and field validation
- Test relationships with User model
- Test date constraints and business logic validation
- Test drawdown event lifecycle (start -> trough -> recovery)

**DrawdownAlert System**
- Test threshold validation and configuration
- Test alert triggering logic with various scenarios
- Test alert status determination (normal, warning, critical)
- Test integration with task management system

### Integration Tests

**Drawdown API Endpoints**
- Test GET /api/performance/drawdown/current with authenticated user
- Test GET /api/performance/drawdown/historical with date range filtering
- Test GET /api/performance/drawdown/alerts with user-specific thresholds
- Test POST /api/performance/drawdown/alerts/config with validation
- Test error handling for invalid parameters and unauthorized access
- Test rate limiting compliance with existing performance API patterns

**Database Integration**
- Test PerformanceSnapshot model extensions with drawdown columns
- Test DrawdownEvent model CRUD operations
- Test database migrations for new schema changes
- Test data consistency between performance snapshots and drawdown events
- Test query performance with indexed fields

**Service Integration**
- Test DrawdownCalculator integration with SnapTrade data flow
- Test real-time calculation updates when portfolio values change
- Test historical data population from existing performance snapshots
- Test benchmark comparison integration with BenchmarkService

### Feature Tests

**End-to-End Drawdown Workflow**
- User logs in and navigates to performance dashboard
- Real-time drawdown metrics display correctly with current portfolio data
- User navigates to historical drawdown analysis page
- Historical charts render with accurate drawdown events and recovery periods
- User configures drawdown alerts and receives notifications when thresholds are breached
- Alert system creates tasks when critical drawdown levels are reached

**Dashboard Integration**
- Performance dashboard displays drawdown metrics alongside existing analytics
- Drawdown charts integrate seamlessly with existing Recharts components
- Mobile responsive design works correctly on various screen sizes
- Real-time data updates reflect in drawdown calculations without page refresh

**Alert System Workflow**
- Configure drawdown thresholds through settings interface
- Simulate portfolio decline to trigger warning and critical alerts
- Verify alert notifications appear in dashboard and task system
- Test alert resolution when drawdown recovers below thresholds

## Mocking Requirements

**SnapTrade API Responses**
- Mock portfolio value responses with declining values to simulate drawdowns
- Mock historical portfolio data for various drawdown scenarios
- Mock benchmark data responses for comparison calculations

**Time-Based Tests**
- Mock datetime functions for consistent drawdown duration calculations
- Mock date progression for testing drawdown event lifecycle
- Mock real-time updates for testing live drawdown monitoring

**External Services**
- Mock email notification service for alert testing
- Mock task creation service for drawdown-triggered action items
- Mock benchmark data service for comparative drawdown analysis

## Test Data Scenarios

**Drawdown Event Patterns**
- Single major drawdown with full recovery
- Multiple small drawdowns in sequence
- Extended drawdown period without recovery
- V-shaped recovery (quick decline and recovery)
- L-shaped recovery (decline with slow recovery)

**Alert Threshold Testing**
- Portfolio at exactly warning threshold (15%)
- Portfolio exceeding critical threshold (20%)
- Portfolio recovering from critical back to normal
- Rapid threshold transitions (normal -> critical -> normal)

**Edge Cases**
- New user with no historical data
- Portfolio with only gains (no drawdowns)
- Portfolio with extreme volatility
- Data gaps in portfolio history
- Invalid date ranges and parameters