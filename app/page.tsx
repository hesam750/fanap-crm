"use client"

import { useState, useEffect } from "react"
import { EnhancedLoginForm } from "@/components/enhanced-login-form"
import { OverviewStats } from "@/components/overview-stats"
import { TankCard } from "@/components/tank-card"
import { TasksPanel } from "@/components/tasks-panel"
import { ReportsPanel } from "@/components/report/reports-panel"
import { SuperAdminPanel } from "@/components/super-admin-panel"
import { AuthService } from "@/lib/auth"
import { apiClient } from "@/lib/api-client"
import type { User, Tank, Generator, Task, Alert, Notification, WeeklyTask } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneratorCard } from "@/components/generators/generator-card"
import { AlertsPanel } from "@/components/alerts-panel"
import Analytics from "@/components/analytics"
import { WeeklyPlanningPanel } from "@/components/weekly-planning-panel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [tanks, setTanks] = useState<Tank[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [users, setUsers] = useState<User[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([])

  useEffect(() => {
    const auth = AuthService.getInstance()
    const currentUser = auth.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      auth.loadSystemSettings()
      setActiveTab(getDefaultTabForUser(auth))
      loadData()
    } else {
      setLoading(false)
    }
  }, [])

  // Subscribe to server-sent events for real-time updates
  useEffect(() => {
    if (!user) return

    const es = new EventSource('/api/events')
    const toDate = (v: any) => (v ? new Date(v) : v)

    // Task events
    es.addEventListener('task:created', (ev: MessageEvent) => {
      try {
        const task = JSON.parse(ev.data)
        task.createdAt = toDate(task.createdAt)
        task.updatedAt = toDate(task.updatedAt)
        task.dueDate = toDate(task.dueDate)
        task.completedAt = toDate(task.completedAt)
        setTasks(prev => {
          const exists = prev.some(t => String(t.id) === String(task.id))
          return exists ? prev.map(t => (String(t.id) === String(task.id) ? task : t)) : [task, ...prev]
        })
      } catch (e) {
        console.error('Failed to process task:created', e)
      }
    })

    es.addEventListener('task:updated', (ev: MessageEvent) => {
      try {
        const updated = JSON.parse(ev.data)
        updated.createdAt = toDate(updated.createdAt)
        updated.updatedAt = toDate(updated.updatedAt)
        updated.dueDate = toDate(updated.dueDate)
        updated.completedAt = toDate(updated.completedAt)
        setTasks(prev => prev.map(t => (String(t.id) === String(updated.id) ? { ...t, ...updated } : t)))
      } catch (e) {
        console.error('Failed to process task:updated', e)
      }
    })

    es.addEventListener('task:deleted', (ev: MessageEvent) => {
      try {
        const { id } = JSON.parse(ev.data)
        setTasks(prev => prev.filter(t => String(t.id) !== String(id)))
      } catch (e) {
        console.error('Failed to process task:deleted', e)
      }
    })

    // Weekly task events
    es.addEventListener('weeklyTask:created', (ev: MessageEvent) => {
      try {
        const wt = JSON.parse(ev.data)
        wt.dueDate = toDate(wt.dueDate)
        setWeeklyTasks(prev => {
          const exists = prev.some(t => String(t.id) === String(wt.id))
          return exists ? prev.map(t => (String(t.id) === String(wt.id) ? wt : t)) : [wt, ...prev]
        })
      } catch (e) {
        console.error('Failed to process weeklyTask:created', e)
      }
    })

    es.addEventListener('weeklyTask:updated', (ev: MessageEvent) => {
      try {
        const updated = JSON.parse(ev.data)
        updated.dueDate = toDate(updated.dueDate)
        setWeeklyTasks(prev => prev.map(t => (String(t.id) === String(updated.id) ? { ...t, ...updated } : t)))
      } catch (e) {
        console.error('Failed to process weeklyTask:updated', e)
      }
    })

    es.addEventListener('weeklyTask:deleted', (ev: MessageEvent) => {
      try {
        const { id } = JSON.parse(ev.data)
        setWeeklyTasks(prev => prev.filter(t => String(t.id) !== String(id)))
      } catch (e) {
        console.error('Failed to process weeklyTask:deleted', e)
      }
    })

    // Alert events
    es.addEventListener('alert:created', (ev: MessageEvent) => {
      try {
        const alert = JSON.parse(ev.data)
        alert.createdAt = toDate(alert.createdAt)
        setAlerts(prev => {
          const exists = prev.some(a => String(a.id) === String(alert.id))
          return exists ? prev.map(a => (String(a.id) === String(alert.id) ? alert : a)) : [alert, ...prev]
        })
      } catch (e) {
        console.error('Failed to process alert:created', e)
      }
    })

    es.addEventListener('alert:updated', (ev: MessageEvent) => {
      try {
        const updated = JSON.parse(ev.data)
        updated.createdAt = toDate(updated.createdAt)
        setAlerts(prev => prev.map(a => (String(a.id) === String(updated.id) ? { ...a, ...updated } : a)))
      } catch (e) {
        console.error('Failed to process alert:updated', e)
      }
    })

    es.addEventListener('alert:deleted', (ev: MessageEvent) => {
      try {
        const { id } = JSON.parse(ev.data)
        setAlerts(prev => prev.filter(a => String(a.id) !== String(id)))
      } catch (e) {
        console.error('Failed to process alert:deleted', e)
      }
    })

    es.onerror = () => {
      // Optional reconnection logic can be added here
    }

    return () => {
      es.close()
    }
  }, [user])

  // به‌روزرسانی خودکار هشدارها بدون نیاز به رفرش صفحه
  useEffect(() => {
    if (!user) return
    const intervalMs = 15000 // با وجود SSE، نرخ polling را کم می‌کنیم
    const id = setInterval(() => {
      loadAlerts()
    }, intervalMs)
    return () => clearInterval(id)
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      const [usersResponse, weeklyTasksResponse, tanksResponse, generatorsResponse, tasksResponse, alertsResponse, notificationsResponse] =
        await Promise.all([
          apiClient.getUsers(),
          apiClient.getWeeklyTasks(),
          apiClient.getTanks(),
          apiClient.getGenerators(),
          apiClient.getTasks(),
          apiClient.getAlerts(),
          apiClient.getNotifications(),
        ])

      setUsers(usersResponse.users)
      setWeeklyTasks(weeklyTasksResponse.tasks)
      setTanks(tanksResponse.tanks)
      setGenerators(generatorsResponse.generators)
      setTasks(tasksResponse.tasks)
      setAlerts(alertsResponse.alerts)
      setNotifications(notificationsResponse.notifications)
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Loaders با دامنه محدود برای جلوگیری از رفرش کلی صفحه
  const loadTanks = async () => {
    try {
      const res = await apiClient.getTanks()
      setTanks(res.tanks)
    } catch (error) {
      console.error("Failed to load tanks:", error)
    }
  }

  const loadGenerators = async () => {
    try {
      const res = await apiClient.getGenerators()
      setGenerators(res.generators)
    } catch (error) {
      console.error("Failed to load generators:", error)
    }
  }

  const loadAlerts = async () => {
    try {
      const res = await apiClient.getAlerts()
      setAlerts(res.alerts)
    } catch (error) {
      console.error("Failed to load alerts:", error)
    }
  }

  const loadTasksOnly = async () => {
    try {
      const res = await apiClient.getTasks()
      setTasks(res.tasks)
    } catch (error) {
      console.error("Failed to load tasks:", error)
    }
  }

  const loadWeeklyTasksOnly = async () => {
    try {
      const res = await apiClient.getWeeklyTasks()
      setWeeklyTasks(res.tasks)
    } catch (error) {
      console.error("Failed to load weekly tasks:", error)
    }
  }

  const handleCreateWeeklyTask = async (task: Omit<WeeklyTask, "id">) => {
    // Optimistic add without full refresh
    const tempId = `temp-${Math.random().toString(36).slice(2)}`
    const tempTask: WeeklyTask = { id: tempId, ...task }
    setWeeklyTasks((prev) => [...prev, tempTask])

    try {
      const res = await apiClient.createWeeklyTask(task)
      if (res?.task) {
        // Replace temp with server task
        setWeeklyTasks((prev) => prev.map((t) => (t.id === tempId ? res.task : t)))
      } else {
        // Fallback minimal sync
        await loadWeeklyTasksOnly()
      }
    } catch (error) {
      console.error("Failed to create weekly task:", error)
      // Rollback temp
      setWeeklyTasks((prev) => prev.filter((t) => t.id !== tempId))
    }
  }

  const handleUpdateWeeklyTask = async (taskId: string, updates: Partial<WeeklyTask>) => {
    // Optimistic update without full refresh
    const snapshot = weeklyTasks
    setWeeklyTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))
    try {
      const res = await apiClient.updateWeeklyTask(taskId, updates)
      if (res?.task) {
        setWeeklyTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)))
      } else {
        await loadWeeklyTasksOnly()
      }
    } catch (error) {
      console.error("Failed to update weekly task:", error)
      // Rollback
      setWeeklyTasks(snapshot)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    // Optimistic complete without full page refresh
    const snapshot = tasks
    const completedAt = new Date()
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "completed", completedAt } : t)))
    try {
      await apiClient.updateTask(taskId, {
        status: "completed" as const,
        completedAt,
      })
      // Minimal sync
      await loadTasksOnly()
    } catch (error) {
      console.error("Failed to complete task:", error)
      // Rollback
      setTasks(snapshot)
    }
  }

  const handleUpdateChecklist = async (taskId: string, checklistItemId: string, completed: boolean) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task?.checklist) return

    const updatedChecklist = task.checklist.map((item) =>
      item.id === checklistItemId ? { ...item, completed } : item,
    )

    // Optimistic update
    const snapshot = tasks
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, checklist: updatedChecklist } : t)))

    try {
      await apiClient.updateTask(taskId, { checklist: updatedChecklist })
      // Minimal sync
      await loadTasksOnly()
    } catch (error) {
      console.error("Failed to update checklist:", error)
      // Rollback
      setTasks(snapshot)
    }
  }

  // NEW: update a normal task (status/description)
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update
    const snapshot = tasks
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))

    try {
      await apiClient.updateTask(taskId, updates)
      // Minimal sync with server state
      await loadTasksOnly()
    } catch (error) {
      console.error("Failed to update task:", error)
      // Rollback on failure
      setTasks(snapshot)
    }
  }

  // NEW: delete a normal task (root-only in UI)
  const handleDeleteTask = async (taskId: string) => {
    // Optimistic removal
    const snapshot = tasks
    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    try {
      await apiClient.deleteTask(taskId)
      // Minimal sync with server state
      await loadTasksOnly()
    } catch (error) {
      console.error("Failed to delete task:", error)
      // Rollback on failure
      setTasks(snapshot)
    }
  }

  const handleRefreshData = async () => {
    // Minimal refresh: only reload tasks and weekly tasks to avoid heavy full data fetch
    await Promise.all([loadTasksOnly(), loadWeeklyTasksOnly()])
  }

  function handleLogin(loggedInUser: User) {
    setUser(loggedInUser)
    const auth = AuthService.getInstance()
    auth.loadSystemSettings()
    setActiveTab(getDefaultTabForUser(auth))
    // پس از ورود، داده‌ها را بارگذاری می‌کنیم
    loadData()
  }

  function handleLogout() {
    // AuthService.logout قبلا در DashboardHeader فراخوانی می‌شود
    setUser(null)
    setTanks([])
    setGenerators([])
    setTasks([])
    setAlerts([])
    setNotifications([])
    setWeeklyTasks([])
    setActiveTab("dashboard")
    setLoading(false)
  }

  async function handleTankUpdate(tankId: string, newLevel: number) {
    const snapshot = tanks
    const now = new Date()
    setTanks((prev) => prev.map((t) => (t.id === tankId ? { ...t, currentLevel: newLevel, lastUpdated: now } : t)))
    try {
      await apiClient.updateTank(tankId, { currentLevel: newLevel })
      await loadTanks()
      // در صورت صفر شدن سطح مخزن، هشدارها را بدون نیاز به رفرش صفحه به‌روز می‌کنیم
      if (newLevel <= 0) {
        await loadAlerts()
      }
    } catch (error) {
      console.error("Failed to update tank:", error)
      setTanks(snapshot)
    }
  }

  async function handleGeneratorUpdate(generatorId: string, newLevel: number) {
    const snapshot = generators
    const now = new Date()
    setGenerators((prev) => prev.map((g) => (g.id === generatorId ? { ...g, currentLevel: newLevel, lastUpdated: now } : g)))
    try {
      await apiClient.updateGenerator(generatorId, { currentLevel: newLevel })
      await loadGenerators()
    } catch (error) {
      console.error("Failed to update generator:", error)
      setGenerators(snapshot)
    }
  }

  async function handleAcknowledgeAlert(alertId: string) {
    const snapshot = alerts
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)))
    try {
      await apiClient.updateAlert(alertId, { acknowledged: true })
      await loadAlerts()
    } catch (error) {
      console.error("Failed to acknowledge alert:", error)
      setAlerts(snapshot)
    }
  }

  async function handleDismissAlert(alertId: string) {
    const snapshot = alerts
    setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    try {
      await apiClient.deleteAlert(alertId)
      await loadAlerts()
    } catch (error) {
      console.error("Failed to dismiss alert:", error)
      setAlerts(snapshot)
    }
  }

  if (!user) {
    return <EnhancedLoginForm onLogin={handleLogin} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  const auth = AuthService.getInstance()
  const unacknowledgedAlerts = alerts.filter((alert) => !alert.acknowledged)
  const unreadNotifications = notifications.filter((n) => !n.read)

  function getDefaultTabForUser(auth: AuthService) {
    const order = ["dashboard", "analytics", "reports", "planning", "alerts", "admin"]
    for (const t of order) {
      if (auth.canAccessTab(t)) return t
    }
    return "alerts"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900">
      <DashboardHeader
        user={user}
        alertCount={unacknowledgedAlerts.length}
        notificationCount={unreadNotifications.length}
        onLogout={handleLogout}
        onRefresh={handleRefreshData}
      />

      <main className="container mx-auto px-6 py-6 space-y-6">
              {auth.canAccessTab("dashboard") && (
          <AnimatePresence mode="wait">
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <OverviewStats tanks={tanks} generators={generators} alerts={alerts} />
            </motion.div>
          </AnimatePresence>
        )}

        <Card className="shadow-sm border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Mobile tab switcher */}
            <div className="md:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full max-w-full justify-between overflow-hidden truncate">
                   <SelectValue placeholder="انتخاب بخش" />
                 </SelectTrigger>
                <SelectContent className="text-right w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-auto">
                   {auth.canAccessTab("dashboard") && (
                     <SelectItem value="dashboard">داشبورد</SelectItem>
                   )}
                   {auth.canAccessTab("analytics") && (
                     <SelectItem value="analytics">تحلیل‌ها</SelectItem>
                   )}
                   {auth.canAccessTab("reports") && (
                     <SelectItem value="reports">گزارش‌ها</SelectItem>
                   )}
                   {auth.canAccessTab("planning") && (
                     <SelectItem value="planning">برنامه‌ریزی هفتگی</SelectItem>
                   )}
                   {auth.canAccessTab("alerts") && (
                     <SelectItem value="alerts">هشدارها</SelectItem>
                   )}
                   {auth.canAccessTab("admin") && (
                     <SelectItem value="admin">مدیریت</SelectItem>
                   )}
                 </SelectContent>
               </Select>
            </div>

            <div className="border-b bg-muted/30 rounded-t-lg">
              <TabsList
                className="hidden md:flex w-full h-auto p-1 bg-transparent overflow-x-auto"
              >
                {auth.canAccessTab("dashboard") && (
                  <TabsTrigger
                    value="dashboard"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    داشبورد
                    <Badge variant="outline" className="mr-2 text-xs">
                      {tanks.length + generators.length}
                    </Badge>
                  </TabsTrigger>
                )}
                {auth.canAccessTab("analytics") && (
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    تحلیل‌ها
                  </TabsTrigger>
                )}
                {auth.canAccessTab("reports") && (
                  <TabsTrigger
                    value="reports"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    گزارش‌ها
                  </TabsTrigger>
                )}
                {auth.canAccessTab("planning") && (
                  <TabsTrigger
                    value="planning"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    برنامه‌ریزی هفتگی
                  </TabsTrigger>
                )}
                {auth.canAccessTab("alerts") && (
                  <TabsTrigger
                    value="alerts"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    هشدارها
                    {unacknowledgedAlerts.length > 0 && (
                      <Badge variant="destructive" className="mr-2 text-xs">
                        {unacknowledgedAlerts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                {/* <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                >
                  ‌رسانی
                  {unreadNotifications.length > 0 && (
                    <Badge variant="secondary" className="mr-2 text-xs">
                      {unreadNotifications.length}
                    </Badge>
                  )}
                </TabsTrigger> */}
                {auth.canAccessTab("admin") && (
                  <TabsTrigger
                    value="admin"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    مدیریت
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
              {auth.canAccessTab("dashboard") && (
                  <TabsContent key="tab-dashboard" value="dashboard" className="space-y-6 mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      <div className="lg:col-span-2 space-y-6">
                        {/* مخزن سوخت */}
                        <section>
                          <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-semibold">مخازن سوخت</h2>
                            <Badge variant="outline">{tanks.filter((t) => t.type === "fuel").length} مخزن</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tanks
                              .filter((tank) => tank.type === "fuel")
                              .map((tank) => (
                                <motion.div
                                  key={`fuel-tank-${tank.id}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <TankCard tank={tank} onUpdate={handleTankUpdate} />
                                </motion.div>
                              ))}
                          </div>
                        </section>

                        <Separator />
                        {/* مخزن آب */}
                        <section>
                          <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-semibold">مخازن آب</h2>
                            <Badge variant="outline">{tanks.filter((t) => t.type === "water").length} مخزن</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tanks
                              .filter((tank) => tank.type === "water")
                              .map((tank) => (
                                <motion.div
                                  key={`water-tank-${tank.id}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <TankCard tank={tank} onUpdate={handleTankUpdate} />
                                </motion.div>
                              ))}
                          </div>
                        </section>

                        <Separator />
                        {/* ژنراتورها */}
                        <section>
                          <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-semibold">ژنراتورها</h2>
                            <Badge variant="outline">{generators.length} دستگاه</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {generators.map((generator) => (
                              <motion.div
                                key={`generator-${generator.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <GeneratorCard generator={generator} onUpdate={handleGeneratorUpdate} />
                              </motion.div>
                            ))}
                          </div>
                        </section>
                      </div>

                      <div className="space-y-6">
                      
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <TasksPanel
                            tasks={tasks}
                            onCompleteTask={handleCompleteTask}
                            onUpdateChecklist={handleUpdateChecklist}
                            onUpdateTask={handleUpdateTask}
                            onDeleteTask={handleDeleteTask}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  </TabsContent>
                )}

                {auth.canAccessTab("analytics") && (
                  <TabsContent key="tab-analytics" value="analytics" className="space-y-6 mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Analytics tanks={tanks} alerts={alerts} generators={generators} tasks={tasks}/>
                      {/* <AnalyticsCharts tanks={tanks} generators={generators} alerts={alerts} /> */}
                    </motion.div>
                  </TabsContent>
                )}

                {auth.canAccessTab("reports") && (
                  <TabsContent key="tab-reports" value="reports" className="space-y-6 mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ReportsPanel tanks={tanks} generators={generators} alerts={alerts} />
                    </motion.div>
                  </TabsContent>
                )}

                {auth.canAccessTab("planning") && (
                  <TabsContent key="tab-planning" value="planning" className="space-y-6 mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <WeeklyPlanningPanel
                        currentUser={user}
                        users={users}
                        weeklyTasks={weeklyTasks}
                        tanks={tanks}
                        generators={generators}
                        onCreateTask={handleCreateWeeklyTask}
                        onUpdateTask={handleUpdateWeeklyTask}
                        onRefresh={loadWeeklyTasksOnly}
                      />
                    </motion.div>
                  </TabsContent>
                )}
                {auth.canAccessTab("alerts") && (
                  <TabsContent key="tab-alerts" value="alerts" className="space-y-6 mt-0">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                  >
                    <AlertsPanel
                      alerts={alerts}
                      onAcknowledge={handleAcknowledgeAlert}
                      onDismiss={handleDismissAlert}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">آمار هشدارها</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 border rounded-lg text-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
                        >
                          <div className="text-2xl font-bold text-destructive">
                            {alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length}
                          </div>
                          <div className="text-sm text-muted-foreground">بحرانی</div>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 border rounded-lg text-center bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20"
                        >
                          <div className="text-2xl font-bold text-yellow-600">
                            {alerts.filter((a) => a.severity === "high" && !a.acknowledged).length}
                          </div>
                          <div className="text-sm text-muted-foreground">بالا</div>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 border rounded-lg text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
                        >
                          <div className="text-2xl font-bold text-blue-600">
                            {alerts.filter((a) => a.severity === "medium" && !a.acknowledged).length}
                          </div>
                          <div className="text-sm text-muted-foreground">متوسط</div>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 border rounded-lg text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
                        >
                          <div className="text-2xl font-bold text-green-600">
                            {alerts.filter((a) => a.acknowledged).length}
                          </div>
                          <div className="text-sm text-muted-foreground">تأیید شده</div>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                  </TabsContent>
                )}

                {auth.canAccessTab("admin") && (
                  <TabsContent key="tab-admin" value="admin" className="space-y-6 mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SuperAdminPanel
                        currentUser={user}
                        tanks={tanks}
                        generators={generators}
                        onRefresh={handleRefreshData}
                      />
                    </motion.div>
                  </TabsContent>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        </Card>
      </main>
    </div>
  )
}
