"""Reports API endpoints"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.services.report_generator import ReportGenerator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])
report_generator = ReportGenerator()


@router.post("/generate")
async def generate_report(
    user_id: str,
    report_type: str,
    parameters: Dict[str, Any],
    format: str = "pdf",
    db: Session = Depends(get_db),
):
    """Generate a report"""
    try:
        report = await report_generator.generate_report(
            db, user_id, report_type, parameters, format
        )
        return {
            "report_id": report.id,
            "status": "generated",
            "download_url": f"/api/reports/{report.id}/download",
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_reports(
    user_id: str = Query(..., description="User identifier"),
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    db: Session = Depends(get_db),
):
    """List user reports"""
    try:
        reports = await report_generator.get_user_reports(db, user_id, report_type)
        return reports
    except Exception as e:
        logger.error(f"Failed to list reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    db: Session = Depends(get_db),
):
    """Get report details"""
    try:
        report = await report_generator.get_report(db, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    db: Session = Depends(get_db),
):
    """Download report file"""
    try:
        file_path = await report_generator.get_report_file(db, report_id)
        if not file_path:
            raise HTTPException(status_code=404, detail="Report file not found")
        
        from fastapi.responses import FileResponse
        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename=f"report_{report_id}.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download report: {e}")
        raise HTTPException(status_code=500, detail=str(e))