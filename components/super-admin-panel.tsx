// app/components/super-admin-panel.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, Bell, Database } from "lucide-react"
import { AuthService } from "@/lib/auth"
import type { User, Tank, Generator, WeeklyTask, SystemSettings, Role } from "@/lib/types"
import { WeeklyPlanningPanel } from "@/components/weekly-planning-panel"
import { DynamicManagementPanel } from "@/components/dynamic-management-panel"
import { UserManagementPanel } from "@/components/user-management-panel"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import DatePicker from "react-multi-date-picker"
import persian from "react-date-object/calendars/persian"
import persian_fa from "react-date-object/locales/persian_fa"
import TimePicker from "react-multi-date-picker/plugins/time_picker"

interface SuperAdminPanelProps {
  currentUser: User
  tanks?: Tank[]
  generators?: Generator[]
  onRefresh?: () => void
}

interface AdminSystemSettings {
  lowAlertThreshold: number
  criticalAlertThreshold: number
  autoUpdateInterval: number
  maintenanceMode: boolean
  dataRetentionDays: number
}

export function SuperAdminPanel({ currentUser, tanks = [], generators = [], onRefresh }: SuperAdminPanelProps) {
  const auth = AuthService.getInstance()
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    dueDate: "",
  })

  const [systemSettings, setSystemSettings] = useState<AdminSystemSettings>({
    lowAlertThreshold: 20,
    criticalAlertThreshold: 10,
    autoUpdateInterval: 5,
    maintenanceMode: false,
    dataRetentionDays: 30,
  })

  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([])
  // const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("system")
  const { toast } = useToast()

  // RBAC: دسترسی تب‌ها بر اساس نقش
  const ROLE_LABELS: Record<string, string> = {
    root: "مدیر کل سیستم",
    manager: "مدیر",
    supervisor: "ناظر",
    operator: "اپراتور",
    monitor: "نمایشگر",
  }
  const TAB_LABELS: Record<string, string> = {
    dashboard: "داشبورد",
    analytics: "تحلیل",
    reports: "گزارش‌ها",
    planning: "برنامه‌ریزی",
    alerts: "هشدارها",
  }
  const AVAILABLE_TABS: string[] = [
    "dashboard",
    "analytics",
    "reports",
    "planning",
    "alerts",
  ]
  const ADMIN_SUBTAB_LABELS: Record<string, string> = {
    system: "تنظیمات سیستم",
    users: "مدیریت کاربران",
    assets: "مدیریت تجهیزات",
    tasks: "مدیریت وظایف",
    planning: "برنامه‌ریزی هفتگی",
  }
  const ADMIN_SUBTABS: string[] = ["system","users","assets","tasks","planning"]
  const [tabAccessByRole, setTabAccessByRole] = useState<Record<string, string[]>>({
    root: ["*"],
    manager: ["dashboard","analytics","reports","planning","alerts"],
    supervisor: ["dashboard","analytics","reports","planning","alerts"],
    operator: ["dashboard","planning","alerts"],
    monitor: ["dashboard","reports","analytics","alerts"],
  })
  const [adminSubAccessByRole, setAdminSubAccessByRole] = useState<Record<string, string[]>>({
    root: ["*"],
    manager: ["admin:tasks"],
    supervisor: [],
    operator: [],
    monitor: [],
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    await Promise.all([
      loadUsers(),
      loadWeeklyTasks(),
      loadSystemSettings()
    ])
  }

  // const refreshData = async () => {
  //   setRefreshing(true)
  //   await loadInitialData()
  //   setRefreshing(false)
  //   onRefresh?.()
  // }

  const loadSystemSettings = async () => {
    try {
      const response = await apiClient.getSystemSettings()
      if (response.settings) {
        const serverSettings = response.settings
        setSystemSettings({
          lowAlertThreshold: serverSettings.lowAlertThreshold ?? 20,
          criticalAlertThreshold: serverSettings.criticalAlertThreshold ?? 10,
          autoUpdateInterval: serverSettings.autoUpdateInterval ?? 5,
          maintenanceMode: serverSettings.maintenanceMode ?? false,
          dataRetentionDays: serverSettings.dataRetentionDays ?? 30,
        })
        // بارگذاری دسترسی تب‌ها و زیرتب‌های مدیریت بر اساس نقش از سرور
        if (serverSettings.tabAccessByRole && typeof serverSettings.tabAccessByRole === 'object') {
          const topMap: Record<string, string[]> = {}
          const adminMap: Record<string, string[]> = {}
          for (const [role, tabs] of Object.entries(serverSettings.tabAccessByRole)) {
            const list = Array.isArray(tabs) ? tabs : []
            if (list.some(t => t === '*')) {
              topMap[role] = ['*']
              adminMap[role] = ['*']
            } else {
              topMap[role] = list.filter(t => !String(t).startsWith('admin:'))
              adminMap[role] = list.filter(t => String(t).startsWith('admin:'))
            }
          }
          setTabAccessByRole(prev => ({ ...prev, ...topMap }))
          setAdminSubAccessByRole(prev => ({ ...prev, ...adminMap }))
        }

        // انتخاب پیش‌فرض زیرتب مدیریت مجاز
        const allowed = ADMIN_SUBTABS.find(st => auth.canAccessTab(`admin:${st}`))
        if (allowed && !auth.canAccessTab(`admin:${activeTab}`)) {
          setActiveTab(allowed)
        }
      }
    } catch (error) {
      console.error("Failed to load system settings:", error)
    }
  }

  const loadWeeklyTasks = async () => {
  try {
    const response = await apiClient.getWeeklyTasks()
    if (response.tasks) {
      setWeeklyTasks(response.tasks)
    }
  } catch (error) {
    console.error('Failed to load weekly tasks:', error)
  }
}

  const loadUsers = async () => {
    try {
      const response = await apiClient.getUsers()
      setUsers(response.users)
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      const settingsToSave: Partial<SystemSettings> = {
        lowAlertThreshold: systemSettings.lowAlertThreshold,
        criticalAlertThreshold: systemSettings.criticalAlertThreshold,
        autoUpdateInterval: systemSettings.autoUpdateInterval,
        maintenanceMode: systemSettings.maintenanceMode,
        dataRetentionDays: systemSettings.dataRetentionDays,
        // ذخیره نگاشت دسترسی ترکیبی: تب‌های اصلی + زیرتب‌های مدیریت
        tabAccessByRole: Object.fromEntries(
          Object.keys(ROLE_LABELS).map((role) => {
            const top = new Set(tabAccessByRole[role] ?? [])
            const adminSubs = new Set(adminSubAccessByRole[role] ?? [])
            // اگر هر کدام شامل * باشد، نقش دسترسی کامل دارد
            if (top.has('*') || adminSubs.has('*')) {
              return [role, ['*']]
            }
            const merged = new Set<string>()
            Array.from(top).forEach(t => merged.add(t))
            Array.from(adminSubs).forEach(t => {
              // اطمینان از پیشوند admin:
              const val = String(t).startsWith('admin:') ? String(t) : `admin:${String(t)}`
              merged.add(val)
            })
            return [role, Array.from(merged)]
          })
        ) as Record<Role, string[]>
      }
      
      await apiClient.updateSystemSettings(settingsToSave)
      toast({ title: "موفقیت", description: "تنظیمات با موفقیت ذخیره شد", variant: "success" })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({ title: "خطا", description: "خطا در ذخیره تنظیمات", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const toggleRoleTab = (role: string, tab: string, checked: boolean) => {
    setTabAccessByRole(prev => {
      const current = new Set(prev[role] ?? [])
      if (checked) {
        current.add(tab)
      } else {
        current.delete(tab)
      }
      return { ...prev, [role]: Array.from(current) }
    })
  }

  const toggleRoleAdminSub = (role: string, subtab: string, checked: boolean) => {
    setAdminSubAccessByRole(prev => {
      const current = new Set(prev[role] ?? [])
      const key = `admin:${subtab}`
      if (checked) {
        current.add(key)
      } else {
        current.delete(key)
      }
      return { ...prev, [role]: Array.from(current) }
    })
  }

  const handleSettingChange = (key: keyof AdminSystemSettings, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleCreateTask = async () => {
    try {
      if (!newTask.title || !newTask.assignedTo) {
        toast({ title: "خطا", description: "لطفاً عنوان و کاربر مسئول را وارد کنید", variant: "destructive" })
        return
      }

      await apiClient.createTask({
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedBy: currentUser.id,
        priority: newTask.priority,
        status: "pending",
        dueDate: newTask.dueDate
      })

      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
      })

      toast({ title: "موفقیت", description: "وظیفه با موفقیت ایجاد شد", variant: "success" })
      onRefresh?.()
    } catch (error) {
      console.error("Failed to create task:", error)
      toast({ title: "خطا", description: "خطا در ایجاد وظیفه", variant: "destructive" })
    }
  }

  const handleCreateWeeklyTask = async (task: Omit<WeeklyTask, "id">) => {
    // Optimistic add
    const tempId = `temp-${Math.random().toString(36).slice(2)}`
    const tempTask: WeeklyTask = { id: tempId, ...task }
    setWeeklyTasks((prev) => [...prev, tempTask])

    try {
      const response = await apiClient.createWeeklyTask(task)
      if (response.task) {
        setWeeklyTasks((prev) => prev.map((t) => (t.id === tempId ? response.task : t)))
        toast({ title: "موفقیت", description: "وظیفه هفتگی با موفقیت ایجاد شد", variant: "success" })
      } else {
        await loadWeeklyTasks()
      }
    } catch (error) {
      console.error('Failed to create weekly task:', error)
      // rollback
      setWeeklyTasks((prev) => prev.filter((t) => t.id !== tempId))
      toast({ title: "خطا", description: "خطا در ایجاد وظیفه هفتگی", variant: "destructive" })
    }
  }

  const handleUpdateWeeklyTask = async (taskId: string, updates: Partial<WeeklyTask>) => {
    // Optimistic update
    const snapshot = weeklyTasks
    setWeeklyTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))

    try {
      const response = await apiClient.updateWeeklyTask(taskId, updates)
      if (response.task) {
        setWeeklyTasks((prev) => prev.map((t) => (t.id === taskId ? response.task : t)))
      } else {
        await loadWeeklyTasks()
      }
    } catch (error) {
      console.error("Failed to update weekly task:", error)
      setWeeklyTasks(snapshot) // rollback
      toast({ title: "خطا", description: "خطا در به‌روزرسانی وظیفه هفتگی", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold truncate">پنل مدیریت سوپر ادمین</h2>
          {/* <Badge variant="destructive">دسترسی کامل</Badge> */}
        </div>
        {/* <Button variant="outline" onClick={refreshData} disabled={refreshing} className="w-full sm:w-auto whitespace-nowrap shrink-0">
          <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
          بروزرسانی داده‌ها
        </Button> */}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile dropdown selector */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full max-w-[calc(100vw-2rem)]">
              <SelectValue placeholder="انتخاب بخش" />
            </SelectTrigger>
            <SelectContent>
              {auth.canAccessTab('admin:system') && (
                <SelectItem value="system">تنظیمات سیستم</SelectItem>
              )}
              {auth.canAccessTab('admin:users') && (
                <SelectItem value="users">مدیریت کاربران</SelectItem>
              )}
              {auth.canAccessTab('admin:assets') && (
                <SelectItem value="assets">مدیریت تجهیزات</SelectItem>
              )}
              {auth.canAccessTab('admin:tasks') && (
                <SelectItem value="tasks">مدیریت وظایف</SelectItem>
              )}
              {auth.canAccessTab('admin:planning') && (
                <SelectItem value="planning">برنامه‌ریزی هفتگی</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop tab list */}
        <TabsList className="hidden md:grid w-full grid-cols-5">
          {auth.canAccessTab('admin:system') && (
            <TabsTrigger value="system">تنظیمات سیستم</TabsTrigger>
          )}
          {auth.canAccessTab('admin:users') && (
            <TabsTrigger value="users">مدیریت کاربران</TabsTrigger>
          )}
          {auth.canAccessTab('admin:assets') && (
            <TabsTrigger value="assets">مدیریت تجهیزات</TabsTrigger>
          )}
          {auth.canAccessTab('admin:tasks') && (
            <TabsTrigger value="tasks">مدیریت وظایف</TabsTrigger>
          )}
          {auth.canAccessTab('admin:planning') && (
            <TabsTrigger value="planning">برنامه‌ریزی هفتگی</TabsTrigger>
          )}
        </TabsList>
        {auth.canAccessTab('admin:system') && (
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                تنظیمات سیستم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* تنظیمات هشدارها */}
              <div className="space-y-4">
                <h3 className="font-semibold">تنظیمات هشدارها</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>حد هشدار پایین (درصد)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100"
                      value={systemSettings.lowAlertThreshold}
                      onChange={(e) => handleSettingChange('lowAlertThreshold', parseInt(e.target.value) || 20)}
                    />
                  </div>
                  <div>
                    <Label>حد هشدار بحرانی (درصد)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100"
                      value={systemSettings.criticalAlertThreshold}
                      onChange={(e) => handleSettingChange('criticalAlertThreshold', parseInt(e.target.value) || 10)}
                    />
                  </div>
                </div>
              </div>

              {/* تنظیمات به‌روزرسانی */}
              <div className="space-y-4">
                <h3 className="font-semibold">تنظیمات به‌روزرسانی</h3>
                <div>
                  <Label>فاصله زمانی بروزرسانی خودکار (دقیقه)</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="60"
                    value={systemSettings.autoUpdateInterval}
                    onChange={(e) => handleSettingChange('autoUpdateInterval', parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              {/* تنظیمات نگهداری داده‌ها */}
              <div className="space-y-4">
                <h3 className="font-semibold">نگهداری داده‌ها</h3>
                <div>
                  <Label>مدت نگهداری داده‌های تاریخی (روز)</Label>
                  <Input 
                    type="number" 
                    min="7" 
                    max="365"
                    value={systemSettings.dataRetentionDays}
                    onChange={(e) => handleSettingChange('dataRetentionDays', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              {/* تنظیمات حالت نگهداری */}
              <div className="space-y-4">
                <h3 className="font-semibold">حالت سیستم</h3>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    checked={systemSettings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="maintenanceMode">حالت نگهداری سیستم</Label>
                </div>
                {systemSettings.maintenanceMode && (
                  <div className="bg-yellow-100 p-3 rounded-md text-yellow-800 text-sm">
                    در حالت نگهداری، برخی قابلیت‌های سیستم ممکن است غیرفعال شوند.
                  </div>
                )}
              </div>

              {/* دسترسی تب‌ها بر اساس نقش */}
              <div className="space-y-4">
                <h3 className="font-semibold">دسترسی تب‌ها بر اساس نقش</h3>
                <div className="space-y-3">
                  {Object.keys(ROLE_LABELS).map((role) => (
                    <div key={role} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ROLE_LABELS[role]}</span>
                        {role === 'root' && (
                          <span className="text-xs text-muted-foreground">دسترسی کامل به همه تب‌ها</span>
                        )}
                      </div>
                      {role !== 'root' && (
                        <div className="flex flex-wrap gap-4">
                          {AVAILABLE_TABS.map((tab) => (
                            <label key={`${role}-${tab}`} className="flex items-center gap-2">
                              <Checkbox
                                checked={Boolean(tabAccessByRole[role]?.includes(tab))}
                                onCheckedChange={(checked) => toggleRoleTab(role, tab, !!checked)}
                                aria-label={`اجازه دسترسی به تب ${TAB_LABELS[tab]}`}
                              />
                              <span className="text-sm">{TAB_LABELS[tab]}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* دسترسی بخش‌های تب مدیریت بر اساس نقش */}
              <div className="space-y-4">
                <h3 className="font-semibold">دسترسی بخش‌های تب مدیریت بر اساس نقش</h3>
                <div className="space-y-3">
                  {Object.keys(ROLE_LABELS).map((role) => (
                    <div key={`admin-${role}`} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ROLE_LABELS[role]}</span>
                        {role === 'root' && (
                          <span className="text-xs text-muted-foreground">دسترسی کامل به همه بخش‌های مدیریت</span>
                        )}
                      </div>
                      {role !== 'root' && (
                        <div className="flex flex-wrap gap-4">
                          {ADMIN_SUBTABS.map((sub) => (
                            <label key={`${role}-admin-${sub}`} className="flex items-center gap-2">
                              <Checkbox
                                checked={Boolean(adminSubAccessByRole[role]?.includes(`admin:${sub}`))}
                                onCheckedChange={(checked) => toggleRoleAdminSub(role, sub, !!checked)}
                                aria-label={`اجازه دسترسی به بخش مدیریت: ${ADMIN_SUBTAB_LABELS[sub]}`}
                              />
                              <span className="text-sm">{ADMIN_SUBTAB_LABELS[sub]}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  نکته: دسترسی به خود تب مدیریت از طریق انتخاب حداقل یکی از بخش‌های آن فعال می‌شود.
                </div>
              </div>

              {/* دکمه ذخیره */}
              <Button 
                onClick={handleSaveSettings} 
                className="w-full"
                disabled={loading}
              >
                {loading ? "در حال ذخیره..." : "ذخیره تنظیمات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {auth.canAccessTab('admin:users') && (
        <TabsContent value="users" className="space-y-4">
          <UserManagementPanel />
        </TabsContent>
        )}

        {auth.canAccessTab('admin:assets') && (
        <TabsContent value="assets" className="space-y-4">
          <DynamicManagementPanel
            currentUser={currentUser}
            tanks={tanks}
            generators={generators}
            onRefresh={onRefresh}
          />
        </TabsContent>
        )}

        {auth.canAccessTab('admin:tasks') && (
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ایجاد وظیفه جدید</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>عنوان وظیفه</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="مثال: بررسی سطح مخزن سوخت ۱"
                />
              </div>
              <div>
                <Label>توضیحات</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="توضیحات کامل وظیفه..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تخصیص به</Label>
                  <Select
                    value={newTask.assignedTo}
                    onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب کاربر" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>اولویت</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "critical") => 
                      setNewTask({ ...newTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">پایین</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">بالا</SelectItem>
                      <SelectItem value="critical">بحرانی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>تاریخ سررسید</Label>
                {/* تاریخ و زمان کاملاً فارسی (شمسی) */}
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD HH:mm"
                  value={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                  placeholder="انتخاب تاریخ و ساعت (شمسی)"
                  className="w-full"
                  inputClass="w-full h-10 px-3 rounded-md bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  plugins={[<TimePicker position="bottom" />]}
                  onChange={(val: any) => {
                    try {
                      // val می‌تواند DateObject یا Date باشد
                      const dateObj = Array.isArray(val) ? val[0] : val
                      const jsDate = typeof dateObj?.toDate === "function" ? dateObj.toDate() : (dateObj instanceof Date ? dateObj : undefined)
                      setNewTask({ ...newTask, dueDate: jsDate ? jsDate.toISOString() : "" })
                    } catch (e) {
                      setNewTask({ ...newTask, dueDate: "" })
                    }
                  }}
                />
              </div>
              <Button className="w-full" onClick={handleCreateTask}>
                <Bell className="h-4 w-4 ml-2" />
                ایجاد وظیفه 
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {auth.canAccessTab('admin:planning') && (
        <TabsContent value="planning" className="space-y-4">
          <WeeklyPlanningPanel
            currentUser={currentUser}
            users={users}
            weeklyTasks={weeklyTasks}
            tanks={tanks}
            generators={generators}
            onCreateTask={handleCreateWeeklyTask}
            onUpdateTask={handleUpdateWeeklyTask}
            onDeleteTask={async (taskId: string) => {
              // Optimistic remove
              const snapshot = weeklyTasks
              setWeeklyTasks(prev => prev.filter(t => t.id !== taskId))
              try {
                await apiClient.deleteWeeklyTask(taskId)
              } catch (error) {
                console.error('Failed to delete weekly task:', error)
                toast({ title: 'خطا', description: 'خطا در حذف وظیفه هفتگی', variant: 'destructive' })
              }
            }}
          />
        </TabsContent>
        )}
      </Tabs>
    </div>
  )
}