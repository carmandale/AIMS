# AIMS - Automated Investment Management System

## Overview

AIMS is a modular Python-backed platform with a lightweight web dashboard designed to consolidate and manage a $600k portfolio across multiple brokerages (Fidelity, Robinhood, Coinbase).

### Phase 1 Focus
1. **Run Weekly Reports** that pull account data and market analytics
2. **Produce a Ready-to-Send Trade Ticket** for manual execution at the broker of choice
3. **Enforce Weekly Discipline** via a built-in TODO list—tasks must be checked off before the next cycle can close

Success is measured by achieving $10k/month net income within three months while limiting drawdowns < 20%.

## Tech Stack

- **Backend**: FastAPI (Python)
- **Scheduler**: APScheduler
- **Database**: SQLite (Phase 1)
- **Reports**: WeasyPrint (HTML-to-PDF)
- **Frontend**: React + Tailwind (Phase 2)

## Setup Instructions

### Prerequisites
- Python 3.11 or higher
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AIMS
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment configuration:
```bash
cp .env.example .env
```

5. Run the application:
```bash
uvicorn src.api.main:app --reload
```

The API will be available at `http://localhost:8000`

### Development Setup

For development, install additional dependencies:
```bash
pip install -r requirements-dev.txt
```

Run tests:
```bash
pytest
```

Run linting and formatting:
```bash
black src tests
flake8 src tests
mypy src
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