import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';
const PerformanceChart: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState('1M');
  const timeframes = [{
    label: '1D',
    value: '1D'
  }, {
    label: '1W',
    value: '1W'
  }, {
    label: '1M',
    value: '1M'
  }, {
    label: '3M',
    value: '3M'
  }, {
    label: '1Y',
    value: '1Y'
  }, {
    label: 'ALL',
    value: 'ALL'
  }] as any[];

  // Mock data - in real app this would come from API based on timeframe
  const chartData = [{
    date: 'Jan 1',
    value: 2600000,
    return: 0
  }, {
    date: 'Jan 8',
    value: 2620000,
    return: 0.77
  }, {
    date: 'Jan 15',
    value: 2580000,
    return: -0.77
  }, {
    date: 'Jan 22',
    value: 2650000,
    return: 1.92
  }, {
    date: 'Jan 29',
    value: 2680000,
    return: 3.08
  }, {
    date: 'Feb 5',
    value: 2720000,
    return: 4.62
  }, {
    date: 'Feb 12',
    value: 2700000,
    return: 3.85
  }, {
    date: 'Feb 19',
    value: 2750000,
    return: 5.77
  }, {
    date: 'Feb 26',
    value: 2780000,
    return: 6.92
  }, {
    date: 'Mar 5',
    value: 2820000,
    return: 8.46
  }, {
    date: 'Mar 12',
    value: 2800000,
    return: 7.69
  }, {
    date: 'Mar 19',
    value: 2847650,
    return: 9.52
  }] as any[];
  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm mb-1">{label}</p>
          <p className="text-white font-semibold">
            ${data.value.toLocaleString()}
          </p>
          <p className={`text-sm font-medium ${data.return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.return >= 0 ? '+' : ''}{data.return.toFixed(2)}%
          </p>
        </div>;
    }
    return null;
  };
  return <motion.section initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: 0.2
  }} className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Portfolio Performance</h3>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1">
          {timeframes.map(timeframe => <button key={timeframe.value} onClick={() => setSelectedTimeframe(timeframe.value)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedTimeframe === timeframe.value ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}>
              {timeframe.label}
            </button>)}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5
        }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `$${(value / 1000000).toFixed(1)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{
            fill: '#3B82F6',
            strokeWidth: 2,
            r: 4
          }} activeDot={{
            r: 6,
            stroke: '#3B82F6',
            strokeWidth: 2,
            fill: '#1E40AF'
          }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/50">
        <div className="text-center">
          <p className="text-slate-400 text-sm">Highest</p>
          <p className="text-white font-semibold">$2.82M</p>
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-sm">Lowest</p>
          <p className="text-white font-semibold">$2.58M</p>
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-sm">Average</p>
          <p className="text-white font-semibold">$2.71M</p>
        </div>
      </div>
    </motion.section>;
};
export default PerformanceChart;