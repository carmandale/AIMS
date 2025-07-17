# TypeScript Errors Blocking CI

## Summary
The Portfolio Tracking feature has TypeScript errors that need to be fixed for CI to pass.

## Frontend TypeScript Errors

### 1. Missing Properties on Types
- `Position` type missing `name` property (HoldingsTable.tsx:67)
- `MorningBrief` type missing `alerts` property (MorningBriefCard.tsx:67)

### 2. API Client Method Mismatches
The `use-portfolio.ts` hook is calling methods that don't exist in the API client:
- `api.portfolio.getPerformanceMetrics` 
- `api.portfolio.getRiskMetrics`
- `api.portfolio.getAssetAllocation`
- `api.portfolio.getConcentrationAnalysis`
- `api.portfolio.getPositionRiskContributions`
- `api.portfolio.getCorrelationMatrix`
- `api.portfolio.getRebalancingSuggestions`
- `api.portfolio.runStressTest`
- `api.reports` (entire namespace missing)

### 3. Type Issues in PerformanceChart.tsx
- Array type inference issues causing "never" type errors
- Need to properly type the `alerts` array

## Backend mypy Errors
- 175 type annotation errors
- Missing return type annotations
- Incompatible types in function arguments
- SQLAlchemy Base class type issues

## Quick Fix Options

### Option 1: Disable TypeScript strict checking temporarily
Add to `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": false,
    "skipLibCheck": true
  }
}
```

### Option 2: Add missing API methods
Update the api-client to match what the components expect.

### Option 3: Fix type definitions
Update the type definitions to match the actual data structure.

## Recommendation
Since these are from a large feature merge, create a follow-up PR to properly fix all TypeScript issues rather than blocking main branch CI.