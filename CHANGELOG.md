# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Missing dependencies: `pyjwt` and `bcrypt` to pyproject.toml
- Database initialization step to README.md
- Alternative manual server startup instructions to README.md

### Fixed
- `start_dev.sh` script now uses correct frontend port (5173 instead of 3000)
- `start_dev.sh` script now checks correct health endpoint (`/api/health` instead of `/health`)
- Backend server startup issues due to missing authentication dependencies

### Changed
- README.md now recommends using `./scripts/start_dev.sh` for development
- Simplified development setup process with single command startup

### Security
- Added proper JWT authentication dependencies
- Added bcrypt for password hashing support

## [0.1.0] - 2025-07-20
## [0.1.1] - 2025-08-10

### Added
- `no_auth_client` test fixture to support unauthorized endpoint tests without global auth overrides
- Dynamic period support for performance metrics (e.g., `31D`)

### Changed
- Performance API now returns 200 with an empty dataset when no data is available (instead of 404)
- Hardened performance metrics to handle single-snapshot periods and empty time ranges
- Standardized integration tests to use shared fixtures for DB/auth to avoid flakiness

### Fixed
- SnapTrade integration tests respect `.env` credentials and no longer skip unexpectedly
- Monthly reports API tests now seed data correctly and pass
- Stabilized performance tests producing time series and metrics consistently across periods

### Test Results
- Backend: 213 passed, 19 skipped, 0 failed


### Added
- Initial release with Phase 1 features complete
- Weekly Task Management system
- Next Actions Dashboard
- Trade Ticket Builder
- Morning Brief System
- Portfolio Tracking with SnapTrade integration
- Compliance Reporting