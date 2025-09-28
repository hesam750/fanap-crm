import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { analytics } from "@/lib/analytics-service"
import { validateAuth } from "@/lib/auth-middleware"
import { unstable_cache } from "next/cache"

// تعریف تایپ‌های interface
interface AggregatedKPIsRequest {
  aggregation: "daily" | "weekly" | "monthly"; // نوع تجمیع
  timeRange?: string; // بازه زمانی به روز
  tankIds?: string[];
  generatorIds?: string[];
}

interface CacheParams {
  aggregation: "daily" | "weekly" | "monthly";
  timeRange: number;
  tankIds: string[];
  generatorIds: string[];
}

// کش برای بهبود عملکرد
const getCachedAggregatedKPIs = unstable_cache(
  async ({ aggregation, timeRange, tankIds, generatorIds }: CacheParams) => {
    // دریافت داده‌های تاریخی
    const historicalData = await analytics.getHistoricalData(timeRange)
    
    // دریافت اطلاعات مخازن و ژنراتورها
    const [tanks, generators] = await Promise.all([
      Promise.all(tankIds.map(id => db.getTankById(id))),
      Promise.all(generatorIds.map(id => db.getGeneratorById(id)))
    ])
    
    const validTanks = tanks.filter((tank): tank is NonNullable<typeof tank> => Boolean(tank))
    const validGenerators = generators.filter((generator): generator is NonNullable<typeof generator> => Boolean(generator))
    
    // تجمیع داده‌ها بر اساس نوع درخواست
    const aggregatedData = aggregateHistoricalData(historicalData, aggregation)
    
    // محاسبه شاخص‌های کلیدی عملکرد برای هر دوره تجمیع
    const kpisByPeriod = await Promise.all(
      aggregatedData.map(async (period) => {
        // محاسبه شاخص‌های مصرف برای این دوره
        const fuelTanks = validTanks.filter(t => t?.type === 'fuel')
        const waterTanks = validTanks.filter(t => t?.type === 'water')
        
        // محاسبه مصرف کل و شدت مصرف
        const totalFuelCapacity = fuelTanks.reduce((sum: number, tank) => sum + (tank.capacity || 0), 0)
        const totalWaterCapacity = waterTanks.reduce((sum: number, tank) => sum + (tank.capacity || 0), 0)
        const totalGeneratorCapacity = validGenerators.reduce((sum: number, gen) => sum + (gen.capacity || 0), 0)
        
        return {
          period: period.period,
          startDate: period.startDate,
          endDate: period.endDate,
          consumption: {
            fuel: {
              average: period.fuelAverage,
              total: totalFuelCapacity,
              efficiency: period.fuelAverage / totalFuelCapacity * 100
            },
            water: {
              average: period.waterAverage,
              total: totalWaterCapacity,
              efficiency: period.waterAverage / totalWaterCapacity * 100
            },
            generator: {
              averages: period.generators,
              total: totalGeneratorCapacity,
              performance: Object.values(period.generators).reduce((sum, val) => sum + val, 0) / 
                          (Object.keys(period.generators).length || 1)
            }
          },
          alerts: period.alerts
        }
      })
    )
    
    return {
      aggregation,
      timeRange,
      kpis: kpisByPeriod,
      timestamp: new Date().toISOString()
    }
  },
  ['analytics-aggregated-kpis'],
  { revalidate: 300 } // کش برای 5 دقیقه
)

// تابع کمکی برای تجمیع داده‌های تاریخی
function aggregateHistoricalData(
  data: Array<{
    date: string;
    timestamp: Date;
    fuelAverage: number;
    waterAverage: number;
    generators: { [key: string]: number };
    alerts: number;
  }>,
  aggregation: "daily" | "weekly" | "monthly"
) {
  if (aggregation === "daily") {
    // برای تجمیع روزانه، داده‌ها را همانطور که هست برمی‌گردانیم
    return data.map(day => ({
      period: day.date,
      startDate: day.timestamp,
      endDate: day.timestamp,
      fuelAverage: day.fuelAverage,
      waterAverage: day.waterAverage,
      generators: day.generators,
      alerts: day.alerts
    }))
  }
  
  // تجمیع هفتگی یا ماهانه
  const aggregated: Record<string, {
    period: string;
    startDate: Date;
    endDate: Date;
    fuelValues: number[];
    waterValues: number[];
    generatorValues: Record<string, number[]>;
    alertCount: number;
  }> = {}
  
  data.forEach(day => {
    const date = new Date(day.timestamp)
    let key: string

    // تهیه فرمت‌کننده‌های تقویم جلالی برای سال و ماه
    const persianYearFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' })
    const persianMonthFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' })

    if (aggregation === "weekly") {
      // محاسبه شماره هفته در سال (بر مبنای تاریخ میلادی، فقط نمایش سال را به شمسی تغییر می‌دهیم)
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      const persianYear = persianYearFormatter.format(date)
      key = `هفته ${weekNumber} ${persianYear}`
    } else { // monthly
      // نمایش نام ماه و سال شمسی با استفاده از Intl
      const persianMonth = persianMonthFormatter.format(date)
      const persianYear = persianYearFormatter.format(date)
      key = `${persianMonth} ${persianYear}`
    }
    
    if (!aggregated[key]) {
      aggregated[key] = {
        period: key,
        startDate: new Date(day.timestamp),
        endDate: new Date(day.timestamp),
        fuelValues: [],
        waterValues: [],
        generatorValues: {},
        alertCount: 0
      }
    }
    
    // به‌روزرسانی تاریخ شروع و پایان
    if (day.timestamp < aggregated[key].startDate) {
      aggregated[key].startDate = new Date(day.timestamp)
    }
    if (day.timestamp > aggregated[key].endDate) {
      aggregated[key].endDate = new Date(day.timestamp)
    }
    
    // اضافه کردن مقادیر
    aggregated[key].fuelValues.push(day.fuelAverage)
    aggregated[key].waterValues.push(day.waterAverage)
    aggregated[key].alertCount += day.alerts
    
    // اضافه کردن مقادیر ژنراتورها
    Object.entries(day.generators).forEach(([genName, value]) => {
      if (!aggregated[key].generatorValues[genName]) {
        aggregated[key].generatorValues[genName] = []
      }
      aggregated[key].generatorValues[genName].push(value)
    })
  })
  
  // محاسبه میانگین‌ها
  return Object.values(aggregated).map(item => {
    // محاسبه میانگین برای هر ژنراتور
    const generators: Record<string, number> = {}
    Object.entries(item.generatorValues).forEach(([genName, values]) => {
      generators[genName] = values.reduce((sum, val) => sum + val, 0) / values.length
    })
    
    return {
      period: item.period,
      startDate: item.startDate,
      endDate: item.endDate,
      fuelAverage: item.fuelValues.reduce((sum, val) => sum + val, 0) / item.fuelValues.length,
      waterAverage: item.waterValues.reduce((sum, val) => sum + val, 0) / item.waterValues.length,
      generators,
      alerts: item.alertCount
    }
  })
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { 
      aggregation = "daily", 
      timeRange = "30", 
      tankIds = [], 
      generatorIds = [] 
    }: AggregatedKPIsRequest = await request.json()
    
    const timeRangeNum = parseInt(timeRange)
    
    // اگر هیچ شناسه‌ای ارسال نشده، همه موارد را دریافت کنیم
    const [allTanks, allGenerators] = await Promise.all([
      tankIds.length === 0 ? db.getTanks() : Promise.resolve([]),
      generatorIds.length === 0 ? db.getGenerators() : Promise.resolve([])
    ])

    const finalTankIds = tankIds.length > 0 ? tankIds : allTanks.map(t => t.id)
    const finalGeneratorIds = generatorIds.length > 0 ? generatorIds : allGenerators.map(g => g.id)

    // دریافت KPIهای تجمیعی از کش
    const aggregatedKPIs = await getCachedAggregatedKPIs({
      aggregation,
      timeRange: timeRangeNum,
      tankIds: finalTankIds,
      generatorIds: finalGeneratorIds
    })

    return NextResponse.json(aggregatedKPIs)
  } catch (error) {
    console.error("[API] Error calculating aggregated KPIs:", error)
    return NextResponse.json(
      { error: "خطا در محاسبه شاخص‌های کلیدی عملکرد تجمیعی" },
      { status: 500 }
    )
  }
}