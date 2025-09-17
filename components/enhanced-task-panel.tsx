"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, Clock, CheckCircle, AlertCircle, FileText } from "lucide-react"
import type { Task, ChecklistItem } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { apiClient } from "@/lib/api-client"

interface EnhancedTaskPanelProps {
  onRefresh?: () => void
}

export function EnhancedTaskPanel({ onRefresh }: EnhancedTaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [reportText, setReportText] = useState("")
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<ChecklistItem | null>(null)

  const auth = AuthService.getInstance()
  const currentUser = auth.getCurrentUser()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response =
        currentUser?.role === "operator" ? await apiClient.getTasks(currentUser.id) : await apiClient.getTasks()
      setTasks(response.tasks)
    } catch (error) {
      console.error("Failed to load tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await apiClient.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
      })
      await loadTasks()
      onRefresh?.()
    } catch (error) {
      console.error("Failed to complete task:", error)
    }
  }

  const handleUpdateChecklist = async (taskId: string, checklistItemId: string, completed: boolean) => {
    try {
      const task = tasks.find((t) => t.id === taskId)
      if (!task?.checklist) return

      const updatedChecklist = task.checklist.map((item) =>
        item.id === checklistItemId ? { ...item, completed } : item,
      )

      await apiClient.updateTask(taskId, { checklist: updatedChecklist })
      await loadTasks()
    } catch (error) {
      console.error("Failed to update checklist:", error)
    }
  }

  const handleSaveReport = async () => {
    if (!selectedTask || !selectedChecklistItem || !reportText.trim()) return

    try {
      const updatedChecklist =
        selectedTask.checklist?.map((item) =>
          item.id === selectedChecklistItem.id ? { ...item, report: reportText } : item,
        ) || []

      await apiClient.updateTask(selectedTask.id, { checklist: updatedChecklist })
      await loadTasks()
      setReportText("")
      setSelectedChecklistItem(null)
      setSelectedTask(null)
    } catch (error) {
      console.error("Failed to save report:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "critical":
        return "بحرانی"
      case "high":
        return "بالا"
      case "medium":
        return "متوسط"
      case "low":
        return "پایین"
      default:
        return priority
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "pending":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "تکمیل شده"
      case "in-progress":
        return "در حال انجام"
      case "pending":
        return "در انتظار"
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "in-progress":
        return <Clock className="h-4 w-4" />
      case "pending":
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const pendingTasks = tasks.filter((task) => task.status !== "completed")
  const completedTasks = tasks.filter((task) => task.status === "completed")

  if (loading) {
    return <div className="flex justify-center p-8">در حال بارگذاری...</div>
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            وظایف من
            {pendingTasks.length > 0 && <Badge variant="secondary">{pendingTasks.length}</Badge>}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                در انتظار
                {pendingTasks.length > 0 && (
                  <Badge variant="secondary" className="mr-2">
                    {pendingTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                تکمیل شده
                {completedTasks.length > 0 && (
                  <Badge variant="outline" className="mr-2">
                    {completedTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <ClipboardList className="h-12 w-12 mx-auto mb-2" />
                  <p>هیچ وظیفه در انتظاری وجود ندارد</p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={getPriorityColor(task.priority)}>{getPriorityText(task.priority)}</Badge>
                        <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          {getStatusText(task.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <div>مهلت: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fa-IR") : "ندارد"}</div>
                      <div>ایجاد شده: {new Date(task.createdAt).toLocaleDateString("fa-IR")}</div>
                    </div>

                    {task.checklist && task.checklist.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">چک‌لیست:</h5>
                        {task.checklist.map((item) => (
                          <div key={item.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={item.id}
                                checked={item.completed}
                                onCheckedChange={(checked) =>
                                  handleUpdateChecklist(task.id, item.id, checked as boolean)
                                }
                                disabled={task.assignedTo !== currentUser?.id}
                              />
                              <label
                                htmlFor={item.id}
                                className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                              >
                                {item.text}
                              </label>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTask(task)
                                      setSelectedChecklistItem(item)
                                      setReportText(item.report || "")
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                    {item.report ? "ویرایش گزارش" : "افزودن گزارش"}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent dir="rtl">
                                  <DialogHeader>
                                    <DialogTitle>گزارش برای: {item.text}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea
                                      value={reportText}
                                      onChange={(e) => setReportText(e.target.value)}
                                      placeholder="گزارش خود را اینجا بنویسید..."
                                      rows={6}
                                    />
                                    <div className="flex gap-2">
                                      <Button onClick={handleSaveReport} className="flex-1">
                                        ذخیره گزارش
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setReportText("")
                                          setSelectedChecklistItem(null)
                                          setSelectedTask(null)
                                        }}
                                        className="flex-1"
                                      >
                                        انصراف
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            {item.report && (
                              <div className="mr-6 p-2 bg-muted rounded text-sm">
                                <strong>گزارش:</strong> {item.report}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {task.assignedTo === currentUser?.id && task.status !== "completed" && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={task.checklist?.some((item) => !item.completed)}
                      >
                        تکمیل وظیفه
                      </Button>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                  <p>هیچ وظیفه تکمیل شده‌ای وجود ندارد</p>
                </div>
              ) : (
                completedTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg space-y-3 opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <div>
                        تکمیل شده:{" "}
                        {task.completedAt ? new Date(task.completedAt).toLocaleDateString("fa-IR") : "نامشخص"}
                      </div>
                    </div>

                    {task.checklist && task.checklist.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">چک‌لیست و گزارش‌ها:</h5>
                        {task.checklist.map((item) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{item.text}</span>
                            </div>
                            {item.report && (
                              <div className="mr-6 p-2 bg-muted rounded text-sm">
                                <strong>گزارش:</strong> {item.report}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
