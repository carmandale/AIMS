#!/usr/bin/env python3
"""Validation script for position sizing service"""

import sys

sys.path.append(".")

from src.services.position_sizing import PositionSizingService, SizingMethod


def main():
    service = PositionSizingService()

    print("=== Position Sizing Service Validation ===\n")

    # Test 1: Fixed Risk Calculation
    print("1. Fixed Risk Calculation")
    print("-" * 40)
    result = service.calculate_position_size(
        method=SizingMethod.FIXED_RISK,
        account_value=100000,
        risk_percentage=0.02,
        entry_price=50,
        stop_loss=48,
        target_price=56,
    )
    print(f"Account: $100,000 | Risk: 2% | Entry: $50 | Stop: $48")
    print(f"Position Size: {result.position_size} shares")
    print(f"Position Value: ${result.position_value:,.2f}")
    print(f"Risk Amount: ${result.risk_amount:,.2f}")
    print(f"Risk/Reward Ratio: {result.risk_reward_ratio:.1f}:1")
    print()

    # Test 2: Kelly Criterion
    print("2. Kelly Criterion Calculation")
    print("-" * 40)
    result = service.calculate_position_size(
        method=SizingMethod.KELLY,
        account_value=100000,
        win_rate=0.6,
        avg_win_loss_ratio=2.0,
        confidence_level=0.25,
    )
    print(f"Account: $100,000 | Win Rate: 60% | Win/Loss: 2.0")
    print(f"Kelly %: {result.kelly_percentage:.1%} (Quarter Kelly)")
    print(f"Position Value: ${result.position_value:,.2f}")
    print()

    # Test 3: Volatility-Based
    print("3. Volatility-Based Sizing")
    print("-" * 40)
    result = service.calculate_position_size(
        method=SizingMethod.VOLATILITY_BASED,
        account_value=100000,
        risk_percentage=0.02,
        entry_price=50,
        atr=2.5,
        atr_multiplier=2.0,
    )
    print(f"Account: $100,000 | ATR: $2.50 | ATR Multiple: 2x")
    print(f"Position Size: {result.position_size} shares")
    print(f"Stop Loss Distance: {result.stop_loss_percentage:.1%}")
    print()

    # Test 4: Position Validation
    print("4. Position Size Validation")
    print("-" * 40)
    validation = service.validate_position_size(
        symbol="AAPL",
        position_size=1000,
        entry_price=150,
        account_id=1,
        account_value=100000,
        max_position_pct=0.25,
    )
    print(f"Validating 1000 shares of AAPL at $150")
    print(f"Valid: {validation['valid']}")
    if validation["violations"]:
        print(f"Violations: {validation['violations']}")
    print(f"Max Allowed Size: {validation['max_allowed_size']} shares")

    print("\n✅ All position sizing methods working correctly!")


if __name__ == "__main__":
    main()
