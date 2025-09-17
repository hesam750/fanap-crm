'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Droplets, Fuel, AlertTriangle, Edit } from "lucide-react"
import type { Tank } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { Slider } from "@/components/ui/slider"
import { useEffect, useState } from "react"

interface TankCardProps {
  tank: Tank
  onUpdate?: (tankId: string, newLevel: number) => void
}

export function TankCard({ tank, onUpdate }: TankCardProps) {
  const auth = AuthService.getInstance()
  const canUpdate = auth.hasPermission("update_levels")

  // حالت محلی برای نمایش و ویرایش موقت سطح
  const [tempLevel, setTempLevel] = useState<number>(tank.currentLevel)
  useEffect(() => {
    setTempLevel(tank.currentLevel)
  }, [tank.currentLevel])

  const getStatusColor = (level: number) => {
    if (level < 20) return "destructive"
    if (level < 40) return "secondary"
    return "default"
  }

  const getStatusText = (level: number) => {
    if (level < 20) return "بحرانی"
    if (level < 40) return "کم"
    if (level < 70) return "متوسط"
    return "خوب"
  }

  const liters = Math.round((tank.currentLevel / 100) * tank.capacity)

  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)))

  const handleQuickUpdate = (increment: number) => {
    if (!onUpdate) return
    const newLevel = clamp((tempLevel ?? tank.currentLevel) + increment)
    setTempLevel(newLevel)
    onUpdate(tank.id, newLevel)
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {tank.type === "fuel" ? (
              <Fuel className="h-5 w-5 text-orange-500" />
            ) : (
              <Droplets className="h-5 w-5 text-blue-500" />
            )}
            {tank.name}
          </CardTitle>
          <Badge variant={getStatusColor(tank.currentLevel)}>{getStatusText(tank.currentLevel)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>سطح فعلی</span>
            <span className="font-medium">{tank.currentLevel}%</span>
          </div>
          <Progress value={tank.currentLevel} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{liters.toLocaleString("fa-IR")} لیتر</span>
            <span>ظرفیت: {tank.capacity.toLocaleString("fa-IR")} لیتر</span>
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
              onValueCommit={(v) => {
                const newLevel = clamp(v[0])
                if (onUpdate) onUpdate(tank.id, newLevel)
              }}
              className="h-6"
            />
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div>مکان: {tank.location}</div>
          <div>آخرین بروزرسانی: {new Date(tank.lastUpdated).toLocaleTimeString("fa-IR")}</div>
        </div>

        {tank.currentLevel < 20 && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>هشدار: سطح بحرانی!</span>
          </div>
        )}

        {canUpdate && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => handleQuickUpdate(-5)} disabled={tempLevel <= 0}>
              -5%
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickUpdate(5)} disabled={tempLevel >= 100}>
              +5%
            </Button>
            <Button size="sm" variant="ghost" className="mr-auto">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
