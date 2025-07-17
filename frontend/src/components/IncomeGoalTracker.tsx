/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MonthlyProgressRing } from './MonthlyProgressRing';
import { WeeklyProgressBar } from './WeeklyProgressBar';
import { usePortfolioSummary, useWeeklyPerformance } from '../hooks';

interface WeeklyData {
  week: number;
  actual: number;
  target: number;
  label: string;
}

interface IncomeGoalTrackerProps {
  monthlyGoal?: number;
}

export const IncomeGoalTracker: React.FC<IncomeGoalTrackerProps> = ({ monthlyGoal = 12000 }) => {
  const { data: portfolio } = usePortfolioSummary();
  const { data: weeklyPerformance } = useWeeklyPerformance();

  // Calculate current income from portfolio data
  const currentIncome = portfolio?.weekly_pnl || 0;

  // Generate weekly data from performance
  const weeklyData: WeeklyData[] = weeklyPerformance?.data
    ? weeklyPerformance.data.slice(-4).map((data: any, index: number) => ({
        week: index + 1,
        actual: data.pnl || 0,
        target: monthlyGoal / 4,
        label: `Week ${index + 1}`,
      }))
    : [
        { week: 1, actual: 0, target: monthlyGoal / 4, label: 'Week 1' },
        { week: 2, actual: 0, target: monthlyGoal / 4, label: 'Week 2' },
        { week: 3, actual: 0, target: monthlyGoal / 4, label: 'Week 3' },
        { week: 4, actual: 0, target: monthlyGoal / 4, label: 'Week 4' },
      ];

  const progressPercentage = Math.min((currentIncome / monthlyGoal) * 100, 100);
  const dailyAverageNeeded = Math.max((monthlyGoal - currentIncome) / 7, 0);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-700/50"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Income Goal</h1>
        <p className="text-slate-400 text-sm">Monthly Progress Tracker</p>
      </div>

      {/* Monthly Progress Ring */}
      <div className="flex justify-center mb-10">
        <MonthlyProgressRing
          currentIncome={currentIncome}
          monthlyGoal={monthlyGoal}
          progressPercentage={progressPercentage}
          dailyAverageNeeded={dailyAverageNeeded}
        />
      </div>

      {/* Weekly Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white mb-4">Weekly Breakdown</h2>
        {weeklyData.map((week, index) => (
          <motion.div
            key={week.week}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <WeeklyProgressBar
              week={week.week}
              actual={week.actual}
              target={week.target}
              label={week.label}
            />
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-8 pt-6 border-t border-slate-700/50"
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Remaining</p>
            <p className={`text-lg font-bold ${getProgressColor(progressPercentage)}`}>
              ${(monthlyGoal - currentIncome).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Daily Avg Needed</p>
            <p className={`text-lg font-bold ${getProgressColor(progressPercentage)}`}>
              ${Math.round(dailyAverageNeeded).toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
