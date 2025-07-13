import { portfolioApi } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { RefreshButton } from './refresh-button'

export async function DashboardHeader() {
  // This is a Server Component - fetch data directly
  const summary = await portfolioApi.getSummary()
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AIMS Dashboard</h1>
            <p className="text-muted-foreground">
              Automated Investment Management System
            </p>
          </div>
          
          <div className="flex items-center gap-8">
            {/* Portfolio Value */}
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.total_value)}
              </p>
              <p className={`text-sm ${summary.daily_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {summary.daily_pnl >= 0 ? '+' : ''}{formatCurrency(summary.daily_pnl)} (
                {formatPercent(summary.daily_pnl_percent)})
              </p>
            </div>
            
            {/* Cash Buffer */}
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Cash Buffer</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.cash_buffer)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatPercent(summary.cash_buffer_percent || 0)} of total
              </p>
            </div>
            
            {/* Refresh Button */}
            <RefreshButton />
          </div>
        </div>
      </div>
    </header>
  )
}