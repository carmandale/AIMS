import React from 'react';
import { motion } from 'framer-motion';

interface WeeklyProgressBarProps {
  week: number;
  actual: number;
  target: number;
  label: string;
}

export const WeeklyProgressBar: React.FC<WeeklyProgressBarProps> = ({
  week,
  actual,
  target,
  label
}) => {
  const percentage = Math.min((actual / target) * 100, 100);
  const isComplete = actual >= target;
  
  const getBarColor = () => {
    if (isComplete) return 'bg-emerald-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-xs text-slate-400">
          ${actual.toLocaleString()} / ${target.toLocaleString()}
        </span>
      </div>
      <div className="relative">
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${getBarColor()} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ 
              duration: 1, 
              ease: 'easeOut',
              delay: 0.1 * week 
            }}
            style={{
              boxShadow: isComplete ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'
            }}
          />
        </div>
        {isComplete && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + 0.1 * week }}
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
      </div>
    </div>
  );
};