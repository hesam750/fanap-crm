"use client"


import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, Warehouse, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

import { StatCard } from "@/components/inventory/stat-card"
import { apiClient } from "@/lib/api-client"
import type { InventoryItem, Warehouse as WarehouseType, StockTransaction, StockLevel, Location, InventoryTransactionType } from "@/lib/types"

export default function DashboardPage() {
  // داده‌های داینامیک
  const [items, setItems] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [itemsRes, warehousesRes, transactionsRes, stockRes, locationsRes] = await Promise.all([
          apiClient.getInventoryItems(),
          apiClient.getWarehouses(),
          apiClient.getStockTransactions(),
          apiClient.getStockLevels(),
          apiClient.getLocations(),
        ])
        if (!mounted) return
        setItems(itemsRes.items ?? [])
        setWarehouses(warehousesRes.warehouses ?? [])
        setTransactions(transactionsRes.transactions ?? [])
        setStockLevels(stockRes.stockLevels ?? [])
        setLocations(locationsRes.locations ?? [])
      } catch (e: any) {
        console.error(e)
        setError(e?.message ?? "خطا در دریافت داده‌ها")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const typeFa: Record<InventoryTransactionType, string> = {
    receipt: "ورود",
    issue: "خروج",
    transfer: "انتقال",
    return: "مرجوعی",
    adjustment: "اصلاح",
  }
  const statusFa: Record<string, string> = {
    requested: "درخواست",
    approved: "تایید",
    posted: "تکمیل",
    rejected: "رد شده",
    void: "باطل",
  }
  function relativeTimeFa(dateInput: Date | string) {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "نامشخص"
    const diffMs = Date.now() - d.getTime()
    const minutes = Math.floor(diffMs / (60 * 1000))
    if (minutes < 60) return `${minutes} دقیقه پیش`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ساعت پیش`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} روز پیش`
    const weeks = Math.floor(days / 7)
    return `${weeks} هفته پیش`
  }

  const todayTransactionsCount = useMemo(() => {
    const today = new Date()
    return transactions.filter((t) => {
      const dt = new Date(t.createdAt)
      return (
        dt.getFullYear() === today.getFullYear() &&
        dt.getMonth() === today.getMonth() &&
        dt.getDate() === today.getDate()
      )
    }).length
  }, [transactions])

  const transactionsChangeInfo = useMemo(() => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const countOn = (d: Date) =>
      transactions.filter((t) => {
        const dt = new Date(t.createdAt)
        return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate()
      }).length
    const todayCount = countOn(today)
    const yesterdayCount = countOn(yesterday)
    const diff = todayCount - yesterdayCount
    return {
      changeLabel: `${diff >= 0 ? "+" : ""}${diff} نسبت به دیروز`,
      changeType: diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral",
    }
  }, [transactions])

  const stockBarData = useMemo(() => {
    const now = new Date()
    const fmtMonthFa = new Intl.DateTimeFormat("fa-IR", { month: "long" })
    const months: { month: string; in: number; out: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = fmtMonthFa.format(d)
      const inSum = transactions
        .filter((t) => {
          const dt = new Date(t.createdAt)
          return t.type === "receipt" && dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth()
        })
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
      const outSum = transactions
        .filter((t) => {
          const dt = new Date(t.createdAt)
          return t.type === "issue" && dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth()
        })
        .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
      months.push({ month: label, in: inSum, out: outSum })
    }
    return months
  }, [transactions])

  const trendData = useMemo(() => {
    const now = new Date()
    const fmtDayFa = new Intl.DateTimeFormat("fa-IR", { weekday: "long" })
    const arr: { day: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const label = fmtDayFa.format(d)
      const count = transactions.filter((t) => {
        const dt = new Date(t.createdAt)
        return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate()
      }).length
      arr.push({ day: label, value: count })
    }
    return arr
  }, [transactions])

  const lowStockList = useMemo(() => {
    const byItem: Record<string, { total: number; byLocation: Record<string, number> }> = {}
    for (const sl of stockLevels) {
      const entry = (byItem[sl.itemId] ??= { total: 0, byLocation: {} })
      entry.total += sl.quantity || 0
      entry.byLocation[sl.locationId] = (entry.byLocation[sl.locationId] ?? 0) + (sl.quantity || 0)
    }
    const list: { sku: string; name: string; current: number; min: number; warehouse: string }[] = []
    for (const item of items) {
      const threshold = item.minStock ?? item.reorderPoint ?? null
      if (threshold == null) continue
      const agg = byItem[item.id]
      const total = agg?.total ?? 0
      if (total < threshold) {
        let locIdWithMin: string | null = null
        let minQty = Infinity
        const byLoc = agg?.byLocation ?? {}
        for (const [locId, qty] of Object.entries(byLoc)) {
          if (qty < minQty) {
            minQty = qty
            locIdWithMin = locId
          }
        }
        const loc = locations.find((l) => l.id === locIdWithMin)
        const whName = loc ? warehouses.find((w) => w.id === loc.warehouseId)?.name ?? "انبار نامشخص" : "—"
        list.push({ sku: item.sku, name: item.name, current: total, min: threshold, warehouse: whName })
      }
    }
    list.sort((a, b) => a.current - b.current)
    return list.slice(0, 5)
  }, [stockLevels, items, locations, warehouses])

  const recentTransactionsView = useMemo(() => {
    const byItemId: Record<string, InventoryItem | undefined> = Object.fromEntries(items.map((i) => [i.id, i]))
    return transactions
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((trx) => {
        const preferredLocId = trx.toLocationId ?? trx.fromLocationId ?? null
        const loc = locations.find((l) => l.id === preferredLocId)
        const whName = loc ? warehouses.find((w) => w.id === loc.warehouseId)?.name ?? "انبار" : "—"
        const itemName = byItemId[trx.itemId]?.name ?? "قلم ناشناس"
        return {
          id: trx.id,
          type: typeFa[trx.type],
          item: itemName,
          quantity: (typeof trx.quantity === 'number' ? trx.quantity : Number(trx.quantity) || 0),
          warehouse: whName,
          time: relativeTimeFa(String(trx.createdAt)),
          status: (typeof trx.status === "string" ? ({ requested: "درخواست", approved: "تایید", posted: "تکمیل", rejected: "رد شده", void: "باطل" } as any)[trx.status] : undefined) ??
                  (typeof trx.status === "string" ? trx.status : "نامشخص"),
        }
      })
  }, [transactions, locations, warehouses, items])
  return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="کل اقلام"
                value={(items.length || 0).toLocaleString('fa-IR')} 
                change={"داده از دیتابیس"}
                changeType={"neutral"}
                icon={Package}
                iconColor="text-accent"
              />
              <StatCard
                title="انبارها"
                value={(warehouses.length || 0).toLocaleString('fa-IR')}
                change={"—"}
                changeType={"neutral"}
                icon={Warehouse}
                iconColor="text-primary"
              />
              <StatCard
                title="تراکنش‌های امروز"
                value={(todayTransactionsCount || 0).toLocaleString('fa-IR')}
                change={transactionsChangeInfo.changeLabel}
                changeType={transactionsChangeInfo.changeType as 'positive' | 'negative' | 'neutral'}
                icon={TrendingUp}
                iconColor="text-success"
              />
              <StatCard
                title="هشدار موجودی"
                value={(lowStockList.length || 0).toLocaleString('fa-IR')}
                change="نیاز به بررسی"
                changeType="negative"
                icon={AlertTriangle}
                iconColor="text-warning"
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>تحلیل ورود و خروج</CardTitle>
                  <CardDescription className="text-xs">نمایش مجموع ورود و خروج ماهانه با رنگ‌بندی خوانا در تم روشن/تاریک</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-[300px]"
                    config={{
                      in: { label: "ورود", theme: { light: "#3b82f6", dark: "#60a5fa" } },
                      out: { label: "خروج", theme: { light: "#f97316", dark: "#fb923c" } },
                    }}
                  >
                    <BarChart data={stockBarData}>
                      <defs>
                        <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-in)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="var(--color-in)" stopOpacity={0.25} />
                        </linearGradient>
                        <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-out)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="var(--color-out)" stopOpacity={0.25} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" tickMargin={8} />
                      <YAxis className="text-xs" tickMargin={8} tickFormatter={(v) => (Number(v) || 0).toLocaleString('fa-IR')} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ direction: 'rtl' }} />
                      <Bar dataKey="in" fill="url(#inGradient)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="out" fill="url(#outGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>روند هفتگی تراکنش‌ها</CardTitle>
                  <CardDescription className="text-xs">نمایش تعداد تراکنش روزانه با ناحیهٔ گرادیانی و Tooltip هماهنگ با تم</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-[300px]"
                    config={{
                      value: { label: "تعداد تراکنش", theme: { light: "#22c55e", dark: "#86efac" } },
                    }}
                  >
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-xs" tickMargin={8} />
                      <YAxis className="text-xs" tickMargin={8} tickFormatter={(v) => (Number(v) || 0).toLocaleString('fa-IR')} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        fill="url(#valueGradient)"
                        dot={{ r: 2.5, strokeWidth: 1, stroke: "var(--color-value)", fill: "var(--color-value)" }}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>تراکنش‌های اخیر</CardTitle>
                <Button variant="ghost" size="sm" className="w-full md:w-auto">
                  مشاهده همه
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* موبایل: نمایش کارت‌ها */}
                <div className="grid gap-3 md:hidden">
                  {recentTransactionsView.map((trx) => (
                    <Card key={trx.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            {trx.type === "ورود" && <ArrowDownRight className="h-3 w-3" />}
                            {trx.type === "خروج" && <ArrowUpRight className="h-3 w-3" />}
                            {trx.type}
                          </Badge>
                          <span>{trx.item}</span>
                        </CardTitle>
                        <Badge>{trx.status}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>مقدار:</span>
                          <span className="font-medium text-foreground">{trx.quantity.toLocaleString('fa-IR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>انبار:</span>
                          <span>{trx.warehouse}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {trx.time}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* دسکتاپ: نمایش جدول با اسکرول افقی */}
                <div className="overflow-x-auto hidden md:block">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="hidden md:table-cell">شناسه</TableHead>
                        <TableHead>نوع</TableHead>
                        <TableHead>قلم</TableHead>
                        <TableHead>مقدار</TableHead>
                        <TableHead className="hidden lg:table-cell">انبار</TableHead>
                        <TableHead>زمان</TableHead>
                        <TableHead>وضعیت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactionsView.map((trx) => (
                        <TableRow key={trx.id}>
                          <TableCell className="hidden md:table-cell font-mono text-xs">{trx.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              {trx.type === "ورود" && <ArrowDownRight className="h-3 w-3" />}
                              {trx.type === "خروج" && <ArrowUpRight className="h-3 w-3" />}
                              {trx.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{trx.item}</TableCell>
                          <TableCell>{trx.quantity.toLocaleString('fa-IR')}</TableCell>
                          <TableCell className="hidden lg:table-cell">{trx.warehouse}</TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {trx.time}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={trx.status === "تکمیل" ? "default" : "secondary"}>{trx.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="border-warning/50 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  هشدار موجودی کم
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* موبایل: کارت‌ها */}
                <div className="grid gap-3 md:hidden">
                  {lowStockList.map((item) => (
                    <Card key={item.sku}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="font-mono text-xs">{item.sku}</span>
                          <span className="font-medium">{item.name}</span>
                        </CardTitle>
                        <Badge variant="secondary">حداقل: {item.min.toLocaleString('fa-IR')}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>موجودی فعلی:</span>
                          <span className="text-warning font-semibold">{item.current.toLocaleString('fa-IR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>انبار:</span>
                          <span>{item.warehouse}</span>
                        </div>
                        <div>
                          <Button size="sm" variant="outline" className="w-full">ثبت درخواست خرید</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* دسکتاپ: جدول با اسکرول افقی */}
                <div className="overflow-x-auto hidden md:block">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>نام قلم</TableHead>
                        <TableHead>موجودی فعلی</TableHead>
                        <TableHead className="hidden md:table-cell">حداقل موجودی</TableHead>
                        <TableHead className="hidden lg:table-cell">انبار</TableHead>
                        <TableHead className="hidden lg:table-cell">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockList.map((item) => (
                        <TableRow key={item.sku}>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <span className="text-warning font-semibold">{item.current.toLocaleString('fa-IR')}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{item.min.toLocaleString('fa-IR')}</TableCell>
                          <TableCell className="hidden lg:table-cell">{item.warehouse}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Button size="sm" variant="outline">
                              ثبت درخواست خرید
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
  )
}
