import { NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth-middleware"
import { analytics } from "@/lib/analytics-service"
import { DatabaseService } from "@/lib/database"

export async function POST(request: NextRequest) {
  // احراز هویت (در صورت نیاز می‌توان relaxed کرد برای مانیتور عمومی)
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const tankIds: string[] = Array.isArray(body?.tankIds) ? body.tankIds : []
    const generatorIds: string[] = Array.isArray(body?.generatorIds) ? body.generatorIds : []
    const period: string = String(body?.period ?? "168") // hours
    const days = Math.max(1, Math.ceil(Number(period) / 24))

    const db = DatabaseService.getInstance()
    const [allTanks, allGenerators] = await Promise.all([db.getTanks(), db.getGenerators()])

    const tankMap = new Map(allTanks.map((t) => [t.id, t]))
    const genMap = new Map(allGenerators.map((g) => [g.id, g]))

    // ترندهای مصرف برای هر موجودیت
    const trendEntries: Array<[string, { trend: "increasing" | "decreasing" | "stable"; changeRate: number; currentValue: number }]> = []

    // تانک‌ها
    for (const id of tankIds) {
      const t = tankMap.get(id)
      if (!t) continue
      const trend = await analytics.calculateConsumptionTrends(id, "tank", days)
      const mappedTrend: "increasing" | "decreasing" | "stable" = trend.trend === "up" ? "increasing" : trend.trend === "down" ? "decreasing" : "stable"
      trendEntries.push([
        id,
        {
          trend: mappedTrend,
          changeRate: Number(trend.percentage?.toFixed?.(2) ?? trend.percentage ?? 0),
          currentValue: t.currentLevel,
        },
      ])
    }

    // ژنراتورها
    for (const id of generatorIds) {
      const g = genMap.get(id)
      if (!g) continue
      const trend = await analytics.calculateConsumptionTrends(id, "generator", days)
      const mappedTrend: "increasing" | "decreasing" | "stable" = trend.trend === "up" ? "increasing" : trend.trend === "down" ? "decreasing" : "stable"
      trendEntries.push([
        id,
        {
          trend: mappedTrend,
          changeRate: Number(trend.percentage?.toFixed?.(2) ?? trend.percentage ?? 0),
          currentValue: g.currentLevel,
        },
      ])
    }

    const trends = Object.fromEntries(trendEntries)

    // پیش‌بینی‌های تجمیعی
    const bulkPred = await analytics.getBulkPredictiveAnalytics(tankIds, generatorIds)

    return NextResponse.json({
      trends,
      predictions: bulkPred,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[API] /api/analytics/bulk error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}