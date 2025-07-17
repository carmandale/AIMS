# Project Structure and Organization

## Directory Structure

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
├── tests/                 # Test suite
│   └── test_tasks/        # Task management tests
├── .kiro/                 # Kiro specifications and steering
│   ├── specs/             # Feature specifications
│   └── steering/          # Steering documents
```

## Key Architecture Patterns

### Backend Architecture

1. **Layered Architecture**
   - API Layer (FastAPI routes)
   - Service Layer (Business logic)
   - Data Access Layer (SQLAlchemy models)

2. **Dependency Injection**
   - FastAPI dependency system for database sessions
   - Service classes injected where needed

3. **Repository Pattern**
   - Data access through service classes
   - Abstraction over database operations

4. **Task Management System**
   - RRULE-based task scheduling
   - Template-based task generation
   - Compliance checking for blocking tasks

### Frontend Architecture

1. **Component-Based Structure**
   - Functional React components
   - Custom hooks for shared logic
   - Composition over inheritance

2. **API Integration**
   - Centralized API client
   - React Query for data fetching and caching
   - TypeScript interfaces matching backend schemas

3. **State Management**
   - React Query for server state
   - Zustand for UI state
   - Component-local state with useState

## Module Responsibilities

### Backend Modules

- **api/routes/**: HTTP endpoints and request handling
- **api/schemas/**: Request/response data validation
- **core/config.py**: Environment and application configuration
- **db/models.py**: Database schema definitions
- **db/session.py**: Database connection management
- **data/fetchers/**: External API integrations
- **data/models/**: Domain model definitions
- **services/**: Business logic implementation

### Frontend Modules

- **components/**: UI components and pages
- **hooks/**: Custom React hooks
- **lib/api-client.ts**: API client and request handling
- **lib/utils.ts**: Utility functions
- **settings/**: Theme and global configuration

## Naming Conventions

### Backend

- **Files**: snake_case (e.g., task_service.py)
- **Classes**: PascalCase (e.g., TaskService)
- **Functions/Methods**: snake_case (e.g., get_task_templates)
- **Variables**: snake_case (e.g., task_instance)
- **Constants**: UPPER_SNAKE_CASE (e.g., DEFAULT_TIMEOUT)

### Frontend

- **Files**: PascalCase for components (e.g., TaskList.tsx)
- **Files**: kebab-case for utilities (e.g., api-client.ts)
- **Components**: PascalCase (e.g., TaskCard)
- **Functions**: camelCase (e.g., fetchTasks)
- **Variables**: camelCase (e.g., taskList)
- **Interfaces/Types**: PascalCase with prefix (e.g., ITask, TTaskProps)

## Database Schema

Key tables and relationships:

- **task_templates**: Templates for recurring tasks
- **task_instances**: Individual task occurrences
- **task_audit_log**: History of task status changes

## API Structure

RESTful API endpoints organized by resource:

- **/api/health**: Health check endpoint
- **/api/tasks**: Task management endpoints
- **/api/portfolio**: Portfolio data endpoints
- **/api/market**: Market data endpoints
- **/api/morning-brief**: Morning brief endpoints