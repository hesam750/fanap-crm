/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PersianCalendarComponent } from "./persian-calendar"
import { Plus, Calendar, Users, Clock, Repeat, Edit, Save, X, Trash } from "lucide-react"
import type { WeeklyTask, User, Tank, Generator } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

interface WeeklyPlanningPanelProps {
  currentUser: User
  users: User[]
  weeklyTasks: WeeklyTask[]
  tanks: Tank[]
  generators: Generator[]
  onCreateTask?: (task: Omit<WeeklyTask, "id">) => void
  onUpdateTask?: (taskId: string, updates: Partial<WeeklyTask>) => void
  onTaskClick?: (task: WeeklyTask) => void
  onRefresh?: () => void

  onDeleteTask?: (taskId: string) => Promise<void>
}

export function WeeklyPlanningPanel({
  currentUser,
  users,
  weeklyTasks,
  tanks,
  generators,
  onCreateTask,
  onUpdateTask,
  onTaskClick,
  onRefresh,
  onDeleteTask,
}: WeeklyPlanningPanelProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<WeeklyTask | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const { toast } = useToast()
  const [editTask, setEditTask] = useState<WeeklyTask | null>(null)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: [] as string[],
    dayOfWeek: 0,
    timeSlot: "09:00",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    recurring: false,
    status: "pending" as "pending" | "in_progress" | "completed" | "cancelled",
    type: "maintenance" as "maintenance" | "fuel" | "water" | "generator" | "other",
    equipment: "",
    duration: 0,
  })

  const canManageTasks = currentUser.role === "root"
  const operatorUsers = users.filter((u) => u.role === "operator")

  // وضعیت‌های مخصوص اپراتور برای به‌روزرسانی سریع
  const [operatorStatus, setOperatorStatus] = useState<"in_progress" | "completed" | "cancelled" | "pending">("pending")
  const [operatorDescription, setOperatorDescription] = useState("")

  useEffect(() => {
    if (selectedTask) {
      const st = selectedTask.status === "pending" ? "in_progress" : selectedTask.status
      setOperatorStatus(st as "in_progress" | "completed" | "cancelled" | "pending")
      setOperatorDescription(selectedTask.description || "")
    }
  }, [selectedTask])

  const handleAddTask = (date: Date, timeSlot: string) => {
    if (!canManageTasks) return

    setSelectedDate(date)
    setSelectedTimeSlot(timeSlot)
    setNewTask({
      ...newTask,
      dayOfWeek: date.getDay() === 6 ? 0 : date.getDay() + 1,
      timeSlot,
    })
    setIsCreateDialogOpen(true)
  }

  const handleTaskClick = (task: WeeklyTask) => {
    setSelectedTask(task)
    setEditTask(task)
    setIsEditing(false)
  }

  const handleEditTask = () => {
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editTask || !onUpdateTask) return

    try {
      await onUpdateTask(editTask.id, {
        title: editTask.title,
        description: editTask.description,
        assignedTo: editTask.assignedTo,
        dayOfWeek: editTask.dayOfWeek,
        timeSlot: editTask.timeSlot,
        priority: editTask.priority,
        recurring: editTask.recurring,
        status: editTask.status,
        type: editTask.type,
        equipment: editTask.equipment,
        duration: editTask.duration,
      })

      setIsEditing(false)
      setSelectedTask(editTask)
      toast({ title: "موفقیت", description: "تغییرات با موفقیت ذخیره شد", variant: "success" })
      onRefresh?.()
    } catch (error) {
      console.error("Failed to update task:", error)
      toast({ title: "خطا", description: "خطا در به‌روزرسانی وظیفه", variant: "destructive" })
    }
  }

  const handleCancelEdit = () => {
    setEditTask(selectedTask)
    setIsEditing(false)
  }

  const handleDeleteTask = async () => {
    if (!selectedTask || !onDeleteTask) return
    const ok = window.confirm("آیا از حذف این وظیفه هفتگی مطمئن هستید؟")
    if (!ok) return
    try {
      await onDeleteTask(selectedTask.id)
      setSelectedTask(null)
      setIsEditing(false)
      toast({ title: "موفقیت", description: "وظیفه هفتگی با موفقیت حذف شد", variant: "success" })
      onRefresh?.()
    } catch (error) {
      console.error("Failed to delete weekly task:", error)
      toast({ title: "خطا", description: "خطا در حذف وظیفه هفتگی", variant: "destructive" })
    }
  }

  const handleCreateTask = () => {
    if (!onCreateTask) return

    const task: Omit<WeeklyTask, "id"> = {
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo,
      dayOfWeek: newTask.dayOfWeek,
      timeSlot: newTask.timeSlot,
      priority: newTask.priority,
      recurring: newTask.recurring,
      status: newTask.status,
      type: newTask.type,
      equipment: newTask.equipment,
      duration: newTask.duration,
    }

    onCreateTask(task)
    setIsCreateDialogOpen(false)
    setNewTask({
      title: "",
      description: "",
      assignedTo: [],
      dayOfWeek: 0,
      timeSlot: "09:00",
      priority: "medium",
      recurring: false,
      status: "pending",
      type: "maintenance",
      equipment: "",
      duration: 0,
    })
  }

  const handleAssignedUserChange = (userId: string, checked: boolean) => {
    if (checked) {
      setNewTask({
        ...newTask,
        assignedTo: [...newTask.assignedTo, userId],
      })
    } else {
      setNewTask({
        ...newTask,
        assignedTo: newTask.assignedTo.filter((id) => id !== userId),
      })
    }
  }

  const handleEditAssignedUserChange = (userId: string, checked: boolean) => {
    if (!editTask) return

    if (checked) {
      setEditTask({
        ...editTask,
        assignedTo: [...editTask.assignedTo, userId],
      })
    } else {
      setEditTask({
        ...editTask,
        assignedTo: editTask.assignedTo.filter((id) => id !== userId),
      })
    }
  }

  // ثبت تغییرات توسط اپراتور
  const handleOperatorSubmit = async () => {
    if (!selectedTask || !onUpdateTask) return
    try {
      await onUpdateTask(selectedTask.id, {
        status: operatorStatus,
        description: operatorDescription,
      })
    
      toast({ title: "موفقیت", description: "وضعیت وظیفه به‌روزرسانی شد", variant: "success" })
      onRefresh?.()
    } catch (error) {
      console.error("Failed to update operator status:", error)
      toast({ title: "خطا", description: "خطا در ثبت وضعیت توسط اپراتور", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <Calendar className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl sm:text-2xl font-bold truncate">برنامه‌ریزی هفتگی</h2>
          <Badge variant="outline">تقویم شمسی</Badge>
        </div>
        {canManageTasks && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto whitespace-nowrap shrink-0">
                <Plus className="h-4 w-4 ml-2" />
                وظیفه جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-[95vw] sm:w-auto p-4 sm:p-6 max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>ایجاد وظیفه هفتگی</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>عنوان وظیفه</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="مثال: بررسی مخازن سوخت"
                  />
                </div>

                <div>
                  <Label>توضیحات</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="توضیحات کامل وظیفه..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>روز هفته</Label>
                    <Select
                      value={newTask.dayOfWeek.toString()}
                      onValueChange={(value) => setNewTask({ ...newTask, dayOfWeek: Number.parseInt(value) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">شنبه</SelectItem>
                        <SelectItem value="1">یکشنبه</SelectItem>
                        <SelectItem value="2">دوشنبه</SelectItem>
                        <SelectItem value="3">سه‌شنبه</SelectItem>
                        <SelectItem value="4">چهارشنبه</SelectItem>
                        <SelectItem value="5">پنج‌شنبه</SelectItem>
                        <SelectItem value="6">جمعه</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>ساعت</Label>
                    <Select
                      value={newTask.timeSlot}
                      onValueChange={(value) => setNewTask({ ...newTask, timeSlot: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 17 }, (_, i) => {
                          const hour = (6 + i).toString().padStart(2, "0")
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>اولویت</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger className="w-full">
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

                <div>
                  <Label>نوع وظیفه</Label>
                  <Select
                    value={newTask.type}
                    onValueChange={(value: any) => setNewTask({ ...newTask, type: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">تعمیرات</SelectItem>
                      <SelectItem value="fuel">مخزن سوخت</SelectItem>
                      <SelectItem value="water">مخزن آب</SelectItem>
                      <SelectItem value="generator">ژنراتور</SelectItem>
                      <SelectItem value="other">سایر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>تجهیزات</Label>
                  <Input
                    value={newTask.equipment}
                    onChange={(e) => setNewTask({ ...newTask, equipment: e.target.value })}
                    placeholder="نام تجهیزات مربوطه"
                  />
                </div>

                <div>
                  <Label>مدت زمان (دقیقه)</Label>
                  <Input
                    type="number"
                    value={newTask.duration}
                    onChange={(e) => setNewTask({ ...newTask, duration: parseInt(e.target.value) || 0 })}
                    placeholder="مدت زمان مورد نیاز"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4" />
                    تخصیص به اپراتورها
                  </Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {operatorUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={user.id}
                          checked={newTask.assignedTo.includes(user.id)}
                          onCheckedChange={(checked) => handleAssignedUserChange(user.id, checked as boolean)}
                        />
                        <Label htmlFor={user.id} className="text-sm font-normal">
                          {user.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="recurring"
                    checked={newTask.recurring}
                    onCheckedChange={(checked) => setNewTask({ ...newTask, recurring: checked as boolean })}
                  />
                  <Label htmlFor="recurring" className="flex items-center gap-2 text-sm">
                    <Repeat className="h-4 w-4" />
                    تکرار هفتگی
                  </Label>
                </div>

                <Button onClick={handleCreateTask} className="w-full">
                  ایجاد وظیفه
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <PersianCalendarComponent
        weeklyTasks={weeklyTasks}
        tanks={tanks}
        generators={generators}
        onTaskClick={onTaskClick || handleTaskClick}
        onAddTask={canManageTasks ? handleAddTask : undefined}
        readOnly={!canManageTasks}
        currentUser={currentUser}
      />

      {/* Task Details Dialog با قابلیت ویرایش */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => {
          setSelectedTask(null)
          setIsEditing(false)
        }}>
          <DialogContent className="sm:max-w-md w-[95vw] sm:w-auto p-4 sm:p-6 max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {isEditing ? "ویرایش وظیفه" : "جزئیات وظیفه"}
                </DialogTitle>
                {canManageTasks && !isEditing && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditTask}>
                      <Edit className="h-4 w-4 ml-2" />
                      ویرایش
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteTask}>
                      <Trash className="h-4 w-4 ml-2" />
                      حذف
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              {isEditing ? (
                // حالت ویرایش
                <>
                  <div>
                    <Label>عنوان وظیفه</Label>
                    <Input
                      value={editTask?.title || ""}
                      onChange={(e) => setEditTask(prev => prev ? {...prev, title: e.target.value} : null)}
                      placeholder="عنوان وظیفه"
                    />
                  </div>

                  <div>
                    <Label>توضیحات</Label>
                    <Textarea
                      value={editTask?.description || ""}
                      onChange={(e) => setEditTask(prev => prev ? {...prev, description: e.target.value} : null)}
                      placeholder="توضیحات"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>اولویت</Label>
                      <Select
                        value={editTask?.priority || "medium"}
                        onValueChange={(value: "low" | "medium" | "high" | "critical") => 
                          setEditTask(prev => prev ? {...prev, priority: value} : null)
                        }
                      >
                        <SelectTrigger className="w-full">
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

                    <div>
                      <Label>وضعیت</Label>
                      <Select
                        value={editTask?.status || "pending"}
                        onValueChange={(value: "pending" | "in_progress" | "completed" | "cancelled") => 
                          setEditTask(prev => prev ? {...prev, status: value} : null)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">در انتظار</SelectItem>
                          <SelectItem value="in_progress">در حال انجام</SelectItem>
                          <SelectItem value="completed">انجام شده</SelectItem>
                          <SelectItem value="cancelled">لغو شده</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>نوع وظیفه</Label>
                    <Select
                      value={editTask?.type || "maintenance"}
                      onValueChange={(value: "maintenance" | "fuel" | "water" | "generator" | "other") => 
                        setEditTask(prev => prev ? {...prev, type: value} : null)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">تعمیرات</SelectItem>
                        <SelectItem value="fuel">مخزن سوخت</SelectItem>
                        <SelectItem value="water">مخزن آب</SelectItem>
                        <SelectItem value="generator">ژنراتور</SelectItem>
                        <SelectItem value="other">سایر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>تجهیزات</Label>
                    <Input
                      value={editTask?.equipment || ""}
                      onChange={(e) => setEditTask(prev => prev ? {...prev, equipment: e.target.value} : null)}
                      placeholder="نام تجهیزات"
                    />
                  </div>

                  <div>
                    <Label>مدت زمان (دقیقه)</Label>
                    <Input
                      type="number"
                      value={editTask?.duration || 0}
                      onChange={(e) => setEditTask(prev => prev ? {...prev, duration: parseInt(e.target.value) || 0} : null)}
                      placeholder="مدت زمان"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      تخصیص به اپراتورها
                    </Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {operatorUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={`edit-${user.id}`}
                            checked={editTask?.assignedTo.includes(user.id) || false}
                            onCheckedChange={(checked) => handleEditAssignedUserChange(user.id, checked as boolean)}
                          />
                          <Label htmlFor={`edit-${user.id}`} className="text-sm font-normal">
                            {user.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="edit-recurring"
                      checked={editTask?.recurring || false}
                      onCheckedChange={(checked) => setEditTask(prev => prev ? {...prev, recurring: checked as boolean} : null)}
                    />
                    <Label htmlFor="edit-recurring" className="flex items-center gap-2 text-sm">
                      <Repeat className="h-4 w-4" />
                      تکرار هفتگی
                    </Label>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 ml-2" />
                      لغو
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 ml-2" />
                      ذخیره تغییرات
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                // حالت نمایش
                <>
                  <div>
                    <Label>عنوان</Label>
                    <div className="p-2 bg-muted rounded font-medium">{selectedTask.title}</div>
                  </div>

                  {selectedTask.description && (
                    <div>
                      <Label>توضیحات</Label>
                      <div className="p-2 bg-muted rounded text-sm">{selectedTask.description}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>اولویت</Label>
                      <Badge variant={
                        selectedTask.priority === "critical" ? "destructive" :
                        selectedTask.priority === "high" ? "secondary" :
                        "outline"
                      }>
                        {selectedTask.priority === "critical" ? "بحرانی" :
                         selectedTask.priority === "high" ? "بالا" :
                         selectedTask.priority === "medium" ? "متوسط" : "پایین"}
                      </Badge>
                    </div>

                    <div>
                      <Label>وضعیت</Label>
                      <Badge variant={
                        selectedTask.status === "completed" ? "default" :
                        selectedTask.status === "in_progress" ? "secondary" :
                        selectedTask.status === "cancelled" ? "destructive" :
                        "outline"
                      }>
                        {selectedTask.status === "pending" ? "در انتظار" :
                         selectedTask.status === "in_progress" ? "در حال انجام" :
                         selectedTask.status === "completed" ? "انجام شده" : "لغو شده"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>نوع</Label>
                      <div className="text-sm">
                        {selectedTask.type === "maintenance" ? "تعمیرات" :
                         selectedTask.type === "fuel" ? "مخزن سوخت" :
                         selectedTask.type === "water" ? "مخزن آب" :
                         selectedTask.type === "generator" ? "ژنراتور" : "سایر"}
                      </div>
                    </div>

                    <div>
                      <Label>ساعت</Label>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>{selectedTask.timeSlot}</span>
                      </div>
                    </div>
                  </div>

                  {selectedTask.equipment && (
                    <div>
                      <Label>تجهیزات</Label>
                      <div className="text-sm">{selectedTask.equipment}</div>
                    </div>
                  )}

                  {selectedTask.duration && selectedTask.duration > 0 && (
                    <div>
                      <Label>مدت زمان</Label>
                      <div className="text-sm">{selectedTask.duration} دقیقه</div>
                    </div>
                  )}

                  <div>
                    <Label>تخصیص یافته به</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.assignedTo.map((userId) => {
                        const user = users.find((u) => u.id === userId)
                        return user ? (
                          <Badge key={userId} variant="outline">
                            {user.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>

                  {selectedTask.recurring && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Repeat className="h-4 w-4" />
                      <span>تکرار هفتگی</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>خلاصه هفته جاری</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{weeklyTasks.length}</div>
              <div className="text-sm text-muted-foreground">کل وظایف</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-red-600">
                {weeklyTasks.filter((t) => t.priority === "critical").length}
              </div>
              <div className="text-sm text-muted-foreground">بحرانی</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-orange-600">
                {weeklyTasks.filter((t) => t.priority === "high").length}
              </div>
              <div className="text-sm text-muted-foreground">اولویت بالا</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600">{weeklyTasks.filter((t) => t.recurring).length}</div>
              <div className="text-sm text-muted-foreground">تکراری</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}