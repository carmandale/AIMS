import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, CheckCircle } from 'lucide-react'

// Mock trade ticket data - in production this would come from the API
const mockTicket = {
  id: '2025-W02-SPY-PUT',
  status: 'pending',
  created_at: new Date().toISOString(),
  trades: [
    { symbol: 'SPY', type: 'PUT', strike: 590, expiry: '2025-01-17', quantity: 5 },
    { symbol: 'QQQ', type: 'CALL', strike: 510, expiry: '2025-01-17', quantity: 3 },
  ],
  estimated_premium: 8500,
}

export function TradeTicketCard() {
  const isPending = mockTicket.status === 'pending'
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Trade Ticket
          <FileText className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          Latest generated trade ticket
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Ticket Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ticket ID</span>
              <code className="text-sm font-mono">{mockTicket.id}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={isPending ? 'warning' : 'success'}>
                {isPending ? 'Pending Execution' : 'Executed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Est. Premium</span>
              <span className="font-medium">${mockTicket.estimated_premium.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Trade Summary */}
          <div className="space-y-2 pt-3 border-t">
            <p className="text-sm font-medium">Trades ({mockTicket.trades.length})</p>
            {mockTicket.trades.map((trade, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                • {trade.quantity}x {trade.symbol} {trade.strike} {trade.type}
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-3">
            <Button variant="outline" size="sm" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {isPending && (
              <Button variant="success" size="sm" className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Executed
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}