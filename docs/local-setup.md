# AIMS Local Development Setup Guide

This guide will help you set up the AIMS (Automated Investment Management System) for local development in under 10 minutes. Follow these steps to get a fully functional development environment with real SnapTrade integration capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup Steps](#detailed-setup-steps)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
9. [Platform-Specific Instructions](#platform-specific-instructions)
10. [Next Steps](#next-steps)

## Prerequisites

Before starting, ensure you have the following installed:

### Required
- **Python 3.12+** - [Download Python](https://www.python.org/downloads/)
- **UV Package Manager** - Python's fast package manager
  ```bash
  # Install UV (macOS/Linux)
  curl -LsSf https://astral.sh/uv/install.sh | sh
  
  # Install UV (Windows)
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
- **Node.js 24.0+** - [Download Node.js](https://nodejs.org/)
- **Yarn Package Manager**
  ```bash
  npm install -g yarn
  ```
- **Git** - [Download Git](https://git-scm.com/)

### Optional but Recommended
- **Visual Studio Code** or your preferred IDE
- **Docker Desktop** (for containerized development)
- **Postman** or similar API testing tool

## Quick Start

For experienced developers who want to get up and running quickly:

```bash
# 1. Clone and enter the repository
git clone <repository-url> aims
cd aims

# 2. Copy environment configuration
cp .env.example .env

# 3. Install Python dependencies with UV
uv sync

# 4. Install frontend dependencies
cd frontend && yarn install && cd ..

# 5. Initialize the database
uv run python scripts/init_db.py

# 6. Verify setup
uv run python scripts/verify_setup.py --skip-backend

# 7. Start the development servers
# Terminal 1: Backend
uv run uvicorn src.api.main:app --reload

# Terminal 2: Frontend
cd frontend && yarn dev
```

The application will be available at:
- Backend API: http://localhost:8000
- Frontend UI: http://localhost:3000
- API Documentation: http://localhost:8000/docs

## Detailed Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url> aims
cd aims
```

### 2. Set Up Python Environment

AIMS uses UV for fast, reliable Python package management:

```bash
# UV automatically creates and manages the virtual environment
uv sync

# This installs all dependencies from pyproject.toml and uv.lock
```

### 3. Set Up Frontend Environment

```bash
cd frontend
yarn install
cd ..
```

### 4. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred editor
# For VS Code:
code .env

# For nano:
nano .env
```

**Important environment variables to configure:**

```bash
# Security (CHANGE THIS for any non-development use)
SECRET_KEY=your-secret-key-here-change-in-production

# Database (SQLite by default, no changes needed for local dev)
DATABASE_URL=sqlite:///./aims.db

# SnapTrade Configuration
SNAPTRADE_CLIENT_ID=your-client-id
SNAPTRADE_CONSUMER_KEY=your-consumer-key
SNAPTRADE_ENVIRONMENT=sandbox  # Use "production" for real trading

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Frontend URL for CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

### 5. Initialize the Database

```bash
# Create all database tables and seed with test data
uv run python scripts/init_db.py

# Options:
# --force: Recreate all tables (WARNING: deletes all data)
# --no-seed: Skip test data seeding
# --verify-only: Just verify existing database
```

### 6. Verify Your Setup

Run the comprehensive verification script:

```bash
uv run python scripts/verify_setup.py

# For quick verification (skips backend startup):
uv run python scripts/verify_setup.py --skip-backend
```

This checks:
- ✓ System requirements
- ✓ Environment configuration
- ✓ Python dependencies
- ✓ Node.js dependencies
- ✓ Database connectivity
- ✓ API endpoints
- ✓ Frontend build
- ✓ SnapTrade configuration

## Environment Configuration

### Development vs Production

The `.env` file controls your environment. Key differences:

| Setting | Development | Production |
|---------|------------|------------|
| SECRET_KEY | Default value OK | Must be unique, secure |
| DATABASE_URL | SQLite | PostgreSQL recommended |
| SNAPTRADE_ENVIRONMENT | sandbox | production |
| API_RELOAD | true | false |
| LOG_LEVEL | DEBUG | INFO or WARNING |

### SnapTrade Configuration

To use SnapTrade (required for portfolio connectivity):

1. Sign up at [SnapTrade Dashboard](https://dashboard.snaptrade.com/signup)
2. Get your sandbox credentials
3. Update `.env` with your credentials:
   ```
   SNAPTRADE_CLIENT_ID=your-client-id
   SNAPTRADE_CONSUMER_KEY=your-consumer-key
   ```

## Database Setup

### Default SQLite Database

By default, AIMS uses SQLite for simple local development:
- Database file: `aims.db` in project root
- No additional setup required
- Perfect for development and testing

### PostgreSQL (Optional)

For production-like development:

```bash
# Update .env
DATABASE_URL=postgresql://user:password@localhost/aims_db

# Create database
createdb aims_db

# Run initialization
uv run python scripts/init_db.py
```

### Database Management

```bash
# Reset database (WARNING: deletes all data)
uv run python scripts/init_db.py --force

# Verify database setup
uv run python scripts/init_db.py --verify-only

# Future: Run migrations
uv run python scripts/init_db.py --migrate
```

## Running the Application

### Start Backend API

```bash
# Development mode with auto-reload
uv run uvicorn src.api.main:app --reload

# Or use the startup script (once created)
./scripts/start_backend.sh
```

Backend will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Start Frontend

In a new terminal:

```bash
cd frontend
yarn dev

# Or use the startup script (once created)
./scripts/start_frontend.sh
```

Frontend will be available at:
- UI: http://localhost:3000

### Start Everything

Once startup scripts are created:

```bash
./scripts/start_dev.sh
```

## Verification

### Quick Health Check

```bash
# Check backend health
curl http://localhost:8000/health

# Check detailed health
curl http://localhost:8000/api/health/detailed
```

### Run Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run specific test
uv run pytest tests/test_health.py -v
```

### Verify SnapTrade Integration

```bash
# Run integration tests
uv run pytest tests/integration/test_snaptrade_integration.py -v
```

## Common Issues & Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
# Ensure you're using UV to run commands
uv run python script.py  # Correct
python script.py         # May fail

# Resync dependencies
uv sync
```

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 8000
lsof -ti :8000

# Kill it
kill -9 $(lsof -ti :8000)

# Or change port in .env
API_PORT=8001
```

### Issue: Database errors

**Solution:**
```bash
# Reset database
rm aims.db
uv run python scripts/init_db.py
```

### Issue: Frontend won't start

**Solution:**
```bash
cd frontend
rm -rf node_modules
yarn install
yarn dev
```

### Issue: SnapTrade authentication errors

**Solution:**
1. Verify credentials in `.env`
2. Check you're using sandbox environment for testing
3. Ensure credentials match dashboard settings

## Platform-Specific Instructions

### macOS

```bash
# Install Xcode Command Line Tools if needed
xcode-select --install

# Use Homebrew for system dependencies
brew install python@3.12 node
```

### Windows

```powershell
# Run PowerShell as Administrator

# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Use Windows Terminal for better experience
# Install from Microsoft Store
```

### Linux (Ubuntu/Debian)

```bash
# Install system dependencies
sudo apt update
sudo apt install python3.12 python3.12-venv nodejs npm

# Install yarn
sudo npm install -g yarn
```

## Next Steps

After successful setup:

1. **Explore the API**
   - Visit http://localhost:8000/docs
   - Try the health check endpoints
   - Test authentication flow

2. **Connect a Brokerage Account**
   - Use the SnapTrade integration
   - Follow the connection flow in the UI

3. **Review Architecture**
   - Read `docs/architecture.md`
   - Understand the project structure

4. **Start Development**
   - Check open issues on GitHub
   - Read contribution guidelines
   - Join the development chat

5. **Run Full Test Suite**
   ```bash
   # Comprehensive testing
   uv run python scripts/verify_setup.py
   uv run pytest
   cd frontend && yarn test
   ```

## Getting Help

If you encounter issues:

1. Run the verification script: `uv run python scripts/verify_setup.py`
2. Check the [Troubleshooting](#common-issues--troubleshooting) section
3. Search existing GitHub issues
4. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - Output of verification script
   - Your platform/OS version

## Additional Resources

- [Architecture Documentation](./architecture.md)
- [API Documentation](http://localhost:8000/docs) (when running)
- [SnapTrade Documentation](https://docs.snaptrade.com/)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

**Happy coding!** 🚀 Your AIMS development environment should now be fully operational.