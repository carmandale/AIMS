import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface Position {
  id?: number;
  broker: string;
  symbol: string;
  quantity: number;
  cost_basis: number;
  current_price: number;
  market_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
  position_type: string;
  updated_at: string;
}

export interface Balance {
  id?: number;
  broker: string;
  cash: number;
  margin: number;
  crypto: number;
  total_value?: number;
  buying_power?: number;
  updated_at: string;
}

export interface Transaction {
  id?: number;
  broker: string;
  type: string;
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fees: number;
  timestamp: string;
  description?: string;
}

export interface PortfolioSummary {
  total_value: number;
  cash_buffer: number;
  total_positions_value: number;
  total_cash: number;
  daily_pnl: number;
  daily_pnl_percent: number;
  weekly_pnl: number;
  weekly_pnl_percent: number;
  positions: Position[];
  balances: Balance[];
  last_updated: string;
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const response = await api.portfolio.getSummary();
      return response.data as PortfolioSummary;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

export function usePositions(broker?: string) {
  return useQuery({
    queryKey: ['positions', broker],
    queryFn: async () => {
      const response = await api.portfolio.getPositions(broker);
      return response.data as Position[];
    },
    staleTime: 1 * 60 * 1000,
  });
}

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const response = await api.portfolio.getBalances();
      return response.data as Balance[];
    },
    staleTime: 1 * 60 * 1000,
  });
}

export function useTransactions(days = 7, broker?: string) {
  return useQuery({
    queryKey: ['transactions', days, broker],
    queryFn: async () => {
      const response = await api.portfolio.getTransactions(days, broker);
      return response.data as Transaction[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyPerformance() {
  return useQuery({
    queryKey: ['weekly-performance'],
    queryFn: async () => {
      const response = await api.portfolio.getWeeklyPerformance();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshPortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.portfolio.refresh();
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all portfolio queries
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-performance'] });
    },
  });
}