// app/components/super-admin-panel.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Bell, Database, RefreshCw } from "lucide-react"
import type { User, Tank, Generator, WeeklyTask, SystemSettings } from "@/lib/types"
import { WeeklyPlanningPanel } from "@/components/weekly-planning-panel"
import { DynamicManagementPanel } from "@/components/dynamic-management-panel"
import { UserManagementPanel } from "@/components/user-management-panel"
import { apiClient } from "@/lib/api-client"

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
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("system")

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

  const refreshData = async () => {
    setRefreshing(true)
    await loadInitialData()
    setRefreshing(false)
    onRefresh?.()
  }

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
      }
      
      await apiClient.updateSystemSettings(settingsToSave)
      alert("تنظیمات با موفقیت ذخیره شد")
    } catch (error) {
      console.error("Failed to save settings:", error)
      alert("خطا در ذخیره تنظیمات")
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: keyof AdminSystemSettings, value: any) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleCreateTask = async () => {
    try {
      if (!newTask.title || !newTask.assignedTo || !newTask.dueDate) {
        alert("لطفاً تمام فیلدهای ضروری را پر کنید")
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

      alert("وظیفه با موفقیت ایجاد شد")
      refreshData()
    } catch (error) {
      console.error("Failed to create task:", error)
      alert("خطا در ایجاد وظیفه")
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
        alert("وظیفه هفتگی با موفقیت ایجاد شد")
      } else {
        await loadWeeklyTasks()
      }
    } catch (error) {
      console.error('Failed to create weekly task:', error)
      // rollback
      setWeeklyTasks((prev) => prev.filter((t) => t.id !== tempId))
      alert("خطا در ایجاد وظیفه هفتگی")
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
      alert("خطا در به‌روزرسانی وظیفه هفتگی")
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">پنل مدیریت سوپر ادمین</h2>
          <Badge variant="destructive">دسترسی کامل</Badge>
        </div>
        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
          بروزرسانی داده‌ها
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile dropdown selector */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب بخش" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">تنظیمات سیستم</SelectItem>
              <SelectItem value="users">مدیریت کاربران</SelectItem>
              <SelectItem value="assets">مدیریت تجهیزات</SelectItem>
              <SelectItem value="tasks">مدیریت وظایف</SelectItem>
              <SelectItem value="planning">برنامه‌ریزی هفتگی</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop tab list */}
        <TabsList className="hidden md:grid w-full grid-cols-5">
          <TabsTrigger value="system">تنظیمات سیستم</TabsTrigger>
          <TabsTrigger value="users">مدیریت کاربران</TabsTrigger>
          <TabsTrigger value="assets">مدیریت تجهیزات</TabsTrigger>
          <TabsTrigger value="tasks">مدیریت وظایف</TabsTrigger>
          <TabsTrigger value="planning">برنامه‌ریزی هفتگی</TabsTrigger>
        </TabsList>
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

        <TabsContent value="users" className="space-y-4">
          <UserManagementPanel />
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <DynamicManagementPanel
            currentUser={currentUser}
            tanks={tanks}
            generators={generators}
            onRefresh={onRefresh}
          />
        </TabsContent>

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
                <Input
                  type="datetime-local"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleCreateTask}>
                <Bell className="h-4 w-4 ml-2" />
                ایجاد وظیفه و ارسال اطلاع‌رسانی
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <WeeklyPlanningPanel
            currentUser={currentUser}
            users={users}
            weeklyTasks={weeklyTasks}
            tanks={tanks}
            generators={generators}
            onCreateTask={handleCreateWeeklyTask}
            onUpdateTask={handleUpdateWeeklyTask}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}