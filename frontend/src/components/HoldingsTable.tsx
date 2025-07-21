/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PieChart,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { usePositions, usePositionRiskContributions, Position } from '../hooks/use-portfolio';
import { useSnapTradeIntegration } from '../hooks/useSnapTradeIntegration';
import { AccountSelector } from './snaptrade/AccountSelector';

interface HoldingsTableProps {
  userId: string;
  onPositionSelect?: (position: Position) => void;
  showRiskMetrics?: boolean;
  className?: string;
}

interface SortConfig {
  key: keyof Position | 'risk_contribution';
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  broker?: string;
  assetType?: string;
  minValue?: number;
  maxValue?: number;
  search?: string;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  userId,
  onPositionSelect,
  showRiskMetrics = true,
  className = '',
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'market_value',
    direction: 'desc',
  });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: positions, isLoading, error } = usePositions();
  const { data: riskContributions } = usePositionRiskContributions(userId);
  const snapTrade = useSnapTradeIntegration();

  const filteredAndSortedPositions = useMemo(() => {
    if (!positions) return [];

    // Apply filters
    const filtered = positions.filter(position => {
      if (filterConfig.broker && position.broker !== filterConfig.broker) return false;
      if (filterConfig.assetType && position.position_type !== filterConfig.assetType) return false;
      if (filterConfig.minValue && (position.market_value || 0) < filterConfig.minValue)
        return false;
      if (filterConfig.maxValue && (position.market_value || 0) > filterConfig.maxValue)
        return false;
      if (filterConfig.search) {
        const searchTerm = filterConfig.search.toLowerCase();
        return (
          position.symbol.toLowerCase().includes(searchTerm) ||
          (position.name && position.name.toLowerCase().includes(searchTerm))
        );
      }
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'risk_contribution') {
        aValue = riskContributions?.[a.symbol]?.risk_contribution || 0;
        bValue = riskContributions?.[b.symbol]?.risk_contribution || 0;
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue === null || aValue === undefined) aValue = 0;
      if (bValue === null || bValue === undefined) bValue = 0;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [positions, filterConfig, sortConfig, riskContributions]);

  const handleSort = (key: keyof Position | 'risk_contribution') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key: keyof Position | 'risk_contribution') => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const getChangeIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  const getRiskLevel = (contribution: number) => {
    if (contribution > 0.15) return { level: 'High', color: 'text-red-400' };
    if (contribution > 0.1) return { level: 'Medium', color: 'text-yellow-400' };
    return { level: 'Low', color: 'text-green-400' };
  };

  const brokerages = useMemo(() => {
    if (!positions) return [];
    return [...new Set(positions.map(p => p.broker))];
  }, [positions]);

  const assetTypes = useMemo(() => {
    if (!positions) return [];
    return [...new Set(positions.map(p => p.position_type))];
  }, [positions]);

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
        <p className="text-red-400">Failed to load positions</p>
      </div>
    );
  }

  // Empty state when no accounts are connected
  if (!snapTrade.isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 ${className}`}
      >
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-white">Holdings</h2>
        </div>
        <div className="text-center py-12">
          <PieChart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Accounts Connected</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect your brokerage account to view your holdings and track your portfolio
            performance.
          </p>
          <button
            onClick={snapTrade.connectAccount}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Connect Account
          </button>
        </div>
      </motion.div>
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
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-white">Holdings</h2>
            {snapTrade.accounts.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">Account:</span>
                <AccountSelector />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4 text-slate-300" />
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search positions..."
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                value={filterConfig.search || ''}
                onChange={e => setFilterConfig(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Brokerage</label>
              <select
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                value={filterConfig.broker || ''}
                onChange={e =>
                  setFilterConfig(prev => ({ ...prev, broker: e.target.value || undefined }))
                }
              >
                <option value="">All Brokerages</option>
                {brokerages.map(broker => (
                  <option key={broker} value={broker}>
                    {broker}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Asset Type</label>
              <select
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                value={filterConfig.assetType || ''}
                onChange={e =>
                  setFilterConfig(prev => ({ ...prev, assetType: e.target.value || undefined }))
                }
              >
                <option value="">All Types</option>
                {assetTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Min Value</label>
              <input
                type="number"
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                value={filterConfig.minValue || ''}
                onChange={e =>
                  setFilterConfig(prev => ({
                    ...prev,
                    minValue: Number(e.target.value) || undefined,
                  }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Max Value</label>
              <input
                type="number"
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                value={filterConfig.maxValue || ''}
                onChange={e =>
                  setFilterConfig(prev => ({
                    ...prev,
                    maxValue: Number(e.target.value) || undefined,
                  }))
                }
              />
            </div>
          </motion.div>
        )}

        <div className="text-sm text-slate-400">
          Showing {filteredAndSortedPositions.length} of {positions?.length || 0} positions
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-700/50">
              <th className="p-4 font-medium">
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>Symbol</span>
                  {getSortIcon('symbol')}
                </button>
              </th>
              <th className="p-4 font-medium">
                <button
                  onClick={() => handleSort('broker')}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>Brokerage</span>
                  {getSortIcon('broker')}
                </button>
              </th>
              <th className="p-4 font-medium">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>Quantity</span>
                  {getSortIcon('quantity')}
                </button>
              </th>
              <th className="p-4 font-medium">
                <button
                  onClick={() => handleSort('current_price')}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>Price</span>
                  {getSortIcon('current_price')}
                </button>
              </th>
              <th className="p-4 font-medium">
                <button
                  onClick={() => handleSort('market_value')}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>Market Value</span>
                  {getSortIcon('market_value')}
                </button>
              </th>
              <th className="p-4 font-medium">
                <button
                  onClick={() => handleSort('unrealized_pnl')}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>P&L</span>
                  {getSortIcon('unrealized_pnl')}
                </button>
              </th>
              {showRiskMetrics && (
                <th className="p-4 font-medium">
                  <button
                    onClick={() => handleSort('risk_contribution')}
                    className="flex items-center space-x-1 hover:text-white transition-colors"
                  >
                    <span>Risk</span>
                    {getSortIcon('risk_contribution')}
                  </button>
                </th>
              )}
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPositions.map((position, index) => {
              const riskContribution = riskContributions?.[position.symbol]?.risk_contribution || 0;
              const riskLevel = getRiskLevel(riskContribution);
              const ChangeIcon = getChangeIcon(position.unrealized_pnl || 0);

              return (
                <motion.tr
                  key={position.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {position.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{position.symbol}</div>
                        <div className="text-sm text-slate-400">{position.position_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300">
                      {position.broker}
                    </span>
                  </td>
                  <td className="p-4 text-white">{position.quantity}</td>
                  <td className="p-4 text-white">{formatCurrency(position.current_price)}</td>
                  <td className="p-4 text-white font-medium">
                    {formatCurrency(position.market_value || 0)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <ChangeIcon
                        className={`w-4 h-4 ${getChangeColor(position.unrealized_pnl || 0)}`}
                      />
                      <span
                        className={`font-medium ${getChangeColor(position.unrealized_pnl || 0)}`}
                      >
                        {formatCurrency(Math.abs(position.unrealized_pnl || 0))}
                      </span>
                      <span className={`text-sm ${getChangeColor(position.unrealized_pnl || 0)}`}>
                        ({formatPercent(position.unrealized_pnl_percent || 0)})
                      </span>
                    </div>
                  </td>
                  {showRiskMetrics && (
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${riskLevel.color}`}>
                          {riskLevel.level}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(riskContribution * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="p-4">
                    <button
                      onClick={() => onPositionSelect?.(position)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-slate-300" />
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {filteredAndSortedPositions.length === 0 && (
          <div className="text-center py-8">
            <PieChart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No positions found matching your criteria</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
