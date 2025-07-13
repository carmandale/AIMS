# AIMS - Automated Investment Management System

## Overview

AIMS is a modular Python-backed platform with a lightweight web dashboard designed to consolidate and manage a $600k portfolio across multiple brokerages (Fidelity, Robinhood, Coinbase).

### Phase 1 Focus
1. **Run Weekly Reports** that pull account data and market analytics
2. **Produce a Ready-to-Send Trade Ticket** for manual execution at the broker of choice
3. **Enforce Weekly Discipline** via a built-in TODO list—tasks must be checked off before the next cycle can close

Success is measured by achieving $10k/month net income within three months while limiting drawdowns < 20%.

## Tech Stack

- **Backend**: FastAPI (Python 3.12+) with uv package manager
- **Frontend**: Next.js 15 with React 19.1, TypeScript, Tailwind CSS
- **Database**: SQLite with SQLAlchemy ORM
- **Scheduler**: APScheduler for automated tasks
- **Reports**: WeasyPrint (HTML-to-PDF)
- **Caching**: In-memory with optional Redis support

## Setup Instructions

### Prerequisites
- Python 3.12 or higher
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

5. Run the application:
```bash
uv run uvicorn src.api.main:app --reload
```

Or activate the virtual environment first:
```bash
source .venv/bin/activate  # uv creates .venv by default
uvicorn src.api.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

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

## Project Structure

```
AIMS/
├── src/                    # Source code
│   ├── api/               # FastAPI application
│   │   ├── routes/        # API endpoints
│   │   └── main.py        # Application entry point
│   └── core/              # Core utilities
│       └── config.py      # Configuration management
├── tests/                 # Test suite
├── docs/                  # Documentation
├── .github/workflows/     # CI/CD configuration
├── requirements.txt       # Production dependencies
└── requirements-dev.txt   # Development dependencies
```

## Phase 1 Roadmap

- **Week 1**: Project setup and infrastructure ✓
- **Weeks 2-3**: Data fetcher and dashboard skeleton
- **Weeks 4-5**: Report generator and trade ticket builder
- **Week 6**: TODO engine integration
- **Weeks 7-8**: Beta hardening and documentation
- **Week 9**: Production launch

## Contributing

This project uses GitHub Actions for CI/CD. All pull requests must pass:
- Code formatting (black)
- Linting (flake8)
- Type checking (mypy)
- Tests (pytest)

## License

Private project - All rights reserved