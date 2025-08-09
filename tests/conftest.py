"""Pytest configuration for AIMS tests"""

import pytest
import asyncio
import tempfile
import os
from typing import Generator
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add src to path for imports
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.db.models import Base
from src.db.session import get_db
from src.core.config import settings
from tests.mocks.rate_limiter import MockRateLimiter


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def anyio_backend():
    """Backend for anyio async testing"""
    return "asyncio"


@pytest.fixture(scope="session")
def test_db_engine():
    """Create a test database engine"""
    # Create a temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)  # Close the file descriptor, we just need the path

    # Create engine for test database
    test_database_url = f"sqlite:///{db_path}"
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup: close engine and remove temp file
    engine.dispose()
    try:
        os.unlink(db_path)
    except OSError:
        pass


@pytest.fixture(scope="session")
def test_session_factory(test_db_engine):
    """Create a session factory for tests"""
    return sessionmaker(autocommit=False, autoflush=False, bind=test_db_engine)


@pytest.fixture
def test_db_session(test_session_factory, test_db_engine) -> Generator[Session, None, None]:
    """Create a database session for a test with proper isolation using transactions"""
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session = test_session_factory(bind=connection)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def override_get_db(test_db_session):
    """Override the get_db dependency for FastAPI tests"""

    def _get_test_db():
        yield test_db_session

    return _get_test_db


@pytest.fixture
def mock_rate_limiters():
    """Mock rate limiters to prevent 429 errors in tests"""
    with (
        patch("src.api.auth.portfolio_rate_limiter", MockRateLimiter()),
        patch("src.api.auth.sensitive_rate_limiter", MockRateLimiter()),
    ):
        yield


@pytest.fixture
def client(override_get_db, mock_rate_limiters):
    """Create test client with database override and mocked rate limiters"""
    from fastapi.testclient import TestClient
    from src.api.main import app
    from src.db.session import get_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
