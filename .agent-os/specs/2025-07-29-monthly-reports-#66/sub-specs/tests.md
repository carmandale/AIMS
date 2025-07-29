# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-29-monthly-reports-#66/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**ReportGeneratorService**
- Test PDF generation with mock data for all report sections
- Test template rendering with various data scenarios (empty portfolios, multiple trades, etc.)
- Test chart generation and embedding in PDF reports
- Test error handling for WeasyPrint failures and template errors
- Test file system operations for PDF storage and cleanup

**ReportDataAggregator**
- Test data collection for reporting periods with various date ranges
- Test performance calculations for monthly periods with different portfolio states
- Test trade summarization and P&L calculations for complex trading scenarios
- Test portfolio allocation calculations with multiple asset types
- Test drawdown analysis integration for monthly reporting periods

**EmailService**
- Test SMTP configuration and connection handling
- Test email composition with PDF attachments and proper MIME formatting
- Test email delivery retry logic and failure handling
- Test email template rendering for report summaries
- Test email address validation and sanitization

**MonthlyReportScheduler**
- Test APScheduler job configuration and execution timing
- Test automatic report generation trigger at month-end
- Test failure handling and retry mechanisms for scheduled jobs
- Test job persistence and recovery after system restarts
- Test timezone handling for month-end calculations

### Integration Tests

**Report Generation Workflow**
- Test complete report generation from data collection through PDF creation
- Test integration between ReportGeneratorService and database queries
- Test chart generation with real portfolio data and performance metrics
- Test template rendering with actual user data and various portfolio states
- Test file system integration for PDF storage and retrieval

**Email Delivery Workflow**
- Test end-to-end email delivery with PDF attachment generation
- Test SMTP integration with various email providers and configurations
- Test email delivery tracking and status updates in database
- Test bulk email delivery for multiple users with rate limiting
- Test email failure handling and retry mechanisms

**API Integration Workflow**
- Test REST API endpoints with authentication and authorization
- Test report listing, filtering, and pagination with large datasets
- Test PDF download functionality with file streaming and error handling
- Test manual report generation through API with validation
- Test report deletion with cleanup of files and database records

**Scheduler Integration Workflow**
- Test automated monthly report generation with APScheduler
- Test integration between scheduler and report generation services
- Test failure recovery and error notification systems
- Test concurrent report generation handling and resource management
- Test scheduler persistence and job recovery after system restarts

### Feature Tests

**Complete Monthly Report Generation**
- End-to-end test of automated report generation at month-end
- Test report includes all required sections with proper formatting
- Test PDF download and viewing with correct charts and data
- Test email delivery with PDF attachment and summary content
- Test report archival and retrieval from historical records

**Report Management Interface**
- Test web interface for viewing list of historical reports
- Test report filtering by date, status, and other criteria
- Test manual report generation through web interface
- Test report deletion with confirmation and cleanup verification
- Test error handling and user feedback for failed operations

**Email Configuration and Delivery**
- Test email setup and configuration through admin interface
- Test automated email delivery with proper scheduling
- Test email delivery failure handling and user notifications
- Test email content formatting with report summaries and attachments
- Test email preference management (enable/disable, frequency settings)

### Mocking Requirements

**External Services**
- **SMTP Server**: Mock email server for testing email delivery without actual sending
- **Strategy**: Use Python's aiosmtpd for testing email functionality

**File System Operations**
- **PDF Storage**: Mock file system operations for testing without actual file creation
- **Strategy**: Use pytest's tmp_path fixture and monkeypatch for file operations

**APScheduler**
- **Job Scheduling**: Mock scheduler for testing without time-based delays
- **Strategy**: Use APScheduler's memory jobstore and manual job triggering

**WeasyPrint PDF Generation**
- **PDF Rendering**: Mock WeasyPrint for faster testing without actual PDF generation
- **Strategy**: Mock weasyprint.HTML class to return test PDF bytes

**Database Time Functions**
- **Date/Time Calculations**: Mock datetime.now() for consistent month-end testing
- **Strategy**: Use freezegun library for time-based test scenarios

**Chart Generation**
- **matplotlib/plotly**: Mock chart generation for faster test execution
- **Strategy**: Mock chart libraries to return test image data instead of generating actual charts

## Performance Testing

**Report Generation Performance**
- Test report generation time with large datasets (1000+ trades, 100+ positions)
- Test memory usage during PDF generation with complex charts and tables
- Test concurrent report generation for multiple users
- Test database query performance for historical data aggregation
- Test file system performance for PDF storage and retrieval

**Email Delivery Performance**
- Test bulk email delivery performance with rate limiting
- Test email queue processing under high load
- Test SMTP connection pooling and efficiency
- Test email attachment handling with large PDF files
- Test email delivery retry performance under failure conditions

## Test Data Requirements

**Portfolio Data**
- Historical portfolio positions for 12+ months
- Trade data with various asset types and P&L scenarios
- Performance metrics data for realistic report generation
- Drawdown events and recovery periods for comprehensive testing
- User authentication data for API testing

**Email Configuration**
- Test SMTP server configurations for various providers
- Valid and invalid email addresses for delivery testing
- Email template data for content generation testing
- Error scenarios for SMTP failures and retry testing