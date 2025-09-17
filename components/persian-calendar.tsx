/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Plus, Wrench, Fuel, Droplets, Zap, CheckCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { PersianCalendar } from "@/lib/persian-calendar"
import type { WeeklyTask, Tank, Generator, User } from "@/lib/types"

interface PersianCalendarComponentProps {
 weeklyTasks: WeeklyTask[]
  tanks: Tank[]
  generators: Generator[]
  onTaskClick?: (task: WeeklyTask) => void
  onAddTask?: (date: Date, timeSlot: string) => void
  onCompleteTask?: (taskId: string) => void
  readOnly?: boolean
  currentUser?: User
  onRefresh?: () => void // اضافه کردن onRefresh
}

export function PersianCalendarComponent({
  weeklyTasks,
  tanks,
  generators,
  onTaskClick,
  onAddTask,
  onCompleteTask,
  readOnly = false,
  currentUser,
  onRefresh, // اضافه کردن onRefresh
}: PersianCalendarComponentProps) {
  const [currentWeek, setCurrentWeek] = useState(() => PersianCalendar.getWeekStart(new Date()))
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const weekDays = PersianCalendar.getWeekDays(currentWeek)
  const timeSlots = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00"
  ]

  const priorityColors = {
    critical: "bg-red-500 border-red-600",
    high: "bg-orange-500 border-orange-600",
    medium: "bg-yellow-900/20 border-yellow-600",
    low: "bg-green-500 border-green-600"
  }

  const statusColors = {
    pending: "bg-gray-400 border-gray-500",
    in_progress: "bg-blue-400 border-blue-500",
    completed: "bg-green-400 border-green-500",
    cancelled: "bg-red-400 border-red-500"
  }

  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek)
    prevWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(PersianCalendar.getWeekStart(prevWeek))
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek)
    nextWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(PersianCalendar.getWeekStart(nextWeek))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(PersianCalendar.getWeekStart(new Date()))
  }

  const getTasksForDayAndTime = (dayIndex: number, timeSlot: string) => {
    return weeklyTasks.filter((task) =>
      task.dayOfWeek === dayIndex &&
      task.timeSlot === timeSlot
    )
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case "maintenance":
        return <Wrench className="h-3 w-3" />
      case "fuel":
        return <Fuel className="h-3 w-3" />
      case "water":
        return <Droplets className="h-3 w-3" />
      case "generator":
        return <Zap className="h-3 w-3" />
      default:
        return <CheckCircle className="h-3 w-3" />
    }
  }

  const getTaskBadge = (task: WeeklyTask) => {
  return (
    <div
      key={task.id}
      className={`p-2 rounded text-xs cursor-pointer border-2 hover:opacity-80 transition-all ${priorityColors[task.priority as keyof typeof priorityColors]} ${statusColors[task.status as keyof typeof statusColors]} text-white`}
      onClick={() => onTaskClick?.(task)}
    >
      <div className="flex items-center gap-1 mb-1">
        {getTaskIcon(task.type || "other")}
        <span className="font-medium truncate">{task.title}</span>
      </div>

      {task.description && (
        <div className="text-xs opacity-90 mb-1 truncate">
          {task.description}
        </div>
      )}

      {task.assignedTo && task.assignedTo.length > 0 && (
        <div className="text-xs opacity-90 mb-1">
          👥 {task.assignedTo.length} نفر
        </div>
      )}

      {task.equipment && (
        <div className="text-xs opacity-90 mb-1">
          🏭 {task.equipment}
        </div>
      )}

      {task.duration && task.duration > 0 && (
        <div className="text-xs opacity-90 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {task.duration} دقیقه
        </div>
      )}

      {task.status === "completed" && task.completedBy && (
        <div className="text-xs opacity-90 mt-1 flex items-center gap-1">
          ✅ انجام شده
        </div>
      )}

      {task.status === "in_progress" && (
        <div className="text-xs opacity-90 mt-1 flex items-center gap-1">
          🟡 در حال انجام
        </div>
      )}

      {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed" && (
        <div className="text-xs opacity-90 mt-1 flex items-center gap-1 text-red-300">
          <AlertTriangle className="h-3 w-3" />
          overdue
        </div>
      )}
    </div>
  )
}

  const getMaintenanceSummary = (dayIndex: number) => {
    const dayTasks = weeklyTasks.filter(task => task.dayOfWeek === dayIndex)
    const maintenanceTasks = dayTasks.filter(task => task.type === "maintenance")
    const completed = maintenanceTasks.filter(task => task.status === "completed").length
    const inProgress = maintenanceTasks.filter(task => task.status === "in_progress").length
    const pending = maintenanceTasks.filter(task => task.status === "pending").length

    return { total: maintenanceTasks.length, completed, inProgress, pending }
  }

  return (
     <Card className="w-full" dir="rtl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            برنامه‌ریزی هفتگی نگهداری و تعمیرات
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              هفته جاری
            </Button>
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {PersianCalendar.formatPersianDate(weekDays[0], "long")} تا{" "}
          {PersianCalendar.formatPersianDate(weekDays[6], "long")}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {tanks.length}
            </div>
            <div className="text-sm text-blue-700">مخزن</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {generators.length}
            </div>
            <div className="text-sm text-green-700">ژنراتور</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {weeklyTasks.length}
            </div>
            <div className="text-sm text-orange-700">وظیفه</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {weeklyTasks.filter(t => t.status === "completed").length}
            </div>
            <div className="text-sm text-purple-700">انجام شده</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Header with days and maintenance summary */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="p-2 text-center font-medium text-sm">ساعت</div>
              {weekDays.map((day, index) => {
                const summary = getMaintenanceSummary(index)
                return (
                  <div key={index} className="p-2 text-center border rounded-lg bg-muted/50">
                    <div className="font-medium text-sm">
                      {PersianCalendar.getWeekdayName(day)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {PersianCalendar.formatPersianDate(day, "short").split("/").slice(1).join("/")}
                    </div>
                    {summary.total > 0 && (
                      <div className="text-xs mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span>✅</span>
                          <span>{summary.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🟡</span>
                          <span>{summary.inProgress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>⏰</span>
                          <span>{summary.pending}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time slots grid */}
            <div className="space-y-1">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 gap-1">
                  <div className="p-2 text-center text-sm font-medium bg-muted rounded">
                    {timeSlot}
                  </div>

                  {weekDays.map((day, dayIndex) => {
                    const tasks = getTasksForDayAndTime(dayIndex, timeSlot)
                    return (
                      <div
                        key={`${dayIndex}-${timeSlot}`}
                        className="min-h-[80px] p-1 border rounded-md bg-background hover:bg-muted/50 transition-colors relative"
                      >
                        {tasks.length > 0 ? (
                          <div className="space-y-1">
                            {tasks.map((task, index) => (
                              <div key={task.id || `task-${index}`}>
                                {getTaskBadge(task)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          !readOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-full min-h-[70px] opacity-0 hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedDay(dayIndex)
                                setSelectedTime(timeSlot)
                                onAddTask?.(day, timeSlot)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              افزودن وظیفه
                            </Button>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-3">راهنما:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">

            <div className="space-y-2">
              <span className="font-medium">اولویت:</span>
              {Object.entries(priorityColors).map(([priority, color]) => (
                <div key={priority} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${color} rounded`}></div>
                  <span>{priority === "critical" ? "بحرانی" :
                    priority === "high" ? "بالا" :
                      priority === "medium" ? "متوسط" : "پایین"}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <span className="font-medium">وضعیت:</span>
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${color} rounded`}></div>
                  <span>{status === "pending" ? "در انتظار" :
                    status === "in_progress" ? "در حال انجام" :
                      status === "completed" ? "انجام شده" : "لغو شده"}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <span className="font-medium">نوع تجهیز:</span>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span>تعمیرات</span>
              </div>
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                <span>مخزن سوخت</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                <span>مخزن آب</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>ژنراتور</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium">نمادها:</span>
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>تعداد پرسنل</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🏭</span>
                <span>تجهیز مربوطه</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>زمان مورد نیاز</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>تأخیر در انجام</span>
              </div>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  )
}