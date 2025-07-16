import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
interface Task {
  id: string;
  name: string;
  dueDate: string;
  status: 'completed' | 'due-soon' | 'overdue';
  completed: boolean;
}
const WeeklyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([{
    id: '1',
    name: 'Review quarterly reports',
    dueDate: 'Today, 2:00 PM',
    status: 'due-soon',
    completed: false
  }, {
    id: '2',
    name: 'Update project documentation',
    dueDate: 'Tomorrow, 10:00 AM',
    status: 'completed',
    completed: true
  }, {
    id: '3',
    name: 'Client presentation prep',
    dueDate: 'Yesterday, 3:00 PM',
    status: 'overdue',
    completed: false
  }, {
    id: '4',
    name: 'Team standup meeting',
    dueDate: 'Today, 9:00 AM',
    status: 'completed',
    completed: true
  }, {
    id: '5',
    name: 'Code review session',
    dueDate: 'Friday, 4:00 PM',
    status: 'due-soon',
    completed: false
  }]);
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = completedTasks / totalTasks * 100;
  const allTasksCompleted = completedTasks === totalTasks;
  const toggleTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === taskId ? {
      ...task,
      completed: !task.completed
    } : task));
  };
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'due-soon':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };
  const handleMarkWeekComplete = () => {
    // Handle week completion logic here
    console.log('Week marked as complete!');
  };
  return <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <CheckSquare className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-xl font-semibold text-white">This Week's Tasks</h1>
      </header>

      {/* Progress Section */}
      <section className="mb-6">
        <p className="text-sm text-gray-400 mb-3">
          {completedTasks} of {totalTasks} tasks completed
        </p>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" initial={{
          width: 0
        }} animate={{
          width: `${progressPercentage}%`
        }} transition={{
          duration: 0.5,
          ease: 'easeOut'
        }} />
        </div>
      </section>

      {/* Task List */}
      <ul className="space-y-3 mb-6">
        <AnimatePresence>
          {tasks.map(task => <motion.li key={task.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} whileHover={{
          scale: 1.02
        }} className={cn('group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer', 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 hover:border-gray-600', 'hover:shadow-lg hover:shadow-blue-500/10')} onClick={() => toggleTask(task.id)}>
              <div className="flex items-start gap-3">
                {/* Custom Checkbox */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <motion.div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200', task.completed ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/30' : 'border-gray-600 hover:border-blue-400')} whileTap={{
                scale: 0.95
              }}>
                    <AnimatePresence>
                      {task.completed && <motion.svg initial={{
                    scale: 0,
                    opacity: 0
                  }} animate={{
                    scale: 1,
                    opacity: 1
                  }} exit={{
                    scale: 0,
                    opacity: 0
                  }} transition={{
                    duration: 0.2
                  }} className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </motion.svg>}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={cn('font-medium transition-all duration-300', task.completed ? 'text-gray-500 line-through' : 'text-white group-hover:text-blue-100')}>
                      {task.name}
                    </h3>
                    {getStatusIcon(task.status)}
                  </div>
                  <p className={cn('text-sm transition-all duration-300', task.completed ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-300')}>
                    {task.dueDate}
                  </p>
                </div>
              </div>
            </motion.li>)}
        </AnimatePresence>
      </ul>

      {/* Complete Button */}
      <motion.button onClick={handleMarkWeekComplete} disabled={!allTasksCompleted} className={cn('w-full py-3 px-4 rounded-xl font-medium transition-all duration-200', 'focus:outline-none focus:ring-2 focus:ring-blue-500/50', allTasksCompleted ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700')} whileHover={allTasksCompleted ? {
      scale: 1.02
    } : {}} whileTap={allTasksCompleted ? {
      scale: 0.98
    } : {}}>
        Mark Week Complete
      </motion.button>
    </div>;
};
export default WeeklyTasks;