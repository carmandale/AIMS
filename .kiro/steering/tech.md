# Technical Stack and Development Guidelines

## Tech Stack

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: SQLite
- **Package Manager**: uv (modern Python package manager)
- **Task Scheduler**: APScheduler
- **PDF Generation**: WeasyPrint

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query, Zustand
- **UI Components**: Custom components with Framer Motion animations
- **Form Handling**: React Hook Form with Zod validation

## Development Tools

- **Linting**: Ruff, Black, MyPy
- **Testing**: Pytest with pytest-asyncio
- **Coverage**: pytest-cov
- **CI/CD**: GitHub Actions

## Common Commands

### Backend

```bash
# Install dependencies
uv sync

# Install dev dependencies
uv sync --dev

# Run development server
uv run uvicorn src.api.main:app --reload

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=src

# Format code
uv run black .
uv run ruff check --fix .

# Type checking
uv run mypy src
```

### Frontend

```bash
# Install dependencies
cd frontend && yarn install

# Run development server
cd frontend && yarn dev

# Build for production
cd frontend && yarn build

# Lint code
cd frontend && yarn lint

# Format code
cd frontend && yarn format
```

## Code Style Guidelines

### Python
- Follow PEP 8 style guide
- Maximum line length: 100 characters
- Use type hints for all function parameters and return values
- Use async/await for database and external API operations
- Document all public functions and classes with docstrings

### TypeScript/React
- Use functional components with hooks
- Use TypeScript interfaces for props and state
- Follow component-based architecture
- Use React Query for API data fetching
- Prefer named exports over default exports

## API Conventions

- RESTful API design with resource-based URLs
- JSON response format with consistent structure
- Use Pydantic models for request/response validation
- API versioning in URL path (/api/v1/...)
- Comprehensive error responses with status codes and messages

## Testing Standards

- Minimum 80% code coverage for backend code
- Unit tests for all service methods
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Use pytest fixtures for test setup