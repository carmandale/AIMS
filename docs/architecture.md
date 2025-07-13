# AIMS Architecture Overview

## Project Structure

```
AIMS/
├── src/                    # Backend (FastAPI)
│   ├── api/               # API endpoints
│   │   ├── routes/        # Route handlers
│   │   └── main.py        # FastAPI app
│   ├── core/              # Core configuration
│   ├── data/              # Data layer
│   │   ├── fetchers/      # Broker data fetchers
│   │   ├── models/        # Pydantic models
│   │   └── cache.py       # Caching logic
│   ├── db/                # Database
│   │   ├── models.py      # SQLAlchemy models
│   │   └── session.py     # DB session management
│   └── services/          # Business logic
├── frontend/              # Frontend (Next.js 15)
│   ├── app/              # App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities and API client
│   ├── types/            # TypeScript types
│   └── hooks/            # Custom React hooks
├── pyproject.toml        # Python dependencies (uv)
└── docker-compose.yml    # Development environment
```

## Tech Stack

### Backend
- **Python 3.12+** with modern async/await
- **FastAPI** for REST APIs
- **SQLAlchemy 2.0** with async support
- **Pydantic v2** for data validation
- **APScheduler** for cron jobs
- **uv** for package management

### Frontend
- **Next.js 15** with App Router
- **React 19.1** with Server Components
- **TypeScript 5+** for type safety
- **Tailwind CSS v3** for styling
- **TanStack Query 5** for data fetching
- **shadcn/ui** components

## Key Design Decisions

### 1. Server Components First
The dashboard is built primarily with React Server Components, fetching data directly on the server for better performance and SEO.

### 2. Mock Data Strategy
- **Fidelity**: Traditional stocks/ETFs
- **Robinhood**: Mix of stocks and options
- **Coinbase**: Cryptocurrency holdings

### 3. Caching Strategy
- In-memory caching with SQLite
- 1-hour cache for portfolio summary
- 24-hour cache for daily data
- Manual refresh available

### 4. Security
- Rate limiting on sensitive endpoints
- CORS configured for production
- Environment-based configuration

## API Endpoints

### Portfolio Management
- `GET /api/portfolio/summary` - Overall portfolio data
- `GET /api/portfolio/positions` - All positions
- `GET /api/portfolio/balances` - Cash balances
- `GET /api/portfolio/transactions` - Recent transactions
- `POST /api/portfolio/refresh` - Force data refresh

### Morning Brief
- `GET /api/morning-brief` - Daily brief
- `POST /api/morning-brief/generate` - Generate new brief
- `GET /api/morning-brief/alerts` - Volatility alerts

### Market Data
- `GET /api/market/quotes` - Real-time quotes
- `GET /api/market/indices` - Market indices
- `GET /api/market/crypto` - Crypto prices

## Data Flow

1. **Scheduled Tasks**: APScheduler triggers data fetches
2. **Data Fetchers**: Mock fetchers simulate broker APIs
3. **Database**: SQLite stores positions and history
4. **API Layer**: FastAPI serves cached data
5. **Frontend**: Next.js renders with Server Components
6. **Client Updates**: React Query manages client state

## Future Enhancements

### Phase 2
- Real broker API integration (SnapTrade, ccxt)
- WebSocket support for real-time updates
- Advanced charting with TradingView
- Mobile app with React Native

### Phase 3
- ML-based trade recommendations
- Automated trade execution
- Multi-user support with auth
- Cloud deployment (AWS/GCP)