import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Activity, PieChart, Menu, Bell, Settings, User } from 'lucide-react';
import PortfolioOverview from './PortfolioOverview';
import PerformanceChart from './PerformanceChart';
import RecentTradesTable from './RecentTradesTable';
import PortfolioInfoSection from './PortfolioInfoSection';
const AIMSDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const sidebarItems = [{
    icon: Activity,
    label: 'Dashboard',
    active: true
  }, {
    icon: PieChart,
    label: 'Portfolio',
    active: false
  }, {
    icon: TrendingUp,
    label: 'Analytics',
    active: false
  }, {
    icon: DollarSign,
    label: 'Trades',
    active: false
  }, {
    icon: Settings,
    label: 'Settings',
    active: false
  }] as any[];
  return <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold">A</span>
              </div>
              <h1 className="text-xl font-semibold">AIMS Dashboard</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside initial={false} animate={{
        x: sidebarOpen ? 0 : -280
      }} className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900/50 backdrop-blur-sm border-r border-slate-800 lg:translate-x-0">
          <nav className="p-6 pt-8">
            <ul className="space-y-2">
              {sidebarItems.map((item, index) => <li key={index}>
                  <a href="#" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${item.active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800 text-slate-300'}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                </li>)}
            </ul>
          </nav>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Portfolio Overview */}
            <PortfolioOverview />

            {/* Performance Chart */}
            <PerformanceChart />

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Recent Trades */}
              <div className="xl:col-span-2">
                <RecentTradesTable />
              </div>
              
              {/* Portfolio Info */}
              <div className="xl:col-span-1">
                <PortfolioInfoSection />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>;
};
export default AIMSDashboard;