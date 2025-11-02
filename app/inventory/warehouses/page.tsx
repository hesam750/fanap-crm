"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/useAuth"
import type { Warehouse } from "@/lib/types"
import { Pencil, Trash2, Plus, Search, LayoutGrid, List } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export default function WarehousesPage() {
  const { currentUser } = useAuth()
  const canEdit = (process.env.NODE_ENV !== "production") || (!!currentUser && (currentUser.role === "root" || currentUser.role === "manager"))
  const { toast } = useToast()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<'table' | 'cards'>('table')

  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null)

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
  })

  const codeDuplicate = useMemo(() => {
    const c = form.code.trim().toLowerCase()
    if (!c) return false
    return warehouses.some(
      (w) => w.code && w.code.toLowerCase() === c && (!editWarehouse || w.id !== editWarehouse.id)
    )
  }, [form.code, warehouses, editWarehouse])

  // مرتب‌سازی
  const [sortKey, setSortKey] = useState<"name" | "code" | "createdAt" | "updatedAt">("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sorted = useMemo(() => {
    const arr = [...warehouses]
    const dir = sortDir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      let va: any, vb: any
      switch (sortKey) {
        case "name":
          va = a.name.toLowerCase(); vb = b.name.toLowerCase();
          break
        case "code":
          va = (a.code || "").toLowerCase(); vb = (b.code || "").toLowerCase();
          break
        case "createdAt":
          va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime();
          break
        case "updatedAt":
          va = new Date(a.updatedAt).getTime(); vb = new Date(b.updatedAt).getTime();
          break
        default:
          va = 0; vb = 0
      }
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
    return arr
  }, [warehouses, sortKey, sortDir])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = sorted
    if (!q) return base
    return base.filter((w) =>
      [w.name, w.code || "", w.address || ""].some((f) => String(f).toLowerCase().includes(q))
    )
  }, [query, sorted])

  // صفحه‌بندی
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize
  const pageItems = useMemo(() => filtered.slice(start, end), [filtered, start, end])
  useEffect(() => { setPage(1) }, [filtered, pageSize])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getWarehouses()
      setWarehouses(res.warehouses)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت لیست انبارها انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const resetForm = () => setForm({ name: "", code: "", address: "" })

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "اطلاعات ناقص", description: "نام انبار الزامی است", variant: "destructive" })
      return
    }
    if (codeDuplicate) {
      toast({ title: "کد تکراری", description: "کد انبار قبلاً ثبت شده است", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const { warehouse } = await apiClient.createWarehouse({
        name: form.name.trim(),
        code: form.code || undefined,
        address: form.address || undefined,
      } as any)
      setWarehouses((prev) => [warehouse, ...prev])
      setOpenCreate(false)
      resetForm()
      toast({ title: "ثبت شد", description: "انبار جدید افزوده شد" })
    } catch (e) {
      toast({ title: "خطا", description: "ایجاد انبار انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (w: Warehouse) => {
    setEditWarehouse(w)
    setForm({ name: w.name, code: w.code || "", address: w.address || "" })
    setOpenEdit(true)
  }

  const handleUpdate = async () => {
    if (!editWarehouse) return
    if (!form.name.trim()) {
      toast({ title: "اطلاعات ناقص", description: "نام انبار الزامی است", variant: "destructive" })
      return
    }
    if (codeDuplicate) {
      toast({ title: "کد تکراری", description: "کد انبار قبلاً ثبت شده است", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const { warehouse } = await apiClient.updateWarehouse(editWarehouse.id, {
        name: form.name.trim(),
        code: form.code || undefined,
        address: form.address || undefined,
      } as any)
      setWarehouses((prev) => prev.map((p) => (p.id === warehouse.id ? warehouse : p)))
      setOpenEdit(false)
      setEditWarehouse(null)
      toast({ title: "به‌روزرسانی شد", description: "اطلاعات انبار ذخیره شد" })
    } catch (e) {
      toast({ title: "خطا", description: "به‌روزرسانی انبار انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (w: Warehouse) => {
    if (!confirm(`حذف انبار "${w.name}"؟`)) return
    setLoading(true)
    try {
      await apiClient.deleteWarehouse(w.id)
      setWarehouses((prev) => prev.filter((p) => p.id !== w.id))
      toast({ title: "حذف شد", description: "انبار حذف شد" })
    } catch (e) {
      toast({ title: "خطا", description: "حذف انبار انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>مدیریت انبارها</CardTitle>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو نام/کد/آدرس"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as any)}
              variant="outline"
              size="sm"
              className="hidden md:flex mr-2"
            >
              <ToggleGroupItem value="table">
                <List className="h-4 w-4 ml-1" /> جدول
              </ToggleGroupItem>
              <ToggleGroupItem value="cards">
                <LayoutGrid className="h-4 w-4 ml-1" /> کارت‌ها
              </ToggleGroupItem>
            </ToggleGroup>
            <Button className="w-full md:w-auto" onClick={() => setOpenCreate(true)} disabled={loading || !canEdit}>
              <Plus className="h-4 w-4 ml-1" /> افزودن انبار
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-muted-foreground">تعداد: {filtered.length}</div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full col-span-2" />
                  <Skeleton className="h-8 w-28 justify-self-end" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <div className="font-medium">هیچ انباری یافت نشد</div>
                <div className="text-sm text-muted-foreground">برای افزودن، دکمه «افزودن انبار» را بزنید.</div>
              </div>
              <Button onClick={() => setOpenCreate(true)} disabled={!canEdit}>
                <Plus className="h-4 w-4 ml-1" /> افزودن انبار
              </Button>
            </div>
          ) : (
            <>
              {view === 'cards' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pageItems.map((w) => (
                    <Card key={w.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">{w.name}</CardTitle>
                        {w.code ? (
                          <Badge variant="secondary" className="font-mono">{w.code}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">{w.address || "-"}</div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>ایجاد: {new Date(w.createdAt).toLocaleDateString()}</span>
                          <span>به‌روزرسانی: {new Date(w.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => openEditDialog(w)}>
                            <Pencil className="h-4 w-4 ml-1" /> ویرایش
                          </Button>
                          <Button size="sm" variant="destructive" disabled={!canEdit} onClick={() => handleDelete(w)}>
                            <Trash2 className="h-4 w-4 ml-1" /> حذف
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <Table className={view === 'cards' ? 'hidden' : ''}>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => (setSortKey("name"), setSortDir(sortKey === "name" && sortDir === "asc" ? "desc" : "asc"))} className="cursor-pointer select-none">نام {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</TableHead>
                    <TableHead onClick={() => (setSortKey("code"), setSortDir(sortKey === "code" && sortDir === "asc" ? "desc" : "asc"))} className="cursor-pointer select-none">کد {sortKey === "code" ? (sortDir === "asc" ? "↑" : "↓") : ""}</TableHead>
                    <TableHead>آدرس</TableHead>
                    <TableHead>
                      <button className="cursor-pointer" onClick={() => (setSortKey(sortKey === "createdAt" ? "updatedAt" : "createdAt"), setSortDir(sortDir === "asc" ? "desc" : "asc"))}>
                        ایجاد/به‌روزرسانی {sortKey === "createdAt" || sortKey === "updatedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold">{w.name}</TableCell>
                      <TableCell>
                        {w.code ? <Badge variant="secondary" className="font-mono">{w.code}</Badge> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>{w.address || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>ایجاد: {new Date(w.createdAt).toLocaleDateString()}</div>
                          <div>به‌روزرسانی: {new Date(w.updatedAt).toLocaleDateString()}</div>
                        </div>
                      </TableCell>
                      <TableCell className="space-x-2 rtl:space-x-reverse">
                        <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => openEditDialog(w)}>
                          <Pencil className="h-4 w-4 ml-1" /> ویرایش
                        </Button>
                        <Button size="sm" variant="destructive" disabled={!canEdit} onClick={() => handleDelete(w)}>
                          <Trash2 className="h-4 w-4 ml-1" /> حذف
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  نمایش {total ? start + 1 : 0} تا {Math.min(end, total)} از {total}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">تعداد در صفحه:</label>
                  <select
                    className="h-8 rounded-md border px-2 bg-background"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}>قبلی</Button>
                  <div className="text-sm">صفحه {safePage} از {totalPages}</div>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}>بعدی</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={(o) => (setOpenCreate(o), o || resetForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن انبار</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>نام</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>کد</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              {codeDuplicate && <div className="mt-1 text-xs text-destructive">کد انبار تکراری است.</div>}
            </div>
            <div className="col-span-2">
              <Label>آدرس</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpenCreate(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={loading || !canEdit || codeDuplicate}>ثبت</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={(o) => (setOpenEdit(o), o || setEditWarehouse(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش انبار</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>نام</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>کد</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              {codeDuplicate && <div className="mt-1 text-xs text-destructive">کد انبار تکراری است.</div>}
            </div>
            <div className="col-span-2">
              <Label>آدرس</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpenEdit(false)}>انصراف</Button>
            <Button onClick={handleUpdate} disabled={loading || !canEdit || codeDuplicate}>ذخیره</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}