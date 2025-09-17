import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { analytics } from "@/lib/analytics-service"
import { validateAuth } from "@/lib/auth-middleware"
import { unstable_cache } from "next/cache"
import { Tank, Generator } from "@/lib/types"

// تعریف تایپ‌های interface
interface KPIsRequest {
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
const getCachedKPIs = unstable_cache(
  async ({ timeRange, tankIds, generatorIds }: CacheParams) => {
    // دریافت اطلاعات مخازن و ژنراتورها
    const [tanks, generators] = await Promise.all([
      Promise.all(tankIds.map(id => db.getTankById(id))),
      Promise.all(generatorIds.map(id => db.getGeneratorById(id)))
    ])

    // محاسبه شاخص‌های کلیدی عملکرد
    const efficiencyMetrics = await analytics.getEfficiencyMetrics(
      tanks.filter((tank): tank is Tank => Boolean(tank)),
      generators.filter((generator): generator is Generator => Boolean(generator))
    )

    // محاسبه روندهای مصرف
    const [tankTrends, generatorTrends] = await Promise.all([
      Promise.allSettled(
        tankIds.map(id => analytics.calculateConsumptionTrends(id, 'tank', timeRange))
      ),
      Promise.allSettled(
        generatorIds.map(id => analytics.calculateConsumptionTrends(id, 'generator', timeRange))
      )
    ])

    // محاسبه شاخص‌های پیشرفته
    const fuelTanks = tanks.filter((t): t is Tank => Boolean(t) && t?.type === 'fuel')
    const waterTanks = tanks.filter((t): t is Tank => Boolean(t) && t?.type === 'water')
    
    // محاسبه مصرف کل و شدت مصرف
    const totalFuelCapacity = fuelTanks.reduce((sum, tank) => sum + (tank?.capacity || 0), 0)
    const totalWaterCapacity = waterTanks.reduce((sum, tank) => sum + (tank?.capacity || 0), 0)
    const totalGeneratorCapacity = generators.reduce((sum, gen) => sum + (gen?.capacity || 0), 0)
    
    const totalFuelLevel = fuelTanks.reduce((sum, tank) => sum + (tank?.currentLevel || 0), 0)
    const totalWaterLevel = waterTanks.reduce((sum, tank) => sum + (tank?.currentLevel || 0), 0)
    const totalGeneratorLevel = generators.reduce((sum, gen) => sum + (gen?.currentLevel || 0), 0)
    
    // شاخص‌های مصرف
    const fuelConsumptionRate = totalFuelCapacity > 0 ? (1 - totalFuelLevel / totalFuelCapacity) * 100 : 0
    const waterConsumptionRate = totalWaterCapacity > 0 ? (1 - totalWaterLevel / totalWaterCapacity) * 100 : 0
    const generatorUsageRate = totalGeneratorCapacity > 0 ? (totalGeneratorLevel / totalGeneratorCapacity) * 100 : 0
    
    // پردازش نتایج روندها
    const processTrends = <T>(results: PromiseSettledResult<T>[], ids: string[]): Record<string, T> => {
      return Object.fromEntries(
        results.map((result, index) => {
          let value: T;
          if (result.status === 'fulfilled') {
            value = result.value;
          } else {
            value = {
              trend: "stable",
              change: 0,
              percentage: 0,
              error: "خطا در محاسبه روند"
            } as unknown as T;
          }
          
          return [ids[index], value];
        })
      )
    }

    return {
      // شاخص‌های کارایی
      efficiency: efficiencyMetrics,
      
      // شاخص‌های مصرف
      consumption: {
        fuel: {
          total: totalFuelCapacity,
          current: totalFuelLevel,
          consumptionRate: fuelConsumptionRate,
          efficiency: efficiencyMetrics.fuelEfficiency
        },
        water: {
          total: totalWaterCapacity,
          current: totalWaterLevel,
          consumptionRate: waterConsumptionRate,
          efficiency: efficiencyMetrics.waterUsage
        },
        generator: {
          total: totalGeneratorCapacity,
          current: totalGeneratorLevel,
          usageRate: generatorUsageRate,
          performance: efficiencyMetrics.generatorPerformance
        }
      },
      
      // روندهای مصرف
      trends: {
        tanks: processTrends(tankTrends, tankIds),
        generators: processTrends(generatorTrends, generatorIds)
      },
      
      // زمان محاسبه
      timestamp: new Date().toISOString()
    }
  },
  ['analytics-kpis'],
  { revalidate: 300 } // کش برای 5 دقیقه
)

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { timeRange = "7", tankIds = [], generatorIds = [] }: KPIsRequest = await request.json()
    const timeRangeNum = parseInt(timeRange)

    // اگر هیچ شناسه‌ای ارسال نشده، همه موارد را دریافت کنیم
    const [allTanks, allGenerators] = await Promise.all([
      tankIds.length === 0 ? db.getTanks() : Promise.resolve([]),
      generatorIds.length === 0 ? db.getGenerators() : Promise.resolve([])
    ])

    const finalTankIds = tankIds.length > 0 ? tankIds : allTanks.map(t => t?.id)
    const finalGeneratorIds = generatorIds.length > 0 ? generatorIds : allGenerators.map(g => g?.id)

    // دریافت KPIها از کش
    const kpis = await getCachedKPIs({
      timeRange: timeRangeNum,
      tankIds: finalTankIds,
      generatorIds: finalGeneratorIds
    })

    return NextResponse.json(kpis)
  } catch (error) {
    console.error("[API] Error calculating KPIs:", error)
    return NextResponse.json(
      { error: "خطا در محاسبه شاخص‌های کلیدی عملکرد" },
      { status: 500 }
    )
  }
}