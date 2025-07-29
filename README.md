# AIMS - Automated Investment Management System

## Overview

AIMS is a modular Python-backed platform with a lightweight web dashboard designed to consolidate and manage a $600k portfolio across multiple brokerages (Fidelity, Robinhood, Coinbase).

### Phase 1 Features ✅ COMPLETED
1. **Weekly Task Management** - Enforces disciplined weekly execution via a built-in TODO list with blocking tasks
2. **Next Actions Dashboard** - Real-time task display with color coding and compliance tracking
3. **Trade Ticket Builder** - Manual execution interface with blocking task validation
4. **Morning Brief System** - Daily portfolio summaries and alerts
5. **Portfolio Tracking** - Consolidated view across multiple brokerages
6. **Compliance Reporting** - Real-time metrics and trend analysis

Success is measured by achieving $10k/month net income within three months while limiting drawdowns < 20%.

### Phase 2 Features (In Progress)
1. **Performance Analytics Dashboard** - Comprehensive performance metrics with benchmark comparison
2. **Drawdown Analysis** - Real-time and historical drawdown tracking with alerts
3. **Monthly Reports** - Automated PDF generation with performance summaries

## Tech Stack

- **Backend**: FastAPI (Python 3.12+) with uv package manager
- **Frontend**: React 19 with Vite, TypeScript, Tailwind CSS
- **Database**: SQLite with SQLAlchemy ORM
- **Scheduler**: APScheduler for automated tasks
- **Reports**: WeasyPrint (HTML-to-PDF)
- **Task Management**: RRULE-based recurring tasks with compliance checking

## Setup Instructions

### Prerequisites
- Python 3.12 or higher
- Node.js 24.x or higher
- Yarn 1.22.x
- Git
- [uv](https://github.com/astral-sh/uv) - Modern Python package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AIMS
```

2. Install uv (if not already installed):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

3. Install dependencies with uv:
```bash
uv sync
```

This will automatically:
- Create a virtual environment
- Install all dependencies from pyproject.toml
- Set up the development environment

4. Copy environment configuration:
```bash
cp .env.example .env
```

5. Initialize the database:
```bash
uv run python scripts/init_db.py
```

6. Run the full stack development environment:
```bash
./scripts/start_dev.sh
```

This will:
- Start the backend API server on `http://localhost:8000`
- Start the frontend development server on `http://localhost:5173`
- Run setup verification checks
- Display logs for both servers

You can access:
- Frontend UI: `http://localhost:5173`
- API Documentation: `http://localhost:8000/docs`
- Alternative API docs: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/api/health`

To stop all servers, press `Ctrl+C`.

### Alternative: Manual Server Startup

If you prefer to run the servers separately:

**Backend:**
```bash
uv run uvicorn src.api.main:app --reload
```

**Frontend (in a new terminal):**
```bash
cd frontend
yarn install  # if not already done
yarn dev
```

### Development Setup

For development, the dev dependencies are already included with:
```bash
uv sync --dev
```

Run tests:
```bash
uv run pytest
```

Run linting and formatting:
```bash
uv run black src tests
uv run ruff check src tests
uv run mypy src
```

Format code:
```bash
uv run black .
uv run ruff check --fix .
```

## API Documentation

Once the application is running, you can access:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative API docs: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/api/health`

For detailed API documentation including all endpoints, authentication, and examples, see [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Project Structure

```
AIMS/
├── src/                    # Source code
│   ├── api/               # FastAPI application
│   │   ├── routes/        # API endpoints (health, portfolio, market, morning_brief, tasks)
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # Application entry point
│   ├── core/              # Core utilities
│   │   └── config.py      # Configuration management
│   ├── db/                # Database layer
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── session.py     # Database session management
│   │   └── seed_tasks.py  # Sample task templates
│   ├── data/              # Data models and fetchers
│   │   ├── models/        # Data models (portfolio, market)
│   │   ├── fetchers/      # Data fetchers (coinbase, fidelity, robinhood)
│   │   └── cache.py       # Caching layer
│   └── services/          # Business logic
│       ├── tasks/         # Task management services
│       ├── portfolio.py   # Portfolio service
│       └── scheduler.py   # Scheduled jobs
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities and API client
│   │   └── settings/      # Theme and configuration
│   └── package.json       # Frontend dependencies
├── tests/                 # Test suite
│   └── test_tasks/        # Task management tests
├── .kiro/specs/           # Feature specifications
├── pyproject.toml         # Python project configuration
├── requirements.txt       # Production dependencies
└── requirements-dev.txt   # Development dependencies
```

## Phase 1 Roadmap

- **Week 1**: Project setup and infrastructure ✅
- **Weeks 2-3**: Data fetcher and dashboard skeleton ✅
- **Weeks 4-5**: Report generator and trade ticket builder ✅
- **Week 6**: TODO engine integration ✅
- **Weeks 7-8**: Beta hardening and documentation ✅
- **Week 9**: Production launch ✅

**Status: Phase 1 Complete - Ready for Production Use**

## Contributing

This project uses GitHub Actions for CI/CD. All pull requests must pass:
- Code formatting (black)
- Linting (flake8)
- Type checking (mypy)
- Tests (pytest)

## License

Private project - All rights reserved
