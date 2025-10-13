"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList, Clock, CheckCircle, AlertCircle } from "lucide-react"
import type { Task } from "@/lib/types"
import { AuthService } from "@/lib/auth"

  interface TasksPanelProps {
    tasks: Task[]
    onCompleteTask?: (taskId: string) => void
    onUpdateChecklist?: (taskId: string, checklistItemId: string, completed: boolean) => void
    // New: allow updating a task (status/description)
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void> | void
    // New: allow deleting a task (root only in UI)
    onDeleteTask?: (taskId: string) => Promise<void> | void
  }

  export function TasksPanel({ tasks, onCompleteTask, onUpdateChecklist, onUpdateTask, onDeleteTask }: TasksPanelProps) {
    const auth = AuthService.getInstance()
    const currentUser = auth.getCurrentUser()
    const canComplete = auth.hasPermission("complete-task")

    // Modal state for updating task
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [statusDraft, setStatusDraft] = useState<string>("")
    const [descDraft, setDescDraft] = useState("")
    const [operatorNoteDraft, setOperatorNoteDraft] = useState("")

    useEffect(() => {
      if (selectedTask) {
        setStatusDraft((selectedTask.status as any) || "pending")
        setDescDraft(selectedTask.description || "")
        setOperatorNoteDraft(selectedTask.operatorNote || "")
      } else {
        setStatusDraft("")
        setDescDraft("")
        setOperatorNoteDraft("")
      }
    }, [selectedTask])

    const openModal = (task: Task) => {
      if (!currentUser) return
      const isAssignee = task.assignedTo === currentUser.id
      const canViewAsManager = auth.canManageTasks() || auth.isSuperAdmin() || auth.isManager() || auth.isSupervisor()
      if (!isAssignee && !canViewAsManager) return
      setSelectedTask(task)
      setModalOpen(true)
    }

    const closeModal = () => {
      setModalOpen(false)
      setSelectedTask(null)
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

    // Support both in_progress and in-progress for UI safety
    const isInProgress = (status: string) => status === "in_progress" || status === "in-progress"

    const getStatusColor = (status: string) => {
      switch (true) {
        case status === "completed":
          return "default"
        case isInProgress(status):
          return "secondary"
        case status === "pending":
          return "outline"
        case status === "cancelled":
          return "outline"
        default:
          return "outline"
      }
    }

    const getStatusText = (status: string) => {
      switch (true) {
        case status === "completed":
          return "تکمیل شده"
        case isInProgress(status):
          return "در حال انجام"
        case status === "pending":
          return "در انتظار"
        case status === "cancelled":
          return "لغو شده"
        default:
          return status
      }
    }

    const getStatusIcon = (status: string) => {
      switch (true) {
        case status === "completed":
          return <CheckCircle className="h-4 w-4" />
        case isInProgress(status):
          return <Clock className="h-4 w-4" />
        case status === "pending":
          return <AlertCircle className="h-4 w-4" />
        default:
          return null
      }
    }

    // Filter tasks for current user if they're an operator
    const userTasks =
      currentUser?.role === "operator" ? tasks.filter((task) => task.assignedTo === currentUser.id) : tasks

    const pendingTasks = userTasks.filter((task) => task.status !== "completed")
    const completedTasks = userTasks.filter((task) => task.status === "completed")

    // Submit updates from modal
    const handleSubmit = async () => {
      if (!selectedTask) return
      const updates: Partial<Task> = {}
      // Normalize draft status to allowed values
      const normalizedStatus = statusDraft === "in-progress" ? "in_progress" : statusDraft
      if (normalizedStatus && normalizedStatus !== selectedTask.status) {
        updates.status = normalizedStatus as Task["status"]
      }
      if (descDraft !== (selectedTask.description || "")) {
        updates.description = descDraft
      }
      if (operatorNoteDraft !== (selectedTask.operatorNote || "")) {
        updates.operatorNote = operatorNoteDraft
      }

      if (Object.keys(updates).length === 0) {
        closeModal()
        return
      }

      try {
        await onUpdateTask?.(selectedTask.id, updates)
        closeModal()
      } catch (e) {
        console.error("Failed to update task:", e)
      }
    }

    const isAssignee = !!(currentUser && selectedTask && selectedTask.assignedTo === currentUser.id)
    const canEdit = !!(
      isAssignee ||
      currentUser?.role === "root" ||
      auth.isManager() ||
      auth.isSupervisor() ||
      auth.isSuperAdmin()
    )

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            وظایف
            {pendingTasks.length > 0 && <Badge variant="secondary">{pendingTasks.length}</Badge>}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ClipboardList className="h-12 w-12 mx-auto mb-2" />
              <p>هیچ وظیفه‌ای وجود ندارد</p>
            </div>
          ) : (
            <>
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg space-y-3 hover:bg-muted/40 cursor-pointer"
                  onClick={() => openModal(task)}
                >
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
                    <div>ایجاد شده: {task.createdAt ? new Date(task.createdAt).toLocaleDateString("fa-IR") : "ندارد"}</div>
                  </div>
                  {/* Show assignee name if available, otherwise show ID */}
                  {(task.assignedToUser?.name || task.assignedTo) && (
                    <div className="text-xs text-muted-foreground">
                      <span>محول شده به: </span>
                      <span className="font-medium">{task.assignedToUser?.name ?? task.assignedTo}</span>
                    </div>
                  )}

                  {/* Show operator note to root users */}
                  {currentUser?.role === "root" && task.operatorNote && (
                    <div className="mt-2 p-2 rounded border bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">یادداشت اپراتور</div>
                      <div className="text-sm whitespace-pre-wrap">{task.operatorNote}</div>
                    </div>
                  )}

                  {task.checklist && task.checklist.length > 0 && (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <h5 className="text-sm font-medium">چک‌لیست:</h5>
                      {task.checklist.map((item, index) => (
                        <div key={item.id || `${task.id}-${index}`} className="flex items-center gap-2">
                          <Checkbox
                            id={item.id}
                            checked={item.completed}
                            onCheckedChange={(checked) => onUpdateChecklist?.(task.id, item.id, checked as boolean)}
                            disabled={!canComplete || task.assignedTo !== currentUser?.id}
                          />
                          <label
                            htmlFor={item.id}
                            className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {item.text}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}


                  {canComplete && task.assignedTo === currentUser?.id && task.status !== "completed" && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onCompleteTask?.(task.id) }}
                      disabled={task.checklist?.some((item) => !item.completed)}
                    >
                      تکمیل وظیفه
                    </Button>
                  )}

                  {/* Root-only actions: delete and edit */}
                  {currentUser?.role === "root" && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteTask?.(task.id)}
                      >
                        حذف
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openModal(task)}>
                        ویرایش
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">وظایف تکمیل شده</h4>
                  {completedTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg opacity-60 hover:opacity-100 hover:bg-muted/40 cursor-pointer" onClick={() => openModal(task)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm">{task.title}</h5>
                          <p className="text-xs text-muted-foreground">

                            تکمیل شده: {task.completedAt ? new Date(task.completedAt).toLocaleDateString("fa-IR") : "نامشخص"}
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Update Modal */}
              <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>به‌روزرسانی وظیفه</DialogTitle>
                  </DialogHeader>
                  {selectedTask && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">عنوان</div>
                        <div className="font-medium">{selectedTask.title}</div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                          <div className="text-sm">وضعیت</div>
+                          {canEdit ? (
                            <Select value={String(statusDraft)} onValueChange={(v) => setStatusDraft(v as any)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="انتخاب وضعیت" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">در انتظار</SelectItem>
                                <SelectItem value="in_progress">در حال انجام</SelectItem>
                                <SelectItem value="completed">تکمیل شده</SelectItem>
                                <SelectItem value="cancelled">لغو شده</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={getStatusColor(String(statusDraft))} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(String(statusDraft))}
                              {getStatusText(String(statusDraft))}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm">توضیحات</div>
                          {canEdit && currentUser?.role !== "operator" ? (
                            <Textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={4} />
                          ) : (
                            <div className="min-h-[3rem] p-2 rounded border bg-muted/30 text-sm whitespace-pre-wrap">
                              {descDraft || "-"}
                            </div>
                          )}
                        </div>

                        {canEdit && currentUser?.role === "operator" ? (
                          <div className="space-y-1">
                            <div className="text-sm">یادداشت اپراتور</div>
                            <Textarea
                              value={operatorNoteDraft}
                              onChange={(e) => setOperatorNoteDraft(e.target.value)}
                              placeholder="یادداشت خود را اینجا بنویسید"
                              rows={3}
                            />
                          </div>
                        ) : (
                          selectedTask.operatorNote ? (
                            <div className="space-y-1">
                              <div className="text-sm">یادداشت اپراتور</div>
                              <div className="min-h-[2.5rem] p-2 rounded border bg-muted/30 text-sm whitespace-pre-wrap">
                                {selectedTask.operatorNote}
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeModal}>انصراف</Button>
                        {canEdit && <Button onClick={handleSubmit} disabled={!selectedTask}>ذخیره</Button>}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    )
  }
