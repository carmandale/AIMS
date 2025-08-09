"""Drawdown calculation and analysis service"""

from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Optional, Any

from src.db.models import PerformanceSnapshot


class DrawdownService:
    """Service for calculating and analyzing portfolio drawdowns"""

    def calculate_current_drawdown(self, snapshots: List[PerformanceSnapshot]) -> Dict[str, Any]:
        """
        Calculate current drawdown from peak

        Args:
            snapshots: List of performance snapshots ordered by date

        Returns:
            Dict containing current drawdown metrics
        """
        if not snapshots:
            return {
                "current_drawdown_percent": Decimal("0"),
                "current_drawdown_amount": Decimal("0"),
                "peak_value": Decimal("0"),
                "peak_date": None,
                "current_value": Decimal("0"),
                "current_date": None,
            }

        # Find peak value and date
        peak_value = Decimal("0")
        peak_date = None
        peak_index = 0

        for i, snapshot in enumerate(snapshots):
            if snapshot.total_value > peak_value:
                peak_value = snapshot.total_value
                peak_date = snapshot.snapshot_date
                peak_index = i

        # Current values
        current_snapshot = snapshots[-1]
        current_value = current_snapshot.total_value
        current_date = current_snapshot.snapshot_date

        # Calculate drawdown
        drawdown_amount = peak_value - current_value
        drawdown_percent = Decimal("0")
        if peak_value > 0:
            drawdown_percent = (drawdown_amount / peak_value * 100).quantize(Decimal("0.01"))

        return {
            "current_drawdown_percent": drawdown_percent,
            "current_drawdown_amount": drawdown_amount.quantize(Decimal("0.01")),
            "peak_value": peak_value.quantize(Decimal("0.01")),
            "peak_date": peak_date,
            "current_value": current_value.quantize(Decimal("0.01")),
            "current_date": current_date,
            "days_in_drawdown": (
                (current_date - peak_date).days if peak_date and drawdown_amount > 0 else 0
            ),
        }

    def calculate_drawdown_events(
        self, snapshots: List[PerformanceSnapshot], threshold_percent: Decimal = Decimal("5.0")
    ) -> List[Dict[str, Any]]:
        """
        Identify significant drawdown events

        Args:
            snapshots: List of performance snapshots
            threshold_percent: Minimum drawdown percent to consider as event

        Returns:
            List of drawdown events with details
        """
        if not snapshots:
            return []

        events = []
        current_peak = snapshots[0].total_value
        current_peak_date = snapshots[0].snapshot_date
        current_peak_index = 0
        in_drawdown = False
        drawdown_start_index = 0
        max_drawdown_in_event = Decimal("0")
        trough_value = current_peak
        trough_date = current_peak_date
        trough_index = 0

        for i, snapshot in enumerate(snapshots):
            value = snapshot.total_value

            # Check if new peak
            if value >= current_peak:
                # If we were in a drawdown, record the event
                if in_drawdown and max_drawdown_in_event >= threshold_percent:
                    # Calculate recovery days
                    recovery_days = 0
                    is_recovered = False

                    # Check if recovered
                    if value >= current_peak:
                        recovery_days = (snapshot.snapshot_date - trough_date).days
                        is_recovered = True

                    events.append(
                        {
                            "peak_value": current_peak,
                            "peak_date": current_peak_date,
                            "trough_value": trough_value,
                            "trough_date": trough_date,
                            "max_drawdown_percent": max_drawdown_in_event,
                            "drawdown_amount": current_peak - trough_value,
                            "drawdown_days": (trough_date - current_peak_date).days,
                            "recovery_days": recovery_days,
                            "is_recovered": is_recovered,
                            "total_days": (
                                (snapshot.snapshot_date - current_peak_date).days
                                if is_recovered
                                else None
                            ),
                        }
                    )

                # Update peak
                current_peak = value
                current_peak_date = snapshot.snapshot_date
                current_peak_index = i
                in_drawdown = False
                max_drawdown_in_event = Decimal("0")
            else:
                # Calculate drawdown
                drawdown_amount = current_peak - value
                drawdown_percent = (drawdown_amount / current_peak * 100).quantize(Decimal("0.01"))

                if drawdown_percent > 0:
                    in_drawdown = True

                    # Track maximum drawdown in this event
                    if drawdown_percent > max_drawdown_in_event:
                        max_drawdown_in_event = drawdown_percent
                        trough_value = value
                        trough_date = snapshot.snapshot_date
                        trough_index = i

        # Handle ongoing drawdown at end
        if in_drawdown and max_drawdown_in_event >= threshold_percent:
            events.append(
                {
                    "peak_value": current_peak,
                    "peak_date": current_peak_date,
                    "trough_value": trough_value,
                    "trough_date": trough_date,
                    "max_drawdown_percent": max_drawdown_in_event,
                    "drawdown_amount": current_peak - trough_value,
                    "drawdown_days": (trough_date - current_peak_date).days,
                    "recovery_days": None,  # Not yet recovered
                    "is_recovered": False,
                    "total_days": None,
                }
            )

        return events

    def calculate_underwater_curve(
        self, snapshots: List[PerformanceSnapshot]
    ) -> List[Dict[str, Any]]:
        """
        Calculate underwater curve (drawdown over time)

        Args:
            snapshots: List of performance snapshots

        Returns:
            List of points for underwater curve visualization
        """
        if not snapshots:
            return []

        curve = []
        running_peak = Decimal("0")

        for snapshot in snapshots:
            value = snapshot.total_value

            # Update running peak
            if value > running_peak:
                running_peak = value

            # Calculate drawdown from peak
            drawdown_amount = running_peak - value
            drawdown_percent = Decimal("0")
            if running_peak > 0:
                drawdown_percent = (drawdown_amount / running_peak * 100).quantize(Decimal("0.01"))

            curve.append(
                {
                    "date": snapshot.snapshot_date,
                    "drawdown_percent": drawdown_percent,
                    "portfolio_value": value,
                    "peak_value": running_peak,
                }
            )

        return curve

    def check_alert_thresholds(
        self,
        snapshots: List[PerformanceSnapshot],
        warning_threshold: Decimal = Decimal("15.0"),
        critical_threshold: Decimal = Decimal("20.0"),
    ) -> List[Dict[str, Any]]:
        """
        Check if current drawdown exceeds alert thresholds

        Args:
            snapshots: List of performance snapshots
            warning_threshold: Warning threshold percentage
            critical_threshold: Critical threshold percentage

        Returns:
            List of triggered alerts
        """
        current_dd = self.calculate_current_drawdown(snapshots)
        drawdown_percent = current_dd["current_drawdown_percent"]

        alerts = []

        if drawdown_percent >= critical_threshold:
            alerts.append(
                {
                    "level": "critical",
                    "threshold": critical_threshold,
                    "current_drawdown": drawdown_percent,
                    "message": f"CRITICAL: Drawdown exceeds critical threshold of {critical_threshold}%",
                    "triggered_at": datetime.utcnow(),
                }
            )

        if drawdown_percent >= warning_threshold:
            alerts.append(
                {
                    "level": "warning",
                    "threshold": warning_threshold,
                    "current_drawdown": drawdown_percent,
                    "message": f"WARNING: Drawdown exceeds warning threshold of {warning_threshold}%",
                    "triggered_at": datetime.utcnow(),
                }
            )

        return alerts

    def get_historical_analysis(
        self,
        snapshots: List[PerformanceSnapshot],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        threshold_percent: Decimal = Decimal("5.0"),
    ) -> Dict[str, Any]:
        """
        Analyze historical drawdown patterns

        Args:
            snapshots: List of performance snapshots
            start_date: Analysis start date (optional)
            end_date: Analysis end date (optional)
            threshold_percent: Minimum drawdown to include in analysis

        Returns:
            Dict containing historical analysis metrics
        """
        # Filter snapshots by date range if provided
        filtered_snapshots = snapshots
        if start_date:
            filtered_snapshots = [s for s in filtered_snapshots if s.snapshot_date >= start_date]
        if end_date:
            filtered_snapshots = [s for s in filtered_snapshots if s.snapshot_date <= end_date]

        if not filtered_snapshots:
            return {
                "total_drawdown_events": 0,
                "max_drawdown_percent": Decimal("0"),
                "max_drawdown_amount": Decimal("0"),
                "average_drawdown_percent": Decimal("0"),
                "average_recovery_days": 0,
                "longest_drawdown_days": 0,
                "current_drawdown_percent": Decimal("0"),
                "events": [],
            }

        # Get drawdown events
        events = self.calculate_drawdown_events(filtered_snapshots, threshold_percent)

        # Calculate metrics
        max_drawdown_percent = Decimal("0")
        max_drawdown_amount = Decimal("0")
        total_drawdown_percent = Decimal("0")
        total_recovery_days = 0
        recovered_events = 0
        longest_drawdown_days = 0

        for event in events:
            if event["max_drawdown_percent"] > max_drawdown_percent:
                max_drawdown_percent = event["max_drawdown_percent"]
                max_drawdown_amount = event["drawdown_amount"]

            total_drawdown_percent += event["max_drawdown_percent"]

            if event["is_recovered"] and event["recovery_days"]:
                total_recovery_days += event["recovery_days"]
                recovered_events += 1

            if event["drawdown_days"] > longest_drawdown_days:
                longest_drawdown_days = event["drawdown_days"]

        # Calculate averages
        avg_drawdown_percent = Decimal("0")
        if events:
            avg_drawdown_percent = (total_drawdown_percent / len(events)).quantize(Decimal("0.01"))

        avg_recovery_days = 0
        if recovered_events > 0:
            avg_recovery_days = total_recovery_days // recovered_events

        # Get current drawdown
        current_dd = self.calculate_current_drawdown(filtered_snapshots)

        return {
            "total_drawdown_events": len(events),
            "max_drawdown_percent": max_drawdown_percent,
            "max_drawdown_amount": max_drawdown_amount,
            "average_drawdown_percent": avg_drawdown_percent,
            "average_recovery_days": avg_recovery_days,
            "longest_drawdown_days": longest_drawdown_days,
            "current_drawdown_percent": current_dd["current_drawdown_percent"],
            "events": events,
        }
