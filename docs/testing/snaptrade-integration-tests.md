# SnapTrade Integration Testing Guide

## Overview

This document provides comprehensive guidance for testing the SnapTrade integration in AIMS. The integration testing validates the complete data flow from SnapTrade API → Backend → Frontend.

## Test Categories

### 1. SnapTrade API Connectivity Testing
- **Purpose**: Verify basic SnapTrade service functionality
- **Tests**:
  - Client initialization with sandbox credentials
  - User registration API calls
  - Connection URL generation
  - API response format validation

### 2. Account Connection Flow Testing
- **Purpose**: Test complete account linking process
- **Tests**:
  - Complete registration flow (register → connect → retrieve)
  - Account connection status handling
  - Multiple account scenarios

### 3. Data Retrieval Testing
- **Purpose**: Test all data fetching operations
- **Tests**:
  - User accounts retrieval
  - Account positions retrieval
  - Account balances retrieval
  - Data format validation

### 4. Backend Integration Testing
- **Purpose**: Test API endpoints with real SnapTrade data
- **Tests**:
  - `/api/snaptrade/register` endpoint
  - `/api/snaptrade/connect` endpoint
  - `/api/snaptrade/accounts` endpoint
  - Error handling for API failures

### 5. Performance and Reliability Testing
- **Purpose**: Test performance and reliability aspects
- **Tests**:
  - API response times under normal conditions
  - Concurrent requests handling
  - Error recovery mechanisms

### 6. Data Accuracy Validation
- **Purpose**: Test data accuracy and validation
- **Tests**:
  - Currency handling and conversions
  - Portfolio calculations with real data
  - Data aggregation across multiple accounts

## Prerequisites

### Environment Setup

1. **SnapTrade Sandbox Account**
   ```bash
   # Required environment variables
   export SNAPTRADE_CLIENT_ID="your_sandbox_client_id"
   export SNAPTRADE_CONSUMER_KEY="your_sandbox_consumer_key"
   ```

2. **Test Database**
   ```bash
   # Test database will be created automatically
   # Location: ./test_snaptrade_integration.db
   ```

3. **Dependencies**
   ```bash
   # Install test dependencies
   pip install pytest pytest-asyncio
   ```

### SnapTrade Sandbox Setup

1. **Create Sandbox Account**
   - Visit [SnapTrade Developer Portal](https://snaptrade.com/developers)
   - Create sandbox account
   - Obtain sandbox credentials

2. **Configure Test Data**
   - Add test brokerage accounts in sandbox
   - Add sample positions and transactions
   - Document expected test data values

## Running Tests

### Command Line Execution

```bash
# Run all integration tests
pytest tests/integration/test_snaptrade_integration.py -v

# Run specific test category
pytest tests/integration/test_snaptrade_integration.py::TestSnapTradeAPIConnectivity -v

# Run with detailed output
pytest tests/integration/test_snaptrade_integration.py -v --tb=long

# Stop on first failure
pytest tests/integration/test_snaptrade_integration.py -v -x
```

### Manual Execution

```bash
# Run tests directly
python tests/integration/test_snaptrade_integration.py
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run SnapTrade Integration Tests
  run: |
    export SNAPTRADE_CLIENT_ID=${{ secrets.SNAPTRADE_CLIENT_ID }}
    export SNAPTRADE_CONSUMER_KEY=${{ secrets.SNAPTRADE_CONSUMER_KEY }}
    pytest tests/integration/test_snaptrade_integration.py -v
```

## Test Scenarios

### Scenario 1: New User Registration

```python
# Test flow:
1. Register new user with SnapTrade
2. Verify registration response
3. Generate connection URL
4. Verify URL format and accessibility
```

### Scenario 2: Account Connection

```python
# Test flow:
1. Register user (if not exists)
2. Generate connection portal URL
3. Simulate account connection (manual step)
4. Verify connected accounts appear in API
```

### Scenario 3: Data Retrieval

```python
# Test flow:
1. Ensure user has connected accounts
2. Retrieve account list
3. Get positions for each account
4. Get balances for each account
5. Verify data format and completeness
```

### Scenario 4: End-to-End Portfolio Display

```python
# Test flow:
1. Register user and connect accounts
2. Retrieve all portfolio data
3. Test portfolio calculations
4. Verify data aggregation across accounts
5. Test frontend API endpoints
```

## Expected Test Results

### Success Criteria

- ✅ All API connectivity tests pass
- ✅ User registration and connection flow works
- ✅ Data retrieval returns expected formats
- ✅ Backend endpoints respond correctly
- ✅ Performance meets acceptable thresholds
- ✅ Data accuracy validations pass

### Common Issues and Solutions

#### Issue: User Already Exists
```
Error: User already exists in SnapTrade sandbox
Solution: This is expected behavior - test will skip gracefully
```

#### Issue: No Connected Accounts
```
Error: No connected accounts available for testing
Solution: Manually connect test account in SnapTrade sandbox
```

#### Issue: API Rate Limiting
```
Error: Too many requests to SnapTrade API
Solution: Add delays between test runs or use different test users
```

#### Issue: Environment Variables Missing
```
Error: SNAPTRADE_CLIENT_ID not configured
Solution: Set required environment variables
```

## Test Data Management

### Test User IDs

The integration tests use predictable test user IDs:
- `test_user_integration_001` - API connectivity tests
- `test_user_connection_001` - Connection flow tests
- `test_user_data_001` - Data retrieval tests
- `test_backend_integration_001` - Backend integration tests
- `test_performance_001` - Performance tests

### Cleanup

Tests automatically clean up test data:
```python
# Cleanup runs after tests complete
cleanup_test_data()  # Removes test users from database
```

### Mock Data

For tests that don't require real API calls, mock data is used:
```python
mock_position = {
    'symbol': 'AAPL',
    'quantity': 100,
    'price': 150.00,
    'market_value': 15000.00
}
```

## Performance Benchmarks

### Response Time Targets

- User registration: < 10 seconds
- Account listing: < 5 seconds
- Position retrieval: < 3 seconds
- Balance retrieval: < 2 seconds

### Reliability Targets

- API success rate: > 95%
- Error recovery: < 1 second
- Concurrent users: Support 10+ simultaneous

## Monitoring and Reporting

### Test Reports

Tests generate detailed output including:
- ✅ Successful operations with timing
- ⚠️ Warnings for expected issues
- ❌ Failures with detailed error messages

### Metrics Tracking

Key metrics tracked during testing:
- API response times
- Success/failure rates
- Data accuracy percentages
- Error recovery times

## Integration with CI/CD

### Automated Testing

```yaml
# Example GitHub Actions workflow
name: SnapTrade Integration Tests
on: [push, pull_request]
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run integration tests
        env:
          SNAPTRADE_CLIENT_ID: ${{ secrets.SNAPTRADE_CLIENT_ID }}
          SNAPTRADE_CONSUMER_KEY: ${{ secrets.SNAPTRADE_CONSUMER_KEY }}
        run: pytest tests/integration/test_snaptrade_integration.py -v
```

### Test Environment Management

- **Development**: Use sandbox credentials, full test suite
- **Staging**: Use sandbox credentials, smoke tests only
- **Production**: No integration tests (use monitoring instead)

## Troubleshooting

### Debug Mode

Enable debug logging for detailed troubleshooting:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Manual Testing

For manual verification of specific components:
```python
# Test specific service method
service = SnapTradeService()
result = await service.register_snap_trade_user("manual_test_user")
print(result)
```

### API Inspection

Use tools like curl to inspect API responses:
```bash
# Test registration endpoint
curl -X POST http://localhost:8000/api/snaptrade/register \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user"}'
```

## Future Enhancements

### Planned Improvements

1. **Load Testing**: Add tests for high-volume scenarios
2. **Security Testing**: Validate authentication and authorization
3. **Data Validation**: Enhanced checks for financial data accuracy
4. **Frontend Testing**: Selenium tests for UI components
5. **Monitoring Integration**: Real-time test result dashboards

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **End-to-End Tests**: 70%+ coverage
- **Performance Tests**: All critical paths

---

## Quick Reference

### Run All Tests
```bash
pytest tests/integration/test_snaptrade_integration.py -v
```

### Run Specific Category
```bash
pytest tests/integration/test_snaptrade_integration.py::TestSnapTradeAPIConnectivity -v
```

### Environment Setup
```bash
export SNAPTRADE_CLIENT_ID="your_client_id"
export SNAPTRADE_CONSUMER_KEY="your_consumer_key"
```

### Expected Duration
- Full test suite: ~5-10 minutes
- Individual test categories: ~1-2 minutes each
- Setup and cleanup: ~30 seconds

---

*Last Updated: July 19, 2025*  
*Version: 1.0*  
*Status: Ready for Implementation*
