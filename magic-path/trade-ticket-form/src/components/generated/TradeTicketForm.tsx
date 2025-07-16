import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Clock, Shield, Zap } from 'lucide-react';
interface TradeTicketFormProps {}
const TradeTicketForm: React.FC<TradeTicketFormProps> = () => {
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market');
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6
    }} className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Trade Ticket</h1>
            <p className="text-slate-400 text-sm">Execute your trade with precision</p>
          </header>

          {/* Asset Info */}
          <section className="mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold">BTC/USD</h2>
              <div className="flex items-center text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">+2.34%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">$43,250.00</p>
            <p className="text-slate-400 text-sm">Last updated: 2 seconds ago</p>
          </section>

          {/* Order Type Toggle */}
          <section className="mb-6">
            <div className="flex bg-slate-700/50 rounded-xl p-1">
              <button onClick={() => setOrderType('buy')} className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${orderType === 'buy' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Buy
              </button>
              <button onClick={() => setOrderType('sell')} className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${orderType === 'sell' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                <TrendingDown className="w-4 h-4 inline mr-2" />
                Sell
              </button>
            </div>
          </section>

          {/* Order Mode */}
          <section className="mb-6">
            <div className="flex bg-slate-700/50 rounded-xl p-1">
              <button onClick={() => setOrderMode('market')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${orderMode === 'market' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Zap className="w-3 h-3 inline mr-1" />
                Market
              </button>
              <button onClick={() => setOrderMode('limit')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${orderMode === 'limit' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Clock className="w-3 h-3 inline mr-1" />
                Limit
              </button>
            </div>
          </section>

          {/* Input Fields */}
          <section className="space-y-4 mb-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Amount (BTC)
              </label>
              <div className="relative">
                <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00000000" className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" />
              </div>
            </div>

            {orderMode === 'limit' && <motion.div initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: 'auto'
          }} exit={{
            opacity: 0,
            height: 0
          }}>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Price (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="43,250.00" className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" />
                </div>
              </motion.div>}
          </section>

          {/* Order Summary */}
          <section className="mb-6 p-4 bg-slate-700/20 rounded-xl border border-slate-600/20">
            <h3 className="text-slate-300 text-sm font-medium mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Total:</span>
                <span className="text-white font-medium">$1,250.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trading Fee:</span>
                <span className="text-white font-medium">$3.75</span>
              </div>
              <div className="border-t border-slate-600/30 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-medium">Total Cost:</span>
                  <span className="text-white font-bold">$1,253.75</span>
                </div>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <motion.button whileHover={{
          scale: 1.02
        }} whileTap={{
          scale: 0.98
        }} className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${orderType === 'buy' ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400' : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'}`}>
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
    </div>;
};
export default TradeTicketForm;