export enum BrokerType {
  FIDELITY = 'fidelity',
  ROBINHOOD = 'robinhood',
  COINBASE = 'coinbase',
}

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
  DIVIDEND = 'dividend',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FEE = 'fee',
}

export interface Position {
  id?: number
  broker: BrokerType
  symbol: string
  quantity: number
  cost_basis: number
  current_price: number
  market_value?: number
  unrealized_pnl?: number
  unrealized_pnl_percent?: number
  position_type: 'stock' | 'option' | 'crypto'
  updated_at: string
}

export interface Balance {
  id?: number
  broker: BrokerType
  cash: number
  margin: number
  crypto: number
  total_value?: number
  buying_power?: number
  updated_at: string
}

export interface Transaction {
  id?: number
  broker: BrokerType
  type: TransactionType
  symbol?: string
  quantity?: number
  price?: number
  amount: number
  fees: number
  timestamp: string
  description?: string
}

export interface PortfolioSummary {
  total_value: number
  cash_buffer: number
  total_positions_value: number
  total_cash: number
  daily_pnl: number
  daily_pnl_percent: number
  weekly_pnl: number
  weekly_pnl_percent: number
  positions: Position[]
  balances: Balance[]
  last_updated: string
  cash_buffer_percent?: number
}

export interface VolatilityAlert {
  symbol: string
  current_price: number
  change_percent: number
  threshold_exceeded: number
  alert_type: 'gain' | 'loss' | 'volatility'
  message: string
  severity: 'low' | 'medium' | 'high'
  timestamp: string
}

export interface KeyPosition {
  symbol: string
  broker: string
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_percent: number
  overnight_change: number
  overnight_change_percent: number
}

export interface MorningBrief {
  date: string
  portfolio_value: number
  overnight_pnl: number
  overnight_pnl_percent: number
  cash_available: number
  volatility_alerts: VolatilityAlert[]
  key_positions: KeyPosition[]
  market_summary: Record<string, any>
  recommendations: string[]
  created_at: string
}

export interface Quote {
  symbol: string
  price: number
  change: number
  change_percent: number
  volume: number
  bid?: number
  ask?: number
  high?: number
  low?: number
  open?: number
  previous_close?: number
  timestamp: string
}

export interface WeeklyPerformance {
  data: Array<{
    date: string
    value: number
    pnl: number
  }>
  summary: {
    start_value: number
    end_value: number
    total_pnl: number
    pnl_percent: number
  }
}