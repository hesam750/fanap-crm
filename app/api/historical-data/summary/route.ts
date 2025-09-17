import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

// تعریف انواع داده‌ها برای درخواست و پاسخ
interface SummaryRequest {
  tankIds?: string[]
  generatorIds?: string[]
  hours?: number
  limit?: number
}

interface HistoryRecord {
  id: string
  entityType: 'tank' | 'generator'
  entityId: string
  level: number
  timestamp: string
  recordedBy: string
}

interface SummaryResponse {
  records: HistoryRecord[]
  totalCount: number
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { tankIds = [], generatorIds = [], hours = 24, limit = 50 }: SummaryRequest = await request.json()

    // اگر پایگاه‌داده در دسترس نیست، سریعاً خروجی خالی برگردان
    const connected = await db.isConnected()
    if (!connected) {
      console.warn("[HISTORY_SUMMARY] Database not reachable, returning empty records")
      const response: SummaryResponse = { records: [], totalCount: 0 }
      return NextResponse.json(response)
    }

    // دریافت تاریخچه و تبدیل به ساختار یکسان
    const [tankRecordsNested, generatorRecordsNested] = await Promise.all([
      Promise.all(
        tankIds.map(async (tankId: string) => {
          const history = await db.getTankHistory(tankId, hours, limit)
          return history.map((rec, idx) => ({
            id: `tank-${tankId}-${(rec.timestamp as Date).getTime()}-${idx}`,
            entityType: 'tank' as const,
            entityId: tankId,
            level: rec.level,
            timestamp: (rec.timestamp as Date).toISOString(),
            recordedBy: rec.recordedBy,
          }))
        })
      ),
      Promise.all(
        generatorIds.map(async (generatorId: string) => {
          const history = await db.getGeneratorHistory(generatorId, hours, limit)
          return history.map((rec, idx) => ({
            id: `generator-${generatorId}-${(rec.timestamp as Date).getTime()}-${idx}`,
            entityType: 'generator' as const,
            entityId: generatorId,
            level: rec.level,
            timestamp: (rec.timestamp as Date).toISOString(),
            recordedBy: rec.recordedBy,
          }))
        })
      )
    ])

    const allRecords: HistoryRecord[] = [...tankRecordsNested.flat(), ...generatorRecordsNested.flat()]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    const response: SummaryResponse = {
      records: allRecords,
      totalCount: allRecords.length
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("[HISTORY_SUMMARY]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}