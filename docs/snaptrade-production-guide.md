# SnapTrade Production Configuration Guide

This guide provides comprehensive instructions for configuring SnapTrade in production for the AIMS system. SnapTrade enables secure connectivity to users' brokerage accounts for portfolio management.

## Table of Contents

1. [Overview](#overview)
2. [Production vs Sandbox](#production-vs-sandbox)
3. [Getting Production Credentials](#getting-production-credentials)
4. [Configuration Steps](#configuration-steps)
5. [Security Best Practices](#security-best-practices)
6. [API Integration](#api-integration)
7. [Testing Production Setup](#testing-production-setup)
8. [Monitoring and Limits](#monitoring-and-limits)
9. [Troubleshooting](#troubleshooting)
10. [Compliance and Legal](#compliance-and-legal)

## Overview

SnapTrade provides secure API access to connect with users' brokerage accounts across multiple brokers. Production access enables:

- Real-time portfolio data access
- Trading capabilities (if enabled)
- Account balance monitoring
- Transaction history
- Multi-broker aggregation

**CRITICAL**: Production environment handles real money and sensitive financial data. Follow all security practices.

## Production vs Sandbox

### Key Differences

| Feature | Sandbox | Production |
|---------|---------|------------|
| **Data** | Test/demo data | Real user financial data |
| **Money** | Fake money | Real money |
| **Brokers** | Limited test brokers | All supported brokers |
| **Rate Limits** | Relaxed (100/min) | Strict (varies by plan) |
| **Credentials** | Test credentials | Production credentials |
| **User Consent** | Not required | Required |
| **Compliance** | Testing only | Full compliance required |
| **API Endpoints** | api.snaptrade.com/api/v1 | api.snaptrade.com/api/v1 |

### When to Use Production

Switch to production when:
- Development and testing are complete
- Security measures are implemented
- Compliance requirements are met
- Error handling is robust
- Monitoring is set up

## Getting Production Credentials

### Step 1: Create SnapTrade Account

1. Visit [SnapTrade Dashboard](https://dashboard.snaptrade.com/signup)
2. Sign up with your company email
3. Verify your email address
4. Complete company profile

### Step 2: Apply for Production Access

1. In the dashboard, navigate to **Settings → API Access**
2. Click **Request Production Access**
3. Provide required information:
   - Company details
   - Use case description
   - Expected volume
   - Security measures
   - Compliance status

### Step 3: Complete Verification

SnapTrade will review your application and may request:
- Additional documentation
- Security audit results
- Compliance certifications
- Technical architecture review

### Step 4: Receive Production Credentials

Once approved, you'll receive:
- **Production Client ID**: Unique identifier for your application
- **Production Consumer Key**: Secret key for API authentication

**IMPORTANT**: These are different from sandbox credentials and must be kept secure.

## Configuration Steps

### 1. Update Environment Variables

Update your `.env` file with production credentials:

```bash
# SnapTrade Production Configuration
SNAPTRADE_CLIENT_ID=your-production-client-id
SNAPTRADE_CONSUMER_KEY=your-production-consumer-key
SNAPTRADE_ENVIRONMENT=production  # CRITICAL: Must be "production"
```

### 2. Verify Configuration

Run the verification script to ensure proper setup:

```bash
uv run python scripts/verify_setup.py
```

Check for:
- ✓ SnapTrade client ID configured
- ✓ SnapTrade consumer key configured
- ✓ SnapTrade environment: production

### 3. Update API Client

Ensure your SnapTrade client is configured for production:

```python
# src/services/snaptrade_service.py
from snaptrade_client import SnapTrade

# Production configuration
snaptrade = SnapTrade(
    client_id=settings.snaptrade_client_id,
    consumer_key=settings.snaptrade_consumer_key,
    environment='production'  # Explicitly set to production
)
```

### 4. Implement Production Safeguards

Add production-specific checks:

```python
def is_production_environment():
    """Check if running in production mode"""
    return settings.snaptrade_environment == "production"

def validate_production_request(user_id: str, action: str):
    """Validate requests in production"""
    if is_production_environment():
        # Add extra validation
        log_production_action(user_id, action)
        check_rate_limits(user_id)
        verify_user_consent(user_id)
```

## Security Best Practices

### 1. Credential Management

**DO:**
- Store credentials in environment variables
- Use secrets management service (AWS Secrets Manager, etc.)
- Rotate credentials regularly
- Limit access to production credentials
- Encrypt credentials at rest

**DON'T:**
- Commit credentials to version control
- Share credentials via email/chat
- Use same credentials across environments
- Log credentials
- Expose credentials in error messages

### 2. API Key Security

```python
# Never log sensitive data
logger.info(f"Connecting to SnapTrade for user {user_id}")
# NOT: logger.info(f"Using key: {consumer_key}")

# Mask credentials in errors
try:
    result = snaptrade.api_call()
except Exception as e:
    # Sanitize error before logging
    safe_error = str(e).replace(settings.snaptrade_consumer_key, "***")
    logger.error(f"SnapTrade error: {safe_error}")
```

### 3. User Data Protection

- Encrypt user secrets before storage
- Use secure session management
- Implement proper access controls
- Audit data access
- Follow data retention policies

### 4. Network Security

- Use HTTPS for all API calls
- Implement request signing
- Validate SSL certificates
- Use IP whitelisting if available
- Monitor for suspicious activity

## API Integration

### 1. User Registration Flow

```python
async def register_snaptrade_user(user_id: str, email: str):
    """Register a new user with SnapTrade"""
    try:
        # Generate unique user secret
        user_secret = generate_secure_secret()
        
        # Register with SnapTrade
        response = await snaptrade.authentication.register_user(
            user_id=user_id,
            user_secret=user_secret
        )
        
        # Store encrypted secret
        encrypted_secret = encrypt_user_secret(user_secret)
        await store_user_secret(user_id, encrypted_secret)
        
        # Log registration (no sensitive data)
        logger.info(f"User {user_id} registered with SnapTrade")
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to register user {user_id}: {str(e)}")
        raise
```

### 2. Account Connection Flow

```python
async def connect_brokerage_account(user_id: str, redirect_uri: str):
    """Generate SnapTrade connection link"""
    try:
        # Verify user consent
        if not await has_user_consent(user_id):
            raise ValueError("User consent required")
        
        # Get user secret
        user_secret = await get_decrypted_user_secret(user_id)
        
        # Generate connection link
        link_response = await snaptrade.authentication.login_user(
            user_id=user_id,
            user_secret=user_secret,
            redirect_uri=redirect_uri,
            connection_type='production'
        )
        
        # Audit trail
        await log_connection_attempt(user_id, 'initiated')
        
        return link_response.redirect_uri
        
    except Exception as e:
        await log_connection_attempt(user_id, 'failed', str(e))
        raise
```

### 3. Data Synchronization

```python
async def sync_portfolio_data(user_id: str):
    """Sync user's portfolio data from SnapTrade"""
    if not is_production_environment():
        raise ValueError("This function requires production environment")
    
    try:
        # Rate limit check
        await check_rate_limit(user_id)
        
        # Get accounts
        accounts = await snaptrade.account_information.get_user_accounts(
            user_id=user_id,
            user_secret=await get_decrypted_user_secret(user_id)
        )
        
        # Process each account
        for account in accounts:
            # Validate account data
            validate_account_data(account)
            
            # Store securely
            await store_account_data(user_id, account)
            
        # Update sync timestamp
        await update_last_sync(user_id)
        
    except RateLimitException:
        logger.warning(f"Rate limit hit for user {user_id}")
        await schedule_retry(user_id)
    except Exception as e:
        logger.error(f"Sync failed for user {user_id}: {str(e)}")
        raise
```

## Testing Production Setup

### 1. Pre-Production Checklist

Before going live:

- [ ] All tests pass in sandbox environment
- [ ] Error handling covers all edge cases
- [ ] Rate limiting is implemented
- [ ] Monitoring is configured
- [ ] Logging excludes sensitive data
- [ ] Backup procedures are in place
- [ ] Rollback plan exists
- [ ] Security scan completed
- [ ] Load testing performed

### 2. Production Test Plan

```python
# tests/production/test_snaptrade_production.py
import pytest
from unittest.mock import patch

@pytest.mark.production
class TestSnapTradeProduction:
    """Production-specific tests"""
    
    def test_production_credentials_set(self):
        """Verify production credentials are configured"""
        assert settings.snaptrade_client_id != ""
        assert settings.snaptrade_consumer_key != ""
        assert settings.snaptrade_environment == "production"
    
    def test_no_credential_logging(self, caplog):
        """Ensure credentials aren't logged"""
        # Perform operation
        sync_portfolio_data("test_user")
        
        # Check logs don't contain secrets
        for record in caplog.records:
            assert settings.snaptrade_consumer_key not in record.message
            assert "user_secret" not in record.message
    
    def test_rate_limit_handling(self):
        """Test rate limit compliance"""
        # Simulate rate limit scenario
        with patch('snaptrade.api_call') as mock_call:
            mock_call.side_effect = RateLimitException()
            
            # Should handle gracefully
            result = sync_with_retry("test_user")
            assert result.retry_scheduled == True
```

### 3. Gradual Rollout

1. **Alpha Testing** (Internal)
   - Test with company accounts
   - Monitor all transactions
   - Verify data accuracy

2. **Beta Testing** (Limited users)
   - Select trusted users
   - Provide extra support
   - Gather feedback

3. **Production Release**
   - Gradual percentage rollout
   - Monitor metrics closely
   - Have rollback ready

## Monitoring and Limits

### 1. Rate Limits

Production rate limits vary by plan:

| Plan | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Starter | 60 | 1,000 | 10,000 |
| Growth | 120 | 5,000 | 50,000 |
| Enterprise | Custom | Custom | Custom |

### 2. Implementing Rate Limiting

```python
from datetime import datetime, timedelta
import redis

class RateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.limits = {
            'minute': 60,
            'hour': 1000,
            'day': 10000
        }
    
    async def check_limit(self, user_id: str) -> bool:
        """Check if request is within rate limits"""
        now = datetime.utcnow()
        
        for period, limit in self.limits.items():
            key = f"rate_limit:{user_id}:{period}:{now.strftime('%Y%m%d%H%M')}"
            count = await self.redis.incr(key)
            
            if count == 1:
                # Set expiry
                ttl = {'minute': 60, 'hour': 3600, 'day': 86400}[period]
                await self.redis.expire(key, ttl)
            
            if count > limit:
                return False
        
        return True
```

### 3. Monitoring Setup

Monitor these metrics:

```python
# Metrics to track
METRICS = {
    'api_calls_total': Counter('snaptrade_api_calls_total'),
    'api_errors_total': Counter('snaptrade_api_errors_total'),
    'rate_limit_hits': Counter('snaptrade_rate_limit_hits'),
    'response_time': Histogram('snaptrade_response_time_seconds'),
    'active_connections': Gauge('snaptrade_active_connections')
}

# Example monitoring
async def monitored_api_call(endpoint: str, user_id: str):
    """Make API call with monitoring"""
    start_time = time.time()
    
    try:
        result = await snaptrade.call_endpoint(endpoint)
        METRICS['api_calls_total'].inc()
        return result
        
    except RateLimitException:
        METRICS['rate_limit_hits'].inc()
        raise
        
    except Exception as e:
        METRICS['api_errors_total'].inc()
        raise
        
    finally:
        METRICS['response_time'].observe(time.time() - start_time)
```

### 4. Alerting

Set up alerts for:
- High error rates (>5%)
- Rate limit approaching (>80%)
- Unusual activity patterns
- Authentication failures
- Connection timeouts

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Symptom**: 401 Unauthorized errors

**Causes**:
- Invalid credentials
- Wrong environment (sandbox vs production)
- Expired user session
- Clock sync issues

**Solution**:
```python
# Verify credentials
assert settings.snaptrade_environment == "production"
assert len(settings.snaptrade_client_id) > 0
assert len(settings.snaptrade_consumer_key) > 0

# Check time sync
import ntplib
client = ntplib.NTPClient()
response = client.request('pool.ntp.org')
offset = response.offset
if abs(offset) > 5:
    logger.warning(f"Clock offset: {offset}s - may cause auth issues")
```

#### 2. Rate Limit Errors

**Symptom**: 429 Too Many Requests

**Solution**:
- Implement exponential backoff
- Cache frequently accessed data
- Batch operations where possible
- Upgrade plan if needed

#### 3. Connection Issues

**Symptom**: User can't connect brokerage

**Debugging Steps**:
```python
# 1. Verify user registration
user_exists = await snaptrade.authentication.get_user(user_id)

# 2. Check redirect URI
allowed_redirects = await snaptrade.authentication.get_redirect_uris()

# 3. Validate connection URL
connection_url = await generate_connection_url(user_id)
logger.info(f"Connection URL generated for user {user_id}")

# 4. Monitor callback
@app.post("/snaptrade/callback")
async def handle_callback(code: str, user_id: str):
    logger.info(f"Callback received for user {user_id}")
    # Process connection
```

### Error Handling Best Practices

```python
class SnapTradeError(Exception):
    """Base SnapTrade error"""
    pass

class SnapTradeAuthError(SnapTradeError):
    """Authentication failed"""
    pass

class SnapTradeRateLimitError(SnapTradeError):
    """Rate limit exceeded"""
    pass

async def handle_snaptrade_operation(operation, *args, **kwargs):
    """Wrapper for SnapTrade operations with error handling"""
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            return await operation(*args, **kwargs)
            
        except RateLimitException as e:
            if attempt == max_retries - 1:
                raise SnapTradeRateLimitError(str(e))
            await asyncio.sleep(retry_delay * (2 ** attempt))
            
        except AuthenticationException as e:
            # Don't retry auth errors
            raise SnapTradeAuthError(str(e))
            
        except Exception as e:
            logger.error(f"SnapTrade error (attempt {attempt + 1}): {str(e)}")
            if attempt == max_retries - 1:
                raise SnapTradeError(f"Operation failed after {max_retries} attempts")
```

## Compliance and Legal

### 1. Required Disclosures

Ensure your application displays:
- Data usage policies
- Third-party connection disclosure
- Risk warnings for trading features
- Privacy policy updates

### 2. User Consent

Implement explicit consent flow:

```python
async def get_user_consent(user_id: str) -> bool:
    """Verify user has consented to SnapTrade connection"""
    consent = await db.query(
        "SELECT consent_given, consent_date FROM user_consents "
        "WHERE user_id = ? AND consent_type = 'snaptrade_production'",
        user_id
    )
    
    if not consent or not consent.consent_given:
        return False
    
    # Check consent isn't expired (1 year)
    consent_age = datetime.now() - consent.consent_date
    if consent_age.days > 365:
        return False
    
    return True
```

### 3. Data Handling Requirements

- **Data Minimization**: Only request necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Data Retention**: Implement automatic data deletion
- **User Rights**: Support data export and deletion requests
- **Audit Trail**: Log all data access

### 4. Regulatory Compliance

Depending on your jurisdiction:
- **US**: May need to register as Investment Advisor
- **EU**: GDPR compliance required
- **Canada**: PIPEDA compliance
- **Industry**: PCI DSS if handling payments

## Production Deployment Checklist

Final checklist before production deployment:

### Security
- [ ] Production credentials secured
- [ ] Encryption implemented for user secrets
- [ ] SSL/TLS configured
- [ ] Security headers set
- [ ] Input validation complete
- [ ] SQL injection prevention
- [ ] XSS protection

### Testing
- [ ] All unit tests passing
- [ ] Integration tests complete
- [ ] Load testing performed
- [ ] Security scan clean
- [ ] Penetration testing done

### Monitoring
- [ ] Logging configured
- [ ] Metrics collection active
- [ ] Alerts configured
- [ ] Error tracking setup
- [ ] Performance monitoring

### Documentation
- [ ] API documentation updated
- [ ] User guide complete
- [ ] Privacy policy updated
- [ ] Terms of service reviewed
- [ ] Incident response plan

### Operations
- [ ] Backup procedures tested
- [ ] Rollback plan ready
- [ ] Support team trained
- [ ] Escalation process defined
- [ ] Maintenance windows planned

## Support Resources

### SnapTrade Support
- Documentation: https://docs.snaptrade.com
- Support Email: support@snaptrade.com
- Status Page: https://status.snaptrade.com
- Developer Forum: https://community.snaptrade.com

### Emergency Contacts
- SnapTrade Urgent: [Provided after production approval]
- Security Issues: security@snaptrade.com

### Additional Resources
- [SnapTrade API Reference](https://docs.snaptrade.com/api)
- [Best Practices Guide](https://docs.snaptrade.com/best-practices)
- [Compliance Documentation](https://docs.snaptrade.com/compliance)
- [Webhook Configuration](https://docs.snaptrade.com/webhooks)

---

**Remember**: Production access means handling real money and sensitive financial data. Always prioritize security and user privacy. When in doubt, consult with SnapTrade support or your security team.