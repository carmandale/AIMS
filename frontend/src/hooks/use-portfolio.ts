/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface Position {
  id?: number;
  broker: string;
  symbol: string;
  name?: string;
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
      queryClient.invalidateQueries({ queryKey: ['performance-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['risk-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['asset-allocation'] });
    },
  });
}

// New hooks for advanced portfolio analytics

export interface PerformanceMetrics {
  timeframe: string;
  start_date: string;
  end_date: string;
  starting_value: number;
  ending_value: number;
  absolute_change: number;
  percent_change: number;
  annualized_return?: number;
  volatility?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  benchmark_comparison?: Record<string, any>;
  periodic_returns: Record<string, number>;
}

export interface RiskMetrics {
  volatility: number;
  sharpe_ratio: number;
  sortino_ratio?: number;
  max_drawdown: number;
  max_drawdown_start?: string;
  max_drawdown_end?: string;
  beta?: number;
  alpha?: number;
  r_squared?: number;
  var_95?: number;
  var_99?: number;
}

export interface AssetAllocation {
  by_asset_class: Record<string, number>;
  by_sector: Record<string, number>;
  by_geography: Record<string, number>;
  by_brokerage: Record<string, number>;
  concentration_risks: Array<Record<string, any>>;
  diversification_score?: number;
  largest_position_percent?: number;
  top_5_positions_percent?: number;
}

export function usePerformanceMetrics(userId: string, timeframe = 'ytd', benchmark?: string) {
  return useQuery({
    queryKey: ['performance-metrics', userId, timeframe, benchmark],
    queryFn: async () => {
      const response = await api.portfolio.getPerformanceMetrics(userId, timeframe, benchmark);
      return response.data as PerformanceMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}

export function useRiskMetrics(userId: string, timeframe = 'ytd') {
  return useQuery({
    queryKey: ['risk-metrics', userId, timeframe],
    queryFn: async () => {
      const response = await api.portfolio.getRiskMetrics(userId, timeframe);
      return response.data as RiskMetrics;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
}

export function useAssetAllocation(userId: string) {
  return useQuery({
    queryKey: ['asset-allocation', userId],
    queryFn: async () => {
      const response = await api.portfolio.getAssetAllocation(userId);
      return response.data as AssetAllocation;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
}

export function useConcentrationAnalysis(userId: string) {
  return useQuery({
    queryKey: ['concentration-analysis', userId],
    queryFn: async () => {
      const response = await api.portfolio.getConcentrationAnalysis(userId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
}

export function usePositionRiskContributions(userId: string) {
  return useQuery({
    queryKey: ['position-risk-contributions', userId],
    queryFn: async () => {
      const response = await api.portfolio.getPositionRiskContributions(userId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
}

export function useCorrelationMatrix(userId: string) {
  return useQuery({
    queryKey: ['correlation-matrix', userId],
    queryFn: async () => {
      const response = await api.portfolio.getCorrelationMatrix(userId);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!userId,
  });
}

export function useRebalancingSuggestions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, targetAllocation, driftThreshold = 0.05 }: {
      userId: string;
      targetAllocation: Record<string, number>;
      driftThreshold?: number;
    }) => {
      const response = await api.portfolio.getRebalancingSuggestions(userId, targetAllocation, driftThreshold);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalancing-suggestions'] });
    },
  });
}

export function useStressTest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, scenarios }: {
      userId: string;
      scenarios?: Array<Record<string, any>>;
    }) => {
      const response = await api.portfolio.runStressTest(userId, scenarios || []);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stress-test'] });
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, reportType, parameters, format = 'pdf' }: {
      userId: string;
      reportType: string;
      parameters: Record<string, any>;
      format?: string;
    }) => {
      const response = await api.reports.generate(userId, reportType, parameters, format);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useReports(userId: string, reportType?: string) {
  return useQuery({
    queryKey: ['reports', userId, reportType],
    queryFn: async () => {
      const response = await api.reports.list(userId);
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
  });
}