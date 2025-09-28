"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, AlertTriangle, Play, Square, Wrench, Save } from "lucide-react"
import type { Generator } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { Slider } from "@/components/ui/slider"
import { useEffect, useState } from "react"

interface GeneratorCardProps {
  generator: Generator
  onUpdate?: (generatorId: string, newLevel: number) => void
}

export function GeneratorCard({ generator, onUpdate }: GeneratorCardProps) {
  const auth = AuthService.getInstance()
  const canUpdate = auth.hasPermission("update_levels")

  const [tempLevel, setTempLevel] = useState<number>(generator.currentLevel)
  useEffect(() => {
    setTempLevel(generator.currentLevel)
  }, [generator.currentLevel])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "default"
      case "stopped":
        return "secondary"
      case "maintenance":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return "در حال کار"
      case "stopped":
        return "متوقف"
      case "maintenance":
        return "تعمیر"
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4" />
      case "stopped":
        return <Square className="h-4 w-4" />
      case "maintenance":
        return <Wrench className="h-4 w-4" />
      default:
        return null
    }
  }

  const liters = Math.round((generator.currentLevel / 100) * generator.capacity)

  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)))

  // const handleQuickUpdate = (increment: number) => {
  //   if (!onUpdate) return
  //   const newLevel = clamp((tempLevel ?? generator.currentLevel) + increment)
  //   setTempLevel(newLevel)
  //   onUpdate(generator.id, newLevel)
  // }

  const handleSave = () => {
    if (!onUpdate) return
    const newLevel = clamp(tempLevel)
    if (newLevel === generator.currentLevel) return
    onUpdate(generator.id, newLevel)
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {generator.name}
          </CardTitle>
          <Badge variant={getStatusColor(generator.status)} className="flex items-center gap-1">
            {getStatusIcon(generator.status)}
            {getStatusText(generator.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>سطح سوخت</span>
            <span className="font-medium">{generator.currentLevel}%</span>
          </div>
          <Progress value={generator.currentLevel} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{liters.toLocaleString("fa-IR")} لیتر</span>
            <span>ظرفیت: {generator.capacity.toLocaleString("fa-IR")} لیتر</span>
          </div>
        </div>

        {canUpdate && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs">
              <span>تنظیم سطح</span>
              <span className="font-medium">{tempLevel}%</span>
            </div>
            <Slider
              value={[tempLevel]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setTempLevel(clamp(v[0]))}
              className="h-6"
            />
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div>آخرین بروزرسانی: {new Date(generator.lastUpdated).toLocaleTimeString("fa-IR")}</div>
        </div>
        {generator.currentLevel < 20 && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>هشدار: سطح سوخت بحرانی!</span>
          </div>
        )}

        {canUpdate && (
          <div className="flex gap-2 pt-2">
            <div className="ml-auto">
              <Button size="sm" onClick={handleSave} disabled={tempLevel === generator.currentLevel}>
                <Save className="h-4 w-4 ml-2" />
                ثبت تغییرات
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
