import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { analytics } from "@/lib/analytics-service"
import { validateAuth } from "@/lib/auth-middleware"
import { unstable_cache } from "next/cache"
import { Tank, Generator } from "@/lib/types"

// تعریف تایپ‌های interface
interface KPIsSummaryRequest {
  timeRange?: string; // بازه زمانی به روز
  tankIds?: string[];
  generatorIds?: string[];
}

interface CacheParams {
  timeRange: number;
  tankIds: string[];
  generatorIds: string[];
}

// کش برای بهبود عملکرد
const getCachedKPIsSummary = unstable_cache(
  async ({ timeRange, tankIds, generatorIds }: CacheParams) => {
    // دریافت داده‌های تاریخی
    const historicalData = await analytics.getHistoricalData(timeRange)
    
    // دریافت اطلاعات مخازن و ژنراتورها
    const [tanks, generators] = await Promise.all([
      Promise.all(tankIds.map(id => db.getTankById(id))),
      Promise.all(generatorIds.map(id => db.getGeneratorById(id)))
    ])
    
    const validTanks = tanks.filter((tank): tank is Tank => Boolean(tank))
    const validGenerators = generators.filter((generator): generator is Generator => Boolean(generator))
    
    // جداسازی مخازن آب و سوخت
    const fuelTanks = validTanks.filter((t): t is Tank => t.type === 'fuel')
    const waterTanks = validTanks.filter((t): t is Tank => t.type === 'water')
    
    // محاسبه میانگین‌ها از داده‌های تاریخی
    const fuelLevels = historicalData.map(d => d.fuelAverage)
    const waterLevels = historicalData.map(d => d.waterAverage)
    const alertCounts = historicalData.map(d => d.alerts)
    
    // محاسبه میانگین کلی برای هر ژنراتور
    const generatorAverages: Record<string, number> = {}
    validGenerators.forEach(gen => {
      if (gen.id) {
        const values = historicalData
          .filter(d => d.generators[gen.id] !== undefined)
          .map(d => d.generators[gen.id])
        
        generatorAverages[gen.id] = values.length > 0 
          ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length 
          : 0
      }
    })
    
    // محاسبه شاخص‌های کلیدی عملکرد
    const totalFuelCapacity = fuelTanks.reduce((sum: number, tank: Tank) => sum + (tank.capacity || 0), 0)
    const totalWaterCapacity = waterTanks.reduce((sum: number, tank: Tank) => sum + (tank.capacity || 0), 0)
    const totalGeneratorCapacity = validGenerators.reduce((sum: number, gen: Generator) => sum + (gen.capacity || 0), 0)
    
    // محاسبه میانگین‌ها
    const fuelAverage = fuelLevels.length > 0 
      ? fuelLevels.reduce((sum: number, val: number) => sum + val, 0) / fuelLevels.length 
      : 0
    
    const waterAverage = waterLevels.length > 0 
      ? waterLevels.reduce((sum: number, val: number) => sum + val, 0) / waterLevels.length 
      : 0
    
    const alertAverage = alertCounts.length > 0 
      ? alertCounts.reduce((sum: number, val: number) => sum + val, 0) / alertCounts.length 
      : 0
    
    // محاسبه روند مصرف
    const fuelTrend = calculateTrend(fuelLevels)
    const waterTrend = calculateTrend(waterLevels)
    const alertTrend = calculateTrend(alertCounts)
    
    // محاسبه شاخص‌های بهره‌وری
    const fuelEfficiency = totalFuelCapacity > 0 ? (fuelAverage / totalFuelCapacity) * 100 : 0
    const waterEfficiency = totalWaterCapacity > 0 ? (waterAverage / totalWaterCapacity) * 100 : 0
    
    // محاسبه عملکرد ژنراتورها
    const generatorPerformance = Object.values(generatorAverages).length > 0
      ? Object.values(generatorAverages).reduce((sum: number, val: number) => sum + val, 0) / Object.values(generatorAverages).length
      : 0
    
    // محاسبه پیش‌بینی‌های مصرف
    const [fuelPredictions, waterPredictions] = await Promise.all([
      Promise.all(fuelTanks.map(tank => db.predictTankUsage(tank.id))),
      Promise.all(waterTanks.map(tank => db.predictTankUsage(tank.id)))
    ])
    
    const validFuelPredictions = fuelPredictions.filter((pred): pred is NonNullable<typeof pred> => Boolean(pred))
    const validWaterPredictions = waterPredictions.filter((pred): pred is NonNullable<typeof pred> => Boolean(pred))
    
    // محاسبه میانگین روزهای باقی‌مانده
    const avgFuelDaysLeft = validFuelPredictions.length > 0
      ? validFuelPredictions.reduce((sum: number, pred) => sum + (pred.predictedDays || 0), 0) / validFuelPredictions.length
      : 0
    
    const avgWaterDaysLeft = validWaterPredictions.length > 0
      ? validWaterPredictions.reduce((sum: number, pred) => sum + (pred.predictedDays || 0), 0) / validWaterPredictions.length
      : 0
    
    return {
      timeRange,
      summary: {
        fuel: {
          average: fuelAverage,
          trend: fuelTrend,
          efficiency: fuelEfficiency,
          daysRemaining: avgFuelDaysLeft,
          totalCapacity: totalFuelCapacity
        },
        water: {
          average: waterAverage,
          trend: waterTrend,
          efficiency: waterEfficiency,
          daysRemaining: avgWaterDaysLeft,
          totalCapacity: totalWaterCapacity
        },
        generator: {
          performance: generatorPerformance,
          totalCapacity: totalGeneratorCapacity,
          averagesByGenerator: generatorAverages
        },
        alerts: {
          average: alertAverage,
          trend: alertTrend
        }
      },
      timestamp: new Date().toISOString()
    }
  },
  ['analytics-kpis-summary'],
  { revalidate: 300 } // کش برای 5 دقیقه
)

// تابع کمکی برای محاسبه روند
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0
  
  // محاسبه روند با مقایسه نیمه اول و دوم داده‌ها
  const halfIndex = Math.floor(values.length / 2)
  
  const firstHalf = values.slice(0, halfIndex)
  const secondHalf = values.slice(halfIndex)
  
  const firstHalfAvg = firstHalf.reduce((sum: number, val: number) => sum + val, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum: number, val: number) => sum + val, 0) / secondHalf.length
  
  // محاسبه درصد تغییر
  return firstHalfAvg !== 0 
    ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
    : (secondHalfAvg > 0 ? 100 : 0) // اگر میانگین نیمه اول صفر باشد
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { 
      timeRange = "30", 
      tankIds = [], 
      generatorIds = [] 
    }: KPIsSummaryRequest = await request.json()
    
    const timeRangeNum = parseInt(timeRange)
    
    // اگر هیچ شناسه‌ای ارسال نشده، همه موارد را دریافت کنیم
    const [allTanks, allGenerators] = await Promise.all([
      tankIds.length === 0 ? db.getTanks() : Promise.resolve([]),
      generatorIds.length === 0 ? db.getGenerators() : Promise.resolve([])
    ])

    const finalTankIds = tankIds.length > 0 ? tankIds : allTanks.map(t => t.id)
    const finalGeneratorIds = generatorIds.length > 0 ? generatorIds : allGenerators.map(g => g.id)

    // دریافت خلاصه KPIها از کش
    const kpisSummary = await getCachedKPIsSummary({
      timeRange: timeRangeNum,
      tankIds: finalTankIds,
      generatorIds: finalGeneratorIds
    })

    return NextResponse.json(kpisSummary)
  } catch (error) {
    console.error("[API] Error calculating KPIs summary:", error)
    return NextResponse.json(
      { error: "خطا در محاسبه خلاصه شاخص‌های کلیدی عملکرد" },
      { status: 500 }
    )
  }
}