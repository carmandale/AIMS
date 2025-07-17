/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface VolatilityAlert {
  symbol: string;
  current_price: number;
  change_percent: number;
  threshold_exceeded: number;
  alert_type: string;
  message: string;
  severity: string;
  timestamp: string;
}

export interface KeyPosition {
  symbol: string;
  broker: string;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  overnight_change: number;
  overnight_change_percent: number;
}

export interface MarketSummary {
  indices: {
    symbol: string;
    name: string;
    current_price: number;
    change: number;
    change_percent: number;
  }[];
  crypto: {
    symbol: string;
    name: string;
    current_price: number;
    change: number;
    change_percent: number;
  }[];
  economic_events: {
    event: string;
    time: string;
    impact: 'low' | 'medium' | 'high';
    description?: string;
  }[];
}

export interface MorningBrief {
  date: string;
  portfolio_value: number;
  overnight_pnl: number;
  overnight_pnl_percent: number;
  cash_available: number;
  volatility_alerts: VolatilityAlert[];
  key_positions: KeyPosition[];
  market_summary: MarketSummary;
  recommendations: string[];
  created_at: string;
}

export function useMorningBrief(date?: string) {
  return useQuery({
    queryKey: ['morning-brief', date],
    queryFn: async () => {
      const response = await api.morningBrief.get(date);
      return response.data as MorningBrief;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useGenerateMorningBrief() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.morningBrief.generate();
      return response.data;
    },
    onSuccess: () => {
      // Invalidate morning brief queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['morning-brief'] });
    },
  });
}

export function useVolatilityAlerts() {
  return useQuery({
    queryKey: ['volatility-alerts'],
    queryFn: async () => {
      const response = await api.morningBrief.getAlerts();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}