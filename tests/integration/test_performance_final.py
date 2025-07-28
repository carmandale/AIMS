"""
Performance Dashboard Integration Tests - Final Working Version

This test file focuses on the core integration tests for the Performance Dashboard feature
with corrected database model usage.
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.api.main import app
from src.db.models import User, PerformanceSnapshot, Base
from src.db.session import get_db
from src.api.auth import CurrentUser, get_current_user, hash_password


# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_performance_final.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def create_performance_snapshot(user_id: str, snapshot_date: date, 
                              total_value: float, daily_pnl_percent: float = 0.0) -> PerformanceSnapshot:
    """Helper function to create PerformanceSnapshot with correct fields"""
    daily_pnl = total_value * daily_pnl_percent / 100
    
    return PerformanceSnapshot(
        user_id=user_id,
        snapshot_date=snapshot_date,
        total_value=Decimal(str(total_value)),
        cash_value=Decimal(str(total_value * 0.1)),  # 10% cash
        positions_value=Decimal(str(total_value * 0.9)),  # 90% positions
        daily_pnl=Decimal(str(daily_pnl)),
        daily_pnl_percent=Decimal(str(daily_pnl_percent)),
        weekly_pnl=Decimal(str(daily_pnl)),
        weekly_pnl_percent=Decimal(str(daily_pnl_percent)),
        monthly_pnl=Decimal(str(daily_pnl)),
        monthly_pnl_percent=Decimal(str(daily_pnl_percent)),
        ytd_pnl=Decimal(str(daily_pnl)),
        ytd_pnl_percent=Decimal(str(daily_pnl_percent)),
        volatility=Decimal("15.0"),
        sharpe_ratio=Decimal("1.2"),
        max_drawdown=Decimal("5.0"),
        created_at=datetime.utcnow()
    )


class TestPerformanceAPIBasics:
    """Test basic performance API functionality"""

    def setup_method(self):
        """Setup for each test method"""
        self.test_user_id = "test_perf_user_001"
        self.test_email = f"test_perf_{self.test_user_id}@example.com"
        
        # Create test database session
        self.db = TestingSessionLocal()
        
        # Clean up any existing test data
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        
        # Create test user
        test_user = User(
            user_id=self.test_user_id,
            email=self.test_email,
            password_hash=hash_password("testpassword"),
            is_active=True
        )
        self.db.add(test_user)
        self.db.commit()
        
        # Setup authentication mock
        self.mock_user = CurrentUser(user_id=self.test_user_id, email=self.test_email)
        app.dependency_overrides[get_current_user] = lambda: self.mock_user
    
    def teardown_method(self):
        """Clean up after each test"""
        # Clear dependency overrides
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]
        
        # Clean up test data
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        self.db.close()

    def test_api_with_no_data(self):
        """Test API response when no performance data exists"""
        response = client.get("/api/performance/metrics?period=1M&benchmark=NONE")
        assert response.status_code == 404  # No performance data
        
        data = response.json()
        assert "detail" in data
        assert "No performance data available" in data["detail"]
        
        print("✅ API no data test passed")

    def test_api_with_single_snapshot(self):
        """Test API response with a single performance snapshot"""
        # Create a single performance snapshot
        snapshot = create_performance_snapshot(
            self.test_user_id,
            date.today(),
            100000.00,
            0.0  # No daily change
        )
        self.db.add(snapshot)
        self.db.commit()
        
        # Test API response
        response = client.get("/api/performance/metrics?period=1D&benchmark=NONE")
        assert response.status_code == 200
        
        data = response.json()
        assert "portfolio_metrics" in data
        assert "time_series" in data
        assert data["portfolio_metrics"]["current_value"] == 100000.00
        
        print("✅ API single snapshot test passed")

    def test_api_with_time_series_data(self):
        """Test API response with multiple snapshots over time"""
        base_date = date.today() - timedelta(days=7)
        base_value = 100000.00
        
        # Create 7 days of performance data
        for i in range(8):  # 0 to 7 days
            snapshot_date = base_date + timedelta(days=i)
            daily_return = 0.5 * ((-1) ** i)  # Alternate +0.5% and -0.5%
            portfolio_value = base_value * (1 + 0.01 * i)  # 1% growth per day
            
            snapshot = create_performance_snapshot(
                self.test_user_id,
                snapshot_date,
                portfolio_value,
                daily_return
            )
            self.db.add(snapshot)
        
        self.db.commit()
        
        # Test API response
        response = client.get("/api/performance/metrics?period=7D&benchmark=NONE")
        assert response.status_code == 200
        
        data = response.json()
        assert "portfolio_metrics" in data
        assert "time_series" in data
        
        # Verify time series has data points
        time_series = data["time_series"]
        assert len(time_series) > 0
        assert len(time_series) <= 8  # Should have up to 8 data points
        
        # Verify metrics have reasonable values
        metrics = data["portfolio_metrics"]
        assert metrics["current_value"] > base_value  # Should have grown
        assert metrics["total_return"] > 0  # Should be positive
        
        print("✅ API time series test passed")
        print(f"   - Time series points: {len(time_series)}")
        print(f"   - Total return: {metrics['total_return']:.2%}")

    def test_api_error_handling(self):
        """Test API error handling for invalid requests"""
        # Test invalid period
        response = client.get("/api/performance/metrics?period=INVALID&benchmark=NONE")
        assert response.status_code == 400
        
        # Test invalid benchmark allocation in POST endpoint
        benchmark_data = {
            "symbol": "SPY",
            "allocation": 1.5  # Invalid - over 100%
        }
        response = client.post("/api/performance/benchmark", json=benchmark_data)
        assert response.status_code == 400
        
        print("✅ API error handling test passed")


class TestPerformanceDataConsistency:
    """Test data consistency across different endpoints"""

    def setup_method(self):
        """Setup with comprehensive test data"""
        self.test_user_id = "test_consistency_user_001"
        self.test_email = f"test_consistency_{self.test_user_id}@example.com"
        
        self.db = TestingSessionLocal()
        
        # Clean up existing data
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        
        # Create test user
        test_user = User(
            user_id=self.test_user_id,
            email=self.test_email,
            password_hash=hash_password("testpassword"),
            is_active=True
        )
        self.db.add(test_user)
        self.db.commit()
        
        # Create 30 days of test data
        self._create_comprehensive_test_data()
        
        # Setup authentication mock
        self.mock_user = CurrentUser(user_id=self.test_user_id, email=self.test_email)
        app.dependency_overrides[get_current_user] = lambda: self.mock_user

    def teardown_method(self):
        """Clean up after tests"""
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]
        
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        self.db.close()

    def _create_comprehensive_test_data(self):
        """Create 30 days of performance data"""
        base_date = date.today() - timedelta(days=30)
        base_value = 100000.00
        
        for i in range(31):  # 0 to 30 days
            snapshot_date = base_date + timedelta(days=i)
            
            # Simulate realistic growth with volatility
            growth = 0.08 * (i / 30)  # 8% growth over 30 days
            volatility = 0.01 * ((-1) ** i)  # Daily volatility
            portfolio_value = base_value * (1 + growth + volatility)
            daily_return = growth + volatility
            
            snapshot = create_performance_snapshot(
                self.test_user_id,
                snapshot_date,
                portfolio_value,
                daily_return * 100  # Convert to percentage
            )
            self.db.add(snapshot)
        
        self.db.commit()

    def test_current_value_consistency(self):
        """Test that current values are consistent across different periods"""
        periods = ["1D", "7D", "1M"]
        current_values = []
        
        for period in periods:
            response = client.get(f"/api/performance/metrics?period={period}&benchmark=NONE")
            assert response.status_code == 200
            
            data = response.json()
            current_value = data["portfolio_metrics"]["current_value"]
            current_values.append(current_value)
        
        # All current values should be identical (latest snapshot)
        for i in range(1, len(current_values)):
            assert abs(current_values[i] - current_values[0]) < 0.01, \
                "Current values should be identical across different periods"
        
        print("✅ Current value consistency test passed")
        print(f"   - Consistent current value: {current_values[0]:,.2f}")

    def test_historical_data_endpoint(self):
        """Test historical data endpoint consistency"""
        start_date = (date.today() - timedelta(days=10)).isoformat()
        end_date = date.today().isoformat()
        
        response = client.get(
            f"/api/performance/historical?start_date={start_date}&end_date={end_date}&frequency=daily"
        )
        assert response.status_code == 200
        
        historical_data = response.json()
        assert "data" in historical_data
        assert "summary" in historical_data
        assert len(historical_data["data"]) >= 10  # Should have at least 10 days
        
        # Verify data points are chronologically ordered
        dates = [point["date"] for point in historical_data["data"]]
        assert dates == sorted(dates), "Historical data should be chronologically ordered"
        
        # Verify portfolio values are positive
        for point in historical_data["data"]:
            assert point["portfolio_value"] > 0, "Portfolio values should be positive"
        
        print("✅ Historical data endpoint test passed")
        print(f"   - Data points: {len(historical_data['data'])}")


class TestBenchmarkIntegration:
    """Test benchmark integration functionality"""

    def setup_method(self):
        """Setup for benchmark tests"""
        self.test_user_id = "test_benchmark_user_001"
        self.test_email = f"test_benchmark_{self.test_user_id}@example.com"
        
        self.db = TestingSessionLocal()
        
        # Clean up existing data
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        
        # Create test user
        test_user = User(
            user_id=self.test_user_id,
            email=self.test_email,
            password_hash=hash_password("testpassword"),
            is_active=True
        )
        self.db.add(test_user)
        self.db.commit()
        
        # Create minimal test data
        snapshot = create_performance_snapshot(
            self.test_user_id,
            date.today(),
            100000.00,
            2.0  # 2% gain
        )
        self.db.add(snapshot)
        self.db.commit()
        
        # Setup authentication mock
        self.mock_user = CurrentUser(user_id=self.test_user_id, email=self.test_email)
        app.dependency_overrides[get_current_user] = lambda: self.mock_user

    def teardown_method(self):
        """Clean up after tests"""
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]
        
        self.db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == self.test_user_id
        ).delete()
        self.db.query(User).filter(User.user_id == self.test_user_id).delete()
        self.db.commit()
        self.db.close()

    def test_benchmark_config_endpoint(self):
        """Test benchmark configuration endpoint"""
        benchmark_data = {
            "benchmark_type": "custom",
            "symbol": "QQQ",
            "name": "NASDAQ-100 ETF",
            "allocation": 1.0
        }
        
        response = client.post("/api/performance/benchmark", json=benchmark_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "benchmark" in data
        
        # Verify benchmark configuration
        benchmark = data["benchmark"]
        assert benchmark["symbol"] == "QQQ"
        assert benchmark["name"] == "NASDAQ-100 ETF"
        assert benchmark["allocation"] == 1.0
        
        print("✅ Benchmark configuration test passed")

    def test_benchmark_with_performance_metrics(self):
        """Test performance metrics with benchmark comparison"""
        # Test with benchmark (might not have actual data, but should not error)
        response = client.get("/api/performance/metrics?period=1D&benchmark=SPY")
        assert response.status_code == 200
        
        data = response.json()
        assert "portfolio_metrics" in data
        assert "benchmark_metrics" in data  # Should be present (might be empty)
        assert "time_series" in data
        
        print("✅ Benchmark with performance metrics test passed")

    def test_benchmark_error_handling(self):
        """Test benchmark error handling"""
        # Test with invalid benchmark symbol in config
        benchmark_data = {
            "symbol": "",  # Empty symbol
            "allocation": 1.0
        }
        response = client.post("/api/performance/benchmark", json=benchmark_data)
        assert response.status_code == 400
        
        # Test with invalid allocation
        benchmark_data = {
            "symbol": "SPY",
            "allocation": 2.0  # Over 100%
        }
        response = client.post("/api/performance/benchmark", json=benchmark_data)
        assert response.status_code == 400
        
        print("✅ Benchmark error handling test passed")


if __name__ == "__main__":
    """Run performance integration tests"""
    print("🧪 Running Performance Dashboard Integration Tests (Final)...")
    print("=" * 80)

    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])

    print("=" * 80)
    print("🎯 Performance integration tests completed!")