import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Settings, RefreshCw, AlertCircle, CheckCircle, Wifi, WifiOff, DollarSign, BarChart3, Clock, ChevronRight, Zap, Eye, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
interface Account {
  id: string;
  name: string;
  broker: string;
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
  balance: number;
  change: number;
  changePercent: number;
  logo: string;
  lastSync: string;
}
interface SnapTradeStatusWidgetProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'minimal';
  accounts?: Account[];
  onManageAccounts?: () => void;
  onAddAccount?: () => void;
  onRefresh?: () => void;
  showActions?: boolean;
  animated?: boolean;
}
export function SnapTradeStatusWidget({
  className,
  variant = 'compact',
  accounts = [{
    id: '1',
    name: 'Trading Account',
    broker: 'TD Ameritrade',
    status: 'connected',
    balance: 125430.50,
    change: 2340.75,
    changePercent: 1.9,
    logo: '🏦',
    lastSync: '2 min ago'
  }, {
    id: '2',
    name: 'Retirement IRA',
    broker: 'Fidelity',
    status: 'syncing',
    balance: 89250.75,
    change: -450.30,
    changePercent: -0.5,
    logo: '🏛️',
    lastSync: 'Syncing...'
  }, {
    id: '3',
    name: 'Growth Portfolio',
    broker: 'Charles Schwab',
    status: 'connected',
    balance: 67890.25,
    change: 1250.80,
    changePercent: 1.9,
    logo: '🏢',
    lastSync: '5 min ago'
  }],
  onManageAccounts,
  onAddAccount,
  onRefresh,
  showActions = true,
  animated = true
}: SnapTradeStatusWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalChange = accounts.reduce((sum, acc) => sum + acc.change, 0);
  const totalChangePercent = totalBalance > 0 ? totalChange / (totalBalance - totalChange) * 100 : 0;
  const connectedCount = accounts.filter(acc => acc.status === 'connected').length;
  const errorCount = accounts.filter(acc => acc.status === 'error').length;
  const syncingCount = accounts.filter(acc => acc.status === 'syncing').length;
  const overallStatus = errorCount > 0 ? 'error' : syncingCount > 0 ? 'syncing' : 'connected';
  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh?.();

    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };
  const StatusIndicator = ({
    status
  }: {
    status: string;
  }) => {
    const indicators = {
      connected: {
        icon: CheckCircle,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400'
      },
      syncing: {
        icon: RefreshCw,
        color: 'text-blue-400',
        bg: 'bg-blue-400'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-400'
      },
      disconnected: {
        icon: WifiOff,
        color: 'text-gray-400',
        bg: 'bg-gray-400'
      }
    };
    const indicator = indicators[status as keyof typeof indicators] || indicators.disconnected;
    const Icon = indicator.icon;
    return <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", indicator.bg)} />
        <Icon className={cn("w-4 h-4", indicator.color, status === 'syncing' && "animate-spin")} />
      </div>;
  };
  if (variant === 'minimal') {
    return <motion.div initial={animated ? {
      opacity: 0,
      scale: 0.95
    } : false} animate={animated ? {
      opacity: 1,
      scale: 1
    } : false} className={cn("bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 max-w-xs", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">SnapTrade</span>
          </div>
          <StatusIndicator status={overallStatus} />
        </div>

        <div className="text-lg font-bold">
          ${totalBalance.toLocaleString('en-US', {
          minimumFractionDigits: 2
        })}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{connectedCount}/{accounts.length} connected</span>
          <div className={cn("flex items-center gap-1", totalChange >= 0 ? "text-emerald-400" : "text-red-400")}>
            {totalChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(1)}%
          </div>
        </div>
      </motion.div>;
  }
  if (variant === 'detailed') {
    return <motion.div initial={animated ? {
      opacity: 0,
      y: 20
    } : false} animate={animated ? {
      opacity: 1,
      y: 0
    } : false} className={cn("bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 max-w-md", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">SnapTrade Portfolio</h3>
              <p className="text-xs text-gray-400">Real-time sync</p>
            </div>
          </div>
          <StatusIndicator status={overallStatus} />
        </div>

        {/* Balance */}
        <div className="mb-6">
          <div className="text-2xl font-bold mb-1">
            ${totalBalance.toLocaleString('en-US', {
            minimumFractionDigits: 2
          })}
          </div>
          <div className={cn("flex items-center gap-2 text-sm", totalChange >= 0 ? "text-emerald-400" : "text-red-400")}>
            {totalChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {totalChange >= 0 ? '+' : ''}${Math.abs(totalChange).toLocaleString('en-US', {
              minimumFractionDigits: 2
            })}
            </span>
            <span>({totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Account Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Connected Accounts</span>
            <span className="font-medium">{connectedCount} of {accounts.length}</span>
          </div>
          
          {errorCount > 0 && <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{errorCount} account{errorCount !== 1 ? 's' : ''} need attention</span>
            </div>}

          {syncingCount > 0 && <div className="flex items-center gap-2 text-sm text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{syncingCount} account{syncingCount !== 1 ? 's' : ''} syncing</span>
            </div>}
        </div>

        {/* Account Icons */}
        <div className="flex items-center gap-2 mb-6">
          {accounts.slice(0, 4).map((account, i) => <motion.div key={account.id} initial={animated ? {
          opacity: 0,
          scale: 0
        } : false} animate={animated ? {
          opacity: 1,
          scale: 1
        } : false} transition={animated ? {
          delay: i * 0.1
        } : undefined} className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm border-2", account.status === 'connected' && "border-emerald-500", account.status === 'syncing' && "border-blue-500", account.status === 'error' && "border-red-500", account.status === 'disconnected' && "border-gray-500")}>
              {account.logo}
            </motion.div>)}
          {accounts.length > 4 && <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
              +{accounts.length - 4}
            </div>}
        </div>

        {/* Actions */}
        {showActions && <div className="space-y-2">
            <button onClick={onManageAccounts} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Manage Accounts
            </button>
            <div className="flex gap-2">
              <button onClick={handleRefresh} disabled={isRefreshing} className="flex-1 border border-gray-700 hover:border-gray-600 text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Syncing' : 'Refresh'}
              </button>
              <button onClick={onAddAccount} className="flex-1 border border-gray-700 hover:border-gray-600 text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            </div>
          </div>}
      </motion.div>;
  }

  // Default compact variant
  return <motion.div initial={animated ? {
    opacity: 0,
    y: 10
  } : false} animate={animated ? {
    opacity: 1,
    y: 0
  } : false} className={cn("bg-[#1a1a1a] border border-gray-800 rounded-xl p-5 max-w-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="font-semibold text-sm">SnapTrade</span>
            <div className="flex items-center gap-1">
              <StatusIndicator status={overallStatus} />
              <span className="text-xs text-gray-400 capitalize">{overallStatus}</span>
            </div>
          </div>
        </div>
        
        <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
          <RefreshCw className={cn("w-4 h-4 text-gray-400", isRefreshing && "animate-spin")} />
        </button>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <div className="text-xl font-bold mb-1">
          ${totalBalance.toLocaleString('en-US', {
          minimumFractionDigits: 2
        })}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {connectedCount} of {accounts.length} accounts
          </div>
          <div className={cn("flex items-center gap-1 text-sm", totalChange >= 0 ? "text-emerald-400" : "text-red-400")}>
            {totalChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Account Icons */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {accounts.slice(0, 3).map((account, i) => <motion.div key={account.id} initial={animated ? {
          opacity: 0,
          scale: 0
        } : false} animate={animated ? {
          opacity: 1,
          scale: 1
        } : false} transition={animated ? {
          delay: i * 0.05
        } : undefined} className="text-lg" title={`${account.name} - ${account.broker}`}>
              {account.logo}
            </motion.div>)}
          {accounts.length > 3 && <div className="text-xs text-gray-400 ml-1">
              +{accounts.length - 3}
            </div>}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>
            {accounts.find(acc => acc.status === 'connected')?.lastSync || 'Never'}
          </span>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {errorCount > 0 && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{errorCount} account{errorCount !== 1 ? 's' : ''} need reconnection</span>
            </div>
          </motion.div>}
      </AnimatePresence>

      {/* Actions */}
      {showActions && <div className="space-y-2">
          <button onClick={onManageAccounts} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            View Dashboard
            <ChevronRight className="w-3 h-3" />
          </button>
          
          {accounts.length === 0 && <button onClick={onAddAccount} className="w-full border border-gray-700 hover:border-gray-600 text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Connect First Account
            </button>}
        </div>}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <span>Last updated: {currentTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>Live</span>
        </div>
      </div>
    </motion.div>;
}