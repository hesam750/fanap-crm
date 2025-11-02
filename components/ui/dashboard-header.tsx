"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bell, LogOut, Settings, Moon, Sun, User, Download, Menu } from "lucide-react"
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
import Link from "next/link"
import { BrandLogo } from "@/components/ui/brand-logo"
import { DrawerTrigger } from "@/components/ui/drawer"

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
  showMobileMenuTrigger?: boolean
}

export function DashboardHeader({ user, alertCount, onLogout, alerts, tasks, selectedAlertIds, alarmScope: alarmScopeProp = "all", showMobileMenuTrigger = false }: DashboardHeaderProps) {
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

  // نمایش امن نام کاربر حتی اگر نوع اشتباه باشد
  const displayName = typeof currentUser?.name === 'string' ? currentUser.name : String(currentUser?.name ?? '')

  return (
    <header dir="rtl" className="bg-blur border-b border-border px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
        {/* Left section with title and role */}
        <div className="flex items-center gap-4 flex-1">
          <BrandLogo height={28} />
          {/* Mobile hamburger moved to the right section to avoid overlap */}
          <h1 className="text-2xl font-bold">سیستم مدیریت مخازن</h1>
          <Badge variant="secondary">{AuthService.getInstance().getRoleDisplayName(currentUser.role)}</Badge>
          {AuthService.getInstance().canAccessTab("inventory") && (
            <Link href="/inventory">
              <Button variant="outline" size="sm">انبار</Button>
            </Link>
          )}
          {/* {AuthService.getInstance().canAccessTab("reports") && (
            <Link href="/reports" className="hidden sm:block">
              <Button variant="outline" size="sm">گزارشات</Button>
            </Link>
          )} */}
        </div>

        {/* Right section with user name, notifications, settings, theme switch, and logout */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Mobile hamburger moved here to avoid overlapping the title */}
          {showMobileMenuTrigger && (
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="باز کردن منو">
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
          )}
          <div className="text-sm text-muted-foreground hidden sm:block">خوش آمدید، {displayName}</div>
          <Avatar className="size-8">
            <AvatarImage src={currentUser.avatarUrl || "/placeholder-user.jpg"} alt={displayName} />
            <AvatarFallback>{typeof displayName === 'string' && displayName ? displayName.slice(0,1) : "U"}</AvatarFallback>
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
                  <div className="flex items-center justify بین gap-3">
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
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Theme switch */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "روشن" : "تاریک"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Profile management */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="پروفایل">
                <User className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-xl">
              <DialogHeader>
                <DialogTitle>تنظیمات کاربری</DialogTitle>
              </DialogHeader>
              <ProfileManagement user={currentUser} onUserUpdate={handleUserUpdate} />
            </DialogContent>
          </Dialog>

          {/* Export data */}
          <Button variant="ghost" size="icon" title="دریافت خروجی">
            <Download className="h-4 w-4" />
          </Button>

          {/* Logout */}
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" /> خروج
          </Button>
        </div>
      </div>
    </header>
  )
}
