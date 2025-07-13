import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { portfolioApi } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Target } from 'lucide-react'

// Mock monthly income goal from PRD
const MONTHLY_INCOME_GOAL = 10000
const WEEKLY_TARGET = 0.02 // 2% weekly from PRD

export async function IncomeGoalCard() {
  const summary = await portfolioApi.getSummary()
  
  // Calculate progress (mock for now - in production would track actual monthly income)
  const currentMonthIncome = summary.weekly_pnl * 4 // Rough estimate
  const progressPercent = Math.min((currentMonthIncome / MONTHLY_INCOME_GOAL) * 100, 100)
  const weeklyAchieved = summary.weekly_pnl_percent >= WEEKLY_TARGET * 100
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Income vs Goal
          <Target className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          Monthly target: {formatCurrency(MONTHLY_INCOME_GOAL)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{formatPercent(progressPercent)}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  progressPercent >= 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          {/* Current Status */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="font-medium">{formatCurrency(currentMonthIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="font-medium">
                {formatCurrency(Math.max(0, MONTHLY_INCOME_GOAL - currentMonthIncome))}
              </span>
            </div>
          </div>
          
          {/* Weekly Target Status */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Weekly Target (2%)</span>
              <span className={`text-sm font-medium ${weeklyAchieved ? 'text-success' : 'text-warning'}`}>
                {weeklyAchieved ? 'Achieved' : 'In Progress'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current: {formatPercent(summary.weekly_pnl_percent)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}