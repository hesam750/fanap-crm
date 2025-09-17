/* eslint-disable @typescript-eslint/no-explicit-any */
// app/reports/components/ReportsPanel.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Download, Calendar as CalendarIcon, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, BarChart3, Copy as CopyIcon, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as UICalendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"
import { apiClient } from "@/lib/api-client"
import type { Tank, Generator, Alert, HistoryRecord } from "@/lib/types"
import type { ActivityLog } from "@/lib/types"

interface ReportsPanelProps {
  tanks: Tank[]
  generators: Generator[]
  alerts: Alert[]
}

interface TrendData {
  trend: "up" | "down" | "stable"
  changeRate: number
  currentLevel: number
  previousLevel: number
  dataPoints: number
  error?: string
}

interface PredictionData {
  predictedDays?: number
  predictedHours?: number
  recommendation: string
  confidence: "low" | "medium" | "high"
  error?: string
}

interface BulkAnalyticsResponse {
  trends: Record<string, any>
  predictions: Record<string, any>
  timestamp: string
}

// کامپوننت اسکلت برای loading state
export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// تابع getTrendIcon برای نمایش آیکون ترند
const getTrendIcon = (trend?: TrendData) => {
  if (!trend) return <RefreshCw className="h-4 w-4 text-gray-400" />

  switch (trend.trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <div className="h-4 w-4 bg-gray-400 rounded-full" />
  }
}

export function ReportsPanel({ tanks, generators, alerts }: ReportsPanelProps) {
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
  // Activity Logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsLoading, setLogsLoading] = useState(false)
  const [trends, setTrends] = useState<Map<string, TrendData>>(new Map())
  const [predictions, setPredictions] = useState<Map<string, PredictionData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState<string>("24")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [lastUpdated, setLastUpdated] = useState<Date>()
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 15

  type ReportType = 'summary' | 'analytics' | 'export'
  type ReportFormat = 'json' | 'csv' | 'pdf'
  type ReportStatus = 'pending' | 'completed' | 'failed'
  interface GeneratedReportItem {
    id: string
    title: string
    type: ReportType
    timeframeLabel: string
    format: ReportFormat
    status: ReportStatus
    generatedAt: Date
    downloadUrl?: string
  }

  const [reportType, setReportType] = useState<ReportType>('summary')
  const [reportFormat, setReportFormat] = useState<ReportFormat>('json')
  const [generatedReports, setGeneratedReports] = useState<GeneratedReportItem[]>([])

  const { toast } = useToast()

  const paginatedRecords = historyRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  )

  // محاسبه ساعت‌ها بر اساس انتخاب کاربر
  const getHoursFromSelection = (): number | null => {
    if (reportPeriod === "custom") {
      const from = dateRange?.from
      const to = dateRange?.to || dateRange?.from
      if (!from || !to) return null
      const start = new Date(from)
      const end = new Date(to)
      // نرمال‌سازی برای احتساب انتهای روز انتخابی
      end.setHours(23, 59, 59, 999)
      const diffMs = Math.max(0, end.getTime() - start.getTime())
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)))
      return hours
    }
    const h = Number.parseInt(reportPeriod)
    return Number.isFinite(h) ? h : 24
  }

  // بهینه‌سازی دریافت تاریخچه
  const getHistoricalRecords = async (hours: number): Promise<HistoryRecord[]> => {
    try {
      // دریافت خلاصه تاریخچه به جای تمام رکوردها
      const summary = await apiClient.post<{ records: Array<{ id: string; entityType: 'tank' | 'generator'; entityId: string; level: number; timestamp: string; recordedBy: string }> }>("/api/historical-data/summary", {
        tankIds: tanks.map(t => t.id),
        generatorIds: generators.map(g => g.id),
        hours,
        limit: 100
      })

      // نگاشت به HistoryRecord پروژه
      return (summary.records || []).map((r) => ({
        id: r.id,
        tankId: r.entityType === 'tank' ? r.entityId : undefined,
        generatorId: r.entityType === 'generator' ? r.entityId : undefined,
        level: r.level,
        timestamp: new Date(r.timestamp),
        recordedBy: r.recordedBy,
      }))
    } catch (error) {
      console.error("Error fetching historical records:", error)
      toast({
        title: "خطا",
        description: "خطا در دریافت تاریخچه داده‌ها",
        variant: "destructive",
      })
      return []
    }
  }

  // نگاشت داده‌های API به ساختار UI
  const mapTrendResult = (raw: any): TrendData => {
    const mappedTrend = raw?.trend === 'increasing' ? 'up' : raw?.trend === 'decreasing' ? 'down' : 'stable'
    return {
      trend: mappedTrend,
      changeRate: Number(raw?.changeRate ?? 0),
      currentLevel: Number(raw?.currentValue ?? 0),
      previousLevel: 0,
      dataPoints: Number(raw?.dataPoints ?? 0),
      error: raw?.error,
    }
  }

  const mapPredictionResult = (raw: any): PredictionData => {
    const confNum = Number(raw?.confidence ?? 0)
    const confidence: PredictionData["confidence"] = confNum >= 0.75 ? 'high' : confNum >= 0.5 ? 'medium' : 'low'
    const predictedHours = Math.round(Number(raw?.predictedValue ?? 0))
    const recommendation = predictedHours <= 12
      ? 'مصرف بالا، بررسی و تامین به‌موقع توصیه می‌شود'
      : predictedHours <= 24
        ? 'مصرف متوسط، برنامه‌ریزی برای تامین انجام شود'
        : 'مصرف پایدار'
    return {
      predictedHours,
      predictedDays: Math.round(predictedHours / 24),
      recommendation,
      confidence,
      error: raw?.error,
    }
  }

  // Load latest activity logs (top 10)
  const loadActivityLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const { logs, total } = await apiClient.getActivityLogs({ limit: 10 })
      setActivityLogs(logs)
      setLogsTotal(total)
    } catch (e) {
      console.error("[ReportsPanel] Failed to load activity logs", e)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActivityLogs()
  }, [loadActivityLogs])

  // تابع بهینه‌شده برای دریافت داده‌ها
  const loadReportData = useCallback(async () => {
    setLoading(true)
    try {
      const hours = getHoursFromSelection()
      if (hours == null || hours <= 0) {
        toast({ title: "بازه نامعتبر", description: "لطفاً بازه تاریخ سفارشی را انتخاب کنید", variant: "destructive" })
        setLoading(false)
        return
      }

      // دریافت موازی همه داده‌ها
      const [records, bulkData] = await Promise.all([
        getHistoricalRecords(hours),
        apiClient.post<BulkAnalyticsResponse>("/api/analytics/bulk", {
          tankIds: tanks.map(t => t.id),
          generatorIds: generators.map(g => g.id),
          period: String(hours)
        })
      ])

      setHistoryRecords(records)

      // تبدیل داده‌های bulk به Map با نگاشت سازگار با UI
      const trendsMap = new Map<string, TrendData>()
      Object.entries(bulkData.trends || {}).forEach(([id, raw]) => {
        trendsMap.set(id, mapTrendResult(raw))
      })

      const predictionsMap = new Map<string, PredictionData>()
      Object.entries(bulkData.predictions || {}).forEach(([id, raw]) => {
        predictionsMap.set(id, mapPredictionResult(raw))
      })

      setTrends(trendsMap)
      setPredictions(predictionsMap)
      setLastUpdated(new Date())

      toast({
        title: "موفقیت",
        description: "داده‌های گزارش با موفقیت بارگذاری شد",
        variant:"success"
      })

    } catch (error) {
      console.error("[ReportsPanel] Error loading report data:", error)
      toast({
        title: "خطا",
        description: "خطا در بارگذاری داده‌های گزارش",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [reportPeriod, dateRange, tanks, generators, toast])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  const handleExportReport = async (type: string) => {
    try {
      const reportData = {
        period: reportPeriod,
        tanks: tanks.map((tank) => ({
          ...tank,
          trend: trends.get(tank.id),
          prediction: predictions.get(tank.id),
        })),
        generators: generators.map((gen) => ({
          ...gen,
          trend: trends.get(gen.id),
          prediction: predictions.get(gen.id),
        })),
        alerts: alerts,
        records: historyRecords.slice(0, 50),
        generatedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json"
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${type}-${new Date().toLocaleDateString("fa-IR")}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "موفقیت",
        description: `گزارش ${type} با موفقیت صادر شد`,
        variant:"success"
      })

    } catch (error) {
      console.error("[ReportsPanel] Error exporting report:", error)
      toast({
        title: "خطا",
        description: "خطا در صدور گزارش",
        variant: "destructive",
      })
    }
  }

  // تولید گزارش سمت سرور و دانلود
  const handleGenerateServerReport = async () => {
    try {
      const hours = getHoursFromSelection()
      if (hours == null || hours <= 0) {
        toast({ title: "بازه نامعتبر", description: "لطفاً بازه تاریخ سفارشی را انتخاب کنید", variant: "destructive" })
        return
      }
      const endDate = reportPeriod === "custom" ? (dateRange?.to || dateRange?.from || new Date()) : new Date()
      const startDate = reportPeriod === "custom"
        ? (dateRange?.from || new Date())
        : new Date((endDate as Date).getTime() - hours * 60 * 60 * 1000)

      const timeframeLabel = reportPeriod === 'custom'
        ? `${(startDate as Date).toLocaleDateString('fa-IR')} تا ${(endDate as Date).toLocaleDateString('fa-IR')}`
        : `${hours} ساعت گذشته`

      // افزودن آیتم موقت pending
      const tempId = `temp-${Date.now()}`
      const pendingItem: GeneratedReportItem = {
        id: tempId,
        title: `گزارش ${reportType === 'summary' ? 'خلاصه' : reportType === 'analytics' ? 'تحلیلی' : 'خروجی'}`,
        type: reportType,
        timeframeLabel,
        format: reportFormat,
        status: 'pending',
        generatedAt: new Date(),
      }
      setGeneratedReports((prev) => [pendingItem, ...prev])

      const res = await apiClient.post<{ id: string; downloadUrl: string; message: string }>(
        "/api/reports/generate",
        {
          type: reportType,
          entityType: "all",
          timeframe: "custom",
          startDate,
          endDate,
          format: reportFormat,
        }
      )

      // جایگزینی آیتم pending با completed
      setGeneratedReports((prev) => prev.map((r) => r.id === tempId ? {
        ...r,
        id: res.id,
        status: 'completed',
        downloadUrl: res.downloadUrl,
      } : r))

      // شروع دانلود خودکار
      const link = document.createElement('a')
      link.href = res.downloadUrl
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({ title: "موفقیت", description: "گزارش سمت سرور تولید و دانلود شد", variant:"success" })
    } catch (error) {
      console.error("[ReportsPanel] Error generating server report:", error)
      setGeneratedReports((prev) => prev.map((r) => r.status === 'pending' ? { ...r, status: 'failed' } : r))
      toast({ title: "خطا", description: "تولید گزارش سمت سرور ناکام ماند", variant: "destructive" })
    }
  }

  if (loading) {
    return <ReportSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* کنترل‌های گزارش */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              گزارش‌گیری و تحلیل
              {lastUpdated && (
                <span className="text-sm text-muted-foreground">
                  (آخرین بروزرسانی: {lastUpdated.toLocaleTimeString('fa-IR')})
                </span>
              )}
            </CardTitle>
            {/* Controls container: scrollable on mobile */}
            <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible -mx-4 sm:mx-0 px-4">
              <div className="flex items-center gap-2 w-max">
                {/* بازه زمانی */}
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">۶ ساعت گذشته</SelectItem>
                    <SelectItem value="12">۱۲ ساعت گذشته</SelectItem>
                    <SelectItem value="24">۲۴ ساعت گذشته</SelectItem>
                    <SelectItem value="168">هفته گذشته</SelectItem>
                    <SelectItem value="custom">بازه سفارشی...</SelectItem>
                  </SelectContent>
                </Select>
    
                {reportPeriod === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[260px] justify-start text-left font-normal whitespace-nowrap",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <span>
                              {dateRange.from.toLocaleDateString('fa-IR')} تا {dateRange.to.toLocaleDateString('fa-IR')}
                            </span>
                          ) : (
                            <span>
                              {dateRange.from.toLocaleDateString('fa-IR')}
                            </span>
                          )
                        ) : (
                          <span>انتخاب بازه تاریخ</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <UICalendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                      <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button variant="ghost" onClick={() => setDateRange(undefined)}>پاک کردن</Button>
                        <Button onClick={() => loadReportData()}>اعمال</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
    
                {/* نوع گزارش */}
                <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="نوع گزارش" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">خلاصه</SelectItem>
                    <SelectItem value="analytics">تحلیلی</SelectItem>
                    <SelectItem value="export">خروجی داده</SelectItem>
                  </SelectContent>
                </Select>
    
                {/* فرمت */}
                <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as any)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="فرمت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
    
                <Button variant="outline" onClick={() => loadReportData()} className="whitespace-nowrap">
                  <RefreshCw className="h-4 w-4 mr-2" /> بروزرسانی
                </Button>
                <Button onClick={() => handleExportReport("json")} className="whitespace-nowrap">
                  <Download className="h-4 w-4 mr-2" /> خروجی JSON
                </Button>
                <Button onClick={handleGenerateServerReport} variant="secondary" className="whitespace-nowrap">
                  <FileText className="h-4 w-4 mr-2" /> تولید گزارش
                </Button>
              </div>
            </div>
            {/* close header flex container before description */}
            </div>
            <CardDescription>
              تحلیل روندها و پیش‌بینی مصرف برای مدیریت بهتر منابع
            </CardDescription>
          </CardHeader>
        </Card>

        {/* لیست گزارش‌های تولیدشده اخیر */}
        {generatedReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>گزارش‌های تولیدشده</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عنوان</TableHead>
                      <TableHead>نوع</TableHead>
                      <TableHead>بازه زمانی</TableHead>
                      <TableHead>فرمت</TableHead>
                      <TableHead>تاریخ تولید</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {r.type === 'summary' ? 'خلاصه' : r.type === 'analytics' ? 'تحلیلی' : 'خروجی'}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.timeframeLabel}</TableCell>
                        <TableCell><Badge variant="secondary">{r.format.toUpperCase()}</Badge></TableCell>
                        <TableCell>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(r.generatedAt)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'completed' ? 'success' : r.status === 'pending' ? 'secondary' : 'destructive'}>
                            {r.status === 'completed' ? 'تکمیل' : r.status === 'pending' ? 'در صف' : 'ناموفق'}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" disabled={!r.downloadUrl || r.status !== 'completed'} onClick={() => {
                            if (!r.downloadUrl) return
                            const a = document.createElement('a')
                            a.href = r.downloadUrl
                            a.download = ''
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                          }}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={!r.downloadUrl || r.status !== 'completed'} onClick={async () => {
                            if (!r.downloadUrl) return
                            try {
                              await navigator.clipboard.writeText(window.location.origin + r.downloadUrl)
                              toast({ title: 'کپی شد', description: 'لینک دانلود در کلیپ‌بورد کپی شد' })
                            } catch {
                              toast({ title: 'خطا', description: 'کپی لینک ناموفق بود', variant: 'destructive' })
                            }
                          }}>
                            <CopyIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={!r.downloadUrl || r.status !== 'completed'} onClick={() => {
                            if (!r.downloadUrl) return
                            window.open(r.downloadUrl, '_blank')
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* آمار کلی */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>مخازن</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{tanks.length}</div>
                <Badge variant="secondary">فعال</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ژنراتورها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{generators.length}</div>
                <Badge variant="secondary">فعال</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>هشدارها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{alerts.length}</div>
                <Badge variant="destructive">کل</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* جدول تاریخچه */}
        <Card>
          <CardHeader>
            <CardTitle>تاریخچه داده‌ها</CardTitle>
            <CardDescription>
              جدیدترین ۱۵ رکورد از تاریخچه داده‌ها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع</TableHead>
                    <TableHead>نام</TableHead>
                    <TableHead>سطح</TableHead>
                    <TableHead>زمان</TableHead>
                    <TableHead>ثبت‌کننده</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {record.tankId ? (
                          <Badge variant="secondary">مخزن</Badge>
                        ) : (
                          <Badge variant="outline">ژنراتور</Badge>
                        )}
                      </TableCell>
                      <TableCell>{record.recordedBy || record.tankId || record.generatorId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${record.level < 20 ? 'bg-red-500' : record.level < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${record.level}%` }}
                            ></div>
                          </div>
                          <span>{record.level}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(record.timestamp).toLocaleString('fa-IR')}
                      </TableCell>
                      <TableCell>{record.recordedBy || 'سیستم'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex justify-end items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  قبلی
                </Button>
                <span className="text-sm text-muted-foreground">
                  صفحه {currentPage} از {Math.ceil(historyRecords.length / recordsPerPage) || 1}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage * recordsPerPage >= historyRecords.length}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  بعدی
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* تحلیل روندها */}
        <Card>
          <CardHeader>
            <CardTitle>تحلیل روندها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tanks.map((tank) => (
                <div key={tank.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{tank.name}</div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trends.get(tank.id))}
                      <span className="text-sm text-muted-foreground">
                        {trends.get(tank.id)?.trend || 'نامشخص'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    تغییرات: {trends.get(tank.id)?.changeRate?.toFixed(2) || 0}%
                  </div>
                </div>
              ))}

              {generators.map((gen) => (
                <div key={gen.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{gen.name}</div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trends.get(gen.id))}
                      <span className="text-sm text-muted-foreground">
                        {trends.get(gen.id)?.trend || 'نامشخص'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    تغییرات: {trends.get(gen.id)?.changeRate?.toFixed(2) || 0}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* لیست هشدارها */}
        <Card>
          <CardHeader>
            <CardTitle>هشدارهای اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="font-medium">{alert.type}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                    </div>
                  </div>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Activity Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>آخرین فعالیت‌ها</CardTitle>
              <div className="text-sm text-muted-foreground">{logsTotal} مورد ثبت شده</div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="py-6 text-center text-muted-foreground">در حال بارگذاری...</div>
            ) : activityLogs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">فعلاً فعالیتی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>زمان</TableHead>
                      <TableHead>نوع</TableHead>
                      <TableHead>توضیح</TableHead>
                      <TableHead>کاربر</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.createdAt))}
                        </TableCell>
                        <TableCell><Badge variant="outline">{log.type}</Badge></TableCell>
                        <TableCell>{log.description}</TableCell>
                        <TableCell>{log.userName || log.userId || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="secondary" onClick={loadActivityLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                تازه‌سازی
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
}