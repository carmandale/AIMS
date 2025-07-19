import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Settings, 
  RefreshCw, 
  Plus,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { SnapTradeStatusWidgetProps, SnapTradeConnectionStatus } from '../../types/snaptrade';

export function SnapTradeStatusWidget({
  className,
  onManageAccounts,
  compact = false
}: SnapTradeStatusWidgetProps) {
  // Fetch accounts data
  const { 
    data: accountsData, 
    isLoading, 
    error,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['snaptrade-accounts'],
    queryFn: async () => {
      const response = await api.snaptrade.getAccounts();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 1,
  });

  const accounts = accountsData?.accounts || [];

  // Calculate connection status
  const getConnectionStatus = (): SnapTradeConnectionStatus => {
    if (error) {
      return {
        isRegistered: false,
        hasConnectedAccounts: false,
        accountCount: 0,
        lastSync: null,
        connectionHealth: 'error'
      };
    }

    if (accounts.length === 0) {
      return {
        isRegistered: true, // If we can fetch (even empty), user is registered
        hasConnectedAccounts: false,
        accountCount: 0,
        lastSync: null,
        connectionHealth: 'error'
      };
    }

    // Find the most recent sync time
    const lastSyncTimes = accounts.map(acc => new Date(acc.last_sync).getTime());
    const mostRecentSync = Math.max(...lastSyncTimes);
    const lastSyncDate = new Date(mostRecentSync);
    
    // Determine health based on most recent sync
    const now = new Date();
    const diffHours = (now.getTime() - mostRecentSync) / (1000 * 60 * 60);
    
    let health: 'healthy' | 'warning' | 'error' = 'healthy';
    if (diffHours > 24) health = 'error';
    else if (diffHours > 1) health = 'warning';

    return {
      isRegistered: true,
      hasConnectedAccounts: true,
      accountCount: accounts.length,
      lastSync: lastSyncDate.toISOString(),
      connectionHealth: health
    };
  };

  const status = getConnectionStatus();

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
    }

    switch (status.connectionHealth) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return status.hasConnectedAccounts ? 
          <WifiOff className="w-5 h-5 text-red-400" /> : 
          <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Wifi className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    
    if (!status.isRegistered) {
      return 'Not registered';
    }
    
    if (!status.hasConnectedAccounts) {
      return 'No accounts connected';
    }

    const accountText = status.accountCount === 1 ? 'account' : 'accounts';
    
    switch (status.connectionHealth) {
      case 'healthy':
        return `${status.accountCount} ${accountText} connected`;
      case 'warning':
        return `${status.accountCount} ${accountText} - needs sync`;
      case 'error':
        return `${status.accountCount} ${accountText} - connection issues`;
      default:
        return `${status.accountCount} ${accountText}`;
    }
  };

  const getStatusColor = () => {
    if (isLoading) return 'border-blue-500/20 bg-blue-500/5';
    
    switch (status.connectionHealth) {
      case 'healthy':
        return 'border-green-500/20 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-slate-500/20 bg-slate-500/5';
    }
  };

  const getTotalValue = () => {
    if (!accounts.length) return 0;
    return accounts.reduce((total, account) => total + account.balance, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-slate-800/50 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:border-slate-600/50",
          getStatusColor(),
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium text-white">
                SnapTrade
              </p>
              <p className="text-xs text-slate-400">
                {getStatusText()}
              </p>
            </div>
          </div>
          
          <button
            onClick={onManageAccounts}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-slate-800/50 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-200 hover:border-slate-600/50",
        getStatusColor(),
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              SnapTrade Connection
            </h3>
            <p className="text-sm text-slate-400">
              Brokerage account integration
            </p>
          </div>
        </div>
        
        <button
          onClick={onManageAccounts}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Manage</span>
        </button>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium text-white">
                {getStatusText()}
              </p>
              {status.lastSync && (
                <p className="text-sm text-slate-400">
                  Last sync: {formatLastSync(status.lastSync)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Account Summary */}
        {status.hasConnectedAccounts && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Value</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(getTotalValue())}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Accounts</p>
              <p className="text-xl font-bold text-white">
                {status.accountCount}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-4">
          {!status.hasConnectedAccounts ? (
            <button
              onClick={onManageAccounts}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Account</span>
            </button>
          ) : (
            <>
              <button
                onClick={onManageAccounts}
                className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                View Accounts
              </button>
              {status.connectionHealth !== 'healthy' && (
                <button
                  onClick={() => {
                    // Trigger a refetch
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Mini Account Icons */}
        {accounts.length > 0 && (
          <div className="flex items-center space-x-2 pt-2">
            <p className="text-xs text-slate-400">Connected:</p>
            <div className="flex items-center space-x-1">
              {accounts.slice(0, 3).map((account, index) => (
                <div
                  key={account.id}
                  className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                  title={account.institution_name}
                >
                  <DollarSign className="w-3 h-3 text-white" />
                </div>
              ))}
              {accounts.length > 3 && (
                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">+{accounts.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

