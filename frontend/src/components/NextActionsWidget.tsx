/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

interface TaskInstance {
  id: number;
  template_id: number;
  name: string;
  description: string | null;
  due_date: string;
  status: string;
  is_blocking: boolean;
  priority: number;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  overdue: boolean;
  color_code: string;
}

interface BlockingTasksStatus {
  all_complete: boolean;
  incomplete_tasks: any[];
  total_blocking: number;
  completed_blocking: number;
}

export const NextActionsWidget: React.FC = () => {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [blockingStatus, setBlockingStatus] = useState<BlockingTasksStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState<number | null>(null);
  const [skipReason, setSkipReason] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [tasksResponse, blockingResponse] = await Promise.all([
        api.tasks.getPending(),
        api.tasks.getBlockingStatus(),
      ]);

      setTasks(tasksResponse.data);
      setBlockingStatus(blockingResponse.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Refresh tasks every 5 minutes
    const interval = setInterval(fetchTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCompleteTask = async (taskId: number, notes?: string) => {
    try {
      setCompleting(taskId);
      await api.tasks.complete(taskId, notes);
      toast.success('Task completed!');
      await fetchTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast.error('Failed to complete task');
    } finally {
      setCompleting(null);
    }
  };

  const handleSkipTask = async (taskId: number) => {
    if (!skipReason.trim()) {
      toast.error('Please provide a reason for skipping');
      return;
    }

    try {
      setCompleting(taskId);
      await api.tasks.skip(taskId, skipReason);
      toast.success('Task skipped');
      setShowSkipDialog(null);
      setSkipReason('');
      await fetchTasks();
    } catch (error) {
      console.error('Failed to skip task:', error);
      toast.error('Failed to skip task');
    } finally {
      setCompleting(null);
    }
  };

  const getStatusIcon = (task: TaskInstance) => {
    if (task.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    } else if (task.overdue) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    } else if (task.color_code === 'yellow') {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
    return null;
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'High';
      case 2:
        return 'Medium';
      case 3:
        return 'Low';
      default:
        return '';
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly.getTime() === today.getTime()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (dateOnly < today) {
      const daysAgo = Math.floor((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const progressPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  if (loading) {
    return (
      <div className="w-full bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <CheckSquare className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Next Actions</h1>
        </div>
        <button
          onClick={fetchTasks}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Blocking Tasks Alert */}
      {blockingStatus && !blockingStatus.all_complete && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">
                {blockingStatus.incomplete_tasks.length} blocking task
                {blockingStatus.incomplete_tasks.length !== 1 ? 's' : ''} incomplete
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Complete these tasks to close the weekly cycle
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      <section className="mb-6">
        <p className="text-sm text-gray-400 mb-3">
          {completedTasks.length} of {tasks.length} tasks completed today
        </p>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </section>

      {/* Task List */}
      <ul className="space-y-3">
        <AnimatePresence>
          {pendingTasks.map(task => (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'group relative p-4 rounded-xl border transition-all duration-200',
                'bg-gray-800/50 border-gray-700',
                task.is_blocking && 'border-red-900/50 bg-red-900/10'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white">{task.name}</h3>
                        {task.is_blocking && (
                          <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                            Blocking
                          </span>
                        )}
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs rounded-full',
                            task.priority === 1 && 'bg-purple-500/20 text-purple-400',
                            task.priority === 2 && 'bg-blue-500/20 text-blue-400',
                            task.priority === 3 && 'bg-gray-700 text-gray-400'
                          )}
                        >
                          {getPriorityLabel(task.priority)}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                      )}
                      <p className={cn('text-sm', task.overdue ? 'text-red-400' : 'text-gray-500')}>
                        {formatDueDate(task.due_date)}
                      </p>
                    </div>
                    {getStatusIcon(task)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleCompleteTask(task.id);
                      }}
                      disabled={completing === task.id}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg transition-all duration-200',
                        'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {completing === task.id ? 'Completing...' : 'Complete'}
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowSkipDialog(task.id);
                      }}
                      disabled={completing === task.id}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg transition-all duration-200',
                        'bg-gray-700 text-gray-400 hover:bg-gray-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>

              {/* Skip Dialog */}
              {showSkipDialog === task.id && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 z-10"
                >
                  <div className="h-full flex flex-col">
                    <h4 className="text-sm font-medium text-white mb-2">Reason for skipping:</h4>
                    <textarea
                      value={skipReason}
                      onChange={e => setSkipReason(e.target.value)}
                      className="flex-1 w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-blue-500"
                      placeholder="Enter reason..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => {
                          setShowSkipDialog(null);
                          setSkipReason('');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSkipTask(task.id)}
                        disabled={!skipReason.trim()}
                        className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Skip Task
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {pendingTasks.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-400">All tasks completed!</p>
        </div>
      )}
    </div>
  );
};
