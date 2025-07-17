/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Calendar, TrendingUp, AlertTriangle, Settings } from 'lucide-react';
import { NextActionsWidget } from './NextActionsWidget';
import { TaskTemplateManager } from './TaskTemplateManager';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { cn } from '../lib/utils';

interface ComplianceMetrics {
  period_start: string;
  period_end: string;
  total_tasks: number;
  completed_tasks: number;
  skipped_tasks: number;
  overdue_tasks: number;
  compliance_rate: number;
  daily_compliance_rate: number;
  weekly_compliance_rate: number;
  blocking_tasks_complete: boolean;
}

interface WeeklyReadiness {
  is_ready: boolean;
  blocking_tasks: any[];
  message: string;
}

export const TasksPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'today' | 'week' | 'templates'>('today');

  // Get date range for the current week
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const { start: weekStart, end: weekEnd } = getWeekRange();

  const { data: complianceData } = useQuery({
    queryKey: ['compliance', weekStart, weekEnd],
    queryFn: async () => {
      const response = await api.tasks.getCompliance(weekStart, weekEnd);
      return response.data as ComplianceMetrics;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: weeklyReadiness } = useQuery({
    queryKey: ['weekly-readiness'],
    queryFn: async () => {
      const response = await api.tasks.getWeeklyReadiness();
      return response.data as WeeklyReadiness;
    },
    refetchInterval: 60000
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CheckSquare className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Task Management</h1>
          </div>
          <p className="text-slate-400">
            Track your daily tasks and maintain weekly discipline
          </p>
        </motion.header>

        {/* Weekly Readiness Alert */}
        {weeklyReadiness && !weeklyReadiness.is_ready && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">{weeklyReadiness.message}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete all blocking tasks before Friday to close the weekly cycle
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Compliance Metrics */}
        {complianceData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Overall Compliance</span>
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {complianceData.compliance_rate.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500">
                  {complianceData.completed_tasks}/{complianceData.total_tasks} tasks
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Daily Tasks</span>
                <TrendingUp className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {complianceData.daily_compliance_rate.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500">compliance</span>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Weekly Tasks</span>
                <CheckSquare className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-2xl font-bold",
                  complianceData.weekly_compliance_rate === 100 ? "text-green-400" : "text-white"
                )}>
                  {complianceData.weekly_compliance_rate.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500">
                  {complianceData.blocking_tasks_complete ? 'ready' : 'pending'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mb-6"
        >
          <button
            onClick={() => setSelectedTab('today')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              selectedTab === 'today'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            )}
          >
            Today's Tasks
          </button>
          <button
            onClick={() => setSelectedTab('week')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              selectedTab === 'week'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            )}
          >
            Week View
          </button>
          <button
            onClick={() => setSelectedTab('templates')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              selectedTab === 'templates'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            )}
          >
            <Settings className="w-4 h-4" />
            Templates
          </button>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="lg:col-span-2">
            {selectedTab === 'templates' ? (
              <TaskTemplateManager />
            ) : (
              <NextActionsWidget />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};