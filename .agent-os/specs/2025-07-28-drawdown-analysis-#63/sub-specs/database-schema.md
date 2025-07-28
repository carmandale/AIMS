# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-28-drawdown-analysis-#63/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Changes

### Extend existing performance_snapshots table

Add new columns to the existing `performance_snapshots` table to store drawdown metrics:

```sql
-- New columns to add to performance_snapshots table
ALTER TABLE performance_snapshots ADD COLUMN portfolio_high_water_mark NUMERIC(20, 2);
ALTER TABLE performance_snapshots ADD COLUMN current_drawdown NUMERIC(20, 2);
ALTER TABLE performance_snapshots ADD COLUMN current_drawdown_percent NUMERIC(10, 4);
ALTER TABLE performance_snapshots ADD COLUMN max_drawdown NUMERIC(20, 2);
ALTER TABLE performance_snapshots ADD COLUMN max_drawdown_percent NUMERIC(10, 4);
ALTER TABLE performance_snapshots ADD COLUMN days_in_drawdown INTEGER;
```

### New drawdown_events table

Create a new table to track individual drawdown events for detailed historical analysis:

```sql
CREATE TABLE drawdown_events (
    id INTEGER PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    peak_value NUMERIC(20, 2) NOT NULL,
    trough_value NUMERIC(20, 2),
    recovery_value NUMERIC(20, 2),
    max_drawdown_amount NUMERIC(20, 2),
    max_drawdown_percent NUMERIC(10, 4),
    duration_days INTEGER,
    recovery_days INTEGER,
    is_recovered BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_drawdown_events_user_date (user_id, start_date)
);
```

## Specifications

### SQLAlchemy Model Extensions

**PerformanceSnapshot model additions:**
```python
# Add to existing PerformanceSnapshot class
portfolio_high_water_mark = Column(Numeric(20, 2), nullable=True)
current_drawdown = Column(Numeric(20, 2), nullable=True)
current_drawdown_percent = Column(Numeric(10, 4), nullable=True)
max_drawdown = Column(Numeric(20, 2), nullable=True)
max_drawdown_percent = Column(Numeric(10, 4), nullable=True)
days_in_drawdown = Column(Integer, nullable=True)
```

**New DrawdownEvent model:**
```python
class DrawdownEvent(Base):
    __tablename__ = "drawdown_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), ForeignKey("users.user_id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    peak_value = Column(Numeric(20, 2), nullable=False)
    trough_value = Column(Numeric(20, 2), nullable=True)
    recovery_value = Column(Numeric(20, 2), nullable=True)
    max_drawdown_amount = Column(Numeric(20, 2), nullable=True)
    max_drawdown_percent = Column(Numeric(10, 4), nullable=True)
    duration_days = Column(Integer, nullable=True)
    recovery_days = Column(Integer, nullable=True)
    is_recovered = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### Indexes and Constraints

- **Primary indexes**: Already exist on id fields
- **Foreign key constraints**: user_id references users.user_id
- **Composite index**: idx_drawdown_events_user_date for efficient querying by user and date range
- **Performance optimization**: Index on (user_id, start_date) for fast historical queries

## Rationale

**Extension of performance_snapshots:**
- Leverages existing daily snapshot infrastructure
- Provides historical tracking of drawdown metrics alongside other performance data
- Maintains data consistency with existing performance calculations

**Separate drawdown_events table:**
- Enables detailed analysis of individual drawdown periods
- Supports complex queries for drawdown duration and recovery analysis
- Allows for efficient storage of discrete drawdown events without data duplication

**Data integrity considerations:**
- All monetary values use NUMERIC(20, 2) for precision in financial calculations
- Percentage values use NUMERIC(10, 4) for accurate percentage storage
- Nullable recovery fields accommodate ongoing drawdown events