# AIMS - Automated Investment Management System

AIMS is a modular Python-backed platform with a lightweight web dashboard designed to consolidate and manage investment portfolios across multiple brokerages (Fidelity, Robinhood, Coinbase).

## Core Features

- **Weekly Task Management** - Enforces disciplined weekly execution via a built-in TODO list with blocking tasks
- **Next Actions Dashboard** - Real-time task display with color coding and compliance tracking
- **Trade Ticket Builder** - Manual execution interface with blocking task validation
- **Morning Brief System** - Daily portfolio summaries and alerts
- **Portfolio Tracking** - Consolidated view across multiple brokerages
- **Compliance Reporting** - Real-time metrics and trend analysis

## Business Goals & Progress

### Primary Goals
- **Achieve $10k/month net income within three months**
  - Status: 🚧 Blocked by mock data issue (Issue #10)
  - Next: Implement real brokerage data connections
  
- **Limit drawdowns to < 20%**
  - Status: 🚧 Risk metrics implemented but using mock data
  - Next: Connect to real portfolio data for accurate calculations
  
- **Enforce disciplined investment workflow through task management**
  - Status: ✅ Task management system fully implemented
  - Next: Integrate with trade execution system

- **Provide consolidated portfolio view across multiple brokerages**
  - Status: 🚧 Framework exists but needs real data connections
  - Next: Implement secure brokerage API integrations

## User Workflow

1. Daily preparation tasks (non-blocking)
2. Weekly critical tasks (blocking)
3. Portfolio review and rebalancing
4. Trade execution with compliance validation
5. Performance tracking and reporting

## Key Components

- Task templates with RRULE-based scheduling
- Compliance checking for blocking tasks
- Portfolio consolidation across brokerages
- Morning brief with daily market insights
- Weekly progress tracking

## Implementation Status

### ✅ Completed Features
- **Weekly Task Management** - Full RRULE-based task scheduling system
  - Task templates with recurring schedules
  - Task instance generation
  - Compliance checking for blocking tasks
  - Audit logging for task completion
  - API endpoints: `/api/tasks/*`

### 🚧 In Progress / Needs Fixes
- **Portfolio Tracking** - Basic implementation with critical issues
  - ❌ Security vulnerabilities (Issue #13) - CRITICAL
  - ❌ Using mock data instead of real brokerage connections (Issue #10) - CRITICAL
  - ❌ Missing comprehensive test coverage (Issue #9)
  - ✅ Basic portfolio analytics and risk metrics
  - ✅ Multi-brokerage data fetcher framework
  - API endpoints: `/api/portfolio/*`

### ❌ Planned Features (Not Started)
- **Morning Brief System** (Issue #7)
  - Daily portfolio summaries
  - Market alerts and volatility notifications
  - Key position highlights
  
- **Next Actions Dashboard** (Issue #4)
  - Real-time task display with color coding
  - Compliance tracking visualization
  - Weekly progress indicators
  
- **Trade Ticket Builder** (Issue #5)
  - Manual trade execution interface
  - Blocking task validation before trades
  - Risk assessment integration
  
- **Compliance Reporting** (Issue #6)
  - Real-time compliance metrics
  - Trend analysis and reporting
  - Regulatory requirement tracking

### 🔧 Technical Debt
- Clean up Gemini's problematic authentication implementation
- Implement proper authentication/authorization system
- Add comprehensive error handling
- Improve test coverage across all modules
- Set up proper CI/CD pipeline with security checks
