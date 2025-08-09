import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  Calendar,
  BarChart3,
  Shield,
} from 'lucide-react';
import {
  CurrentDrawdown,
  MaxDrawdown,
  BenchmarkDrawdown,
  DrawdownStatistics,
  getDrawdownTrendColor,
  formatDuration,
} from '../../hooks/use-drawdown';

export interface DrawdownMetricsProps {
  currentDrawdown: CurrentDrawdown;
  maxDrawdown: MaxDrawdown;
  benchmarkDrawdown?: BenchmarkDrawdown;
  statistics: DrawdownStatistics;
  isLoading?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  iconBg: string;
  isLoading?: boolean;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'normal' | 'warning' | 'critical';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  iconBg,
  isLoading,
  subtitle,
  status = 'normal',
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'warning':
        return 'border-yellow-500/50';
      case 'critical':
        return 'border-red-500/50';
      default:
        return 'border-slate-700/50';
    }
  };

  if (isLoading) {
    return (
      <div
        className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border ${getStatusBorder()} p-6`}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${iconBg} rounded-xl`}>
              <div className="w-6 h-6 bg-slate-600 rounded"></div>
            </div>
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
      className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border ${getStatusBorder()} p-6 hover:border-slate-600/50 transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {status !== 'normal' && (
          <AlertTriangle
            className={`w-5 h-5 ${status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>

        {change && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-300">{change}</span>
          </div>
        )}

        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

export const DrawdownMetrics: React.FC<DrawdownMetricsProps> = ({
  currentDrawdown,
  maxDrawdown,
  benchmarkDrawdown,
  statistics,
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
    return `${value >= 0 ? '' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCurrentDrawdownStatus = () => {
    const percent = Math.abs(currentDrawdown.percentage);
    if (percent >= 20) return 'critical';
    if (percent >= 15) return 'warning';
    return 'normal';
  };

  const getMaxDrawdownStatus = () => {
    const percent = Math.abs(maxDrawdown.percentage);
    if (percent >= 20) return 'critical';
    if (percent >= 15) return 'warning';
    return 'normal';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingDown className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-semibold text-white">Drawdown Metrics</h2>
        </div>

        {currentDrawdown.last_high_date && (
          <div className="flex items-center space-x-2 text-slate-400 text-sm">
            <Calendar className="w-4 h-4" />
            <span>Last High: {formatDate(currentDrawdown.last_high_date)}</span>
          </div>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Current Drawdown"
          value={formatPercent(currentDrawdown.percentage)}
          change={formatCurrency(currentDrawdown.amount)}
          icon={TrendingDown}
          color={getDrawdownTrendColor(Math.abs(currentDrawdown.percentage))}
          iconBg="bg-red-500/10"
          isLoading={isLoading}
          status={getCurrentDrawdownStatus()}
          subtitle={`From ${formatCurrency(currentDrawdown.high_water_mark)}`}
        />

        <MetricCard
          title="Days in Drawdown"
          value={formatDuration(currentDrawdown.days_in_drawdown)}
          icon={Clock}
          color="text-yellow-400"
          iconBg="bg-yellow-500/10"
          isLoading={isLoading}
          subtitle={
            currentDrawdown.days_in_drawdown > 0
              ? `Since ${formatDate(currentDrawdown.last_high_date)}`
              : 'At new high'
          }
        />

        <MetricCard
          title="Max Drawdown"
          value={formatPercent(maxDrawdown.percentage)}
          change={formatCurrency(maxDrawdown.amount)}
          icon={AlertTriangle}
          color="text-red-400"
          iconBg="bg-red-500/10"
          isLoading={isLoading}
          status={getMaxDrawdownStatus()}
          subtitle={formatDate(maxDrawdown.date)}
        />

        <MetricCard
          title="Current Value"
          value={formatCurrency(currentDrawdown.current_value)}
          icon={Target}
          color="text-white"
          iconBg="bg-blue-500/10"
          isLoading={isLoading}
          subtitle="Portfolio Value"
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Events"
          value={statistics.total_events.toString()}
          icon={Activity}
          color="text-purple-400"
          iconBg="bg-purple-500/10"
          isLoading={isLoading}
          subtitle="Historical Drawdowns"
        />

        <MetricCard
          title="Avg Duration"
          value={formatDuration(statistics.avg_duration_days)}
          icon={BarChart3}
          color="text-cyan-400"
          iconBg="bg-cyan-500/10"
          isLoading={isLoading}
          subtitle="Average Decline Period"
        />

        <MetricCard
          title="Avg Recovery"
          value={formatDuration(statistics.avg_recovery_days)}
          icon={Shield}
          color="text-emerald-400"
          iconBg="bg-emerald-500/10"
          isLoading={isLoading}
          subtitle="Average Recovery Time"
        />

        <MetricCard
          title="Recovery Status"
          value={
            statistics.current_recovery_days > 0
              ? formatDuration(statistics.current_recovery_days)
              : 'Complete'
          }
          icon={Clock}
          color={
            statistics.current_recovery_days > 0
              ? statistics.current_recovery_days > statistics.avg_recovery_days
                ? 'text-red-400'
                : 'text-yellow-400'
              : 'text-emerald-400'
          }
          iconBg="bg-indigo-500/10"
          isLoading={isLoading}
          subtitle={statistics.current_recovery_days > 0 ? 'Days recovering' : 'No active drawdown'}
        />
      </div>

      {/* Benchmark Comparison */}
      {benchmarkDrawdown && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Target className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-slate-300">
                  Benchmark Comparison ({benchmarkDrawdown.symbol})
                </p>
                <p className="text-xs text-slate-400">
                  Portfolio vs {benchmarkDrawdown.symbol} drawdown performance
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-300">
                {benchmarkDrawdown.symbol}: {formatPercent(benchmarkDrawdown.percentage)}
              </p>
              <p className="text-xs text-slate-400">{formatCurrency(benchmarkDrawdown.amount)}</p>
            </div>
          </div>

          {/* Relative Performance Indicator */}
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 bg-slate-700 rounded-full h-2 relative">
              <div
                className={`absolute top-0 left-0 h-2 rounded-full ${
                  currentDrawdown.percentage <= benchmarkDrawdown.percentage
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      10,
                      (Math.abs(benchmarkDrawdown.percentage) /
                        Math.max(
                          Math.abs(currentDrawdown.percentage),
                          Math.abs(benchmarkDrawdown.percentage)
                        )) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <span
              className={`text-sm font-medium ${
                currentDrawdown.percentage <= benchmarkDrawdown.percentage
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {currentDrawdown.percentage <= benchmarkDrawdown.percentage
                ? 'Outperforming'
                : 'Underperforming'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Risk Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 p-4 bg-slate-800/30 rounded-xl"
      >
        <div className="flex items-center space-x-3 mb-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-medium text-slate-300">Risk Assessment</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                getCurrentDrawdownStatus() === 'normal'
                  ? 'bg-emerald-500/20'
                  : getCurrentDrawdownStatus() === 'warning'
                    ? 'bg-yellow-500/20'
                    : 'bg-red-500/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  getCurrentDrawdownStatus() === 'normal'
                    ? 'bg-emerald-500'
                    : getCurrentDrawdownStatus() === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
            </div>
            <p className="text-xs text-slate-400">Current Risk</p>
            <p
              className={`text-sm font-medium ${
                getCurrentDrawdownStatus() === 'normal'
                  ? 'text-emerald-400'
                  : getCurrentDrawdownStatus() === 'warning'
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {getCurrentDrawdownStatus() === 'normal'
                ? 'Low'
                : getCurrentDrawdownStatus() === 'warning'
                  ? 'Moderate'
                  : 'High'}
            </p>
          </div>

          <div className="text-center">
            <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center bg-blue-500/20">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400">Recovery Time</p>
            <p className="text-sm font-medium text-blue-400">
              {statistics.current_recovery_days > 0
                ? `${Math.round(
                    (statistics.current_recovery_days / statistics.avg_recovery_days) * 100
                  )}% of avg`
                : 'N/A'}
            </p>
          </div>

          <div className="text-center">
            <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center bg-purple-500/20">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xs text-slate-400">Historical Context</p>
            <p className="text-sm font-medium text-purple-400">
              {Math.abs(currentDrawdown.percentage) > Math.abs(statistics.max_drawdown_ever) * 0.8
                ? 'High vs History'
                : Math.abs(currentDrawdown.percentage) >
                    Math.abs(statistics.max_drawdown_ever) * 0.5
                  ? 'Moderate vs History'
                  : 'Low vs History'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
