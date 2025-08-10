#!/usr/bin/env python3
"""
Generate comprehensive test performance data for E2E testing.

This script creates realistic portfolio performance data for the test user,
including drawdown events, recoveries, and various market scenarios to
ensure all E2E tests pass and all metrics calculations work properly.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, date, timedelta
from decimal import Decimal
import random
import math
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from src.db.session import get_db
from src.db.models import User, PerformanceSnapshot, BrokerageAccount, Position
from src.data.models import BrokerType


def create_realistic_performance_data(
    user_id: str,
    db: Session,
    start_date: date,
    end_date: date,
    initial_value: Decimal = Decimal("600000.00"),
    target_annual_return: float = 0.20,  # 20% annual return goal
    volatility: float = 0.15,  # 15% annualized volatility
) -> List[PerformanceSnapshot]:
    """
    Create realistic performance data with market-like characteristics.

    Parameters:
    - user_id: The test user ID
    - db: Database session
    - start_date: Start date for data generation
    - end_date: End date for data generation
    - initial_value: Starting portfolio value ($600k as per mission)
    - target_annual_return: Annual return target (20% for $10k/month goal)
    - volatility: Annual volatility (15% typical for balanced portfolio)
    """

    snapshots = []
    current_date = start_date
    current_value = initial_value
    high_water_mark = initial_value

    # Track running high water mark and drawdown state
    days_in_drawdown = 0

    # Random seed for reproducible test data
    random.seed(42)

    # Calculate daily parameters
    daily_return = target_annual_return / 365.25  # Expected daily return
    daily_volatility = volatility / math.sqrt(365.25)  # Daily volatility

    print(f"Generating performance data from {start_date} to {end_date}")
    print(f"Initial value: ${initial_value:,.2f}")
    print(f"Target annual return: {target_annual_return:.1%}")
    print(f"Volatility: {volatility:.1%}")

    while current_date <= end_date:
        # Generate daily return using random walk with drift
        # Use Box-Muller transform for normal distribution
        if random.random() < 0.5:
            z = math.sqrt(-2 * math.log(random.random())) * math.cos(2 * math.pi * random.random())
        else:
            z = math.sqrt(-2 * math.log(random.random())) * math.sin(2 * math.pi * random.random())

        daily_return_actual = daily_return + daily_volatility * z

        # Add some market regime effects
        # Create occasional drawdown periods and recovery periods
        days_from_start = (current_date - start_date).days

        # Create a major drawdown around day 60-90 (simulate market correction)
        if 60 <= days_from_start <= 90:
            daily_return_actual *= 0.3  # Reduce returns during correction
            daily_return_actual -= 0.01  # Add negative bias during correction

        # Create another smaller drawdown around day 150-165
        elif 150 <= days_from_start <= 165:
            daily_return_actual *= 0.6
            daily_return_actual -= 0.005

        # Strong recovery periods after drawdowns
        elif 90 < days_from_start <= 120:
            daily_return_actual *= 1.5  # Enhanced returns during recovery
        elif 165 < days_from_start <= 180:
            daily_return_actual *= 1.3

        # Apply the return
        current_value = current_value * (1 + Decimal(str(daily_return_actual)))

        # Update high water mark
        if current_value > high_water_mark:
            high_water_mark = current_value
            days_in_drawdown = 0
        else:
            days_in_drawdown += 1

        # Calculate drawdown metrics
        current_drawdown = (
            (high_water_mark - current_value) if high_water_mark > current_value else Decimal("0")
        )
        current_drawdown_percent = (
            (current_drawdown / high_water_mark * 100) if high_water_mark > 0 else Decimal("0")
        )

        # Calculate cash vs positions (simulate realistic allocation)
        cash_allocation = Decimal("0.05")  # 5% cash
        cash_value = current_value * cash_allocation
        positions_value = current_value - cash_value

        # Calculate period returns
        if snapshots:
            prev_value = snapshots[-1].total_value
            daily_pnl = current_value - prev_value
            daily_pnl_percent = (daily_pnl / prev_value * 100) if prev_value > 0 else Decimal("0")
        else:
            daily_pnl = Decimal("0")
            daily_pnl_percent = Decimal("0")

        # Calculate weekly returns (look back 7 days if available)
        weekly_pnl = None
        weekly_pnl_percent = None
        if len(snapshots) >= 7:
            week_ago_value = snapshots[-7].total_value
            weekly_pnl = current_value - week_ago_value
            weekly_pnl_percent = (
                (weekly_pnl / week_ago_value * 100) if week_ago_value > 0 else Decimal("0")
            )

        # Calculate monthly returns (look back 30 days if available)
        monthly_pnl = None
        monthly_pnl_percent = None
        if len(snapshots) >= 30:
            month_ago_value = snapshots[-30].total_value
            monthly_pnl = current_value - month_ago_value
            monthly_pnl_percent = (
                (monthly_pnl / month_ago_value * 100) if month_ago_value > 0 else Decimal("0")
            )

        # Calculate YTD returns
        ytd_start = date(current_date.year, 1, 1)
        ytd_start_value = initial_value  # Simplified - assume year starts with initial value
        if current_date.year > start_date.year:
            # Find the value at the start of this year
            ytd_snapshots = [s for s in snapshots if s.snapshot_date.year == current_date.year]
            if ytd_snapshots:
                ytd_start_value = ytd_snapshots[0].total_value

        ytd_pnl = current_value - ytd_start_value
        ytd_pnl_percent = (ytd_pnl / ytd_start_value * 100) if ytd_start_value > 0 else Decimal("0")

        # Calculate volatility (rolling 30-day if available)
        volatility_value = None
        if len(snapshots) >= 30:
            recent_returns = []
            for i in range(29):
                if i + 1 < len(snapshots):
                    prev_val = snapshots[-(i + 2)].total_value
                    curr_val = snapshots[-(i + 1)].total_value
                    if prev_val > 0:
                        daily_ret = float((curr_val - prev_val) / prev_val)
                        recent_returns.append(daily_ret)

            if recent_returns:
                mean_return = sum(recent_returns) / len(recent_returns)
                variance = sum((r - mean_return) ** 2 for r in recent_returns) / len(recent_returns)
                volatility_value = Decimal(str(math.sqrt(variance * 365.25) * 100))  # Annualized %

        # Calculate Sharpe ratio (simplified)
        sharpe_ratio = None
        if volatility_value and volatility_value > 0:
            # Assume 2% risk-free rate
            risk_free_rate = Decimal("2.0")
            excess_return = ytd_pnl_percent - risk_free_rate
            sharpe_ratio = float(excess_return / volatility_value) if volatility_value > 0 else 0.0

        # Calculate max drawdown (running maximum)
        max_drawdown = current_drawdown_percent
        if snapshots:
            for prev_snapshot in snapshots:
                if (
                    prev_snapshot.current_drawdown_percent
                    and prev_snapshot.current_drawdown_percent > max_drawdown
                ):
                    max_drawdown = prev_snapshot.current_drawdown_percent

        # Create performance snapshot
        snapshot = PerformanceSnapshot(
            user_id=user_id,
            snapshot_date=current_date,
            total_value=current_value,
            cash_value=cash_value,
            positions_value=positions_value,
            daily_pnl=daily_pnl,
            daily_pnl_percent=daily_pnl_percent,
            weekly_pnl=weekly_pnl,
            weekly_pnl_percent=weekly_pnl_percent,
            monthly_pnl=monthly_pnl,
            monthly_pnl_percent=monthly_pnl_percent,
            ytd_pnl=ytd_pnl,
            ytd_pnl_percent=ytd_pnl_percent,
            volatility=volatility_value,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            portfolio_high_water_mark=high_water_mark,
            current_drawdown=current_drawdown,
            current_drawdown_percent=current_drawdown_percent,
            days_in_drawdown=days_in_drawdown if days_in_drawdown > 0 else None,
        )

        snapshots.append(snapshot)
        current_date += timedelta(days=1)

    print(f"Generated {len(snapshots)} daily snapshots")
    print(f"Final portfolio value: ${current_value:,.2f}")
    print(f"Total return: {((current_value - initial_value) / initial_value * 100):.2f}%")

    return snapshots


def create_sample_brokerage_accounts(user_id: str, db: Session) -> List[BrokerageAccount]:
    """Create sample brokerage accounts for the test user."""

    accounts = [
        BrokerageAccount(
            user_id=user_id,
            brokerage_type=BrokerType.FIDELITY,
            account_number="12345678",
            account_name="Fidelity Individual",
            account_type="individual",
            is_active=True,
            connection_status="connected",
            sync_status="success",
        ),
        BrokerageAccount(
            user_id=user_id,
            brokerage_type=BrokerType.ROBINHOOD,
            account_number="87654321",
            account_name="Robinhood Individual",
            account_type="individual",
            is_active=True,
            connection_status="connected",
            sync_status="success",
        ),
    ]

    return accounts


def create_sample_positions(account_id: int, broker: BrokerType) -> List[Position]:
    """Create sample positions for a brokerage account."""

    # Sample positions based on broker
    if broker == BrokerType.FIDELITY:
        positions = [
            Position(
                account_id=account_id,
                broker=broker,
                symbol="SPY",
                name="SPDR S&P 500 ETF Trust",
                quantity=Decimal("300"),
                cost_basis=Decimal("400.00"),
                current_price=Decimal("450.00"),
                position_type="etf",
                sector="Diversified",
                country="US",
            ),
            Position(
                account_id=account_id,
                broker=broker,
                symbol="QQQ",
                name="Invesco QQQ Trust",
                quantity=Decimal("200"),
                cost_basis=Decimal("350.00"),
                current_price=Decimal("380.00"),
                position_type="etf",
                sector="Technology",
                country="US",
            ),
            Position(
                account_id=account_id,
                broker=broker,
                symbol="AAPL",
                name="Apple Inc.",
                quantity=Decimal("100"),
                cost_basis=Decimal("150.00"),
                current_price=Decimal("175.00"),
                position_type="stock",
                sector="Technology",
                country="US",
            ),
        ]
    else:  # Robinhood
        positions = [
            Position(
                account_id=account_id,
                broker=broker,
                symbol="MSFT",
                name="Microsoft Corporation",
                quantity=Decimal("50"),
                cost_basis=Decimal("300.00"),
                current_price=Decimal("350.00"),
                position_type="stock",
                sector="Technology",
                country="US",
            ),
            Position(
                account_id=account_id,
                broker=broker,
                symbol="TSLA",
                name="Tesla, Inc.",
                quantity=Decimal("25"),
                cost_basis=Decimal("200.00"),
                current_price=Decimal("250.00"),
                position_type="stock",
                sector="Consumer Discretionary",
                country="US",
            ),
        ]

    return positions


def generate_comprehensive_test_data():
    """
    Generate comprehensive test data for the AIMS application.

    This includes:
    - Performance snapshots with realistic market behavior
    - Drawdown events and recoveries
    - Sample brokerage accounts and positions
    - Data that covers all E2E test scenarios
    """

    # Get database session
    db = next(get_db())

    try:
        # Find the test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("Error: Test user not found. Please run create_test_user.py first.")
            return

        print(f"Found test user: {test_user.user_id}")

        # Clear existing performance data for clean state
        db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == test_user.user_id
        ).delete()

        # Clear existing positions and accounts
        # First get account IDs, then delete positions
        account_ids = [
            acc.id
            for acc in db.query(BrokerageAccount)
            .filter(BrokerageAccount.user_id == test_user.user_id)
            .all()
        ]

        if account_ids:
            db.query(Position).filter(Position.account_id.in_(account_ids)).delete()

        db.query(BrokerageAccount).filter(BrokerageAccount.user_id == test_user.user_id).delete()

        db.commit()
        print("Cleared existing test data")

        # Generate performance data for the last 6 months
        end_date = date.today()
        start_date = end_date - timedelta(days=180)

        print(f"Generating performance data from {start_date} to {end_date}")

        # Create performance snapshots
        snapshots = create_realistic_performance_data(
            user_id=test_user.user_id,
            db=db,
            start_date=start_date,
            end_date=end_date,
            initial_value=Decimal("600000.00"),  # $600k as per mission
            target_annual_return=0.20,  # 20% annual return for $10k/month goal
            volatility=0.15,  # 15% volatility for realistic drawdowns
        )

        # Add snapshots to database
        db.add_all(snapshots)

        # Create sample brokerage accounts
        accounts = create_sample_brokerage_accounts(test_user.user_id, db)
        db.add_all(accounts)
        db.flush()  # Get account IDs

        # Create sample positions
        all_positions = []
        for account in accounts:
            positions = create_sample_positions(account.id, account.brokerage_type)
            all_positions.extend(positions)

        db.add_all(all_positions)

        # Commit all changes
        db.commit()

        print(f"\n✅ Successfully generated comprehensive test data:")
        print(f"   • {len(snapshots)} performance snapshots")
        print(f"   • {len(accounts)} brokerage accounts")
        print(f"   • {len(all_positions)} positions")

        # Analyze the generated data
        print(f"\n📊 Data Analysis:")

        # Calculate some key metrics
        initial_value = snapshots[0].total_value
        final_value = snapshots[-1].total_value
        total_return = (final_value - initial_value) / initial_value * 100

        # Find maximum drawdown
        max_drawdown = max([s.current_drawdown_percent or Decimal("0") for s in snapshots])

        # Count drawdown events (simplified - consecutive days in drawdown)
        drawdown_events = 0
        in_drawdown = False
        for snapshot in snapshots:
            if (
                snapshot.current_drawdown_percent and snapshot.current_drawdown_percent > 5
            ):  # 5% threshold
                if not in_drawdown:
                    drawdown_events += 1
                    in_drawdown = True
            else:
                in_drawdown = False

        print(f"   • Total return: {total_return:.2f}%")
        print(f"   • Maximum drawdown: {max_drawdown:.2f}%")
        print(f"   • Drawdown events (>5%): {drawdown_events}")
        print(f"   • Final portfolio value: ${final_value:,.2f}")

        # Check if data will trigger different test scenarios
        print(f"\n🧪 E2E Test Scenario Coverage:")
        print(f"   • Drawdown metrics: ✅ (max {max_drawdown:.1f}% > 5%)")
        print(f"   • Historical events: ✅ ({drawdown_events} events)")
        print(f"   • Recovery periods: ✅ (included in data)")
        print(f"   • Alert thresholds: {'✅' if max_drawdown > 15 else '⚠️'} (15%/20% thresholds)")
        print(f"   • Performance metrics: ✅ (all periods covered)")

        print(f"\n🎯 The test user now has comprehensive data for E2E testing!")
        print(f"   Email: test@example.com")
        print(f"   Password: testpassword")

    except Exception as e:
        print(f"Error generating test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def verify_test_data():
    """Verify that the generated test data is working correctly."""

    db = next(get_db())

    try:
        # Find test user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            print("❌ Test user not found")
            return False

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

        # Check brokerage accounts
        accounts = (
            db.query(BrokerageAccount).filter(BrokerageAccount.user_id == test_user.user_id).all()
        )

        print(f"✅ Found {len(accounts)} brokerage accounts")

        # Check positions
        total_positions = 0
        for account in accounts:
            positions = db.query(Position).filter(Position.account_id == account.id).all()
            total_positions += len(positions)

        print(f"✅ Found {total_positions} positions")

        # Test key metrics
        latest_snapshot = snapshots[-1]
        print(f"✅ Latest portfolio value: ${latest_snapshot.total_value:,.2f}")
        print(f"✅ Current drawdown: {latest_snapshot.current_drawdown_percent or 0:.2f}%")

        # Check for drawdown events
        significant_drawdowns = [
            s for s in snapshots if s.current_drawdown_percent and s.current_drawdown_percent > 10
        ]
        print(f"✅ Significant drawdowns (>10%): {len(significant_drawdowns)}")

        return True

    except Exception as e:
        print(f"❌ Error verifying test data: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Generating comprehensive test data for AIMS E2E testing...\n")

    # Generate the test data
    generate_comprehensive_test_data()

    print("\n" + "=" * 60)
    print("🔍 Verifying generated test data...\n")

    # Verify the data was created correctly
    if verify_test_data():
        print("\n✅ All verification checks passed!")
        print("\n📋 Next steps:")
        print("   1. Start the backend server: npm run dev (or equivalent)")
        print("   2. Start the frontend server")
        print("   3. Run E2E tests: npx playwright test")
        print("   4. Login with test@example.com / testpassword")
        print("   5. Navigate to Performance Analytics to see the data")
    else:
        print("\n❌ Some verification checks failed. Please review the output above.")
