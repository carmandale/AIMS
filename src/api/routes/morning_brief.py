"""Morning Brief API endpoints"""
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.services import PortfolioService
from src.data.models import MorningBrief

router = APIRouter(prefix="/morning-brief", tags=["morning-brief"])
portfolio_service = PortfolioService()


@router.get("", response_model=MorningBrief)
async def get_morning_brief(
    date: Optional[date] = Query(None, description="Date for morning brief (defaults to today)"),
    db: Session = Depends(get_db)
):
    """Get morning brief for specified date"""
    try:
        # Default to today
        if not date:
            date = datetime.utcnow().date()
        
        # Check if brief exists in database
        from src.db.models import MorningBrief as DBMorningBrief
        db_brief = db.query(DBMorningBrief).filter(
            DBMorningBrief.date == date
        ).first()
        
        if db_brief:
            # Convert DB model to Pydantic model
            brief = MorningBrief(
                date=datetime.combine(db_brief.date, datetime.min.time()),
                portfolio_value=db_brief.portfolio_value,
                overnight_pnl=db_brief.overnight_pnl,
                overnight_pnl_percent=float(db_brief.overnight_pnl_percent),
                cash_available=db_brief.cash_available,
                volatility_alerts=db_brief.volatility_alerts or [],
                key_positions=db_brief.key_positions or [],
                market_summary=db_brief.market_summary or {},
                recommendations=db_brief.recommendations or []
            )
            return brief
        
        # Generate new brief if not found
        brief = await portfolio_service.generate_morning_brief(db)
        return brief
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_morning_brief(db: Session = Depends(get_db)):
    """Manually generate morning brief"""
    try:
        brief = await portfolio_service.generate_morning_brief(db)
        return {
            "status": "success",
            "message": "Morning brief generated",
            "date": brief.date.isoformat(),
            "alerts_count": len(brief.volatility_alerts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_volatility_alerts(db: Session = Depends(get_db)):
    """Get current volatility alerts"""
    try:
        # Get today's brief
        brief = await get_morning_brief(date=None, db=db)
        
        return {
            "alerts": brief.volatility_alerts,
            "total": len(brief.volatility_alerts),
            "by_severity": brief.alert_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))