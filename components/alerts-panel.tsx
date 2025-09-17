"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, X } from "lucide-react"
import type { Alert } from "@/lib/types"
import { AuthService } from "@/lib/auth"

interface AlertsPanelProps {
  alerts: Alert[]
  onAcknowledge?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
   
  
}

export function AlertsPanel({ alerts, onAcknowledge, onDismiss}: AlertsPanelProps) {
  const auth = AuthService.getInstance()
  const canManage = auth.hasPermission("acknowledge_alerts")

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "critical":
        return "بحرانی"
      case "high":
        return "بالا"
      case "medium":
        return "متوسط"
      case "low":
        return "پایین"
      default:
        return severity
    }
  }

  const getTypeIcon = (type: string) => {
    const normalized = type.replaceAll("_", "-")
    switch (normalized) {
      case "low-fuel":
      case "low-water":
        return <AlertTriangle className="h-4 w-4" />
      case "maintenance":
        return <Clock className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const unacknowledgedAlerts = alerts.filter((alert) => !alert.acknowledged)
  const acknowledgedAlerts = alerts.filter((alert) => alert.acknowledged)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          هشدارها و اعلان‌ها
          {unacknowledgedAlerts.length > 0 && <Badge variant="destructive">{unacknowledgedAlerts.length}</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {unacknowledgedAlerts.length === 0 && acknowledgedAlerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>هیچ هشداری وجود ندارد</p>
          </div>
        ) : (
          <>
            {unacknowledgedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 border border-destructive/20 rounded-lg bg-destructive/5"
              >
                <div className="text-destructive mt-0.5">{getTypeIcon(alert.type)}</div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(alert.severity)}>{getSeverityText(alert.severity)}</Badge>
                    <span className="text-xs text-muted-foreground">{alert.createdAt.toLocaleString("fa-IR")}</span>
                  </div>

                  <p className="text-sm">{alert.message}</p>

                  {canManage && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onAcknowledge?.(alert.id)}>
                        تأیید
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDismiss?.(alert.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {acknowledgedAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">هشدارهای تأیید شده</h4>
                {acknowledgedAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg opacity-60">
                    <div className="text-muted-foreground mt-0.5">{getTypeIcon(alert.type)}</div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{getSeverityText(alert.severity)}</Badge>
                        <span className="text-xs text-muted-foreground">{alert.createdAt.toLocaleString("fa-IR")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
