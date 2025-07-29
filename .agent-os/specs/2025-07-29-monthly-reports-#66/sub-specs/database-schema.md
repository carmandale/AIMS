# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-29-monthly-reports-#66/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Schema Changes

### New Tables

#### monthly_reports
```sql
CREATE TABLE monthly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_month INTEGER NOT NULL,        -- Month (1-12)
    report_year INTEGER NOT NULL,         -- Year (YYYY)
    report_date DATE NOT NULL,            -- Date report was generated
    file_path TEXT NOT NULL,              -- Path to PDF file
    file_size INTEGER,                    -- File size in bytes
    generation_status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, failed
    generation_started_at TIMESTAMP,
    generation_completed_at TIMESTAMP,
    error_message TEXT,                   -- Error details if generation failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, report_month, report_year)  -- One report per user per month
);
```

#### report_email_deliveries
```sql
CREATE TABLE report_email_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    email_address TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed
    sent_at TIMESTAMP,
    error_message TEXT,                   -- SMTP error details if delivery failed
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
);
```

#### report_generation_log
```sql
CREATE TABLE report_generation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    log_level TEXT NOT NULL,              -- info, warning, error
    message TEXT NOT NULL,
    details TEXT,                         -- JSON details for structured logging
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
);
```

### New Indexes

```sql
-- Performance optimization for report queries
CREATE INDEX idx_monthly_reports_user_date ON monthly_reports(user_id, report_year DESC, report_month DESC);
CREATE INDEX idx_monthly_reports_status ON monthly_reports(generation_status);
CREATE INDEX idx_monthly_reports_date ON monthly_reports(report_date DESC);

-- Email delivery tracking indexes
CREATE INDEX idx_report_email_deliveries_report ON report_email_deliveries(report_id);
CREATE INDEX idx_report_email_deliveries_status ON report_email_deliveries(delivery_status);

-- Logging indexes for troubleshooting
CREATE INDEX idx_report_generation_log_report ON report_generation_log(report_id);
CREATE INDEX idx_report_generation_log_level_date ON report_generation_log(log_level, logged_at DESC);
```

### Schema Migration

```sql
-- Migration: Add monthly reports functionality
-- Version: 2025.07.29.001

BEGIN TRANSACTION;

-- Create monthly_reports table
CREATE TABLE monthly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_month INTEGER NOT NULL,
    report_year INTEGER NOT NULL,
    report_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    generation_status TEXT NOT NULL DEFAULT 'pending',
    generation_started_at TIMESTAMP,
    generation_completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, report_month, report_year)
);

-- Create report_email_deliveries table
CREATE TABLE report_email_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    email_address TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
);

-- Create report_generation_log table
CREATE TABLE report_generation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    log_level TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_monthly_reports_user_date ON monthly_reports(user_id, report_year DESC, report_month DESC);
CREATE INDEX idx_monthly_reports_status ON monthly_reports(generation_status);
CREATE INDEX idx_monthly_reports_date ON monthly_reports(report_date DESC);
CREATE INDEX idx_report_email_deliveries_report ON report_email_deliveries(report_id);
CREATE INDEX idx_report_email_deliveries_status ON report_email_deliveries(delivery_status);
CREATE INDEX idx_report_generation_log_report ON report_generation_log(report_id);
CREATE INDEX idx_report_generation_log_level_date ON report_generation_log(log_level, logged_at DESC);

COMMIT;
```

## Data Integrity Rules

- **Report Uniqueness**: Each user can have only one report per month/year combination
- **Foreign Key Constraints**: All reports must belong to valid users, email deliveries must reference valid reports
- **Status Validation**: Report generation status must be one of: pending, completed, failed
- **Email Status Validation**: Delivery status must be one of: pending, sent, failed
- **File Path Requirements**: Generated reports must have valid file paths stored for retrieval
- **Cascade Deletion**: Deleting a user removes all their reports; deleting a report removes associated deliveries and logs

## Performance Considerations

- **Indexed Queries**: All common query patterns (user reports, status filtering, date ranges) are indexed
- **Efficient Sorting**: Primary sort index on user_id + date DESC for report listing
- **Log Retention**: Consider implementing log retention policy to prevent unbounded growth
- **File System Cleanup**: Implement cleanup process for orphaned PDF files when reports are deleted