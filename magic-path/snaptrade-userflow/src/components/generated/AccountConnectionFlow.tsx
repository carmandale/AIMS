import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, CheckCircle, RefreshCw, Search, Star, Lock, Eye, AlertTriangle, ExternalLink, Wifi, Clock, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
interface Broker {
  id: string;
  name: string;
  logo: string;
  popular: boolean;
  rating: number;
  users: string;
  features: string[];
  connectionTime: string;
}
interface AccountConnectionFlowProps {
  className?: string;
  onBack?: () => void;
  onConnectionComplete?: () => void;
}
export function AccountConnectionFlow({
  className,
  onBack,
  onConnectionComplete
}: AccountConnectionFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionProgress, setConnectionProgress] = useState(0);
  const brokers: Broker[] = [{
    id: 'td',
    name: 'TD Ameritrade',
    logo: '🏦',
    popular: true,
    rating: 4.8,
    users: '2.1M',
    features: ['Commission-free trades', 'Advanced tools', 'Research'],
    connectionTime: '~30 seconds'
  }, {
    id: 'fidelity',
    name: 'Fidelity Investments',
    logo: '🏛️',
    popular: true,
    rating: 4.9,
    users: '3.2M',
    features: ['Zero fees', 'Mutual funds', '24/7 support'],
    connectionTime: '~45 seconds'
  }, {
    id: 'schwab',
    name: 'Charles Schwab',
    logo: '🏢',
    popular: true,
    rating: 4.7,
    users: '1.8M',
    features: ['Global trading', 'Banking', 'Advisory'],
    connectionTime: '~60 seconds'
  }, {
    id: 'etrade',
    name: 'E*TRADE',
    logo: '📈',
    popular: false,
    rating: 4.5,
    users: '890K',
    features: ['Options trading', 'Mobile app', 'Education'],
    connectionTime: '~40 seconds'
  }, {
    id: 'robinhood',
    name: 'Robinhood',
    logo: '🤖',
    popular: false,
    rating: 4.2,
    users: '1.5M',
    features: ['Crypto trading', 'Simple interface', 'Fractional shares'],
    connectionTime: '~20 seconds'
  }, {
    id: 'webull',
    name: 'Webull',
    logo: '🐂',
    popular: false,
    rating: 4.4,
    users: '650K',
    features: ['Extended hours', 'Paper trading', 'Analytics'],
    connectionTime: '~35 seconds'
  }, {
    id: 'vanguard',
    name: 'Vanguard',
    logo: '⛵',
    popular: false,
    rating: 4.6,
    users: '2.8M',
    features: ['Low-cost funds', 'Long-term investing', 'ETFs'],
    connectionTime: '~50 seconds'
  }, {
    id: 'interactive',
    name: 'Interactive Brokers',
    logo: '🌐',
    popular: false,
    rating: 4.3,
    users: '420K',
    features: ['Global markets', 'Low margins', 'Professional tools'],
    connectionTime: '~70 seconds'
  }];
  const filteredBrokers = brokers.filter(broker => broker.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedBrokerData = brokers.find(b => b.id === selectedBroker);
  const steps = [{
    number: 1,
    title: 'Choose Broker',
    description: 'Select your brokerage'
  }, {
    number: 2,
    title: 'Security Review',
    description: 'Understand permissions'
  }, {
    number: 3,
    title: 'Connect',
    description: 'Authorize connection'
  }] as any[];
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionProgress(0);

    // Simulate connection progress
    const progressInterval = setInterval(() => {
      setConnectionProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onConnectionComplete?.();
          }, 1000);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };
  const StepIndicator = () => <div className="flex items-center justify-center gap-4 mb-12">
      {steps.map((step, index) => <div key={step.number} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-2">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all", currentStep >= step.number ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "bg-gray-700 text-gray-400")}>
              {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
            </div>
            <div className="text-center">
              <div className={cn("text-sm font-medium", currentStep >= step.number ? "text-white" : "text-gray-400")}>
                {step.title}
              </div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </div>
          </div>
          {index < steps.length - 1 && <div className={cn("w-16 h-0.5 transition-colors", currentStep > step.number ? "bg-emerald-500" : "bg-gray-700")} />}
        </div>)}
    </div>;
  return <div className={cn("min-h-screen bg-[#0a0a0a] text-white", className)}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Connect Your Brokerage Account</h1>
              <p className="text-gray-400">Securely link your investment account in 3 simple steps</p>
            </div>
          </div>

          <StepIndicator />

          <AnimatePresence mode="wait">
            {/* Step 1: Broker Selection */}
            {currentStep === 1 && <motion.div key="step1" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Choose Your Broker</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search brokers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBrokers.map(broker => <motion.button key={broker.id} onClick={() => setSelectedBroker(broker.id)} whileHover={{
                scale: 1.02
              }} whileTap={{
                scale: 0.98
              }} className={cn("p-5 rounded-xl border-2 transition-all text-left relative group", selectedBroker === broker.id ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20" : "border-gray-700 hover:border-gray-600 bg-[#1a1a1a] hover:bg-[#1f1f1f]")}>
                      {broker.popular && <div className="absolute -top-2 -right-2 bg-emerald-500 text-xs px-2 py-1 rounded-full font-medium">
                          Popular
                        </div>}
                      
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">{broker.logo}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{broker.name}</div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{broker.rating}</span>
                            </div>
                            <span>•</span>
                            <span>{broker.users} users</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {broker.features.slice(0, 2).map((feature, i) => <div key={i} className="text-xs text-gray-400 flex items-center gap-1">
                            <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                            {feature}
                          </div>)}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{broker.connectionTime}</span>
                      </div>
                    </motion.button>)}
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setCurrentStep(2)} disabled={!selectedBroker} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2">
                    Continue
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </motion.div>}

            {/* Step 2: Security Review */}
            {currentStep === 2 && <motion.div key="step2" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Security & Permissions</h2>
                  <p className="text-gray-400">
                    Review what SnapTrade can access when connected to {selectedBrokerData?.name}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* What we can access */}
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Eye className="w-6 h-6 text-emerald-400" />
                      <h3 className="font-semibold text-emerald-400">What We Can See</h3>
                    </div>
                    <ul className="space-y-3 text-sm">
                      {['Account balances and holdings', 'Transaction history', 'Portfolio performance data', 'Account type and status'].map((item, i) => <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{item}</span>
                        </li>)}
                    </ul>
                  </div>

                  {/* What we cannot access */}
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Lock className="w-6 h-6 text-red-400" />
                      <h3 className="font-semibold text-red-400">What We Cannot Do</h3>
                    </div>
                    <ul className="space-y-3 text-sm">
                      {['Execute trades or transactions', 'Access login credentials', 'Withdraw or transfer funds', 'Change account settings'].map((item, i) => <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{item}</span>
                        </li>)}
                    </ul>
                  </div>
                </div>

                {/* Security badges */}
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <h3 className="font-semibold">Security Standards</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <span>256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <span>OAuth 2.0 authentication</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <span>SOC 2 Type II compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <span>Read-only access only</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setCurrentStep(1)} className="border border-gray-700 hover:border-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                    Back
                  </button>
                  <button onClick={() => setCurrentStep(3)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2">
                    I Understand, Continue
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </motion.div>}

            {/* Step 3: Connection */}
            {currentStep === 3 && <motion.div key="step3" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} className="text-center max-w-2xl mx-auto space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Connect to {selectedBrokerData?.name}
                  </h2>
                  <p className="text-gray-400">
                    You'll be securely redirected to authorize the connection
                  </p>
                </div>

                <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8">
                  <div className="text-4xl mb-4">{selectedBrokerData?.logo}</div>
                  <h3 className="text-lg font-semibold mb-2">{selectedBrokerData?.name}</h3>
                  
                  {!isConnecting ? <div className="space-y-6">
                      <div className="text-gray-400 space-y-2">
                        <p>Estimated connection time: {selectedBrokerData?.connectionTime}</p>
                        <p className="text-sm">
                          You'll be redirected to {selectedBrokerData?.name} to securely 
                          authorize read-only access to your account data.
                        </p>
                      </div>
                      
                      <button onClick={handleConnect} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold transition-colors w-full inline-flex items-center justify-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Connect Account Securely
                      </button>
                    </div> : <div className="space-y-6">
                      <div className="flex items-center justify-center gap-3 text-emerald-400">
                        <Wifi className="w-6 h-6" />
                        <span className="text-lg font-medium">Connecting...</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{
                      width: `${Math.min(connectionProgress, 100)}%`
                    }} />
                        </div>
                        <p className="text-sm text-gray-400">
                          {connectionProgress < 30 && "Redirecting to broker..."}
                          {connectionProgress >= 30 && connectionProgress < 70 && "Authorizing connection..."}
                          {connectionProgress >= 70 && connectionProgress < 100 && "Syncing account data..."}
                          {connectionProgress >= 100 && "Connection successful!"}
                        </p>
                      </div>

                      {connectionProgress >= 100 && <motion.div initial={{
                  opacity: 0,
                  scale: 0.8
                }} animate={{
                  opacity: 1,
                  scale: 1
                }} className="flex items-center justify-center gap-2 text-emerald-400">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-medium">Account connected successfully!</span>
                        </motion.div>}
                    </div>}
                </div>

                {!isConnecting && <button onClick={() => setCurrentStep(2)} className="text-gray-400 hover:text-white transition-colors text-sm">
                    ← Back to security review
                  </button>}
              </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </div>;
}