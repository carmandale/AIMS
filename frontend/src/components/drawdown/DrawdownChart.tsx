import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Eye, EyeOff } from 'lucide-react';
import { DrawdownChartData, DrawdownEvent } from '../../hooks/use-drawdown';

export interface DrawdownChartProps {
  data: DrawdownChartData[];
  events: DrawdownEvent[];
  isLoading?: boolean;
  className?: string;
}

interface ChartVisibility {
  portfolioValue: boolean;
  drawdownPercent: boolean;
  underwaterCurve: boolean;
}

export const DrawdownChart: React.FC<DrawdownChartProps> = ({
  data,
  events,
  isLoading = false,
  className = '',
}) => {
  const [visibility, setVisibility] = useState<ChartVisibility>({
    portfolioValue: true,
    drawdownPercent: true,
    underwaterCurve: false,
  });

  const toggleVisibility = (key: keyof ChartVisibility) => {
    setVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
      name: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-medium mb-2">{formatDate(label || '')}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-400 text-sm">{entry.name}:</span>
              </div>
              <span className="text-white text-sm font-medium">
                {entry.dataKey === 'portfolio_value'
                  ? formatCurrency(entry.value)
                  : formatPercent(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getDrawdownEventMarkers = () => {
    return events.map(event => ({
      x: event.start_date,
      label: `${formatPercent(event.max_drawdown_percent)} drawdown`,
    }));
  };

  if (isLoading) {
    return (
      <div className={`h-96 flex items-center justify-center ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-48 mb-4"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`h-96 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <LineChart className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400">No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-4 ${className}`}
    >
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-300">Show:</span>

          <button
            onClick={() => toggleVisibility('portfolioValue')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
              visibility.portfolioValue
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {visibility.portfolioValue ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span>Portfolio Value</span>
          </button>

          <button
            onClick={() => toggleVisibility('drawdownPercent')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
              visibility.drawdownPercent
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {visibility.drawdownPercent ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span>Drawdown %</span>
          </button>

          <button
            onClick={() => toggleVisibility('underwaterCurve')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
              visibility.underwaterCurve
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {visibility.underwaterCurve ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span>Underwater Curve</span>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#64748b"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />

            {/* Dual Y-Axes for different scales */}
            {visibility.portfolioValue && (
              <YAxis
                yAxisId="value"
                orientation="left"
                tickFormatter={formatCurrency}
                stroke="#3b82f6"
                fontSize={12}
              />
            )}

            {(visibility.drawdownPercent || visibility.underwaterCurve) && (
              <YAxis
                yAxisId="percent"
                orientation="right"
                tickFormatter={formatPercent}
                stroke="#ef4444"
                fontSize={12}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Zero reference line for drawdowns */}
            {(visibility.drawdownPercent || visibility.underwaterCurve) && (
              <ReferenceLine yAxisId="percent" y={0} stroke="#64748b" strokeDasharray="2 2" />
            )}

            {/* Portfolio Value Line */}
            {visibility.portfolioValue && (
              <Line
                yAxisId="value"
                type="monotone"
                dataKey="portfolio_value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Portfolio Value"
                connectNulls={false}
              />
            )}

            {/* Drawdown Percentage Line */}
            {visibility.drawdownPercent && (
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="drawdown_percent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Drawdown %"
                connectNulls={false}
              />
            )}

            {/* Underwater Curve (filled area) */}
            {visibility.underwaterCurve && (
              <Area
                yAxisId="percent"
                type="monotone"
                dataKey="underwater_curve"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.1}
                name="Underwater Curve"
              />
            )}

            {/* Drawdown Event Markers */}
            {events.map((event, index) => (
              <ReferenceLine
                key={`event-${index}`}
                x={event.start_date}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `${formatPercent(event.max_drawdown_percent)}`,
                  position: 'top',
                  style: { fontSize: '10px', fill: '#f59e0b' },
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-slate-400">
            Portfolio Value: Tracks total portfolio worth over time
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-slate-400">Drawdown %: Current decline from peak value</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-slate-400">
            Underwater Curve: Cumulative drawdown visualization
          </span>
        </div>
      </div>

      {/* Drawdown Events Summary */}
      {events.length > 0 && (
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Major Drawdown Events</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.slice(0, 6).map((event, index) => (
              <div key={event.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{formatDate(event.start_date)}</span>
                <span className="text-red-400 font-medium">
                  {formatPercent(event.max_drawdown_percent)}
                </span>
              </div>
            ))}
          </div>
          {events.length > 6 && (
            <p className="text-xs text-slate-500 mt-2">... and {events.length - 6} more events</p>
          )}
        </div>
      )}
    </motion.div>
  );
};
