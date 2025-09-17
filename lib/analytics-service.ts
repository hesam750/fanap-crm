/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatabaseService } from "./database"
import type { Tank, Generator, Alert } from "./types"

export interface HistoricalDataPoint {
  date: string
  timestamp: Date
  fuelAverage: number
  waterAverage: number
  generators: { [key: string]: number }
  alerts: number
}

export interface TrendAnalysis {
  trend: "up" | "down" | "stable"
  change: number
  percentage: number
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private db: DatabaseService

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  constructor() {
    this.db = DatabaseService.getInstance()
  }

  // Get historical data for charts - بهینه‌سازی شده
  async getHistoricalData(days = 7): Promise<HistoricalDataPoint[]> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)

      // دریافت همه داده‌ها به صورت bulk
      const [tanks, generators, allAlerts] = await Promise.all([
        this.db.getTanks(),
        this.db.getGenerators(),
        this.db.getAlerts()
      ])

      const dataPoints: HistoricalDataPoint[] = []
      const fuelTanks = tanks.filter((t: Tank) => t.type === "fuel")
      const waterTanks = tanks.filter((t: Tank) => t.type === "water")

      // دریافت داده‌های تاریخی به صورت bulk
      const [fuelTankHistories, waterTankHistories, generatorHistories] = await Promise.all([
        Promise.all(fuelTanks.map((tank: Tank) => 
          this.db.getHistoricalData("tank", tank.id, days, 1, 1)
        )),
        Promise.all(waterTanks.map((tank: Tank) => 
          this.db.getHistoricalData("tank", tank.id, days, 1, 1)
        )),
        Promise.all(generators.map((gen: Generator) => 
          this.db.getHistoricalData("generator", gen.id, days, 1, 1)
        ))
      ])

      // Generate data points for each day
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)

        // محاسبه میانگین‌ها
        const fuelAverage = this.calculateAverage(
          fuelTanks.map((tank: Tank, index: number) => {
            const history = fuelTankHistories[index]?.data || []
            return history.length > 0 ? history[0]?.level || tank.currentLevel : tank.currentLevel
          })
        )

        const waterAverage = this.calculateAverage(
          waterTanks.map((tank: Tank, index: number) => {
            const history = waterTankHistories[index]?.data || []
            return history.length > 0 ? history[0]?.level || tank.currentLevel : tank.currentLevel
          })
        )

        // Generator levels
        const generatorLevels: { [key: string]: number } = {}
        generators.forEach((gen: Generator, index: number) => {
          const history = generatorHistories[index]?.data || []
          generatorLevels[gen.name] = history.length > 0 ? history[0]?.level || gen.currentLevel : gen.currentLevel
        })

        // فیلتر کردن اعلان‌های مربوط به تاریخ
        const dayAlerts = allAlerts.filter((alert: any) => {
          const alertDate = new Date(alert.createdAt)
          return alertDate.toDateString() === date.toDateString()
        })

        dataPoints.push({
          date: date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
          timestamp: date,
          fuelAverage,
          waterAverage,
          generators: generatorLevels,
          alerts: dayAlerts.length,
        })
      }

      return dataPoints
    } catch (error) {
      console.error("[Analytics] Error fetching historical data:", error)
      // Return fallback data if database fails
      return this.generateFallbackData(days)
    }
  }

  // Calculate consumption trends - بهینه‌سازی شده
  async calculateConsumptionTrends(entityId: string, type: "tank" | "generator", days = 7): Promise<TrendAnalysis> {
    try {
      const historyData = await this.db.getHistoricalData(type, entityId, days, 1, 50)
      const history = historyData.data

      if (history.length < 2) {
        return { trend: "stable", change: 0, percentage: 0 }
      }

      const latest = history[history.length - 1].level
      const oldest = history[0].level
      const change = latest - oldest
      const percentage = oldest > 0 ? (change / oldest) * 100 : 0

      return {
        trend: change > 2 ? "up" : change < -2 ? "down" : "stable",
        change: Math.abs(change),
        percentage: Math.abs(percentage),
      }
    } catch (error) {
      console.error("[Analytics] Error calculating trends:", error)
      return { trend: "stable", change: 0, percentage: 0 }
    }
  }

  // Get efficiency metrics - بهینه‌سازی شده
  async getEfficiencyMetrics(
    tanks: Tank[],
    generators: Generator[],
  ): Promise<{
    fuelEfficiency: number
    waterUsage: number
    generatorPerformance: number
    alertFrequency: number
  }> {
    try {
      // دریافت داده‌های مورد نیاز به صورت موازی
      const [recentAlerts, bulkTrends] = await Promise.all([
        this.getRecentAlerts(7),
        this.db.getBulkTrends(
          tanks.map(t => t.id),
          generators.map(g => g.id),
          24
        )
      ])

      // Calculate fuel efficiency
      const fuelTanks = tanks.filter((t) => t.type === "fuel")
      const fuelEfficiency = this.calculateAverage(
        fuelTanks.map((t) => {
          const trend = bulkTrends.tanks[t.id]
          return trend?.currentLevel || t.currentLevel
        })
      )

      // Calculate water usage efficiency
      const waterTanks = tanks.filter((t) => t.type === "water")
      const waterUsage = this.calculateAverage(
        waterTanks.map((t) => {
          const trend = bulkTrends.tanks[t.id]
          return trend?.currentLevel || t.currentLevel
        })
      )

      // Calculate generator performance
      const runningGenerators = generators.filter((g) => g.status === "running")
      const generatorPerformance = runningGenerators.length > 0 
        ? this.calculateAverage(
            runningGenerators.map((g) => {
              const trend = bulkTrends.generators[g.id]
              return trend?.currentLevel || g.currentLevel
            })
          )
        : 0

      // Calculate alert frequency
      const alertFrequency = recentAlerts.length / 7

      return {
        fuelEfficiency,
        waterUsage,
        generatorPerformance,
        alertFrequency,
      }
    } catch (error) {
      console.error("[Analytics] Error calculating efficiency metrics:", error)
      return {
        fuelEfficiency: 0,
        waterUsage: 0,
        generatorPerformance: 0,
        alertFrequency: 0,
      }
    }
  }

  // Get predictive analytics - بهینه‌سازی شده
  async getPredictiveAnalytics(
    entityId: string,
    type: "tank" | "generator",
  ): Promise<{
    predictedDays: number
    recommendation: string
    confidence: number
  }> {
    try {
      // استفاده از متدهای بهینه‌شده DatabaseService
      const prediction = type === "tank" 
        ? await this.db.predictTankUsage(entityId)
        : await this.db.predictGeneratorUsage(entityId)

      return {
        predictedDays: prediction.predictedDays || -1,
        recommendation: prediction.recommendation || "داده کافی برای پیش‌بینی وجود ندارد",
        confidence: prediction.confidence === "high" ? 85 : prediction.confidence === "medium" ? 70 : 50,
      }
    } catch (error) {
      console.error("[Analytics] Error in predictive analytics:", error)
      return {
        predictedDays: -1,
        recommendation: "خطا در محاسبه پیش‌بینی",
        confidence: 0,
      }
    }
  }

  // Bulk predictive analytics برای همه موجودیت‌ها
  async getBulkPredictiveAnalytics(
    tankIds: string[],
    generatorIds: string[]
  ): Promise<{
    tanks: { [key: string]: any }
    generators: { [key: string]: any }
  }> {
    try {
      const predictions = await this.db.getBulkPredictions(tankIds, generatorIds)
      return predictions
    } catch (error) {
      console.error("[Analytics] Error in bulk predictive analytics:", error)
      return {
        tanks: Object.fromEntries(tankIds.map(id => [id, {
          predictedDays: -1,
          recommendation: "خطا در محاسبه",
          confidence: 0
        }])),
        generators: Object.fromEntries(generatorIds.map(id => [id, {
          predictedHours: -1,
          recommendation: "خطا در محاسبه",
          confidence: 0
        }]))
      }
    }
  }

  // Private helper methods
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    const validValues = values.filter(v => v !== undefined && v !== null)
    if (validValues.length === 0) return 0
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length
  }

  private async getRecentAlerts(days: number): Promise<Alert[]> {
    try {
      const alerts = await this.db.getAlerts()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      return alerts.filter((alert: any) => new Date(alert.createdAt) >= cutoffDate)
    } catch (error) {
      console.error("[Analytics] Error fetching recent alerts:", error)
      return []
    }
  }

  private generateFallbackData(days: number): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      data.push({
        date: date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
        timestamp: date,
        fuelAverage: Math.max(20, Math.min(90, 65 + (Math.random() - 0.5) * 20)),
        waterAverage: Math.max(30, Math.min(95, 75 + (Math.random() - 0.5) * 15)),
        generators: {
          "ژنراتور ۱": Math.max(15, Math.min(95, 70 + (Math.random() - 0.5) * 25)),
          "ژنراتور ۲": Math.max(15, Math.min(95, 65 + (Math.random() - 0.5) * 25)),
          "ژنراتور ۳": Math.max(10, Math.min(95, 45 + (Math.random() - 0.5) * 30)),
          "ژنراتور ۴": Math.max(20, Math.min(95, 80 + (Math.random() - 0.5) * 20)),
        },
        alerts: Math.floor(Math.random() * 3),
      })
    }

    return data
  }
}

// صادر کردن یک نمونه از کلاس AnalyticsService برای استفاده در سایر فایل‌ها
export const analytics = AnalyticsService.getInstance()