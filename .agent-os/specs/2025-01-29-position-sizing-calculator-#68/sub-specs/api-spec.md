# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-01-29-position-sizing-calculator-#68/spec.md

> Created: 2025-01-29
> Version: 1.0.0

## Endpoints

### POST /api/position-sizing/calculate

**Purpose:** Calculate position size based on provided parameters and method
**Parameters:** 
- `method`: string (required) - "fixed_risk", "kelly", "volatility_based"
- `account_value`: number (required) - Total account value
- `risk_percentage`: number (required) - Risk per trade (0.01 = 1%)
- `entry_price`: number (required) - Planned entry price
- `stop_loss`: number (required) - Stop loss price
- `target_price`: number (optional) - Target/take profit price
- `win_rate`: number (optional) - Historical win rate for Kelly
- `avg_win_loss_ratio`: number (optional) - Average win/loss ratio for Kelly
- `confidence_level`: number (optional) - Kelly fraction (0.25 = quarter Kelly)

**Response:**
```json
{
  "position_size": 100,
  "position_value": 5000.00,
  "risk_amount": 100.00,
  "risk_percentage": 0.02,
  "stop_loss_percentage": 0.05,
  "risk_reward_ratio": 3.0,
  "kelly_percentage": 0.15,
  "warnings": ["Position size limited by account balance"],
  "metadata": {
    "method_used": "fixed_risk",
    "calculations": {}
  }
}
```

**Errors:** 
- 400: Invalid parameters or calculation method
- 422: Risk parameters exceed limits

### GET /api/position-sizing/methods

**Purpose:** Get available position sizing methods and their requirements
**Parameters:** None
**Response:**
```json
{
  "methods": [
    {
      "id": "fixed_risk",
      "name": "Fixed Risk",
      "description": "Size positions based on fixed risk amount",
      "required_fields": ["account_value", "risk_percentage", "entry_price", "stop_loss"],
      "optional_fields": ["target_price"]
    },
    {
      "id": "kelly",
      "name": "Kelly Criterion",
      "description": "Optimize size based on edge and win rate",
      "required_fields": ["account_value", "win_rate", "avg_win_loss_ratio"],
      "optional_fields": ["confidence_level", "entry_price", "stop_loss"]
    }
  ]
}
```

### POST /api/position-sizing/validate

**Purpose:** Validate position size against portfolio rules and constraints
**Parameters:**
- `symbol`: string (required) - Asset symbol
- `position_size`: number (required) - Proposed position size
- `entry_price`: number (required) - Entry price
- `account_id`: integer (required) - Trading account ID

**Response:**
```json
{
  "valid": true,
  "violations": [],
  "warnings": ["Position represents 15% of portfolio"],
  "adjusted_size": 100,
  "max_allowed_size": 150
}
```

**Errors:**
- 400: Invalid parameters
- 403: Position violates risk rules

## Controllers

### PositionSizingController

**Actions:**
- `calculate()` - Main calculation endpoint
- `get_methods()` - Return available methods
- `validate()` - Validate against rules

**Business Logic:**
- Apply calculation method based on parameters
- Check against portfolio constraints
- Return warnings for near-limit positions
- Log calculation requests for analytics

**Error Handling:**
- Validate all numeric inputs
- Check for divide-by-zero scenarios
- Ensure stop loss is logical (below entry for long)
- Handle missing optional parameters gracefully