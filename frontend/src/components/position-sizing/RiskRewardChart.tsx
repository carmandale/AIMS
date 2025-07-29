import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { RiskRewardChartData } from '../../types/position-sizing';

interface RiskRewardChartProps {
  entryPrice: number;
  stopLoss: number;
  targetPrice?: number;
  positionSize: number;
  className?: string;
}

export const RiskRewardChart: React.FC<RiskRewardChartProps> = ({
  entryPrice,
  stopLoss,
  targetPrice,
  positionSize,
  className = '',
}) => {
  // Generate chart data points
  const generateChartData = (): RiskRewardChartData[] => {
    if (!entryPrice || !stopLoss || positionSize <= 0) return [];

    const priceRange = entryPrice * 0.3; // 30% price range around entry
    const minPrice = Math.max(0.01, entryPrice - priceRange);
    const maxPrice = entryPrice + priceRange;
    const points = 50;
    const step = (maxPrice - minPrice) / points;

    const data: RiskRewardChartData[] = [];

    for (let i = 0; i <= points; i++) {
      const price = minPrice + (step * i);
      const profitLoss = (price - entryPrice) * positionSize;
      
      let zone: 'loss' | 'breakeven' | 'profit' = 'breakeven';
      if (profitLoss < 0) zone = 'loss';
      else if (profitLoss > 0) zone = 'profit';

      data.push({
        price: Math.round(price * 100) / 100,
        profit_loss: Math.round(profitLoss * 100) / 100,
        zone,
      });
    }

    return data;
  };

  const chartData = generateChartData();
  
  if (!chartData.length) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-500">Enter position parameters to view risk/reward profile</p>
      </div>
    );
  }

  const maxLoss = Math.min(...chartData.map(d => d.profit_loss));
  const maxProfit = Math.max(...chartData.map(d => d.profit_loss));
  const riskAmount = Math.abs((stopLoss - entryPrice) * positionSize);
  const rewardAmount = targetPrice ? (targetPrice - entryPrice) * positionSize : maxProfit;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Risk/Reward Profile</h4>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Risk: ${Math.abs(riskAmount).toLocaleString()}</span>
          {targetPrice && (
            <span>Reward: ${rewardAmount.toLocaleString()}</span>
          )}
          {targetPrice && (
            <span>R:R = 1:{(rewardAmount / Math.abs(riskAmount)).toFixed(2)}</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="price" 
            type="number"
            scale="linear"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            fontSize={11}
            stroke="#666"
          />
          <YAxis 
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            fontSize={11}
            stroke="#666"
          />
          
          {/* Profit/Loss area */}
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          
          <Area
            type="monotone"
            dataKey="profit_loss"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#profitGradient)"
          />
          
          {/* Reference lines */}
          <ReferenceLine 
            x={entryPrice} 
            stroke="#6b7280" 
            strokeDasharray="5 5"
            label={{ value: 'Entry', position: 'top', fontSize: 11 }}
          />
          <ReferenceLine 
            x={stopLoss} 
            stroke="#ef4444" 
            strokeDasharray="3 3"
            label={{ value: 'Stop', position: 'top', fontSize: 11 }}
          />
          {targetPrice && (
            <ReferenceLine 
              x={targetPrice} 
              stroke="#10b981" 
              strokeDasharray="3 3"
              label={{ value: 'Target', position: 'top', fontSize: 11 }}
            />
          )}
          <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex justify-between text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full opacity-30"></div>
          <span className="text-gray-600">Loss Zone</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-gray-600">Breakeven</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full opacity-30"></div>
          <span className="text-gray-600">Profit Zone</span>
        </div>
      </div>
    </div>
  );
};