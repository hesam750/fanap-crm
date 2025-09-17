"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, Generator, Tank, Task } from "@/lib/types"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagementKPIs } from "@/components/management-kpis"



type Props = {
  tanks: Tank[]
  alerts: Alert[]
  generators: Generator[]
  tasks: Task[]
}

const Analytics = ({ tanks, alerts, generators, tasks }: Props) => {
  // Prepare tank data for charts
  const tankLevelData = tanks.map((tank) => {
    const utilization = Math.max(0, Math.min(100, tank.currentLevel))
    const currentLevelLiters = (tank.capacity * utilization) / 100
    return {
      name: tank.name.replace("مخزن ", ""),
      currentLevel: currentLevelLiters,
      capacity: tank.capacity,
      utilization,
      type: tank.type,
      status: utilization < 20 ? "low" : utilization > 80 ? "high" : "normal",
      fill: tank.type === "fuel" ? "var(--chart-1)" : "var(--chart-2)",
    }
  })

  // Prepare generator data
  const generatorData = generators.map((gen) => ({
    name: gen.name.replace("ژنراتور ", ""),
    currentLevel: gen.currentLevel,
    capacity: gen.capacity,
    status: gen.status,
    utilization: Math.max(0, Math.min(100, gen.currentLevel)),
    efficiency: gen.status === "running" ? 85 + Math.random() * 15 : 0,
    fill:
      gen.status === "running"
        ? "var(--chart-1)"
        : gen.status === "stopped"
          ? "var(--chart-2)"
          : "var(--chart-3)",
  }))

  // Generator status distribution
  const statusCounts = generators.reduce(
    (acc, gen) => {
      acc[gen.status] = (acc[gen.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    fill:
      status === "running"
        ? "var(--chart-1)"
        : status === "stopped"
          ? "var(--chart-2)"
          : "var(--chart-3)",
  }))

  // Alert severity distribution
  const severityCounts = alerts.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const alertData = Object.entries(severityCounts).map(([severity, count]) => ({
    severity,
    count,
    fill:
      severity === "high"
        ? "var(--destructive)"
        : severity === "medium"
          ? "var(--chart-4)"
          : "var(--chart-5)",
  }))

  // Task analytics datasets
  const taskStatusCounts = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const statusFa = (s: string) =>
    s === "pending"
      ? "در انتظار"
      : s === "in_progress"
        ? "در حال انجام"
        : s === "completed"
          ? "تکمیل شده"
          : s === "cancelled"
            ? "لغو شده"
            : s

  const taskStatusData = Object.entries(taskStatusCounts).map(([status, count]) => ({
    status,
    count,
    fill:
      status === "completed"
        ? "var(--chart-1)"
        : status === "in_progress"
          ? "var(--chart-4)"
          : status === "pending"
            ? "var(--chart-2)"
            : "var(--destructive)",
  }))

  const priorityFa = (p: string) =>
    p === "critical" ? "بحرانی" : p === "high" ? "بالا" : p === "medium" ? "متوسط" : p === "low" ? "پایین" : p

  const priorityCounts = tasks.reduce(
    (acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const priorityData = Object.entries(priorityCounts).map(([priority, count]) => ({
    priority,
    count,
    fill:
      priority === "critical"
        ? "var(--destructive)"
        : priority === "high"
          ? "var(--chart-3)"
          : priority === "medium"
            ? "var(--chart-4)"
            : "var(--chart-5)",
  }))

  // Tank type distribution
  const tankTypes = tanks.reduce(
    (acc, tank) => {
      acc[tank.type] = (acc[tank.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tankTypeData = Object.entries(tankTypes).map(([type, count]) => ({
    type: type === "fuel" ? "Fuel" : "Water",
    count,
    fill: type === "fuel" ? "var(--chart-1)" : "var(--chart-2)",
  }))

  const tankRadialData = tanks
    .map((tank) => ({
      name: tank.name.replace("مخزن ", ""),
      utilization: Math.max(0, Math.min(100, tank.currentLevel)),
    }))
    .sort((a, b) => b.utilization - a.utilization)
    .map((item, index) => ({
      ...item,
      name: `${index + 1}. ${item.name}`,
      rank: index + 1,
      fill: `var(--chart-${(index % 5) + 1})`,
    }))
    .map((d) => ({ ...d, fill: d.fill }))

  return (
    <div className="space-y-6">
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="charts">نمودارها و آمار</TabsTrigger>
          <TabsTrigger value="kpis">شاخص‌های مدیریتی</TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts" className="space-y-6">
          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">کل مخازن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tanks.length}</div>
            <p className="text-xs text-muted-foreground">
              {tanks.filter((t) => t.currentLevel / t.capacity < 0.2).length} سطح پایین
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">کل ژنراتور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{generators.length}</div>
            <p className="text-xs text-muted-foreground">
              {generators.filter((g) => g.status === "running").length} در حال فعالیت
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">هشداره فعال</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.filter((a) => a.severity === "high").length} با اولویت بالا
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">سلامت سیستم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((generators.filter((g) => g.status === "running").length / generators.length) * 100)}%
            </div>
            <Progress
              value={(generators.filter((g) => g.status === "running").length / generators.length) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
   <Card>
  <CardHeader>
    <CardTitle>بررسی سطح مخازن</CardTitle>
    <CardDescription>مقایسه سطح فعلی با ظرفیت و نمایش روند تغییرات</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        currentLevel: {
          label: "سطح فعلی",
          color: "var(--chart-1)",
        },
        capacity: {
          label: "ظرفیت",
          color: "var(--chart-2)",
        },
        utilization: {
          label: "درصد استفاده",
          color: "var(--chart-3)",
        },
      }}
      className="h-[350px]"
    >
      <AreaChart data={tankLevelData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted " />
        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => [
                `${value}${name === "utilization" ? "%" : "L"}`,
                name === "currentLevel" ? "سطح فعلی" : name === "capacity" ? "ظرفیت" : "درصد استفاده",
              ]}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="capacity"
          stackId="1"
          stroke="var(--color-capacity)"
          fill="var(--color-capacity)"
          fillOpacity={0.2}
        />
        <Area
          type="monotone"
          dataKey="currentLevel"
          stackId="2"
          stroke="var(--color-currentLevel)"
          fill="var(--color-currentLevel)"
          fillOpacity={0.8}
        />
      </AreaChart>
    </ChartContainer>
  </CardContent>
</Card>


<Card>
  <CardHeader>
    <CardTitle>نشانگر استفاده از مخزن</CardTitle>
    <CardDescription>نمای دایره‌ای از استفاده ظرفیت مخزن</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        utilization: {
          label: "درصد استفاده",
          color: "var(--chart-1)",
        },
      }}
      className="h-[350px]"
    >
      <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={tankRadialData}>
        <RadialBar
          dataKey="utilization"
          cornerRadius={10}
          background
          isAnimationActive={false}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}%`, "درصد استفاده"]} />} />
        <Legend
          iconSize={8}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: "12px" }}
        />
      </RadialBarChart>
    </ChartContainer>
  </CardContent>
</Card>


<Card>
  <CardHeader>
    <CardTitle>وضعیت ژنراتور</CardTitle>
    <CardDescription>توزیع وضعیت‌های ژنراتور</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        running: {
          label: "در حال اجرا",
          color: "var(--chart-1)",
        },
        stopped: {
          label: "متوقف شده",
          color: "var(--chart-2)",
        },
        maintenance: {
          label: "در حال تعمیر و نگهداری",
          color: "var(--chart-3)",
        },
      }}
      className="h-[300px]"
    >
      <PieChart>
        <Pie
          data={statusData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ status, count }) => `${status}: ${count}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {statusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>عملکرد ژنراتور</CardTitle>
    <CardDescription>توزیع وضعیت و معیارهای بهره‌وری</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        efficiency: {
          label: "بهره‌وری %",
          color: "var(--chart-1)",
        },
        utilization: {
          label: "درصد استفاده",
          color: "var(--chart-2)",
        },
      }}
      className="h-[350px]"
    >
      <BarChart data={generatorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => [`${value}%`, name === "efficiency" ? "بهره‌وری" : "درصد استفاده"]}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="efficiency" fill="var(--color-efficiency)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="utilization" fill="var(--color-utilization)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  </CardContent>
</Card>

 <Card>
  <CardHeader>
    <CardTitle>توزیع هشدارها</CardTitle>
    <CardDescription>سطوح شدت و وضعیت پاسخ</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        high: {
          label: "اولویت بالا",
          color: "var(--destructive)",
        },
        medium: {
          label: "اولویت متوسط",
          color: "var(--chart-4)",
        },
        low: {
          label: "اولویت پایین",
          color: "var(--chart-5)",
        },
      }}
      className="h-[350px]"
    >
      <PieChart>
        <Pie data={alertData} cx="50%" cy="50%" labelLine={false} label={({ severity, count }) => `${severity}: ${count}`} outerRadius={80} fill="#8884d8" dataKey="count">
          {alertData.map((entry, index) => (
            <Cell key={`cell-alert-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>وضعیت وظایف</CardTitle>
    <CardDescription>توزیع وضعیت‌های وظایف (در انتظار، در حال انجام، تکمیل شده، لغو شده)</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        pending: { label: "در انتظار", color: "var(--chart-2)" },
        in_progress: { label: "در حال انجام", color: "var(--chart-4)" },
        completed: { label: "تکمیل شده", color: "var(--chart-1)" },
        cancelled: { label: "لغو شده", color: "var(--destructive)" },
      }}
      className="h-[300px]"
    >
      <PieChart>
        <Pie
          data={taskStatusData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ status, count }) => `${statusFa(status)}: ${count}`}
          outerRadius={80}
          dataKey="count"
        >
          {taskStatusData.map((entry, index) => (
            <Cell key={`cell-task-status-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>اولویت وظایف</CardTitle>
    <CardDescription>توزیع اولویت‌ها (پایین، متوسط، بالا، بحرانی)</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer
      config={{
        low: { label: "پایین", color: "var(--chart-5)" },
        medium: { label: "متوسط", color: "var(--chart-4)" },
        high: { label: "بالا", color: "var(--chart-3)" },
        critical: { label: "بحرانی", color: "var(--destructive)" },
      }}
      className="h-[300px]"
    >
      <PieChart>
        <Pie
          data={priorityData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ priority, count }) => `${priorityFa(priority)}: ${count}`}
          outerRadius={80}
          dataKey="count"
        >
          {priorityData.map((entry, index) => (
            <Cell key={`cell-task-priority-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  </CardContent>
</Card>

      {/* Alerts List and Additional Content remains unchanged */}
        </div>
      </TabsContent>
      
      <TabsContent value="kpis">
        <ManagementKPIs />
      </TabsContent>
    </Tabs>
  </div>
  )
}

export default Analytics
