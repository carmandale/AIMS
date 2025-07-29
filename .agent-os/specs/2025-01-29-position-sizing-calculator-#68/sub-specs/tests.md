# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-29-position-sizing-calculator-#68/spec.md

> Created: 2025-01-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**PositionSizingService**
- Test fixed risk calculation with various inputs
- Test Kelly criterion calculation with edge cases
- Test volatility-based sizing logic
- Test validation rules and constraints
- Test precision and rounding behavior
- Test error handling for invalid inputs

**Calculation Functions**
- Test calculate_fixed_risk_size() with different risk scenarios
- Test calculate_kelly_size() with various win rates
- Test calculate_volatility_size() with price data
- Test risk_reward_ratio() calculations
- Test position_value() calculations

### Integration Tests

**API Endpoints**
- Test /api/position-sizing/calculate with all methods
- Test validation endpoint with rule violations
- Test methods endpoint returns correct data
- Test authentication and rate limiting
- Test error responses and status codes

**Portfolio Integration**
- Test integration with account balance data
- Test validation against existing positions
- Test correlation checks
- Test margin requirement calculations

### Feature Tests

**Calculator UI Flow**
- User opens calculator from navigation menu
- User selects calculation method
- User inputs required parameters
- Calculator shows real-time results
- User copies size to trade ticket
- Validation warnings display correctly

**Trade Ticket Integration**
- User opens trade ticket
- User clicks position size calculator
- Calculator pre-fills with trade data
- User adjusts parameters
- Size transfers back to trade ticket
- Trade validates against calculated size

### Mocking Requirements

- **Portfolio Service:** Mock account balances and positions
- **Market Data:** Mock current prices for calculations
- **Risk Rules:** Mock portfolio constraints and limits

## E2E Test Scenarios

### Scenario 1: Fixed Risk Calculation
1. Navigate to position calculator
2. Select "Fixed Risk" method
3. Enter account value: $100,000
4. Enter risk percentage: 2%
5. Enter entry price: $50
6. Enter stop loss: $48
7. Verify position size: 1000 shares
8. Verify risk amount: $2,000

### Scenario 2: Kelly Criterion with Warning
1. Open calculator
2. Select "Kelly Criterion"
3. Enter win rate: 60%
4. Enter avg win/loss: 2.0
5. Enter confidence: 0.5 (half Kelly)
6. Verify Kelly percentage calculated
7. Verify warning about aggressive sizing
8. Adjust to quarter Kelly
9. Verify updated recommendation

### Scenario 3: Trade Ticket Integration
1. Open trade ticket for AAPL
2. Enter limit buy order
3. Click position size calculator
4. Verify entry price pre-filled
5. Add stop loss price
6. Calculate position size
7. Click "Use This Size"
8. Verify size in trade ticket
9. Submit order
10. Verify validation passes