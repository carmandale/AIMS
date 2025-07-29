# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-29-monthly-reports-#66/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Endpoints

### GET /api/reports/monthly

**Purpose:** Retrieve list of monthly reports for authenticated user
**Parameters:** 
- `year` (optional): Filter by specific year
- `month` (optional): Filter by specific month  
- `status` (optional): Filter by generation status (pending, completed, failed)
- `limit` (optional): Number of reports to return (default: 12)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "reports": [
    {
      "id": 1,
      "month": 7,
      "year": 2025,
      "report_date": "2025-07-31",
      "status": "completed",
      "file_size": 2048576,
      "generated_at": "2025-07-31T23:59:00Z",
      "email_delivered": true
    }
  ],
  "total": 12,
  "has_more": false
}
```

**Errors:** 
- 401: Unauthorized (invalid JWT token)
- 500: Internal server error

### GET /api/reports/monthly/{report_id}

**Purpose:** Get detailed information about a specific monthly report
**Parameters:** 
- `report_id` (path): ID of the monthly report

**Response:**
```json
{
  "id": 1,
  "month": 7,
  "year": 2025,
  "report_date": "2025-07-31",
  "status": "completed",
  "file_size": 2048576,
  "generated_at": "2025-07-31T23:59:00Z",
  "generation_time_seconds": 45.2,
  "email_deliveries": [
    {
      "email": "user@example.com",
      "status": "sent",
      "sent_at": "2025-08-01T00:15:00Z"
    }
  ],
  "download_url": "/api/reports/monthly/1/download"
}
```

**Errors:**
- 401: Unauthorized
- 404: Report not found or doesn't belong to user
- 500: Internal server error

### GET /api/reports/monthly/{report_id}/download

**Purpose:** Download PDF file for a specific monthly report
**Parameters:** 
- `report_id` (path): ID of the monthly report

**Response:** 
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="monthly_report_2025_07.pdf"
- PDF file stream

**Errors:**
- 401: Unauthorized
- 404: Report not found, doesn't belong to user, or file missing
- 500: Internal server error

### POST /api/reports/monthly/generate

**Purpose:** Manually trigger generation of monthly report for specific month/year
**Parameters:** 
```json
{
  "month": 7,
  "year": 2025,
  "force_regenerate": false,
  "email_delivery": true
}
```

**Response:**
```json
{
  "report_id": 1,
  "status": "pending",
  "message": "Report generation started",
  "estimated_completion": "2025-07-29T10:05:00Z"
}
```

**Errors:**
- 400: Invalid month/year or report already exists (unless force_regenerate=true)
- 401: Unauthorized
- 409: Report generation already in progress
- 500: Internal server error

### DELETE /api/reports/monthly/{report_id}

**Purpose:** Delete a monthly report and its associated files
**Parameters:** 
- `report_id` (path): ID of the monthly report to delete

**Response:**
```json
{
  "message": "Report deleted successfully"
}
```

**Errors:**
- 401: Unauthorized
- 404: Report not found or doesn't belong to user
- 409: Cannot delete report currently being generated
- 500: Internal server error

### GET /api/reports/monthly/status

**Purpose:** Get current status of report generation system
**Parameters:** None

**Response:**
```json
{
  "scheduler_running": true,
  "next_scheduled_generation": "2025-08-31T23:00:00Z",
  "generation_in_progress": false,
  "recent_generations": [
    {
      "month": 7,
      "year": 2025,
      "status": "completed",
      "generated_at": "2025-07-31T23:59:00Z"
    }
  ]
}
```

**Errors:**
- 401: Unauthorized
- 500: Internal server error

### POST /api/reports/monthly/{report_id}/email

**Purpose:** Manually trigger email delivery for a completed report
**Parameters:** 
- `report_id` (path): ID of the monthly report
```json
{
  "email_address": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Email delivery queued",
  "delivery_id": 123
}
```

**Errors:**
- 400: Invalid email address or report not completed
- 401: Unauthorized
- 404: Report not found
- 500: Internal server error

## Controllers

### ReportsController

**Action: list_monthly_reports**
- Handles GET /api/reports/monthly
- Filters and paginates user's monthly reports
- Returns summary data for report listing

**Action: get_monthly_report**  
- Handles GET /api/reports/monthly/{report_id}
- Validates report ownership by user
- Returns detailed report information including email delivery status

**Action: download_monthly_report**
- Handles GET /api/reports/monthly/{report_id}/download
- Validates file existence and user permissions
- Streams PDF file with appropriate headers

**Action: generate_monthly_report**
- Handles POST /api/reports/monthly/generate
- Validates month/year parameters and duplicate detection
- Queues background report generation task

**Action: delete_monthly_report**
- Handles DELETE /api/reports/monthly/{report_id}
- Validates ownership and ensures report not in progress
- Removes database records and PDF files

**Action: get_generation_status**
- Handles GET /api/reports/monthly/status
- Returns scheduler status and recent activity
- Provides system health information

**Action: send_report_email**
- Handles POST /api/reports/monthly/{report_id}/email
- Validates email address and report completion
- Queues email delivery task

## Authentication & Authorization

- **Authentication**: All endpoints require valid JWT token in Authorization header
- **Authorization**: Users can only access their own reports (user_id from JWT token)
- **Rate Limiting**: Report generation limited to 5 requests per hour per user
- **File Access**: PDF downloads include additional validation for file existence and ownership