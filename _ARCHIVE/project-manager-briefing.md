# Project Manager Briefing - Issue #52: Local Development Setup

## Mission
Lead the implementation of GitHub issue #52 "Local Development Setup for Real SnapTrade Testing" for the AIMS project.

## Project Context
- AIMS is an Automated Investment Management System (FastAPI + React)
- Currently managing a $600k portfolio with $10k/month income target
- Core functionality is complete and tested
- Issue #52 focuses on making local development setup smooth and foolproof

## Your Role
As Project Manager in Window 1, you will:
1. Create and maintain a master task list for all 6 acceptance criteria
2. Assign tasks to the Engineer (Window 2)
3. Monitor progress and quality
4. Ensure comprehensive testing of all deliverables
5. Report status to the Orchestrator

## Team Structure
- **You**: Project Manager (Window 1) - Quality control and task assignment
- **Engineer**: (Window 2) - Implementation and coding
- **Backend Server**: (Window 3) - FastAPI development server
- **Frontend Server**: (Window 4) - React development server
- **Orchestrator**: Overall coordination and scheduling

## Acceptance Criteria Breakdown

### 1. Local Development Setup Guide
- Comprehensive step-by-step installation instructions
- Prerequisites and dependencies documentation
- Environment configuration walkthrough
- Troubleshooting common issues

### 2. Production Environment Configuration
- Create `.env.production` template for real SnapTrade credentials
- Document security best practices
- Explain sandbox vs production differences
- Database configuration for production use

### 3. Database Initialization Script
- Create `scripts/init_db.py` for automated database setup
- Handle table creation and migrations
- Seed data for development/testing
- Error handling and validation

### 4. Setup Verification Script
- Create `scripts/verify_setup.py` to test all components
- Verify database connectivity
- Test SnapTrade API connectivity
- Validate backend endpoints
- Check frontend-backend communication

### 5. SnapTrade Production Configuration Guide
- Document how to obtain production SnapTrade credentials
- API key management and security
- Environment switching procedures
- Production vs sandbox feature differences

### 6. Development Startup Scripts
- Create `scripts/start_backend.sh` for API server
- Create `scripts/start_frontend.sh` for React dev server
- Create `scripts/start_dev.sh` for full stack startup
- Cross-platform compatibility (Windows/Mac/Linux)

## Success Metrics
- User can clone repo and run locally in under 10 minutes
- Clear documentation for switching sandbox to production
- Verification script confirms all components working
- Setup works on Windows, Mac, and Linux
- Real SnapTrade data can be retrieved and displayed

## Technical Requirements
- Python 3.12+ with uv package manager
- Node.js 24.x+ with Yarn
- SQLite database (default) or PostgreSQL
- SnapTrade production API credentials

## Initial Actions
1. Review existing project structure and documentation
2. Create detailed task breakdown for each acceptance criteria
3. Prioritize tasks based on dependencies
4. Begin assigning tasks to Engineer
5. Set up progress tracking system

## Communication Protocol
- Regular status updates to Orchestrator
- Clear task assignments to Engineer
- Quality checks before marking tasks complete
- Escalate blockers immediately

## Project Location
`/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/AIMS/`

## Key Files to Review
- `.env.example` - Current environment configuration
- `README.md` - Existing documentation
- `src/db/session.py` - Database initialization
- `frontend/src/lib/api-client.ts` - API client configuration
- `tests/integration/test_snaptrade_integration.py` - Integration tests

Start by reviewing the project and creating your master task list!