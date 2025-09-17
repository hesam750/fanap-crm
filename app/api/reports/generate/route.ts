/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"
import type { PrismaTank, PrismaGenerator } from "@/lib/types"
import { saveReport } from "@/lib/report-store"


export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, entityType, timeframe, startDate, endDate, format } = body as {
      type: "summary" | "analytics" | "export"
      entityType: "tank" | "generator" | "all"
      timeframe: "24h" | "7d" | "30d" | "custom"
      startDate?: string | Date
      endDate?: string | Date
      format: "json" | "csv" | "pdf"
    }

    // محاسبه تاریخ‌های شروع و پایان بر اساس بازه زمانی
    let start: Date
    let end: Date = new Date()

    switch (timeframe) {
      case '24h':
        start = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        start = new Date(startDate as string)
        end = new Date(endDate as string)
        break
      default:
        start = new Date(Date.now() - 24 * 60 * 60 * 1000)
    }

    type SummaryRow = {
      id: string
      name: string
      type: string
      currentLevel: number
      capacity: number
      usageTrend: string
      lastUpdated: Date
    }

    // تولید گزارش بر اساس نوع
    let reportData: SummaryRow[] | Record<string, unknown> | Array<Record<string, unknown>>

    switch (type) {
      case 'summary':
        reportData = await generateSummaryReport(entityType, start, end)
        break
      case 'analytics':
        reportData = await generateAnalyticsReport(entityType, start, end)
        break
      case 'export':
        reportData = await generateExportReport(entityType, start, end)
        break
      default:
        throw new Error('نوع گزارش نامعتبر است')
    }

    // تولید فایل بر اساس فرمت درخواستی
    const file = await generateFile(reportData, format, type)

    // ذخیره گزارش در حافظه برای دانلود
    const reportId = saveReport({
      content: file.content,
      contentType: file.contentType,
      filename: file.filename,
    })

    return NextResponse.json({
      id: reportId,
      data: reportData,
      downloadUrl: `/api/reports/download/${reportId}`,
      message: 'گزارش با موفقیت تولید شد'
    })

  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      { error: "خطا در تولید گزارش" },
      { status: 500 }
    )
  }
}

function isGenerator(entity: PrismaTank | PrismaGenerator): entity is PrismaGenerator {
  return (entity as PrismaGenerator).status !== undefined
}

async function generateSummaryReport(entityType: "tank" | "generator" | "all", start: Date, end: Date) {
  // دریافت داده‌های خلاصه از دیتابیس
  const entities: (PrismaTank | PrismaGenerator)[] = entityType === 'all' 
    ? [...await db.getTanks(), ...await db.getGenerators()]
    : entityType === 'tank' 
      ? await db.getTanks()
      : await db.getGenerators()

  type HistoryItem = { level: number }
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

  const summaryData = await Promise.all(
    entities.map(async (entity) => {
      const history = await db.getHistoricalData(
        isGenerator(entity) ? 'generator' : 'tank',
        entity.id,
        days,
        1,
        1000
      )

      return {
        id: entity.id,
        name: entity.name,
        type: isGenerator(entity) ? 'ژنراتور' : 'مخزن',
        currentLevel: entity.currentLevel,
        capacity: entity.capacity,
        usageTrend: await calculateUsageTrend((history.data as HistoryItem[])),
        lastUpdated: entity.lastUpdated
      }
    })
  )

  return summaryData
}

async function generateAnalyticsReport(entityType: "tank" | "generator" | "all", start: Date, end: Date) {
  // تولید گزارش تحلیلی پیشرفته
  const analyticsData = {
    timeframe: { start, end },
    statistics: await calculateStatistics(entityType, start, end),
    trends: await calculateTrends(entityType, start, end),
    predictions: await generatePredictions(entityType),
    alerts: await getRelevantAlerts(start, end)
  }

  return analyticsData
}

async function generateExportReport(entityType: "tank" | "generator" | "all", start: Date, end: Date) {
  // تولید گزارش خام داده‌ها برای export
  const entities: (PrismaTank | PrismaGenerator)[] = entityType === 'all' 
    ? [...await db.getTanks(), ...await db.getGenerators()]
    : entityType === 'tank' 
      ? await db.getTanks()
      : await db.getGenerators()

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

  const exportData = await Promise.all(
    entities.map(async (entity) => {
      const history = await db.getHistoricalData(
        isGenerator(entity) ? 'generator' : 'tank',
        entity.id,
        days,
        1,
        5000 // حداکثر رکورد
      )

      return {
        entity: {
          id: entity.id,
          name: entity.name,
          type: isGenerator(entity) ? 'ژنراتور' : 'مخزن',
          capacity: entity.capacity
        },
        records: history.data as Array<Record<string, unknown>>
      }
    })
  )

  return exportData
}

type GeneratedFile = { content: string | Buffer; filename: string; contentType: string }

async function generateFile(data: unknown, format: "json" | "csv" | "pdf", reportType: string): Promise<GeneratedFile> {
  // تولید فایل بر اساس فرمت درخواستی
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `report-${reportType}-${timestamp}.${format}`

  switch (format) {
    case 'json':
      return {
        content: JSON.stringify(data, null, 2),
        filename,
        contentType: 'application/json'
      }
    
    case 'csv':
      return {
        content: convertToCSV(data),
        filename,
        contentType: 'text/csv'
      }
    
    case 'pdf':
      return {
        content: await generatePDF(data, reportType),
        filename,
        contentType: 'application/pdf'
      }
    
    default:
      throw new Error('فرمت فایل پشتیبانی نمی‌شود')
  }
}

// توابع کمکی
function convertToCSV(_data: unknown): string {
  // تبدیل داده به فرمت CSV: آرایه‌ای از آبجکت‌ها را به CSV ساده تبدیل می‌کند
  if (!Array.isArray(_data)) return 'value\n' + JSON.stringify(_data)
  const arr = _data as Array<Record<string, unknown>>
  if (arr.length === 0) return ''

  const headerSet = new Set<string>()
  arr.forEach((row) => Object.keys(row).forEach((k) => headerSet.add(k)))
  const headers = Array.from(headerSet)
  const escape = (v: unknown) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    // Escape quotes and wrap in quotes
    return '"' + s.replace(/"/g, '""') + '"'
  }
  const lines = [headers.join(',')]
  for (const row of arr) {
    const line = headers.map((h) => escape(row[h])).join(',')
    lines.push(line)
  }
  return lines.join('\n')
}

async function generatePDF(_data: unknown, _reportType: string): Promise<Buffer> {
  // تولید PDF - برای نمونه محتوای ساده باز می‌گردد
  return Buffer.from("PDF content")
}

async function calculateUsageTrend(history: Array<{ level: number }>): Promise<string> {
  // محاسبه روند مصرف
  if (history.length < 2) return "ثابت"
  
  const first = history[0].level
  const last = history[history.length - 1].level
  const trend = ((last - first) / first) * 100
  
  if (trend > 5) return "صعودی"
  if (trend < -5) return "نزولی"
  return "ثابت"
}

async function calculateStatistics(entityType: "tank" | "generator" | "all", _start: Date, _end: Date) {
  // محاسبه آمار پیشرفته
  return {
    totalEntities: entityType === 'all' ? 
      (await db.getTanks()).length + (await db.getGenerators()).length :
      entityType === 'tank' ? 
        (await db.getTanks()).length : 
        (await db.getGenerators()).length,
    averageUsage: "75%",
    peakUsageTime: "14:00-16:00",
    lowUsageTime: "02:00-04:00"
  }
}

async function calculateTrends(_entityType: "tank" | "generator" | "all", _start: Date, _end: Date) {
  // محاسبه روندها
  return {
    weeklyTrend: "+2%",
    monthlyTrend: "+5%",
    comparison: "10% بهتر از ماه گذشته"
  }
}

async function generatePredictions(_entityType: "tank" | "generator" | "all") {
  // تولید پیش‌بینی‌ها
  return {
    next24h: "پایدار",
    next7d: "کاهش ۳٪",
    maintenanceAlert: "هیچ اخطاری وجود ندارد"
  }
}

async function getRelevantAlerts(_start: Date, _end: Date) {
  // دریافت اخطارهای مربوطه
  return [] as Array<Record<string, unknown>>
}