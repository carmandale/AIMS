import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { 
  SnapTradeAccount, 
  SnapTradePosition, 
  SnapTradeBalance, 
  SnapTradeTransaction 
} from '../types/snaptrade';

export interface AggregatedPortfolio {
  totalValue: number;
  totalCash: number;
  totalPositions: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  accountBreakdown: AccountSummary[];
}

export interface AccountSummary {
  accountId: string;
  institutionName: string;
  accountType: string;
  value: number;
  percentage: number;
  status: 'active' | 'syncing' | 'error';
  lastSync: string;
}

export type ConnectionStatus = 'connected' | 'partial' | 'disconnected' | 'error';

export interface UseSnapTradeIntegrationReturn {
  // Account Management
  accounts: SnapTradeAccount[];
  selectedAccount: SnapTradeAccount | null;
  selectedAccountId: string | null;
  selectAccount: (accountId: string) => void;
  
  // Data Fetching
  positions: SnapTradePosition[];
  balances: SnapTradeBalance[];
  transactions: SnapTradeTransaction[];
  
  // State Management
  isLoading: boolean;
  isConnected: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  
  // Actions
  syncData: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  connectAccount: () => void;
  
  // Aggregated Data
  portfolioSummary: AggregatedPortfolio;
  connectionStatus: ConnectionStatus;
}

const SELECTED_ACCOUNT_KEY = 'snaptrade_selected_account';

export function useSnapTradeIntegration(): UseSnapTradeIntegrationReturn {
  const queryClient = useQueryClient();
  
  // Selected account state with localStorage persistence
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SELECTED_ACCOUNT_KEY);
    }
    return null;
  });

  // Fetch accounts
  const { 
    data: accounts = [], 
    isLoading: accountsLoading, 
    error: accountsError,
    refetch: refetchAccounts 
  } = useQuery({
    queryKey: ['snaptrade-accounts'],
    queryFn: async () => {
      const response = await api.snaptrade.getAccounts();
      return response.accounts || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  // Auto-select first account if none selected and accounts available
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      const firstAccount = accounts[0];
      setSelectedAccountId(firstAccount.id);
      localStorage.setItem(SELECTED_ACCOUNT_KEY, firstAccount.id);
    }
  }, [selectedAccountId, accounts]);

  // Validate selected account still exists
  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const accountExists = accounts.some(acc => acc.id === selectedAccountId);
      if (!accountExists) {
        const firstAccount = accounts[0];
        setSelectedAccountId(firstAccount.id);
        localStorage.setItem(SELECTED_ACCOUNT_KEY, firstAccount.id);
      }
    }
  }, [selectedAccountId, accounts]);

  const selectedAccount = useMemo(() => {
    return accounts.find(acc => acc.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Fetch positions for selected account
  const { 
    data: positions = [], 
    isLoading: positionsLoading,
    error: positionsError 
  } = useQuery({
    queryKey: ['snaptrade-positions', selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      const response = await api.snaptrade.getPositions(selectedAccountId);
      return response.positions || [];
    },
    enabled: !!selectedAccountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch balances for selected account
  const { 
    data: balances = [], 
    isLoading: balancesLoading,
    error: balancesError 
  } = useQuery({
    queryKey: ['snaptrade-balances', selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      const response = await api.snaptrade.getBalances(selectedAccountId);
      return response.balances || [];
    },
    enabled: !!selectedAccountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch transactions
  const { 
    data: transactions = [], 
    isLoading: transactionsLoading,
    error: transactionsError 
  } = useQuery({
    queryKey: ['snaptrade-transactions'],
    queryFn: async () => {
      const response = await api.snaptrade.getTransactions();
      return response.transactions || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync data mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      await api.snaptrade.syncData();
    },
    onSuccess: () => {
      // Invalidate all SnapTrade queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['snaptrade-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['snaptrade-positions'] });
      queryClient.invalidateQueries({ queryKey: ['snaptrade-balances'] });
      queryClient.invalidateQueries({ queryKey: ['snaptrade-transactions'] });
    },
  });

  // Account selection handler
  const selectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    localStorage.setItem(SELECTED_ACCOUNT_KEY, accountId);
  };

  // Connect account handler
  const connectAccount = () => {
    // Navigate to connection flow - this would typically use router
    window.location.hash = '#snaptrade-connect';
  };

  // Refresh accounts
  const refreshAccounts = async () => {
    await refetchAccounts();
  };

  // Sync data
  const syncData = async () => {
    await syncMutation.mutateAsync();
  };

  // Calculate aggregated portfolio data
  const portfolioSummary: AggregatedPortfolio = useMemo(() => {
    if (!accounts.length) {
      return {
        totalValue: 0,
        totalCash: 0,
        totalPositions: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        accountBreakdown: [],
      };
    }

    const totalValue = accounts.reduce((sum, account) => sum + account.balance, 0);
    
    const accountBreakdown: AccountSummary[] = accounts.map(account => ({
      accountId: account.id,
      institutionName: account.institution_name,
      accountType: account.account_type,
      value: account.balance,
      percentage: totalValue > 0 ? (account.balance / totalValue) * 100 : 0,
      status: account.status as 'active' | 'syncing' | 'error',
      lastSync: account.last_sync,
    }));

    // Calculate total cash from balances
    const totalCash = balances.reduce((sum, balance) => sum + balance.cash, 0);
    
    // Calculate total positions count
    const totalPositions = positions.length;

    // Mock daily P&L calculation (in real app, this would come from API)
    const dailyPnL = totalValue * 0.012; // Mock 1.2% daily gain
    const dailyPnLPercent = 1.2;

    return {
      totalValue,
      totalCash,
      totalPositions,
      dailyPnL,
      dailyPnLPercent,
      accountBreakdown,
    };
  }, [accounts, balances, positions]);

  // Determine connection status
  const connectionStatus: ConnectionStatus = useMemo(() => {
    if (accountsError || positionsError || balancesError || transactionsError) {
      return 'error';
    }
    if (accounts.length === 0) {
      return 'disconnected';
    }
    const hasActiveAccounts = accounts.some(acc => acc.status === 'active');
    const hasErrorAccounts = accounts.some(acc => acc.status === 'error');
    
    if (hasErrorAccounts && hasActiveAccounts) {
      return 'partial';
    }
    if (hasActiveAccounts) {
      return 'connected';
    }
    return 'error';
  }, [accounts, accountsError, positionsError, balancesError, transactionsError]);

  // Calculate last sync time
  const lastSyncTime = useMemo(() => {
    if (!accounts.length) return null;
    
    const syncTimes = accounts
      .map(acc => new Date(acc.last_sync))
      .filter(date => !isNaN(date.getTime()));
    
    if (syncTimes.length === 0) return null;
    
    return new Date(Math.max(...syncTimes.map(date => date.getTime())));
  }, [accounts]);

  // Aggregate loading state
  const isLoading = accountsLoading || positionsLoading || balancesLoading || transactionsLoading || syncMutation.isPending;

  // Aggregate error state
  const error = accountsError?.message || positionsError?.message || balancesError?.message || transactionsError?.message || syncMutation.error?.message || null;

  // Connection status
  const isConnected = connectionStatus === 'connected' || connectionStatus === 'partial';

  return {
    // Account Management
    accounts,
    selectedAccount,
    selectedAccountId,
    selectAccount,
    
    // Data Fetching
    positions,
    balances,
    transactions,
    
    // State Management
    isLoading,
    isConnected,
    lastSyncTime,
    error,
    
    // Actions
    syncData,
    refreshAccounts,
    connectAccount,
    
    // Aggregated Data
    portfolioSummary,
    connectionStatus,
  };
}

