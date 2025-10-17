/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"
import type { PrismaTank, PrismaGenerator } from "@/lib/types"
import { saveReport } from "@/lib/report-store"

export const runtime = "nodejs"


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
      // خلاصه مدیریتی فارسی با KPIها، روندها، پیش‌بینی و هشدارها
      lines.push("خلاصه مدیریتی")
      lines.push(sep)

      // آمار کلیدی
      const stats = (data as any)?.statistics
      if (stats) {
        lines.push("آمار کلیدی")
        lines.push(sep)
        lines.push(`تعداد کل موجودیت‌ها: ${stats.overview?.totalEntities ?? '-'}`)
        lines.push(`تعداد مخازن: ${stats.overview?.tanksCount ?? '-'} | تعداد ژنراتورها: ${stats.overview?.generatorsCount ?? '-'}`)
        lines.push(`بازه گزارش: ${stats.overview?.timeframeHours ?? '-'} ساعت`)
        lines.push(`میانگین سطح مخزن: ${stats.kpis?.avgTankLevelPercent ?? '-'}% | میانگین سطح ژنراتور: ${stats.kpis?.avgGeneratorLevelPercent ?? '-'}% | میانگین کل: ${stats.kpis?.avgOverallLevelPercent ?? '-'}%`)
        lines.push(`مخازن بحرانی: ${stats.kpis?.criticalTanks ?? 0} | مخازن کم‌سطح: ${stats.kpis?.lowTanks ?? 0}`)
        lines.push(`ژنراتورهای بحرانی: ${stats.kpis?.criticalGenerators ?? 0} | ژنراتورهای کم‌سطح: ${stats.kpis?.lowGenerators ?? 0}`)
        lines.push(`آستانه هشدار کم‌سطح: ${stats.thresholds?.lowAlertThreshold ?? '-'}% | آستانه هشدار بحرانی: ${stats.thresholds?.criticalAlertThreshold ?? '-'}%`)
      }

      // تحلیل روندها
      const trends = (data as any)?.trends
      if (trends) {
        lines.push("")
        lines.push("تحلیل روندها")
        lines.push(sep)
        lines.push(`مدت بازه: ${trends.periodHours ?? '-'} ساعت`)
        lines.push(`میانگین نرخ تغییر مخازن: ${trends.tanks?.avgChangeRate ?? 0}%`)
        lines.push(`صعودی/نزولی/ثابت (مخازن): ${trends.tanks?.upCount ?? 0}/${trends.tanks?.downCount ?? 0}/${trends.tanks?.stableCount ?? 0}`)
        const topTanks = trends.tanks?.topMovers || []
        if (Array.isArray(topTanks) && topTanks.length) {
          lines.push("بیشترین تغییر (مخازن):")
          topTanks.forEach((i: any) => {
            const trendLabel = i.trend === 'up' ? 'صعودی' : i.trend === 'down' ? 'نزولی' : 'ثابت'
            lines.push(`- ${i.name}: ${i.changeRate}% (${trendLabel})`)
          })
        }
        lines.push(`میانگین نرخ تغییر ژنراتورها: ${trends.generators?.avgChangeRate ?? 0}%`)
        lines.push(`صعودی/نزولی/ثابت (ژنراتورها): ${trends.generators?.upCount ?? 0}/${trends.generators?.downCount ?? 0}/${trends.generators?.stableCount ?? 0}`)
        const topGens = trends.generators?.topMovers || []
        if (Array.isArray(topGens) && topGens.length) {
          lines.push("بیشترین تغییر (ژنراتورها):")
          topGens.forEach((i: any) => {
            const trendLabel = i.trend === 'up' ? 'صعودی' : i.trend === 'down' ? 'نزولی' : 'ثابت'
            lines.push(`- ${i.name}: ${i.changeRate}% (${trendLabel})`)
          })
        }
      }

      // پیش‌بینی و ریسک
      const pred = (data as any)?.predictions
      if (pred) {
        lines.push("")
        lines.push("پیش‌بینی و ریسک")
        lines.push(sep)
        lines.push(`مخازن در معرض ریسک: ${pred.summary?.atRiskTanksCount ?? 0}`)
        if (Array.isArray(pred.atRisk?.tanks) && pred.atRisk.tanks.length) {
          pred.atRisk.tanks.forEach((p: any) => {
            const confLabel = p.confidence ? String(p.confidence) : ''
            lines.push(`- ${p.name}: ${p.predictedDays} روز | ${p.recommendation ?? ''}${confLabel ? ' | اعتماد: ' + confLabel : ''}`)
          })
        }
        lines.push(`ژنراتورهای در معرض ریسک: ${pred.summary?.atRiskGeneratorsCount ?? 0}`)
        if (Array.isArray(pred.atRisk?.generators) && pred.atRisk.generators.length) {
          pred.atRisk.generators.forEach((p: any) => {
            const confLabel = p.confidence ? String(p.confidence) : ''
            lines.push(`- ${p.name}: ${p.predictedHours} ساعت | ${p.recommendation ?? ''}${confLabel ? ' | اعتماد: ' + confLabel : ''}`)
          })
        }
        if (Array.isArray(pred.recommendations) && pred.recommendations.length) {
          lines.push("توصیه‌ها:")
          pred.recommendations.forEach((r: string) => lines.push(`- ${r}`))
        }
      }

      // هشدارهای مرتبط
      const alerts = (data as any)?.alerts
      if (alerts) {
        lines.push("")
        lines.push("هشدارهای مرتبط")
        lines.push(sep)
        lines.push(`تعداد هشدارها: ${alerts.summary?.total ?? 0}`)
        const sev = alerts.summary?.bySeverity || {}
        lines.push(`شدت‌ها: بحرانی ${sev.critical ?? 0} | بالا ${sev.high ?? 0} | متوسط ${sev.medium ?? 0} | پایین ${sev.low ?? 0}`)
        const recent = (alerts.items || []).slice(0, 10)
        if (recent.length) {
          lines.push("۱۰ هشدار اخیر:")
          recent.forEach((a: any, i: number) => {
            const label = a.title ?? a.message ?? a.id ?? `هشدار ${i + 1}`
            const s = String(a.severity || a.level || '')
            const ts = a.createdAt ? new Date(a.createdAt).toLocaleString('fa-IR') : (a.timestamp ? new Date(a.timestamp).toLocaleString('fa-IR') : '')
            lines.push(`- ${label}${s ? ' | شدت: ' + s : ''}${ts ? ' | زمان: ' + ts : ''}`)
          })
        }
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
  // آمار واقعی بر اساس داده‌های سیستم و آستانه‌ها
  const [tanks, generators, settings] = await Promise.all([
    entityType === 'generator' ? Promise.resolve([]) : db.getTanks(),
    entityType === 'tank' ? Promise.resolve([]) : db.getGenerators(),
    db.getSystemSettings(),
  ])

  const lowAlertThreshold = Number(settings?.lowAlertThreshold ?? 20)
  const criticalAlertThreshold = Number(settings?.criticalAlertThreshold ?? 10)

  const tankPercents = tanks.map((t) => (t.capacity > 0 ? (t.currentLevel / t.capacity) * 100 : 0))
  const genPercents = generators.map((g) => (g.capacity > 0 ? (g.currentLevel / g.capacity) * 100 : 0))

  const avgTank = tankPercents.length ? tankPercents.reduce((a, b) => a + b, 0) / tankPercents.length : 0
  const avgGen = genPercents.length ? genPercents.reduce((a, b) => a + b, 0) / genPercents.length : 0
  const allPercents = tankPercents.concat(genPercents)
  const avgOverall = allPercents.length ? allPercents.reduce((a, b) => a + b, 0) / allPercents.length : 0

  const criticalTanks = tankPercents.filter((p) => p <= criticalAlertThreshold).length
  const lowTanks = tankPercents.filter((p) => p > criticalAlertThreshold && p <= lowAlertThreshold).length
  const criticalGenerators = genPercents.filter((p) => p <= criticalAlertThreshold).length
  const lowGenerators = genPercents.filter((p) => p > criticalAlertThreshold && p <= lowAlertThreshold).length

  const timeframeHours = Math.max(1, Math.ceil((_end.getTime() - _start.getTime()) / (60 * 60 * 1000)))

  return {
    overview: {
      totalEntities: tanks.length + generators.length,
      tanksCount: tanks.length,
      generatorsCount: generators.length,
      timeframeHours,
    },
    kpis: {
      avgTankLevelPercent: parseFloat(avgTank.toFixed(2)),
      avgGeneratorLevelPercent: parseFloat(avgGen.toFixed(2)),
      avgOverallLevelPercent: parseFloat(avgOverall.toFixed(2)),
      criticalTanks,
      lowTanks,
      criticalGenerators,
      lowGenerators,
    },
    thresholds: {
      lowAlertThreshold,
      criticalAlertThreshold,
    },
  }
}

async function calculateTrends(entityType: "tank" | "generator" | "all", _start: Date, _end: Date) {
  // محاسبه روندها بر اساس داده‌های واقعی در بازه زمانی
  const [tanks, generators] = await Promise.all([
    entityType === 'generator' ? Promise.resolve([]) : db.getTanks(),
    entityType === 'tank' ? Promise.resolve([]) : db.getGenerators(),
  ])

  const periodHours = Math.max(1, Math.ceil((_end.getTime() - _start.getTime()) / (60 * 60 * 1000)))
  const tankIds = tanks.map((t) => t.id)
  const generatorIds = generators.map((g) => g.id)

  const bulk = await db.getBulkTrends(tankIds, generatorIds, periodHours)

  const summarize = (entries: Record<string, any>, entities: Array<{ id: string; name: string }>) => {
    const items = entities.map((e) => {
      const tr = entries?.[e.id] || {}
      const changeRate = Number(tr?.percentage ?? tr?.changeRate ?? 0)
      const trend: 'up' | 'down' | 'stable' = tr?.trend || 'stable'
      return { id: e.id, name: e.name, changeRate, trend }
    })

    const avgChangeRate = items.length ? items.reduce((sum, i) => sum + i.changeRate, 0) / items.length : 0
    const upCount = items.filter((i) => i.trend === 'up').length
    const downCount = items.filter((i) => i.trend === 'down').length
    const stableCount = items.filter((i) => i.trend === 'stable').length
    const topMovers = items.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)).slice(0, 5)

    return {
      avgChangeRate: parseFloat(avgChangeRate.toFixed(2)),
      upCount,
      downCount,
      stableCount,
      topMovers,
    }
  }

  return {
    periodHours,
    tanks: summarize(bulk?.tanks || {}, tanks),
    generators: summarize(bulk?.generators || {}, generators),
  }
}

async function generatePredictions(entityType: "tank" | "generator" | "all") {
  // تولید پیش‌بینی‌های دقیق و استخراج ریسک‌ها
  const [tanks, generators] = await Promise.all([
    entityType === 'generator' ? Promise.resolve([]) : db.getTanks(),
    entityType === 'tank' ? Promise.resolve([]) : db.getGenerators(),
  ])
  const tankIds = tanks.map((t) => t.id)
  const generatorIds = generators.map((g) => g.id)

  const bulk = await db.getBulkPredictions(tankIds, generatorIds)

  const tankPreds = tankIds.map((id) => ({
    id,
    name: tanks.find((t) => t.id === id)?.name || id,
    ...(bulk?.tanks?.[id] || {}),
  }))

  const genPreds = generatorIds.map((id) => ({
    id,
    name: generators.find((g) => g.id === id)?.name || id,
    ...(bulk?.generators?.[id] || {}),
  }))

  const atRiskTanks = tankPreds
    .filter((p: any) => typeof p?.predictedDays === 'number' && p.predictedDays <= 2)
    .sort((a: any, b: any) => (a.predictedDays ?? Number.POSITIVE_INFINITY) - (b.predictedDays ?? Number.POSITIVE_INFINITY))
    .slice(0, 5)
    .map((p: any) => ({ id: p.id, name: p.name, predictedDays: p.predictedDays, recommendation: p.recommendation, confidence: p.confidence }))

  const atRiskGenerators = genPreds
    .filter((p: any) => typeof p?.predictedHours === 'number' && p.predictedHours <= 24)
    .sort((a: any, b: any) => (a.predictedHours ?? Number.POSITIVE_INFINITY) - (b.predictedHours ?? Number.POSITIVE_INFINITY))
    .slice(0, 5)
    .map((p: any) => ({ id: p.id, name: p.name, predictedHours: p.predictedHours, recommendation: p.recommendation, confidence: p.confidence }))

  const recommendations: string[] = []
  if (atRiskTanks.length > 0) recommendations.push("برنامه تأمین برای مخازن پرخطر ظرف ۴۸ ساعت انجام شود.")
  if (atRiskGenerators.length > 0) recommendations.push("تأمین سوخت ژنراتورهای پرخطر و بررسی بار مصرف تا ۲۴ ساعت.")
  if (atRiskTanks.length === 0 && atRiskGenerators.length === 0) recommendations.push("وضعیت پایدار است؛ پایش دوره‌ای ادامه یابد.")

  return {
    summary: {
      atRiskTanksCount: atRiskTanks.length,
      atRiskGeneratorsCount: atRiskGenerators.length,
    },
    tanks: tankPreds,
    generators: genPreds,
    atRisk: {
      tanks: atRiskTanks,
      generators: atRiskGenerators,
    },
    recommendations,
  }
}

async function getRelevantAlerts(_start: Date, _end: Date) {
  // دریافت و خلاصه‌سازی هشدارهای مرتبط با بازه زمانی
  const all = await db.getAlerts()
  const startTs = _start.getTime()
  const endTs = _end.getTime()

  const items = (Array.isArray(all) ? all : [])
    .filter((a: any) => {
      const ts = new Date(a.createdAt ?? a.timestamp ?? Date.now()).getTime()
      return ts >= startTs && ts <= endTs
    })
    .sort((a: any, b: any) => new Date(b.createdAt ?? b.timestamp ?? Date.now()).getTime() - new Date(a.createdAt ?? a.timestamp ?? Date.now()).getTime())

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
  items.forEach((a: any) => {
    const sev = String(a.severity || a.level || '').toLowerCase()
    if (bySeverity[sev] != null) bySeverity[sev]++
  })

  return {
    items,
    summary: {
      total: items.length,
      bySeverity,
    },
  }
}