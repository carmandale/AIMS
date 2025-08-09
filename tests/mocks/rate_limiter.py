"""Mock rate limiter for testing"""

from unittest.mock import MagicMock


class MockRateLimiter:
    """Mock rate limiter that never blocks requests during testing"""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.user_requests = {}
        
    def is_allowed(self, user_id: str) -> bool:
        """Always allow requests in tests"""
        return True
        
    def check_rate_limit(self, user_id: str) -> None:
        """Never raise rate limit exceptions in tests"""
        pass


def mock_rate_limiters():
    """Create mock rate limiters for testing"""
    return MockRateLimiter(), MockRateLimiter()
