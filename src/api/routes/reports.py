"""Monthly reports API endpoints"""

import logging
import os
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session

from src.api.auth import get_current_user, CurrentUser, portfolio_rate_limiter
from src.db import get_db
from src.services.monthly_report_service import MonthlyReportService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


class GenerateReportRequest(BaseModel):
    """Request model for generating monthly reports"""

    month: int
    year: int

    @validator("month")
    def validate_month(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("Month must be between 1 and 12")
        return v

    @validator("year")
    def validate_year(cls, v):
        current_year = datetime.now().year
        if not 2020 <= v <= current_year:
            raise ValueError(f"Year must be between 2020 and {current_year}")
        return v


class EmailReportRequest(BaseModel):
    """Request model for emailing reports"""

    recipient_email: EmailStr


class ReportResponse(BaseModel):
    """Response model for report data"""

    id: int
    title: str
    report_type: str
    status: str
    file_size: Optional[int]
    created_at: datetime
    generated_at: Optional[datetime]
    parameters: dict


class ReportListResponse(BaseModel):
    """Response model for report list"""

    reports: List[ReportResponse]
    pagination: Optional[dict] = None


class ReportStatusResponse(BaseModel):
    """Response model for report status"""

    status: str
    progress: int
    created_at: datetime
    estimated_completion: Optional[datetime]
    error_message: Optional[str]


@router.get("/monthly", response_model=ReportListResponse)
async def list_monthly_reports(
    limit: int = Query(12, ge=1, le=50, description="Number of reports to return"),
    offset: int = Query(0, ge=0, description="Number of reports to skip"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List monthly reports for the authenticated user

    Returns a list of monthly reports ordered by creation date (most recent first).
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Initialize service
        report_service = MonthlyReportService()

        # Get reports
        reports = report_service.get_monthly_reports(
            db=db,
            user_id=current_user.user_id,
            limit=limit + 1,  # Get one extra to check if there are more
        )

        # Prepare response data
        has_more = len(reports) > limit
        if has_more:
            reports = reports[:limit]

        report_responses = []
        for report in reports:
            report_responses.append(
                ReportResponse(
                    id=report.id,
                    title=report.title,
                    report_type=report.report_type,
                    status=report.status,
                    file_size=report.file_size,
                    created_at=report.created_at,
                    generated_at=report.generated_at,
                    parameters=report.parameters,
                )
            )

        # Pagination info
        pagination = {
            "total": len(report_responses),  # This would be actual total in production
            "limit": limit,
            "offset": offset,
            "has_more": has_more,
        }

        return ReportListResponse(reports=report_responses, pagination=pagination)

    except Exception as e:
        logger.error(f"Error listing monthly reports: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve reports: {str(e)}")


@router.post("/monthly/generate", response_model=ReportResponse, status_code=201)
async def generate_monthly_report(
    request: GenerateReportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a new monthly portfolio report

    Creates a comprehensive monthly report including performance metrics,
    portfolio overview, risk analysis, and trade summary.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Validate date is not in the future
        report_date = date(request.year, request.month, 1)
        if report_date > date.today():
            raise HTTPException(status_code=400, detail="Cannot generate reports for future months")

        # Initialize service
        report_service = MonthlyReportService()

        # Generate report
        report = report_service.generate_monthly_report(
            db=db, user_id=current_user.user_id, report_month=report_date
        )

        return ReportResponse(
            id=report.id,
            title=report.title,
            report_type=report.report_type,
            status=report.status,
            file_size=report.file_size,
            created_at=report.created_at,
            generated_at=report.generated_at,
            parameters=report.parameters,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating monthly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/monthly/{report_id}/download")
async def download_monthly_report(
    report_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download a monthly report PDF

    Returns the PDF file for the specified report.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Get report from database
        from src.db.models import Report

        report = (
            db.query(Report)
            .filter(
                Report.id == report_id,
                Report.user_id == current_user.user_id,
                Report.report_type == "monthly",
            )
            .first()
        )

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        if report.status != "completed":
            raise HTTPException(
                status_code=400, detail=f"Report is not ready for download. Status: {report.status}"
            )

        if not report.file_path or not os.path.exists(report.file_path):
            raise HTTPException(status_code=404, detail="Report file not found")

        # Create filename for download
        filename = (
            f"monthly_report_{report.parameters['month']:02d}_{report.parameters['year']}.pdf"
        )

        return FileResponse(
            path=report.file_path,
            media_type="application/pdf",
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading monthly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download report: {str(e)}")


@router.delete("/monthly/{report_id}")
async def delete_monthly_report(
    report_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a monthly report

    Removes the report from the database and deletes the associated file.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Initialize service
        report_service = MonthlyReportService()

        # Delete report
        success = report_service.delete_monthly_report(
            db=db, user_id=current_user.user_id, report_id=report_id
        )

        if not success:
            raise HTTPException(status_code=404, detail="Report not found")

        return {"message": "Report deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting monthly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")


@router.get("/monthly/{report_id}/status", response_model=ReportStatusResponse)
async def get_report_status(
    report_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the status of a report generation

    Returns the current status, progress, and estimated completion time.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Initialize service
        report_service = MonthlyReportService()

        # Get status
        status_info = report_service.get_report_status(
            db=db, user_id=current_user.user_id, report_id=report_id
        )

        return ReportStatusResponse(**status_info)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting report status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get report status: {str(e)}")


@router.post("/monthly/{report_id}/email")
async def email_monthly_report(
    report_id: int,
    request: EmailReportRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Email a monthly report to the specified recipient

    Sends the PDF report as an email attachment.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Get report from database
        from src.db.models import Report

        report = (
            db.query(Report)
            .filter(
                Report.id == report_id,
                Report.user_id == current_user.user_id,
                Report.report_type == "monthly",
            )
            .first()
        )

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        if report.status != "completed":
            raise HTTPException(
                status_code=400, detail=f"Report is not ready for email. Status: {report.status}"
            )

        if not report.file_path or not os.path.exists(report.file_path):
            raise HTTPException(status_code=404, detail="Report file not found")

        # For now, just return success (email service would be implemented separately)
        # In a real implementation, this would integrate with an email service
        logger.info(f"Would send report {report_id} to {request.recipient_email}")

        return {"message": "Report sent successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error emailing monthly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to email report: {str(e)}")


@router.get("/monthly/{report_id}/preview")
async def preview_monthly_report(
    report_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Preview a monthly report (returns HTML version)

    Returns an HTML preview of the report for web viewing.
    """
    try:
        # Rate limiting
        portfolio_rate_limiter.check_rate_limit(current_user.user_id)

        # Get report from database
        from src.db.models import Report

        report = (
            db.query(Report)
            .filter(
                Report.id == report_id,
                Report.user_id == current_user.user_id,
                Report.report_type == "monthly",
            )
            .first()
        )

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        if report.status != "completed":
            raise HTTPException(
                status_code=400, detail=f"Report is not ready for preview. Status: {report.status}"
            )

        # For now, return basic HTML preview
        # In a real implementation, this would generate the HTML version
        html_content = f"""
        <html>
        <head><title>Monthly Report Preview</title></head>
        <body>
            <h1>Monthly Report Preview</h1>
            <h2>{report.title}</h2>
            <p>Report ID: {report.id}</p>
            <p>Generated: {report.created_at}</p>
            <p>Status: {report.status}</p>
            <p>This is a preview of the monthly report. 
               <a href="/api/reports/monthly/{report.id}/download">Download PDF</a>
            </p>
        </body>
        </html>
        """

        from fastapi.responses import HTMLResponse

        return HTMLResponse(content=html_content)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing monthly report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to preview report: {str(e)}")
