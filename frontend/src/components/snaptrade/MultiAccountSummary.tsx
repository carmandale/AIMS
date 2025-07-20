import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Plus, 
  Building2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSnapTradeAccounts } from '../../hooks/useSnapTrade';
import type { SnapTradeAccount } from '../../types/snaptrade';

export interface MultiAccountSummaryProps {
  className?: string;
  showAccountBreakdown?: boolean;
  onAccountClick?: (accountId: string) => void;
  onAddAccount?: () => void;
  onSyncAll?: () => void;
}

interface AccountSummary {
  accountId: string;
  institutionName: string;
  accountType: string;
  value: number;
  percentage: number;
  status: 'active' | 'syncing' | 'error';
  lastSync: string;
}

interface AggregatedPortfolio {
  totalValue: number;
  totalCash: number;
  totalPositions: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  accountBreakdown: AccountSummary[];
}

export function MultiAccountSummary({
  className,
  showAccountBreakdown = true,
  onAccountClick,
  onAddAccount,
  onSyncAll,
}: MultiAccountSummaryProps) {
  const { data: accounts = [], isLoading, error, refetch } = useSnapTradeAccounts();

  // Calculate aggregated portfolio data
  const portfolioSummary: AggregatedPortfolio = React.useMemo(() => {
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

    // Mock daily P&L calculation (in real app, this would come from API)
    const dailyPnL = totalValue * 0.012; // Mock 1.2% daily gain
    const dailyPnLPercent = 1.2;

    return {
      totalValue,
      totalCash: totalValue * 0.15, // Mock 15% cash allocation
      totalPositions: accounts.length * 8, // Mock positions count
      dailyPnL,
      dailyPnLPercent,
      accountBreakdown,
    };
  }, [accounts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'syncing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('bg-slate-900 border border-slate-800 rounded-lg p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-800 rounded w-24"></div>
                <div className="h-8 bg-slate-800 rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-slate-900 border border-slate-800 rounded-lg p-6', className)}>
        <div className="flex items-center gap-3 text-red-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3 className="font-medium">Failed to load portfolio data</h3>
            <p className="text-sm text-slate-400 mt-1">Unable to fetch account information</p>
          </div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={cn('bg-slate-900 border border-slate-800 rounded-lg p-6', className)}>
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-200 mb-2">No Accounts Connected</h3>
          <p className="text-slate-400 mb-6">
            Connect your brokerage accounts to see your portfolio overview
          </p>
          <button
            onClick={onAddAccount}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Connect Your First Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('bg-slate-900 border border-slate-800 rounded-lg p-6', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Portfolio Overview</h2>
          <p className="text-sm text-slate-400 mt-1">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onAddAccount && (
            <button
              onClick={onAddAccount}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Total Portfolio Value</p>
          <p className="text-2xl font-bold text-slate-200">
            {formatCurrency(portfolioSummary.totalValue)}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Daily P&L</p>
          <div className="flex items-center gap-2">
            <p className={cn(
              'text-2xl font-bold',
              portfolioSummary.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {formatCurrency(portfolioSummary.dailyPnL)}
            </p>
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              portfolioSummary.dailyPnL >= 0 
                ? 'bg-green-900/30 text-green-400' 
                : 'bg-red-900/30 text-red-400'
            )}>
              {portfolioSummary.dailyPnL >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {formatPercent(portfolioSummary.dailyPnLPercent)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-400">Cash Balance</p>
          <p className="text-2xl font-bold text-slate-200">
            {formatCurrency(portfolioSummary.totalCash)}
          </p>
        </div>
      </div>

      {/* Account Breakdown */}
      {showAccountBreakdown && portfolioSummary.accountBreakdown.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-200">Account Breakdown</h3>
          <div className="space-y-3">
            {portfolioSummary.accountBreakdown.map((account) => (
              <motion.div
                key={account.accountId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center justify-between p-4 bg-slate-800 rounded-lg transition-colors',
                  onAccountClick && 'hover:bg-slate-700 cursor-pointer'
                )}
                onClick={() => onAccountClick?.(account.accountId)}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-200">
                        {account.institutionName}
                      </p>
                      <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                        {account.accountType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn('w-2 h-2 rounded-full', getStatusColor(account.status))} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last sync: {new Date(account.lastSync).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-slate-200">
                    {formatCurrency(account.value)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {account.percentage.toFixed(1)}% of total
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

