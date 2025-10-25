"use client"

import { useEffect, useMemo, useState } from "react"

import { apiClient } from "@/lib/api-client"
import type { InventoryItem, InventoryTransactionStatus, StockTransaction } from "@/lib/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw } from "lucide-react"
import { allowedTransitions, actionToStatus, actorFieldForStatus, validateForStatusTransition, type WorkflowAction } from "@/lib/workflow"

const actionLabel: Record<WorkflowAction, string> = {
  approve: "تأیید",
  post: "ثبت نهایی",
  reject: "رد",
  void: "باطل",
}
const statusToActionMap: Record<InventoryTransactionStatus, WorkflowAction | null> = {
  requested: null,
  approved: "approve",
  posted: "post",
  rejected: "reject",
  void: "void",
}

export default function InventoryWorkflowsPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [statusFilter, setStatusFilter] = useState<InventoryTransactionStatus | "">("requested")

  const canManageInventory = useMemo(() => {
    const role = currentUser?.role
    return !!role && ["root","manager","supervisor"].includes(role)
  }, [currentUser])

  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])
  const itemName = (id: string) => itemsById.get(id)?.name || id

  async function loadData() {
    setLoading(true)
    try {
      const [itemsRes, trxRes] = await Promise.all([
        apiClient.getInventoryItems(),
        apiClient.getStockTransactions({ status: statusFilter || undefined }),
      ])
      setItems(itemsRes.items)
      setTransactions(trxRes.transactions)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت داده‌های گردش کار انجام نشد", variant: "destructive" as any })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [statusFilter])

  async function performAction(trx: StockTransaction, action: WorkflowAction) {
    const next = actionToStatus(action)
    const err = validateForStatusTransition(next, trx)
    if (err) { toast({ title: "خطای اعتبارسنجی", description: err, variant: "destructive" as any }); return }
    try {
      const actorField = actorFieldForStatus(next)
      const updates: Partial<StockTransaction> = { status: next }
      if (actorField) (updates as any)[actorField] = currentUser?.id
      const res = await apiClient.updateStockTransaction(trx.id, updates)
      setTransactions(prev => prev.map(t => t.id === trx.id ? res.transaction : t))
      toast({ title: "وضعیت به‌روزرسانی شد" })
    } catch (err: any) {
      toast({ title: "به‌روزرسانی ناموفق بود", description: err?.message || "", variant: "destructive" as any })
    }
  }

  const displayed = useMemo(() => {
    const base = statusFilter ? transactions.filter(t => t.status === statusFilter) : transactions
    // فقط موارد قابل اقدام را نشان بده
    return base.filter(t => (allowedTransitions[t.status] || []).length > 0)
  }, [transactions, statusFilter])

  return (
    <div className="space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>گردش کار انبار</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter || ""} onValueChange={(val) => setStatusFilter(val === "__ALL__" ? "" : (val as InventoryTransactionStatus))}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">همه</SelectItem>
                      <SelectItem value="requested">درخواست شده</SelectItem>
                      <SelectItem value="approved">تأیید شده</SelectItem>
                      <SelectItem value="posted">ثبت شده</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadData} disabled={loading}>
                    <RefreshCw className="h-4 w-4 ml-1" />
                    بروزرسانی
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
                        <TableHead className="hidden md:table-cell">وضعیت</TableHead>
                        <TableHead className="hidden md:table-cell">اقدام</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayed.map(t => {
                        const allowed = (allowedTransitions[t.status] || [])
                        const actions = allowed.map(s => statusToActionMap[s]).filter(Boolean) as WorkflowAction[]
                        return (
                          <TableRow key={t.id}>
                            <TableCell>{new Date(t.createdAt as any).toLocaleString("fa-IR")}</TableCell>
                            <TableCell>{t.type}</TableCell>
                            <TableCell>{itemName(t.itemId)}</TableCell>
                            <TableCell>{t.quantity} {t.unit}</TableCell>
                            <TableCell className="hidden md:table-cell">{t.status}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {canManageInventory ? (
                                <div className="flex items-center gap-2">
                                  {actions.map(a => (
                                    <Button key={a} size="sm" variant={a === "reject" ? "destructive" : a === "void" ? "outline" : "default"} onClick={() => performAction(t, a)}>
                                      {actionLabel[a]}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">دسترسی ندارید</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {displayed.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">مورد قابل اقدام یافت نشد</TableCell>
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