"""Authentication and authorization middleware for AIMS API"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import jwt
import bcrypt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AuthenticationError(HTTPException):
    """Authentication specific error"""

    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)


class AuthorizationError(HTTPException):
    """Authorization specific error"""

    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail)


class CurrentUser:
    """Current authenticated user context"""

    def __init__(self, user_id: str, email: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.authenticated_at = datetime.utcnow()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.JWTError:
        raise AuthenticationError("Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """Get current authenticated user from JWT token"""
    if not credentials or not credentials.credentials:
        raise AuthenticationError("Missing authentication token")

    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token: missing user ID")

        email = payload.get("email")
        return CurrentUser(user_id=user_id, email=email)

    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise AuthenticationError("Authentication failed")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


class RateLimitByUser:
    """Rate limiter that uses user ID as key instead of IP"""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.user_requests = {}
        self.window_size = 60  # 1 minute window

    def is_allowed(self, user_id: str) -> bool:
        """Check if user has exceeded rate limit"""
        now = datetime.utcnow()

        # Clean old entries
        cutoff = now - timedelta(seconds=self.window_size)
        if user_id in self.user_requests:
            self.user_requests[user_id] = [
                req_time for req_time in self.user_requests[user_id] if req_time > cutoff
            ]

        # Check current request count
        user_request_count = len(self.user_requests.get(user_id, []))

        if user_request_count >= self.requests_per_minute:
            return False

        # Add current request
        if user_id not in self.user_requests:
            self.user_requests[user_id] = []
        self.user_requests[user_id].append(now)

        return True

    def check_rate_limit(self, user_id: str) -> None:
        """Check rate limit and raise exception if exceeded"""
        if not self.is_allowed(user_id):
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later.",
            )


# Global rate limiter instances
portfolio_rate_limiter = RateLimitByUser(requests_per_minute=30)
sensitive_rate_limiter = RateLimitByUser(requests_per_minute=10)
