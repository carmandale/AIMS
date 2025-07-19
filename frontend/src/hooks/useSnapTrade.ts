/**
 * React Query hooks for SnapTrade data fetching and mutations
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import type {
  UseSnapTradeRegistration,
  UseSnapTradeConnection,
  UseSnapTradeAccounts,
  UseSnapTradePositions,
  UseSnapTradeBalances,
  UseSnapTradeTransactions,
  SnapTradeRegistrationState,
  SnapTradeConnectionState
} from '../types/snaptrade';

// Query Keys
export const snapTradeKeys = {
  all: ['snaptrade'] as const,
  accounts: () => [...snapTradeKeys.all, 'accounts'] as const,
  positions: (accountId: string) => [...snapTradeKeys.all, 'positions', accountId] as const,
  balances: (accountId: string) => [...snapTradeKeys.all, 'balances', accountId] as const,
  transactions: (startDate?: string, endDate?: string) => 
    [...snapTradeKeys.all, 'transactions', { startDate, endDate }] as const,
};

/**
 * Hook for SnapTrade user registration
 */
export function useSnapTradeRegistration(): UseSnapTradeRegistration {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await api.snaptrade.register();
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Successfully registered with SnapTrade!');
      // Invalidate accounts query to refresh status
      queryClient.invalidateQueries({ queryKey: snapTradeKeys.accounts() });
    },
    onError: (error: Error) => {
      const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail || error.message || 'Registration failed';
      toast.error(`Registration failed: ${errorMessage}`);
    }
  });

  const state: SnapTradeRegistrationState = {
    status: mutation.isPending ? 'loading' : 
            mutation.isSuccess ? 'success' : 
            mutation.isError ? 'error' : 'idle',
    error: mutation.error?.message
  };

  return {
    register: mutation.mutate,
    state,
    isLoading: mutation.isPending
  };
}

/**
 * Hook for SnapTrade account connection
 */
export function useSnapTradeConnection(): UseSnapTradeConnection {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await api.snaptrade.getConnectionUrl();
      return response.data.connection_url;
    },
    onSuccess: () => {
      // Invalidate accounts query after connection
      queryClient.invalidateQueries({ queryKey: snapTradeKeys.accounts() });
    },
    onError: (error: Error) => {
      const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail || error.message || 'Failed to get connection URL';
      toast.error(`Connection failed: ${errorMessage}`);
    }
  });

  const state: SnapTradeConnectionState = {
    status: mutation.isPending ? 'connecting' : 
            mutation.isSuccess ? 'success' : 
            mutation.isError ? 'error' : 'idle',
    currentStep: 1,
    error: mutation.error?.message
  };

  return {
    getConnectionUrl: mutation.mutate,
    state,
    isLoading: mutation.isPending
  };
}

/**
 * Hook for fetching SnapTrade accounts
 */
export function useSnapTradeAccounts(): UseSnapTradeAccounts {
  const query = useQuery({
    queryKey: snapTradeKeys.accounts(),
    queryFn: async () => {
      const response = await api.snaptrade.getAccounts();
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
    staleTime: 1000 * 60, // Consider data stale after 1 minute
  });

  return {
    accounts: query.data?.accounts || [],
    isLoading: query.isLoading,
    error: query.error ? { message: query.error.message } : null,
    refetch: query.refetch
  };
}

/**
 * Hook for fetching SnapTrade positions for a specific account
 */
export function useSnapTradePositions(accountId: string): UseSnapTradePositions {
  const query = useQuery({
    queryKey: snapTradeKeys.positions(accountId),
    queryFn: async () => {
      const response = await api.snaptrade.getPositions(accountId);
      return response.data;
    },
    enabled: !!accountId,
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    staleTime: 1000 * 30, // Consider data stale after 30 seconds
  });

  return {
    positions: query.data?.positions || [],
    isLoading: query.isLoading,
    error: query.error ? { message: query.error.message } : null,
    refetch: query.refetch
  };
}

/**
 * Hook for fetching SnapTrade balances for a specific account
 */
export function useSnapTradeBalances(accountId: string): UseSnapTradeBalances {
  const query = useQuery({
    queryKey: snapTradeKeys.balances(accountId),
    queryFn: async () => {
      const response = await api.snaptrade.getBalances(accountId);
      return response.data;
    },
    enabled: !!accountId,
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    staleTime: 1000 * 30, // Consider data stale after 30 seconds
  });

  return {
    balances: query.data?.balances || null,
    isLoading: query.isLoading,
    error: query.error ? { message: query.error.message } : null,
    refetch: query.refetch
  };
}

/**
 * Hook for fetching SnapTrade transactions
 */
export function useSnapTradeTransactions(
  startDate?: string, 
  endDate?: string
): UseSnapTradeTransactions {
  const query = useQuery({
    queryKey: snapTradeKeys.transactions(startDate, endDate),
    queryFn: async () => {
      const response = await api.snaptrade.getTransactions(startDate, endDate);
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
  });

  return {
    transactions: query.data?.transactions || [],
    isLoading: query.isLoading,
    error: query.error ? { message: query.error.message } : null,
    refetch: query.refetch
  };
}

/**
 * Hook for SnapTrade data synchronization
 */
export function useSnapTradeSync() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.snaptrade.syncData();
      return response.data;
    },
    onSuccess: () => {
      toast.success('Portfolio data synchronized successfully');
      // Invalidate all SnapTrade queries to refresh data
      queryClient.invalidateQueries({ queryKey: snapTradeKeys.all });
    },
    onError: (error: Error) => {
      const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail || error.message || 'Sync failed';
      toast.error(`Sync failed: ${errorMessage}`);
    }
  });
}

/**
 * Hook for deleting SnapTrade user
 */
export function useSnapTradeDelete() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.snaptrade.deleteUser();
      return response.data;
    },
    onSuccess: () => {
      toast.success('SnapTrade account deleted successfully');
      // Clear all SnapTrade data from cache
      queryClient.removeQueries({ queryKey: snapTradeKeys.all });
    },
    onError: (error: Error) => {
      const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail || error.message || 'Delete failed';
      toast.error(`Delete failed: ${errorMessage}`);
    }
  });
}

/**
 * Hook for checking SnapTrade registration status
 */
export function useSnapTradeStatus() {
  const { accounts, isLoading, error } = useSnapTradeAccounts();
  
  const isRegistered = !error || (error && !error.message.includes('not registered'));
  const hasConnectedAccounts = accounts.length > 0;
  
  return {
    isRegistered,
    hasConnectedAccounts,
    accountCount: accounts.length,
    isLoading,
    error
  };
}

/**
 * Hook for aggregated portfolio data from all SnapTrade accounts
 */
export function useSnapTradePortfolio() {
  const { accounts } = useSnapTradeAccounts();
  
  // Create stable account IDs array to prevent infinite re-renders
  const accountIds = React.useMemo(() => accounts.map(account => account.id), [accounts]);
  
  // Use React Query to fetch all positions and balances
  const portfolioQuery = useQuery({
    queryKey: [...snapTradeKeys.all, 'portfolio', accountIds],
    queryFn: async () => {
      const positionsPromises = accountIds.map(id => 
        api.snaptrade.getPositions(id).then(res => res.data.positions || [])
      );
      
      const balancesPromises = accountIds.map(id => 
        api.snaptrade.getBalances(id).then(res => res.data.balances)
      );
      
      const [positionsArrays, balancesArray] = await Promise.all([
        Promise.all(positionsPromises),
        Promise.all(balancesPromises)
      ]);
      
      const allPositions = positionsArrays.flat();
      const totalBalance = balancesArray.reduce((total, balance) => {
        return total + (balance?.total_value || 0);
      }, 0);
      const totalCash = balancesArray.reduce((total, balance) => {
        return total + (balance?.cash || 0);
      }, 0);
      
      return {
        positions: allPositions,
        totalBalance,
        totalCash,
        accountCount: accounts.length
      };
    },
    enabled: accountIds.length > 0,
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    staleTime: 1000 * 30, // Consider data stale after 30 seconds
  });
  
  return {
    positions: portfolioQuery.data?.positions || [],
    totalBalance: portfolioQuery.data?.totalBalance || 0,
    totalCash: portfolioQuery.data?.totalCash || 0,
    accountCount: portfolioQuery.data?.accountCount || 0,
    isLoading: portfolioQuery.isLoading,
    error: portfolioQuery.error ? { message: portfolioQuery.error.message } : null,
    refetch: portfolioQuery.refetch
  };
}
