"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/useAuth"
import type { InventoryItem, InventoryCategory } from "@/lib/types"
import { Pencil, Trash2 } from "lucide-react"

export default function InventoryItemsPage() {
  const { currentUser } = useAuth()
  const canEdit = (process.env.NODE_ENV !== 'production') || (!!currentUser && (currentUser.role === "root" || currentUser.role === "manager"))
  const { toast } = useToast()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)

  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    categoryId: "",
    unit: "",
    minStock: "",
    reorderPoint: "",
    serializable: false,
    isActive: true,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [itemsRes, catsRes] = await Promise.all([
        apiClient.getInventoryItems(),
        apiClient.getInventoryCategories(),
      ])
      setItems(itemsRes.items)
      setCategories(catsRes.categories)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت اقلام/دسته‌ها انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setForm({ sku: "", name: "", description: "", categoryId: "", unit: "", minStock: "", reorderPoint: "", serializable: false, isActive: true })
  }

  const handleCreate = async () => {
    if (!form.sku || !form.name || !form.categoryId || !form.unit) {
      toast({ title: "اطلاعات ناقص", description: "SKU، نام، دسته و واحد الزامی است", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const payload: any = {
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId,
        unit: form.unit,
        minStock: form.minStock ? Number(form.minStock) : undefined,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        serializable: form.serializable,
        isActive: form.isActive,
      }
      const { item } = await apiClient.createInventoryItem(payload)
      setItems((prev) => [item, ...prev])
      setOpenCreate(false)
      resetForm()
      toast({ title: "ثبت شد", description: "قلم جدید افزوده شد" })
    } catch (e) {
      toast({ title: "خطا", description: "ایجاد قلم انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (it: InventoryItem) => {
    setEditItem(it)
    setForm({
      sku: it.sku,
      name: it.name,
      description: it.description || "",
      categoryId: it.categoryId,
      unit: it.unit,
      minStock: it.minStock?.toString() ?? "",
      reorderPoint: it.reorderPoint?.toString() ?? "",
      serializable: !!it.serializable,
      isActive: !!it.isActive,
    })
    setOpenEdit(true)
  }

  const handleUpdate = async () => {
    if (!editItem) return
    setLoading(true)
    try {
      const updates: any = {
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId,
        unit: form.unit,
        minStock: form.minStock ? Number(form.minStock) : undefined,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        serializable: form.serializable,
        isActive: form.isActive,
      }
      const { item } = await apiClient.updateInventoryItem(editItem.id, updates)
      setItems((prev) => prev.map((p) => (p.id === item.id ? item : p)))
      setOpenEdit(false)
      setEditItem(null)
      toast({ title: "به‌روزرسانی شد", description: "اطلاعات قلم ذخیره شد" })
    } catch (e) {
      toast({ title: "خطا", description: "به‌روزرسانی قلم انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (it: InventoryItem) => {
    if (!confirm(`حذف قلم "${it.name}"؟`)) return
    setLoading(true)
    try {
      await apiClient.deleteInventoryItem(it.id)
      setItems((prev) => prev.filter((p) => p.id !== it.id))
      toast({ title: "حذف شد", description: "قلم حذف شد" })
    } catch (e) {
      toast({ title: "خطا", description: "حذف قلم انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between gap-2 flex-col sm:flex-row">
          <CardTitle>مدیریت اقلام</CardTitle>
          <Button onClick={() => setOpenCreate(true)} disabled={loading || !canEdit}>افزودن قلم</Button>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>نام</TableHead>
                  <TableHead>دسته</TableHead>
                  <TableHead>واحد</TableHead>
                  <TableHead>حداقل/نقطه سفارش</TableHead>
                  <TableHead>سریالی</TableHead>
                  <TableHead>فعال</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                    <TableCell>{it.name}</TableCell>
                    <TableCell>{categories.find((c) => c.id === it.categoryId)?.name || "-"}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell>{it.minStock ?? "-"}/{it.reorderPoint ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{it.serializable ? "بله" : "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={it.isActive ? "default" : "secondary"}>{it.isActive ? "فعال" : "غیرفعال"}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2 rtl:space-x-reverse">
                      <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => openEditDialog(it)}>
                        <Pencil className="h-4 w-4 ml-1" /> ویرایش
                      </Button>
                      <Button size="sm" variant="destructive" disabled={!canEdit} onClick={() => handleDelete(it)}>
                        <Trash2 className="h-4 w-4 ml-1" /> حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {items.map((it) => (
              <Card key={it.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{it.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={it.isActive ? "default" : "secondary"}>{it.isActive ? "فعال" : "غیرفعال"}</Badge>
                    {it.serializable && <Badge variant="outline">سریالی</Badge>}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>دسته: {categories.find((c) => c.id === it.categoryId)?.name || "-"}</div>
                  <div>واحد: {it.unit}</div>
                  <div>حداقل/نقطه: {it.minStock ?? "-"} / {it.reorderPoint ?? "-"}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1 sm:flex-none" variant="outline" disabled={!canEdit} onClick={() => openEditDialog(it)}>
                    <Pencil className="h-4 w-4 ml-1" /> ویرایش
                  </Button>
                  <Button size="sm" className="flex-1 sm:flex-none" variant="destructive" disabled={!canEdit} onClick={() => handleDelete(it)}>
                    <Trash2 className="h-4 w-4 ml-1" /> حذف
                  </Button>
                </div>
              </Card>
            ))}
            {items.length === 0 && (
              <div className="text-center text-muted-foreground py-8">داده‌ای نیست</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={(o) => (setOpenCreate(o), o || resetForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن قلم</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>نام</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>دسته</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب دسته" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>واحد</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>حداقل موجودی</Label>
              <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            </div>
            <div>
              <Label>نقطه سفارش</Label>
              <Input type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.serializable} onCheckedChange={(v) => setForm({ ...form, serializable: !!v })} />
              <Label>قابل سریال</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} />
              <Label>فعال</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={loading || !canEdit}>ثبت</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={(o) => (setOpenEdit(o), !o && setEditItem(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش قلم</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>نام</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>دسته</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب دسته" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>واحد</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>حداقل موجودی</Label>
              <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
            </div>
            <div>
              <Label>نقطه سفارش</Label>
              <Input type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.serializable} onCheckedChange={(v) => setForm({ ...form, serializable: !!v })} />
              <Label>قابل سریال</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} />
              <Label>فعال</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpenEdit(false)}>انصراف</Button>
            <Button onClick={handleUpdate} disabled={loading || !canEdit}>ذخیره</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
