# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-29-monthly-reports-#66/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Technical Requirements

- **PDF Generation**: Use WeasyPrint with HTML/CSS templates for professional report layout with embedded charts
- **Report Templates**: HTML templates with CSS styling for consistent, professional formatting across all report sections
- **Chart Integration**: Generate static chart images using matplotlib/plotly for embedding in PDF reports
- **Scheduled Generation**: APScheduler integration with monthly cron job for automatic report generation
- **Email Integration**: SMTP client configuration for automated email delivery with PDF attachments
- **File Storage**: Local file system storage for generated PDF reports with organized directory structure
- **Database Integration**: New tables for report metadata, generation history, and email delivery tracking
- **Performance Optimization**: Efficient data aggregation queries for large historical datasets
- **Error Handling**: Comprehensive error handling for PDF generation failures and email delivery issues

## Approach Options

**Option A:** Template-based HTML generation with WeasyPrint
- Pros: High-quality PDF output, easy styling with CSS, good chart integration, responsive layouts
- Cons: Learning curve for WeasyPrint, potential memory usage for large reports

**Option B:** Direct PDF generation with ReportLab (Selected)
- Pros: Native Python PDF library, efficient memory usage, programmatic control
- Cons: More complex layout code, limited styling options, harder chart integration

**Rationale:** WeasyPrint provides better separation of concerns with HTML templates, easier styling, and superior chart integration. The professional appearance and maintainability outweigh the slightly higher complexity.

## External Dependencies

- **WeasyPrint** - HTML/CSS to PDF conversion with professional formatting capabilities
- **Justification:** Already specified in tech stack for report generation, mature library with excellent output quality

- **Jinja2** - Template engine for dynamic HTML report generation
- **Justification:** Standard templating engine, excellent integration with Python web frameworks, supports complex data structures

- **matplotlib** - Chart generation for embedding in PDF reports  
- **Justification:** Robust charting library, can generate static images for PDF embedding, extensive chart types

- **smtplib** (built-in) - Email delivery for automated report distribution
- **Justification:** Python standard library, sufficient for SMTP email sending requirements

## Architecture Components

### Report Generator Service
- `ReportGeneratorService`: Orchestrates report generation process
- `ReportTemplateRenderer`: Handles HTML template rendering with Jinja2
- `ChartGenerator`: Creates static chart images for PDF embedding
- `PDFGenerator`: Converts HTML to PDF using WeasyPrint

### Email Delivery Service  
- `EmailService`: Handles SMTP configuration and email sending
- `ReportEmailComposer`: Creates email content with PDF attachments
- `EmailDeliveryTracker`: Tracks email delivery status and failures

### Scheduler Integration
- `MonthlyReportScheduler`: APScheduler job for automatic report generation
- `ReportGenerationTask`: Background task handling for report creation
- `FailureRetryHandler`: Retry logic for failed report generation

### Data Aggregation Layer
- `ReportDataAggregator`: Queries and aggregates data for reporting period
- `PerformanceDataCollector`: Gathers performance metrics and calculations
- `TradeDataCollector`: Aggregates trade data and P&L analysis
- `PortfolioDataCollector`: Current portfolio state and allocation data