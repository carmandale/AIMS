import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from './Tooltip';
interface MonthlyProgressRingProps {
  currentIncome: number;
  monthlyGoal: number;
  progressPercentage: number;
  dailyAverageNeeded: number;
}
export const MonthlyProgressRing: React.FC<MonthlyProgressRingProps> = ({
  currentIncome,
  monthlyGoal,
  progressPercentage,
  dailyAverageNeeded
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0
  });
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return '#10b981'; // emerald-500
    if (percentage >= 70) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };
  const strokeColor = getProgressColor(progressPercentage);
  const radius = 80;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - progressPercentage / 100 * circumference;
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
      <motion.div className="relative cursor-pointer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onMouseMove={handleMouseMove} whileHover={{
      scale: 1.02
    }} transition={{
      duration: 0.2
    }}>
        <svg width={200} height={200} className="transform -rotate-90">
          {/* Background circle */}
          <circle cx={100} cy={100} r={radius} stroke="#374151" strokeWidth={strokeWidth} fill="transparent" className="opacity-30" />
          
          {/* Progress circle */}
          <motion.circle cx={100} cy={100} r={radius} stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" strokeDasharray={strokeDasharray} initial={{
          strokeDashoffset: circumference
        }} animate={{
          strokeDashoffset
        }} transition={{
          duration: 1.5,
          ease: 'easeOut',
          delay: 0.3
        }} className="drop-shadow-lg" style={{
          filter: `drop-shadow(0 0 8px ${strokeColor}40)`
        }} />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div initial={{
          opacity: 0,
          scale: 0.8
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.6,
          delay: 0.8
        }} className="text-center">
            <p className="text-3xl font-bold text-white mb-1">
              ${currentIncome.toLocaleString()}
            </p>
            <p className="text-slate-400 text-sm mb-2">
              of ${monthlyGoal.toLocaleString()}
            </p>
            <motion.p initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            duration: 0.4,
            delay: 1.2
          }} className="text-lg font-semibold" style={{
            color: strokeColor
          }}>
              {Math.round(progressPercentage)}%
            </motion.p>
          </motion.div>
        </div>
      </motion.div>

      {showTooltip && <Tooltip content={`Daily average needed: $${Math.round(dailyAverageNeeded)}`} position={tooltipPosition} />}
    </div>;
};