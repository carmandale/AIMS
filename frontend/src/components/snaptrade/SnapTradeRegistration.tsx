import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Lock,
  Zap,
  Globe,
  Award,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api-client';
import { toast } from 'sonner';
import type { SnapTradeRegistrationProps } from '../../types/snaptrade';

export function SnapTradeRegistration({
  className,
  onRegistrationComplete,
  onNavigateToConnection,
}: SnapTradeRegistrationProps) {
  const [registrationStatus, setRegistrationStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setIsLoading(true);
    setRegistrationStatus('loading');
    setError(null);

    try {
      const response = await api.snaptrade.register();

      if (response.data.status === 'success') {
        setRegistrationStatus('success');
        toast.success('Successfully registered with SnapTrade!');
        onRegistrationComplete?.();

        // Auto-navigate to connection flow after success
        setTimeout(() => {
          onNavigateToConnection?.();
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (err: unknown) {
      console.error('SnapTrade registration error:', err);
      const errorMessage =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        'Registration failed';
      setError(errorMessage);
      setRegistrationStatus('error');
      toast.error(`Registration failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: '256-bit encryption, OAuth 2.0, and read-only access to keep your data safe',
      highlight: 'Enterprise Security',
    },
    {
      icon: Users,
      title: '12,000+ Brokers',
      description:
        'Connect to any major brokerage including TD Ameritrade, Fidelity, Schwab, and more',
      highlight: 'Universal Coverage',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description:
        'Live portfolio updates, performance tracking, and comprehensive investment insights',
      highlight: 'Live Data',
    },
    {
      icon: Zap,
      title: 'Instant Sync',
      description:
        'Automatic portfolio synchronization with real-time position and balance updates',
      highlight: 'Real-Time',
    },
  ];

  const trustIndicators = [
    { icon: Lock, text: 'SOC 2 Type II Certified' },
    { icon: Shield, text: 'Read-Only Access' },
    { icon: Globe, text: 'Used by 50,000+ investors' },
    { icon: Award, text: 'Regulated by FINRA' },
  ];

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
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Connect Your Brokerage Account</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Securely link your investment accounts to get real-time portfolio data, automated
            tracking, and comprehensive analytics.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Features */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Why Connect with SnapTrade?
                </h2>
                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start space-x-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                    >
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-white">{feature.title}</h3>
                          <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                            {feature.highlight}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 gap-4">
                {trustIndicators.map((indicator, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center space-x-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <indicator.icon className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">{indicator.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Side - Registration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8"
            >
              <AnimatePresence mode="wait">
                {registrationStatus === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Ready to Get Started?
                      </h3>
                      <p className="text-slate-300">
                        Register with SnapTrade to begin connecting your brokerage accounts
                      </p>
                    </div>

                    <button
                      onClick={handleRegister}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Connect Your Account</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <p className="text-xs text-slate-400 mt-4">
                      By connecting, you agree to SnapTrade's terms of service and privacy policy
                    </p>
                  </motion.div>
                )}

                {registrationStatus === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="mb-6">
                      <div className="bg-blue-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Setting Up Your Account
                      </h3>
                      <p className="text-slate-300">Registering with SnapTrade...</p>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse w-3/4"></div>
                    </div>
                  </motion.div>
                )}

                {registrationStatus === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="mb-6">
                      <div className="bg-green-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Registration Successful!
                      </h3>
                      <p className="text-slate-300">
                        Your SnapTrade account is ready. Redirecting to account connection...
                      </p>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Ready to connect accounts</span>
                    </div>
                  </motion.div>
                )}

                {registrationStatus === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="mb-6">
                      <div className="bg-red-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Registration Failed</h3>
                      <p className="text-slate-300 mb-4">
                        {error || 'Something went wrong. Please try again.'}
                      </p>
                    </div>
                    <button
                      onClick={handleRegister}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
