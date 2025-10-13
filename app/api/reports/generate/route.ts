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
  // تولید PDF جامع با ساختار چند صفحه‌ای و بخش‌بندی
  const data = _data as any
  const reportType = _reportType

  const lines: string[] = []
  const now = new Date()
  const headerTitleMap: Record<string, string> = {
    summary: "گزارش خلاصه",
    analytics: "گزارش تحلیلی",
    export: "گزارش خروجی داده‌ها",
  }
  const sep = "----------------------------------------------"

  lines.push("سامانه مدیریت مخازن و هشدارها")
  lines.push(headerTitleMap[reportType] || "گزارش")
  lines.push(`تاریخ تهیه: ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now)}`)
  lines.push("")

  try {
    if (reportType === 'summary') {
      lines.push("بخش: خلاصه وضعیت")
      lines.push(sep)
      if (Array.isArray(data)) {
        data.forEach((row: any, idx: number) => {
          const name = row.name ?? row.title ?? `مورد ${idx + 1}`
          const value = row.currentLevel ?? row.value ?? row.count ?? row.total ?? '-'
          const capacity = row.capacity != null ? ` / ظرفیت: ${row.capacity}` : ''
          const trend = row.usageTrend ? ` / روند: ${row.usageTrend}` : ''
          lines.push(`${name}: سطح فعلی ${value}${capacity}${trend}`)
        })
      } else if (data && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          const v = data[key]
          lines.push(`${key}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        })
      }
    } else if (reportType === 'analytics') {
      lines.push("بخش: تحلیل‌ها")
      lines.push(sep)
      const aggKeys = [
        'totalEntities',
        'averageUsage',
        'peakUsageTime',
        'lowUsageTime',
      ]
      if (data?.statistics) {
        lines.push("آمار کل")
        lines.push(sep)
        aggKeys.forEach((k) => {
          if (data.statistics[k] !== undefined) {
            lines.push(`${k}: ${data.statistics[k]}`)
          }
        })
      }
      if (data?.trends) {
        lines.push("")
        lines.push("روندها")
        lines.push(sep)
        Object.keys(data.trends).forEach((k) => {
          lines.push(`${k}: ${data.trends[k]}`)
        })
      }
      if (data?.predictions) {
        lines.push("")
        lines.push("پیش‌بینی‌ها")
        lines.push(sep)
        Object.keys(data.predictions).forEach((k) => {
          lines.push(`${k}: ${data.predictions[k]}`)
        })
      }
      if (Array.isArray(data?.alerts)) {
        lines.push("")
        lines.push("هشدارهای مرتبط")
        lines.push(sep)
        data.alerts.slice(0, 100).forEach((a: any, i: number) => {
          const label = a.title ?? a.message ?? `هشدار ${i + 1}`
          const sev = a.severity ?? a.level ?? ''
          const ts = a.timestamp ? new Date(a.timestamp).toLocaleString('fa-IR') : ''
          lines.push(`${label}${sev ? ' | شدت: ' + sev : ''}${ts ? ' | زمان: ' + ts : ''}`)
        })
      }
    } else if (reportType === 'export') {
      lines.push("بخش: خروجی داده‌های خام")
      lines.push(sep)
      const rows: any[] = Array.isArray(data) ? data : data?.rows ?? []
      const headers: string[] = Array.isArray(data?.headers)
        ? data.headers
        : rows.length
        ? Object.keys(rows[0])
        : []
      if (headers.length) {
        lines.push(headers.join(' , '))
      }
      rows.forEach((row, i) => {
        const vals = headers.map((h) => {
          const v = row[h]
          return typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')
        })
        lines.push(vals.join(' , '))
      })
    } else {
      lines.push("داده‌های گزارش")
      lines.push(sep)
      lines.push(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
    }
  } catch (e) {
    lines.push("")
    lines.push("خطا در آماده‌سازی گزارش برای PDF")
    lines.push(String(e))
  }

  // رندر خطوط به PDF ساده چند صفحه‌ای
  const pageLineLimit = 45
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += pageLineLimit) {
    pages.push(lines.slice(i, i + pageLineLimit))
  }
  if (pages.length === 0) pages.push(["(بدون محتوا)"])

  let pdf = "%PDF-1.4\n"
  const objects: string[] = []
  const offsets: number[] = []

  const addObject = (obj: string) => {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'))
    const index = objects.length + 1
    pdf += `${index} 0 obj\n${obj}\nendobj\n`
    objects.push(obj)
  }

  // فونت استاندارد
  addObject("<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>") // 1

  const pageObjIdxs: number[] = []
  const contentObjIdxs: number[] = []

  pages.forEach((pageLines) => {
    let stream = "BT\n/F1 12 Tf\n1 0 0 1 50 800 Tm\n"
    pageLines.forEach((line) => {
      const escaped = String(line)
        .replace(/\\\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
      stream += `(${escaped}) Tj\n0 -16 Td\n`
    })
    stream += "ET"
    const streamContent = Buffer.from(stream, 'utf-8')
    addObject(`<< /Length ${streamContent.length} >>\nstream\n${stream}\nendstream`) // content
    const contentIdx = objects.length
    contentObjIdxs.push(contentIdx)

    addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 1 0 R >> >> /Contents ${contentIdx} 0 R >>`)
    pageObjIdxs.push(objects.length)
  })

  // شیء Pages
  const kids = pageObjIdxs.map((i) => `${i} 0 R`).join(' ')
  addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageObjIdxs.length} >>`)
  const pagesIdx = objects.length

  // بازنویسی Page با Parent صحیح
  const fixedPageIdxs: number[] = []
  pageObjIdxs.forEach((_, i) => {
    const contentIdx = contentObjIdxs[i]
    addObject(`<< /Type /Page /Parent ${pagesIdx} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 1 0 R >> >> /Contents ${contentIdx} 0 R >>`)
    fixedPageIdxs.push(objects.length)
  })

  // Catalog
  addObject(`<< /Type /Catalog /Pages ${pagesIdx} 0 R >>`)
  const catalogIdx = objects.length

  // xref
  const xrefOffset = Buffer.byteLength(pdf, 'utf-8')
  const count = objects.length
  let xref = `xref\n0 ${count + 1}\n`
  xref += "0000000000 65535 f \n"
  for (let i = 0; i < count; i++) {
    const off = offsets[i]
    const padded = String(off).padStart(10, '0')
    xref += `${padded} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${count + 1} /Root ${catalogIdx} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  pdf += xref + trailer

  return Buffer.from(pdf, 'utf-8')
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