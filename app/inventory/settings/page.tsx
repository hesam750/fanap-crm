"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/useAuth"
import { RefreshCw, Save } from "lucide-react"

export default function InventorySettingsPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    lowAlertThreshold: 20,
    criticalAlertThreshold: 10,
    autoUpdateInterval: 5,
    maintenanceMode: false,
    dataRetentionDays: 30,
  })

  const canEdit = useMemo(() => {
    const role = currentUser?.role
    return !!role && ["root","manager"].includes(role)
  }, [currentUser])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getSystemSettings()
      const s: any = (res as any)?.settings || {}
      setForm(prev => ({
        ...prev,
        ...s,
      }))
    } catch (e) {
      toast({ title: "خطا", description: "دریافت تنظیمات انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  const saveSettings = async () => {
    setLoading(true)
    try {
      await apiClient.updateSystemSettings(form)
      toast({ title: "ذخیره شد", description: "تنظیمات با موفقیت به‌روزرسانی شد" })
    } catch (e) {
      toast({ title: "خطا", description: "ذخیره تنظیمات انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">تنظیمات انبار</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 ml-1" /> بروزرسانی
          </Button>
          <Button onClick={saveSettings} disabled={loading || !canEdit}>
            <Save className="h-4 w-4 ml-1" /> ذخیره تنظیمات
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>هشدارها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lowAlertThreshold">آستانه هشدار کم (٪)</Label>
              <Input
                id="lowAlertThreshold"
                type="number"
                value={String(form.lowAlertThreshold ?? "")}
                onChange={(e) => setForm(f => ({ ...f, lowAlertThreshold: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="criticalAlertThreshold">آستانه بحرانی (٪)</Label>
              <Input
                id="criticalAlertThreshold"
                type="number"
                value={String(form.criticalAlertThreshold ?? "")}
                onChange={(e) => setForm(f => ({ ...f, criticalAlertThreshold: Number(e.target.value) }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>عمومی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="autoUpdateInterval">بازه بروزرسانی خودکار (دقیقه)</Label>
              <Input
                id="autoUpdateInterval"
                type="number"
                value={String(form.autoUpdateInterval ?? "")}
                onChange={(e) => setForm(f => ({ ...f, autoUpdateInterval: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="dataRetentionDays">روزهای نگهداری داده</Label>
              <Input
                id="dataRetentionDays"
                type="number"
                value={String(form.dataRetentionDays ?? "")}
                onChange={(e) => setForm(f => ({ ...f, dataRetentionDays: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="maintenanceMode"
              checked={!!form.maintenanceMode}
              onCheckedChange={(val) => setForm(f => ({ ...f, maintenanceMode: val }))}
            />
            <Label htmlFor="maintenanceMode">حالت نگهداری</Label>
          </div>
        </CardContent>
      </Card>

      {!canEdit && (
        <div className="text-sm text-muted-foreground">فقط نقش‌های مدیر و ریشه می‌توانند تنظیمات را تغییر دهند.</div>
      )}
    </div>
  )
}