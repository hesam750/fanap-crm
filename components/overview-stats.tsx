"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplets, Fuel, Zap, AlertTriangle } from "lucide-react"
import type { Tank, Generator, Alert } from "@/lib/types"

interface OverviewStatsProps {
  tanks: Tank[]
  generators: Generator[]
  alerts: Alert[]
}

export function OverviewStats({ tanks, generators, alerts }: OverviewStatsProps) {
  const fuelTanks = tanks.filter((tank) => tank.type === "fuel")
  const waterTanks = tanks.filter((tank) => tank.type === "water")
  const criticalAlerts = alerts.filter((alert) => !alert.acknowledged && alert.severity === "critical")
  const runningGenerators = generators.filter((gen) => gen.status === "running")

  const avgFuelLevel =
    fuelTanks.length > 0
      ? Math.round(fuelTanks.reduce((sum, tank) => sum + tank.currentLevel, 0) / fuelTanks.length)
      : 0

  const avgWaterLevel =
    waterTanks.length > 0
      ? Math.round(waterTanks.reduce((sum, tank) => sum + tank.currentLevel, 0) / waterTanks.length)
      : 0

  const avgGeneratorLevel =
    generators.length > 0
      ? Math.round(generators.reduce((sum, gen) => sum + gen.currentLevel, 0) / generators.length)
      : 0

  const stats = [
    {
      title: "میانگین سطح سوخت",
      value: `${avgFuelLevel}%`,
      icon: Fuel,
      color: avgFuelLevel < 30 ? "text-destructive" : avgFuelLevel < 60 ? "text-yellow-500" : "text-green-500",
      bgColor: avgFuelLevel < 30 ? "bg-destructive/10" : avgFuelLevel < 60 ? "bg-yellow-500/10" : "bg-green-500/10",
    },
    {
      title: "میانگین سطح آب",
      value: `${avgWaterLevel}%`,
      icon: Droplets,
      color: avgWaterLevel < 30 ? "text-destructive" : avgWaterLevel < 60 ? "text-yellow-500" : "text-blue-500",
      bgColor: avgWaterLevel < 30 ? "bg-destructive/10" : avgWaterLevel < 60 ? "bg-yellow-500/10" : "bg-blue-500/10",
    },
    {
      title: "ژنراتورهای فعال",
      value: `${runningGenerators.length}/${generators.length}`,
      icon: Zap,
      color: runningGenerators.length === generators.length ? "text-green-500" : "text-yellow-500",
      bgColor: runningGenerators.length === generators.length ? "bg-green-500/10" : "bg-yellow-500/10",
    },
    {
      title: "هشدارهای بحرانی",
      value: criticalAlerts.length.toString(),
      icon: AlertTriangle,
      color: criticalAlerts.length > 0 ? "text-destructive" : "text-green-500",
      bgColor: criticalAlerts.length > 0 ? "bg-destructive/10" : "bg-green-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
  <Card key={`${stat.title}-${stat.value}-${index}`}> {/* ترکیب ویژگی‌ها با index */}
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
      <div className={`p-2 rounded-full ${stat.bgColor}`}>
        <stat.icon className={`h-4 w-4 ${stat.color}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
    </CardContent>
  </Card>
))}

    </div>
  )
}
