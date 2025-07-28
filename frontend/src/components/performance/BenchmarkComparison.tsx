import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Award,
  AlertCircle,
  Info,
} from 'lucide-react';

export interface BenchmarkComparisonProps {
  comparison: {
    benchmark_symbol: string;
    benchmark_return: number;
    relative_performance: number;
    outperformed: boolean;
  };
  timeframe: string;
  className?: string;
}

interface ComparisonMetric {
  label: string;
  portfolioValue: number;
  benchmarkValue: number;
  difference: number;
  format: 'percent' | 'ratio' | 'currency';
}

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({
  comparison,
  timeframe,
  className = '',
}) => {
  const { benchmark_symbol, benchmark_return, relative_performance, outperformed } = comparison;

  const portfolioReturn = benchmark_return + relative_performance;

  const formatValue = (value: number, format: 'percent' | 'ratio' | 'currency') => {
    switch (format) {
      case 'percent':
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      default:
        return value.toString();
    }
  };

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case 'daily':
        return '1D';
      case 'weekly':
        return '1W';
      case 'monthly':
        return '1M';
      case 'ytd':
        return 'YTD';
      case '1y':
        return '1Y';
      case '3y':
        return '3Y';
      case '5y':
        return '5Y';
      case 'all':
        return 'All Time';
      default:
        return timeframe.toUpperCase();
    }
  };

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const getPerformanceIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  const getRelativePerformanceIcon = (outperformed: boolean) => {
    return outperformed ? ArrowUpRight : ArrowDownRight;
  };

  const getBenchmarkName = (symbol: string) => {
    switch (symbol) {
      case 'SPY':
        return 'S&P 500';
      case 'QQQ':
        return 'NASDAQ-100';
      case 'VTI':
        return 'Total Stock Market';
      case 'IWM':
        return 'Russell 2000';
      case 'BTC':
        return 'Bitcoin';
      default:
        return symbol;
    }
  };

  const getPerformanceInsight = () => {
    const absRelativePerf = Math.abs(relative_performance);

    if (absRelativePerf < 0.5) {
      return {
        type: 'neutral',
        message: `Your portfolio performance is closely aligned with ${benchmark_symbol}`,
        icon: Info,
        color: 'text-blue-400',
      };
    } else if (outperformed) {
      if (absRelativePerf > 5) {
        return {
          type: 'excellent',
          message: `Exceptional outperformance! You're significantly beating ${benchmark_symbol}`,
          icon: Award,
          color: 'text-emerald-400',
        };
      }
      return {
        type: 'good',
        message: `Good performance! You're outpacing ${benchmark_symbol}`,
        icon: TrendingUp,
        color: 'text-emerald-400',
      };
    } else {
      if (absRelativePerf > 5) {
        return {
          type: 'concerning',
          message: `Consider reviewing your strategy - significant underperformance vs ${benchmark_symbol}`,
          icon: AlertCircle,
          color: 'text-red-400',
        };
      }
      return {
        type: 'caution',
        message: `Room for improvement - trailing ${benchmark_symbol}`,
        icon: TrendingDown,
        color: 'text-yellow-400',
      };
    }
  };

  const PortfolioIcon = getPerformanceIcon(portfolioReturn);
  const BenchmarkIcon = getPerformanceIcon(benchmark_return);
  const RelativeIcon = getRelativePerformanceIcon(outperformed);
  const insight = getPerformanceInsight();
  const InsightIcon = insight.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Benchmark Comparison</h3>
              <p className="text-slate-400">
                vs {getBenchmarkName(benchmark_symbol)} • {getTimeframeLabel(timeframe)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <RelativeIcon
              className={`w-6 h-6 ${outperformed ? 'text-emerald-400' : 'text-red-400'}`}
            />
            <span
              className={`text-lg font-bold ${outperformed ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {formatValue(relative_performance, 'percent')}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="p-6">
        {/* Main Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Portfolio Performance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">Your Portfolio</span>
              </div>
              <PortfolioIcon className={`w-5 h-5 ${getPerformanceColor(portfolioReturn)}`} />
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${getPerformanceColor(portfolioReturn)}`}>
                {formatValue(portfolioReturn, 'percent')}
              </p>
              <p className="text-xs text-slate-400">{getTimeframeLabel(timeframe)} Return</p>
            </div>
          </motion.div>

          {/* Benchmark Performance */}
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Target className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">{benchmark_symbol}</span>
              </div>
              <BenchmarkIcon className={`w-5 h-5 ${getPerformanceColor(benchmark_return)}`} />
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${getPerformanceColor(benchmark_return)}`}>
                {formatValue(benchmark_return, 'percent')}
              </p>
              <p className="text-xs text-slate-400">Benchmark Return</p>
            </div>
          </motion.div>

          {/* Relative Performance */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-xl p-4 border ${
              outperformed
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`p-2 rounded-lg ${
                    outperformed ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}
                >
                  <RelativeIcon
                    className={`w-4 h-4 ${outperformed ? 'text-emerald-400' : 'text-red-400'}`}
                  />
                </div>
                <span className="text-sm font-medium text-slate-300">
                  {outperformed ? 'Outperformance' : 'Underperformance'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p
                className={`text-2xl font-bold ${
                  outperformed ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {outperformed ? '+' : ''}
                {formatValue(relative_performance, 'percent')}
              </p>
              <p className="text-xs text-slate-400">Relative to {benchmark_symbol}</p>
            </div>
          </motion.div>
        </div>

        {/* Performance Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30"
        >
          <div className="flex items-start space-x-3">
            <div
              className={`p-2 rounded-lg ${
                insight.type === 'excellent'
                  ? 'bg-emerald-500/10'
                  : insight.type === 'good'
                    ? 'bg-emerald-500/10'
                    : insight.type === 'neutral'
                      ? 'bg-blue-500/10'
                      : insight.type === 'caution'
                        ? 'bg-yellow-500/10'
                        : 'bg-red-500/10'
              }`}
            >
              <InsightIcon className={`w-5 h-5 ${insight.color}`} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white mb-1">Performance Insight</h4>
              <p className="text-sm text-slate-300">{insight.message}</p>
            </div>
          </div>
        </motion.div>

        {/* Detailed Breakdown */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Performance Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Portfolio Return</span>
                <span className={`text-sm font-medium ${getPerformanceColor(portfolioReturn)}`}>
                  {formatValue(portfolioReturn, 'percent')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{benchmark_symbol} Return</span>
                <span className={`text-sm font-medium ${getPerformanceColor(benchmark_return)}`}>
                  {formatValue(benchmark_return, 'percent')}
                </span>
              </div>
              <div className="border-t border-slate-600/50 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Alpha</span>
                  <span
                    className={`text-sm font-semibold ${
                      outperformed ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatValue(relative_performance, 'percent')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Key Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Timeframe</span>
                <span className="text-sm font-medium text-white">
                  {getTimeframeLabel(timeframe)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Benchmark</span>
                <span className="text-sm font-medium text-white">
                  {getBenchmarkName(benchmark_symbol)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Status</span>
                <span
                  className={`text-sm font-medium ${
                    outperformed ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {outperformed ? 'Outperforming' : 'Underperforming'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
