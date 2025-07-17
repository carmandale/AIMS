/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Target, 
  AlertTriangle,
  BarChart3,
  Activity,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { 
  usePerformanceMetrics, 
  useRiskMetrics, 
  PerformanceMetrics, 
  RiskMetrics 
} from '../hooks/use-portfolio';

interface PerformanceChartProps {
  userId: string;
  className?: string;
}

type TimeframeOption = 'daily' | 'weekly' | 'monthly' | 'ytd' | 'all';
type BenchmarkOption = 'SPY' | 'QQQ' | 'BTC' | 'VTI';

const timeframeOptions = [
  { value: 'daily', label: '1D' },
  { value: 'weekly', label: '1W' },
  { value: 'monthly', label: '1M' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'ALL' }
];

const benchmarkOptions = [
  { value: 'SPY', label: 'S&P 500' },
  { value: 'QQQ', label: 'NASDAQ' },
  { value: 'VTI', label: 'Total Stock Market' },
  { value: 'BTC', label: 'Bitcoin' }
];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  userId,
  className = ''
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('ytd');
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkOption>('SPY');
  const [showRiskMetrics, setShowRiskMetrics] = useState(false);
  
  const { data: performance, isLoading: performanceLoading, error: performanceError } = 
    usePerformanceMetrics(userId, selectedTimeframe, selectedBenchmark);
  
  const { data: riskMetrics, isLoading: riskLoading, error: riskError } = 
    useRiskMetrics(userId, selectedTimeframe);
  
  const isLoading = performanceLoading || riskLoading;
  const error = performanceError || riskError;
  
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };
  
  const getChangeIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };
  
  const getRiskColor = (value: number, thresholds: { low: number; high: number }) => {
    if (value <= thresholds.low) return 'text-green-400';
    if (value >= thresholds.high) return 'text-red-400';
    return 'text-yellow-400';
  };
  
  const getPerformanceAnalysis = (performance: PerformanceMetrics, riskMetrics: RiskMetrics) => {
    const analysis: Array<{
      type: string;
      message: string;
      icon: React.ComponentType<any>;
      color: string;
    }> = [];
    
    if (performance.percent_change > 0) {
      analysis.push({
        type: 'positive',
        message: `Portfolio has gained ${formatPercent(performance.percent_change)} over the ${selectedTimeframe} period`,
        icon: TrendingUp,
        color: 'text-green-400'
      });
    } else {
      analysis.push({
        type: 'negative',
        message: `Portfolio has lost ${formatPercent(Math.abs(performance.percent_change))} over the ${selectedTimeframe} period`,
        icon: TrendingDown,
        color: 'text-red-400'
      });
    }
    
    if (performance.benchmark_comparison?.outperformed) {
      analysis.push({
        type: 'positive',
        message: `Outperformed ${selectedBenchmark} by ${formatPercent(performance.benchmark_comparison.relative_performance)}`,
        icon: Target,
        color: 'text-green-400'
      });
    } else if (performance.benchmark_comparison) {
      analysis.push({
        type: 'negative',
        message: `Underperformed ${selectedBenchmark} by ${formatPercent(Math.abs(performance.benchmark_comparison.relative_performance))}`,
        icon: Target,
        color: 'text-red-400'
      });
    }
    
    if (riskMetrics.volatility > 25) {
      analysis.push({
        type: 'warning',
        message: `High volatility (${riskMetrics.volatility.toFixed(1)}%) indicates significant price swings`,
        icon: Activity,
        color: 'text-yellow-400'
      });
    }
    
    if (riskMetrics.sharpe_ratio > 1) {
      analysis.push({
        type: 'positive',
        message: `Excellent risk-adjusted returns (Sharpe ratio: ${riskMetrics.sharpe_ratio.toFixed(2)})`,
        icon: Shield,
        color: 'text-green-400'
      });
    } else if (riskMetrics.sharpe_ratio < 0.5) {
      analysis.push({
        type: 'warning',
        message: `Low risk-adjusted returns (Sharpe ratio: ${riskMetrics.sharpe_ratio.toFixed(2)})`,
        icon: Shield,
        color: 'text-yellow-400'
      });
    }
    
    return analysis;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">Failed to load performance data</p>
      </div>
    );
  }
  
  if (!performance || !riskMetrics) {
    return null;
  }
  
  const ChangeIcon = getChangeIcon(performance.percent_change);
  const analysis = getPerformanceAnalysis(performance, riskMetrics);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
            <BarChart3 className="w-6 h-6" />
            <span>Performance Analysis</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRiskMetrics(!showRiskMetrics)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                showRiskMetrics 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Risk Metrics
            </button>
          </div>
        </div>
        
        {/* Timeframe and Benchmark Selectors */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div className="flex bg-slate-800 rounded-lg p-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeframe(option.value as TimeframeOption)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedTimeframe === option.value
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-slate-400" />
            <select
              value={selectedBenchmark}
              onChange={(e) => setSelectedBenchmark(e.target.value as BenchmarkOption)}
              className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {benchmarkOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Performance Summary */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Return</p>
                <div className="flex items-center space-x-2">
                  <ChangeIcon className={`w-5 h-5 ${getChangeColor(performance.percent_change)}`} />
                  <span className={`text-2xl font-bold ${getChangeColor(performance.percent_change)}`}>
                    {formatPercent(performance.percent_change)}
                  </span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Absolute Change</p>
                <p className={`text-2xl font-bold ${getChangeColor(performance.absolute_change)}`}>
                  {formatCurrency(performance.absolute_change)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Volatility</p>
                <p className={`text-2xl font-bold ${getRiskColor(riskMetrics.volatility, { low: 15, high: 25 })}`}>
                  {riskMetrics.volatility.toFixed(1)}%
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Sharpe Ratio</p>
                <p className={`text-2xl font-bold ${getRiskColor(riskMetrics.sharpe_ratio, { low: 0.5, high: 1.5 })}`}>
                  {riskMetrics.sharpe_ratio.toFixed(2)}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
        
        {/* Benchmark Comparison */}
        {performance.benchmark_comparison && (
          <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Benchmark Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400">Portfolio Return</p>
                <p className={`text-lg font-semibold ${getChangeColor(performance.benchmark_comparison.portfolio_return)}`}>
                  {formatPercent(performance.benchmark_comparison.portfolio_return)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{selectedBenchmark} Return</p>
                <p className={`text-lg font-semibold ${getChangeColor(performance.benchmark_comparison.benchmark_return)}`}>
                  {formatPercent(performance.benchmark_comparison.benchmark_return)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Relative Performance</p>
                <p className={`text-lg font-semibold ${getChangeColor(performance.benchmark_comparison.relative_performance)}`}>
                  {formatPercent(performance.benchmark_comparison.relative_performance)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Risk Metrics */}
      {showRiskMetrics && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-6 border-b border-slate-700/50"
        >
          <h3 className="text-lg font-medium text-white mb-4">Risk Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">Max Drawdown</p>
              <p className="text-xl font-bold text-red-400">
                -{riskMetrics.max_drawdown.toFixed(2)}%
              </p>
              {riskMetrics.max_drawdown_start && (
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(riskMetrics.max_drawdown_start).toLocaleDateString()} - 
                  {riskMetrics.max_drawdown_end && new Date(riskMetrics.max_drawdown_end).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {riskMetrics.sortino_ratio && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Sortino Ratio</p>
                <p className={`text-xl font-bold ${getRiskColor(riskMetrics.sortino_ratio, { low: 0.5, high: 1.5 })}`}>
                  {riskMetrics.sortino_ratio.toFixed(2)}
                </p>
              </div>
            )}
            
            {riskMetrics.var_95 && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">VaR (95%)</p>
                <p className="text-xl font-bold text-red-400">
                  -{riskMetrics.var_95.toFixed(2)}%
                </p>
              </div>
            )}
            
            {riskMetrics.beta && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Beta</p>
                <p className={`text-xl font-bold ${getRiskColor(Math.abs(riskMetrics.beta - 1), { low: 0.2, high: 0.5 })}`}>
                  {riskMetrics.beta.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Performance Analysis */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-white mb-4">Analysis & Insights</h3>
        <div className="space-y-3">
          {analysis.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-lg"
            >
              <item.icon className={`w-5 h-5 mt-0.5 ${item.color}`} />
              <div className="flex-1">
                <p className="text-sm text-slate-300">{item.message}</p>
              </div>
            </motion.div>
          ))}
          
          {analysis.length === 0 && (
            <div className="flex items-center space-x-2 p-3 bg-slate-800/30 rounded-lg">
              <Info className="w-5 h-5 text-blue-400" />
              <p className="text-sm text-slate-300">
                Performance data analysis is being processed...
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};