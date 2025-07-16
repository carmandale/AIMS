import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Calendar, Target, CheckSquare, TrendingUp } from 'lucide-react';

interface HomeProps {
  onNavigate: (component: string) => void;
}

const navigationItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'View your complete portfolio overview and performance metrics',
    icon: Activity,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'morning-brief',
    title: 'Morning Brief',
    description: 'Daily summary with portfolio updates, tasks, and market overview',
    icon: Calendar,
    color: 'from-purple-600 to-blue-600',
  },
  {
    id: 'income-tracker',
    title: 'Income Tracker',
    description: 'Monitor your income goals and track monthly progress',
    icon: Target,
    color: 'from-green-600 to-emerald-600',
  },
  {
    id: 'tasks',
    title: 'Task Manager',
    description: 'Manage your weekly tasks and track productivity',
    icon: CheckSquare,
    color: 'from-orange-600 to-red-600',
  },
  {
    id: 'trade-ticket',
    title: 'Trade Ticket',
    description: 'Execute trades with real-time market data',
    icon: TrendingUp,
    color: 'from-pink-600 to-purple-600',
  },
];

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            AIMS
          </h1>
          <p className="text-xl text-slate-400">
            AI Investment Management System
          </p>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <button
                  onClick={() => onNavigate(item.id)}
                  className="group relative w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 transition-all duration-300 hover:scale-105 hover:border-slate-600 text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <div className="relative z-10">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${item.color} mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-100 transition-colors">
                      {item.title}
                    </h2>
                    
                    <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
                      {item.description}
                    </p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center text-slate-500 text-sm"
        >
          <p>
            Connected to backend API • Real-time data updates
          </p>
        </motion.footer>
      </div>
    </div>
  );
}