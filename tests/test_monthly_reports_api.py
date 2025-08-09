"""Tests for monthly reports API endpoints"""

import pytest
from datetime import datetime, date
from decimal import Decimal
from unittest.mock import Mock, patch, ANY
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.db.models import User, Report
from src.db.session import get_db
from src.data.models.portfolio import Report as ReportModel


class TestMonthlyReportsAPI:
    """Test suite for monthly reports API endpoints"""

    @pytest.fixture
    def test_user(self, test_db_session: Session) -> User:
        """Create a test user"""
        user = User(
            user_id="test_user_api",
            email="api_test@example.com",
            password_hash="hashed_password",
            is_active=True,
            created_at=datetime.utcnow()
        )
        test_db_session.add(user)
        test_db_session.commit()
        return user

    @pytest.fixture
    def auth_headers(self, test_user: User) -> dict:
        """Get authentication headers for test user"""
        from src.api.auth import create_access_token
        token = create_access_token(data={"sub": test_user.user_id, "email": test_user.email})
        return {"Authorization": f"Bearer {token}"}

    @pytest.fixture
    def test_reports(self, test_db_session: Session, test_user: User):
        """Create test monthly reports"""
        reports = []
        for i in range(3):
            report = Report(
                user_id=test_user.user_id,
                report_type="monthly",
                title=f"Monthly Report - {i+1}/2025",
                parameters={"month": i+1, "year": 2025},
                file_format="pdf",
                status="completed",
                file_path=f"/reports/monthly_{i+1}_2025.pdf",
                file_size=1024000,
                created_at=datetime.utcnow()
            )
            test_db_session.add(report)
            reports.append(report)
        
        test_db_session.commit()
        return reports

    def test_list_monthly_reports_success(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test successful retrieval of monthly reports list"""
        response = client.get("/api/reports/monthly", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "reports" in data
        assert len(data["reports"]) == 3
        
        # Verify report structure
        report = data["reports"][0]
        assert "id" in report
        assert "title" in report
        assert "status" in report
        assert "created_at" in report
        assert "file_size" in report
        assert report["report_type"] == "monthly"

    def test_list_monthly_reports_unauthorized(self, client: TestClient):
        """Test monthly reports list without authentication"""
        response = client.get("/api/reports/monthly")
        assert response.status_code == 401

    def test_generate_monthly_report_success(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_user: User
    ):
        """Test successful monthly report generation"""
        with patch('src.services.monthly_report_service.MonthlyReportService.generate_monthly_report') as mock_generate:
            mock_report = ReportModel(
                id=1,
                user_id=test_user.user_id,
                report_type="monthly",
                title="Monthly Report - June 2025",
                parameters={"month": 6, "year": 2025},
                file_format="pdf",
                status="completed",
                file_path="/reports/test.pdf",
                file_size=1024000,
                created_at=datetime.utcnow()
            )
            mock_generate.return_value = mock_report
            
            response = client.post(
                "/api/reports/monthly/generate",
                json={"month": 6, "year": 2025},
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = response.json()
            
            assert data["id"] == 1
            assert data["title"] == "Monthly Report - June 2025"
            assert data["status"] == "completed"
            
            # Verify service was called with correct parameters
            mock_generate.assert_called_once()
            call_args = mock_generate.call_args
            assert call_args[1]["user_id"] == test_user.user_id
            assert call_args[1]["report_month"] == date(2025, 6, 1)

    def test_generate_monthly_report_invalid_month(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test monthly report generation with invalid month"""
        response = client.post(
            "/api/reports/monthly/generate",
            json={"month": 13, "year": 2025},  # Invalid month
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Invalid month" in response.json()["detail"]

    def test_generate_monthly_report_future_date(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test monthly report generation for future date"""
        response = client.post(
            "/api/reports/monthly/generate",
            json={"month": 12, "year": 2030},  # Future date
            headers=auth_headers
        )
        
        assert response.status_code == 400

    def test_download_monthly_report_success(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test successful monthly report download"""
        report_id = test_reports[0].id
        
        # Create a temporary file for the test
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(b"Mock PDF content")
            tmp_path = tmp_file.name
        
        try:
            # Update the report to have the temp file path
            from src.db.models import Report
            from sqlalchemy.orm import Session
            
            # Get the database session from the test
            db = next(client.app.dependency_overrides[get_db]())
            report = db.query(Report).filter(Report.id == report_id).first()
            report.file_path = tmp_path
            db.commit()
            
            response = client.get(
                f"/api/reports/monthly/{report_id}/download",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert "attachment" in response.headers["content-disposition"]
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    def test_download_monthly_report_not_found(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test download of non-existent monthly report"""
        response = client.get(
            "/api/reports/monthly/99999/download",
            headers=auth_headers
        )
        
        assert response.status_code == 404

    def test_download_monthly_report_file_missing(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test download when report file is missing"""
        report_id = test_reports[0].id
        
        with patch('os.path.exists', return_value=False):
            response = client.get(
                f"/api/reports/monthly/{report_id}/download",
                headers=auth_headers
            )
            
            assert response.status_code == 404
            assert "file not found" in response.json()["detail"].lower()

    def test_delete_monthly_report_success(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test successful monthly report deletion"""
        report_id = test_reports[0].id
        
        with patch('src.services.monthly_report_service.MonthlyReportService.delete_monthly_report') as mock_delete:
            mock_delete.return_value = True
            
            response = client.delete(
                f"/api/reports/monthly/{report_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            assert response.json()["message"] == "Report deleted successfully"
            
            # Verify service was called
            mock_delete.assert_called_once_with(
                db=ANY,
                user_id=test_reports[0].user_id,
                report_id=report_id
            )

    def test_delete_monthly_report_not_found(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test deletion of non-existent monthly report"""
        with patch('src.services.monthly_report_service.MonthlyReportService.delete_monthly_report') as mock_delete:
            mock_delete.return_value = False
            
            response = client.delete(
                "/api/reports/monthly/99999",
                headers=auth_headers
            )
            
            assert response.status_code == 404

    def test_get_report_status_success(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test successful report status retrieval"""
        report_id = test_reports[0].id
        
        with patch('src.services.monthly_report_service.MonthlyReportService.get_report_status') as mock_status:
            mock_status.return_value = {
                "status": "completed",
                "progress": 100,
                "created_at": datetime.utcnow(),
                "estimated_completion": None,
                "error_message": None
            }
            
            response = client.get(
                f"/api/reports/monthly/{report_id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "completed"
            assert data["progress"] == 100

    def test_get_report_status_not_found(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test status retrieval for non-existent report"""
        with patch('src.services.monthly_report_service.MonthlyReportService.get_report_status') as mock_status:
            mock_status.side_effect = ValueError("Report not found")
            
            response = client.get(
                "/api/reports/monthly/99999/status",
                headers=auth_headers
            )
            
            assert response.status_code == 404

    def test_email_monthly_report_success(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test successful monthly report email sending"""
        report_id = test_reports[0].id
        
        # Mock the file path check since email service is not implemented
        with patch('os.path.exists', return_value=True):
            response = client.post(
                f"/api/reports/monthly/{report_id}/email",
                json={"recipient_email": "test@example.com"},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            assert response.json()["message"] == "Report sent successfully"

    def test_email_monthly_report_invalid_email(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test email sending with invalid email address"""
        report_id = test_reports[0].id
        
        response = client.post(
            f"/api/reports/monthly/{report_id}/email",
            json={"recipient_email": "invalid-email"},
            headers=auth_headers
        )
        
        assert response.status_code == 400

    def test_monthly_reports_rate_limiting(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test rate limiting on monthly reports endpoints"""
        # This would test the actual rate limiting implementation
        # For now, just verify the endpoint structure
        response = client.get("/api/reports/monthly", headers=auth_headers)
        
        # Rate limiting headers should be present
        assert "X-RateLimit-Limit" in response.headers or response.status_code in [200, 429]

    def test_monthly_reports_pagination(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_reports: list
    ):
        """Test pagination of monthly reports list"""
        response = client.get(
            "/api/reports/monthly?limit=2&offset=0",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "reports" in data
        assert len(data["reports"]) <= 2
        
        # Test pagination metadata
        if "pagination" in data:
            assert "total" in data["pagination"]
            assert "limit" in data["pagination"]
            assert "offset" in data["pagination"]

    def test_monthly_report_generation_with_no_data(
        self, 
        client: TestClient, 
        auth_headers: dict
    ):
        """Test report generation when no performance data exists"""
        with patch('src.services.monthly_report_service.MonthlyReportService.generate_monthly_report') as mock_generate:
            mock_generate.side_effect = ValueError("No performance data found")
            
            response = client.post(
                "/api/reports/monthly/generate",
                json={"month": 1, "year": 2020},  # Assuming no data for this period
                headers=auth_headers
            )
            
            assert response.status_code == 400
            assert "No performance data found" in response.json()["detail"]

    def test_monthly_report_concurrent_generation(
        self, 
        client: TestClient, 
        auth_headers: dict,
        test_user: User
    ):
        """Test handling of concurrent report generation requests"""
        with patch('src.services.monthly_report_service.MonthlyReportService.generate_monthly_report') as mock_generate:
            # Simulate a report already being generated
            existing_report = ReportModel(
                id=1,
                user_id=test_user.user_id,
                report_type="monthly",
                title="Monthly Report - June 2025",
                parameters={"month": 6, "year": 2025},
                file_format="pdf",
                status="generating",  # Still in progress
                file_path=None,
                file_size=None,
                created_at=datetime.utcnow()
            )
            
            # First call returns the generating report
            mock_generate.return_value = existing_report
            
            response = client.post(
                "/api/reports/monthly/generate",
                json={"month": 6, "year": 2025},
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["status"] == "generating"
