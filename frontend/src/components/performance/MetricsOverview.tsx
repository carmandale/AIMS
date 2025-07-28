import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Shield,
  AlertTriangle,
  Target,
  Zap,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { PerformanceDashboardMetrics } from '../../hooks/use-portfolio';

export interface MetricsOverviewProps {
  metrics: PerformanceDashboardMetrics;
  timeframe: string;
  isLoading?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changePercent?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  iconBg: string;
  isLoading?: boolean;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  color,
  iconBg,
  isLoading,
  subtitle,
  trend = 'neutral',
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-slate-400';
  };

  const TrendIcon = getTrendIcon();

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${iconBg} rounded-xl`}>
              <div className="w-6 h-6 bg-slate-600 rounded"></div>
            </div>
            <div className="w-8 h-8 bg-slate-600 rounded"></div>
          </div>
          <div className="h-4 bg-slate-600 rounded mb-2"></div>
          <div className="h-8 bg-slate-600 rounded mb-2"></div>
          <div className="h-3 bg-slate-600 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {TrendIcon && (
          <TrendIcon className={`w-6 h-6 ${getTrendColor()}`} />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        
        {change && (
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {change}
            </span>
            {changePercent !== undefined && (
              <span className={`text-xs ${getTrendColor()}`}>
                ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        )}

        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  timeframe,
  isLoading,
  className = '',
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case 'daily': return '1D';
      case 'weekly': return '1W';
      case 'monthly': return '1M';
      case 'ytd': return 'YTD';
      case '1y': return '1Y';
      case '3y': return '3Y';
      case '5y': return '5Y';
      case 'all': return 'All Time';
      default: return timeframe.toUpperCase();
    }
  };

  const getTrend = (value: number) => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  const getRiskColor = (value: number, thresholds: { low: number; high: number }) => {
    if (value <= thresholds.low) return 'text-emerald-400';
    if (value >= thresholds.high) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getSharpeColor = (sharpe: number) => {
    if (sharpe >= 1.5) return 'text-emerald-400';
    if (sharpe >= 1.0) return 'text-green-400';
    if (sharpe >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${className}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">
            Performance Metrics
          </h2>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm font-medium rounded-full">
            {getTimeframeLabel(timeframe)}
          </span>
        </div>
        
        {metrics.last_updated && (
          <div className="flex items-center space-x-2 text-slate-400 text-sm">
            <Calendar className="w-4 h-4" />
            <span>Updated {new Date(metrics.last_updated).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Return"
          value={formatPercent(metrics.percent_change)}
          change={formatCurrency(metrics.absolute_change)}
          icon={TrendingUp}
          color={getTrend(metrics.percent_change) === 'up' ? 'text-emerald-400' : 'text-red-400'}
          iconBg="bg-blue-500/10"
          isLoading={isLoading}
          trend={getTrend(metrics.percent_change)}
          subtitle={`${formatCurrency(metrics.starting_value)} → ${formatCurrency(metrics.current_value)}`}
        />

        <MetricCard
          title="Current Value"
          value={formatCurrency(metrics.current_value)}
          change={formatCurrency(metrics.daily_change)}
          changePercent={metrics.daily_change_percent}
          icon={DollarSign}
          color="text-white"
          iconBg="bg-emerald-500/10"
          isLoading={isLoading}
          trend={getTrend(metrics.daily_change)}
          subtitle="Portfolio Value"
        />

        <MetricCard
          title="Volatility"
          value={`${metrics.volatility.toFixed(1)}%`}
          icon={Activity}
          color={getRiskColor(metrics.volatility, { low: 15, high: 25 })}
          iconBg="bg-yellow-500/10"
          isLoading={isLoading}
          subtitle="Annualized Standard Deviation"
        />

        <MetricCard
          title="Sharpe Ratio"
          value={metrics.sharpe_ratio.toFixed(2)}
          icon={Shield}
          color={getSharpeColor(metrics.sharpe_ratio)}
          iconBg="bg-purple-500/10"
          isLoading={isLoading}
          subtitle="Risk-Adjusted Return"
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Annualized Return"
          value={formatPercent(metrics.annualized_return)}
          icon={Target}
          color={getTrend(metrics.annualized_return) === 'up' ? 'text-emerald-400' : 'text-red-400'}
          iconBg="bg-indigo-500/10"
          isLoading={isLoading}
          trend={getTrend(metrics.annualized_return)}
        />

        <MetricCard
          title="Max Drawdown"
          value={`-${metrics.max_drawdown.toFixed(2)}%`}
          icon={AlertTriangle}
          color="text-red-400"
          iconBg="bg-red-500/10"
          isLoading={isLoading}
          subtitle={metrics.max_drawdown_date ? new Date(metrics.max_drawdown_date).toLocaleDateString() : undefined}
        />

        <MetricCard
          title="Daily Change"
          value={formatPercent(metrics.daily_change_percent)}
          change={formatCurrency(metrics.daily_change)}
          icon={Zap}
          color={getTrend(metrics.daily_change) === 'up' ? 'text-emerald-400' : 'text-red-400'}
          iconBg="bg-cyan-500/10"
          isLoading={isLoading}
          trend={getTrend(metrics.daily_change)}
        />

        <MetricCard
          title={`${getTimeframeLabel(timeframe)} Return`}
          value={formatPercent(getTimeframeReturn(metrics, timeframe))}
          change={formatCurrency(getTimeframeChange(metrics, timeframe))}
          icon={BarChart3}
          color={getTrend(getTimeframeReturn(metrics, timeframe)) === 'up' ? 'text-emerald-400' : 'text-red-400'}
          iconBg="bg-orange-500/10"
          isLoading={isLoading}
          trend={getTrend(getTimeframeReturn(metrics, timeframe))}
        />
      </div>

      {/* Benchmark Comparison Alert */}
      {metrics.benchmark_comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
        >
          <div className="flex items-center space-x-3">
            <Target className={`w-5 h-5 ${
              metrics.benchmark_comparison.outperformed ? 'text-emerald-400' : 'text-red-400'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-300">
                {metrics.benchmark_comparison.outperformed ? 'Outperformed' : 'Underperformed'} {metrics.benchmark_comparison.benchmark_symbol}
              </p>
              <p className="text-xs text-slate-400">
                Portfolio: {formatPercent(metrics.benchmark_comparison.benchmark_return + metrics.benchmark_comparison.relative_performance)} | 
                Benchmark: {formatPercent(metrics.benchmark_comparison.benchmark_return)} | 
                Difference: {formatPercent(metrics.benchmark_comparison.relative_performance)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Helper functions to get timeframe-specific returns
function getTimeframeReturn(metrics: PerformanceDashboardMetrics, timeframe: string): number {
  switch (timeframe) {
    case 'daily': return metrics.daily_change_percent;
    case 'weekly': return metrics.weekly_change_percent;
    case 'monthly': return metrics.monthly_change_percent;
    case 'ytd': return metrics.ytd_change_percent;
    default: return metrics.percent_change;
  }
}

function getTimeframeChange(metrics: PerformanceDashboardMetrics, timeframe: string): number {
  switch (timeframe) {
    case 'daily': return metrics.daily_change;
    case 'weekly': return metrics.weekly_change;
    case 'monthly': return metrics.monthly_change;
    case 'ytd': return metrics.ytd_change;
    default: return metrics.absolute_change;
  }
}