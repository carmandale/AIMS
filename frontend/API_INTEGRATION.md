# AIMS Frontend API Integration

This document describes the API integration setup for the AIMS frontend.

## Overview

The AIMS frontend is now configured with:

- Axios for HTTP requests
- TanStack Query (React Query) for data fetching and caching
- Real-time data connections to the FastAPI backend
- All 5 MagicPath components adapted for live data

## Project Structure

```
frontend-aims/
├── src/
│   ├── lib/
│   │   └── api-client.ts        # Axios API client configuration
│   ├── hooks/
│   │   ├── index.ts             # Hook exports
│   │   ├── use-morning-brief.ts # Morning brief data hooks
│   │   ├── use-portfolio.ts     # Portfolio data hooks
│   │   └── use-market.ts        # Market data hooks
│   ├── components/
│   │   ├── MorningBriefCard.tsx # Morning brief component
│   │   ├── IncomeGoalTracker.tsx # Income tracker component
│   │   ├── WeeklyTasks.tsx      # Task checklist component
│   │   ├── TradeTicketForm.tsx  # Trade ticket component
│   │   └── generated/           # Original dashboard components
│   └── App.tsx                  # Main app with routing
```

## API Client Configuration

The API client is configured in `src/lib/api-client.ts`:

- Base URL: `http://localhost:${API_PORT:-8002}` (configurable via API_PORT environment variable)
- Automatic token management
- Request/response interceptors
- Organized endpoints by feature

## React Query Setup

TanStack Query is configured with:

- Automatic retries (3 attempts)
- Stale time: 1 minute
- Cache time: 5 minutes
- Real-time refetching intervals

## Available Hooks

### Morning Brief

- `useMorningBrief(date?)` - Fetch morning brief data
- `useGenerateMorningBrief()` - Generate new morning brief
- `useVolatilityAlerts()` - Get volatility alerts

### Portfolio

- `usePortfolioSummary()` - Get portfolio summary
- `usePositions(broker?)` - Get positions
- `useBalances()` - Get account balances
- `useTransactions(days?, broker?)` - Get transactions
- `useWeeklyPerformance()` - Get weekly performance data
- `useRefreshPortfolio()` - Force refresh portfolio data

### Market Data

- `useMarketQuotes(symbols[])` - Get real-time quotes
- `useMarketIndices()` - Get market indices
- `useCryptoQuotes()` - Get crypto quotes

## Testing the API Connection

To test the API connection:

```bash
# Make sure the backend is running
cd /path/to/AIMS
python -m src.api.main

# In another terminal, run the frontend test
cd frontend-aims
yarn test-api
```

## Running the Frontend

```bash
cd frontend-aims
yarn dev
```

The frontend will be available at `http://localhost:5173`

## Navigation

The app includes a navigation bar with links to all 5 components:

1. Dashboard - Main AIMS dashboard
2. Morning Brief - Daily portfolio overview
3. Income Tracker - Weekly/monthly income goals
4. Tasks - Weekly task checklist
5. Trade Ticket - Trade execution form

## Features

- **Real-time Data**: All components connect to live backend data
- **Auto-refresh**: Data automatically refreshes at configured intervals
- **Error Handling**: Graceful error states and retry logic
- **Loading States**: Smooth loading indicators
- **Responsive Design**: Works on desktop and mobile

## Environment Variables

The API URL can be configured via environment variable:

```bash
VITE_API_URL=http://localhost:8002
```

## Next Steps

1. Add authentication flow
2. Implement WebSocket connections for real-time updates
3. Add data visualization enhancements
4. Implement trade execution logic
5. Add notification system
