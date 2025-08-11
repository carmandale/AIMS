"""Monthly report generation service"""

import logging
import os
import tempfile
from datetime import datetime, date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import List, Dict, Optional, Any
import statistics

from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from playwright.sync_api import sync_playwright
from jinja2 import Template
try:
    from weasyprint import HTML
except (OSError, ImportError) as e:
    logger.warning(f"WeasyPrint not available: {e}. PDF generation will be disabled.")
    HTML = None

from src.db.models import PerformanceSnapshot, Report
from src.data.models.portfolio import Report as ReportModel
from src.services.drawdown_service import DrawdownService
from src.services.performance_analytics import PerformanceAnalyticsService

logger = logging.getLogger(__name__)


class MonthlyReportService:
    """Service for generating monthly portfolio reports"""

    def __init__(self):
        self.reports_dir = Path("reports/monthly")
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_monthly_report(self, db: Session, user_id: str, report_month: date) -> ReportModel:
        """Generate a comprehensive monthly portfolio report"""

        logger.info(f"Generating monthly report for user {user_id}, month {report_month}")

        # Validate input
        if report_month > date.today():
            raise ValueError("Cannot generate report for future months")

        # Check if we have data for this month
        month_start = report_month.replace(day=1)
        if report_month.month == 12:
            month_end = date(report_month.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(report_month.year, report_month.month + 1, 1) - timedelta(days=1)

        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == user_id,
                    PerformanceSnapshot.snapshot_date >= month_start,
                    PerformanceSnapshot.snapshot_date <= month_end,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        if not snapshots:
            raise ValueError(f"No performance data found for {report_month.strftime('%B %Y')}")

        # Create report record
        report_title = f"Monthly Portfolio Report - {report_month.strftime('%B %Y')}"
        parameters = {
            "month": report_month.month,
            "year": report_month.year,
            "generated_at": datetime.utcnow().isoformat(),
        }

        db_report = Report(
            user_id=user_id,
            report_type="monthly",
            title=report_title,
            parameters=parameters,
            file_format="pdf",
            status="generating",
            created_at=datetime.utcnow(),
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        try:
            # Generate report sections
            performance_data = self._calculate_monthly_performance(db, user_id, report_month)
            portfolio_data = self._generate_portfolio_overview(db, user_id, report_month)
            drawdown_data = self._generate_drawdown_analysis(db, user_id, report_month)
            risk_data = self._calculate_risk_metrics(db, user_id, report_month)
            trade_data = self._generate_trade_summary(db, user_id, report_month)

            # Compile report data
            report_data = {
                "user_id": user_id,
                "report_month": report_month.strftime("%B %Y"),
                "report_date": datetime.utcnow().strftime("%B %d, %Y"),
                "performance": performance_data,
                "portfolio": portfolio_data,
                "drawdown": drawdown_data,
                "risk": risk_data,
                "trades": trade_data,
            }

            # Generate PDF
            file_path = self._generate_pdf(report_data)

            # Update report record
            db_report.file_path = str(file_path)
            db_report.file_size = os.path.getsize(file_path)
            db_report.status = "completed"
            db_report.generated_at = datetime.utcnow()
            db.commit()

            logger.info(f"Monthly report generated successfully: {file_path}")

            return ReportModel(
                id=db_report.id,
                user_id=db_report.user_id,
                report_type=db_report.report_type,
                title=db_report.title,
                parameters=db_report.parameters,
                file_format=db_report.file_format,
                status=db_report.status,
                file_path=db_report.file_path,
                file_size=db_report.file_size,
                created_at=db_report.created_at,
                generated_at=db_report.generated_at,
            )

        except Exception as e:
            # Update report status to failed
            db_report.status = "failed"
            db_report.error_message = str(e)
            db.commit()
            logger.error(f"Monthly report generation failed: {e}")
            raise

    def _calculate_monthly_performance(
        self, db: Session, user_id: str, report_month: date
    ) -> Dict[str, Any]:
        """Calculate monthly performance metrics"""

        # Get month boundaries
        month_start = report_month.replace(day=1)
        if report_month.month == 12:
            month_end = date(report_month.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(report_month.year, report_month.month + 1, 1) - timedelta(days=1)

        # Get snapshots for the month
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == user_id,
                    PerformanceSnapshot.snapshot_date >= month_start,
                    PerformanceSnapshot.snapshot_date <= month_end,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        if not snapshots:
            return {}

        start_value = snapshots[0].total_value
        end_value = snapshots[-1].total_value
        monthly_return = end_value - start_value
        monthly_return_percent = (
            (monthly_return / start_value * 100) if start_value > 0 else Decimal("0")
        )

        # Calculate additional metrics
        values = [float(s.total_value) for s in snapshots]
        highest_value = Decimal(str(max(values)))
        lowest_value = Decimal(str(min(values)))

        # Calculate daily returns for volatility
        daily_returns = []
        for i in range(1, len(snapshots)):
            prev_value = float(snapshots[i - 1].total_value)
            curr_value = float(snapshots[i].total_value)
            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                daily_returns.append(daily_return)

        volatility = (
            Decimal(str(statistics.stdev(daily_returns)))
            if len(daily_returns) > 1
            else Decimal("0")
        )
        avg_daily_return = (
            Decimal(str(statistics.mean(daily_returns))) if daily_returns else Decimal("0")
        )

        # Get YTD performance
        ytd_start = date(report_month.year, 1, 1)
        ytd_snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == user_id,
                    PerformanceSnapshot.snapshot_date >= ytd_start,
                    PerformanceSnapshot.snapshot_date <= month_end,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        ytd_return = Decimal("0")
        ytd_return_percent = Decimal("0")
        if ytd_snapshots and len(ytd_snapshots) > 1:
            ytd_start_value = ytd_snapshots[0].total_value
            ytd_end_value = ytd_snapshots[-1].total_value
            ytd_return = ytd_end_value - ytd_start_value
            ytd_return_percent = (
                (ytd_return / ytd_start_value * 100) if ytd_start_value > 0 else Decimal("0")
            )

        return {
            "monthly_return": monthly_return,
            "monthly_return_percent": monthly_return_percent,
            "start_value": start_value,
            "end_value": end_value,
            "highest_value": highest_value,
            "lowest_value": lowest_value,
            "average_daily_return": avg_daily_return,
            "volatility": volatility,
            "trading_days": len(snapshots),
            "ytd_return": ytd_return,
            "ytd_return_percent": ytd_return_percent,
        }

    def _generate_portfolio_overview(
        self, db: Session, user_id: str, report_month: date
    ) -> Dict[str, Any]:
        """Generate portfolio overview for the month end"""

        # For now, return mock data - in a real implementation this would
        # integrate with SnapTrade or other portfolio data sources
        return {
            "total_value": Decimal("105000"),
            "cash_value": Decimal("10000"),
            "positions_value": Decimal("95000"),
            "positions": [
                {
                    "symbol": "AAPL",
                    "quantity": 100,
                    "market_value": Decimal("15000"),
                    "percentage": Decimal("14.3"),
                },
                {
                    "symbol": "GOOGL",
                    "quantity": 50,
                    "market_value": Decimal("80000"),
                    "percentage": Decimal("76.2"),
                },
            ],
            "allocation": {
                "stocks": Decimal("90.5"),
                "cash": Decimal("9.5"),
                "bonds": Decimal("0"),
                "other": Decimal("0"),
            },
            "sector_allocation": {"Technology": Decimal("90.5"), "Cash": Decimal("9.5")},
        }

    def _generate_drawdown_analysis(
        self, db: Session, user_id: str, report_month: date
    ) -> Dict[str, Any]:
        """Generate drawdown analysis for the month"""

        # Get month boundaries
        month_start = report_month.replace(day=1)
        if report_month.month == 12:
            month_end = date(report_month.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(report_month.year, report_month.month + 1, 1) - timedelta(days=1)

        # Use drawdown service for analysis
        drawdown_service = DrawdownService()
        start_datetime = datetime.combine(month_start, datetime.min.time())
        end_datetime = datetime.combine(month_end, datetime.max.time())

        # Get performance snapshots for the month
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                PerformanceSnapshot.user_id == user_id,
                PerformanceSnapshot.created_at >= start_datetime,
                PerformanceSnapshot.created_at <= end_datetime,
            )
            .order_by(PerformanceSnapshot.created_at)
            .all()
        )

        # Get monthly drawdown analysis
        analysis = drawdown_service.get_historical_analysis(
            snapshots, start_date=start_datetime, end_date=end_datetime
        )

        # Get drawdown events for the month
        events = drawdown_service.calculate_drawdown_events(
            snapshots, threshold_percent=Decimal("1.0")  # Lower threshold for monthly view
        )

        # Calculate underwater days (days in drawdown)
        underwater_curve = drawdown_service.calculate_underwater_curve(snapshots)

        underwater_days = sum(1 for point in underwater_curve if point["drawdown_percent"] > 0)

        return {
            "max_drawdown_percent": analysis.get("max_drawdown_percent", Decimal("0")),
            "max_drawdown_amount": analysis.get("max_drawdown_amount", Decimal("0")),
            "drawdown_events": len(events),
            "current_drawdown": analysis.get("current_drawdown_percent", Decimal("0")),
            "underwater_days": underwater_days,
            "total_days": len(underwater_curve),
        }

    def _calculate_risk_metrics(
        self, db: Session, user_id: str, report_month: date
    ) -> Dict[str, Any]:
        """Calculate risk metrics for the month"""

        # Get month boundaries
        month_start = report_month.replace(day=1)
        if report_month.month == 12:
            month_end = date(report_month.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(report_month.year, report_month.month + 1, 1) - timedelta(days=1)

        # Get snapshots for risk calculation
        snapshots = (
            db.query(PerformanceSnapshot)
            .filter(
                and_(
                    PerformanceSnapshot.user_id == user_id,
                    PerformanceSnapshot.snapshot_date >= month_start,
                    PerformanceSnapshot.snapshot_date <= month_end,
                )
            )
            .order_by(PerformanceSnapshot.snapshot_date)
            .all()
        )

        if len(snapshots) < 2:
            return {
                "volatility": Decimal("0"),
                "sharpe_ratio": None,
                "max_drawdown": Decimal("0"),
                "var_95": Decimal("0"),
                "beta": None,
            }

        # Calculate daily returns
        daily_returns = []
        for i in range(1, len(snapshots)):
            prev_value = float(snapshots[i - 1].total_value)
            curr_value = float(snapshots[i].total_value)
            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                daily_returns.append(daily_return)

        if not daily_returns:
            return {
                "volatility": Decimal("0"),
                "sharpe_ratio": None,
                "max_drawdown": Decimal("0"),
                "var_95": Decimal("0"),
                "beta": None,
            }

        # Calculate volatility (annualized)
        volatility = statistics.stdev(daily_returns) * (252**0.5)  # Annualized

        # Calculate Sharpe ratio (assuming risk-free rate of 2%)
        avg_return = statistics.mean(daily_returns) * 252  # Annualized
        risk_free_rate = 0.02
        sharpe_ratio = (avg_return - risk_free_rate) / volatility if volatility > 0 else None

        # Calculate VaR 95% (Value at Risk)
        sorted_returns = sorted(daily_returns)
        var_95_index = int(len(sorted_returns) * 0.05)
        var_95 = abs(sorted_returns[var_95_index]) if var_95_index < len(sorted_returns) else 0

        # Get max drawdown from existing analysis
        drawdown_analysis = self._generate_drawdown_analysis(db, user_id, report_month)
        max_drawdown = drawdown_analysis.get("max_drawdown_percent", Decimal("0"))

        return {
            "volatility": Decimal(str(round(volatility, 4))),
            "sharpe_ratio": (
                Decimal(str(round(sharpe_ratio, 2))) if sharpe_ratio is not None else None
            ),
            "max_drawdown": max_drawdown,
            "var_95": Decimal(str(round(var_95, 4))),
            "beta": None,  # Would need benchmark data to calculate
        }

    def _generate_trade_summary(
        self, db: Session, user_id: str, report_month: date
    ) -> Dict[str, Any]:
        """Generate trade summary for the month"""

        # For now, return mock data - in a real implementation this would
        # query actual trade data from the database
        return {
            "total_trades": 5,
            "profitable_trades": 3,
            "losing_trades": 2,
            "total_pnl": Decimal("2500"),
            "commissions": Decimal("25"),
            "net_pnl": Decimal("2475"),
            "win_rate": Decimal("60.0"),
            "average_win": Decimal("1500"),
            "average_loss": Decimal("-750"),
            "largest_win": Decimal("2000"),
            "largest_loss": Decimal("-1000"),
            "trades": [
                {
                    "date": "2025-06-05",
                    "symbol": "AAPL",
                    "action": "BUY",
                    "quantity": 50,
                    "price": Decimal("150.00"),
                    "pnl": Decimal("500"),
                },
                {
                    "date": "2025-06-15",
                    "symbol": "GOOGL",
                    "action": "SELL",
                    "quantity": 10,
                    "price": Decimal("2800.00"),
                    "pnl": Decimal("2000"),
                },
            ],
        }

    def _generate_pdf(self, report_data: Dict[str, Any]) -> Path:
        """Generate PDF from report data using Playwright"""

        # Generate HTML content with embedded CSS
        html_content = self._get_complete_html_document(report_data)

        # Create filename
        report_month = report_data["report_month"].replace(" ", "_").lower()
        user_id = report_data["user_id"]
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"monthly_report_{user_id}_{report_month}_{timestamp}.pdf"
        file_path = self.reports_dir / filename

        # Generate PDF using Playwright (standards-compliant approach)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(html_content)

            # Generate PDF with proper formatting
            page.pdf(
                path=str(file_path),
                format="A4",
                margin={"top": "1in", "right": "1in", "bottom": "1in", "left": "1in"},
                print_background=True,
            )

            browser.close()

        logger.info(f"PDF generated using Playwright: {file_path}")
        return file_path

    def _get_complete_html_document(self, data: Dict[str, Any]) -> str:
        """Generate complete HTML document with embedded CSS"""

        html_body = self._get_report_template_html(data)
        css_styles = self._get_report_css()

        # Create complete HTML document with embedded CSS
        complete_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly Portfolio Report - {data["report_month"]}</title>
    <style>
    {css_styles}
    </style>
</head>
{html_body[html_body.find('<body>'):]if '<body>' in html_body else f'<body>{html_body}</body>'}
</html>"""

        return complete_html

    def _get_report_template_html(self, data: Dict[str, Any]) -> str:
        """Generate HTML body content for the monthly report"""

        template_str = """
        <body>
            <div class="header">
                <h1>Monthly Portfolio Report</h1>
                <h2>{{ report_month }}</h2>
                <p class="report-date">Generated on {{ report_date }}</p>
            </div>
            
            <div class="section">
                <h3>Performance Summary</h3>
                <div class="metrics-grid">
                    <div class="metric">
                        <label>Monthly Return</label>
                        <value class="{% if performance.monthly_return_percent >= 0 %}positive{% else %}negative{% endif %}">
                            {{ "%.2f"|format(performance.monthly_return_percent|float) }}%
                        </value>
                    </div>
                    <div class="metric">
                        <label>Monthly PnL</label>
                        <value class="{% if performance.monthly_return >= 0 %}positive{% else %}negative{% endif %}">
                            ${{ "%.2f"|format(performance.monthly_return|float) }}
                        </value>
                    </div>
                    <div class="metric">
                        <label>YTD Return</label>
                        <value class="{% if performance.ytd_return_percent >= 0 %}positive{% else %}negative{% endif %}">
                            {{ "%.2f"|format(performance.ytd_return_percent|float) }}%
                        </value>
                    </div>
                    <div class="metric">
                        <label>Portfolio Value</label>
                        <value>${{ "%.2f"|format(performance.end_value|float) }}</value>
                    </div>
                </div>
                
                <div class="performance-details">
                    <p><strong>Starting Value:</strong> ${{ "%.2f"|format(performance.start_value|float) }}</p>
                    <p><strong>Ending Value:</strong> ${{ "%.2f"|format(performance.end_value|float) }}</p>
                    <p><strong>Highest Value:</strong> ${{ "%.2f"|format(performance.highest_value|float) }}</p>
                    <p><strong>Lowest Value:</strong> ${{ "%.2f"|format(performance.lowest_value|float) }}</p>
                    <p><strong>Volatility:</strong> {{ "%.2f"|format(performance.volatility|float * 100) }}%</p>
                    <p><strong>Trading Days:</strong> {{ performance.trading_days }}</p>
                </div>
            </div>
            
            <div class="section">
                <h3>Portfolio Overview</h3>
                <div class="portfolio-summary">
                    <p><strong>Total Value:</strong> ${{ "%.2f"|format(portfolio.total_value|float) }}</p>
                    <p><strong>Cash:</strong> ${{ "%.2f"|format(portfolio.cash_value|float) }}</p>
                    <p><strong>Positions:</strong> ${{ "%.2f"|format(portfolio.positions_value|float) }}</p>
                </div>
                
                <h4>Top Holdings</h4>
                <table class="holdings-table">
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Quantity</th>
                            <th>Market Value</th>
                            <th>Allocation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for position in portfolio.positions %}
                        <tr>
                            <td>{{ position.symbol }}</td>
                            <td>{{ position.quantity }}</td>
                            <td>${{ "%.2f"|format(position.market_value|float) }}</td>
                            <td>{{ "%.1f"|format(position.percentage|float) }}%</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>Risk Analysis</h3>
                <div class="risk-metrics">
                    <p><strong>Maximum Drawdown:</strong> {{ "%.2f"|format(drawdown.max_drawdown_percent|float) }}%</p>
                    <p><strong>Drawdown Events:</strong> {{ drawdown.drawdown_events }}</p>
                    <p><strong>Days in Drawdown:</strong> {{ drawdown.underwater_days }} of {{ drawdown.total_days }} days</p>
                    <p><strong>Volatility:</strong> {{ "%.2f"|format(risk.volatility|float * 100) }}%</p>
                    {% if risk.sharpe_ratio %}
                    <p><strong>Sharpe Ratio:</strong> {{ "%.2f"|format(risk.sharpe_ratio|float) }}</p>
                    {% endif %}
                    <p><strong>Value at Risk (95%):</strong> {{ "%.2f"|format(risk.var_95|float * 100) }}%</p>
                </div>
            </div>
            
            <div class="section">
                <h3>Trading Summary</h3>
                <div class="trade-summary">
                    <p><strong>Total Trades:</strong> {{ trades.total_trades }}</p>
                    <p><strong>Win Rate:</strong> {{ "%.1f"|format(trades.win_rate|float) }}%</p>
                    <p><strong>Net PnL:</strong> 
                        <span class="{% if trades.net_pnl >= 0 %}positive{% else %}negative{% endif %}">
                            ${{ "%.2f"|format(trades.net_pnl|float) }}
                        </span>
                    </p>
                    <p><strong>Total Commissions:</strong> ${{ "%.2f"|format(trades.commissions|float) }}</p>
                </div>
                
                {% if trades.trades %}
                <h4>Recent Trades</h4>
                <table class="trades-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Symbol</th>
                            <th>Action</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>PnL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for trade in trades.trades %}
                        <tr>
                            <td>{{ trade.date }}</td>
                            <td>{{ trade.symbol }}</td>
                            <td>{{ trade.action }}</td>
                            <td>{{ trade.quantity }}</td>
                            <td>${{ "%.2f"|format(trade.price|float) }}</td>
                            <td class="{% if trade.pnl >= 0 %}positive{% else %}negative{% endif %}">
                                ${{ "%.2f"|format(trade.pnl|float) }}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
                {% endif %}
            </div>
            
            <div class="footer">
                <p>Report generated by AIMS - Automated Investment Management System</p>
                <p>{{ report_date }}</p>
            </div>
        </body>
        </html>
        """

        template = Template(template_str)
        return template.render(**data)

    def _get_report_css(self) -> str:
        """Get CSS styles for the PDF report"""

        return """
        @page {
            size: A4;
            margin: 1in;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 24px;
        }
        
        .header h2 {
            color: #34495e;
            margin: 5px 0;
            font-size: 18px;
        }
        
        .report-date {
            color: #7f8c8d;
            margin: 10px 0 0 0;
        }
        
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section h3 {
            color: #2c3e50;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .section h4 {
            color: #34495e;
            margin: 15px 0 10px 0;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric {
            border: 1px solid #bdc3c7;
            padding: 10px;
            border-radius: 4px;
        }
        
        .metric label {
            display: block;
            font-size: 10px;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .metric value {
            display: block;
            font-size: 16px;
            font-weight: bold;
        }
        
        .positive {
            color: #27ae60;
        }
        
        .negative {
            color: #e74c3c;
        }
        
        .performance-details {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
        }
        
        .performance-details p {
            margin: 5px 0;
        }
        
        .portfolio-summary {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .portfolio-summary p {
            margin: 5px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        
        table th,
        table td {
            border: 1px solid #bdc3c7;
            padding: 8px;
            text-align: left;
        }
        
        table th {
            background-color: #34495e;
            color: white;
            font-weight: bold;
        }
        
        table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .risk-metrics {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
        }
        
        .risk-metrics p {
            margin: 5px 0;
        }
        
        .trade-summary {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .trade-summary p {
            margin: 5px 0;
        }
        
        .footer {
            text-align: center;
            color: #7f8c8d;
            font-size: 10px;
            border-top: 1px solid #bdc3c7;
            padding-top: 20px;
            margin-top: 30px;
        }
        """

    def get_monthly_reports(self, db: Session, user_id: str, limit: int = 12) -> List[ReportModel]:
        """Get list of monthly reports for a user"""

        db_reports = (
            db.query(Report)
            .filter(and_(Report.user_id == user_id, Report.report_type == "monthly"))
            .order_by(Report.created_at.desc())
            .limit(limit)
            .all()
        )

        return [
            ReportModel(
                id=report.id,
                user_id=report.user_id,
                report_type=report.report_type,
                title=report.title,
                parameters=report.parameters,
                file_format=report.file_format,
                status=report.status,
                file_path=report.file_path,
                file_size=report.file_size,
                created_at=report.created_at,
                generated_at=report.generated_at,
            )
            for report in db_reports
        ]

    def delete_monthly_report(self, db: Session, user_id: str, report_id: int) -> bool:
        """Delete a monthly report"""

        report = (
            db.query(Report)
            .filter(
                and_(
                    Report.id == report_id,
                    Report.user_id == user_id,
                    Report.report_type == "monthly",
                )
            )
            .first()
        )

        if not report:
            return False

        # Delete file if it exists
        if report.file_path and os.path.exists(report.file_path):
            try:
                os.remove(report.file_path)
            except OSError as e:
                logger.warning(f"Failed to delete report file {report.file_path}: {e}")

        # Delete database record
        db.delete(report)
        db.commit()

        return True

    def get_report_status(self, db: Session, user_id: str, report_id: int) -> Dict[str, Any]:
        """Get report generation status"""

        report = (
            db.query(Report)
            .filter(
                and_(
                    Report.id == report_id,
                    Report.user_id == user_id,
                    Report.report_type == "monthly",
                )
            )
            .first()
        )

        if not report:
            raise ValueError("Report not found")

        # Calculate progress based on status
        progress_map = {"generating": 50, "completed": 100, "failed": 0}

        progress = progress_map.get(report.status, 0)

        # Estimate completion time
        estimated_completion = None
        if report.status == "generating":
            # Estimate 2 minutes for report generation
            estimated_completion = report.created_at + timedelta(minutes=2)

        return {
            "status": report.status,
            "progress": progress,
            "created_at": report.created_at,
            "estimated_completion": estimated_completion,
            "error_message": getattr(report, "error_message", None),
        }
