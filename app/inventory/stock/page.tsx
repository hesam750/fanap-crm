"use client"

import { useEffect, useMemo, useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { InventoryItem, InventoryCategory, Location, Warehouse, StockLevel } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle, RefreshCw, Search } from "lucide-react"

export default function InventoryStockPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])

  const [query, setQuery] = useState("")
  const [warehouseId, setWarehouseId] = useState<string>("")
  const [locationId, setLocationId] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [itemId, setItemId] = useState<string>("")

  const loadData = async () => {
    setLoading(true)
    try {
      const [levelsRes, itemsRes, locsRes, whRes, catsRes] = await Promise.all([
        apiClient.getStockLevels(),
        apiClient.getInventoryItems(),
        apiClient.getLocations(),
        apiClient.getWarehouses(),
        apiClient.getInventoryCategories(),
      ])
      setStockLevels(levelsRes.stockLevels)
      setItems(itemsRes.items)
      setLocations(locsRes.locations)
      setWarehouses(whRes.warehouses)
      setCategories(catsRes.categories)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت داده‌های موجودی انجام نشد", variant: "destructive" as any })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const nameForItem = (id: string) => items.find(i => i.id === id)?.name || id
  const nameForLocation = (id: string) => locations.find(l => l.id === id)?.name || id
  const nameForWarehouse = (id: string) => warehouses.find(w => w.id === id)?.name || id

  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])

  const locationsForWarehouse = useMemo(() => {
    return warehouseId ? locations.filter(l => l.warehouseId === warehouseId) : locations
  }, [locations, warehouseId])

  // Map locationId to warehouseId for filtering
  const locationWarehouseMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of locations) m.set(l.id, l.warehouseId)
    return m
  }, [locations])

  const filtered = useMemo(() => {
    let arr = [...stockLevels]
    if (itemId) arr = arr.filter(s => s.itemId === itemId)
    if (categoryId) arr = arr.filter(s => itemsById.get(s.itemId)?.categoryId === categoryId)
    if (warehouseId) arr = arr.filter(s => locationWarehouseMap.get(s.locationId) === warehouseId)
    if (locationId) arr = arr.filter(s => s.locationId === locationId)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(s => {
        const itemName = (itemsById.get(s.itemId)?.name || nameForItem(s.itemId)).toLowerCase()
        const locName = nameForLocation(s.locationId).toLowerCase()
        const whName = nameForWarehouse(locationWarehouseMap.get(s.locationId) || "").toLowerCase()
        return itemName.includes(q) || locName.includes(q) || whName.includes(q)
      })
    }
    // Sort by item name then location
    arr.sort((a, b) => {
      const ai = (itemsById.get(a.itemId)?.name || nameForItem(a.itemId)).toLowerCase()
      const bi = (itemsById.get(b.itemId)?.name || nameForItem(b.itemId)).toLowerCase()
      if (ai !== bi) return ai.localeCompare(bi)
      const al = nameForLocation(a.locationId).toLowerCase()
      const bl = nameForLocation(b.locationId).toLowerCase()
      return al.localeCompare(bl)
    })
    return arr
  }, [stockLevels, itemId, categoryId, warehouseId, locationId, query, itemsById, locations, warehouses, locationWarehouseMap])

  // Totals per item across locations
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
    // Sort by gap to threshold ascending
    alerts.sort((a, b) => (a.current - a.threshold) - (b.current - b.threshold))
    return alerts
  }, [items, totalsByItem])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>مدیریت موجودی</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-40 sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو کالا/مکان/انبار"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={warehouseId} onValueChange={(val) => { const v = val === "__ALL_WAREHOUSES__" ? "" : val; setWarehouseId(v); setLocationId("") }}>
              <SelectTrigger className="w-40 sm:w-52">
                <SelectValue placeholder="فیلتر انبار" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="__ALL_WAREHOUSES__">همه انبارها</SelectItem>
                 {warehouses.map(w => (
                   <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                 ))}
               </SelectContent>
            </Select>
            <Select value={locationId} onValueChange={(val) => setLocationId(val === "__ALL_LOCATIONS__" ? "" : val)}>
              <SelectTrigger className="w-40 sm:w-52">
                <SelectValue placeholder="فیلتر مکان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL_LOCATIONS__">همه مکان‌ها</SelectItem>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={(val) => setCategoryId(val === "__ALL_CATEGORIES__" ? "" : val)}>
              <SelectTrigger className="w-40 sm:w-52">
                <SelectValue placeholder="فیلتر دسته" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL_CATEGORIES__">همه دسته‌ها</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={itemId} onValueChange={(val) => setItemId(val === "__ALL_ITEMS__" ? "" : val)}>
              <SelectTrigger className="w-40 sm:w-52">
                <SelectValue placeholder="انتخاب قلم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL_ITEMS__">همه اقلام</SelectItem>
                {items.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام کالا</TableHead>
                  <TableHead>مکان</TableHead>
                  <TableHead>انبار</TableHead>
                  <TableHead>مقدار</TableHead>
                  <TableHead className="hidden md:table-cell">واحد</TableHead>
                  <TableHead className="hidden lg:table-cell">به‌روزرسانی</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const loc = locations.find(l => l.id === s.locationId)
                  const whName = loc ? nameForWarehouse(loc.warehouseId) : "-"
                  return (
                    <TableRow key={`${s.itemId}-${s.locationId}`}>
                      <TableCell>{nameForItem(s.itemId)}</TableCell>
                      <TableCell>{nameForLocation(s.locationId)}</TableCell>
                      <TableCell>{whName}</TableCell>
                      <TableCell>{(Number(s.quantity) || 0).toLocaleString('fa-IR')}</TableCell>
                      <TableCell className="hidden md:table-cell">{s.unit}</TableCell>
                      <TableCell className="hidden lg:table-cell">{(() => { const d = new Date(s.updatedAt as any); return isNaN(d.getTime()) ? 'نامشخص' : d.toLocaleString('fa-IR') })()}</TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">موردی یافت نشد</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning/50 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            هشدار موجودی کم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام کالا</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>موجودی کل</TableHead>
                  <TableHead className="hidden md:table-cell">آستانه هشدار</TableHead>
                  <TableHead className="hidden lg:table-cell">وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map(({ item, current, threshold }) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="font-mono text-xs hidden sm:table-cell">{item.sku}</TableCell>
                    <TableCell>{(Number(current) || 0).toLocaleString('fa-IR')}</TableCell>
                    <TableCell className="hidden md:table-cell">{(Number(threshold) || 0).toLocaleString('fa-IR')}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline">کمتر از آستانه</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {lowStockItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">هشداری وجود ندارد</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}