#!/usr/bin/env python3
"""
Verify API endpoints are working with the generated test data.

This script directly tests the performance and drawdown API endpoints
to ensure they return proper data for E2E testing.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from datetime import datetime, date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from src.db.session import get_db
from src.db.models import User, PerformanceSnapshot
from src.services.drawdown_service import DrawdownService
from src.services.performance_analytics import PerformanceAnalyticsService
from src.services.benchmark_service import BenchmarkService


def verify_performance_data():
    """Verify that performance data exists and is accessible."""

    db = next(get_db())

    try:
        # Find test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ Test user not found")
            return False

        print(f"✅ Found test user: {test_user.user_id}")

        # Check performance snapshots
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(PerformanceSnapshot.user_id == test_user.user_id)
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        if not snapshots:
            print("❌ No performance snapshots found")
            return False

        print(f"✅ Found {len(snapshots)} performance snapshots")
        print(f"   Date range: {snapshots[0].snapshot_date} to {snapshots[-1].snapshot_date}")
        print(
            f"   Value range: ${snapshots[0].total_value:,.2f} to ${snapshots[-1].total_value:,.2f}"
        )

        # Test performance analytics service
        print("\n🔧 Testing PerformanceAnalyticsService...")
        performance_service = PerformanceAnalyticsService(db)

        # Test period performance
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        metrics = performance_service.calculate_returns_metrics(
            test_user.user_id, start_date, end_date, "1m"
        )

        if metrics:
            print(f"✅ Performance metrics calculated:")
            print(f"   Total return: {metrics.percent_change:.2f}%")
            print(f"   Volatility: {metrics.volatility:.2f}%")
            print(f"   Max drawdown: {metrics.max_drawdown:.2f}%")
            print(f"   Sharpe ratio: {metrics.sharpe_ratio:.2f}")
        else:
            print("❌ Failed to calculate performance metrics")
            return False

        return True

    except Exception as e:
        print(f"❌ Error verifying performance data: {e}")
        return False
    finally:
        db.close()


def verify_drawdown_service():
    """Verify that drawdown service works with the test data."""

    db = next(get_db())

    try:
        # Find test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ Test user not found")
            return False

        # Get performance snapshots
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(PerformanceSnapshot.user_id == test_user.user_id)
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        print("\n🔧 Testing DrawdownService...")
        drawdown_service = DrawdownService()

        # Test current drawdown
        current_drawdown = drawdown_service.calculate_current_drawdown(snapshots)
        print(f"✅ Current drawdown calculated:")
        print(f"   Current drawdown: {current_drawdown['current_drawdown_percent']:.2f}%")
        print(f"   Peak value: ${current_drawdown['peak_value']:,.2f}")
        print(f"   Current value: ${current_drawdown['current_value']:,.2f}")
        print(f"   Days in drawdown: {current_drawdown.get('days_in_drawdown', 0)}")

        # Test historical drawdowns
        events = drawdown_service.calculate_drawdown_events(
            snapshots, threshold_percent=Decimal("5.0")
        )
        print(f"✅ Found {len(events)} historical drawdown events (>5%)")

        for i, event in enumerate(events[:3], 1):  # Show first 3 events
            print(
                f"   Event {i}: {event['max_drawdown_percent']:.2f}% over {event['drawdown_days']} days"
            )

        # Test underwater curve
        curve = drawdown_service.calculate_underwater_curve(snapshots)
        print(f"✅ Generated underwater curve with {len(curve)} data points")

        # Test alerts
        alerts = drawdown_service.check_alert_thresholds(
            snapshots, warning_threshold=Decimal("15.0"), critical_threshold=Decimal("20.0")
        )
        print(f"✅ Alert system working - {len(alerts)} active alerts")

        for alert in alerts:
            print(f"   {alert['level'].upper()}: {alert['message']}")

        # Test historical analysis
        analysis = drawdown_service.get_historical_analysis(snapshots)
        print(f"✅ Historical analysis:")
        print(f"   Total events: {analysis['total_drawdown_events']}")
        print(f"   Max drawdown: {analysis['max_drawdown_percent']:.2f}%")
        print(f"   Average recovery: {analysis['average_recovery_days']} days")

        return True

    except Exception as e:
        print(f"❌ Error verifying drawdown service: {e}")
        import traceback

        traceback.print_exc()
        return False
    finally:
        db.close()


def verify_benchmark_service():
    """Verify that benchmark service is working."""

    db = next(get_db())

    try:
        print("\n🔧 Testing BenchmarkService...")
        benchmark_service = BenchmarkService(db)

        # Test symbol validation
        is_valid = benchmark_service.validate_symbol("SPY")
        print(f"✅ SPY validation: {'Valid' if is_valid else 'Invalid'}")

        # Test benchmark data (may fail if no internet or API issues)
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=30)

            benchmark_data = benchmark_service.get_benchmark_data("SPY", start_date, end_date)
            if benchmark_data:
                print(f"✅ Benchmark data retrieved:")
                print(f"   SPY return: {benchmark_data.get('total_return', 0):.2f}%")
                print(f"   SPY volatility: {benchmark_data.get('volatility', 0):.2f}%")
            else:
                print("⚠️ No benchmark data available (network/API issue)")
        except Exception as e:
            print(f"⚠️ Benchmark data unavailable: {e}")

        return True

    except Exception as e:
        print(f"❌ Error verifying benchmark service: {e}")
        return False
    finally:
        db.close()


def test_api_endpoint_logic():
    """Test the core logic that the API endpoints use."""

    print("\n🔧 Testing API endpoint logic...")

    db = next(get_db())

    try:
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ Test user not found")
            return False

        # Simulate the /api/performance/metrics endpoint logic
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        performance_service = PerformanceAnalyticsService(db)
        metrics = performance_service.calculate_returns_metrics(
            test_user.user_id, start_date, end_date, "1m"
        )

        if not metrics:
            print("❌ No metrics returned")
            return False

        # Get time series data (like the API does)
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                PerformanceSnapshot.user_id == test_user.user_id,
                PerformanceSnapshot.snapshot_date >= start_date,
                PerformanceSnapshot.snapshot_date <= end_date,
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        # Format like the API response
        if snapshots:
            first_value = float(snapshots[0].total_value)
            time_series = []

            for snapshot in snapshots:
                portfolio_return = 0.0
                if first_value > 0:
                    portfolio_return = (float(snapshot.total_value) - first_value) / first_value

                time_series.append(
                    {
                        "date": snapshot.snapshot_date.isoformat(),
                        "portfolio_value": float(snapshot.total_value),
                        "portfolio_return": portfolio_return,
                        "benchmark_return": 0.0,
                    }
                )

        api_response = {
            "portfolio_metrics": {
                "total_return": (
                    float(metrics.percent_change / 100) if metrics.percent_change else 0.0
                ),
                "daily_return": float(metrics.periodic_returns.get("last_1_day", 0) / 100),
                "monthly_return": float(metrics.periodic_returns.get("last_30_days", 0) / 100),
                "yearly_return": (
                    float(metrics.annualized_return / 100) if metrics.annualized_return else 0.0
                ),
                "sharpe_ratio": metrics.sharpe_ratio or 0.0,
                "volatility": float(metrics.volatility / 100) if metrics.volatility else 0.0,
                "max_drawdown": float(metrics.max_drawdown / 100) if metrics.max_drawdown else 0.0,
                "current_value": float(metrics.ending_value),
                "period_start_value": float(metrics.starting_value),
            },
            "time_series": time_series,
            "last_updated": datetime.utcnow().isoformat() + "Z",
        }

        print(f"✅ API response structure valid:")
        print(f"   Time series points: {len(api_response['time_series'])}")
        print(f"   Current value: ${api_response['portfolio_metrics']['current_value']:,.2f}")
        print(f"   Total return: {api_response['portfolio_metrics']['total_return']:.2%}")
        print(f"   Max drawdown: {api_response['portfolio_metrics']['max_drawdown']:.2%}")

        # Test drawdown endpoints
        print(f"\n🔧 Testing drawdown endpoint logic...")

        # Simulate /api/performance/drawdown/current
        all_snapshots = (
            db.query(PerformanceSnapshot)
            .filter(PerformanceSnapshot.user_id == test_user.user_id)
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        drawdown_service = DrawdownService()
        current_drawdown = drawdown_service.calculate_current_drawdown(all_snapshots)

        drawdown_response = {
            "current_drawdown_percent": str(current_drawdown["current_drawdown_percent"]),
            "current_drawdown_amount": str(current_drawdown["current_drawdown_amount"]),
            "peak_value": str(current_drawdown["peak_value"]),
            "peak_date": (
                current_drawdown["peak_date"].isoformat() if current_drawdown["peak_date"] else None
            ),
            "current_value": str(current_drawdown["current_value"]),
            "current_date": (
                current_drawdown["current_date"].isoformat()
                if current_drawdown["current_date"]
                else None
            ),
            "days_in_drawdown": current_drawdown.get("days_in_drawdown", 0),
        }

        print(f"✅ Drawdown API response valid:")
        print(f"   Current drawdown: {drawdown_response['current_drawdown_percent']}%")
        print(f"   Days in drawdown: {drawdown_response['days_in_drawdown']}")

        return True

    except Exception as e:
        print(f"❌ Error testing API logic: {e}")
        import traceback

        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    """Run all verification tests."""

    print("🚀 Verifying API endpoints and services for E2E testing...\n")

    tests = [
        ("Performance Data", verify_performance_data),
        ("Drawdown Service", verify_drawdown_service),
        ("Benchmark Service", verify_benchmark_service),
        ("API Endpoint Logic", test_api_endpoint_logic),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"🧪 Testing {test_name}")
        print("=" * 60)

        try:
            result = test_func()
            results.append((test_name, result))

            if result:
                print(f"\n✅ {test_name} - PASSED")
            else:
                print(f"\n❌ {test_name} - FAILED")

        except Exception as e:
            print(f"\n💥 {test_name} - ERROR: {e}")
            results.append((test_name, False))

    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")

    print(f"\n🎯 Overall: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All systems ready for E2E testing!")
        print("\n📋 Next steps:")
        print(
            "   1. Start backend server: cd .. && uv run uvicorn src.api.main:app --reload --port 8002"
        )
        print("   2. Start frontend server: cd ../frontend && npm run dev")
        print("   3. Run E2E tests: npx playwright test tests/drawdown-analysis.spec.ts")
        print("   4. Login with test@example.com / testpassword")

        return True
    else:
        print(f"\n⚠️ {total - passed} tests failed. Please fix issues before running E2E tests.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
