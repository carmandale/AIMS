# AIMS Setup Guide

## Development Environment Setup

This guide provides detailed instructions for setting up the AIMS development environment.

### System Requirements

- Python 3.11+ (3.12 recommended)
- pip (Python package manager)
- Git
- SQLite3
- Optional: Docker for containerized development

### Local Development Setup

#### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd AIMS

# Create and activate virtual environment
python -m venv venv

# Activation commands by OS:
# Linux/macOS:
source venv/bin/activate

# Windows Command Prompt:
venv\Scripts\activate.bat

# Windows PowerShell:
venv\Scripts\Activate.ps1
```

#### 2. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# For development (includes testing and linting tools)
pip install -r requirements-dev.txt
```

#### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Key settings to update:
# - SECRET_KEY: Generate a secure random key for production
# - DATABASE_URL: Default is SQLite, can be changed to PostgreSQL later
# - CORS_ORIGINS: Update for your frontend URL in production
```

#### 4. Database Setup

The application uses SQLite by default, which requires no additional setup. The database file will be created automatically when the application starts.

For production, you may want to migrate to PostgreSQL:
```bash
# Example PostgreSQL URL format:
DATABASE_URL=postgresql://user:password@localhost/aims_db
```

#### 5. Running the Application

```bash
# Development mode with auto-reload
uvicorn src.api.main:app --reload

# Production mode
uvicorn src.api.main:app --host 0.0.0.0 --port 8002

# Using Python directly
python -m src.api.main
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src --cov-report=term-missing

# Run specific test file
pytest tests/test_health.py

# Run tests in watch mode
pytest-watch
```

### Code Quality

```bash
# Format code with black
black src tests

# Check formatting without changing files
black --check src tests

# Lint with flake8
flake8 src tests

# Type checking with mypy
mypy src

# Run all checks (useful before committing)
black src tests && flake8 src tests && mypy src && pytest
```

### Docker Setup (Optional)

Create a `Dockerfile` in the project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8002"]
```

Build and run:
```bash
docker build -t aims:latest .
docker run -p 8002:8002 --env-file .env aims:latest
```

### Troubleshooting

#### Common Issues

1. **ModuleNotFoundError**: Ensure you're in the project root and have activated the virtual environment
2. **Permission denied on Unix**: You may need to use `python3` instead of `python`
3. **WeasyPrint dependencies**: On some systems, WeasyPrint requires additional system packages:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install python3-cffi python3-brotli libpango-1.0-0 libpangoft2-1.0-0
   
   # macOS
   brew install pango
   ```

#### Getting Help

- Check the logs in the console for detailed error messages
- Ensure all dependencies are installed correctly
- Verify your Python version: `python --version`
- Check environment variables are loaded: Add a debug print in `src/core/config.py`

### Next Steps

After setup is complete:
1. Run the health check: `curl http://localhost:8002/api/health`
2. View API documentation: Open `http://localhost:8002/docs` in your browser
3. Run the test suite to ensure everything is working
4. Start implementing Phase 1 features as outlined in the PRD