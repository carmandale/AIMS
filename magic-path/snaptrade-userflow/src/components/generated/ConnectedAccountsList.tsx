import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Settings, MoreVertical, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Trash2, Edit, Eye, Wifi, WifiOff, Calendar, Filter, Download, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
interface Account {
  id: string;
  name: string;
  type: string;
  broker: string;
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
  balance: number;
  change: number;
  changePercent: number;
  lastSync: string;
  logo: string;
  accountNumber: string;
  positions: number;
  dayChange: number;
}
interface ConnectedAccountsListProps {
  className?: string;
  onAddAccount?: () => void;
  onViewPortfolio?: (accountId: string) => void;
}
export function ConnectedAccountsList({
  className,
  onAddAccount,
  onViewPortfolio
}: ConnectedAccountsListProps) {
  const [accounts, setAccounts] = useState<Account[]>([{
    id: '1',
    name: 'Trading Account',
    type: 'Individual Taxable',
    broker: 'TD Ameritrade',
    status: 'connected',
    balance: 125430.50,
    change: 2340.75,
    changePercent: 1.9,
    lastSync: '2 minutes ago',
    logo: '🏦',
    accountNumber: '****1234',
    positions: 12,
    dayChange: 890.25
  }, {
    id: '2',
    name: 'Retirement IRA',
    type: 'Traditional IRA',
    broker: 'Fidelity',
    status: 'syncing',
    balance: 89250.75,
    change: -450.30,
    changePercent: -0.5,
    lastSync: 'Syncing...',
    logo: '🏛️',
    accountNumber: '****5678',
    positions: 8,
    dayChange: -125.50
  }, {
    id: '3',
    name: 'Growth Portfolio',
    type: 'Roth IRA',
    broker: 'Charles Schwab',
    status: 'connected',
    balance: 67890.25,
    change: 1250.80,
    changePercent: 1.9,
    lastSync: '5 minutes ago',
    logo: '🏢',
    accountNumber: '****9012',
    positions: 15,
    dayChange: 340.75
  }, {
    id: '4',
    name: 'Crypto Holdings',
    type: 'Individual',
    broker: 'Robinhood',
    status: 'error',
    balance: 12450.00,
    change: -890.50,
    changePercent: -6.7,
    lastSync: '2 hours ago',
    logo: '🤖',
    accountNumber: '****3456',
    positions: 5,
    dayChange: -234.25
  }]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'error' | 'syncing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) || account.broker.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || account.status === filterStatus;
    return matchesSearch && matchesFilter;
  });
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalChange = accounts.reduce((sum, acc) => sum + acc.change, 0);
  const totalChangePercent = totalChange / (totalBalance - totalChange) * 100;
  const connectedCount = accounts.filter(acc => acc.status === 'connected').length;
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
      // Update last sync times
      setAccounts(prev => prev.map(acc => ({
        ...acc,
        lastSync: acc.status === 'connected' ? 'Just now' : acc.lastSync
      })));
    }, 2000);
  };
  const handleAccountAction = (accountId: string, action: 'edit' | 'disconnect' | 'view') => {
    switch (action) {
      case 'view':
        onViewPortfolio?.(accountId);
        break;
      case 'edit':
        // Handle edit
        break;
      case 'disconnect':
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
        break;
    }
  };
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
  };
  const StatusIcon = ({
    status
  }: {
    status: Account['status'];
  }) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };
  const AccountCard = ({
    account
  }: {
    account: Account;
  }) => {
    const [showMenu, setShowMenu] = useState(false);
    const isSelected = selectedAccounts.includes(account.id);
    return <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className={cn("bg-[#1a1a1a] border rounded-xl p-6 transition-all duration-200 hover:border-gray-600", isSelected ? "border-emerald-500 bg-emerald-500/5" : "border-gray-800", account.status === 'error' && "border-red-500/30")}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => toggleAccountSelection(account.id)} className={cn("w-4 h-4 rounded border-2 transition-colors", isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-600 hover:border-gray-500")}>
              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
            </button>
            <div className="text-2xl">{account.logo}</div>
            <div>
              <h3 className="font-semibold text-lg">{account.name}</h3>
              <p className="text-sm text-gray-400">
                {account.broker} • {account.type} • {account.accountNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <StatusIcon status={account.status} />
              <span className={cn("text-xs font-medium capitalize", account.status === 'connected' && "text-emerald-400", account.status === 'syncing' && "text-blue-400", account.status === 'error' && "text-red-400", account.status === 'disconnected' && "text-gray-400")}>
                {account.status}
              </span>
            </div>

            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-gray-700 rounded transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showMenu && <motion.div initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} exit={{
                opacity: 0,
                scale: 0.95
              }} className="absolute right-0 top-8 bg-[#2a2a2a] border border-gray-700 rounded-lg py-2 min-w-[160px] z-10">
                    <button onClick={() => handleAccountAction(account.id, 'view')} className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Portfolio
                    </button>
                    <button onClick={() => handleAccountAction(account.id, 'edit')} className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Settings
                    </button>
                    <button onClick={() => handleAccountAction(account.id, 'disconnect')} className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 text-red-400">
                      <Trash2 className="w-4 h-4" />
                      Disconnect
                    </button>
                  </motion.div>}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold">
              ${account.balance.toLocaleString('en-US', {
              minimumFractionDigits: 2
            })}
            </div>
            <div className="text-sm text-gray-400">Total Balance</div>
          </div>
          <div>
            <div className={cn("text-lg font-semibold flex items-center gap-1", account.change >= 0 ? "text-emerald-400" : "text-red-400")}>
              {account.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {account.change >= 0 ? '+' : ''}${account.change.toLocaleString('en-US', {
              minimumFractionDigits: 2
            })}
            </div>
            <div className="text-sm text-gray-400">
              {account.changePercent >= 0 ? '+' : ''}{account.changePercent.toFixed(2)}% Total
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-400">
              <BarChart3 className="w-3 h-3" />
              <span>{account.positions} positions</span>
            </div>
            <div className={cn("flex items-center gap-1", account.dayChange >= 0 ? "text-emerald-400" : "text-red-400")}>
              <Activity className="w-3 h-3" />
              <span>
                {account.dayChange >= 0 ? '+' : ''}${Math.abs(account.dayChange).toLocaleString('en-US', {
                minimumFractionDigits: 2
              })} today
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{account.lastSync}</span>
          </div>
        </div>

        {account.status === 'error' && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Connection error. Please reconnect your account.</span>
            </div>
          </div>}
      </motion.div>;
  };
  return <div className={cn("min-h-screen bg-[#0a0a0a] text-white", className)}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Connected Accounts</h1>
              <div className="flex items-center gap-4 text-gray-400">
                <span>{connectedCount} of {accounts.length} accounts connected</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${totalBalance.toLocaleString('en-US', {
                  minimumFractionDigits: 2
                })} total
                </span>
                <span>•</span>
                <span className={cn("flex items-center gap-1", totalChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {totalChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {totalChange >= 0 ? '+' : ''}${Math.abs(totalChange).toLocaleString('en-US', {
                  minimumFractionDigits: 2
                })} 
                  ({totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleRefreshAll} disabled={isRefreshing} className="border border-gray-700 hover:border-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2">
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Syncing...' : 'Sync All'}
              </button>
              <button onClick={onAddAccount} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search accounts or brokers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:border-emerald-500 focus:outline-none" />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none">
                <option value="all">All Status</option>
                <option value="connected">Connected</option>
                <option value="syncing">Syncing</option>
                <option value="error">Error</option>
              </select>
            </div>

            {selectedAccounts.length > 0 && <button onClick={() => setShowBulkActions(!showBulkActions)} className="border border-gray-700 hover:border-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                {selectedAccounts.length} selected
              </button>}
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {showBulkActions && selectedAccounts.length > 0 && <motion.div initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: 'auto'
          }} exit={{
            opacity: 0,
            height: 0
          }} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-white hover:text-emerald-400 transition-colors flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Sync Selected
                    </button>
                    <button className="text-sm text-white hover:text-blue-400 transition-colors flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      Export Data
                    </button>
                    <button className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                </div>
              </motion.div>}
          </AnimatePresence>

          {/* Accounts Grid */}
          {filteredAccounts.length > 0 ? <div className="grid lg:grid-cols-2 gap-6">
              {filteredAccounts.map(account => <AccountCard key={account.id} account={account} />)}
            </div> : <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No accounts found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filter criteria' : 'Connect your first brokerage account to get started'}
              </p>
              {!searchQuery && filterStatus === 'all' && <button onClick={onAddAccount} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Your First Account
                </button>}
            </motion.div>}
        </div>
      </div>
    </div>;
}