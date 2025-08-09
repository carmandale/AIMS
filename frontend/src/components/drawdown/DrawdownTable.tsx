import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ArrowUpDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { DrawdownEvent, formatDuration } from '../../hooks/use-drawdown';

export interface DrawdownTableProps {
  events: DrawdownEvent[];
  isLoading?: boolean;
  className?: string;
}

type SortKey = keyof DrawdownEvent;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const DrawdownTable: React.FC<DrawdownTableProps> = ({
  events,
  isLoading = false,
  className = '',
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'start_date',
    direction: 'desc',
  });

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRecoveryStatus = (event: DrawdownEvent) => {
    if (event.is_recovered) {
      return {
        icon: CheckCircle,
        text: 'Recovered',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
      };
    } else if (event.recovery_days > 0) {
      return {
        icon: Clock,
        text: 'Recovering',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
      };
    } else {
      return {
        icon: AlertCircle,
        text: 'In Progress',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
      };
    }
  };

  const sortedEvents = useMemo(() => {
    if (!events.length) return [];

    return [...events].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let result = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        result = Number(aValue) - Number(bValue);
      }

      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [events, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-slate-500" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-400" />
    );
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          {/* Table Headers */}
          <div className="grid grid-cols-6 gap-4 pb-4 border-b border-slate-700">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-600 rounded"></div>
            ))}
          </div>
          {/* Table Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-4 border-b border-slate-800">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-4 bg-slate-700 rounded"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-slate-400">No drawdown events to display</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 pr-4">
                <button
                  onClick={() => handleSort('start_date')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Start Date</span>
                  {getSortIcon('start_date')}
                </button>
              </th>
              <th className="text-left py-3 pr-4">
                <button
                  onClick={() => handleSort('max_drawdown_percent')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Max Drawdown</span>
                  {getSortIcon('max_drawdown_percent')}
                </button>
              </th>
              <th className="text-left py-3 pr-4">
                <button
                  onClick={() => handleSort('duration_days')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Duration</span>
                  {getSortIcon('duration_days')}
                </button>
              </th>
              <th className="text-left py-3 pr-4">
                <button
                  onClick={() => handleSort('recovery_days')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Recovery</span>
                  {getSortIcon('recovery_days')}
                </button>
              </th>
              <th className="text-left py-3 pr-4">
                <button
                  onClick={() => handleSort('is_recovered')}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <span>Status</span>
                  {getSortIcon('is_recovered')}
                </button>
              </th>
              <th className="text-left py-3">
                <span className="text-sm font-medium text-slate-300">Value Range</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((event, index) => {
              const statusInfo = getRecoveryStatus(event);
              const StatusIcon = statusInfo.icon;

              return (
                <motion.tr
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 pr-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {formatDate(event.start_date)}
                      </p>
                      {event.end_date && (
                        <p className="text-xs text-slate-400">→ {formatDate(event.end_date)}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        {formatPercent(event.max_drawdown_percent)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(event.max_drawdown_amount)}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-medium text-white">
                      {formatDuration(event.duration_days)}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-medium text-white">
                      {event.recovery_days > 0 ? formatDuration(event.recovery_days) : '—'}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <div
                      className={`inline-flex items-center space-x-2 px-2 py-1 rounded-lg ${statusInfo.bg}`}
                    >
                      <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                      <span className={`text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="text-sm">
                      <p className="text-white font-medium">{formatCurrency(event.peak_value)}</p>
                      <p className="text-slate-400">→ {formatCurrency(event.trough_value)}</p>
                      {event.is_recovered && (
                        <p className="text-emerald-400 text-xs">
                          → {formatCurrency(event.recovery_value)}
                        </p>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {sortedEvents.map((event, index) => {
          const statusInfo = getRecoveryStatus(event);
          const StatusIcon = statusInfo.icon;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-white">{formatDate(event.start_date)}</p>
                  {event.end_date && (
                    <p className="text-xs text-slate-400">to {formatDate(event.end_date)}</p>
                  )}
                </div>
                <div
                  className={`inline-flex items-center space-x-2 px-2 py-1 rounded-lg ${statusInfo.bg}`}
                >
                  <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                  <span className={`text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Max Drawdown</p>
                  <p className="text-sm font-medium text-red-400">
                    {formatPercent(event.max_drawdown_percent)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(event.max_drawdown_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Duration</p>
                  <p className="text-sm font-medium text-white">
                    {formatDuration(event.duration_days)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Recovery Time</p>
                  <p className="text-sm font-medium text-white">
                    {event.recovery_days > 0 ? formatDuration(event.recovery_days) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Value Range</p>
                  <p className="text-sm font-medium text-white">
                    {formatCurrency(event.peak_value)}
                  </p>
                  <p className="text-xs text-slate-400">→ {formatCurrency(event.trough_value)}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{events.length}</p>
            <p className="text-xs text-slate-400">Total Events</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">
              {formatPercent(Math.min(...events.map(e => e.max_drawdown_percent)))}
            </p>
            <p className="text-xs text-slate-400">Worst Drawdown</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">
              {formatDuration(
                Math.round(events.reduce((sum, e) => sum + e.duration_days, 0) / events.length)
              )}
            </p>
            <p className="text-xs text-slate-400">Avg Duration</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">
              {Math.round((events.filter(e => e.is_recovered).length / events.length) * 100)}%
            </p>
            <p className="text-xs text-slate-400">Recovery Rate</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
