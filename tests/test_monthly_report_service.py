"""Tests for monthly report generation service"""

import pytest
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from src.db.models import User, PerformanceSnapshot, Report
from src.services.monthly_report_service import MonthlyReportService
from src.data.models.portfolio import Report as ReportModel


class TestMonthlyReportService:
    """Test suite for monthly report generation service"""

    @pytest.fixture
    def test_user(self, test_db_session: Session) -> User:
        """Create a test user"""
        user = User(
            user_id="test_user_monthly",
            email="monthly_test@example.com",
            password_hash="hashed_password",
            is_active=True,
            created_at=datetime.utcnow(),
        )
        test_db_session.add(user)
        test_db_session.commit()
        return user

    @pytest.fixture
    def monthly_service(self):
        """Create monthly report service instance"""
        return MonthlyReportService()

    @pytest.fixture
    def test_performance_data(self, test_db_session: Session, test_user: User):
        """Create test performance snapshots for a full month"""
        snapshots = []
        base_date = date(2025, 6, 1)  # June 2025
        base_value = 100000

        # Create daily snapshots for June (30 days)
        for day in range(30):
            # Simulate some portfolio growth and volatility
            daily_change = 0.001 * (day % 10 - 5)  # Some up/down movement
            current_value = base_value * (1 + daily_change * day / 30)

            snapshot = PerformanceSnapshot(
                user_id=test_user.user_id,
                snapshot_date=base_date + timedelta(days=day),
                total_value=Decimal(str(current_value)),
                cash_value=Decimal("10000"),
                positions_value=Decimal(str(current_value - 10000)),
                daily_pnl=Decimal(str(current_value * daily_change)) if day > 0 else Decimal("0"),
                daily_pnl_percent=Decimal(str(daily_change * 100)) if day > 0 else Decimal("0"),
                created_at=datetime.utcnow(),
            )
            snapshots.append(snapshot)
            test_db_session.add(snapshot)

        test_db_session.commit()
        return snapshots

    def test_generate_monthly_report_success(
        self,
        monthly_service: MonthlyReportService,
        test_db_session: Session,
        test_user: User,
        test_performance_data: list,
    ):
        """Test successful monthly report generation"""
        # Test data
        report_month = date(2025, 6, 1)

        # Generate report
        report = monthly_service.generate_monthly_report(
            db=test_db_session, user_id=test_user.user_id, report_month=report_month
        )

        # Verify report structure
        assert isinstance(report, ReportModel)
        assert report.user_id == test_user.user_id
        assert report.report_type == "monthly"
        assert "June 2025" in report.title
        assert report.file_format == "pdf"
        assert report.status == "completed"

        # Verify report parameters
        assert "month" in report.parameters
        assert "year" in report.parameters
        assert report.parameters["month"] == 6
        assert report.parameters["year"] == 2025

    def test_calculate_monthly_performance_metrics(
        self,
        monthly_service: MonthlyReportService,
        test_db_session: Session,
        test_user: User,
        test_performance_data: list,
    ):
        """Test monthly performance metrics calculation"""
        report_month = date(2025, 6, 1)

        metrics = monthly_service._calculate_monthly_performance(
            db=test_db_session, user_id=test_user.user_id, report_month=report_month
        )

        # Verify metrics structure
        assert "monthly_return" in metrics
        assert "monthly_return_percent" in metrics
        assert "start_value" in metrics
        assert "end_value" in metrics
        assert "highest_value" in metrics
        assert "lowest_value" in metrics
        assert "average_daily_return" in metrics
        assert "volatility" in metrics
        assert "trading_days" in metrics

        # Verify metrics are reasonable
        assert isinstance(metrics["monthly_return"], Decimal)
        assert isinstance(metrics["trading_days"], int)
        assert metrics["trading_days"] == 30

    def test_generate_portfolio_overview(
        self, monthly_service: MonthlyReportService, test_db_session: Session, test_user: User
    ):
        """Test portfolio overview generation"""
        report_month = date(2025, 6, 1)

        with patch(
            "src.services.portfolio.PortfolioService.get_portfolio_summary"
        ) as mock_portfolio:
            mock_portfolio.return_value = {
                "total_value": Decimal("105000"),
                "cash_value": Decimal("10000"),
                "positions_value": Decimal("95000"),
                "positions": [
                    {"symbol": "AAPL", "quantity": 100, "market_value": Decimal("15000")},
                    {"symbol": "GOOGL", "quantity": 50, "market_value": Decimal("80000")},
                ],
            }

            overview = monthly_service._generate_portfolio_overview(
                db=test_db_session, user_id=test_user.user_id, report_month=report_month
            )

            assert "total_value" in overview
            assert "positions" in overview
            assert "allocation" in overview
            assert len(overview["positions"]) == 2

    def test_generate_drawdown_analysis(
        self,
        monthly_service: MonthlyReportService,
        test_db_session: Session,
        test_user: User,
        test_performance_data: list,
    ):
        """Test drawdown analysis for monthly report"""
        report_month = date(2025, 6, 1)

        drawdown_analysis = monthly_service._generate_drawdown_analysis(
            db=test_db_session, user_id=test_user.user_id, report_month=report_month
        )

        assert "max_drawdown_percent" in drawdown_analysis
        assert "max_drawdown_amount" in drawdown_analysis
        assert "drawdown_events" in drawdown_analysis
        assert "current_drawdown" in drawdown_analysis
        assert "underwater_days" in drawdown_analysis

    def test_generate_risk_metrics(
        self,
        monthly_service: MonthlyReportService,
        test_db_session: Session,
        test_user: User,
        test_performance_data: list,
    ):
        """Test risk metrics calculation"""
        report_month = date(2025, 6, 1)

        risk_metrics = monthly_service._calculate_risk_metrics(
            db=test_db_session, user_id=test_user.user_id, report_month=report_month
        )

        assert "volatility" in risk_metrics
        assert "sharpe_ratio" in risk_metrics
        assert "max_drawdown" in risk_metrics
        assert "var_95" in risk_metrics  # Value at Risk 95%
        assert "beta" in risk_metrics

        # Verify metrics are numeric
        assert isinstance(risk_metrics["volatility"], (float, Decimal))
        assert isinstance(risk_metrics["sharpe_ratio"], (float, Decimal, type(None)))

    @patch("src.services.monthly_report_service.HTML")
    def test_generate_pdf_report(
        self,
        mock_html,
        monthly_service: MonthlyReportService,
        test_db_session: Session,
        test_user: User,
    ):
        """Test PDF generation from HTML template"""
        # Mock WeasyPrint HTML
        mock_pdf = Mock()
        mock_html.return_value.write_pdf.return_value = mock_pdf

        report_data = {
            "user_id": test_user.user_id,
            "report_month": "June 2025",
            "performance": {"monthly_return": Decimal("2.5")},
            "portfolio": {"total_value": Decimal("105000")},
            "drawdown": {"max_drawdown_percent": Decimal("1.5")},
            "risk": {"volatility": 0.15},
        }

        file_path = monthly_service._generate_pdf(report_data)

        # Verify PDF generation was called
        mock_html.assert_called_once()
        assert file_path.endswith(".pdf")
        assert "monthly_report" in str(file_path)

    def test_get_report_template_html(self, monthly_service: MonthlyReportService):
        """Test HTML template generation"""
        template_data = {
            "user_id": "test_user",
            "report_month": "June 2025",
            "performance": {
                "monthly_return": Decimal("2.5"),
                "start_value": Decimal("100000"),
                "end_value": Decimal("102500"),
            },
            "portfolio": {
                "total_value": Decimal("102500"),
                "positions": [{"symbol": "AAPL", "value": Decimal("50000")}],
            },
        }

        html_content = monthly_service._get_report_template_html(template_data)

        # Verify HTML structure
        assert "<!DOCTYPE html>" in html_content
        assert "June 2025" in html_content
        assert "Monthly Portfolio Report" in html_content
        assert "Performance Summary" in html_content
        assert "Portfolio Overview" in html_content

    def test_get_historical_reports(
        self, monthly_service: MonthlyReportService, test_db_session: Session, test_user: User
    ):
        """Test retrieving historical monthly reports"""
        # Create some test reports in database
        for i in range(3):
            report = Report(
                user_id=test_user.user_id,
                report_type="monthly",
                title=f"Monthly Report - {i+1}/2025",
                parameters={"month": i + 1, "year": 2025},
                file_format="pdf",
                status="completed",
                file_path=f"/reports/monthly_{i+1}_2025.pdf",
                created_at=datetime.utcnow() - timedelta(days=30 * (3 - i)),
            )
            test_db_session.add(report)

        test_db_session.commit()

        # Test retrieval
        reports = monthly_service.get_monthly_reports(
            db=test_db_session, user_id=test_user.user_id, limit=10
        )

        assert len(reports) == 3
        # Should be ordered by creation date desc (most recent first)
        assert "3/2025" in reports[0].title
        assert "1/2025" in reports[2].title

    def test_delete_monthly_report(
        self, monthly_service: MonthlyReportService, test_db_session: Session, test_user: User
    ):
        """Test deleting a monthly report"""
        # Create test report
        report = Report(
            user_id=test_user.user_id,
            report_type="monthly",
            title="Test Monthly Report",
            parameters={"month": 6, "year": 2025},
            file_format="pdf",
            status="completed",
            file_path="/reports/test_monthly.pdf",
            created_at=datetime.utcnow(),
        )
        test_db_session.add(report)
        test_db_session.commit()

        report_id = report.id

        # Delete report
        with patch("os.remove") as mock_remove:
            result = monthly_service.delete_monthly_report(
                db=test_db_session, user_id=test_user.user_id, report_id=report_id
            )

            assert result is True
            mock_remove.assert_called_once_with("/reports/test_monthly.pdf")

        # Verify report was removed from database
        deleted_report = test_db_session.query(Report).filter(Report.id == report_id).first()
        assert deleted_report is None

    def test_monthly_report_invalid_user(
        self, monthly_service: MonthlyReportService, test_db_session: Session
    ):
        """Test monthly report generation with invalid user"""
        report_month = date(2025, 6, 1)

        with pytest.raises(ValueError, match="No performance data found"):
            monthly_service.generate_monthly_report(
                db=test_db_session, user_id="nonexistent_user", report_month=report_month
            )

    def test_monthly_report_no_data(
        self, monthly_service: MonthlyReportService, test_db_session: Session, test_user: User
    ):
        """Test monthly report generation with no performance data"""
        report_month = date(2025, 12, 1)  # Future month with no data

        with pytest.raises(ValueError, match="No performance data found"):
            monthly_service.generate_monthly_report(
                db=test_db_session, user_id=test_user.user_id, report_month=report_month
            )

    def test_report_status_tracking(
        self, monthly_service: MonthlyReportService, test_db_session: Session, test_user: User
    ):
        """Test report generation status tracking"""
        # Create a report in generating status
        report = Report(
            user_id=test_user.user_id,
            report_type="monthly",
            title="Test Report",
            parameters={"month": 6, "year": 2025},
            file_format="pdf",
            status="generating",
            created_at=datetime.utcnow(),
        )
        test_db_session.add(report)
        test_db_session.commit()

        # Check status
        status = monthly_service.get_report_status(
            db=test_db_session, user_id=test_user.user_id, report_id=report.id
        )

        assert status["status"] == "generating"
        assert status["progress"] >= 0
        assert "estimated_completion" in status
