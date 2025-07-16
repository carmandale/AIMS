import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, Calendar, Clock, TrendingUp, Mail, Phone, MapPin, Briefcase, Coffee } from 'lucide-react';
import { cn } from '../../lib/utils';
interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}
interface TaskItem {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}
interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}
export function MorningBriefCard() {
  const currentDate = new Date();
  const timeString = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const dateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const weather: WeatherData = {
    temperature: 22,
    condition: 'Partly Cloudy',
    location: 'San Francisco, CA'
  };
  const tasks: TaskItem[] = [{
    id: '1',
    title: 'Team standup meeting',
    time: '09:00',
    priority: 'high'
  }, {
    id: '2',
    title: 'Review quarterly reports',
    time: '10:30',
    priority: 'medium'
  }, {
    id: '3',
    title: 'Client presentation prep',
    time: '14:00',
    priority: 'high'
  }, {
    id: '4',
    title: 'Coffee with Sarah',
    time: '16:00',
    priority: 'low'
  }];
  const stocks: StockData[] = [{
    symbol: 'AAPL',
    price: 185.42,
    change: 2.34,
    changePercent: 1.28
  }, {
    symbol: 'GOOGL',
    price: 142.56,
    change: -1.23,
    changePercent: -0.85
  }, {
    symbol: 'TSLA',
    price: 248.91,
    change: 5.67,
    changePercent: 2.33
  }];
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6
    }} className="max-w-4xl mx-auto">
        {/* Header Section */}
        <motion.header initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.2
      }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
                Good Morning, Alex
              </h1>
              <p className="text-slate-400 text-lg">{dateString}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl md:text-5xl font-thin text-white mb-1">
                {timeString}
              </div>
              <div className="flex items-center text-slate-400">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{weather.location}</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weather Card */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.3
        }} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-white flex items-center">
                <Cloud className="w-5 h-5 mr-2 text-blue-400" />
                Weather
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-light text-white mb-1">
                  {weather.temperature}°C
                </div>
                <p className="text-slate-400">{weather.condition}</p>
              </div>
              <Sun className="w-12 h-12 text-yellow-400" />
            </div>
          </motion.section>

          {/* Today's Schedule */}
          <motion.section initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.4
        }} className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-400" />
              Today's Schedule
            </h2>
            <div className="space-y-4">
              {tasks.map((task, index) => <motion.div key={task.id} initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              delay: 0.5 + index * 0.1
            }} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-slate-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm font-mono">{task.time}</span>
                    </div>
                    <h3 className="text-white font-medium">{task.title}</h3>
                  </div>
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                </motion.div>)}
            </div>
          </motion.section>

          {/* Market Overview */}
          <motion.section initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.6
        }} className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Market Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stocks.map((stock, index) => <motion.div key={stock.symbol} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.7 + index * 0.1
            }} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{stock.symbol}</span>
                    <span className={cn('text-sm font-medium', stock.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-2xl font-light text-white mb-1">
                    ${stock.price.toFixed(2)}
                  </div>
                  <div className={cn('text-sm', stock.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                  </div>
                </motion.div>)}
            </div>
          </motion.section>

          {/* Quick Actions */}
          <motion.section initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: 0.8
        }} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-indigo-400" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full flex items-center p-3 bg-slate-700/40 hover:bg-slate-700/60 rounded-xl border border-slate-600/30 transition-colors group">
                <Mail className="w-5 h-5 mr-3 text-blue-400 group-hover:text-blue-300" />
                <span className="text-white group-hover:text-slate-200">Check Email</span>
              </button>
              <button className="w-full flex items-center p-3 bg-slate-700/40 hover:bg-slate-700/60 rounded-xl border border-slate-600/30 transition-colors group">
                <Phone className="w-5 h-5 mr-3 text-green-400 group-hover:text-green-300" />
                <span className="text-white group-hover:text-slate-200">Recent Calls</span>
              </button>
              <button className="w-full flex items-center p-3 bg-slate-700/40 hover:bg-slate-700/60 rounded-xl border border-slate-600/30 transition-colors group">
                <Coffee className="w-5 h-5 mr-3 text-amber-400 group-hover:text-amber-300" />
                <span className="text-white group-hover:text-slate-200">Order Coffee</span>
              </button>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </div>;
}