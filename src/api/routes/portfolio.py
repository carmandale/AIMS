"""Portfolio API endpoints"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.db import get_db
from src.services import PortfolioService
from src.data.models import (
    Position, Balance, Transaction, PortfolioSummary, MorningBrief
)

limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])
portfolio_service = PortfolioService()


@router.get("/summary", response_model=Dict[str, Any])
async def get_portfolio_summary(db: Session = Depends(get_db)):
    """Get overall portfolio summary with positions and balances"""
    try:
        summary = await portfolio_service.get_portfolio_summary(db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions", response_model=List[Position])
async def get_positions(
    broker: Optional[str] = Query(None, description="Filter by broker"),
    db: Session = Depends(get_db)
):
    """Get all positions across brokers"""
    try:
        positions = await portfolio_service.fetch_all_positions(db)
        
        # Filter by broker if specified
        if broker:
            positions = [p for p in positions if p.broker.value == broker]
        
        return positions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balances", response_model=List[Balance])
async def get_balances(db: Session = Depends(get_db)):
    """Get cash/margin balances for all brokers"""
    try:
        balances = await portfolio_service.fetch_all_balances(db)
        return balances
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    days: int = Query(7, description="Number of days to fetch"),
    broker: Optional[str] = Query(None, description="Filter by broker"),
    db: Session = Depends(get_db)
):
    """Get recent transactions"""
    try:
        transactions = await portfolio_service.get_transactions(
            db=db,
            broker=broker
        )
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/weekly")
async def get_weekly_performance(db: Session = Depends(get_db)):
    """Get weekly performance data for charts"""
    try:
        # Mock weekly performance data
        # In production, this would query historical data
        return {
            "data": [
                {"date": "2024-12-09", "value": 580000, "pnl": 0},
                {"date": "2024-12-10", "value": 585000, "pnl": 5000},
                {"date": "2024-12-11", "value": 582000, "pnl": -3000},
                {"date": "2024-12-12", "value": 590000, "pnl": 8000},
                {"date": "2024-12-13", "value": 595000, "pnl": 5000},
                {"date": "2024-12-14", "value": 598000, "pnl": 3000},
                {"date": "2024-12-15", "value": 600000, "pnl": 2000}
            ],
            "summary": {
                "start_value": 580000,
                "end_value": 600000,
                "total_pnl": 20000,
                "pnl_percent": 3.45
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-weekly-report")
async def generate_weekly_report(db: Session = Depends(get_db)):
    """Generate weekly performance report (requires blocking tasks to be complete)"""
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
                    "blocking_tasks": [task.name for task in blocking_status.incomplete_blocking_tasks],
                    "total_blocking": len(blocking_status.incomplete_blocking_tasks)
                }
            )
        
        # Generate the weekly report (mock implementation)
        summary = await portfolio_service.get_portfolio_summary(db)
        
        report_data = {
            "report_id": f"weekly-{datetime.now().strftime('%Y-W%U')}",
            "generated_at": datetime.now().isoformat(),
            "portfolio_summary": summary,
            "status": "generated",
            "message": "Weekly report generated successfully"
        }
        
        return report_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate weekly report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate weekly report")


@router.post("/refresh")
@limiter.limit("5/hour")
async def refresh_portfolio_data(request: Request, db: Session = Depends(get_db)):
    """Force refresh of portfolio data"""
    try:
        # Invalidate cache
        from src.data.cache import cache_manager
        cache_manager.invalidate(db, "portfolio_")
        
        # Fetch fresh data
        summary = await portfolio_service.get_portfolio_summary(db)
        
        return {
            "status": "success",
            "message": "Portfolio data refreshed",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))