'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

// Mock tasks - in production these would come from the database
const initialTasks = [
  { id: '1', title: 'Review morning brief', status: 'completed', priority: 'high' },
  { id: '2', title: 'Check volatility alerts', status: 'pending', priority: 'high' },
  { id: '3', title: 'Update watchlist', status: 'pending', priority: 'medium' },
  { id: '4', title: 'Review trade ticket', status: 'pending', priority: 'high' },
  { id: '5', title: 'Log execution in dashboard', status: 'pending', priority: 'medium' },
]

export function NextActionsCard() {
  const [tasks, setTasks] = useState(initialTasks)
  
  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed' }
          : task
      )
    )
  }
  
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Next Actions
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </CardTitle>
        <CardDescription>
          Tasks to complete before next cycle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              {task.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={`flex-1 text-sm ${
                  task.status === 'completed'
                    ? 'line-through text-muted-foreground'
                    : ''
                }`}
              >
                {task.title}
              </span>
              {task.priority === 'high' && task.status !== 'completed' && (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
            </button>
          ))}
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4 pt-4 border-t">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {completedCount === totalCount
              ? 'All tasks completed!'
              : `${totalCount - completedCount} tasks remaining`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}