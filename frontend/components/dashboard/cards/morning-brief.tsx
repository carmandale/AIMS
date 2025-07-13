import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { portfolioApi } from '@/lib/api'
import { formatCurrency, formatPercent, formatDateTime, getSeverityColor, getSeverityBgColor } from '@/lib/utils'
import { Sun, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react'

export async function MorningBriefCard() {
  const brief = await portfolioApi.getMorningBrief()
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Morning Brief
              <Sun className="h-5 w-5 text-yellow-500" />
            </CardTitle>
            <CardDescription>
              {formatDateTime(brief.date)} - Overnight changes and alerts
            </CardDescription>
          </div>
          {brief.volatility_alerts.length > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {brief.volatility_alerts.length} Alerts
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Overview */}
          <div className="space-y-4">
            {/* Overnight P/L */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Overnight P/L
              </h4>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${brief.overnight_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {brief.overnight_pnl >= 0 ? '+' : ''}{formatCurrency(brief.overnight_pnl)}
                </span>
                <span className={`text-sm ${brief.overnight_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPercent(brief.overnight_pnl_percent)}
                </span>
              </div>
            </div>
            
            {/* Key Positions */}
            <div>
              <h4 className="text-sm font-medium mb-3">Key Positions</h4>
              <div className="space-y-2">
                {brief.key_positions.slice(0, 5).map((position) => (
                  <div
                    key={position.symbol}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {position.overnight_change_percent >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-danger" />
                      )}
                      <div>
                        <p className="font-medium">{position.symbol}</p>
                        <p className="text-xs text-muted-foreground">{position.broker}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(position.market_value)}</p>
                      <p className={`text-xs ${position.overnight_change_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatPercent(position.overnight_change_percent)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Column - Alerts & Recommendations */}
          <div className="space-y-4">
            {/* Volatility Alerts */}
            {brief.volatility_alerts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Volatility Alerts</h4>
                <div className="space-y-2">
                  {brief.volatility_alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${getSeverityBgColor(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${getSeverityColor(alert.severity)}`}>
                            {alert.symbol}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                        </div>
                        <Badge
                          variant={alert.alert_type === 'gain' ? 'success' : 'danger'}
                          className="ml-2"
                        >
                          {formatPercent(alert.change_percent)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {brief.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {brief.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <DollarSign className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Market Summary */}
            <div>
              <h4 className="text-sm font-medium mb-3">Market Summary</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(brief.market_summary).map(([symbol, data]) => (
                  <div key={symbol} className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">{symbol}</p>
                    <p className="font-medium">${data.price.toLocaleString()}</p>
                    <p className={`text-xs ${data.change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatPercent(data.change)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}