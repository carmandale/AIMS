"""Report generation service for portfolio reports"""

import logging
import os
import tempfile
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any
import csv
import json
from pathlib import Path

from sqlalchemy.orm import Session
from weasyprint import HTML, CSS

from src.data.models.portfolio import (
    Position,
    Transaction,
    PerformanceMetrics,
    RiskMetrics,
    AssetAllocation,
    Report,
    PortfolioSummary,
)
from src.services.portfolio import PortfolioService
from src.db import models as db_models

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Service for generating portfolio reports"""

    def __init__(self):
        self.portfolio_service = PortfolioService()
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)

        # Report templates
        self.templates = {
            "summary": self._get_summary_template(),
            "performance": self._get_performance_template(),
            "tax": self._get_tax_template(),
            "allocation": self._get_allocation_template(),
        }

    async def generate_report(
        self,
        db: Session,
        user_id: str,
        report_type: str,
        parameters: Dict[str, Any],
        file_format: str = "pdf",
    ) -> Report:
        """Generate a portfolio report"""

        # Create report record
        report = Report(
            user_id=user_id,
            report_type=report_type,
            title=self._get_report_title(report_type, parameters),
            parameters=parameters,
            file_format=file_format,
            status="generating",
        )

        # Save to database
        db_report = db_models.Report(
            user_id=report.user_id,
            report_type=report.report_type,
            title=report.title,
            parameters=report.parameters,
            file_format=report.file_format,
            status=report.status,
            created_at=datetime.utcnow(),
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        try:
            # Generate report content
            if report_type == "summary":
                content = await self._generate_summary_report(db, user_id, parameters)
            elif report_type == "performance":
                content = await self._generate_performance_report(db, user_id, parameters)
            elif report_type == "tax":
                content = await self._generate_tax_report(db, user_id, parameters)
            elif report_type == "allocation":
                content = await self._generate_allocation_report(db, user_id, parameters)
            else:
                raise ValueError(f"Unknown report type: {report_type}")

            # Generate file
            file_path = await self._generate_file(content, report_type, file_format, db_report.id)

            # Update report record
            db_report.file_path = str(file_path)
            db_report.file_size = os.path.getsize(file_path)
            db_report.status = "ready"
            db_report.generated_at = datetime.utcnow()
            db_report.expires_at = datetime.utcnow() + timedelta(days=7)  # 7-day expiry
            db.commit()

            return Report.model_validate(db_report)

        except Exception as e:
            logger.error(f"Failed to generate report: {e}")
            db_report.status = "failed"
            db_report.error_message = str(e)
            db.commit()
            raise

    async def get_report(self, db: Session, report_id: int) -> Optional[Report]:
        """Get report by ID"""
        db_report = db.query(db_models.Report).filter(db_models.Report.id == report_id).first()

        if not db_report:
            return None

        return Report.model_validate(db_report)

    async def get_user_reports(
        self, db: Session, user_id: str, report_type: Optional[str] = None, limit: int = 50
    ) -> List[Report]:
        """Get reports for a user"""
        query = db.query(db_models.Report).filter(db_models.Report.user_id == user_id)

        if report_type:
            query = query.filter(db_models.Report.report_type == report_type)

        db_reports = query.order_by(db_models.Report.created_at.desc()).limit(limit).all()

        return [Report.model_validate(report) for report in db_reports]

    async def get_report_file(self, db: Session, report_id: str) -> Optional[str]:
        """Get report file path by ID"""
        try:
            report_id_int = int(report_id)
            db_report = db.query(db_models.Report).filter(db_models.Report.id == report_id_int).first()

            if not db_report or not db_report.file_path:
                return None

            # Check if file exists
            if os.path.exists(db_report.file_path):
                return db_report.file_path
            else:
                logger.warning(f"Report file not found at {db_report.file_path}")
                return None

        except (ValueError, TypeError):
            logger.warning(f"Invalid report ID: {report_id}")
            return None

    async def delete_expired_reports(self, db: Session) -> int:
        """Delete expired reports"""
        now = datetime.utcnow()
        expired_reports = db.query(db_models.Report).filter(db_models.Report.expires_at < now).all()

        deleted_count = 0
        for report in expired_reports:
            # Delete file
            if report.file_path and os.path.exists(report.file_path):
                try:
                    os.remove(report.file_path)
                except OSError as e:
                    logger.warning(f"Failed to delete report file {report.file_path}: {e}")

            # Delete database record
            db.delete(report)
            deleted_count += 1

        db.commit()
        return deleted_count

    async def _generate_summary_report(
        self, db: Session, user_id: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate summary report content"""

        # Get portfolio data
        summary = await self.portfolio_service.get_portfolio_summary(db)
        positions = await self.portfolio_service.fetch_all_positions(db)
        balances = await self.portfolio_service.fetch_all_balances(db)

        # Get performance metrics
        timeframe = parameters.get("timeframe", "ytd")
        performance = await self.portfolio_service.get_performance_metrics(db, user_id, timeframe)

        # Get allocation
        allocation = await self.portfolio_service.get_asset_allocation(db, user_id)

        return {
            "report_type": "Portfolio Summary",
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "parameters": parameters,
            "summary": summary,
            "positions": [p.model_dump() for p in positions],
            "balances": [b.model_dump() for b in balances],
            "performance": performance.model_dump(),
            "allocation": allocation.model_dump(),
        }

    async def _generate_performance_report(
        self, db: Session, user_id: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate performance report content"""

        timeframe = parameters.get("timeframe", "ytd")
        benchmark = parameters.get("benchmark")

        # Get performance metrics
        performance = await self.portfolio_service.get_performance_metrics(
            db, user_id, timeframe, benchmark
        )

        # Get risk metrics
        risk_metrics = await self.portfolio_service.get_risk_metrics(db, user_id, timeframe)

        # Get stress test results
        stress_results = await self.portfolio_service.run_stress_test(db, user_id)

        return {
            "report_type": "Performance Analysis",
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "parameters": parameters,
            "performance": performance.model_dump(),
            "risk_metrics": risk_metrics.model_dump(),
            "stress_test": stress_results,
        }

    async def _generate_tax_report(
        self, db: Session, user_id: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate tax report content"""

        tax_year = parameters.get("tax_year", datetime.now().year)
        start_date = datetime(tax_year, 1, 1)
        end_date = datetime(tax_year, 12, 31)

        # Get transactions for the tax year
        transactions = await self.portfolio_service.get_transactions(
            db, start_date=start_date, end_date=end_date
        )

        # Calculate realized gains/losses
        realized_gains = self._calculate_realized_gains(transactions)

        # Get positions for unrealized gains
        positions = await self.portfolio_service.fetch_all_positions(db)
        unrealized_gains = self._calculate_unrealized_gains(positions)

        # Get dividend income
        dividend_income = self._calculate_dividend_income(transactions)

        return {
            "report_type": "Tax Report",
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "parameters": parameters,
            "tax_year": tax_year,
            "transactions": [t.model_dump() for t in transactions],
            "realized_gains": realized_gains,
            "unrealized_gains": unrealized_gains,
            "dividend_income": dividend_income,
        }

    async def _generate_allocation_report(
        self, db: Session, user_id: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate allocation report content"""

        # Get allocation analysis
        allocation = await self.portfolio_service.get_asset_allocation(db, user_id)

        # Get concentration analysis
        concentration = await self.portfolio_service.get_concentration_analysis(db, user_id)

        # Get correlation matrix
        correlation_matrix = await self.portfolio_service.get_correlation_matrix(db, user_id)

        return {
            "report_type": "Asset Allocation Analysis",
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "parameters": parameters,
            "allocation": allocation.model_dump(),
            "concentration": concentration,
            "correlation_matrix": correlation_matrix,
        }

    async def _generate_file(
        self, content: Dict[str, Any], report_type: str, file_format: str, report_id: int
    ) -> Path:
        """Generate report file"""

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"report_{report_id}_{timestamp}.{file_format}"
        file_path = self.reports_dir / filename

        if file_format == "pdf":
            await self._generate_pdf(content, report_type, file_path)
        elif file_format == "csv":
            await self._generate_csv(content, report_type, file_path)
        elif file_format == "json":
            await self._generate_json(content, file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_format}")

        return file_path

    async def _generate_pdf(self, content: Dict[str, Any], report_type: str, file_path: Path):
        """Generate PDF report"""

        # Get HTML template
        template = self.templates.get(report_type.lower(), self.templates["summary"])

        # Render HTML with content
        html_content = template.format(**content)

        # Generate PDF
        HTML(string=html_content).write_pdf(
            str(file_path), stylesheets=[CSS(string=self._get_pdf_styles())]
        )

    async def _generate_csv(self, content: Dict[str, Any], report_type: str, file_path: Path):
        """Generate CSV report"""

        with open(file_path, "w", newline="", encoding="utf-8") as csvfile:
            if report_type == "summary":
                await self._write_summary_csv(csvfile, content)
            elif report_type == "performance":
                await self._write_performance_csv(csvfile, content)
            elif report_type == "tax":
                await self._write_tax_csv(csvfile, content)
            elif report_type == "allocation":
                await self._write_allocation_csv(csvfile, content)

    async def _generate_json(self, content: Dict[str, Any], file_path: Path):
        """Generate JSON report"""

        with open(file_path, "w", encoding="utf-8") as jsonfile:
            json.dump(content, jsonfile, indent=2, default=str)

    def _get_report_title(self, report_type: str, parameters: Dict[str, Any]) -> str:
        """Get report title based on type and parameters"""

        timestamp = datetime.utcnow().strftime("%Y-%m-%d")

        titles = {
            "summary": f"Portfolio Summary - {timestamp}",
            "performance": f"Performance Analysis - {timestamp}",
            "tax": f"Tax Report {parameters.get('tax_year', datetime.now().year)}",
            "allocation": f"Asset Allocation Analysis - {timestamp}",
        }

        return titles.get(report_type, f"Portfolio Report - {timestamp}")

    def _calculate_realized_gains(self, transactions: List[Transaction]) -> Dict[str, Any]:
        """Calculate realized gains/losses from transactions"""

        gains_by_symbol = {}
        total_gains = Decimal("0")

        for transaction in transactions:
            if transaction.type in ["sell"]:
                # Simplified calculation - in production, would need proper lot tracking
                if transaction.symbol:
                    if transaction.symbol not in gains_by_symbol:
                        gains_by_symbol[transaction.symbol] = {
                            "total_proceeds": Decimal("0"),
                            "total_cost": Decimal("0"),
                            "gain_loss": Decimal("0"),
                        }

                    proceeds = transaction.amount
                    # Estimate cost basis (simplified)
                    cost = proceeds * Decimal("0.9")  # Assume 10% gain
                    gain = proceeds - cost

                    gains_by_symbol[transaction.symbol]["total_proceeds"] += proceeds
                    gains_by_symbol[transaction.symbol]["total_cost"] += cost
                    gains_by_symbol[transaction.symbol]["gain_loss"] += gain

                    total_gains += gain

        return {
            "total_realized_gains": float(total_gains),
            "gains_by_symbol": {
                symbol: {
                    "total_proceeds": float(data["total_proceeds"]),
                    "total_cost": float(data["total_cost"]),
                    "gain_loss": float(data["gain_loss"]),
                }
                for symbol, data in gains_by_symbol.items()
            },
        }

    def _calculate_unrealized_gains(self, positions: List[Position]) -> Dict[str, Any]:
        """Calculate unrealized gains/losses from positions"""

        total_unrealized = Decimal("0")
        unrealized_by_symbol = {}

        for position in positions:
            if position.unrealized_pnl:
                total_unrealized += position.unrealized_pnl
                unrealized_by_symbol[position.symbol] = {
                    "market_value": float(position.market_value or 0),
                    "cost_basis": float(position.quantity * position.cost_basis),
                    "unrealized_pnl": float(position.unrealized_pnl),
                    "unrealized_pnl_percent": position.unrealized_pnl_percent or 0,
                }

        return {
            "total_unrealized_gains": float(total_unrealized),
            "unrealized_by_symbol": unrealized_by_symbol,
        }

    def _calculate_dividend_income(self, transactions: List[Transaction]) -> Dict[str, Any]:
        """Calculate dividend income from transactions"""

        total_dividends = Decimal("0")
        dividends_by_symbol = {}

        for transaction in transactions:
            if transaction.type == "dividend":
                total_dividends += transaction.amount

                if transaction.symbol:
                    if transaction.symbol not in dividends_by_symbol:
                        dividends_by_symbol[transaction.symbol] = Decimal("0")
                    dividends_by_symbol[transaction.symbol] += transaction.amount

        return {
            "total_dividend_income": float(total_dividends),
            "dividends_by_symbol": {
                symbol: float(amount) for symbol, amount in dividends_by_symbol.items()
            },
        }

    async def _write_summary_csv(self, csvfile, content: Dict[str, Any]):
        """Write summary report to CSV"""

        writer = csv.writer(csvfile)

        # Header
        writer.writerow(["Portfolio Summary Report"])
        writer.writerow(["Generated:", content["generated_at"]])
        writer.writerow([])

        # Portfolio summary
        summary = content["summary"]
        writer.writerow(["Portfolio Summary"])
        writer.writerow(["Total Value", summary["total_value"]])
        writer.writerow(["Cash Buffer", summary["cash_buffer"]])
        writer.writerow(["Daily P&L", summary["daily_pnl"]])
        writer.writerow(["Daily P&L %", summary["daily_pnl_percent"]])
        writer.writerow([])

        # Positions
        writer.writerow(["Positions"])
        writer.writerow(
            ["Symbol", "Broker", "Quantity", "Cost Basis", "Current Price", "Market Value", "P&L"]
        )

        for position in content["positions"]:
            writer.writerow(
                [
                    position["symbol"],
                    position["broker"],
                    position["quantity"],
                    position["cost_basis"],
                    position["current_price"],
                    position.get("market_value", 0),
                    position.get("unrealized_pnl", 0),
                ]
            )

    async def _write_performance_csv(self, csvfile, content: Dict[str, Any]):
        """Write performance report to CSV"""

        writer = csv.writer(csvfile)

        # Header
        writer.writerow(["Performance Analysis Report"])
        writer.writerow(["Generated:", content["generated_at"]])
        writer.writerow([])

        # Performance metrics
        performance = content["performance"]
        writer.writerow(["Performance Metrics"])
        writer.writerow(["Timeframe", performance["timeframe"]])
        writer.writerow(["Starting Value", performance["starting_value"]])
        writer.writerow(["Ending Value", performance["ending_value"]])
        writer.writerow(["Absolute Change", performance["absolute_change"]])
        writer.writerow(["Percent Change", performance["percent_change"]])
        writer.writerow(["Annualized Return", performance.get("annualized_return", 0)])
        writer.writerow([])

        # Risk metrics
        risk = content["risk_metrics"]
        writer.writerow(["Risk Metrics"])
        writer.writerow(["Volatility", risk["volatility"]])
        writer.writerow(["Sharpe Ratio", risk["sharpe_ratio"]])
        writer.writerow(["Max Drawdown", risk["max_drawdown"]])

    async def _write_tax_csv(self, csvfile, content: Dict[str, Any]):
        """Write tax report to CSV"""

        writer = csv.writer(csvfile)

        # Header
        writer.writerow(["Tax Report"])
        writer.writerow(["Tax Year:", content["tax_year"]])
        writer.writerow(["Generated:", content["generated_at"]])
        writer.writerow([])

        # Transactions
        writer.writerow(["Transactions"])
        writer.writerow(["Date", "Type", "Symbol", "Quantity", "Price", "Amount", "Fees"])

        for transaction in content["transactions"]:
            writer.writerow(
                [
                    transaction["timestamp"],
                    transaction["type"],
                    transaction.get("symbol", ""),
                    transaction.get("quantity", ""),
                    transaction.get("price", ""),
                    transaction["amount"],
                    transaction["fees"],
                ]
            )

    async def _write_allocation_csv(self, csvfile, content: Dict[str, Any]):
        """Write allocation report to CSV"""

        writer = csv.writer(csvfile)

        # Header
        writer.writerow(["Asset Allocation Analysis Report"])
        writer.writerow(["Generated:", content["generated_at"]])
        writer.writerow([])

        # Asset class allocation
        allocation = content["allocation"]
        writer.writerow(["Asset Class Allocation"])
        writer.writerow(["Asset Class", "Percentage"])

        for asset_class, percentage in allocation["by_asset_class"].items():
            writer.writerow([asset_class, percentage])

        writer.writerow([])

        # Sector allocation
        writer.writerow(["Sector Allocation"])
        writer.writerow(["Sector", "Percentage"])

        for sector, percentage in allocation["by_sector"].items():
            writer.writerow([sector, percentage])

    def _get_summary_template(self) -> str:
        """Get HTML template for summary report"""
        return """
        <html>
        <head>
            <title>Portfolio Summary Report</title>
        </head>
        <body>
            <h1>Portfolio Summary Report</h1>
            <p>Generated: {generated_at}</p>
            
            <h2>Portfolio Overview</h2>
            <table>
                <tr><td>Total Value:</td><td>${total_value:,.2f}</td></tr>
                <tr><td>Cash Buffer:</td><td>${cash_buffer:,.2f}</td></tr>
                <tr><td>Daily P&L:</td><td>${daily_pnl:,.2f}</td></tr>
                <tr><td>Daily P&L %:</td><td>{daily_pnl_percent:.2f}%</td></tr>
            </table>
            
            <h2>Performance</h2>
            <p>Timeframe: {timeframe}</p>
            <p>Return: {percent_change:.2f}%</p>
            
            <h2>Asset Allocation</h2>
            <ul>
                {allocation_items}
            </ul>
        </body>
        </html>
        """

    def _get_performance_template(self) -> str:
        """Get HTML template for performance report"""
        return """
        <html>
        <head>
            <title>Performance Analysis Report</title>
        </head>
        <body>
            <h1>Performance Analysis Report</h1>
            <p>Generated: {generated_at}</p>
            
            <h2>Performance Metrics</h2>
            <table>
                <tr><td>Timeframe:</td><td>{timeframe}</td></tr>
                <tr><td>Return:</td><td>{percent_change:.2f}%</td></tr>
                <tr><td>Annualized Return:</td><td>{annualized_return:.2f}%</td></tr>
            </table>
            
            <h2>Risk Metrics</h2>
            <table>
                <tr><td>Volatility:</td><td>{volatility:.2f}%</td></tr>
                <tr><td>Sharpe Ratio:</td><td>{sharpe_ratio:.2f}</td></tr>
                <tr><td>Max Drawdown:</td><td>{max_drawdown:.2f}%</td></tr>
            </table>
        </body>
        </html>
        """

    def _get_tax_template(self) -> str:
        """Get HTML template for tax report"""
        return """
        <html>
        <head>
            <title>Tax Report</title>
        </head>
        <body>
            <h1>Tax Report {tax_year}</h1>
            <p>Generated: {generated_at}</p>
            
            <h2>Realized Gains/Losses</h2>
            <p>Total Realized Gains: ${total_realized_gains:,.2f}</p>
            
            <h2>Unrealized Gains/Losses</h2>
            <p>Total Unrealized Gains: ${total_unrealized_gains:,.2f}</p>
            
            <h2>Dividend Income</h2>
            <p>Total Dividend Income: ${total_dividend_income:,.2f}</p>
        </body>
        </html>
        """

    def _get_allocation_template(self) -> str:
        """Get HTML template for allocation report"""
        return """
        <html>
        <head>
            <title>Asset Allocation Analysis</title>
        </head>
        <body>
            <h1>Asset Allocation Analysis</h1>
            <p>Generated: {generated_at}</p>
            
            <h2>Asset Class Allocation</h2>
            <table>
                {asset_class_rows}
            </table>
            
            <h2>Sector Allocation</h2>
            <table>
                {sector_rows}
            </table>
            
            <h2>Concentration Risks</h2>
            <p>Diversification Score: {diversification_score:.1f}/100</p>
        </body>
        </html>
        """

    def _get_pdf_styles(self) -> str:
        """Get CSS styles for PDF reports"""
        return """
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .positive {
            color: #27ae60;
        }
        
        .negative {
            color: #e74c3c;
        }
        """
