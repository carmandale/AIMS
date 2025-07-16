import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, TrendingUp, TrendingDown, Clock } from 'lucide-react';
interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  date: string;
  time: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}
const RecentTradesTable: React.FC = () => {
  const [sortField, setSortField] = React.useState<keyof Trade>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const trades: Trade[] = [{
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'BUY',
    quantity: 150,
    price: 182.52,
    total: 27378.00,
    date: '2024-03-19',
    time: '14:32',
    status: 'COMPLETED'
  }, {
    id: '2',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'SELL',
    quantity: 75,
    price: 201.29,
    total: 15096.75,
    date: '2024-03-19',
    time: '13:45',
    status: 'COMPLETED'
  }, {
    id: '3',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    type: 'BUY',
    quantity: 100,
    price: 424.89,
    total: 42489.00,
    date: '2024-03-18',
    time: '16:20',
    status: 'COMPLETED'
  }, {
    id: '4',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'BUY',
    quantity: 50,
    price: 138.21,
    total: 6910.50,
    date: '2024-03-18',
    time: '11:15',
    status: 'PENDING'
  }, {
    id: '5',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    type: 'SELL',
    quantity: 25,
    price: 155.85,
    total: 3896.25,
    date: '2024-03-17',
    time: '09:30',
    status: 'COMPLETED'
  }];
  const handleSort = (field: keyof Trade) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  const sortedTrades = [...trades].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-emerald-400 bg-emerald-400/10';
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'FAILED':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };
  return <motion.section initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: 0.3
  }} className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Recent Trades</h3>
        </div>
        <span className="text-sm text-slate-400">{trades.length} trades</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-2">
                <button onClick={() => handleSort('symbol')} className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors">
                  <span className="text-sm font-medium">Asset</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left py-3 px-2">
                <button onClick={() => handleSort('type')} className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors">
                  <span className="text-sm font-medium">Type</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button onClick={() => handleSort('quantity')} className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors ml-auto">
                  <span className="text-sm font-medium">Quantity</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button onClick={() => handleSort('price')} className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors ml-auto">
                  <span className="text-sm font-medium">Price</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button onClick={() => handleSort('total')} className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors ml-auto">
                  <span className="text-sm font-medium">Total</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-center py-3 px-2">
                <span className="text-sm font-medium text-slate-300">Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade, index) => <motion.tr key={trade.id} initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: index * 0.05
          }} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-2">
                  <div>
                    <p className="font-semibold text-white">{trade.symbol}</p>
                    <p className="text-xs text-slate-400">{trade.name}</p>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center space-x-2">
                    {trade.type === 'BUY' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    <span className={`font-medium ${trade.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.type}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-2 text-right text-white font-medium">
                  {trade.quantity.toLocaleString()}
                </td>
                <td className="py-4 px-2 text-right text-white font-medium">
                  {formatCurrency(trade.price)}
                </td>
                <td className="py-4 px-2 text-right text-white font-semibold">
                  {formatCurrency(trade.total)}
                </td>
                <td className="py-4 px-2 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                    {trade.status}
                  </span>
                </td>
              </motion.tr>)}
          </tbody>
        </table>
      </div>
    </motion.section>;
};
export default RecentTradesTable;