import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { portfolioApi } from '@/lib/api'
import { formatCurrency, formatPercent, getColorForValue } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export async function WeeklyPLCard() {
  const performance = await portfolioApi.getWeeklyPerformance()
  const { summary } = performance
  const isPositive = summary.pnl_percent >= 0
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Weekly P/L
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-success" />
          ) : (
            <TrendingDown className="h-5 w-5 text-danger" />
          )}
        </CardTitle>
        <CardDescription>
          Performance for the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main P/L Display */}
          <div className="text-center">
            <p className={`text-3xl font-bold ${getColorForValue(summary.total_pnl)}`}>
              {summary.total_pnl >= 0 ? '+' : ''}{formatCurrency(summary.total_pnl)}
            </p>
            <p className={`text-lg ${getColorForValue(summary.pnl_percent)}`}>
              {formatPercent(summary.pnl_percent)}
            </p>
          </div>
          
          {/* Mini Chart - Server Component, so we'll use a simple representation */}
          <div className="h-24 flex items-end justify-between gap-1">
            {performance.data.map((day, index) => {
              const height = Math.abs(day.pnl) / Math.max(...performance.data.map(d => Math.abs(d.pnl))) * 100
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div
                    className={`w-full rounded-t ${
                      day.pnl >= 0 ? 'bg-success' : 'bg-danger'
                    }`}
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                </div>
              )
            })}
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Start</p>
              <p className="font-medium">{formatCurrency(summary.start_value)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End</p>
              <p className="font-medium">{formatCurrency(summary.end_value)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}