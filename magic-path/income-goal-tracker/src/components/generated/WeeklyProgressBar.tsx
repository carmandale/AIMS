import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from './Tooltip';
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0
  });
  const progressPercentage = Math.min(actual / target * 100, 100);
  const isComplete = actual >= target;
  const isPartial = actual > 0 && actual < target;
  const getProgressColor = () => {
    if (isComplete) return 'bg-emerald-500';
    if (isPartial) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  const getTextColor = () => {
    if (isComplete) return 'text-emerald-400';
    if (isPartial) return 'text-yellow-400';
    return 'text-red-400';
  };
  const handleMouseEnter = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY
    });
    setShowTooltip(true);
  };
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };
  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY
    });
  };
  return <div className="relative">
      <motion.div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 cursor-pointer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseMove={handleMouseMove} whileHover={{
      scale: 1.02,
      backgroundColor: 'rgba(30, 41, 59, 0.7)'
    }} transition={{
      duration: 0.2
    }}>
        {/* Week header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-medium text-sm">{label}</h3>
          <span className={`text-xs font-semibold ${getTextColor()}`}>
            {Math.round(progressPercentage)}%
          </span>
        </div>

        {/* Progress bar background */}
        <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
          {/* Progress fill */}
          <motion.div className={`h-full rounded-full ${getProgressColor()}`} initial={{
          width: 0
        }} animate={{
          width: `${progressPercentage}%`
        }} transition={{
          duration: 1,
          ease: 'easeOut',
          delay: week * 0.1
        }} style={{
          boxShadow: `0 0 8px ${isComplete ? '#10b98140' : isPartial ? '#f59e0b40' : '#ef444440'}`
        }} />
        </div>

        {/* Amount details */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Mini bar chart */}
            <div className="flex items-end space-x-1 h-6">
              {/* Actual bar */}
              <motion.div className={`w-2 rounded-sm ${getProgressColor()}`} initial={{
              height: 0
            }} animate={{
              height: `${Math.max(actual / target * 100, 10)}%`
            }} transition={{
              duration: 0.8,
              delay: week * 0.1 + 0.2
            }} />
              {/* Target bar (outline) */}
              <div className="w-2 h-full border border-slate-500 rounded-sm opacity-50" />
            </div>
            
            <div className="text-xs">
              <p className="text-white">
                <span className="font-semibold">${actual.toLocaleString()}</span>
                <span className="text-slate-400"> / ${target.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {showTooltip && <Tooltip content={`${label}: $${actual.toLocaleString()} of $${target.toLocaleString()} (${Math.round(progressPercentage)}%)`} position={tooltipPosition} />}
    </div>;
};