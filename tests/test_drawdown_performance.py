"""Performance tests for drawdown calculations"""

import time
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from src.db.models import PerformanceSnapshot
from src.services.drawdown_service import DrawdownService


class TestDrawdownPerformance:
    """Performance tests for DrawdownService"""
    
    @pytest.fixture
    def service(self):
        """Create DrawdownService instance"""
        return DrawdownService()
    
    @pytest.fixture
    def generate_snapshots(self):
        """Generate performance snapshots for testing"""
        def _generate(days: int, volatility: float = 0.02) -> List[PerformanceSnapshot]:
            snapshots = []
            base_value = 100000
            current_value = base_value
            base_date = datetime.utcnow().date() - timedelta(days=days)
            
            for i in range(days):
                # Simulate market volatility
                import random
                change = random.uniform(-volatility, volatility)
                current_value = current_value * (1 + change)
                
                snapshot = PerformanceSnapshot(
                    user_id="test_user",
                    snapshot_date=base_date + timedelta(days=i),
                    total_value=Decimal(str(current_value)),
                    cash_value=Decimal("10000"),
                    positions_value=Decimal(str(current_value - 10000)),
                    daily_pnl=Decimal("0"),
                    daily_pnl_percent=Decimal("0"),
                    created_at=datetime.utcnow()
                )
                snapshots.append(snapshot)
            
            return snapshots
        
        return _generate
    
    def test_calculate_current_drawdown_performance(self, service, generate_snapshots):
        """Test performance of current drawdown calculation"""
        test_cases = [
            (30, "1 month"),
            (90, "3 months"),
            (365, "1 year"),
            (730, "2 years"),
            (1825, "5 years")
        ]
        
        results = []
        
        for days, label in test_cases:
            snapshots = generate_snapshots(days)
            
            # Measure execution time
            start_time = time.time()
            result = service.calculate_current_drawdown(snapshots)
            execution_time = time.time() - start_time
            
            results.append({
                "days": days,
                "label": label,
                "execution_time": execution_time,
                "snapshots_count": len(snapshots)
            })
            
            # Performance assertion - should complete within reasonable time
            assert execution_time < 0.1, f"Current drawdown calculation took too long for {label}: {execution_time:.4f}s"
        
        # Print performance results
        print("\nCurrent Drawdown Calculation Performance:")
        for result in results:
            print(f"  {result['label']:10s} ({result['snapshots_count']:4d} snapshots): {result['execution_time']*1000:.2f}ms")
    
    def test_calculate_drawdown_events_performance(self, service, generate_snapshots):
        """Test performance of drawdown events calculation"""
        test_cases = [
            (30, "1 month"),
            (90, "3 months"),
            (365, "1 year"),
            (730, "2 years"),
            (1825, "5 years")
        ]
        
        results = []
        
        for days, label in test_cases:
            snapshots = generate_snapshots(days, volatility=0.03)  # Higher volatility for more events
            
            # Measure execution time
            start_time = time.time()
            events = service.calculate_drawdown_events(snapshots, threshold_percent=Decimal("3.0"))
            execution_time = time.time() - start_time
            
            results.append({
                "days": days,
                "label": label,
                "execution_time": execution_time,
                "snapshots_count": len(snapshots),
                "events_count": len(events)
            })
            
            # Performance assertion
            assert execution_time < 0.5, f"Drawdown events calculation took too long for {label}: {execution_time:.4f}s"
        
        # Print performance results
        print("\nDrawdown Events Calculation Performance:")
        for result in results:
            print(f"  {result['label']:10s} ({result['snapshots_count']:4d} snapshots, {result['events_count']:2d} events): {result['execution_time']*1000:.2f}ms")
    
    def test_calculate_underwater_curve_performance(self, service, generate_snapshots):
        """Test performance of underwater curve calculation"""
        test_cases = [
            (30, "1 month"),
            (90, "3 months"),
            (365, "1 year"),
            (730, "2 years"),
            (1825, "5 years")
        ]
        
        results = []
        
        for days, label in test_cases:
            snapshots = generate_snapshots(days)
            
            # Measure execution time
            start_time = time.time()
            curve = service.calculate_underwater_curve(snapshots)
            execution_time = time.time() - start_time
            
            results.append({
                "days": days,
                "label": label,
                "execution_time": execution_time,
                "points_count": len(curve)
            })
            
            # Performance assertion
            assert execution_time < 0.2, f"Underwater curve calculation took too long for {label}: {execution_time:.4f}s"
        
        # Print performance results
        print("\nUnderwater Curve Calculation Performance:")
        for result in results:
            print(f"  {result['label']:10s} ({result['points_count']:4d} points): {result['execution_time']*1000:.2f}ms")
    
    def test_historical_analysis_performance(self, service, generate_snapshots):
        """Test performance of historical analysis"""
        test_cases = [
            (30, "1 month"),
            (90, "3 months"),
            (365, "1 year"),
            (730, "2 years"),
            (1825, "5 years")
        ]
        
        results = []
        
        for days, label in test_cases:
            snapshots = generate_snapshots(days, volatility=0.025)
            
            # Measure execution time
            start_time = time.time()
            analysis = service.get_historical_analysis(
                snapshots,
                threshold_percent=Decimal("3.0")
            )
            execution_time = time.time() - start_time
            
            results.append({
                "days": days,
                "label": label,
                "execution_time": execution_time,
                "total_events": analysis["total_drawdown_events"]
            })
            
            # Performance assertion
            assert execution_time < 1.0, f"Historical analysis took too long for {label}: {execution_time:.4f}s"
        
        # Print performance results
        print("\nHistorical Analysis Performance:")
        for result in results:
            print(f"  {result['label']:10s} ({result['total_events']:2d} events): {result['execution_time']*1000:.2f}ms")
    
    def test_repeated_calculations_performance(self, service, generate_snapshots):
        """Test performance of repeated calculations (simulating real-time updates)"""
        # Generate base snapshots
        snapshots = generate_snapshots(365)
        
        # Simulate real-time updates - calculate drawdown 100 times
        iterations = 100
        start_time = time.time()
        
        for _ in range(iterations):
            _ = service.calculate_current_drawdown(snapshots)
        
        total_time = time.time() - start_time
        avg_time = total_time / iterations
        
        print(f"\nRepeated Calculations Performance:")
        print(f"  Total time for {iterations} iterations: {total_time:.2f}s")
        print(f"  Average time per calculation: {avg_time*1000:.2f}ms")
        
        # Should be able to handle at least 100 calculations per second
        assert avg_time < 0.01, f"Average calculation time too high: {avg_time:.4f}s"
    
    def test_memory_efficiency(self, service, generate_snapshots):
        """Test memory efficiency with large datasets"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        
        # Get initial memory usage
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Generate large dataset (5 years)
        snapshots = generate_snapshots(1825)
        
        # Perform all calculations
        _ = service.calculate_current_drawdown(snapshots)
        _ = service.calculate_drawdown_events(snapshots)
        _ = service.calculate_underwater_curve(snapshots)
        _ = service.get_historical_analysis(snapshots)
        
        # Get final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"\nMemory Efficiency:")
        print(f"  Initial memory: {initial_memory:.1f} MB")
        print(f"  Final memory: {final_memory:.1f} MB")
        print(f"  Memory increase: {memory_increase:.1f} MB")
        
        # Memory increase should be reasonable (less than 100MB for 5 years of data)
        assert memory_increase < 100, f"Memory usage too high: {memory_increase:.1f} MB"