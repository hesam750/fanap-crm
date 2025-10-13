"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import type { Tank, Generator, Task, WeeklyTask, User } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Droplets, Fuel, Clock, AlertTriangle } from "lucide-react"

function toPersianDayIndex(jsDay: number): number {
  const map = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 } as Record<number, number>
  return map[jsDay] ?? 0
}

function sameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function getStatusText(status: Task["status"] | WeeklyTask["status"] = "pending") {
  switch (status) {
    case "pending":
      return "در انتظار"
    case "in_progress":
      return "در حال انجام"
    case "completed":
      return "تکمیل شده"
    case "cancelled":
      return "لغو شده"
    default:
      return String(status)
  }
}

function getStatusVariant(status: Task["status"] | WeeklyTask["status"] = "pending") {
  switch (status) {
    case "pending":
      return "secondary"
    case "in_progress":
      return "outline"
    case "completed":
      return "default"
    case "cancelled":
      return "destructive"
    default:
      return "secondary"
  }
}

function getPriorityText(p: Task["priority"] | WeeklyTask["priority"] = "medium") {
  switch (p) {
    case "low":
      return "کم"
    case "medium":
      return "متوسط"
    case "high":
      return "زیاد"
    case "critical":
      return "بحرانی"
    default:
      return String(p)
  }
}

// function getPriorityVariant(p: Task["priority"] | WeeklyTask["priority"] = "medium") {
//   switch (p) {
//     case "low":
//       return "outline"
//     case "medium":
//       return "secondary"
//     case "high":
//       return "default"
//     case "critical":
//       return "destructive"
//     default:
//       return "secondary"
//   }
// }

function getPriorityColor(p: Task["priority"] | WeeklyTask["priority"] = "medium") {
  switch (p) {
    case "low":
      return "from-blue-500/10 to-blue-500/5 border-blue-500/30"
    case "medium":
      return "from-yellow-500/10 to-yellow-500/5 border-yellow-500/30"
    case "high":
      return "from-orange-500/10 to-orange-500/5 border-orange-500/30"
    case "critical":
      return "from-red-500/10 to-red-500/5 border-red-500/30"
    default:
      return "from-muted/10 to-muted/5 border-muted/30"
  }
}

function getPriorityBadgeColor(p: Task["priority"] | WeeklyTask["priority"] = "medium") {
  switch (p) {
    case "low":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
    case "medium":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
    case "high":
      return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
    case "critical":
      return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
    default:
      return "bg-muted/20 text-muted-foreground border-muted/30"
  }
}

export default function MonitorPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tanks, setTanks] = useState<Tank[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tasksSectionRef = useRef<HTMLDivElement>(null)
  const statsSectionRef = useRef<HTMLDivElement>(null)
  const fuelSectionRef = useRef<HTMLDivElement>(null)
  const waterSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const auth = AuthService.getInstance()
    setCurrentUser(auth.getCurrentUser())

    const load = async () => {
      try {
        const [{ tanks }, { generators }, { tasks }, { tasks: wtasks }, { users }] = await Promise.all([
          apiClient.getTanks(),
          apiClient.getGenerators(),
          apiClient.getTasks(),
          apiClient.getWeeklyTasks(),
          apiClient.getUsers(),
        ])
        setTanks(tanks)
        setGenerators(generators)
        setTasks(tasks)
        setWeeklyTasks(wtasks)
        setUsers(users)
      } catch (e) {
        console.error("Monitor load error:", e)
      } finally {
        setLoading(false)
      }
    }

    load()

    const interval = setInterval(load, 5_000)
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)

    // Slide mode: cycle through sections; stay 20s per slide
    const SLIDE_INTERVAL_MS = 20_000
    let slideIndex = -1

    const slideTimer = setInterval(() => {
      const container = scrollContainerRef.current
      const useWindow = !container || container.scrollHeight <= container.clientHeight

      const getMaxScroll = () =>
        useWindow
          ? document.documentElement.scrollHeight - window.innerHeight
          : container!.scrollHeight - container!.clientHeight

      const computeTop = (el: HTMLElement) =>
        useWindow ? el.getBoundingClientRect().top + window.scrollY : (el as any).offsetTop

      const scrollToTop = (top: number, behavior: ScrollBehavior) =>
        useWindow ? window.scrollTo({ top, behavior }) : container!.scrollTo({ top, behavior })

      const targets: number[] = [
        0,
        statsSectionRef.current ? computeTop(statsSectionRef.current) : undefined,
        fuelSectionRef.current ? computeTop(fuelSectionRef.current) : undefined,
        waterSectionRef.current ? computeTop(waterSectionRef.current) : undefined,
        tasksSectionRef.current ? computeTop(tasksSectionRef.current) : undefined,
      ].filter((v) => typeof v === "number") as number[]

      if (targets.length === 0) return

      slideIndex = (slideIndex + 1) % targets.length
      const maxScroll = getMaxScroll()
      const targetTop = Math.min(targets[slideIndex], maxScroll)
      scrollToTop(targetTop, "smooth")
    }, SLIDE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
      clearInterval(slideTimer)
    }
  }, [])

  const today = new Date()
  const todayPersianIndex = toPersianDayIndex(today.getDay())

  const todaysWeeklyTasks = useMemo(() => {
    return weeklyTasks.filter((t) => t.dayOfWeek === todayPersianIndex)
  }, [weeklyTasks, todayPersianIndex])

  const todaysDueTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false
      const due = new Date(t.dueDate as any)
      return sameDay(due, today)
    })
  }, [tasks])

  const fuelTanks = useMemo(() => tanks.filter((t) => t.type === "fuel"), [tanks])
  const waterTanks = useMemo(() => tanks.filter((t) => t.type === "water"), [tanks])

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)

  const avgFuelLevel = avg(fuelTanks.map((t) => t.currentLevel))
  const avgWaterLevel = avg(waterTanks.map((t) => t.currentLevel))
       
  // Calculate average liters for display
  const avgFuelLiters = fuelTanks.length > 0 ? Math.round(fuelTanks.reduce((sum, t) => sum + calculateLiters(t.currentLevel, t.capacity), 0) / fuelTanks.length) : 0
  const avgWaterLiters = waterTanks.length > 0 ? Math.round(waterTanks.reduce((sum, t) => sum + calculateLiters(t.currentLevel, t.capacity), 0) / waterTanks.length) : 0
  // const runningGenerators = generators.filter((g) => g.status === "running").length
  // const totalPowerOutput = generators.reduce((sum, g) => sum + (g.powerOutput || 0), 0)

  // Helper function to calculate liters from percentage
   const calculateLiters = (percentage: number, capacity: number) => {
    return Math.round((percentage / 100) * capacity)
  }

  const fuelChartData = useMemo(
    () =>
      fuelTanks.map((t) => ({
        name: t.name,
        level: t.currentLevel,
        liters: calculateLiters(t.currentLevel, t.capacity),
        capacity: t.capacity,
        fill: t.currentLevel < 30 ? "var(--destructive)" : "var(--chart-1)",
      })),
    [fuelTanks],
  )

  const waterChartData = useMemo(
    () =>
      waterTanks.map((t) => ({
        name: t.name,
        level: t.currentLevel,
        liters: calculateLiters(t.currentLevel, t.capacity),
        capacity: t.capacity,
        fill: t.currentLevel < 30 ? "var(--destructive)" : "var(--chart-2)",
      })),
    [waterTanks],
  )

  const generatorStatusData = useMemo(() => {
    const running = generators.filter((g) => g.status === "running").length
    const stopped = generators.filter((g) => g.status === "stopped").length
    const maintenance = generators.filter((g) => g.status === "maintenance").length
    return [
      { name: "فعال", value: running, color: "var(--chart-1)" },
      { name: "خاموش", value: stopped, color: "var(--chart-3)" },
      { name: "تعمیرات", value: maintenance, color: "var(--chart-5)" },
    ].filter((item) => item.value > 0)
  }, [generators])

  const fuelChartConfig = {
    level: { label: "درصد پرشدگی (%)", color: "var(--chart-1)" },
  }

  const waterChartConfig = {
    level: { label: "درصد پرشدگی (%)", color: "var(--chart-2)" },
  }

  const userNameById = (id?: string) => {
    if (!id) return "—"
    return users.find((u) => u.id === id)?.name ?? "—"
  }

  const userNamesByIds = (ids: string[] = []) => ids.map(userNameById).filter(Boolean).join("، ") || "—"

  const todayTasksAll = useMemo(() => {
    const weekly = todaysWeeklyTasks.map((task) => {
      const [hh, mm] = (task.timeSlot || "00:00").split(":").map((v) => Number.parseInt(v, 10))
      const sortValue = hh * 60 + mm
      return {
        id: task.id,
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        status: task.status,
        assignees: userNamesByIds(task.assignedTo),
        timeText: `ساعت: ${task.timeSlot}`,
        dueText: "",
        sortValue,
        type: "weekly" as const,
      }
    })
    const regular = todaysDueTasks.map((t) => {
      const due = t.dueDate ? new Date(t.dueDate as any) : null
      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        priority: t.priority,
        status: t.status,
        assignees: t.assignedToUser?.name || userNameById(t.assignedTo),
        timeText: t.createdAt ? `ایجاد: ${new Date(t.createdAt).toLocaleString("fa-IR")}` : "",
        dueText: due ? `مهلت: ${due.toLocaleString("fa-IR")}` : "",
        sortValue: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
        type: "task" as const,
      }
    })
    const all = [...weekly, ...regular]
    return all.sort((a, b) => a.sortValue - b.sortValue)
  }, [todaysWeeklyTasks, todaysDueTasks, users])

  const criticalAlerts = useMemo(() => {
    const alerts: Array<{ type: string; message: string; severity: "warning" | "critical" }> = []

    fuelTanks.forEach((tank) => {
      if (tank.currentLevel < 20) {
        alerts.push({
          type: "fuel",
          message: `${tank.name}: سطح سوخت کمتر از 20%`,
          severity: "critical",
        })
      } else if (tank.currentLevel < 30) {
        alerts.push({
          type: "fuel",
          message: `${tank.name}: سطح سوخت کمتر از 30%`,
          severity: "warning",
        })
      }
    })

    waterTanks.forEach((tank) => {
      if (tank.currentLevel < 20) {
        alerts.push({
          type: "water",
          message: `${tank.name}: سطح آب کمتر از 20%`,
          severity: "critical",
        })
      }
    })

    return alerts
  }, [fuelTanks, waterTanks])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
          <p className="text-lg text-muted-foreground">در حال بارگذاری داده‌ها...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            مانیتورینگ سیستم
          </h1>
          <p className="text-sm text-muted-foreground">{currentUser?.name} • نمایش زنده</p>
        </div>
        <div className="text-left space-y-1">
          <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums">
            {currentTime.toLocaleTimeString("fa-IR")}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("fa-IR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {criticalAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 flex items-center gap-3 animate-pulse ${
                alert.severity === "critical"
                  ? "bg-destructive/10 border-destructive text-destructive"
                  : "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400"
              }`}
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-base">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Stats Grid */}
      <div ref={statsSectionRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="border-2 hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Fuel className="h-5 w-5 text-chart-1" />
              میانگین سطح سوخت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tabular-nums">
              {avgFuelLevel}
              <span className="text-2xl text-muted-foreground">%</span>
            </div>
            <div className="text-lg text-muted-foreground mt-2">
              میانگین: {avgFuelLiters} لیتر
            </div>
            <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${avgFuelLevel < 30 ? "bg-destructive" : "bg-chart-1"}`}
                style={{ width: `${avgFuelLevel}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Droplets className="h-5 w-5 text-chart-2" />
              میانگین سطح آب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tabular-nums">
              {avgWaterLevel}
              <span className="text-2xl text-muted-foreground">%</span>
            </div>
            <div className="text-lg text-muted-foreground mt-2">
              میانگین: {avgWaterLiters} لیتر
            </div>
            <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${avgWaterLevel < 30 ? "bg-destructive" : "bg-chart-2"}`}
                style={{ width: `${avgWaterLevel}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section (full-width) */}
      <div className="space-y-6 mb-6">
        {/* Fuel Tanks Chart */}
        <Card ref={fuelSectionRef} className="border-2 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Fuel className="h-6 w-6 text-chart-1" />
              نمودار مخازن سوخت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fuelChartConfig} className="h-[400px]">
              <BarChart data={fuelChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={0} tickMargin={12} height={60} tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: "درصد پرشدگی", angle: -90, position: "insideLeft" }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />} 
                  formatter={(value: any, name: any, props: any) => {
                    const data = props.payload
                    return [
                      [`${value}%`, "درصد"],
                      [`${data.liters} لیتر`, "حجم"],
                      [`${data.capacity} لیتر`, "ظرفیت کل"]
                    ]
                  }} 
                />
                <Bar dataKey="level" radius={[8, 8, 0, 0]} name="سطح سوخت (%)" fill="var(--color-level)">
                  {fuelChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="level" position="top" formatter={(v: any) => `${v}%`} style={{ fill: "var(--foreground)", fontSize: 12 }} />
                </Bar>
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
            <div className="text-xs text-muted-foreground pt-2 text-center">درصد پرشدگی</div>
          </CardContent>
        </Card>

        {/* Water Tanks Chart */}
        <Card ref={waterSectionRef} className="border-2 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Droplets className="h-6 w-6 text-chart-2" />
              نمودار مخازن آب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={waterChartConfig} className="h-[400px]">
              <BarChart data={waterChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={0} tickMargin={12} height={60} tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: "درصد پرشدگی", angle: -90, position: "insideLeft" }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />} 
                  formatter={(value: any, name: any, props: any) => {
                    const data = props.payload
                    return [
                      [`${value}%`, "درصد"],
                      [`${data.liters} لیتر`, "حجم"],
                      [`${data.capacity} لیتر`, "ظرفیت کل"]
                    ]
                  }} 
                />
                <Bar dataKey="level" radius={[8, 8, 0, 0]} name="سطح آب (%)" fill="var(--color-level)">
                  {waterChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="level" position="top" formatter={(v: any) => `${v}%`} style={{ fill: "var(--foreground)", fontSize: 12 }} />
                </Bar>
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
            <div className="text-xs text-muted-foreground pt-2 text-center">درصد پرشدگی</div>
          </CardContent>
        </Card>
      </div>

      {/* Anchor for Tasks Section (used by auto-scroll pause) */}
      <div ref={tasksSectionRef} />

      {/* Tasks Section */}
      <Card className="border-2 bg-gradient-to-br from-card to-card/50 backdrop-blur mb-6">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Clock className="h-7 w-7 text-primary" />
            تسک‌های امروز
            <Badge variant="secondary" className="mr-auto text-base px-3 py-1">
              {todayTasksAll.length} تسک
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTasksAll.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                هیچ تسکی برای امروز ثبت نشده است.
              </div>
            )}
            {todayTasksAll.map((item) => (
              <Card
                key={`${item.type}-${item.id}`}
                className={`border-2 bg-gradient-to-br ${getPriorityColor(item.priority)} hover:shadow-lg transition-all hover:scale-[1.02]`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold leading-tight flex-1">{item.title}</CardTitle>
                    <Badge className={`${getPriorityBadgeColor(item.priority)} text-xs px-2 py-1 border`}>
                      {getPriorityText(item.priority)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">وضعیت:</span>
                    <Badge variant={getStatusVariant(item.status)} className="text-xs">
                      {getStatusText(item.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <span className="font-medium whitespace-nowrap">تخصیص:</span>
                      <span className="truncate">{item.assignees}</span>
                    </div>
                    {item.timeText && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{item.timeText}</span>
                      </div>
                    )}
                    {item.dueText && <div className="truncate">{item.dueText}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
