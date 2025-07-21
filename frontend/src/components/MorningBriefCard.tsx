import React from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Cloud,
  Calendar,
  Clock,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Coffee,
  AlertTriangle,
  DollarSign,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useMorningBrief, useMarketIndices } from '../hooks';
import { useSnapTradeIntegration } from '../hooks/useSnapTradeIntegration';

export function MorningBriefCard() {
  const { data: morningBrief, isLoading: briefLoading } = useMorningBrief();
  const { data: indices, isLoading: indicesLoading } = useMarketIndices();
  const snapTrade = useSnapTradeIntegration();

  const currentDate = new Date();
  const timeString = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    if (value === null || value === undefined) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPriorityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (briefLoading || indicesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 flex items-center justify-center">
        <div className="text-white">Loading morning brief...</div>
      </div>
    );
  }

  // If there's an error, show the component with fallback data
  const portfolioData = morningBrief?.portfolio_value || {
    total_value: 612847.52,
    day_change: 3245.67,
    day_change_percent: 0.53,
  };

  const alertsList = morningBrief?.volatility_alerts || [];
  const indicesList = indices || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header Section */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-2">Good Morning</h1>
              <p className="text-slate-400 text-lg">{dateString}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl md:text-5xl font-thin text-white mb-1">{timeString}</div>
              {morningBrief && (
                <div className="text-sm text-slate-400">
                  Portfolio: {formatCurrency(morningBrief.portfolio_value)}
                </div>
              )}
            </div>
          </div>
        </motion.header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Overview Card */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-white flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                Portfolio
              </h2>
            </div>
            {morningBrief && (
              <div>
                <div className="mb-4">
                  <div className="text-3xl font-light text-white mb-1">
                    {formatCurrency(morningBrief?.overnight_pnl || 0)}
                  </div>
                  <p
                    className={cn(
                      'text-sm',
                      (morningBrief?.overnight_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    Overnight P&L ({formatPercent(morningBrief?.overnight_pnl_percent || 0)})
                  </p>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Cash Available</span>
                    <span className="text-white font-medium">
                      {formatCurrency(morningBrief?.cash_available || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          {/* Volatility Alerts */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
          >
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
              Volatility Alerts
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {morningBrief?.volatility_alerts.length === 0 ? (
                <p className="text-slate-400">No alerts at this time</p>
              ) : (
                morningBrief?.volatility_alerts.map((alert, index) => (
                  <motion.div
                    key={`${alert.symbol}-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/30"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-white font-medium">{alert.symbol}</span>
                      <span className="text-sm text-slate-400">{alert.message}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          alert.change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {formatPercent(alert.change_percent)}
                      </span>
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border',
                          getPriorityColor(alert.severity)
                        )}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>

          {/* Key Positions */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
          >
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Key Positions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {morningBrief?.key_positions.slice(0, 4).map((position, index) => (
                <motion.div
                  key={position.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{position.symbol}</span>
                    <span className="text-xs text-slate-400">{position.broker}</span>
                  </div>
                  <div className="text-2xl font-light text-white mb-1">
                    {formatCurrency(position.market_value)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span
                      className={cn(
                        position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {formatCurrency(position.unrealized_pnl)}
                    </span>
                    <span
                      className={cn(
                        position.overnight_change_percent >= 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {formatPercent(position.overnight_change_percent)} today
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Market Indices */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
          >
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-400" />
              Market Indices
            </h2>
            <div className="space-y-3">
              {indices &&
                Object.entries(indices).map(([symbol, quote]) => (
                  <div
                    key={symbol}
                    className="p-3 bg-slate-700/40 rounded-xl border border-slate-600/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{symbol}</span>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          quote.change >= 0 ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {formatPercent(quote.change_percent)}
                      </span>
                    </div>
                    <div className="text-lg font-light text-white">${quote.price.toFixed(2)}</div>
                  </div>
                ))}
            </div>
          </motion.section>

          {/* Portfolio Connections */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6"
          >
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
              Portfolio Connections
            </h2>

            {!snapTrade.isConnected ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-white font-medium mb-2">No Accounts Connected</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Connect your brokerage accounts to see real-time portfolio data
                </p>
                <button
                  onClick={snapTrade.connectAccount}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Connect Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 bg-slate-700/40 rounded-xl border border-slate-600/30">
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        snapTrade.connectionStatus === 'connected' && 'bg-green-400',
                        snapTrade.connectionStatus === 'partial' && 'bg-yellow-400',
                        snapTrade.connectionStatus === 'error' && 'bg-red-400'
                      )}
                    />
                    <div>
                      <span className="text-white font-medium">
                        {snapTrade.accounts.length} Account
                        {snapTrade.accounts.length !== 1 ? 's' : ''} Connected
                      </span>
                      <p className="text-xs text-slate-400">
                        Last sync:{' '}
                        {snapTrade.lastSyncTime
                          ? snapTrade.lastSyncTime.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={snapTrade.syncData}
                    disabled={snapTrade.isLoading}
                    className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn('w-4 h-4', snapTrade.isLoading && 'animate-spin')} />
                  </button>
                </div>

                {/* Portfolio Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-700/40 rounded-xl border border-slate-600/30">
                    <div className="text-sm text-slate-400 mb-1">Total Value</div>
                    <div className="text-lg font-medium text-white">
                      {formatCurrency(snapTrade.portfolioSummary.totalValue)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/40 rounded-xl border border-slate-600/30">
                    <div className="text-sm text-slate-400 mb-1">Daily P&L</div>
                    <div
                      className={cn(
                        'text-lg font-medium',
                        snapTrade.portfolioSummary.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {formatCurrency(snapTrade.portfolioSummary.dailyPnL)}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={snapTrade.connectAccount}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add Account
                  </button>
                  <button
                    onClick={() => (window.location.hash = '#holdings')}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    View Holdings
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
}
