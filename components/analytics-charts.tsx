"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Brush,
  ReferenceLine,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api-client"
import type { Tank, Generator, Alert } from "@/lib/types"

interface AnalyticsChartsProps {
  tanks: Tank[]
  generators: Generator[]
  alerts: Alert[]
}

// Summary API record shape
interface SummaryRecord {
  id: string
  entityType: "tank" | "generator"
  entityId: string
  level: number
  timestamp: string
  recordedBy: string
}

export function AnalyticsCharts({ tanks, generators, alerts }: AnalyticsChartsProps) {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7)

  // Loading/Error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Historical area-series (real data)
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; fuelAverage: number; waterAverage: number }>>([])
  // Trends snapshot for generators (for possible future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trends, setTrends] = useState<Record<string, { trend: "increasing" | "decreasing" | "stable"; changeRate: number; currentValue: number }>>({})

  const tankDistribution = useMemo(
    () => [
      { name: "مخازن سوخت", value: tanks.filter((t) => t.type === "fuel").length, fill: "oklch(var(--chart-1))" },
      { name: "مخازن آب", value: tanks.filter((t) => t.type === "water").length, fill: "oklch(var(--chart-2))" },
    ],
    [tanks]
  )

  const generatorStatusData = useMemo(
    () =>
      [
        { status: "در حال کار", count: generators.filter((g) => g.status === "running").length, fill: "oklch(var(--chart-4))" },
        { status: "متوقف", count: generators.filter((g) => g.status === "stopped").length, fill: "oklch(var(--chart-2))" },
        { status: "تعمیر", count: generators.filter((g) => g.status === "maintenance").length, fill: "oklch(var(--destructive))" },
      ].filter((i) => i.count > 0),
    [generators]
  )

  const alertSeverity = useMemo(
    () =>
      [
        { name: "بحرانی", value: alerts.filter((a) => a.severity === "critical").length, fill: "oklch(var(--destructive))" },
        { name: "بالا", value: alerts.filter((a) => a.severity === "high").length, fill: "oklch(var(--chart-3))" },
        { name: "متوسط", value: alerts.filter((a) => a.severity === "medium").length, fill: "oklch(var(--chart-4))" },
        { name: "پایین", value: alerts.filter((a) => a.severity === "low").length, fill: "oklch(var(--chart-5))" },
      ].filter((i) => i.value > 0),
    [alerts]
  )

  const chartConfig = {
    fuelAverage: { label: "میانگین سوخت", color: "oklch(var(--chart-1))" },
    waterAverage: { label: "میانگین آب", color: "oklch(var(--chart-2))" },
    count: { label: "تعداد" },
  } as const

  const buildDateBuckets = useCallback((days: number) => {
    const buckets: Array<{ key: string; label: string; date: Date }> = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      buckets.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
        date: d,
      })
    }
    return buckets
  }, [])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const hours = timeRange * 24
      const tankIds = tanks.map((t) => t.id)
      const generatorIds = generators.map((g) => g.id)

      // 1) Historical summary for area chart (ensure large enough limit)
      const limit = Math.min(5000, (tankIds.length + generatorIds.length) * Math.max(hours, 24))
      const summary = await apiClient.post<{ records: SummaryRecord[]; totalCount: number }>(
        "/api/historical-data/summary",
        { tankIds, generatorIds, hours, limit }
      )

      // 2) Bulk analytics snapshot for trends (currentValue, trend)
      const bulk = await apiClient.post<{
        trends: Record<string, { trend: "increasing" | "decreasing" | "stable"; changeRate: number; currentValue: number }>
        predictions: Record<string, any>
        timestamp: string
      }>("/api/analytics/bulk", { tankIds, generatorIds, period: String(hours) })

      setTrends(bulk.trends || {})

      // Build daily averages from summary for fuel/water tanks
      const tankTypeById = new Map<string, Tank["type"]>(tanks.map((t) => [t.id, t.type]))
      const buckets = buildDateBuckets(timeRange)

      // Map dateKey -> { fuelLevels: number[], waterLevels: number[] }
      const byDate: Record<string, { fuel: number[]; water: number[] }> = {}
      buckets.forEach((b) => (byDate[b.key] = { fuel: [], water: [] }))

      summary.records.forEach((rec) => {
        if (rec.entityType !== "tank") return
        const type = tankTypeById.get(rec.entityId)
        if (!type) return
        const dateKey = new Date(rec.timestamp).toISOString().slice(0, 10)
        if (!byDate[dateKey]) return // out of selected window
        if (type === "fuel") byDate[dateKey].fuel.push(rec.level)
        if (type === "water") byDate[dateKey].water.push(rec.level)
      })

      const computed = buckets.map((b) => {
        const f = byDate[b.key]?.fuel || []
        const w = byDate[b.key]?.water || []
        const avg = (arr: number[]) => (arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : 0)
        return {
          date: b.label,
          fuelAverage: Math.round(avg(f)),
          waterAverage: Math.round(avg(w)),
        }
      })

      setHistoricalData(computed)
    } catch (e: any) {
      console.error("[AnalyticsCharts] loadAnalytics error:", e)
      setError(e?.message || "خطا در بارگذاری داده‌ها")
    } finally {
      setLoading(false)
    }
  }, [timeRange, tanks, generators, buildDateBuckets])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTimeRange(7)}
          className={`px-3 py-1.5 rounded-md text-sm border ${timeRange === 7 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          7 روز
        </button>
        <button
          onClick={() => setTimeRange(14)}
          className={`px-3 py-1.5 rounded-md text-sm border ${timeRange === 14 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          14 روز
        </button>
        <button
          onClick={() => setTimeRange(30)}
          className={`px-3 py-1.5 rounded-md text-sm border ${timeRange === 30 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          30 روز
        </button>
        <div className="ms-auto text-xs text-muted-foreground">به‌روزرسانی خودکار با تغییر بازه</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smooth Area Trends (shadcn area style) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>روند نرمِ سطح مخازن ({timeRange} روز گذشته)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : error ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-destructive">
                {error}
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[320px]">
                <AreaChart data={historicalData} margin={{ left: 12, right: 12 }}>
                  <defs>
                    <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(var(--chart-1))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="oklch(var(--chart-1))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(var(--chart-2))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="oklch(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <ReferenceLine y={30} stroke="oklch(var(--destructive))" strokeDasharray="4 4" label={{ value: "آستانه کم", position: "left" }} />
                  <ReferenceLine y={80} stroke="oklch(var(--chart-4))" strokeDasharray="4 4" label={{ value: "آستانه بالا", position: "left" }} />
                  <Area type="monotone" dataKey="fuelAverage" name="میانگین سوخت (%)" stroke="oklch(var(--chart-1))" fill="url(#colorFuel)" strokeWidth={2} activeDot={{ r: 3 }} isAnimationActive />
                  <Area type="monotone" dataKey="waterAverage" name="میانگین آب (%)" stroke="oklch(var(--chart-2))" fill="url(#colorWater)" strokeWidth={2} activeDot={{ r: 3 }} isAnimationActive />
                  <Brush dataKey="date" height={20} travellerWidth={8} className="fill-muted" />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Generator status (horizontal bar) */}
        <Card>
          <CardHeader>
            <CardTitle>وضعیت ژنراتورها</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px]">
              <BarChart data={generatorStatusData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="status" type="category" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="oklch(var(--chart-1))" radius={[4, 4, 0, 0]} isAnimationActive />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Tank distribution (donut) */}
        <Card>
          <CardHeader>
            <CardTitle>توزیع مخازن</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px]">
              <PieChart>
                <Pie data={tankDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={5}>
                  {tankDistribution.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Alert severity (pie) */}
        {alertSeverity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>توزیع شدت هشدارها</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[260px]">
                <PieChart>
                  <Pie data={alertSeverity} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                    {alertSeverity.map((entry, idx) => (
                      <Cell key={`alert-${entry.name}-${idx}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
