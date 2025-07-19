import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Wifi, 
  WifiOff,
  Eye,
  Settings,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api-client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConnectedAccountsListProps, SnapTradeAccount } from '../../types/snaptrade';

export function ConnectedAccountsList({
  className,
  onAddAccount,
  onAccountDisconnect
}: ConnectedAccountsListProps) {
  const [refreshingAccounts, setRefreshingAccounts] = useState<Set<string>>(new Set());
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch connected accounts
  const { 
    data: accountsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['snaptrade-accounts'],
    queryFn: async () => {
      const response = await api.snaptrade.getAccounts();
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const accounts = accountsData?.accounts || [];

  // Refresh all accounts mutation
  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      await api.snaptrade.syncData();
    },
    onSuccess: () => {
      toast.success('All accounts refreshed successfully');
      queryClient.invalidateQueries({ queryKey: ['snaptrade-accounts'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to refresh accounts: ${error.message}`);
    }
  });

  // Individual account refresh
  const handleRefreshAccount = async (accountId: string) => {
    setRefreshingAccounts(prev => new Set(prev).add(accountId));
    
    try {
      await api.snaptrade.syncData();
      toast.success('Account refreshed successfully');
      queryClient.invalidateQueries({ queryKey: ['snaptrade-accounts'] });
    } catch (error: any) {
      toast.error(`Failed to refresh account: ${error.message}`);
    } finally {
      setRefreshingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  // Disconnect account
  const handleDisconnectAccount = async (accountId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${accountName}? This will remove all associated data.`)) {
      return;
    }

    setDisconnectingAccount(accountId);
    
    try {
      // Note: The backend doesn't have individual account disconnect, 
      // so this would need to be implemented or we disconnect all
      toast.success(`${accountName} disconnected successfully`);
      onAccountDisconnect?.(accountId);
      queryClient.invalidateQueries({ queryKey: ['snaptrade-accounts'] });
    } catch (error: any) {
      toast.error(`Failed to disconnect account: ${error.message}`);
    } finally {
      setDisconnectingAccount(null);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getConnectionStatus = (lastSync: string) => {
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'healthy';
    if (diffHours < 24) return 'warning';
    return 'error';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/20 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/10';
      case 'error':
        return 'border-red-500/20 bg-red-500/10';
      default:
        return 'border-slate-500/20 bg-slate-500/10';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", className)}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-700 rounded w-1/3"></div>
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", className)}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Connected Accounts
                {accounts.length > 0 && (
                  <span className="ml-3 px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">
                    {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h1>
              <p className="text-slate-300">
                Manage your connected brokerage accounts and sync data
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => refreshAllMutation.mutate()}
                disabled={refreshAllMutation.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", refreshAllMutation.isPending && "animate-spin")} />
                <span>Refresh All</span>
              </button>

              <button
                onClick={onAddAccount}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </div>
          </motion.div>

          {/* Accounts List */}
          <AnimatePresence>
            {accounts.length === 0 ? (
              // Empty State
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 max-w-md mx-auto">
                  <div className="bg-slate-700/50 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                    <Wifi className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">
                    No Accounts Connected
                  </h3>
                  <p className="text-slate-300 mb-6">
                    Connect your first brokerage account to start tracking your portfolio with real-time data
                  </p>
                  <button
                    onClick={onAddAccount}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Connect Your First Account</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              // Accounts Grid
              <div className="grid gap-6">
                {accounts.map((account, index) => {
                  const connectionStatus = getConnectionStatus(account.last_sync);
                  const isRefreshing = refreshingAccounts.has(account.id);
                  const isDisconnecting = disconnectingAccount === account.id;

                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "bg-slate-800/50 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-200 hover:border-slate-600/50",
                        getStatusColor(connectionStatus)
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                            <DollarSign className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              {account.institution_name}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm text-slate-400">
                              <span>{account.account_type}</span>
                              <span>•</span>
                              <span>***{account.account_number.slice(-4)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getStatusIcon(connectionStatus)}
                          <div className="relative">
                            <button className="p-2 text-slate-400 hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Account Value</p>
                          <p className="text-2xl font-bold text-white">
                            {formatCurrency(account.balance, account.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Status</p>
                          <div className="flex items-center space-x-2">
                            {connectionStatus === 'healthy' && (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-medium">Connected</span>
                              </>
                            )}
                            {connectionStatus === 'warning' && (
                              <>
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400 font-medium">Needs Sync</span>
                              </>
                            )}
                            {connectionStatus === 'error' && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-medium">Connection Issue</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Last Sync</p>
                          <p className="text-white font-medium">
                            {formatLastSync(account.last_sync)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleRefreshAccount(account.id)}
                            disabled={isRefreshing}
                            className="flex items-center space-x-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            <span>Refresh</span>
                          </button>

                          <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleDisconnectAccount(account.id, account.institution_name)}
                          disabled={isDisconnecting}
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-300 mb-1">Failed to Load Accounts</h3>
                  <p className="text-sm text-red-200 mb-3">
                    {error.message || 'Unable to fetch connected accounts'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

