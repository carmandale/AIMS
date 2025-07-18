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

## Security Guidelines

### Authentication & Authorization
- Never trust client-provided user identifiers
- Use JWT tokens or session-based authentication for stateless APIs
- Implement proper RBAC for multi-user scenarios
- Get user context from authenticated sessions, not query parameters
- Validate all inputs with Pydantic models

### API Security
- Rate limiting on all endpoints (not just refresh)
- Input sanitization and validation for all user inputs
- Proper error handling that doesn't leak sensitive information
- HTTPS only in production environments
- Secure headers (CORS, CSP, etc.)

### Development Security
- Security review required for all auth-related changes
- No hardcoded secrets or API keys in code
- Environment-based configuration management
- Regular dependency updates and vulnerability scanning
- Use secure coding practices (OWASP guidelines)

### Data Protection
- Encrypt sensitive data at rest
- Use secure communication channels
- Implement proper session management
- Log security events for audit trails

## Development Workflow

### Code Review Process
1. All changes must be submitted via Pull Request
2. Security-related changes require additional security review
3. Breaking changes require migration plan and documentation
4. All tests must pass before merge
5. Code must meet style guidelines (Black, Ruff, MyPy)

### Security Review Checklist
For any changes involving authentication, authorization, or sensitive data:
- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented with Pydantic models
- [ ] Authentication/authorization properly implemented
- [ ] Rate limiting considered and implemented where needed
- [ ] Error handling doesn't leak sensitive information
- [ ] Security implications documented and reviewed

### Quality Gates
- [ ] All tests pass (minimum 80% coverage)
- [ ] Code style checks pass (Black, Ruff)
- [ ] Type checking passes (MyPy)
- [ ] No security vulnerabilities in dependencies
- [ ] Documentation updated for new features

### Branch Protection
- Main branch requires PR review
- No direct commits to main branch
- CI checks must pass before merge
- Security-sensitive changes require additional approval

### Deployment Process
- Staging deployment for testing
- Security review for production deployments
- Database migration strategy for schema changes
- Rollback plan documented for major changes

## Testing Standards

- Minimum 80% code coverage for backend code
- Unit tests for all service methods
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Use pytest fixtures for test setup
