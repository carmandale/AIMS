# Technical Stack

> Last Updated: 2025-01-27
> Version: 1.0.0

## Backend

- **Application Framework:** FastAPI
- **Database System:** SQLite (Phase 1), PostgreSQL (future)
- **ORM:** SQLAlchemy 2.0.31
- **Task Scheduler:** APScheduler
- **Package Manager:** uv (modern Python package manager)

## Frontend

- **JavaScript Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Import Strategy:** node
- **CSS Framework:** Tailwind CSS v4
- **UI Component Library:** Custom components (no external library)
- **State Management:** Zustand + React Query (TanStack Query)
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Animations:** Framer Motion

## External Services

- **Brokerage Integration:** SnapTrade SDK
- **Authentication:** JWT (PyJWT) + bcrypt
- **Rate Limiting:** SlowAPI
- **Report Generation:** WeasyPrint

## Infrastructure

- **Fonts Provider:** Local (Inter font)
- **Icon Library:** Lucide React
- **Application Hosting:** TBD (local development)
- **Database Hosting:** Local SQLite (production TBD)
- **Asset Hosting:** Vite static serving
- **Deployment Solution:** Docker (configured)
- **Code Repository URL:** https://github.com/dalecar/AIMS

## Development Tools

- **Testing Backend:** pytest + pytest-asyncio
- **Testing E2E:** Playwright
- **CI/CD:** GitHub Actions
- **Code Formatting:** Black (Python), Prettier (TypeScript)
- **Type Checking:** mypy (Python), TypeScript
- **Development Server:** FastAPI + Vite dev servers