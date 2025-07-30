# AIMS API Documentation

## Overview

The AIMS API provides programmatic access to portfolio management features including performance analytics, drawdown analysis, task management, and brokerage integrations.

**Base URL**: `http://localhost:${API_PORT:-8002}/api` (configurable via API_PORT environment variable)

**Authentication**: All endpoints require JWT Bearer token authentication unless otherwise specified.

## Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

Include the token in subsequent requests:
```http
Authorization: Bearer <access_token>
```

## Performance Analytics Endpoints

### Get Performance Metrics
```http
GET /performance/metrics?period=1M&benchmark=SPY
```

**Query Parameters**:
- `period` (string): Time period - `1D`, `7D`, `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL`
- `benchmark` (string): Benchmark symbol - `SPY`, `QQQ`, `NONE`

**Response**:
```json
{
  "portfolio_metrics": {
    "total_return": 0.0234,
    "daily_return": 0.0012,
    "monthly_return": 0.0234,
    "yearly_return": 0.0892,
    "sharpe_ratio": 1.23,
    "volatility": 0.0145,
    "max_drawdown": 0.0567,
    "current_value": 615000.00,
    "period_start_value": 600000.00
  },
  "benchmark_metrics": {
    "total_return": 0.0189,
    "volatility": 0.0123,
    "sharpe_ratio": 1.05
  },
  "time_series": [
    {
      "date": "2025-01-01",
      "portfolio_value": 600000.00,
      "portfolio_return": 0.0,
      "benchmark_return": 0.0
    }
  ],
  "last_updated": "2025-07-29T08:00:00Z"
}
```

### Get Historical Performance
```http
GET /performance/historical?start_date=2025-01-01&end_date=2025-07-29&frequency=daily
```

**Query Parameters**:
- `start_date` (date): Start date (YYYY-MM-DD)
- `end_date` (date): End date (YYYY-MM-DD)
- `frequency` (string): Data frequency - `daily`, `weekly`, `monthly`

## Drawdown Analysis Endpoints

### Get Current Drawdown
```http
GET /performance/drawdown/current
```

**Response**:
```json
{
  "current_drawdown_percent": "5.67",
  "current_drawdown_amount": "35000.00",
  "peak_value": "650000.00",
  "peak_date": "2025-06-15",
  "current_value": "615000.00",
  "current_date": "2025-07-29",
  "days_in_drawdown": 44
}
```

### Get Historical Drawdowns
```http
GET /performance/drawdown/historical?threshold=5.0&start_date=2025-01-01
```

**Query Parameters**:
- `threshold` (float): Minimum drawdown percentage (default: 5.0)
- `start_date` (date, optional): Start date for analysis
- `end_date` (date, optional): End date for analysis

**Response**:
```json
{
  "events": [
    {
      "peak_value": "650000.00",
      "peak_date": "2025-06-15",
      "trough_value": "585000.00",
      "trough_date": "2025-07-01",
      "max_drawdown_percent": "10.00",
      "drawdown_amount": "65000.00",
      "drawdown_days": 16,
      "recovery_days": 15,
      "is_recovered": true,
      "total_days": 31
    }
  ]
}
```

### Get Drawdown Analysis
```http
GET /performance/drawdown/analysis?start_date=2025-01-01
```

**Query Parameters**:
- `start_date` (date, optional): Start date for analysis
- `end_date` (date, optional): End date for analysis

**Response**:
```json
{
  "total_drawdown_events": 3,
  "max_drawdown_percent": "10.00",
  "max_drawdown_amount": "65000.00",
  "average_drawdown_percent": "6.33",
  "average_recovery_days": 12,
  "longest_drawdown_days": 44,
  "current_drawdown_percent": "5.67",
  "underwater_curve": [
    {
      "date": "2025-01-01",
      "drawdown_percent": "0.00",
      "portfolio_value": "600000.00",
      "peak_value": "600000.00"
    }
  ]
}
```

### Get Drawdown Alerts
```http
GET /performance/drawdown/alerts
```

**Response**:
```json
{
  "alerts": [
    {
      "level": "warning",
      "threshold": "15.0",
      "current_drawdown": "16.5",
      "message": "Portfolio drawdown (16.5%) exceeds warning threshold (15.0%)",
      "triggered_at": "2025-07-15T10:30:00Z"
    }
  ],
  "warning_threshold": "15.0",
  "critical_threshold": "20.0"
}
```

### Update Alert Configuration
```http
POST /performance/drawdown/alerts/config
Content-Type: application/json

{
  "warning_threshold": 12.0,
  "critical_threshold": 18.0
}
```

**Response**:
```json
{
  "warning_threshold": "12.0",
  "critical_threshold": "18.0",
  "message": "Alert thresholds updated successfully"
}
```

## Position Sizing Calculator Endpoints

### Calculate Position Size
```http
POST /position-sizing/calculate
Content-Type: application/json

{
  "method": "fixed_risk",
  "account_value": 100000,
  "risk_percentage": 0.02,
  "entry_price": 150.00,
  "stop_loss": 145.00,
  "target_price": 165.00
}
```

**Request Parameters**:
- `method` (string, required): Calculation method - `fixed_risk`, `kelly`, `volatility_based`
- `account_value` (number, required): Total account value in dollars
- `risk_percentage` (number, required): Risk per trade as decimal (0.02 = 2%)
- `entry_price` (number, required): Planned entry price per share
- `stop_loss` (number, required): Stop loss price per share
- `target_price` (number, optional): Target/take profit price per share
- `win_rate` (number, optional): Historical win rate for Kelly method (0.6 = 60%)
- `avg_win_loss_ratio` (number, optional): Average win/loss ratio for Kelly method
- `confidence_level` (number, optional): Kelly fraction (0.5 = half Kelly, 1.0 = full Kelly)
- `atr` (number, optional): Average True Range for volatility-based method
- `atr_multiplier` (number, optional): ATR multiplier for stop distance (default: 2.0)

**Response**:
```json
{
  "position_size": 1000,
  "position_value": 150000.00,
  "risk_amount": 2000.00,
  "risk_percentage": 0.02,
  "stop_loss_percentage": 0.033,
  "risk_reward_ratio": 3.0,
  "kelly_percentage": 0.15,
  "warnings": [
    "Large position size: 15.0% of account value (10.0% recommended max)"
  ],
  "metadata": {
    "method_used": "fixed_risk",
    "calculation_timestamp": "2025-07-29T10:30:00Z",
    "account_validation": true
  }
}
```

**Method-Specific Examples**:

**Fixed Risk Method**:
```json
{
  "method": "fixed_risk",
  "account_value": 100000,
  "risk_percentage": 0.02,
  "entry_price": 150.00,
  "stop_loss": 145.00
}
```

**Kelly Criterion Method**:
```json
{
  "method": "kelly",
  "account_value": 100000,
  "win_rate": 0.6,
  "avg_win_loss_ratio": 2.0,
  "confidence_level": 0.5
}
```

**Volatility-Based Method**:
```json
{
  "method": "volatility_based",
  "account_value": 100000,
  "risk_percentage": 0.02,
  "entry_price": 150.00,
  "atr": 2.5,
  "atr_multiplier": 2.0
}
```

### Get Available Methods
```http
GET /position-sizing/methods
```

**Response**:
```json
{
  "methods": [
    {
      "id": "fixed_risk",
      "name": "Fixed Risk",
      "description": "Size positions based on fixed risk amount per trade",
      "required_fields": ["account_value", "risk_percentage", "entry_price", "stop_loss"],
      "optional_fields": ["target_price"]
    },
    {
      "id": "kelly",
      "name": "Kelly Criterion",
      "description": "Optimize position size based on edge and win rate",
      "required_fields": ["account_value", "win_rate", "avg_win_loss_ratio"],
      "optional_fields": ["confidence_level", "entry_price", "stop_loss", "target_price"]
    },
    {
      "id": "volatility_based",
      "name": "Volatility-Based Sizing",
      "description": "Size positions based on asset volatility (ATR)",
      "required_fields": ["account_value", "risk_percentage", "entry_price", "atr"],
      "optional_fields": ["atr_multiplier", "target_price"]
    }
  ]
}
```

### Validate Position Size
```http
POST /position-sizing/validate
Content-Type: application/json

{
  "symbol": "AAPL",
  "position_size": 1000,
  "entry_price": 150.00,
  "account_id": 1
}
```

**Request Parameters**:
- `symbol` (string, required): Asset symbol (e.g., "AAPL", "BTC-USD")
- `position_size` (number, required): Proposed position size in shares/units
- `entry_price` (number, required): Entry price per share/unit
- `account_id` (number, required): Trading account identifier

**Response**:
```json
{
  "valid": true,
  "violations": [],
  "warnings": [
    "Position represents 15% of portfolio value",
    "High concentration in single asset"
  ],
  "adjusted_size": 1000,
  "max_allowed_size": 1200,
  "validation_details": {
    "position_value": 150000.00,
    "portfolio_percentage": 0.15,
    "available_cash": 25000.00,
    "buying_power": 50000.00,
    "concentration_check": "passed",
    "cash_requirement_check": "failed"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid calculation method or missing required parameters
- `422 Unprocessable Entity`: Position violates risk management rules
- `429 Too Many Requests`: Rate limit exceeded (100 calculations per minute)

**Rate Limiting**: Position sizing endpoints are rate-limited to 100 requests per minute per user.

## Portfolio Management Endpoints

### Get Portfolio Summary
```http
GET /portfolio/summary
```

### Get All Positions
```http
GET /portfolio/positions
```

### Get Holdings by Account
```http
GET /portfolio/holdings?account_id=ACC001
```

## Task Management Endpoints

### Get Tasks
```http
GET /tasks?status=pending&priority=high
```

**Query Parameters**:
- `status` (string): Filter by status - `pending`, `completed`, `overdue`
- `priority` (string): Filter by priority - `high`, `medium`, `low`

### Get Next Action
```http
GET /tasks/next-action
```

### Complete Task
```http
POST /tasks/{task_id}/complete
```

## SnapTrade Integration Endpoints

### Connect Account
```http
POST /snaptrade/connect
Content-Type: application/json

{
  "redirect_uri": "http://localhost:3000/snaptrade/callback"
}
```

### List Connected Accounts
```http
GET /snaptrade/accounts
```

### Sync Account Data
```http
POST /snaptrade/sync/{account_id}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes**:
- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Portfolio endpoints**: 100 requests per minute per user
- **Task endpoints**: 200 requests per minute per user
- **SnapTrade endpoints**: 50 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1627846800
```

## Performance Optimization

### Caching

The API implements caching for expensive calculations:
- **Drawdown calculations**: Cached for 5 minutes
- **Performance metrics**: Cached for 1 minute
- **Benchmark data**: Cached for 15 minutes

### Database Indexes

Optimized indexes are in place for common query patterns:
- `(user_id, snapshot_date)` composite index for performance queries
- `snapshot_date` index for date range filtering
- `cache_key` index for cache lookups

## WebSocket Support (Coming Soon)

Real-time updates will be available via WebSocket connection:
```javascript
const ws = new WebSocket(`ws://localhost:${process.env.API_PORT || 8002}/ws`);
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['portfolio', 'tasks', 'alerts']
}));
```

## SDK Examples

### Python
```python
import httpx

class AIMSClient:
    def __init__(self, base_url=None, token=None):
        if base_url is None:
            api_port = os.getenv('API_PORT', '8002')
            base_url = f"http://localhost:{api_port}"
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    def get_current_drawdown(self):
        response = httpx.get(
            f"{self.base_url}/api/performance/drawdown/current",
            headers=self.headers
        )
        return response.json()
```

### JavaScript/TypeScript
```typescript
class AIMSClient {
      constructor(private baseUrl?: string, private token?: string) {
        this.baseUrl = baseUrl || `http://localhost:${process.env.API_PORT || 8002}`;
    }
  
  async getCurrentDrawdown() {
    const response = await fetch(`${this.baseUrl}/api/performance/drawdown/current`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}
```

---

For more information or to report issues, please visit the [GitHub repository](https://github.com/dalecar/AIMS).