'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { refreshPortfolioAction } from '@/lib/api'

export function RefreshButton() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshPortfolioAction()
      if (result.success) {
        // Refresh the page to get new data
        router.refresh()
      } else {
        console.error('Failed to refresh portfolio')
      }
    } catch (error) {
      console.error('Error refreshing portfolio:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="relative"
    >
      <RefreshCw 
        className={cn(
          "h-4 w-4",
          isRefreshing && "animate-spin"
        )}
      />
      <span className="sr-only">Refresh portfolio data</span>
    </Button>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}