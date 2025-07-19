import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, TrendingUp, Users, CheckCircle, ArrowRight, Building2, Wallet, BarChart3, Settings, Plus, RefreshCw, AlertCircle, DollarSign, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
interface Account {
  id: string;
  name: string;
  type: string;
  broker: string;
  status: 'connected' | 'error' | 'syncing';
  balance: number;
  lastSync: string;
  logo: string;
}
interface SnapTradeIntegrationSuiteProps {
  className?: string;
}
export function SnapTradeIntegrationSuite({
  className
}: SnapTradeIntegrationSuiteProps) {
  const [currentView, setCurrentView] = useState<'registration' | 'connection' | 'dashboard' | 'widget'>('registration');
  const [isRegistered, setIsRegistered] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([{
    id: '1',
    name: 'Trading Account',
    type: 'Individual',
    broker: 'TD Ameritrade',
    status: 'connected',
    balance: 125430.50,
    lastSync: '2 minutes ago',
    logo: '🏦'
  }, {
    id: '2',
    name: 'Retirement IRA',
    type: 'IRA',
    broker: 'Fidelity',
    status: 'syncing',
    balance: 89250.75,
    lastSync: 'Syncing...',
    logo: '🏛️'
  }]);
  const RegistrationComponent = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const handleRegister = async () => {
      setIsLoading(true);
      setRegistrationStatus('loading');

      // Simulate API call
      setTimeout(() => {
        setRegistrationStatus('success');
        setIsRegistered(true);
        setIsLoading(false);
        setTimeout(() => setCurrentView('connection'), 1500);
      }, 2000);
    };
    return <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 py-16">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 mb-6">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
                <h1 className="text-3xl font-bold">SnapTrade</h1>
              </div>
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Connect Your Brokerage Accounts
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Securely link all your investment accounts in one place. Real-time portfolio tracking, 
                automated sync, and institutional-grade security.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[{
              icon: Shield,
              title: 'Bank-Level Security',
              desc: '256-bit encryption & OAuth 2.0'
            }, {
              icon: Users,
              title: '12,000+ Brokers',
              desc: 'Connect to any major brokerage'
            }, {
              icon: BarChart3,
              title: 'Real-Time Data',
              desc: 'Live portfolio updates & analytics'
            }].map((feature, i) => <motion.div key={i} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: i * 0.1
            }} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                  <feature.icon className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </motion.div>)}
            </div>

            <AnimatePresence mode="wait">
              {registrationStatus === 'idle' && <motion.button key="register-btn" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} onClick={handleRegister} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors inline-flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </motion.button>}

              {registrationStatus === 'loading' && <motion.div key="loading" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} className="inline-flex items-center gap-3 text-emerald-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="text-lg">Setting up your account...</span>
                </motion.div>}

              {registrationStatus === 'success' && <motion.div key="success" initial={{
              opacity: 0,
              scale: 0.8
            }} animate={{
              opacity: 1,
              scale: 1
            }} exit={{
              opacity: 0
            }} className="inline-flex items-center gap-3 text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg">Account created successfully!</span>
                </motion.div>}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>;
  };
  const ConnectionFlowComponent = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const brokers = [{
      id: 'td',
      name: 'TD Ameritrade',
      logo: '🏦',
      popular: true
    }, {
      id: 'fidelity',
      name: 'Fidelity',
      logo: '🏛️',
      popular: true
    }, {
      id: 'schwab',
      name: 'Charles Schwab',
      logo: '🏢',
      popular: true
    }, {
      id: 'etrade',
      name: 'E*TRADE',
      logo: '📈',
      popular: false
    }, {
      id: 'robinhood',
      name: 'Robinhood',
      logo: '🤖',
      popular: false
    }, {
      id: 'webull',
      name: 'Webull',
      logo: '🐂',
      popular: false
    }] as any[];
    const handleConnect = () => {
      setIsConnecting(true);
      setTimeout(() => {
        setCurrentView('dashboard');
      }, 3000);
    };
    return <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setCurrentView('registration')} className="text-gray-400 hover:text-white transition-colors">
                  ←
                </button>
                <h1 className="text-2xl font-bold">Connect Your Brokerage Account</h1>
              </div>

              <div className="flex items-center gap-4 mb-8">
                {[1, 2, 3].map(step => <div key={step} className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", currentStep >= step ? "bg-emerald-500 text-white" : "bg-gray-700 text-gray-400")}>
                      {step}
                    </div>
                    {step < 3 && <div className="w-12 h-0.5 bg-gray-700" />}
                  </div>)}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {currentStep === 1 && <motion.div key="step1" initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }}>
                  <h2 className="text-xl font-semibold mb-6">Choose Your Broker</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {brokers.map(broker => <button key={broker.id} onClick={() => setSelectedBroker(broker.id)} className={cn("p-4 rounded-xl border-2 transition-all text-left relative", selectedBroker === broker.id ? "border-emerald-500 bg-emerald-500/10" : "border-gray-700 hover:border-gray-600 bg-[#1a1a1a]")}>
                        {broker.popular && <span className="absolute -top-2 -right-2 bg-emerald-500 text-xs px-2 py-1 rounded-full">
                            Popular
                          </span>}
                        <div className="text-2xl mb-2">{broker.logo}</div>
                        <div className="font-semibold">{broker.name}</div>
                      </button>)}
                  </div>
                  <button onClick={() => setCurrentStep(2)} disabled={!selectedBroker} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                    Continue
                  </button>
                </motion.div>}

              {currentStep === 2 && <motion.div key="step2" initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }}>
                  <h2 className="text-xl font-semibold mb-6">Security & Authorization</h2>
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                      <Shield className="w-8 h-8 text-emerald-400 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Your data is protected</h3>
                        <ul className="text-gray-400 space-y-1 text-sm">
                          <li>• We use read-only access to your account</li>
                          <li>• Bank-level 256-bit encryption</li>
                          <li>• We never store your login credentials</li>
                          <li>• You can revoke access anytime</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setCurrentStep(1)} className="border border-gray-700 hover:border-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                      Back
                    </button>
                    <button onClick={() => setCurrentStep(3)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                      Authorize Connection
                    </button>
                  </div>
                </motion.div>}

              {currentStep === 3 && <motion.div key="step3" initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }} className="text-center">
                  <h2 className="text-xl font-semibold mb-6">Connect to {brokers.find(b => b.id === selectedBroker)?.name}</h2>
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 mb-8 max-w-md mx-auto">
                    <div className="text-4xl mb-4">{brokers.find(b => b.id === selectedBroker)?.logo}</div>
                    <p className="text-gray-400 mb-6">
                      You'll be redirected to {brokers.find(b => b.id === selectedBroker)?.name} to securely 
                      authorize the connection. This process is encrypted and secure.
                    </p>
                    {!isConnecting ? <button onClick={handleConnect} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors w-full">
                        Connect Account
                      </button> : <div className="flex items-center justify-center gap-3 text-emerald-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Connecting...</span>
                      </div>}
                  </div>
                </motion.div>}
            </AnimatePresence>
          </div>
        </div>
      </div>;
  };
  const DashboardComponent = () => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    return <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Connected Accounts</h1>
                <p className="text-gray-400">
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected • 
                  Total: ${totalBalance.toLocaleString('en-US', {
                  minimumFractionDigits: 2
                })}
                </p>
              </div>
              <div className="flex gap-3">
                <button className="border border-gray-700 hover:border-gray-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync All
                </button>
                <button onClick={() => setCurrentView('connection')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Account
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {accounts.map(account => <motion.div key={account.id} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{account.logo}</div>
                      <div>
                        <h3 className="font-semibold">{account.name}</h3>
                        <p className="text-sm text-gray-400">{account.broker} • {account.type}</p>
                      </div>
                    </div>
                    <div className={cn("px-2 py-1 rounded-full text-xs font-medium", account.status === 'connected' && "bg-emerald-500/20 text-emerald-400", account.status === 'syncing' && "bg-blue-500/20 text-blue-400", account.status === 'error' && "bg-red-500/20 text-red-400")}>
                      {account.status === 'connected' && 'Connected'}
                      {account.status === 'syncing' && 'Syncing'}
                      {account.status === 'error' && 'Error'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-2xl font-bold mb-1">
                      ${account.balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2
                  })}
                    </div>
                    <div className="text-sm text-gray-400">
                      Last sync: {account.lastSync}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 border border-gray-700 hover:border-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                      View Details
                    </button>
                    <button className="border border-gray-700 hover:border-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>)}
            </div>

            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button onClick={() => setCurrentView('widget')} className="p-4 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors text-left">
                  <Activity className="w-6 h-6 text-emerald-400 mb-2" />
                  <div className="font-medium">Status Widget</div>
                  <div className="text-sm text-gray-400">Compact overview</div>
                </button>
                <button className="p-4 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors text-left">
                  <BarChart3 className="w-6 h-6 text-blue-400 mb-2" />
                  <div className="font-medium">Portfolio Analytics</div>
                  <div className="text-sm text-gray-400">Performance insights</div>
                </button>
                <button className="p-4 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors text-left">
                  <DollarSign className="w-6 h-6 text-purple-400 mb-2" />
                  <div className="font-medium">Transaction History</div>
                  <div className="text-sm text-gray-400">View all trades</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>;
  };
  const StatusWidgetComponent = () => {
    const connectedCount = accounts.filter(acc => acc.status === 'connected').length;
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <button onClick={() => setCurrentView('dashboard')} className="text-gray-400 hover:text-white transition-colors mb-4">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold mb-2">Status Widget</h1>
            <p className="text-gray-400">Compact overview of your connected accounts</p>
          </div>

          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold">SnapTrade</span>
              </div>
              <div className={cn("w-2 h-2 rounded-full", connectedCount > 0 ? "bg-emerald-400" : "bg-red-400")} />
            </div>

            <div className="mb-4">
              <div className="text-lg font-bold">
                ${totalBalance.toLocaleString('en-US', {
                minimumFractionDigits: 2
              })}
              </div>
              <div className="text-sm text-gray-400">
                {connectedCount} of {accounts.length} accounts connected
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {accounts.slice(0, 3).map((account, i) => <div key={account.id} className="text-lg">{account.logo}</div>)}
              {accounts.length > 3 && <div className="text-xs text-gray-400">+{accounts.length - 3}</div>}
            </div>

            <button onClick={() => setCurrentView('dashboard')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
              Manage Accounts
            </button>
          </motion.div>
        </div>
      </div>;
  };
  return <div className={cn("w-full", className)}>
      <AnimatePresence mode="wait">
        {currentView === 'registration' && <RegistrationComponent key="registration" />}
        {currentView === 'connection' && <ConnectionFlowComponent key="connection" />}
        {currentView === 'dashboard' && <DashboardComponent key="dashboard" />}
        {currentView === 'widget' && <StatusWidgetComponent key="widget" />}
      </AnimatePresence>
    </div>;
}