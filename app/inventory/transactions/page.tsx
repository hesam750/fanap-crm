"use client"

import { useEffect, useMemo, useState } from "react"

import { apiClient } from "@/lib/api-client"
import type { InventoryItem, InventoryTransactionStatus, InventoryTransactionType, StockTransaction, Warehouse, Location } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw, Search, Plus } from "lucide-react"

export default function InventoryTransactionsPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  // Filters
  const [query, setQuery] = useState("")
  const [trxType, setTrxType] = useState<InventoryTransactionType | "">("")
  const [trxStatus, setTrxStatus] = useState<InventoryTransactionStatus | "">("")
  const [trxItemId, setTrxItemId] = useState<string | "">("")
  const [warehouseFilterId, setWarehouseFilterId] = useState<string>("")
  const [locationFilterId, setLocationFilterId] = useState<string>("")

  // Create transaction dialog
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false)
  const [newTransaction, setNewTransaction] = useState<Partial<StockTransaction>>({ type: "receipt", status: "requested", quantity: 1 })
  const [issueWarehouseId, setIssueWarehouseId] = useState<string | "">("")
  const [transferFromWarehouseId, setTransferFromWarehouseId] = useState<string | "">("")
  const [transferToWarehouseId, setTransferToWarehouseId] = useState<string | "">("")

  const canManageInventory = useMemo(() => {
    if (!currentUser) return false
    return ["root","manager","supervisor"].includes(currentUser.role)
  }, [currentUser])

  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])

  const nameForItem = (id: string) => itemsById.get(id)?.name || id
  const nameForLocation = (id: string) => locations.find(l => l.id === id)?.name || id
  const nameForWarehouse = (id: string) => warehouses.find(w => w.id === id)?.name || id
  const locationWarehouseMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of locations) m.set(l.id, l.warehouseId)
    return m
  }, [locations])
  const locationsForWarehouseFilter = useMemo(() => {
    return warehouseFilterId ? locations.filter(l => l.warehouseId === warehouseFilterId) : locations
  }, [warehouseFilterId, locations])

  const loadData = async () => {
    setLoading(true)
    try {
      const [itemsRes, trxRes, whRes, locRes] = await Promise.all([
        apiClient.getInventoryItems(),
        apiClient.getStockTransactions({
          status: trxStatus || undefined,
          type: trxType || undefined,
          itemId: trxItemId || undefined,
        }),
        apiClient.getWarehouses(),
        apiClient.getLocations(),
      ])
      setItems(itemsRes.items)
      setTransactions(trxRes.transactions)
      setWarehouses(whRes.warehouses)
      setLocations(locRes.locations)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت داده‌های تراکنش انجام نشد", variant: "destructive" as any })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function updateTransactionStatus(id: string, status: InventoryTransactionStatus) {
    try {
      const res = await apiClient.updateStockTransaction(id, {
        status,
        approvedBy: status === "approved" ? currentUser?.id : undefined,
        postedBy: status === "posted" ? currentUser?.id : undefined,
      })
      setTransactions(prev => prev.map(t => (t.id === id ? res.transaction : t)))
      toast({ title: "وضعیت تراکنش به‌روزرسانی شد" })
    } catch (err: any) {
      toast({ title: "به‌روزرسانی ناموفق بود", description: err?.message || "", variant: "destructive" as any })
    }
  }

  const filtered = useMemo(() => {
    let arr = [...transactions]
    if (trxType) arr = arr.filter(t => t.type === trxType)
    if (trxStatus) arr = arr.filter(t => t.status === trxStatus)
    if (trxItemId) arr = arr.filter(t => t.itemId === trxItemId)
    if (warehouseFilterId) {
      arr = arr.filter(t => {
        const fwh = t.fromLocationId ? locationWarehouseMap.get(t.fromLocationId) : undefined
        const twh = t.toLocationId ? locationWarehouseMap.get(t.toLocationId) : undefined
        return fwh === warehouseFilterId || twh === warehouseFilterId
      })
    }
    if (locationFilterId) {
      arr = arr.filter(t => t.fromLocationId === locationFilterId || t.toLocationId === locationFilterId)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(t => {
        const itemName = nameForItem(t.itemId).toLowerCase()
        const note = (t.note || "").toLowerCase()
        return itemName.includes(q) || note.includes(q)
      })
    }
    // Sort by createdAt desc
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return arr
  }, [transactions, trxType, trxStatus, trxItemId, query, itemsById, warehouseFilterId, locationFilterId, locationWarehouseMap])

  return (
    <div className="space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>مدیریت تراکنش‌ها</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو نام کالا/توضیحات"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={trxType || ""} onValueChange={(val) => setTrxType(val === "__ALL_TYPES__" ? "" : (val as InventoryTransactionType))}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="نوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL_TYPES__">همه انواع</SelectItem>
                      <SelectItem value="receipt">ورودی</SelectItem>
                      <SelectItem value="issue">خروجی</SelectItem>
                      <SelectItem value="return">مرجوعی</SelectItem>
                      <SelectItem value="transfer">انتقال</SelectItem>
                      <SelectItem value="adjustment">اصلاح موجودی</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={trxStatus || ""} onValueChange={(val) => setTrxStatus(val === "__ALL_STATUS__" ? "" : (val as InventoryTransactionStatus))}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL_STATUS__">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="requested">درخواست شده</SelectItem>
                      <SelectItem value="approved">تأیید شده</SelectItem>
                      <SelectItem value="posted">ثبت شده</SelectItem>
                      <SelectItem value="rejected">رد شده</SelectItem>
                      <SelectItem value="void">باطل</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={trxItemId || ""} onValueChange={(val) => setTrxItemId(val === "__ALL_ITEMS__" ? "" : val)}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="کالا" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL_ITEMS__">همه کالاها</SelectItem>
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={warehouseFilterId} onValueChange={(val) => { const v = val === "__ALL_WAREHOUSES__" ? "" : val; setWarehouseFilterId(v); setLocationFilterId("") }}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="انبار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL_WAREHOUSES__">همه انبارها</SelectItem>
                      {warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={locationFilterId} onValueChange={(val) => setLocationFilterId(val === "__ALL_LOCATIONS__" ? "" : val)}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="مکان" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL_LOCATIONS__">همه مکان‌ها</SelectItem>
                      {locationsForWarehouseFilter.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadData} disabled={loading}>
                    <RefreshCw className="h-4 w-4 ml-1" />
                    بروزرسانی
                  </Button>
                  <Button onClick={() => setOpenTransactionDialog(true)}>
                    <Plus className="h-4 w-4 ml-1" />
                    ثبت تراکنش
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>تاریخ</TableHead>
                        <TableHead>نوع</TableHead>
                        <TableHead>کالا</TableHead>
                        <TableHead>مقدار</TableHead>
                        <TableHead className="hidden sm:table-cell">واحد</TableHead>
                        <TableHead className="hidden md:table-cell">مکان مبدأ</TableHead>
                        <TableHead className="hidden md:table-cell">مکان مقصد</TableHead>
                        <TableHead className="hidden md:table-cell">وضعیت</TableHead>
                        <TableHead className="hidden md:table-cell">اقدام</TableHead>
                        <TableHead className="hidden lg:table-cell">توضیحات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{new Date(t.createdAt as any).toLocaleString("fa-IR")}</TableCell>
                          <TableCell>{t.type}</TableCell>
                          <TableCell>{nameForItem(t.itemId)}</TableCell>
                          <TableCell>{t.quantity}</TableCell>
                          <TableCell className="hidden sm:table-cell">{t.unit}</TableCell>
                          <TableCell className="hidden md:table-cell">{t.fromLocationId ? nameForLocation(t.fromLocationId) : "-"}</TableCell>
                          <TableCell className="hidden md:table-cell">{t.toLocationId ? nameForLocation(t.toLocationId) : "-"}</TableCell>
                          <TableCell className="hidden md:table-cell">{t.status}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {canManageInventory && (
                              <div className="flex items-center gap-2">
                                {t.status === "requested" && (
                                  <>
                                    <Button size="sm" variant="secondary" onClick={() => updateTransactionStatus(t.id, "approved")}>تأیید</Button>
                                    <Button size="sm" variant="destructive" onClick={() => updateTransactionStatus(t.id, "rejected")}>رد</Button>
                                  </>
                                )}
                                {t.status === "approved" && (
                                  <>
                                    <Button size="sm" onClick={() => updateTransactionStatus(t.id, "posted")}>ثبت نهایی</Button>
                                    <Button size="sm" variant="destructive" onClick={() => updateTransactionStatus(t.id, "rejected")}>رد</Button>
                                    <Button size="sm" variant="outline" onClick={() => updateTransactionStatus(t.id, "void")}>باطل</Button>
                                  </>
                                )}
                                {t.status === "posted" && (
                                  <Button size="sm" variant="outline" onClick={() => updateTransactionStatus(t.id, "void")}>باطل</Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[360px] truncate" title={t.note || ""}>{t.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">موردی یافت نشد</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ثبت تراکنش</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>نوع</Label>
                    <Select value={(newTransaction.type as any) || "receipt"} onValueChange={(val) => setNewTransaction(v => ({ ...v, type: val as any }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="نوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receipt">ورودی</SelectItem>
                        <SelectItem value="issue">خروجی</SelectItem>
                        <SelectItem value="return">مرجوعی</SelectItem>
                        <SelectItem value="transfer">انتقال</SelectItem>
                        <SelectItem value="adjustment">اصلاح موجودی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>کالا</Label>
                    <Select value={newTransaction.itemId || ""} onValueChange={(val) => { const item = itemsById.get(val); setNewTransaction(v => ({ ...v, itemId: val, unit: item?.unit || v.unit || "" })); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب کالا" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>مقدار</Label>
                    <Input type="number" value={newTransaction.quantity ?? 1} onChange={e => setNewTransaction(v => ({ ...v, quantity: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>واحد</Label>
                    <Input value={newTransaction.unit || ""} onChange={e => setNewTransaction(v => ({ ...v, unit: e.target.value }))} />
                  </div>
                  {newTransaction.type === "issue" && (
                    <>
                      <div>
                        <Label>انبار مبدأ</Label>
                        <Select value={issueWarehouseId || ""} onValueChange={(val) => setIssueWarehouseId(val)}>
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
                        <Label>مکان مبدأ</Label>
                        <Select value={newTransaction.fromLocationId || ""} onValueChange={(val) => setNewTransaction(v => ({ ...v, fromLocationId: val }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="انتخاب مکان" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.filter(l => !issueWarehouseId || l.warehouseId === issueWarehouseId).map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {newTransaction.type === "transfer" && (
                    <>
                      <div>
                        <Label>انبار مبدأ</Label>
                        <Select value={transferFromWarehouseId || ""} onValueChange={(val) => setTransferFromWarehouseId(val)}>
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
                        <Label>مکان مبدأ</Label>
                        <Select value={newTransaction.fromLocationId || ""} onValueChange={(val) => setNewTransaction(v => ({ ...v, fromLocationId: val }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="انتخاب مکان" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.filter(l => !transferFromWarehouseId || l.warehouseId === transferFromWarehouseId).map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>انبار مقصد</Label>
                        <Select value={transferToWarehouseId || ""} onValueChange={(val) => setTransferToWarehouseId(val)}>
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
                        <Label>مکان مقصد</Label>
                        <Select value={newTransaction.toLocationId || ""} onValueChange={(val) => setNewTransaction(v => ({ ...v, toLocationId: val }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="انتخاب مکان" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.filter(l => !transferToWarehouseId || l.warehouseId === transferToWarehouseId).map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="col-span-3">
                    <Label>توضیحات</Label>
                    <Textarea value={newTransaction.note || ""} onChange={e => setNewTransaction(v => ({ ...v, note: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenTransactionDialog(false)}>انصراف</Button>
                  <Button onClick={async () => {
                    try {
                      if (!newTransaction.itemId || !newTransaction.type || !newTransaction.quantity || !newTransaction.unit) {
                        toast({ title: "خطای اعتبارسنجی", description: "نوع، کالا، مقدار و واحد الزامی است.", variant: "destructive" as any })
                        return
                      }
                      if (newTransaction.type === "issue" && !newTransaction.fromLocationId) {
                        toast({ title: "خطای اعتبارسنجی", description: "برای حواله خروج، انتخاب مکان مبدأ الزامی است.", variant: "destructive" as any })
                        return
                      }
                      if (newTransaction.type === "transfer" && (!newTransaction.fromLocationId || !newTransaction.toLocationId)) {
                        toast({ title: "خطای اعتبارسنجی", description: "برای انتقال، انتخاب مکان مبدأ و مقصد الزامی است.", variant: "destructive" as any })
                        return
                      }
                      const payload: any = {
                        type: newTransaction.type!,
                        itemId: newTransaction.itemId!,
                        quantity: newTransaction.quantity!,
                        unit: newTransaction.unit!,
                        requestedBy: currentUser?.id || "system",
                        status: (newTransaction.status as any) || "requested",
                        note: newTransaction.note,
                      }
                      if (newTransaction.type === "issue") {
                        payload.fromLocationId = newTransaction.fromLocationId || null
                      }
                      if (newTransaction.type === "transfer") {
                        payload.fromLocationId = newTransaction.fromLocationId || null
                        payload.toLocationId = newTransaction.toLocationId || null
                      }
                      const res = await apiClient.createStockTransaction(payload)
                      setTransactions(prev => [res.transaction, ...prev])
                      setOpenTransactionDialog(false)
                      setNewTransaction({ type: "receipt", status: "requested", quantity: 1 })
                      setIssueWarehouseId("")
                      setTransferFromWarehouseId("")
                      setTransferToWarehouseId("")
                      toast({ title: "تراکنش ثبت شد" })
                    } catch (err: any) {
                      toast({ title: "ثبت تراکنش ناموفق بود", description: err?.message || "", variant: "destructive" as any })
                    }
                  }}>ثبت تراکنش</Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
  )
}