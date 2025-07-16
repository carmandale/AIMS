import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Percent, Calendar } from 'lucide-react';
const PortfolioOverview: React.FC = () => {
  const portfolioData = {
    totalValue: 2847650.32,
    dailyChange: 12847.65,
    dailyChangePercent: 0.45,
    weeklyChange: 45230.12,
    weeklyChangePercent: 1.62,
    monthlyChange: -8945.23,
    monthlyChangePercent: -0.31,
    ytdChange: 234567.89,
    ytdChangePercent: 8.97
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };
  const getChangeIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };
  const cards = [{
    title: 'Daily',
    change: portfolioData.dailyChange,
    percent: portfolioData.dailyChangePercent,
    icon: Calendar
  }, {
    title: 'Weekly',
    change: portfolioData.weeklyChange,
    percent: portfolioData.weeklyChangePercent,
    icon: Calendar
  }, {
    title: 'Monthly',
    change: portfolioData.monthlyChange,
    percent: portfolioData.monthlyChangePercent,
    icon: Calendar
  }, {
    title: 'YTD',
    change: portfolioData.ytdChange,
    percent: portfolioData.ytdChangePercent,
    icon: Calendar
  }] as any[];
  return <section className="space-y-6">
      {/* Main Portfolio Value */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-300">Total Portfolio Value</h2>
          <DollarSign className="w-6 h-6 text-slate-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-4xl font-bold text-white">
            {formatCurrency(portfolioData.totalValue)}
          </h3>
          
          <div className="flex items-center space-x-2">
            {React.createElement(getChangeIcon(portfolioData.dailyChange), {
            className: `w-5 h-5 ${getChangeColor(portfolioData.dailyChange)}`
          })}
            <span className={`text-lg font-semibold ${getChangeColor(portfolioData.dailyChange)}`}>
              {formatCurrency(Math.abs(portfolioData.dailyChange))} ({formatPercent(portfolioData.dailyChangePercent)})
            </span>
            <span className="text-slate-400">today</span>
          </div>
        </div>
      </motion.div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => <motion.div key={card.title} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: index * 0.1
      }} className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-300">{card.title}</h4>
              <card.icon className="w-4 h-4 text-slate-400" />
            </div>
            
            <div className="space-y-1">
              <p className={`text-lg font-semibold ${getChangeColor(card.change)}`}>
                {formatCurrency(Math.abs(card.change))}
              </p>
              <div className="flex items-center space-x-1">
                {React.createElement(getChangeIcon(card.change), {
              className: `w-3 h-3 ${getChangeColor(card.change)}`
            })}
                <span className={`text-sm font-medium ${getChangeColor(card.change)}`}>
                  {formatPercent(card.percent)}
                </span>
              </div>
            </div>
          </motion.div>)}
      </div>
    </section>;
};
export default PortfolioOverview;