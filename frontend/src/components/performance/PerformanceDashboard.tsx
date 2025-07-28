import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  RefreshCw, 
  Settings, 
  Download,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Menu
} from 'lucide-react';
import { MetricsOverview } from './MetricsOverview';
import { PerformanceChart } from './PerformanceChart';
import { BenchmarkComparison } from './BenchmarkComparison';
import { 
  usePerformanceDashboardMetrics, 
  useHistoricalPerformanceData,
  useConfigureBenchmark 
} from '../../hooks/use-portfolio';
import { useIsMobile } from '../../hooks/use-mobile';

export interface PerformanceDashboardProps {
  className?: string;
}

type TimeframeOption = 'daily' | 'weekly' | 'monthly' | 'ytd' | '1y' | '3y' | '5y' | 'all';
type BenchmarkOption = 'SPY' | 'QQQ' | 'VTI' | 'IWM' | 'BTC' | 'none';

const timeframeOptions = [
  { value: 'daily', label: '1D' },
  { value: 'weekly', label: '1W' },
  { value: 'monthly', label: '1M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
];

const benchmarkOptions = [
  { value: 'none', label: 'No Benchmark' },
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'QQQ', label: 'NASDAQ-100 (QQQ)' },
  { value: 'VTI', label: 'Total Stock Market (VTI)' },
  { value: 'IWM', label: 'Russell 2000 (IWM)' },
  { value: 'BTC', label: 'Bitcoin (BTC)' },
];

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className = '' }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('ytd');
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkOption>('SPY');
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  
  const isMobile = useIsMobile();

  // Data hooks
  const {
    data: performanceMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = usePerformanceDashboardMetrics(
    selectedTimeframe,
    selectedBenchmark !== 'none' ? selectedBenchmark : undefined
  );

  const {
    data: historicalData,
    isLoading: historicalLoading,
    error: historicalError,
  } = useHistoricalPerformanceData(
    getStartDateForTimeframe(selectedTimeframe),
    new Date().toISOString().split('T')[0],
    'daily'
  );

  const configureBenchmark = useConfigureBenchmark();

  const isLoading = metricsLoading || historicalLoading;
  const error = metricsError || historicalError;

  const handleTimeframeChange = (timeframe: TimeframeOption) => {
    setSelectedTimeframe(timeframe);
  };

  const handleBenchmarkChange = (benchmark: BenchmarkOption) => {
    setSelectedBenchmark(benchmark);
    if (benchmark !== 'none') {
      configureBenchmark.mutate({ benchmark });
    }
  };

  const handleRefresh = () => {
    refetchMetrics();
  };

  if (error) {
    return (
      <div className={`min-h-screen bg-slate-950 ${className}`}>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Performance Data Unavailable
            </h2>
            <p className="text-slate-400 mb-6">
              Unable to load performance metrics. Please check your connection and try again.
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

  return (
    <div className={`min-h-screen bg-slate-950 ${className}`}>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4">
            {/* Title and Mobile Menu Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Performance Dashboard
                  </h1>
                  <p className="text-slate-400 text-sm md:text-base">
                    Track your portfolio performance and analyze trends
                  </p>
                </div>
              </div>

              {/* Mobile controls toggle */}
              {isMobile && (
                <button
                  onClick={() => setShowMobileControls(!showMobileControls)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors md:hidden"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Desktop Controls */}
            {!isMobile && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Timeframe Selector */}
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div className="flex bg-slate-800 rounded-lg p-1">
                    {timeframeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleTimeframeChange(option.value as TimeframeOption)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedTimeframe === option.value
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Benchmark Selector */}
                <select
                  value={selectedBenchmark}
                  onChange={(e) => handleBenchmarkChange(e.target.value as BenchmarkOption)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 min-w-[160px]"
                >
                  {benchmarkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

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

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  <button
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="Export Report"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Controls */}
            {isMobile && showMobileControls && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 md:hidden"
              >
                {/* Mobile Timeframe Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Time Period
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {timeframeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleTimeframeChange(option.value as TimeframeOption)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedTimeframe === option.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Benchmark Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Benchmark
                  </label>
                  <select
                    value={selectedBenchmark}
                    onChange={(e) => handleBenchmarkChange(e.target.value as BenchmarkOption)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {benchmarkOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="text-sm">Refresh</span>
                  </button>

                  <button
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Export</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-slate-400">Loading performance data...</span>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && performanceMetrics && (
          <div className="space-y-8">
            {/* Metrics Overview */}
            <MetricsOverview
              metrics={performanceMetrics}
              timeframe={selectedTimeframe}
              isLoading={metricsLoading}
            />

            {/* Performance Chart */}
            <PerformanceChart
              historicalData={historicalData || []}
              timeframe={selectedTimeframe}
              benchmark={selectedBenchmark !== 'none' ? selectedBenchmark : undefined}
              isLoading={historicalLoading}
            />

            {/* Benchmark Comparison */}
            {selectedBenchmark !== 'none' && performanceMetrics.benchmark_comparison && (
              <BenchmarkComparison
                comparison={performanceMetrics.benchmark_comparison}
                timeframe={selectedTimeframe}
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !performanceMetrics && !error && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">
              No Performance Data
            </h2>
            <p className="text-slate-400 mb-6">
              Performance metrics will appear once you have portfolio data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get start date for timeframe
function getStartDateForTimeframe(timeframe: TimeframeOption): string {
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