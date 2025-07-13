import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardGrid } from '@/components/dashboard/grid'
import { DashboardSkeleton } from '@/components/dashboard/skeleton'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with Portfolio Value and Cash Buffer */}
      <DashboardHeader />
      
      {/* Main Dashboard Grid */}
      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardGrid />
        </Suspense>
      </main>
    </div>
  )
}