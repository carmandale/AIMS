# Requirements Document

## Introduction

The Weekly Task Management System is a core component of AIMS that enforces disciplined weekly execution through a built-in TODO list. This system ensures that critical tasks are completed each week before the next cycle can close, providing workflow guard-rails for consistent portfolio management. The system supports both daily preparation tasks and weekly blocking tasks with recurring schedules using cron-style RRULE patterns.

## Requirements

### Requirement 1

**User Story:** As Dale, I want to see a Next Actions list with recurring tasks, so that I can maintain disciplined weekly execution and ensure no critical steps are missed.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the system SHALL display a "Next Actions" widget with all pending tasks
2. WHEN a task is due THEN the system SHALL highlight it in yellow color coding
3. WHEN a task is overdue THEN the system SHALL flag it in red color coding
4. WHEN a task is completed THEN the system SHALL mark it in green color coding
5. IF a task has a recurring schedule THEN the system SHALL automatically generate the next occurrence after completion

### Requirement 2

**User Story:** As Dale, I want to check off completed tasks with timestamps, so that I can track my compliance and maintain an audit trail.

#### Acceptance Criteria

1. WHEN I click a task checkbox THEN the system SHALL mark it as completed with a timestamp
2. WHEN I complete a task THEN the system SHALL store the completion time in the audit log
3. WHEN I view completed tasks THEN the system SHALL show the completion timestamp
4. IF I try to uncheck a completed task THEN the system SHALL require confirmation and log the change

### Requirement 3

**User Story:** As Dale, I want blocking tasks to prevent weekly cycle closure, so that I cannot skip critical steps in my investment workflow.

#### Acceptance Criteria

1. WHEN there are incomplete blocking tasks THEN the system SHALL prevent the weekly report generation
2. WHEN I try to generate a trade ticket THEN the system SHALL check that all blocking tasks are complete
3. IF blocking tasks are incomplete THEN the system SHALL display a warning message with the pending tasks
4. WHEN all blocking tasks are complete THEN the system SHALL allow the weekly cycle to close

### Requirement 4

**User Story:** As Dale, I want to manage task templates with RRULE scheduling, so that I can customize my weekly workflow and add new recurring tasks.

#### Acceptance Criteria

1. WHEN I access task management THEN the system SHALL provide CRUD operations for task templates
2. WHEN I create a task template THEN the system SHALL accept RRULE format for scheduling
3. WHEN I set a task as blocking THEN the system SHALL enforce it in the weekly cycle
4. WHEN I save a task template THEN the system SHALL validate the RRULE syntax
5. IF the RRULE is invalid THEN the system SHALL display an error message with correction suggestions

### Requirement 5

**User Story:** As Dale, I want daily preparation tasks that don't block weekly cycles, so that I can maintain daily discipline without preventing weekly operations.

#### Acceptance Criteria

1. WHEN daily tasks are created THEN the system SHALL mark them as non-blocking by default
2. WHEN daily tasks are overdue THEN the system SHALL flag them red but not prevent weekly operations
3. WHEN I complete daily tasks THEN the system SHALL track completion for performance metrics
4. WHEN viewing task compliance THEN the system SHALL show separate metrics for daily vs weekly tasks

### Requirement 6

**User Story:** As Dale, I want to see task compliance metrics, so that I can track my discipline and identify areas for improvement.

#### Acceptance Criteria

1. WHEN I view the dashboard THEN the system SHALL display current week compliance percentage
2. WHEN I access task history THEN the system SHALL show completion rates over time
3. WHEN tasks are consistently missed THEN the system SHALL highlight patterns in the metrics
4. WHEN compliance drops below 90% THEN the system SHALL display a warning indicator