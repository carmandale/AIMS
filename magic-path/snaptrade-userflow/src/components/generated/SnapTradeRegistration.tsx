import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Shield, Users, BarChart3, CheckCircle, ArrowRight, RefreshCw, Lock, Zap, Globe, Award, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
interface SnapTradeRegistrationProps {
  className?: string;
  onRegistrationComplete?: () => void;
  onNavigateToConnection?: () => void;
}
export function SnapTradeRegistration({
  className,
  onRegistrationComplete,
  onNavigateToConnection
}: SnapTradeRegistrationProps) {
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const handleRegister = async () => {
    setIsLoading(true);
    setRegistrationStatus('loading');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setRegistrationStatus('success');
      onRegistrationComplete?.();

      // Auto-navigate to connection flow after success
      setTimeout(() => {
        onNavigateToConnection?.();
      }, 1500);
    } catch (error) {
      setRegistrationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  const features = [{
    icon: Shield,
    title: 'Bank-Level Security',
    description: '256-bit encryption, OAuth 2.0, and read-only access to keep your data safe',
    highlight: 'Enterprise Security'
  }, {
    icon: Users,
    title: '12,000+ Brokers',
    description: 'Connect to any major brokerage including TD Ameritrade, Fidelity, Schwab, and more',
    highlight: 'Universal Coverage'
  }, {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Live portfolio updates, performance tracking, and comprehensive investment insights',
    highlight: 'Live Data'
  }] as any[];
  const trustIndicators = [{
    icon: Lock,
    text: 'SOC 2 Compliant'
  }, {
    icon: Award,
    text: 'FINRA Registered'
  }, {
    icon: Globe,
    text: 'Used by 500K+ investors'
  }, {
    icon: Star,
    text: '4.9/5 Rating'
  }] as any[];
  return <div className={cn("min-h-screen bg-[#0a0a0a] text-white", className)}>
      <div className="container mx-auto px-4 py-16">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} className="inline-flex items-center gap-3 mb-8">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold">SnapTrade</h1>
                <p className="text-emerald-400 text-sm">Professional Portfolio Management</p>
              </div>
            </motion.div>

            <motion.h2 initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.1
          }} className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Connect All Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                Investment Accounts
              </span>
            </motion.h2>

            <motion.p initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.2
          }} className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Securely aggregate your entire investment portfolio in one unified dashboard. 
              Real-time tracking, automated synchronization, and institutional-grade security 
              for serious investors.
            </motion.p>
          </div>

          {/* Features Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.3 + index * 0.1
          }} className="group relative">
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 h-full transition-all duration-300 group-hover:border-emerald-500/30 group-hover:bg-[#1a1a1a]/80">
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                      {feature.highlight}
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4 group-hover:bg-emerald-500/30 transition-colors">
                      <feature.icon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>)}
          </div>

          {/* Trust Indicators */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.6
        }} className="flex flex-wrap justify-center items-center gap-8 mb-12 py-8 border-t border-b border-gray-800">
            {trustIndicators.map((indicator, index) => <div key={index} className="flex items-center gap-2 text-gray-400">
                <indicator.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{indicator.text}</span>
              </div>)}
          </motion.div>

          {/* CTA Section */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.7
        }} className="text-center">
            <AnimatePresence mode="wait">
              {registrationStatus === 'idle' && <motion.div key="idle" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} className="space-y-6">
                  <button onClick={handleRegister} className="group bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-12 py-4 rounded-xl font-semibold text-lg transition-all duration-300 inline-flex items-center gap-3 shadow-lg hover:shadow-emerald-500/25">
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <p className="text-sm text-gray-500">
                    No credit card required • 30-day free trial • Cancel anytime
                  </p>
                </motion.div>}

              {registrationStatus === 'loading' && <motion.div key="loading" initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} exit={{
              opacity: 0,
              scale: 0.9
            }} className="inline-flex items-center gap-4 bg-[#1a1a1a] border border-gray-800 rounded-xl px-8 py-6">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <div className="text-left">
                    <div className="text-lg font-semibold text-emerald-400">Setting up your account...</div>
                    <div className="text-sm text-gray-400">This will only take a moment</div>
                  </div>
                </motion.div>}

              {registrationStatus === 'success' && <motion.div key="success" initial={{
              opacity: 0,
              scale: 0.8
            }} animate={{
              opacity: 1,
              scale: 1
            }} exit={{
              opacity: 0,
              scale: 0.8
            }} className="inline-flex items-center gap-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-8 py-6">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <div className="text-left">
                    <div className="text-lg font-semibold text-emerald-400">Account created successfully!</div>
                    <div className="text-sm text-gray-400">Redirecting to account connection...</div>
                  </div>
                </motion.div>}

              {registrationStatus === 'error' && <motion.div key="error" initial={{
              opacity: 0,
              scale: 0.8
            }} animate={{
              opacity: 1,
              scale: 1
            }} exit={{
              opacity: 0,
              scale: 0.8
            }} className="space-y-4">
                  <div className="inline-flex items-center gap-3 bg-red-500/20 border border-red-500/30 rounded-xl px-6 py-4 text-red-400">
                    <span>Registration failed. Please try again.</span>
                  </div>
                  <button onClick={() => {
                setRegistrationStatus('idle');
                setIsLoading(false);
              }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
                    Try Again
                  </button>
                </motion.div>}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>;
}