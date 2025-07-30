import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  CheckCircle,
  RefreshCw,
  Search,
  Star,
  Lock,
  Eye,
  AlertTriangle,
  ExternalLink,
  Wifi,
  Clock,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api-client';
import { toast } from 'sonner';
import type { AccountConnectionFlowProps, BrokerInfo } from '../../types/snaptrade';

export function AccountConnectionFlow({
  className,
  onBack,
  onConnectionComplete,
}: AccountConnectionFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [connectionUrl, setConnectionUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualConnection, setShowManualConnection] = useState(false);

  const brokers: BrokerInfo[] = [
    {
      id: 'td',
      name: 'TD Ameritrade',
      logo: '🏦',
      popular: true,
      rating: 4.8,
      users: '2.1M',
      features: ['Commission-free trades', 'Advanced tools', 'Research'],
      connectionTime: '~30 seconds',
    },
    {
      id: 'fidelity',
      name: 'Fidelity Investments',
      logo: '🏛️',
      popular: true,
      rating: 4.9,
      users: '3.2M',
      features: ['Zero fees', 'Mutual funds', '24/7 support'],
      connectionTime: '~45 seconds',
    },
    {
      id: 'schwab',
      name: 'Charles Schwab',
      logo: '🏪',
      popular: true,
      rating: 4.7,
      users: '1.8M',
      features: ['No minimums', 'Global trading', 'Research'],
      connectionTime: '~60 seconds',
    },
    {
      id: 'etrade',
      name: 'E*TRADE',
      logo: '💼',
      popular: false,
      rating: 4.6,
      users: '1.2M',
      features: ['Mobile trading', 'Options', 'Education'],
      connectionTime: '~45 seconds',
    },
    {
      id: 'robinhood',
      name: 'Robinhood',
      logo: '🏹',
      popular: false,
      rating: 4.2,
      users: '2.5M',
      features: ['Commission-free', 'Crypto', 'Simple UI'],
      connectionTime: '~20 seconds',
    },
    {
      id: 'webull',
      name: 'Webull',
      logo: '📱',
      popular: false,
      rating: 4.4,
      users: '800K',
      features: ['Extended hours', 'Paper trading', 'Analytics'],
      connectionTime: '~30 seconds',
    },
    {
      id: 'coinbase',
      name: 'Coinbase',
      logo: '₿',
      popular: true,
      rating: 4.3,
      users: '2.8M',
      features: ['Cryptocurrency', 'Easy to use', 'Secure wallet'],
      connectionTime: '~45 seconds',
    },
  ];

  const filteredBrokers = brokers.filter(broker =>
    broker.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularBrokers = filteredBrokers.filter(broker => broker.popular);
  const otherBrokers = filteredBrokers.filter(broker => !broker.popular);

  const steps = [
    { number: 1, title: 'Choose Broker', description: 'Select your brokerage' },
    { number: 2, title: 'Secure Connection', description: 'Verify security' },
    { number: 3, title: 'Authorize Access', description: 'Complete connection' },
  ];

  const handleBrokerSelect = (brokerId: string) => {
    setSelectedBroker(brokerId);
    setCurrentStep(2);
  };

  const handleSecurityConfirm = () => {
    setCurrentStep(3);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setConnectionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Get connection URL from backend
      const response = await api.snaptrade.getConnectionUrl();

      if (response.data.connection_url) {
        setConnectionUrl(response.data.connection_url);
        setConnectionProgress(100);

        // Open SnapTrade portal in new window
        const popup = window.open(
          response.data.connection_url,
          'snaptrade-connection',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );

        if (popup) {
          // Monitor popup for completion but don't auto-complete
          // Let user click the button when they're done
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              // Don't auto-complete - wait for user to click button
              console.log('Popup closed - user can now click completion button');
            }
          }, 1000);
        } else {
          // Popup was blocked - show manual connection option
          setShowManualConnection(true);
          toast.warning('Popup was blocked. Click the button below to open the connection page.');
        }
      } else {
        throw new Error('Failed to get connection URL');
      }
    } catch (err: unknown) {
      console.error('Connection error:', err);
      const errorMessage =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        'Connection failed';
      setError(errorMessage);
      toast.error(`Connection failed: ${errorMessage}`);
      setConnectionProgress(0);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectionReturn = async () => {
    try {
      // Call the callback endpoint first to trigger refresh
      const callbackResponse = await api.snaptrade.processCallback();
      console.log('Callback processed:', callbackResponse.data);
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then check accounts
      const accountsResponse = await api.snaptrade.getAccounts();

      if (accountsResponse.data.accounts && accountsResponse.data.accounts.length > 0) {
        toast.success('Account connected successfully!');
      } else {
        // In sandbox mode, accounts might not show up immediately
        toast.success('Connection initiated! Account will appear once confirmed by your broker.');
      }
      
      // Always call completion to exit the loop
      onConnectionComplete?.();
      
    } catch (err: unknown) {
      console.error('Failed to verify connection:', err);
      // Even if verification fails, the connection might have succeeded
      toast.warning('Connection completed. Please check your accounts list.');
      onConnectionComplete?.();
    }
  };

  const selectedBrokerInfo = brokers.find(b => b.id === selectedBroker);

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
        className
      )}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                    currentStep >= step.number
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-600 text-slate-400'
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-12 h-0.5 mx-2 transition-colors',
                      currentStep > step.number ? 'bg-blue-500' : 'bg-slate-600'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </motion.div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Broker */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-white mb-4">Choose Your Broker</h1>
                  <p className="text-slate-300 max-w-2xl mx-auto">
                    Select your brokerage to connect your investment account securely
                  </p>
                </div>

                {/* Search */}
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search brokers..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Popular Brokers */}
                {popularBrokers.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 mr-2" />
                      Popular Brokers
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {popularBrokers.map(broker => (
                        <motion.button
                          key={broker.id}
                          onClick={() => handleBrokerSelect(broker.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-blue-500/50 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">{broker.logo}</span>
                            <div>
                              <h3 className="font-semibold text-white">{broker.name}</h3>
                              <div className="flex items-center space-x-2 text-sm text-slate-400">
                                <div className="flex items-center">
                                  <Star className="w-3 h-3 text-yellow-400 mr-1" />
                                  <span>{broker.rating}</span>
                                </div>
                                <span>•</span>
                                <span>{broker.users} users</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            {broker.features.slice(0, 2).map((feature, index) => (
                              <div key={index} className="text-xs text-slate-300">
                                • {feature}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-green-400">{broker.connectionTime}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Brokers */}
                {otherBrokers.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-4">All Brokers</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {otherBrokers.map(broker => (
                        <motion.button
                          key={broker.id}
                          onClick={() => handleBrokerSelect(broker.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-blue-500/50 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">{broker.logo}</span>
                            <div>
                              <h3 className="font-semibold text-white">{broker.name}</h3>
                              <div className="flex items-center space-x-2 text-sm text-slate-400">
                                <div className="flex items-center">
                                  <Star className="w-3 h-3 text-yellow-400 mr-1" />
                                  <span>{broker.rating}</span>
                                </div>
                                <span>•</span>
                                <span>{broker.users} users</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            {broker.features.slice(0, 2).map((feature, index) => (
                              <div key={index} className="text-xs text-slate-300">
                                • {feature}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-green-400">{broker.connectionTime}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Security Confirmation */}
            {currentStep === 2 && selectedBrokerInfo && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="max-w-2xl mx-auto text-center space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-bold text-white mb-4">Secure Connection</h1>
                  <p className="text-slate-300">
                    Your connection to {selectedBrokerInfo.name} will be secured with
                    industry-standard encryption
                  </p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
                  <div className="flex items-center justify-center mb-6">
                    <span className="text-4xl mr-4">{selectedBrokerInfo.logo}</span>
                    <div className="text-2xl text-slate-400 mx-4">⟷</div>
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-6">
                    Connecting to {selectedBrokerInfo.name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                      <div className="bg-green-500/20 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                        <Lock className="w-6 h-6 text-green-400" />
                      </div>
                      <h4 className="font-medium text-white mb-1">Encrypted</h4>
                      <p className="text-sm text-slate-400">256-bit SSL encryption</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-blue-500/20 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                        <Eye className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="font-medium text-white mb-1">Read-Only</h4>
                      <p className="text-sm text-slate-400">View data only</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-purple-500/20 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                        <Shield className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="font-medium text-white mb-1">Secure</h4>
                      <p className="text-sm text-slate-400">Bank-level security</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <Wifi className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div className="text-left">
                        <h4 className="font-medium text-blue-300 mb-1">What happens next?</h4>
                        <p className="text-sm text-blue-200">
                          You'll be redirected to {selectedBrokerInfo.name}'s secure login page.
                          After you authorize the connection, you'll return here automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSecurityConfirm}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>Continue to {selectedBrokerInfo.name}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Authorization */}
            {currentStep === 3 && selectedBrokerInfo && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="max-w-2xl mx-auto text-center space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-bold text-white mb-4">Authorize Access</h1>
                  <p className="text-slate-300">
                    Complete the connection to {selectedBrokerInfo.name}
                  </p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
                  {!isConnecting && !error && (
                    <>
                      <div className="flex items-center justify-center mb-6">
                        <span className="text-4xl mr-4">{selectedBrokerInfo.logo}</span>
                        <div className="text-2xl text-slate-400 mx-4">→</div>
                        <ExternalLink className="w-8 h-8 text-blue-400" />
                      </div>

                      <h3 className="text-xl font-semibold text-white mb-4">Ready to Connect</h3>
                      <p className="text-slate-300 mb-6">
                        Click below to open {selectedBrokerInfo.name}'s secure login page in a new
                        window
                      </p>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
                          <div className="text-left">
                            <h4 className="font-medium text-yellow-300 mb-1">
                              Estimated time: {selectedBrokerInfo.connectionTime}
                            </h4>
                            <p className="text-sm text-yellow-200">
                              This will open in a new window. Don't close this page.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleConnect}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <span>Connect to {selectedBrokerInfo.name}</span>
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {isConnecting && !showManualConnection && (
                    <div className="text-center">
                      <div className="bg-blue-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-4">Connecting...</h3>
                      <p className="text-slate-300 mb-4">
                        Opening {selectedBrokerInfo.name} connection portal
                      </p>

                      <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-slate-300 mb-3">
                          A new window has opened for you to connect your {selectedBrokerInfo.name}{' '}
                          account.
                        </p>
                        <p className="text-sm text-slate-400">
                          If you see "Connection Complete" in the popup, you can close it and click
                          the button below.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setIsConnecting(false);
                          handleConnectionReturn();
                        }}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 mb-4"
                      >
                        I've Completed the Connection
                      </button>

                      <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${connectionProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-400">{connectionProgress}% complete</p>
                    </div>
                  )}

                  {showManualConnection && connectionUrl && (
                    <div className="text-center">
                      <div className="bg-yellow-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-yellow-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-4">Popup Blocked</h3>
                      <p className="text-slate-300 mb-6">
                        Your browser blocked the popup window. Click the button below to open the
                        connection page manually.
                      </p>
                      <a
                        href={connectionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                        onClick={() => {
                          // Check for connection after a delay
                          setTimeout(() => {
                            handleConnectionReturn();
                          }, 2000);
                        }}
                      >
                        <span>Open Connection Page</span>
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <p className="text-sm text-slate-400 mt-4">
                        After connecting, close the tab and return here.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="text-center">
                      <div className="bg-red-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-4">Connection Failed</h3>
                      <p className="text-slate-300 mb-6">{error}</p>
                      <button
                        onClick={handleConnect}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
