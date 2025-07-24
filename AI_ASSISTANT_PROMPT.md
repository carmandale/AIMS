# AI Assistant Prompt for AIMS Development

## Project Context
You are working on AIMS (Automated Investment Management System), a FastAPI/React application for portfolio management with SnapTrade integration. The project is at a critical juncture where core functionality is complete but needs authentication and production readiness.

## Current State
- **Backend**: FastAPI with SQLAlchemy, working SnapTrade integration
- **Frontend**: React 19 with TypeScript, Tailwind CSS
- **Database**: SQLite (development)
- **Testing**: Playwright E2E tests set up, 83/96 backend tests passing
- **Branch**: feature/local-dev-setup-issue-52

## Your Primary Mission
Implement a complete authentication system to replace the temporary hardcoded token currently in `frontend/src/lib/api-client.ts`.

## Immediate Tasks (in order)

### 1. Integrate Auth UI Components
- **Auth UI Available**: Complete UI components exist in `magic-path/auth-forms/src/components/generated/`
  - `LoginForm.tsx`: Full login form with email/password validation, remember me, forgot password, social login buttons
  - `SignupForm.tsx`: Complete signup with name/email/password, confirm password, strength indicator, terms checkbox, social signup
  - `AuthLayout.tsx`: Combined login/signup view with toggle animation (currently uses mock auth)
- **Task**: Copy these components to `frontend/src/components/auth/` and integrate with backend
- **Key Integration Points**:
  - Components accept `onSubmit` callbacks - connect to your API calls
  - Remove mock token storage from AuthLayout (lines 71-72)
  - Social login buttons are UI-only - implement or hide them
  - Forms already match dark theme and have proper validation

### 2. Add Authentication State Management
- **Create**: Authentication infrastructure (not provided in UI components)
  - `AuthProvider.tsx`: Context for auth state management
  - `ProtectedRoute.tsx`: Route wrapper for authenticated pages
  - `useAuth.tsx`: Hook for accessing auth state
- **Update**: `frontend/src/App.tsx`
  - Add Login/Signup to the component routing system
  - Wrap app with AuthProvider
  - Use ProtectedRoute for authenticated pages
- **Default**: Redirect unauthenticated users to login

### 3. Connect to Backend Auth Endpoints
- **Endpoints exist**: 
  - POST `/api/auth/register` 
  - POST `/api/auth/login`
- **Update**: `frontend/src/lib/api-client.ts`
- **Remove**: Hardcoded token (lines 24-27)
- **Add**: Proper auth methods using the existing api structure

### 4. Fix Critical Bug (Issue #53)
- **Problem**: Decimal validation errors in portfolio service
- **Location**: `src/services/portfolio.py` or scheduler
- **Error**: PnL values have too many decimal places
- **Fix**: Round to 2 decimal places before creating PortfolioSummary

## Key Files to Review First
1. `frontend/src/lib/api-client.ts` - See auth token hack to remove
2. `frontend/src/App.tsx` - Understand routing pattern
3. `frontend/src/components/Home.tsx` - UI style reference
4. `src/api/routes/auth.py` - Backend auth endpoints
5. `src/api/schemas/portfolio.py` - Auth schemas
6. `magic-path/auth-forms/src/components/generated/` - Pre-built auth UI components

## Testing Your Work
```bash
# Start backend
cd /Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/AIMS
./scripts/start_backend.sh

# Start frontend (new terminal)
./scripts/start_frontend.sh

# Run E2E tests (new terminal)
cd e2e-tests
npm test
```

## Success Criteria
1. Users can sign up with email/password
2. Users can log in and receive JWT token
3. Token persists in localStorage
4. Unauthenticated users redirected to login
5. No more hardcoded auth token
6. All existing features still work
7. Decimal validation errors fixed

## DO NOT
- Change the SnapTrade integration
- Modify the database schema without migration
- Break existing E2E tests
- Add new dependencies without justification
- Create overly complex auth flows

## Current Open Issues
- #53: Decimal validation errors (fix this)
- #54: Production readiness roadmap (for reference)

## Git Workflow
```bash
# You're on feature/local-dev-setup-issue-52
git add -A
git commit -m "feat: Add authentication system

- Add login/signup components
- Implement auth routing
- Remove hardcoded token
- Fix decimal validation errors (#53)

Co-Authored-By: AI Assistant <ai@assistant.com>"
```

## Available Auth UI Components Summary
The `magic-path/auth-forms/` directory contains production-ready auth UI components:

- **LoginForm.tsx**: 
  - Email/password fields with validation
  - Show/hide password toggle
  - Remember me checkbox
  - Forgot password link (UI only)
  - Google/GitHub social login buttons (UI only)
  - Loading states and error display
  - Accepts `onSubmit(email, password)` callback

- **SignupForm.tsx**:
  - Full name, email, password, confirm password fields
  - Real-time password strength indicator
  - Terms and conditions checkbox
  - Form validation with error messages
  - Social signup buttons (UI only)
  - Accepts `onSubmit(email, password, name)` callback

- **AuthLayout.tsx**:
  - Combined login/signup with animated toggle
  - Self-contained but uses mock auth (lines 71-72)
  - Beautiful dark theme design
  - Can be used as reference or adapted

## Questions to Answer Before Starting
1. Have you run the app locally to understand the current flow?
2. Have you identified where the hardcoded token is used?
3. Do you understand the existing routing pattern in App.tsx?
4. Have you reviewed the backend auth endpoints?
5. Have you examined the provided auth UI components?

Start by copying the auth components, then focus on the integration layer (AuthProvider, API calls). Good luck!