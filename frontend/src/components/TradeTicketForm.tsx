import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Shield,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useMarketQuotes } from '../hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

interface TradeTicketFormProps {
  symbol?: string;
}

export const TradeTicketForm: React.FC<TradeTicketFormProps> = ({ symbol = 'BTC-USD' }) => {
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market');

  // Fetch real-time market data
  const { data: quotes } = useMarketQuotes([symbol]);
  const currentQuote = quotes?.[symbol];

  // Check blocking tasks status
  const { data: blockingStatus } = useQuery({
    queryKey: ['blocking-status'],
    queryFn: async () => {
      const response = await api.tasks.getBlockingStatus();
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Calculate order total
  const calculateTotal = () => {
    const qty = parseFloat(amount) || 0;
    const prc = orderMode === 'market' ? currentQuote?.price || 0 : parseFloat(price) || 0;
    return qty * prc;
  };

  const total = calculateTotal();
  const fee = total * 0.003; // 0.3% trading fee
  const totalWithFee = total + fee;

  const handleSubmit = () => {
    // Check if blocking tasks are complete before allowing trade execution
    if (blockingStatus && !blockingStatus.all_complete) {
      toast.error('Complete all blocking tasks before executing trades');
      return;
    }

    // In a real app, this would submit the order
    console.log('Submitting order:', {
      orderType,
      amount,
      price: orderMode === 'market' ? currentQuote?.price : price,
      orderMode,
      total: totalWithFee,
    });

    toast.success('Trade order submitted successfully!');
  };

  useEffect(() => {
    // Update limit price when switching to limit mode
    if (orderMode === 'limit' && !price && currentQuote) {
      setPrice(currentQuote.price.toFixed(2));
    }
  }, [orderMode, price, currentQuote]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Trade Ticket</h1>
            <p className="text-slate-400 text-sm">Execute your trade with precision</p>
          </header>

          {/* Blocking Tasks Warning */}
          {blockingStatus && !blockingStatus.all_complete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Trading Blocked</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Complete {blockingStatus.incomplete_tasks?.length || 0} blocking task
                    {(blockingStatus.incomplete_tasks?.length || 0) !== 1 ? 's' : ''} before
                    executing trades
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Asset Info */}
          <section className="mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold">{symbol}</h2>
              {currentQuote && (
                <div
                  className={`flex items-center ${currentQuote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {currentQuote.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span className="text-sm font-medium">
                    {currentQuote.change >= 0 ? '+' : ''}
                    {currentQuote.change_percent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-white">
              ${currentQuote?.price.toFixed(2) || '0.00'}
            </p>
            <p className="text-slate-400 text-sm">Real-time price</p>
          </section>

          {/* Order Type Toggle */}
          <section className="mb-6">
            <div className="flex bg-slate-700/50 rounded-xl p-1">
              <button
                onClick={() => setOrderType('buy')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  orderType === 'buy'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Buy
              </button>
              <button
                onClick={() => setOrderType('sell')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  orderType === 'sell'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingDown className="w-4 h-4 inline mr-2" />
                Sell
              </button>
            </div>
          </section>

          {/* Order Mode */}
          <section className="mb-6">
            <div className="flex bg-slate-700/50 rounded-xl p-1">
              <button
                onClick={() => setOrderMode('market')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  orderMode === 'market'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3 inline mr-1" />
                Market
              </button>
              <button
                onClick={() => setOrderMode('limit')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  orderMode === 'limit'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3 inline mr-1" />
                Limit
              </button>
            </div>
          </section>

          {/* Input Fields */}
          <section className="space-y-4 mb-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Amount</label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {orderMode === 'limit' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-slate-300 text-sm font-medium mb-2">Price (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </section>

          {/* Order Summary */}
          <section className="mb-6 p-4 bg-slate-700/20 rounded-xl border border-slate-600/20">
            <h3 className="text-slate-300 text-sm font-medium mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Total:</span>
                <span className="text-white font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trading Fee (0.3%):</span>
                <span className="text-white font-medium">${fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-600/30 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">Total Cost:</span>
                  <span className="text-white font-bold">${totalWithFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!amount || (orderMode === 'limit' && !price)}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${
              orderType === 'buy'
                ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-500'
                : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-500'
            } disabled:cursor-not-allowed`}
          >
            <Shield className="w-5 h-5 inline mr-2" />
            {orderType === 'buy' ? 'Execute Buy Order' : 'Execute Sell Order'}
          </motion.button>

          {/* Security Notice */}
          <footer className="mt-4 text-center">
            <p className="text-slate-500 text-xs">
              Protected by 256-bit encryption • Trade with confidence
            </p>
          </footer>
        </div>
      </motion.div>
    </div>
  );
};
