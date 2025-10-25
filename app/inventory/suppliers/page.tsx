"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/useAuth"
import type { Supplier } from "@/lib/types"
import { Plus, Search, RefreshCw } from "lucide-react"

export default function SuppliersPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")

  // Create supplier dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({})

  const canCreateSupplier = useMemo(() => {
    const role = currentUser?.role
    return !!role && ["root","manager"].includes(role)
  }, [currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getSuppliers()
      setSuppliers(res.suppliers)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت لیست تامین‌کنندگان انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    let arr = [...suppliers]
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(s => (
        (s.name || "").toLowerCase().includes(q) ||
        (s.code || "").toLowerCase().includes(q) ||
        (s.contactPerson || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q)
      ))
    }
    // مرتب‌سازی: جدیدترین در ابتدا
    arr.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
    return arr
  }, [suppliers, query])

  const handleCreate = async () => {
    const name = (newSupplier.name || "").trim()
    if (!name) {
      toast({ title: "اطلاعات ناقص", description: "نام تامین‌کننده الزامی است", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const payload: any = {
        name,
        code: newSupplier.code || undefined,
        contactPerson: newSupplier.contactPerson || undefined,
        phone: newSupplier.phone || undefined,
        email: newSupplier.email || undefined,
        address: newSupplier.address || undefined,
      }
      const { supplier } = await apiClient.createSupplier(payload)
      setSuppliers(prev => [supplier, ...prev])
      setOpenCreateDialog(false)
      setNewSupplier({})
      toast({ title: "ایجاد شد", description: "تامین‌کننده جدید با موفقیت ثبت شد" })
    } catch (e) {
      toast({ title: "خطا", description: "ایجاد تامین‌کننده انجام نشد (احراز هویت/دسترسی را بررسی کنید)", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>مدیریت تامین‌کنندگان</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو نام/کد/مسئول/ایمیل/تلفن"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className="h-4 w-4 ml-1" /> بروزرسانی
            </Button>
            {canCreateSupplier && (
              <Button onClick={() => setOpenCreateDialog(true)} disabled={loading}>
                <Plus className="h-4 w-4 ml-1" /> افزودن تامین‌کننده
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
                <TableHead>مسئول تماس</TableHead>
                <TableHead>تلفن</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>آدرس</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.createdAt as any).toLocaleString("fa-IR")}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.code || "-"}</TableCell>
                  <TableCell>{s.contactPerson || "-"}</TableCell>
                  <TableCell>{s.phone || "-"}</TableCell>
                  <TableCell>{s.email || "-"}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={s.address || undefined}>{s.address || "-"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">موردی یافت نشد</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ایجاد تامین‌کننده جدید</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>نام تامین‌کننده</Label>
              <Input value={newSupplier.name || ""} onChange={(e) => setNewSupplier(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div>
              <Label>کد (اختیاری)</Label>
              <Input value={newSupplier.code || ""} onChange={(e) => setNewSupplier(v => ({ ...v, code: e.target.value }))} />
            </div>
            <div>
              <Label>مسئول تماس</Label>
              <Input value={newSupplier.contactPerson || ""} onChange={(e) => setNewSupplier(v => ({ ...v, contactPerson: e.target.value }))} />
            </div>
            <div>
              <Label>تلفن</Label>
              <Input value={newSupplier.phone || ""} onChange={(e) => setNewSupplier(v => ({ ...v, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>ایمیل</Label>
              <Input type="email" value={newSupplier.email || ""} onChange={(e) => setNewSupplier(v => ({ ...v, email: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>آدرس</Label>
              <Textarea value={newSupplier.address || ""} onChange={(e) => setNewSupplier(v => ({ ...v, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={!canCreateSupplier}>ثبت تامین‌کننده</Button>
          </div>
          {!canCreateSupplier && (
            <div className="mt-3">
              <Badge variant="secondary">ایجاد تامین‌کننده فقط برای نقش‌های مدیر/مدیر کل مجاز است</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}