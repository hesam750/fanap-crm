"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import type { Tank, Generator, Alert } from "@/lib/types"

interface AnalyticsChartsProps {
  tanks: Tank[]
  generators: Generator[]
  alerts: Alert[]
}

export function AnalyticsCharts({ tanks, generators, alerts }: AnalyticsChartsProps) {
  // Generate mock historical data for the last 7 days
  const generateHistoricalData = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      days.push({
        date: date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
        fuelLevel: Math.max(20, Math.min(90, 65 + (Math.random() - 0.5) * 20)),
        waterLevel: Math.max(30, Math.min(95, 75 + (Math.random() - 0.5) * 15)),
        generator1: Math.max(15, Math.min(95, 70 + (Math.random() - 0.5) * 25)),
        generator2: Math.max(15, Math.min(95, 65 + (Math.random() - 0.5) * 25)),
        generator3: Math.max(10, Math.min(95, 45 + (Math.random() - 0.5) * 30)),
        generator4: Math.max(20, Math.min(95, 80 + (Math.random() - 0.5) * 20)),
      })
    }
    return days
  }

  const historicalData = generateHistoricalData()

  // Tank distribution data
  const tankDistribution = [
    { name: "مخازن سوخت", value: tanks.filter((t) => t.type === "fuel").length, fill: "var(--chart-1)" },
    { name: "مخازن آب", value: tanks.filter((t) => t.type === "water").length, fill: "var(--chart-2)" },
  ]

  // Alert severity distribution
  const alertSeverity = [
    { name: "بحرانی", value: alerts.filter((a) => a.severity === "critical").length, fill: "var(--destructive)" },
    { name: "بالا", value: alerts.filter((a) => a.severity === "high").length, fill: "var(--chart-3)" },
    { name: "متوسط", value: alerts.filter((a) => a.severity === "medium").length, fill: "var(--chart-4)" },
    { name: "پایین", value: alerts.filter((a) => a.severity === "low").length, fill: "var(--chart-5)" },
  ].filter((item) => item.value > 0)

  // Generator status data
  const generatorStatusData = [
    {
      status: "در حال کار",
      count: generators.filter((g) => g.status === "running").length,
      fill: "var(--chart-4)",
    },
    { status: "متوقف", count: generators.filter((g) => g.status === "stopped").length, fill: "var(--chart-2)" },
    {
      status: "تعمیر",
      count: generators.filter((g) => g.status === "maintenance").length,
      fill: "var(--destructive)",
    },
  ].filter((item) => item.count > 0)

  const chartConfig = {
    fuelLevel: {
      label: "میانگین سوخت",
      color: "var(--chart-1)",
    },
    waterLevel: {
      label: "میانگین آب",
      color: "var(--chart-2)",
    },
    generator1: {
      label: "ژنراتور ۱",
      color: "var(--chart-3)",
    },
    generator2: {
      label: "ژنراتور ۲",
      color: "var(--chart-4)",
    },
    generator3: {
      label: "ژنراتور ۳",
      color: "var(--chart-5)",
    },
    generator4: {
      label: "ژنراتور ۴",
      color: "var(--chart-1)",
    },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Historical Trends */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>روند تاریخی سطح مخازن (۷ روز گذشته)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="fuelLevel"
                stroke="var(--chart-1)"
                strokeWidth={2}
                name="میانگین سوخت (%)"
              />
              <Line
                type="monotone"
                dataKey="waterLevel"
                stroke="var(--chart-2)"
                strokeWidth={2}
                name="میانگین آب (%)"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Generator Performance */}
      <Card>
        <CardHeader>
          <CardTitle>عملکرد ژنراتورها</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="generator1" fill="var(--chart-3)" name="ژنراتور ۱" />
              <Bar dataKey="generator2" fill="var(--chart-4)" name="ژنراتور ۲" />
              <Bar dataKey="generator3" fill="var(--chart-5)" name="ژنراتور ۳" />
              <Bar dataKey="generator4" fill="var(--chart-1)" name="ژنراتور ۴" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tank Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>توزیع مخازن</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <PieChart>
              <Pie
                data={tankDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {tankDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Alert Severity Distribution */}
      {alertSeverity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>توزیع شدت هشدارها</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie data={alertSeverity} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                  {alertSeverity.map((entry, index) => (
                    <Cell key={`alert-${entry.name}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Generator Status */}
      <Card>
        <CardHeader>
          <CardTitle>وضعیت ژنراتورها</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={generatorStatusData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="status" type="category" width={80} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--chart-1)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
