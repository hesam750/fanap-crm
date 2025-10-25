"use client"

import { useEffect, useMemo, useState } from "react"
// Removed Sidebar/Header imports; layout handles them
import { apiClient } from "@/lib/api-client"
import type { Warehouse, Location } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw, Plus, Search } from "lucide-react"

export default function InventoryLocationsPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  const [query, setQuery] = useState("")
  const [warehouseFilterId, setWarehouseFilterId] = useState<string>("")

  // Create location dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [newLocation, setNewLocation] = useState<Partial<Location>>({})

  const canCreateLocation = useMemo(() => {
    const role = currentUser?.role
    return !!role && ["root","manager"].includes(role)
  }, [currentUser])

  const nameForWarehouse = (id: string) => warehouses.find(w => w.id === id)?.name || id

  async function loadData() {
    setLoading(true)
    try {
      const [whRes, locRes] = await Promise.all([
        apiClient.getWarehouses(),
        apiClient.getLocations(warehouseFilterId || undefined),
      ])
      setWarehouses(whRes.warehouses)
      setLocations(locRes.locations)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت مکان‌ها انجام نشد", variant: "destructive" as any })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [warehouseFilterId])

  const filtered = useMemo(() => {
    let arr = [...locations]
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(l => (l.name || "").toLowerCase().includes(q) || (l.code || "").toLowerCase().includes(q))
    }
    // Sort by createdAt desc
    arr.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    return arr
  }, [locations, query])

  async function handleCreate() {
    try {
      if (!newLocation.warehouseId || !newLocation.name) {
        toast({ title: "خطای اعتبارسنجی", description: "انتخاب انبار و نام مکان الزامی است.", variant: "destructive" as any })
        return
      }
      const res = await apiClient.createLocation({
        warehouseId: newLocation.warehouseId!,
        name: newLocation.name!,
        code: newLocation.code || null,
      })
      setLocations(prev => [res.location, ...prev])
      setOpenCreateDialog(false)
      setNewLocation({})
      toast({ title: "مکان جدید ایجاد شد" })
    } catch (err: any) {
      toast({ title: "ایجاد مکان ناموفق بود", description: err?.message || "", variant: "destructive" as any })
    }
  }

  return (
    <div className="space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>مدیریت مکان‌ها</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو نام/کد مکان"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={warehouseFilterId} onValueChange={(val) => setWarehouseFilterId(val === "__ALL__" ? "" : val)}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="انبار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">همه انبارها</SelectItem>
                      {warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadData} disabled={loading}>
                    <RefreshCw className="h-4 w-4 ml-1" />
                    بروزرسانی
                  </Button>
                  {canCreateLocation && (
                    <Button onClick={() => setOpenCreateDialog(true)}>
                      <Plus className="h-4 w-4 ml-1" />
                      ایجاد مکان
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تاریخ ایجاد</TableHead>
                      <TableHead>نام</TableHead>
                      <TableHead>کد</TableHead>
                      <TableHead>انبار</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{new Date(l.createdAt as any).toLocaleString("fa-IR")}</TableCell>
                        <TableCell>{l.name}</TableCell>
                        <TableCell>{l.code || "-"}</TableCell>
                        <TableCell>{nameForWarehouse(l.warehouseId)}</TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">موردی یافت نشد</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ایجاد مکان جدید</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>انبار</Label>
                    <Select value={newLocation.warehouseId || ""} onValueChange={(val) => setNewLocation(v => ({ ...v, warehouseId: val }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب انبار" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>نام مکان</Label>
                    <Input value={newLocation.name || ""} onChange={(e) => setNewLocation(v => ({ ...v, name: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>کد (اختیاری)</Label>
                    <Input value={newLocation.code || ""} onChange={(e) => setNewLocation(v => ({ ...v, code: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>انصراف</Button>
                  <Button onClick={handleCreate}>ایجاد مکان</Button>
                </div>
              </DialogContent>
            </Dialog>
    </div>
  )
}