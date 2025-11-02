"use client"

import { useEffect, useMemo, useState } from "react"

import { apiClient } from "@/lib/api-client"
import type { InventoryItem, InventoryCategory, StockTransaction, StockLevel, Warehouse, Location, Supplier, InventoryTransactionType, InventoryTransactionStatus } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw, Download, BarChart3, Filter, Search } from "lucide-react"

export default function InventoryReportsPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Filters
  const [reportPeriod, setReportPeriod] = useState<string>("168") // default 7 days
  const [warehouseId, setWarehouseId] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [query, setQuery] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const [itemsRes, catRes, trxRes, stockRes, whRes, locRes, supRes] = await Promise.all([
        apiClient.getInventoryItems(),
        apiClient.getInventoryCategories(),
        apiClient.getStockTransactions(),
        apiClient.getStockLevels(),
        apiClient.getWarehouses(),
        apiClient.getLocations(),
        apiClient.getSuppliers(),
      ])
      setItems(itemsRes.items)
      setCategories(catRes.categories)
      setTransactions(trxRes.transactions)
      setStockLevels(stockRes.stockLevels)
      setWarehouses(whRes.warehouses)
      setLocations(locRes.locations)
      setSuppliers(supRes.suppliers)
    } catch (e) {
      console.error(e)
      toast({ title: "خطا", description: "دریافت داده‌های انبار ناموفق بود", variant: "destructive" as any })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  // Helpers
  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])

  const categoriesById = useMemo(() => {
    const m = new Map<string, InventoryCategory>()
    for (const c of categories) m.set(c.id, c)
    return m
  }, [categories])

  const locationWarehouseMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of locations) m.set(l.id, l.warehouseId)
    return m
  }, [locations])

  const nameForItem = (id: string) => itemsById.get(id)?.name || id
  const nameForWarehouse = (id: string) => warehouses.find(w => w.id === id)?.name || id
  const nameForLocation = (id: string) => locations.find(l => l.id === id)?.name || id
  const nameForCategory = (id: string) => categoriesById.get(id)?.name || id

  // Filtered data for timeframe and warehouse/category
  const filteredTransactions = useMemo(() => {
    const hours = Number(reportPeriod) || 0
    const end = new Date()
    const start = hours > 0 ? new Date(end.getTime() - hours * 60 * 60 * 1000) : new Date(0)
    let arr = transactions.filter(t => new Date(t.createdAt as any) >= start && new Date(t.createdAt as any) <= end)
    if (warehouseId) {
      arr = arr.filter(t => {
        const fromWh = t.fromLocationId ? locationWarehouseMap.get(t.fromLocationId) : undefined
        const toWh = t.toLocationId ? locationWarehouseMap.get(t.toLocationId) : undefined
        return fromWh === warehouseId || toWh === warehouseId
      })
    }
    if (categoryId) {
      arr = arr.filter(t => itemsById.get(t.itemId)?.categoryId === categoryId)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(t => nameForItem(t.itemId).toLowerCase().includes(q))
    }
    // sort desc by createdAt
    arr.sort((a,b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    return arr
  }, [transactions, reportPeriod, warehouseId, categoryId, query, locationWarehouseMap, itemsById])

  const filteredStockLevels = useMemo(() => {
    let arr = [...stockLevels]
    if (warehouseId) {
      arr = arr.filter(s => locationWarehouseMap.get(s.locationId) === warehouseId)
    }
    if (categoryId) {
      arr = arr.filter(s => itemsById.get(s.itemId)?.categoryId === categoryId)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(s => nameForItem(s.itemId).toLowerCase().includes(q) || nameForLocation(s.locationId).toLowerCase().includes(q))
    }
    // sort by item name then location
    arr.sort((a,b) => {
      const ai = nameForItem(a.itemId).toLowerCase()
      const bi = nameForItem(b.itemId).toLowerCase()
      if (ai !== bi) return ai.localeCompare(bi)
      const al = nameForLocation(a.locationId).toLowerCase()
      const bl = nameForLocation(b.locationId).toLowerCase()
      return al.localeCompare(bl)
    })
    return arr
  }, [stockLevels, warehouseId, categoryId, query, locationWarehouseMap, itemsById, locations])

  // KPIs
  const totalsByItem = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of stockLevels) m.set(s.itemId, (m.get(s.itemId) || 0) + (Number(s.quantity) || 0))
    return m
  }, [stockLevels])

  const lowStockItems = useMemo(() => {
    const alerts: { item: InventoryItem; current: number; threshold: number }[] = []
    for (const it of items) {
      const total = totalsByItem.get(it.id) || 0
      const threshold = Math.max(
        typeof it.minStock === "number" ? it.minStock : 0,
        typeof it.reorderPoint === "number" ? it.reorderPoint : 0,
      )
      if (threshold > 0 && total <= threshold) {
        alerts.push({ item: it, current: total, threshold })
      }
    }
    alerts.sort((a,b) => (a.current - a.threshold) - (b.current - b.threshold))
    return alerts
  }, [items, totalsByItem])

  const stockByWarehouse = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of filteredStockLevels) {
      const wh = locationWarehouseMap.get(s.locationId) || ""
      m.set(wh, (m.get(wh) || 0) + (Number(s.quantity) || 0))
    }
    return Array.from(m.entries()).map(([wid, qty]) => ({ wid, qty }))
  }, [filteredStockLevels, locationWarehouseMap])

  const stockByCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of filteredStockLevels) {
      const cat = itemsById.get(s.itemId)?.categoryId || ""
      m.set(cat, (m.get(cat) || 0) + (Number(s.quantity) || 0))
    }
    return Array.from(m.entries()).map(([cid, qty]) => ({ cid, qty }))
  }, [filteredStockLevels, itemsById])

  const trxSummaryByType = useMemo(() => {
    const m = new Map<InventoryTransactionType, { count: number; quantity: number }>()
    for (const t of filteredTransactions) {
      const cur = m.get(t.type) || { count: 0, quantity: 0 }
      m.set(t.type, { count: cur.count + 1, quantity: cur.quantity + (Number(t.quantity) || 0) })
    }
    return Array.from(m.entries()).map(([type, v]) => ({ type, ...v }))
  }, [filteredTransactions])

  const trxSummaryByStatus = useMemo(() => {
    const m = new Map<InventoryTransactionStatus, number>()
    for (const t of filteredTransactions) m.set(t.status, (m.get(t.status) || 0) + 1)
    return Array.from(m.entries()).map(([status, count]) => ({ status, count }))
  }, [filteredTransactions])

  const topMovingItems = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of filteredTransactions) {
      const sign = t.type === "issue" ? -1 : 1 // approximate movement effect
      m.set(t.itemId, (m.get(t.itemId) || 0) + sign * (Number(t.quantity) || 0))
    }
    const arr = Array.from(m.entries()).map(([itemId, delta]) => ({ itemId, delta }))
    arr.sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta))
    return arr.slice(0, 10)
  }, [filteredTransactions])

  // Export helpers
  function exportJSON() {
    try {
      const data = {
        periodHours: Number(reportPeriod) || "all",
        warehouse: warehouseId ? nameForWarehouse(warehouseId) : "all",
        category: categoryId ? nameForCategory(categoryId) : "all",
        kpi: {
          totalItems: items.length,
          totalCategories: categories.length,
          totalWarehouses: warehouses.length,
          totalLocations: locations.length,
          totalSuppliers: suppliers.length,
          lowStockCount: lowStockItems.length,
        },
        stockByWarehouse,
        stockByCategory,
        transactionSummary: {
          byType: trxSummaryByType,
          byStatus: trxSummaryByStatus,
          topMovingItems: topMovingItems.map(t => ({ item: nameForItem(t.itemId), delta: t.delta })),
        },
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `inventory-report-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "خروجی JSON آماده شد" })
    } catch (e) {
      toast({ title: "خطا در خروجی JSON", variant: "destructive" as any })
    }
  }

  function exportCSV() {
    try {
      const lines: string[] = []
      lines.push("بخش,شاخص,مقدار")
      lines.push(`KPI,تعداد اقلام,${items.length}`)
      lines.push(`KPI,تعداد دسته‌بندی,${categories.length}`)
      lines.push(`KPI,تعداد انبار,${warehouses.length}`)
      lines.push(`KPI,تعداد مکان,${locations.length}`)
      lines.push(`KPI,تعداد تامین‌کننده,${suppliers.length}`)
      lines.push(`KPI,تعداد اقلام کم‌موجودی,${lowStockItems.length}`)
      lines.push("")
      lines.push("موجودی بر اساس انبار,انبار,مقدار")
      for (const r of stockByWarehouse) lines.push(`StockByWarehouse,${nameForWarehouse(r.wid)},${r.qty}`)
      lines.push("")
      lines.push("موجودی بر اساس دسته‌بندی,دسته,مقدار")
      for (const r of stockByCategory) lines.push(`StockByCategory,${nameForCategory(r.cid)},${r.qty}`)
      lines.push("")
      lines.push("تراکنش‌ها بر اساس نوع,نوع,تعداد,مجموع مقدار")
      for (const r of trxSummaryByType) lines.push(`TransactionsByType,${r.type},${r.count},${r.quantity}`)
      lines.push("")
      lines.push("تراکنش‌ها بر اساس وضعیت,وضعیت,تعداد")
      for (const r of trxSummaryByStatus) lines.push(`TransactionsByStatus,${r.status},${r.count}`)
      lines.push("")
      lines.push("اقلام با بیشترین جابجایی,کالا,دلتا")
      for (const r of topMovingItems) lines.push(`TopMovingItems,${nameForItem(r.itemId)},${r.delta}`)

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `inventory-report-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "خروجی CSV آماده شد" })
    } catch (e) {
      toast({ title: "خطا در خروجی CSV", variant: "destructive" as any })
    }
  }

  return (
    <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <CardTitle>گزارشات انبار</CardTitle>
                </div>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="جستجو نام کالا" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-8" />
                  </div>
                  <Select value={reportPeriod} onValueChange={setReportPeriod}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="بازه" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 ساعت</SelectItem>
                      <SelectItem value="168">7 روز</SelectItem>
                      <SelectItem value="720">30 روز</SelectItem>
                      <SelectItem value="0">کل زمان</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val === "__ALL__" ? "" : val)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="انبار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">همه انبارها</SelectItem>
                      {warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryId} onValueChange={(val) => setCategoryId(val === "__ALL__" ? "" : val)}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="دسته‌بندی" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">همه دسته‌ها</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadData} disabled={loading} className="w-full sm:w-auto">
                    <RefreshCw className="h-4 w-4 ml-1" /> بروزرسانی
                  </Button>
                  <Button onClick={exportJSON} className="w-full sm:w-auto">
                    <Download className="h-4 w-4 ml-1" /> خروجی JSON
                  </Button>
                  <Button onClick={exportCSV} variant="secondary" className="w-full sm:w-auto">
                    <Download className="h-4 w-4 ml-1" /> خروجی CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* KPI Badges */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                  <Badge variant="secondary">اقلام: {items.length}</Badge>
                  <Badge variant="secondary">دسته‌ها: {categories.length}</Badge>
                  <Badge variant="secondary">انبارها: {warehouses.length}</Badge>
                  <Badge variant="secondary">مکان‌ها: {locations.length}</Badge>
                  <Badge variant="secondary">تامین‌کنندگان: {suppliers.length}</Badge>
                </div>

                {/* Stock by Warehouse */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">موجودی بر اساس انبار</h3>

                  {/* موبایل: کارت‌ها */}
                  <div className="sm:hidden space-y-3">
                    {stockByWarehouse.map(r => (
                      <Card key={r.wid}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">انبار</span>
                            <span className="text-sm">{nameForWarehouse(r.wid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">مقدار کل</span>
                            <span className="text-sm">{(Number(r.qty) || 0).toLocaleString('fa-IR')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {stockByWarehouse.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">داده‌ای نیست</div>
                    )}
                  </div>

                  {/* دسکتاپ: جدول با اسکرول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="min-w-[480px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>انبار</TableHead>
                          <TableHead className="text-right">مقدار کل</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockByWarehouse.map(r => (
                          <TableRow key={r.wid}>
                            <TableCell>{nameForWarehouse(r.wid)}</TableCell>
                            <TableCell className="text-right">{(Number(r.qty) || 0).toLocaleString('fa-IR')}</TableCell>
                          </TableRow>
                        ))}
                        {stockByWarehouse.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">داده‌ای نیست</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Stock by Category */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">موجودی بر اساس دسته‌بندی</h3>

                  {/* موبایل: کارت‌ها */}
                  <div className="sm:hidden space-y-3">
                    {stockByCategory.map(r => (
                      <Card key={r.cid}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify_between">
                            <span className="text-xs text-muted-foreground">دسته‌بندی</span>
                            <span className="text-sm">{nameForCategory(r.cid)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">مقدار کل</span>
                            <span className="text-sm">{(Number(r.qty) || 0).toLocaleString('fa-IR')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {stockByCategory.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">داده‌ای نیست</div>
                    )}
                  </div>

                  {/* دسکتاپ: جدول با اسکرول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="min-w-[480px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>دسته‌بندی</TableHead>
                          <TableHead className="text-right">مقدار کل</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockByCategory.map(r => (
                          <TableRow key={r.cid}>
                            <TableCell>{nameForCategory(r.cid)}</TableCell>
                            <TableCell className="text-right">{(Number(r.qty) || 0).toLocaleString('fa-IR')}</TableCell>
                          </TableRow>
                        ))}
                        {stockByCategory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">داده‌ای نیست</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Transactions Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">خلاصه تراکنش‌ها ({filteredTransactions.length})</h3>

                  {/* موبایل: کارت‌ها */}
                  <div className="sm:hidden space-y-3">
                    {trxSummaryByType.map(r => (
                      <Card key={r.type}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">نوع</span>
                            <span className="text-sm">{r.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">تعداد</span>
                            <span className="text-sm">{r.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">مجموع مقدار</span>
                            <span className="text-sm">{(Number(r.quantity) || 0).toLocaleString('fa-IR')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {trxSummaryByType.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">داده‌ای نیست</div>
                    )}
                  </div>

                  {/* دسکتاپ: جدول با اسکرول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="min-w-[560px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>نوع</TableHead>
                          <TableHead>تعداد</TableHead>
                          <TableHead className="text-right">مجموع مقدار</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trxSummaryByType.map(r => (
                          <TableRow key={r.type}>
                            <TableCell>{r.type}</TableCell>
                            <TableCell>{r.count}</TableCell>
                            <TableCell className="text-right">{(Number(r.quantity) || 0).toLocaleString('fa-IR')}</TableCell>
                          </TableRow>
                        ))}
                        {trxSummaryByType.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">داده‌ای نیست</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Transactions by Status */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">توزیع وضعیت تراکنش‌ها</h3>

                  {/* موبایل: کارت‌ها */}
                  <div className="sm:hidden space-y-3">
                    {trxSummaryByStatus.map(r => (
                      <Card key={r.status}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">وضعیت</span>
                            <span className="text-sm">{r.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">تعداد</span>
                            <span className="text-sm">{r.count}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {trxSummaryByStatus.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">داده‌ای نیست</div>
                    )}
                  </div>

                  {/* دسکتاپ: جدول با اسکرول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="min-w-[400px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>وضعیت</TableHead>
                          <TableHead className="text-right">تعداد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trxSummaryByStatus.map(r => (
                          <TableRow key={r.status}>
                            <TableCell>{r.status}</TableCell>
                            <TableCell className="text-right">{r.count}</TableCell>
                          </TableRow>
                        ))}
                        {trxSummaryByStatus.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">داده‌ای نیست</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Low Stock Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">اقلام کم‌موجودی ({lowStockItems.length})</h3>

                  {/* موبایل: کارت‌ها */}
                  <div className="sm:hidden space-y-3">
                    {lowStockItems.map(({ item, current, threshold }) => (
                      <Card key={item.id}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">کالا</span>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">موجودی فعلی</span>
                            <span className="text-sm">{(Number(current) || 0).toLocaleString('fa-IR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">آستانه هشدار</span>
                            <span className="text-sm">{(Number(threshold) || 0).toLocaleString('fa-IR')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {lowStockItems.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">اقلام کم‌موجودی نداریم</div>
                    )}
                  </div>

                  {/* دسکتاپ: جدول با اسکرول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="min-w-[560px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>کالا</TableHead>
                          <TableHead>موجودی فعلی</TableHead>
                          <TableHead className="text-right">آستانه هشدار</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockItems.map(({ item, current, threshold }) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{(Number(current) || 0).toLocaleString('fa-IR')}</TableCell>
                            <TableCell className="text-right">{(Number(threshold) || 0).toLocaleString('fa-IR')}</TableCell>
                          </TableRow>
                        ))}
                        {lowStockItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">اقلام کم‌موجودی نداریم</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Recent Transactions list */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">آخرین تراکنش‌ها</h3>

                  {/* موبایل: کارت‌ها */}
                  <div className="sm:hidden space-y-3">
                    {filteredTransactions.slice(0, 20).map(t => (
                      <Card key={t.id}>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">تاریخ</span>
                            <span className="text-sm">{(() => { const d = new Date(t.createdAt as any); return isNaN(d.getTime()) ? 'نامشخص' : d.toLocaleString('fa-IR') })()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">کالا</span>
                            <span className="text-sm">{nameForItem(t.itemId)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">نوع</span>
                            <span className="text-sm">{t.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">از</span>
                            <span className="text-sm">{t.fromLocationId ? nameForWarehouse(locationWarehouseMap.get(t.fromLocationId) || "") + " - " + nameForLocation(t.fromLocationId) : "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">به</span>
                            <span className="text-sm">{t.toLocationId ? nameForWarehouse(locationWarehouseMap.get(t.toLocationId) || "") + " - " + nameForLocation(t.toLocationId) : "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">مقدار</span>
                            <span className="text-sm">{(Number(t.quantity) || 0).toLocaleString('fa-IR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">وضعیت</span>
                            <span className="text-sm">{t.status}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm">تراکنشی در بازه انتخابی نیست</div>
                    )}
                  </div>

                  {/* دسکتاپ: جدول با اسکرول */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table className="min-w-[880px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>تاریخ</TableHead>
                          <TableHead>کالا</TableHead>
                          <TableHead>نوع</TableHead>
                          <TableHead>از</TableHead>
                          <TableHead>به</TableHead>
                          <TableHead className="text-right">مقدار</TableHead>
                          <TableHead>وضعیت</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.slice(0, 20).map(t => (
                          <TableRow key={t.id}>
                            <TableCell>{(() => { const d = new Date(t.createdAt as any); return isNaN(d.getTime()) ? 'نامشخص' : d.toLocaleString('fa-IR') })()}</TableCell>
                            <TableCell>{nameForItem(t.itemId)}</TableCell>
                            <TableCell>{t.type}</TableCell>
                            <TableCell>{t.fromLocationId ? nameForWarehouse(locationWarehouseMap.get(t.fromLocationId) || "") + " - " + nameForLocation(t.fromLocationId) : "-"}</TableCell>
                            <TableCell>{t.toLocationId ? nameForWarehouse(locationWarehouseMap.get(t.toLocationId) || "") + " - " + nameForLocation(t.toLocationId) : "-"}</TableCell>
                            <TableCell className="text-right">{(Number(t.quantity) || 0).toLocaleString('fa-IR')}</TableCell>
                            <TableCell>{t.status}</TableCell>
                          </TableRow>
                        ))}
                        {filteredTransactions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">تراکنشی در بازه انتخابی نیست</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
  )
}