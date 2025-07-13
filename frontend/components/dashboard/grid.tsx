import { WeeklyPLCard } from './cards/weekly-pl'
import { IncomeGoalCard } from './cards/income-goal'
import { NextActionsCard } from './cards/next-actions'
import { TradeTicketCard } from './cards/trade-ticket'
import { MorningBriefCard } from './cards/morning-brief'

export async function DashboardGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Weekly P/L Card */}
      <WeeklyPLCard />
      
      {/* Income vs Goal Card */}
      <IncomeGoalCard />
      
      {/* Next Actions Card */}
      <NextActionsCard />
      
      {/* Trade Ticket Card */}
      <TradeTicketCard />
      
      {/* Morning Brief Card - spans 2 columns on larger screens */}
      <div className="md:col-span-2 lg:col-span-2">
        <MorningBriefCard />
      </div>
    </div>
  )
}