import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingDown,
  AlertTriangle,
  Calendar,
  RefreshCw,
  BarChart3,
  Activity,
} from 'lucide-react';
import { DrawdownChart } from './DrawdownChart';
import { DrawdownMetrics } from './DrawdownMetrics';
import { DrawdownTable } from './DrawdownTable';
import {
  useCurrentDrawdownMetrics,
  useHistoricalDrawdownData,
  useDrawdownAlerts,
  getAlertLevelColor,
} from '../../hooks/use-drawdown';

export interface DrawdownDashboardProps {
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'ytd' | '1y' | '3y' | '5y' | 'all';
  benchmark?: string;
  className?: string;
}

export const DrawdownDashboard: React.FC<DrawdownDashboardProps> = ({
  timeframe = 'ytd',
  benchmark = 'SPY',
  className = '',
}) => {
  // Data hooks
  const {
    data: currentMetrics,
    isLoading: currentLoading,
    error: currentError,
    refetch: refetchCurrent,
  } = useCurrentDrawdownMetrics(benchmark);

  const {
    data: historicalData,
    isLoading: historicalLoading,
    error: historicalError,
  } = useHistoricalDrawdownData(
    getStartDateForTimeframe(timeframe),
    new Date().toISOString().split('T')[0],
    1.0
  );

  const { data: alertData, isLoading: alertLoading, error: alertError } = useDrawdownAlerts();

  const isLoading = currentLoading || historicalLoading || alertLoading;
  const error = currentError || historicalError || alertError;

  const handleRefresh = () => {
    refetchCurrent();
  };

  if (error) {
    return (
      <div className={`min-h-screen bg-slate-950 ${className}`}>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Drawdown Data Unavailable</h2>
            <p className="text-slate-400 mb-6">
              Unable to load drawdown data. Please check your connection and try again.
            </p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-slate-950 ${className}`}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-slate-400">Loading drawdown analysis...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-950 ${className}`}>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Drawdown Analysis</h1>
                <p className="text-slate-400 text-sm md:text-base">
                  Monitor portfolio drawdowns and risk exposure
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Alert Status */}
          {alertData && alertData.alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle
                  className={`w-5 h-5 ${getAlertLevelColor(alertData.current_status)}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-300">
                    {alertData.current_status === 'warning' && 'Warning Alert'}
                    {alertData.current_status === 'critical' && 'Critical Alert'}
                    {alertData.current_status === 'emergency' && 'Emergency Alert'}
                  </p>
                  {alertData.alerts[0]?.message && (
                    <p className="text-xs text-slate-400 mt-1">{alertData.alerts[0].message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Dashboard Content */}
        {currentMetrics && historicalData ? (
          <div className="space-y-8">
            {/* Current Drawdown Metrics */}
            <DrawdownMetrics
              currentDrawdown={currentMetrics.current_drawdown}
              maxDrawdown={currentMetrics.max_drawdown}
              benchmarkDrawdown={currentMetrics.benchmark_drawdown}
              statistics={historicalData.statistics}
              isLoading={currentLoading}
            />

            {/* Drawdown Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Drawdown History</h2>
                </div>
                {benchmark && currentMetrics.benchmark_drawdown && (
                  <span className="text-sm text-slate-400">
                    vs {currentMetrics.benchmark_drawdown.symbol}:{' '}
                    {currentMetrics.benchmark_drawdown.percentage.toFixed(1)}%
                  </span>
                )}
              </div>

              <DrawdownChart
                data={historicalData.chart_data}
                events={historicalData.drawdown_events}
                isLoading={historicalLoading}
              />
            </motion.div>

            {/* Historical Drawdown Events Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Activity className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Drawdown Events</h2>
                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-sm font-medium rounded-full">
                  {historicalData.statistics.total_events} events
                </span>
              </div>

              {historicalData.drawdown_events.length > 0 ? (
                <DrawdownTable
                  events={historicalData.drawdown_events}
                  isLoading={historicalLoading}
                />
              ) : (
                <div className="text-center py-12">
                  <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-white mb-4">No Drawdown Events</h3>
                  <p className="text-slate-400">
                    No significant drawdown events found in the selected period.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">No Drawdown Data</h2>
            <p className="text-slate-400 mb-6">
              Drawdown analysis will appear once you have sufficient portfolio history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get start date for timeframe
function getStartDateForTimeframe(timeframe: string): string {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeframe) {
    case 'daily':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'ytd':
      startDate.setMonth(0, 1); // January 1st
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case '3y':
      startDate.setFullYear(now.getFullYear() - 3);
      break;
    case '5y':
      startDate.setFullYear(now.getFullYear() - 5);
      break;
    case 'all':
      startDate.setFullYear(2020, 0, 1); // Default to 2020-01-01
      break;
    default:
      startDate.setMonth(0, 1); // Default to YTD
  }

  return startDate.toISOString().split('T')[0];
}
