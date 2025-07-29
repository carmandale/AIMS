"""Performance API endpoints"""

import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from src.api.auth import get_current_user, CurrentUser, portfolio_rate_limiter
from src.db import get_db
from src.db.models import User, PerformanceSnapshot
from src.services.performance_analytics import PerformanceAnalyticsService
from src.services.benchmark_service import BenchmarkService
from src.services.drawdown_service_cached import CachedDrawdownService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/performance", tags=["performance"])


def parse_period_to_dates(period: str) -> tuple[date, date]:
    """Convert period string to start and end dates"""
    end_date = date.today()

    period_mapping = {
        "1D": timedelta(days=1),
        "7D": timedelta(days=7),
        "1M": timedelta(days=30),
        "3M": timedelta(days=90),
        "6M": timedelta(days=180),
        "1Y": timedelta(days=365),
    }

    if period in period_mapping:
        start_date = end_date - period_mapping[period]
    elif period == "YTD":
        start_date = date(end_date.year, 1, 1)
    elif period == "ALL":
        # This will be handled by the service to get earliest date
        start_date = date(2020, 1, 1)  # Reasonable earliest date
    else:
        raise ValueError(f"Invalid period: {period}")

    return start_date, end_date


@router.get("/metrics", response_model=Dict[str, Any])
async def get_performance_metrics(
    period: str = Query("1M", description="Period: 1D, 7D, 1M, 3M, 6M, 1Y, YTD, ALL"),
    benchmark: str = Query("SPY", description="Benchmark symbol (e.g., SPY, QQQ, NONE)"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve comprehensive performance metrics for the authenticated user's portfolio

    Returns portfolio metrics, benchmark comparison, and time series data for the specified period.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Validate period
        try:
            start_date, end_date = parse_period_to_dates(period)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid period: {period}")

        # Initialize services
        performance_service = PerformanceAnalyticsService(db)
        benchmark_service = BenchmarkService(db)

        # Get performance metrics
        if period == "ALL":
            metrics = performance_service.get_period_performance(current_user.user_id, "all")
        else:
            metrics = performance_service.calculate_returns_metrics(
                current_user.user_id, start_date, end_date, period.lower()
            )

        if not metrics:
            raise HTTPException(
                status_code=404, detail="No performance data available for the specified period"
            )

        # Get time series data for chart
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == current_user.user_id,
                    PerformanceSnapshot.snapshot_date >= start_date,
                    PerformanceSnapshot.snapshot_date <= end_date,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        # Format time series data
        time_series = []
        if snapshots:
            first_value = float(snapshots[0].total_value)
            for snapshot in snapshots:
                portfolio_return = 0.0
                if first_value > 0:
                    portfolio_return = (float(snapshot.total_value) - first_value) / first_value

                time_series.append(
                    {
                        "date": snapshot.snapshot_date.isoformat(),
                        "portfolio_value": float(snapshot.total_value),
                        "portfolio_return": portfolio_return,
                        "benchmark_return": 0.0,  # Will be populated by benchmark service
                    }
                )

        # Get benchmark data if requested
        benchmark_metrics = {}
        if benchmark != "NONE":
            try:
                benchmark_data = benchmark_service.get_benchmark_data(
                    benchmark, start_date, end_date
                )

                if benchmark_data:
                    # Calculate benchmark metrics
                    benchmark_metrics = {
                        "total_return": benchmark_data.get("total_return", 0.0),
                        "volatility": benchmark_data.get("volatility", 0.0),
                        "sharpe_ratio": benchmark_data.get("sharpe_ratio", 0.0),
                    }

                    # Update time series with benchmark returns
                    benchmark_returns = benchmark_data.get("returns", {})
                    for item in time_series:
                        date_str = item["date"]
                        if date_str in benchmark_returns:
                            item["benchmark_return"] = benchmark_returns[date_str]

            except Exception as e:
                logger.warning(f"Failed to fetch benchmark data: {e}")
                # Continue without benchmark data

        # Format response
        response = {
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
            "benchmark_metrics": benchmark_metrics,
            "time_series": time_series,
            "last_updated": datetime.utcnow().isoformat() + "Z",
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating performance metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Calculation error or external data unavailable: {str(e)}"
        )


@router.get("/historical", response_model=Dict[str, Any])
async def get_historical_performance(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    frequency: str = Query("daily", description="Frequency: daily, weekly, monthly"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical performance data for extended time periods

    Returns time series data at the specified frequency with summary statistics.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Validate date range
        if start_date > end_date:
            raise HTTPException(
                status_code=400, detail="Invalid date range: start_date must be before end_date"
            )

        if end_date > date.today():
            raise HTTPException(
                status_code=400, detail="Invalid date range: end_date cannot be in the future"
            )

        # Validate frequency
        if frequency not in ["daily", "weekly", "monthly"]:
            raise HTTPException(status_code=400, detail=f"Invalid frequency: {frequency}")

        # Initialize service
        performance_service = PerformanceAnalyticsService(db)

        # Get all snapshots for the period
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == current_user.user_id,
                    PerformanceSnapshot.snapshot_date >= start_date,
                    PerformanceSnapshot.snapshot_date <= end_date,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        if not snapshots:
            raise HTTPException(
                status_code=404, detail="No performance data available for the specified period"
            )

        # Filter snapshots based on frequency
        filtered_snapshots = []
        if frequency == "daily":
            filtered_snapshots = snapshots
        elif frequency == "weekly":
            # Get last snapshot of each week
            current_week = None
            last_snapshot = None
            for snapshot in snapshots:
                week = snapshot.snapshot_date.isocalendar()[1]
                if week != current_week:
                    if current_week is not None and filtered_snapshots and last_snapshot:
                        # Replace with last snapshot of the week
                        filtered_snapshots[-1] = last_snapshot
                    filtered_snapshots.append(snapshot)
                    current_week = week
                last_snapshot = snapshot
            # Add the last snapshot
            if filtered_snapshots and last_snapshot and last_snapshot != filtered_snapshots[-1]:
                filtered_snapshots[-1] = last_snapshot
        elif frequency == "monthly":
            # Get last snapshot of each month
            current_month = None
            last_snapshot = None
            for snapshot in snapshots:
                month = (snapshot.snapshot_date.year, snapshot.snapshot_date.month)
                if month != current_month:
                    if current_month is not None and filtered_snapshots and last_snapshot:
                        # Replace with last snapshot of the month
                        filtered_snapshots[-1] = last_snapshot
                    filtered_snapshots.append(snapshot)
                    current_month = month
                last_snapshot = snapshot
            # Add the last snapshot
            if filtered_snapshots and last_snapshot and last_snapshot != filtered_snapshots[-1]:
                filtered_snapshots[-1] = last_snapshot

        # Calculate returns for filtered data
        data_points = []
        if filtered_snapshots:
            first_value = float(filtered_snapshots[0].total_value)
            prev_value = first_value

            for snapshot in filtered_snapshots:
                current_value = float(snapshot.total_value)
                cumulative_return = 0.0
                period_return = 0.0

                if first_value > 0:
                    cumulative_return = (current_value - first_value) / first_value

                if prev_value > 0 and snapshot != filtered_snapshots[0]:
                    period_return = (current_value - prev_value) / prev_value

                data_points.append(
                    {
                        "date": snapshot.snapshot_date.isoformat(),
                        "portfolio_value": current_value,
                        "cumulative_return": cumulative_return,
                        "period_return": period_return,
                    }
                )

                prev_value = current_value

        # Calculate summary metrics
        metrics = performance_service.calculate_returns_metrics(
            current_user.user_id, start_date, end_date, "custom"
        )

        summary = {}
        if metrics:
            summary = {
                "total_return": (
                    float(metrics.percent_change / 100) if metrics.percent_change else 0.0
                ),
                "annualized_return": (
                    float(metrics.annualized_return / 100) if metrics.annualized_return else 0.0
                ),
                "max_drawdown": float(metrics.max_drawdown / 100) if metrics.max_drawdown else 0.0,
                "volatility": float(metrics.volatility / 100) if metrics.volatility else 0.0,
                "sharpe_ratio": metrics.sharpe_ratio or 0.0,
            }

        return {
            "data": data_points,
            "summary": summary,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving historical performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/benchmark", response_model=Dict[str, Any])
async def update_benchmark_config(
    benchmark_data: Dict[str, Any],
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update or configure custom benchmark for performance comparison

    Allows users to set a custom benchmark symbol for portfolio comparison.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Validate request data
        benchmark_type = benchmark_data.get("benchmark_type", "custom")
        symbol = benchmark_data.get("symbol")
        name = benchmark_data.get("name", "")
        allocation = benchmark_data.get("allocation", 1.0)

        if not symbol:
            raise HTTPException(status_code=400, detail="Benchmark symbol is required")

        if allocation < 0 or allocation > 1:
            raise HTTPException(status_code=400, detail="Allocation must be between 0 and 1")

        # Initialize benchmark service
        benchmark_service = BenchmarkService(db)

        # Validate benchmark symbol
        try:
            is_valid = benchmark_service.validate_symbol(symbol)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Invalid benchmark symbol: {symbol}")
        except Exception as e:
            logger.warning(f"Failed to validate benchmark symbol: {e}")
            # Continue anyway - symbol validation is not critical

        # Update user's benchmark configuration
        user = db.query(User).filter(User.user_id == current_user.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Store benchmark config in user preferences (or a separate table)
        # For now, we'll store it in a simple format
        # In production, this would be a separate BenchmarkConfig table
        benchmark_config = {
            "id": 1,  # Mock ID
            "symbol": symbol,
            "name": name or symbol,
            "allocation": allocation,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

        # Here you would typically save to database
        # db.add(BenchmarkConfig(...))
        # db.commit()

        logger.info(f"Updated benchmark config for user {current_user.user_id}: {symbol}")

        return {
            "message": "Benchmark updated successfully",
            "benchmark": benchmark_config,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating benchmark config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drawdown/current", response_model=Dict[str, Any])
async def get_current_drawdown(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get current drawdown from peak"""
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)
        # Get all performance snapshots for the user
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(PerformanceSnapshot.user_id == current_user.user_id)
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )
        
        # Calculate current drawdown
        drawdown_service = CachedDrawdownService()
        result = drawdown_service.calculate_current_drawdown_cached(db, current_user.user_id, snapshots)
        
        # Convert Decimal to string for JSON serialization
        return {
            "current_drawdown_percent": str(result["current_drawdown_percent"]),
            "current_drawdown_amount": str(result["current_drawdown_amount"]),
            "peak_value": str(result["peak_value"]),
            "peak_date": result["peak_date"].isoformat() if result["peak_date"] else None,
            "current_value": str(result["current_value"]),
            "current_date": result["current_date"].isoformat() if result["current_date"] else None,
            "days_in_drawdown": result.get("days_in_drawdown", 0),
        }
        
    except Exception as e:
        logger.error(f"Error calculating current drawdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drawdown/historical", response_model=Dict[str, Any])
async def get_historical_drawdowns(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    threshold: float = Query(5.0, description="Minimum drawdown percentage threshold"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get historical drawdown events"""
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)
        # Get performance snapshots
        query = db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == current_user.user_id
        )
        
        if start_date:
            query = query.filter(PerformanceSnapshot.snapshot_date >= start_date)
        if end_date:
            query = query.filter(PerformanceSnapshot.snapshot_date <= end_date)
            
        snapshots = query.order_by(PerformanceSnapshot.snapshot_date).all()
        
        # Calculate drawdown events
        drawdown_service = CachedDrawdownService()
        events = drawdown_service.calculate_drawdown_events_cached(
            db,
            current_user.user_id,
            threshold_percent=Decimal(str(threshold)),
            start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
            end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
            snapshots=snapshots
        )
        
        # Format events for JSON
        formatted_events = []
        for event in events:
            formatted_events.append({
                "peak_value": str(event["peak_value"]),
                "peak_date": event["peak_date"].isoformat(),
                "trough_value": str(event["trough_value"]),
                "trough_date": event["trough_date"].isoformat(),
                "max_drawdown_percent": str(event["max_drawdown_percent"]),
                "drawdown_amount": str(event["drawdown_amount"]),
                "drawdown_days": event["drawdown_days"],
                "recovery_days": event["recovery_days"],
                "is_recovered": event["is_recovered"],
                "total_days": event["total_days"],
            })
        
        return {"events": formatted_events}
        
    except Exception as e:
        logger.error(f"Error getting historical drawdowns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drawdown/analysis", response_model=Dict[str, Any])
async def get_drawdown_analysis(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get comprehensive drawdown analysis with underwater curve"""
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)
        # Get performance snapshots
        query = db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.user_id == current_user.user_id
        )
        
        if start_date:
            query = query.filter(PerformanceSnapshot.snapshot_date >= start_date)
        if end_date:
            query = query.filter(PerformanceSnapshot.snapshot_date <= end_date)
            
        snapshots = query.order_by(PerformanceSnapshot.snapshot_date).all()
        
        # Get drawdown analysis
        drawdown_service = CachedDrawdownService()
        analysis = drawdown_service.get_historical_analysis_cached(
            db,
            current_user.user_id,
            start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
            end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
            snapshots=snapshots
        )
        
        # Get underwater curve
        curve = drawdown_service.calculate_underwater_curve_cached(
            db,
            current_user.user_id,
            start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
            end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
            snapshots=snapshots
        )
        
        # Format curve for JSON
        formatted_curve = []
        for point in curve:
            formatted_curve.append({
                "date": point["date"].isoformat(),
                "drawdown_percent": str(point["drawdown_percent"]),
                "portfolio_value": str(point["portfolio_value"]),
                "peak_value": str(point["peak_value"]),
            })
        
        return {
            "total_drawdown_events": analysis["total_drawdown_events"],
            "max_drawdown_percent": str(analysis["max_drawdown_percent"]),
            "max_drawdown_amount": str(analysis["max_drawdown_amount"]),
            "average_drawdown_percent": str(analysis["average_drawdown_percent"]),
            "average_recovery_days": analysis["average_recovery_days"],
            "longest_drawdown_days": analysis["longest_drawdown_days"],
            "current_drawdown_percent": str(analysis["current_drawdown_percent"]),
            "underwater_curve": formatted_curve,
        }
        
    except Exception as e:
        logger.error(f"Error getting drawdown analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drawdown/alerts", response_model=Dict[str, Any])
async def get_drawdown_alerts(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Check current drawdown against alert thresholds"""
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)
        # Get user's alert preferences (could be stored in user preferences table)
        # For now, use default thresholds
        warning_threshold = "15.0"  # Default 15%
        critical_threshold = "20.0"  # Default 20%
        
        # TODO: Get from user preferences when implemented
        # user_prefs = db.query(UserPreferences).filter_by(user_id=current_user.user_id).first()
        # if user_prefs:
        #     warning_threshold = str(user_prefs.drawdown_warning_threshold)
        #     critical_threshold = str(user_prefs.drawdown_critical_threshold)
        
        # Get performance snapshots
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(PerformanceSnapshot.user_id == current_user.user_id)
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )
        
        # Check alerts
        drawdown_service = CachedDrawdownService()
        alerts = drawdown_service.check_alert_thresholds(
            snapshots,
            warning_threshold=Decimal(warning_threshold),
            critical_threshold=Decimal(critical_threshold),
        )
        
        # Format alerts for JSON
        formatted_alerts = []
        for alert in alerts:
            formatted_alerts.append({
                "level": alert["level"],
                "threshold": str(alert["threshold"]),
                "current_drawdown": str(alert["current_drawdown"]),
                "message": alert["message"],
                "triggered_at": alert["triggered_at"].isoformat(),
            })
        
        return {
            "alerts": formatted_alerts,
            "warning_threshold": warning_threshold,
            "critical_threshold": critical_threshold,
        }
        
    except Exception as e:
        logger.error(f"Error checking drawdown alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/drawdown/alerts/config", response_model=Dict[str, Any])
async def update_alert_config(
    config: Dict[str, Any],
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Update drawdown alert thresholds"""
    try:
        warning_threshold = float(config.get("warning_threshold", 15.0))
        critical_threshold = float(config.get("critical_threshold", 20.0))
        
        # Validate thresholds
        if warning_threshold < 0 or critical_threshold < 0:
            raise HTTPException(
                status_code=400,
                detail="Thresholds must be positive"
            )
        
        if warning_threshold >= critical_threshold:
            raise HTTPException(
                status_code=400,
                detail="Warning threshold must be less than critical threshold"
            )
        
        # TODO: Save to user preferences when implemented
        # user_prefs = db.query(UserPreferences).filter_by(user_id=current_user.user_id).first()
        # if not user_prefs:
        #     user_prefs = UserPreferences(user_id=current_user.user_id)
        #     db.add(user_prefs)
        # 
        # user_prefs.drawdown_warning_threshold = warning_threshold
        # user_prefs.drawdown_critical_threshold = critical_threshold
        # db.commit()
        
        return {
            "warning_threshold": str(warning_threshold),
            "critical_threshold": str(critical_threshold),
            "message": "Alert thresholds updated successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating alert config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
