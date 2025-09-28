import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"
import { broadcast } from "@/lib/event-bus"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const task = await db.getTaskById(id)

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Get task error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const updates = await request.json()
    const { id } = await ctx.params

    // Fetch current task for RBAC decisions
    const currentTask = await db.getTaskById(id)
    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Normalize status alias if provided
    const normalizeStatus = (s: any) => {
      if (typeof s !== "string") return s
      return s === "in-progress" ? "in_progress" : s
    }

    let filteredUpdates: Record<string, any> = { ...updates }
    if (filteredUpdates.status !== undefined) {
      filteredUpdates.status = normalizeStatus(filteredUpdates.status)
    }

    if (user.role === "root") {
      // Root can update any field (status already normalized)
    } else if (user.role === "operator" || user.role === "manager" || user.role === "supervisor") {
      // Must be assigned to the task
      const isAssigned = currentTask.assignedTo === user.id
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      // Limit fields by role
      const allowedKeys = new Set(["status", "description", "checklist", "operatorNote"]) // اپراتور، مدیر و سرپرست می‌توانند وضعیت/توضیحات/چک‌لیست/یادداشت را به‌روزرسانی کنند
      const limited: Record<string, any> = {}
      for (const [k, v] of Object.entries(filteredUpdates)) {
        if (allowedKeys.has(k)) limited[k] = v
      }

      // Validate status if present
      if (limited.status !== undefined) {
        const validStatuses = ["pending", "in_progress", "completed", "cancelled"]
        if (!validStatuses.includes(String(limited.status))) {
          return NextResponse.json({ error: "Invalid status" }, { status: 400 })
        }
      }

      filteredUpdates = limited
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updatedTaskArr = await db.updateTask(id, filteredUpdates)
    const updatedTask = updatedTaskArr?.[0]

    if (!updatedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // log activity for task update
    try {
      let desc = `Task "${updatedTask.title}" updated`
      if (filteredUpdates.status !== undefined) desc += ` (status: ${filteredUpdates.status})`
      if (filteredUpdates.operatorNote !== undefined) desc += ` (operator note updated)`
      await db.logActivity("task_updated", desc, user.id)
    } catch (e) {
      console.warn("Failed to log task_updated activity", e)
    }

    // Broadcast realtime update
    broadcast("task:updated", updatedTask)

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error("Update task error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await ctx.params
    const deleted = await db.deleteTask(id)

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // log activity for task deletion
    try {
      await db.logActivity(
        "task_deleted",
        `Task ${id} deleted`,
        user.id
      )
    } catch (e) {
      console.warn("Failed to log task_deleted activity", e)
    }

    // Broadcast deletion
    broadcast("task:deleted", { id })

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Delete task error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
