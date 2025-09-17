import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"
import { unstable_cache } from "next/cache"

// تعریف تایپ‌های interface
interface AnalyticsRequest {
  tankIds: string[];
  generatorIds: string[];
  period: string;
}

interface CacheParams {
  id: string;
  type: 'tank' | 'generator';
  period?: number;
}

// تعریف تایپ برای نتایج
interface TrendResult {
  trend: "increasing" | "decreasing" | "stable";
  changeRate: number;
  currentValue: number;
  error?: string;
}

interface PredictionResult {
  predictedValue: number;
  confidence: number;
  timestamp: string;
  error?: string;
}

// کش برای بهبود عملکرد
const getCachedTrends = unstable_cache(
  async ({ id, type, period = 24 }: CacheParams): Promise<TrendResult> => {
    if (type === 'tank') {
      return db.calculateTankTrends(id, period)
    } else {
      return db.calculateGeneratorTrends(id, period)
    }
  },
  ['analytics-trends'],
  { revalidate: 300 }
)

const getCachedPredictions = unstable_cache(
  async ({ id, type }: Omit<CacheParams, 'period'>): Promise<PredictionResult> => {
    if (type === 'tank') {
      return db.calculateTankPrediction(id)
    } else {
      return db.calculateGeneratorPrediction(id)
    }
  },
  ['analytics-predictions'],
  { revalidate: 600 }
)

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tankIds = [], generatorIds = [], period = "24" }: AnalyticsRequest = await request.json()
    const periodNum = parseInt(period)

    // اجرای موازی همه درخواست‌ها
    const [tankTrends, generatorTrends, tankPredictions, generatorPredictions] = await Promise.all([
      // ترندهای تانک
      Promise.allSettled(
        tankIds.map((id: string) => getCachedTrends({ id, type: 'tank', period: periodNum }))
      ),
      // ترندهای ژنراتور
      Promise.allSettled(
        generatorIds.map((id: string) => getCachedTrends({ id, type: 'generator', period: periodNum }))
      ),
      // پیش‌بینی‌های تانک
      Promise.allSettled(
        tankIds.map((id: string) => getCachedPredictions({ id, type: 'tank' }))
      ),
      // پیش‌بینی‌های ژنراتور
      Promise.allSettled(
        generatorIds.map((id: string) => getCachedPredictions({ id, type: 'generator' }))
      )
    ])

    // پردازش نتایج
    const processResults = <T>(
      results: PromiseSettledResult<T>[], 
      ids: string[]
    ): Record<string, T> => {
      return Object.fromEntries(
        results.map((result, index) => [
          ids[index],
          result.status === 'fulfilled' ? result.value : {
            error: "Failed to load data",
            trend: "stable",
            changeRate: 0
          } as T
        ])
      )
    }

    const response = {
      trends: {
        ...processResults<TrendResult>(tankTrends, tankIds),
        ...processResults<TrendResult>(generatorTrends, generatorIds)
      },
      predictions: {
        ...processResults<PredictionResult>(tankPredictions, tankIds),
        ...processResults<PredictionResult>(generatorPredictions, generatorIds)
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("[BULK_ANALYTICS]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}