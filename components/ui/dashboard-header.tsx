"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bell, LogOut, Settings, Moon, Sun, User, Download } from "lucide-react"
import type { User as UserType, Alert, Task } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { useTheme } from "next-themes"
import { ProfileManagement } from "@/components/profile-management"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { alarmManager } from "@/lib/alarm-manager"

interface DashboardHeaderProps {
  user: UserType
  alertCount: number
  onLogout: () => void
  notificationCount: number
  onRefresh: () => void
  alerts: Alert[]
  tasks: Task[]
  selectedAlertIds: string[]
  alarmScope?: "all" | "tasks" | "selected-alerts"
}

export function DashboardHeader({ user, alertCount, onLogout, alerts, tasks, selectedAlertIds, alarmScope: alarmScopeProp = "all" }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [currentUser, setCurrentUser] = useState(user)
  // وضعیت تنظیمات آلارم برای مدال هدر
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") return localStorage.getItem("alarmEnabled") === "true"
    } catch {}
    return alarmManager.isEnabled()
  })
  const [alarmScope, setAlarmScope] = useState<string>(alarmScopeProp)
  const [alarmVolume, setAlarmVolume] = useState<number>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("alarmVolume")
        const v = Number(raw)
        if (!Number.isNaN(v)) {
          alarmManager.setVolume(v)
          return v
        }
      }
    } catch {}
    return alarmManager.getVolume()
  })
  const alarmMuted = alarmManager.isMuted()

  // PWA install prompt
  const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPromptEvent(e)
      setCanInstall(true)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setInstallPromptEvent(null)
      setCanInstall(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  // نصب: تشخیص حالت مستقل و کنترل دیالوگ راهنما
  const [isStandalone, setIsStandalone] = useState(false)
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
      const isIosStandalone = (navigator as any).standalone === true
      setIsStandalone(isStandaloneDisplay || isIosStandalone)
    }
    checkStandalone()
  }, [])

  // محاسبه دلایل فعال بودن آلارم برای نمایش در مدال
  const activeAlertsForAlarm = alerts.filter((a) => {
    if (a.acknowledged) return false
    if (alarmScope === "tasks") return false
    if (alarmScope === "all") return true
    if (alarmScope === "selected-alerts") return selectedAlertIds.includes(String(a.id))
    return false
  })
  const activeTasksForAlarm = tasks.filter((t) => {
    const isMine = String(t.assignedTo) === String(currentUser?.id)
    const isPending = t.status === "pending"
    const notOpened = !alarmManager.hasTaskBeenOpened(String(t.id))
    if (alarmScope === "selected-alerts") return false
    return isMine && isPending && notOpened
  })

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager":
        return "مدیر"
      case "operator":
        return "اپراتور"
      case "supervisor":
        return "ناظر"
      case "monitor":
        return "نمایشگر"
      default:
        return role
    }
  }

  const handleLogout = () => {
    const auth = AuthService.getInstance()
    auth.logout()
    onLogout()
  }

  const handleUserUpdate = (updatedUser: UserType) => {
    setCurrentUser(updatedUser)
    try {
      const stored = localStorage.getItem("currentUser")
      const exists = stored ? JSON.parse(stored) : {}
      const merged = { ...exists, ...updatedUser }
      if (!Array.isArray(merged.permissions)) {
        merged.permissions = merged.role === "root" ? ["*"] : []
      }
      localStorage.setItem("currentUser", JSON.stringify(merged))
    } catch (e) {
      // ignore storage errors
    }
  }

  return (
    <header dir="rtl" className="bg-blur border-b border-border px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left section with title and role */}
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-2xl font-bold">سیستم مدیریت مخازن</h1>
          <Badge variant="secondary">{getRoleLabel(currentUser.role)}</Badge>
        </div>

        {/* Right section with user name, notifications, settings, theme switch, and logout */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-sm text-muted-foreground hidden sm:block">خوش آمدید، {currentUser.name}</div>
          <Avatar className="size-8">
            <AvatarImage src={currentUser.avatarUrl || "/placeholder-user.jpg"} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name?.slice(0,1) || "U"}</AvatarFallback>
          </Avatar>

          {/* Alarm Settings (root-only) */}
          {currentUser.role === "root" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="تنظیمات آلارم صوتی">
                  <Bell className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" dir="rtl">
                <DialogHeader>
                  <DialogTitle>تنظیمات آلارم صوتی</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* فعال/غیرفعال کردن آلارم */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alarm-toggle">آلارم صوتی</Label>
                    <Switch
                      id="alarm-toggle"
                      checked={alarmEnabled}
                      onCheckedChange={(checked) => {
                        setAlarmEnabled(!!checked)
                        if (checked) alarmManager.enable()
                        else alarmManager.disable()
                        try { localStorage.setItem("alarmEnabled", String(!!checked)) } catch {}
                        try { window.dispatchEvent(new CustomEvent("alarm:settings_changed", { detail: { enabled: !!checked } })) } catch {}
                      }}
                    />
                  </div>

                  {/* دامنه آلارم */}
                  <div className="flex items-center justify-between gap-3">
                    <Label>دامنه</Label>
                    <Select
                      value={alarmScope}
                      onValueChange={(val) => {
                        setAlarmScope(val)
                        try { localStorage.setItem("alarmScope", val) } catch {}
                        try { window.dispatchEvent(new CustomEvent("alarm:settings_changed", { detail: { scope: val } })) } catch {}
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="دامنه آلارم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه هشدارها</SelectItem>
                        <SelectItem value="tasks">فقط تسک‌های من</SelectItem>
                        <SelectItem value="selected-alerts">هشدارهای انتخاب‌شده</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* بلندی صدا */}
                  <div className="space-y-2">
                    <Label>بلندی صدا</Label>
                    <Slider
                      value={[alarmVolume]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={(vals) => {
                        const v = Array.isArray(vals) ? Number(vals[0]) : 0
                        setAlarmVolume(v)
                        alarmManager.setVolume(v)
                        try { localStorage.setItem("alarmVolume", String(v)) } catch {}
                        try { window.dispatchEvent(new CustomEvent("alarm:settings_changed", { detail: { volume: v } })) } catch {}
                      }}
                    />
                  </div>

                  {/* سکوت موقت */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {alarmMuted ? "در سکوت موقت هستید" : "فعلاً سکوت فعال نیست"}
                    </div>
                    <Button variant="outline" onClick={() => {
                      alarmManager.muteFor(10 * 60 * 1000)
                      try { window.dispatchEvent(new CustomEvent("alarm:settings_changed", { detail: { muted: true } })) } catch {}
                    }}>
                      سکوت ۱۰ دقیقه‌ای
                    </Button>
                  </div>

                  {/* نکته مرورگر */}
                  <div className="text-xs text-muted-foreground">
                    نکته: به‌دلیل سیاست مرورگرها، برای پخش خودکار نیاز به یک تعامل کاربر است.
                  </div>

                  {/* دلایل فعلی (زنده) */}
                  <div className="mt-4 space-y-2">
                    <div className="font-medium">دلایل فعلی پخش صدا:</div>
                    {alarmEnabled && !alarmMuted ? (
                      <div className="space-y-2">
                        {activeAlertsForAlarm.length > 0 && (
                          <div>
                            <div className="text-sm text-muted-foreground">هشدارها ({activeAlertsForAlarm.length}):</div>
                            <ul className="list-disc pr-4">
                              {activeAlertsForAlarm.slice(0, 5).map((a) => (
                                <li key={a.id}>
                                  {a.type === "low_fuel" ? "کاهش سوخت" : a.type === "low_water" ? "کاهش آب" : a.type === "maintenance" ? "تعمیرات" : "هشدار"}
                                  {a.tankId ? ` • مخزن` : a.generatorId ? ` • ژنراتور` : ""}
                                  {a.message ? ` — ${a.message}` : ""}
                                </li>
                              ))}
                              {activeAlertsForAlarm.length > 5 && (
                                <li className="text-muted-foreground">{activeAlertsForAlarm.length - 5} مورد دیگر…</li>
                              )}
                            </ul>
                          </div>
                        )}
                        {activeTasksForAlarm.length > 0 && (
                          <div>
                            <div className="text-sm text-muted-foreground">تسک‌ها ({activeTasksForAlarm.length}):</div>
                            <ul className="list-disc pr-4">
                              {activeTasksForAlarm.slice(0, 5).map((t) => (
                                <li key={t.id}>{t.title} — {t.priority}</li>
                              ))}
                              {activeTasksForAlarm.length > 5 && (
                                <li className="text-muted-foreground">{activeTasksForAlarm.length - 5} مورد دیگر…</li>
                              )}
                            </ul>
                          </div>
                        )}
                        {activeAlertsForAlarm.length === 0 && activeTasksForAlarm.length === 0 && (
                          <div className="text-muted-foreground">در حال حاضر مورد فعالی وجود ندارد.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">{alarmMuted ? "در سکوت موقت هستید." : "آلارم خاموش است."}</div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Install App button always visible; prompt if available, otherwise show instructions */}
          {!isStandalone && !installed && (
            <Dialog open={installDialogOpen && !canInstall} onOpenChange={setInstallDialogOpen}>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    if (canInstall && installPromptEvent) {
                      await installPromptEvent.prompt()
                      const choice = await installPromptEvent.userChoice
                      if (choice && choice.outcome === 'accepted') {
                        setCanInstall(false)
                      }
                    } else {
                      setInstallDialogOpen(true)
                    }
                  } catch (err) {
                    console.log('install error', err)
                  }
                }}
              >
                نصب اپلیکیشن
              </Button>
              {!canInstall && (
                <DialogContent className="max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>نصب اپلیکیشن</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium">اندروید (Chrome)</div>
                      <div className="text-muted-foreground">منوی مرورگر → Add to Home screen</div>
                    </div>
                    <div>
                      <div className="font-medium">iOS (Safari)</div>
                      <div className="text-muted-foreground">دکمه Share → Add to Home Screen</div>
                    </div>
                    <div>
                      <div className="font-medium">دسکتاپ (Chrome/Edge)</div>
                      <div className="text-muted-foreground">آیکون نصب کنار نوار آدرس یا منو → Install App</div>
                    </div>
                    <div className="text-xs text-muted-foreground">اگر اینجا دکمه نصب مستقیم ندارید، مرورگر شما از رویداد نصب خودکار پشتیبانی نمی‌کند؛ از روش‌های بالا نصب را انجام دهید.</div>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          )}

          {/* Theme Toggle Button */}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Profile Management Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-auto h-[100dvh] sm:h-auto rounded-none sm:rounded-lg p-4 sm:p-6 overflow-y-auto top-0 left-0 translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" dir="rtl">
              <DialogHeader>
                <DialogTitle>پروفایل کاربری</DialogTitle>
              </DialogHeader>
              <ProfileManagement user={currentUser} onUserUpdate={handleUserUpdate} />
            </DialogContent>
          </Dialog>

          {/* Logout Icon */}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
