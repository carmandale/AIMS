import { Card, CardContent, CardHeader } from '@/components/ui/card'

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse-soft" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse-soft mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-32 bg-gray-200 rounded animate-pulse-soft" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse-soft" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse-soft" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <div className="md:col-span-2 lg:col-span-2">
        <CardSkeleton />
      </div>
    </div>
  )
}