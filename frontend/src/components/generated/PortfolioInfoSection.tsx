/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Briefcase, TrendingUp } from 'lucide-react';
interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  change: number;
  changePercent: number;
}
interface AllocationData {
  name: string;
  value: number;
  color: string;
}
const PortfolioInfoSection: React.FC = () => {
  const holdings: Holding[] = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 450,
      price: 182.52,
      value: 82134.0,
      change: 1247.5,
      changePercent: 1.54,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      quantity: 200,
      price: 424.89,
      value: 84978.0,
      change: -892.3,
      changePercent: -1.04,
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      quantity: 150,
      price: 138.21,
      value: 20731.5,
      change: 456.75,
      changePercent: 2.25,
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      quantity: 125,
      price: 201.29,
      value: 25161.25,
      change: -1234.8,
      changePercent: -4.68,
    },
  ];
  const allocationData: AllocationData[] = [
    {
      name: 'Technology',
      value: 65,
      color: '#3B82F6',
    },
    {
      name: 'Healthcare',
      value: 15,
      color: '#10B981',
    },
    {
      name: 'Finance',
      value: 12,
      color: '#F59E0B',
    },
    {
      name: 'Energy',
      value: 5,
      color: '#EF4444',
    },
    {
      name: 'Other',
      value: 3,
      color: '#8B5CF6',
    },
  ];
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };
  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{data.name}</p>
          <p className="text-slate-300">{data.value}%</p>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="space-y-6">
      {/* Holdings */}
      <motion.section
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.4,
        }}
        className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Briefcase className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Top Holdings</h3>
        </div>

        <div className="space-y-4">
          {holdings.map((holding, index) => (
            <motion.div
              key={holding.symbol}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.1 * index,
              }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-white">{holding.symbol}</h4>
                  <span className="text-white font-semibold">{formatCurrency(holding.value)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">{holding.quantity} shares</p>
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs font-medium ${getChangeColor(holding.change)}`}>
                      {formatCurrency(Math.abs(holding.change))}
                    </span>
                    <span className={`text-xs ${getChangeColor(holding.change)}`}>
                      ({formatPercent(holding.changePercent)})
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Asset Allocation */}
      <motion.section
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.5,
        }}
        className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
      >
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Asset Allocation</h3>
        </div>

        {/* Pie Chart */}
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {allocationData.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
                <span className="text-sm text-slate-300">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-white">{item.value}%</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
};
export default PortfolioInfoSection;
