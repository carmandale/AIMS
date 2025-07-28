# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-28-drawdown-analysis-#63/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Endpoints

### GET /api/performance/drawdown/current

**Purpose:** Get current real-time drawdown metrics for the authenticated user
**Parameters:** 
- `benchmark: str = Query("SPY", description="Benchmark symbol for comparison")`
**Response:**
```json
{
  "current_drawdown": {
    "amount": -15000.00,
    "percentage": -2.5,
    "high_water_mark": 600000.00,
    "current_value": 585000.00,
    "days_in_drawdown": 15,
    "last_high_date": "2025-07-10"
  },
  "max_drawdown": {
    "amount": -45000.00,
    "percentage": -7.5,
    "date": "2025-03-15"
  },
  "benchmark_drawdown": {
    "amount": -8000.00,
    "percentage": -1.3,
    "symbol": "SPY"
  }
}
```
**Errors:** 401 (Unauthorized), 500 (Server Error)

### GET /api/performance/drawdown/historical

**Purpose:** Get historical drawdown analysis with all major drawdown events
**Parameters:**
- `start_date: date = Query(..., description="Start date (YYYY-MM-DD)")`
- `end_date: date = Query(..., description="End date (YYYY-MM-DD)")`
- `min_drawdown: float = Query(1.0, description="Minimum drawdown percentage to include")`
**Response:**
```json
{
  "drawdown_events": [
    {
      "id": 1,
      "start_date": "2025-03-01",
      "end_date": "2025-04-15",
      "peak_value": 600000.00,
      "trough_value": 555000.00,
      "recovery_value": 602000.00,
      "max_drawdown_amount": -45000.00,
      "max_drawdown_percent": -7.5,
      "duration_days": 45,
      "recovery_days": 67,
      "is_recovered": true
    }
  ],
  "statistics": {
    "total_events": 5,
    "avg_duration_days": 28,
    "avg_recovery_days": 42,
    "max_drawdown_ever": -7.5,
    "current_recovery_days": 0
  },
  "chart_data": [
    {
      "date": "2025-03-01",
      "portfolio_value": 600000.00,
      "drawdown_percent": 0.0,
      "underwater_curve": 0.0
    }
  ]
}
```
**Errors:** 400 (Invalid date range), 401 (Unauthorized), 500 (Server Error)

### GET /api/performance/drawdown/alerts

**Purpose:** Get current drawdown alert status and thresholds
**Parameters:** None
**Response:**
```json
{
  "current_status": "warning",
  "alerts": [
    {
      "level": "warning",
      "threshold": 15.0,
      "current_drawdown": 16.2,
      "triggered_at": "2025-07-28T10:30:00Z",
      "message": "Portfolio drawdown (16.2%) exceeds warning threshold of 15%"
    }
  ],
  "thresholds": {
    "warning": 15.0,
    "critical": 20.0,
    "emergency": 25.0
  },
  "notifications_enabled": true
}
```
**Errors:** 401 (Unauthorized), 500 (Server Error)

### POST /api/performance/drawdown/alerts/config

**Purpose:** Update drawdown alert thresholds and notification settings
**Parameters:**
```json
{
  "warning_threshold": 15.0,
  "critical_threshold": 20.0,
  "emergency_threshold": 25.0,
  "notifications_enabled": true,
  "email_notifications": true,
  "dashboard_alerts": true
}
```
**Response:**
```json
{
  "message": "Drawdown alert configuration updated successfully",
  "config": {
    "warning_threshold": 15.0,
    "critical_threshold": 20.0,
    "emergency_threshold": 25.0,
    "notifications_enabled": true
  }
}
```
**Errors:** 400 (Invalid thresholds), 401 (Unauthorized), 500 (Server Error)

## Controllers

### DrawdownController Methods

**get_current_drawdown_metrics()**
- Calculates real-time drawdown from latest portfolio value
- Computes high-water mark and current drawdown percentage
- Compares against benchmark drawdown if specified
- Returns structured drawdown metrics

**get_historical_drawdown_analysis()**
- Queries drawdown_events table for specified date range
- Calculates statistical summaries of drawdown patterns
- Generates chart data for underwater curve visualization
- Filters events by minimum drawdown threshold

**get_drawdown_alerts()**
- Checks current drawdown against configured thresholds
- Returns active alerts and notification status
- Provides threshold configuration details

**update_alert_configuration()**
- Validates and updates user's drawdown alert thresholds
- Stores configuration in user preferences
- Triggers immediate alert check against new thresholds

### Business Logic Integration

**DrawdownCalculator Service:**
- Real-time drawdown calculation from portfolio snapshots
- High-water mark tracking with rolling window
- Underwater curve generation for visualization
- Integration with existing PerformanceAnalyticsService

**Alert System Integration:**
- Hooks into existing task management system
- Creates action items when thresholds are breached
- Email notification system integration (if available)
- Dashboard notification badges and warnings

## Purpose

The drawdown API endpoints provide comprehensive risk management capabilities by:

1. **Real-time Monitoring**: Continuous tracking of portfolio drawdown relative to peak values
2. **Historical Analysis**: Detailed analysis of past drawdown events for pattern recognition
3. **Risk Alerts**: Configurable threshold-based alerting system to maintain discipline
4. **Visual Analytics**: Data structured for rich charting and visualization components

These endpoints integrate seamlessly with the existing performance API structure and leverage the same authentication, rate limiting, and error handling patterns established in the current system.