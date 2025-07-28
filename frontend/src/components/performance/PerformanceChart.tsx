import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  EyeOff,
  ZoomIn,
  Calendar,
  Info,
} from 'lucide-react';
import { HistoricalPerformanceData } from '../../hooks/use-portfolio';

export interface PerformanceChartProps {
  historicalData: HistoricalPerformanceData[];
  timeframe: string;
  benchmark?: string;
  isLoading?: boolean;
  className?: string;
}

type ChartType = 'line' | 'area' | 'cumulative';
type ViewMode = 'value' | 'returns' | 'both';

interface ChartDataPoint {
  date: string;
  portfolio_value: number;
  daily_return: number;
  cumulative_return: number;
  benchmark_value?: number;
  benchmark_return?: number;
  formattedDate: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-xl">
        <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-400 text-sm">{entry.name}</span>
            </div>
            <span className="text-white font-medium">
              {entry.name.includes('Return') || entry.name.includes('%')
                ? `${entry.value >= 0 ? '+' : ''}${entry.value.toFixed(2)}%`
                : new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  historicalData,
  timeframe,
  benchmark,
  isLoading,
  className = '',
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('value');
  const [showBenchmark, setShowBenchmark] = useState(true);

  // Process and format data for charts
  const chartData = useMemo(() => {
    return historicalData.map((item) => ({
      ...item,
      formattedDate: formatDateForTimeframe(item.date, timeframe),
      cumulative_return: item.cumulative_return * 100, // Convert to percentage
      daily_return: item.daily_return * 100, // Convert to percentage
      benchmark_return: item.benchmark_return ? item.benchmark_return * 100 : undefined,
    }));
  }, [historicalData, timeframe]);

  // Calculate performance statistics
  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const startValue = chartData[0].portfolio_value;
    const endValue = chartData[chartData.length - 1].portfolio_value;
    const totalReturn = ((endValue - startValue) / startValue) * 100;
    
    const dailyReturns = chartData.map(d => d.daily_return).filter(r => r !== 0);
    const volatility = calculateVolatility(dailyReturns);
    
    const positiveReturns = dailyReturns.filter(r => r > 0).length;
    const winRate = (positiveReturns / dailyReturns.length) * 100;

    return {
      totalReturn,
      volatility,
      winRate,
      bestDay: Math.max(...dailyReturns),
      worstDay: Math.min(...dailyReturns),
    };
  }, [chartData]);

  const getChartTypeIcon = (type: ChartType) => {
    switch (type) {
      case 'line': return BarChart3;
      case 'area': return TrendingUp;
      case 'cumulative': return Calendar;
      default: return BarChart3;
    }
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const portfolioColor = '#3B82F6'; // Blue
    const benchmarkColor = '#EF4444'; // Red
    const positiveColor = '#10B981'; // Emerald
    const negativeColor = '#EF4444'; // Red

    if (viewMode === 'returns') {
      // Show daily returns as bar chart
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="daily_return"
              stroke={portfolioColor}
              fill={portfolioColor}
              fillOpacity={0.1}
              name="Daily Return"
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    if (viewMode === 'both') {
      // Show both portfolio value and cumulative returns
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              yAxisId="value"
              orientation="left"
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              yAxisId="percent"
              orientation="right"
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Line
              yAxisId="value"
              type="monotone"
              dataKey="portfolio_value"
              stroke={portfolioColor}
              strokeWidth={2}
              dot={false}
              name="Portfolio Value"
            />
            <Line
              yAxisId="percent"
              type="monotone"
              dataKey="cumulative_return"
              stroke={positiveColor}
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="Cumulative Return %"
            />
            
            {showBenchmark && benchmark && (
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="benchmark_return"
                stroke={benchmarkColor}
                strokeWidth={1}
                dot={false}
                strokeDasharray="3 3"
                name={`${benchmark} Return %`}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // Default: Portfolio value chart
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="portfolio_value"
              stroke={portfolioColor}
              fill={portfolioColor}
              fillOpacity={0.1}
              name="Portfolio Value"
            />
            {showBenchmark && benchmark && (
              <Area
                type="monotone"
                dataKey="benchmark_value"
                stroke={benchmarkColor}
                fill={benchmarkColor}
                fillOpacity={0.05}
                name={`${benchmark} Value`}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Line chart (default)
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="formattedDate" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="portfolio_value"
            stroke={portfolioColor}
            strokeWidth={2}
            dot={false}
            name="Portfolio Value"
          />
          {showBenchmark && benchmark && (
            <Line
              type="monotone"
              dataKey="benchmark_value"
              stroke={benchmarkColor}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="5 5"
              name={`${benchmark} Value`}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded mb-4 w-1/3"></div>
          <div className="h-96 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No performance data available for the selected timeframe</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Performance Chart</h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {[
                { value: 'value', label: 'Value' },
                { value: 'returns', label: 'Returns' },
                { value: 'both', label: 'Both' },
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setViewMode(mode.value as ViewMode)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode.value
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Chart Type Toggle */}
            {viewMode === 'value' && (
              <div className="flex bg-slate-800 rounded-lg p-1">
                {[
                  { value: 'line', label: 'Line' },
                  { value: 'area', label: 'Area' },
                ].map((type) => {
                  const Icon = getChartTypeIcon(type.value as ChartType);
                  return (
                    <button
                      key={type.value}
                      onClick={() => setChartType(type.value as ChartType)}
                      className={`p-2 rounded-md transition-colors ${
                        chartType === type.value
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title={`${type.label} Chart`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Benchmark Toggle */}
            {benchmark && (
              <button
                onClick={() => setShowBenchmark(!showBenchmark)}
                className={`p-2 rounded-lg transition-colors ${
                  showBenchmark
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={`${showBenchmark ? 'Hide' : 'Show'} Benchmark`}
              >
                {showBenchmark ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Performance Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-400">Total Return</p>
              <p className={`text-sm font-semibold ${
                stats.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Volatility</p>
              <p className="text-sm font-semibold text-slate-300">
                {stats.volatility.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Win Rate</p>
              <p className="text-sm font-semibold text-slate-300">
                {stats.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Best Day</p>
              <p className="text-sm font-semibold text-emerald-400">
                +{stats.bestDay.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Worst Day</p>
              <p className="text-sm font-semibold text-red-400">
                {stats.worstDay.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-6">
        {renderChart()}
      </div>

      {/* Chart Info */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Info className="w-4 h-4" />
          <span>
            Showing {chartData.length} data points over {timeframe.toUpperCase()} period
            {benchmark && showBenchmark && ` with ${benchmark} benchmark`}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// Helper functions
function formatDateForTimeframe(dateString: string, timeframe: string): string {
  const date = new Date(dateString);
  
  switch (timeframe) {
    case 'daily':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case 'weekly':
    case 'monthly':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'ytd':
    case '1y':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '3y':
    case '5y':
    case 'all':
      return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const dailyVolatility = Math.sqrt(variance);
  
  // Annualize volatility (assuming 252 trading days)
  return dailyVolatility * Math.sqrt(252);
}