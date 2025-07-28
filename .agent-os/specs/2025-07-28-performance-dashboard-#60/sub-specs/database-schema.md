# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-28-performance-dashboard-#60/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Changes

### New Tables

#### performance_snapshots
Stores daily portfolio performance snapshots for historical analysis.

```sql
CREATE TABLE performance_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    portfolio_value DECIMAL(12, 2) NOT NULL,
    daily_return DECIMAL(8, 6),
    cumulative_return DECIMAL(8, 6),
    cash_flows DECIMAL(12, 2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_performance_snapshots_user_date ON performance_snapshots(user_id, snapshot_date);
CREATE INDEX idx_performance_snapshots_date ON performance_snapshots(snapshot_date);
```

#### benchmark_configs
Stores user-defined benchmark configurations for performance comparison.

```sql
CREATE TABLE benchmark_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    allocation DECIMAL(5, 4) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_benchmark_configs_user ON benchmark_configs(user_id);
CREATE INDEX idx_benchmark_configs_active ON benchmark_configs(user_id, is_active);
```

#### benchmark_data
Caches benchmark price data to minimize external API calls.

```sql
CREATE TABLE benchmark_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10, 4) NOT NULL,
    daily_return DECIMAL(8, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);

CREATE INDEX idx_benchmark_data_symbol_date ON benchmark_data(symbol, date);
CREATE INDEX idx_benchmark_data_date ON benchmark_data(date);
```

### New Columns

#### users table
Add performance calculation preferences to existing users table.

```sql
ALTER TABLE users ADD COLUMN risk_free_rate DECIMAL(6, 4) DEFAULT 0.0475;
ALTER TABLE users ADD COLUMN default_benchmark VARCHAR(10) DEFAULT 'SPY';
ALTER TABLE users ADD COLUMN performance_calculation_method VARCHAR(20) DEFAULT 'time_weighted';
```

### Modifications

#### positions table
Ensure positions table has necessary fields for performance calculations.

```sql
-- Verify these columns exist (should be from existing schema)
-- If missing, add them:
ALTER TABLE positions ADD COLUMN IF NOT EXISTS market_value DECIMAL(12, 2);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS previous_close DECIMAL(10, 4);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS unrealized_pl DECIMAL(12, 2);
```

## Migrations

### Migration: Add Performance Tracking Tables

```python
"""Add performance tracking tables

Revision ID: perf_001
Revises: [previous_migration]
Create Date: 2025-07-28

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create performance_snapshots table
    op.create_table(
        'performance_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('portfolio_value', sa.DECIMAL(12, 2), nullable=False),
        sa.Column('daily_return', sa.DECIMAL(8, 6), nullable=True),
        sa.Column('cumulative_return', sa.DECIMAL(8, 6), nullable=True),
        sa.Column('cash_flows', sa.DECIMAL(12, 2), default=0.0),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.UniqueConstraint('user_id', 'snapshot_date')
    )
    
    # Create indexes
    op.create_index('idx_performance_snapshots_user_date', 'performance_snapshots', ['user_id', 'snapshot_date'])
    op.create_index('idx_performance_snapshots_date', 'performance_snapshots', ['snapshot_date'])
    
    # Create benchmark_configs table
    op.create_table(
        'benchmark_configs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.VARCHAR(10), nullable=False),
        sa.Column('name', sa.VARCHAR(100), nullable=False),
        sa.Column('allocation', sa.DECIMAL(5, 4), default=1.0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    
    # Create benchmark_data table
    op.create_table(
        'benchmark_data',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('symbol', sa.VARCHAR(10), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('price', sa.DECIMAL(10, 4), nullable=False),
        sa.Column('daily_return', sa.DECIMAL(8, 6), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.UniqueConstraint('symbol', 'date')
    )
    
    # Add user preference columns
    op.add_column('users', sa.Column('risk_free_rate', sa.DECIMAL(6, 4), default=0.0475))
    op.add_column('users', sa.Column('default_benchmark', sa.VARCHAR(10), default='SPY'))
    op.add_column('users', sa.Column('performance_calculation_method', sa.VARCHAR(20), default='time_weighted'))

def downgrade():
    # Remove user columns
    op.drop_column('users', 'performance_calculation_method')
    op.drop_column('users', 'default_benchmark')
    op.drop_column('users', 'risk_free_rate')
    
    # Drop tables
    op.drop_table('benchmark_data')
    op.drop_table('benchmark_configs')
    op.drop_table('performance_snapshots')
```

## Rationale

### Performance Snapshots Table
- **Purpose:** Store daily portfolio values for accurate historical performance calculation
- **Performance Consideration:** Daily snapshots enable fast time-series queries without recalculating from positions
- **Data Integrity:** Unique constraint on user_id + snapshot_date prevents duplicate records

### Benchmark Configuration
- **Purpose:** Allow users to customize benchmark comparisons beyond S&P 500
- **Flexibility:** Support for multiple benchmarks with allocation weights
- **Data Integrity:** Foreign key to users ensures benchmark configs are user-specific

### Benchmark Data Caching
- **Purpose:** Cache external benchmark price data to reduce API calls and improve performance
- **Efficiency:** Local storage of benchmark prices eliminates repeated external API calls
- **Data Freshness:** Created_at timestamp helps manage cache invalidation strategies

### User Preference Columns
- **Purpose:** Store user-specific calculation preferences (risk-free rate, default benchmark)
- **Customization:** Enable personalized performance calculations
- **Defaults:** Sensible defaults (4.75% risk-free rate, SPY benchmark) work for most users