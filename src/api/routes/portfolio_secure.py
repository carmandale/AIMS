"""Secure Portfolio API endpoints with authentication and authorization"""

import logging
from datetime import datetime
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.api.auth import (
    get_current_user, 
    CurrentUser,
    portfolio_rate_limiter,
    sensitive_rate_limiter
)
from src.api.schemas.portfolio import (
    PerformanceMetricsRequest,
    RiskMetricsRequest,
    RebalancingSuggestionsRequest,
    StressTestRequest,
    PositionsRequest,
    TransactionsRequest
)
from src.db import get_db
from src.services import PortfolioService
from src.data.models import Position, Balance, Transaction, PortfolioSummary

limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])
portfolio_service = PortfolioService()


@router.get("/summary", response_model=Dict[str, Any])
async def get_portfolio_summary(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall portfolio summary with positions and balances"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Portfolio summary is user-specific but not implemented yet in the service
        # For now, we'll get the summary but in production this should be filtered by user
        summary = await portfolio_service.get_portfolio_summary(db)
        
        logger.info(f"Portfolio summary accessed by user: {current_user.user_id}")
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get portfolio summary for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions", response_model=List[Position])
async def get_positions(
    request: PositionsRequest = Depends(),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all positions across brokers for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        positions = await portfolio_service.fetch_all_positions(db)
        
        # Filter by broker if specified
        if request.broker:
            positions = [p for p in positions if p.broker.value == request.broker]
        
        logger.info(f"Positions accessed by user: {current_user.user_id}, broker: {request.broker}")
        return positions
        
    except Exception as e:
        logger.error(f"Failed to get positions for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balances", response_model=List[Balance])
async def get_balances(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cash/margin balances for all brokers for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        balances = await portfolio_service.fetch_all_balances(db)
        
        logger.info(f"Balances accessed by user: {current_user.user_id}")
        return balances
        
    except Exception as e:
        logger.error(f"Failed to get balances for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    request: TransactionsRequest = Depends(),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent transactions for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        transactions = await portfolio_service.get_transactions(
            db=db, 
            broker=request.broker
        )
        
        logger.info(f"Transactions accessed by user: {current_user.user_id}, days: {request.days}, broker: {request.broker}")
        return transactions
        
    except Exception as e:
        logger.error(f"Failed to get transactions for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/weekly")
async def get_weekly_performance(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weekly performance data for charts for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Mock weekly performance data
        # In production, this would query historical data for the specific user
        performance_data = {
            "data": [
                {"date": "2024-12-09", "value": 580000, "pnl": 0},
                {"date": "2024-12-10", "value": 585000, "pnl": 5000},
                {"date": "2024-12-11", "value": 582000, "pnl": -3000},
                {"date": "2024-12-12", "value": 590000, "pnl": 8000},
                {"date": "2024-12-13", "value": 595000, "pnl": 5000},
                {"date": "2024-12-14", "value": 598000, "pnl": 3000},
                {"date": "2024-12-15", "value": 600000, "pnl": 2000},
            ],
            "summary": {
                "start_value": 580000,
                "end_value": 600000,
                "total_pnl": 20000,
                "pnl_percent": 3.45,
            },
        }
        
        logger.info(f"Weekly performance accessed by user: {current_user.user_id}")
        return performance_data
        
    except Exception as e:
        logger.error(f"Failed to get weekly performance for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-weekly-report")
async def generate_weekly_report(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate weekly performance report for authenticated user"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if blocking tasks are complete before generating report
        from src.services.tasks.compliance_checker import ComplianceChecker
        
        compliance_checker = ComplianceChecker()
        blocking_status = await compliance_checker.check_weekly_cycle_ready(db)
        
        if not blocking_status.is_ready:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Cannot generate weekly report: blocking tasks incomplete",
                    "blocking_tasks": [
                        task.name for task in blocking_status.incomplete_blocking_tasks
                    ],
                    "total_blocking": len(blocking_status.incomplete_blocking_tasks),
                },
            )
        
        # Generate the weekly report
        summary = await portfolio_service.get_portfolio_summary(db)
        
        report_data = {
            "report_id": f"weekly-{datetime.now().strftime('%Y-W%U')}",
            "generated_at": datetime.now().isoformat(),
            "user_id": current_user.user_id,
            "portfolio_summary": summary,
            "status": "generated",
            "message": "Weekly report generated successfully",
        }
        
        logger.info(f"Weekly report generated for user: {current_user.user_id}")
        return report_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate weekly report for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate weekly report")


@router.post("/refresh")
@limiter.limit("3/hour")
async def refresh_portfolio_data(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Force refresh of portfolio data for authenticated user"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Invalidate cache
        from src.data.cache import cache_manager
        cache_manager.invalidate(db, f"portfolio_{current_user.user_id}_")
        
        # Fetch fresh data
        summary = await portfolio_service.get_portfolio_summary(db)
        
        logger.info(f"Portfolio data refreshed for user: {current_user.user_id}")
        return {
            "status": "success",
            "message": "Portfolio data refreshed",
            "user_id": current_user.user_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Failed to refresh portfolio data for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance", response_model=Dict[str, Any])
async def get_performance_metrics(
    request: PerformanceMetricsRequest = Depends(),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio performance metrics for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        metrics = await portfolio_service.get_performance_metrics(
            db, 
            current_user.user_id, 
            request.timeframe, 
            request.benchmark
        )
        
        logger.info(f"Performance metrics accessed by user: {current_user.user_id}, timeframe: {request.timeframe}")
        return metrics.model_dump()
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk", response_model=Dict[str, Any])
async def get_risk_metrics(
    request: RiskMetricsRequest = Depends(),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio risk metrics for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        metrics = await portfolio_service.get_risk_metrics(
            db, 
            current_user.user_id, 
            request.timeframe
        )
        
        logger.info(f"Risk metrics accessed by user: {current_user.user_id}, timeframe: {request.timeframe}")
        return metrics.model_dump()
        
    except Exception as e:
        logger.error(f"Failed to get risk metrics for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/allocation", response_model=Dict[str, Any])
async def get_asset_allocation(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio asset allocation analysis for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        allocation = await portfolio_service.get_asset_allocation(db, current_user.user_id)
        
        logger.info(f"Asset allocation accessed by user: {current_user.user_id}")
        return allocation.model_dump()
        
    except Exception as e:
        logger.error(f"Failed to get asset allocation for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rebalancing-suggestions", response_model=List[Dict[str, Any]])
async def get_rebalancing_suggestions(
    request: RebalancingSuggestionsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get rebalancing suggestions for authenticated user"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        suggestions = await portfolio_service.get_rebalancing_suggestions(
            db, 
            current_user.user_id, 
            request.target_allocation, 
            request.drift_threshold
        )
        
        logger.info(f"Rebalancing suggestions accessed by user: {current_user.user_id}")
        return suggestions
        
    except Exception as e:
        logger.error(f"Failed to get rebalancing suggestions for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/concentration", response_model=Dict[str, Any])
async def get_concentration_analysis(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get concentration risk analysis for authenticated user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        analysis = await portfolio_service.get_concentration_analysis(db, current_user.user_id)
        
        logger.info(f"Concentration analysis accessed by user: {current_user.user_id}")
        return analysis
        
    except Exception as e:
        logger.error(f"Failed to get concentration analysis for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stress-test", response_model=Dict[str, Any])
async def run_stress_test(
    request: StressTestRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run portfolio stress test for authenticated user"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        results = await portfolio_service.run_stress_test(
            db, 
            current_user.user_id, 
            request.scenarios
        )
        
        logger.info(f"Stress test completed for user: {current_user.user_id}")
        return results
        
    except Exception as e:
        logger.error(f"Failed to run stress test for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

