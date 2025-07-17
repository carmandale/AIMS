import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  previous_close?: number;
  timestamp: string;
}

export interface MarketData {
  quotes: Record<string, Quote>;
  indices: Record<string, Quote>;
  crypto: Record<string, Quote>;
  timestamp: string;
}

export function useMarketQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ['market-quotes', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return {};
      const response = await api.market.getQuotes(symbols);
      return response.data as Record<string, Quote>;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    enabled: symbols.length > 0,
  });
}

export function useMarketIndices() {
  return useQuery({
    queryKey: ['market-indices'],
    queryFn: async () => {
      const response = await api.market.getIndices();
      return response.data as Record<string, Quote>;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useCryptoQuotes() {
  return useQuery({
    queryKey: ['crypto-quotes'],
    queryFn: async () => {
      const response = await api.market.getCrypto();
      return response.data as Record<string, Quote>;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
