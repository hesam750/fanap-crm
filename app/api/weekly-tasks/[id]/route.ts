// app/api/weekly-tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'
import { broadcast } from '@/lib/event-bus'

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: taskId } = await ctx.params
    const updates = await request.json()

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // Root can update everything (with validations)
    if (user.role === 'root') {
      // اعتبارسنجی dayOfWeek اگر وجود دارد
      if (
        updates.dayOfWeek !== undefined &&
        (updates.dayOfWeek < 0 || updates.dayOfWeek > 6)
      ) {
        return NextResponse.json(
          { error: 'dayOfWeek must be between 0 and 6' },
          { status: 400 }
        )
      }

      const task = await db.updateWeeklyTask(taskId, updates)

      // انتشار رویداد به‌روزرسانی
      broadcast('weeklyTask:updated', task)
      return NextResponse.json({ task })
    }

    // Operators: only allow limited updates if the task is assigned to them
    if (user.role === 'operator' || user.role === 'manager' || user.role === 'supervisor') {
      const allTasks = await db.getWeeklyTasks()
      const task = allTasks.find((t) => t.id === taskId)

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id)
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Only allow updating status and description by non-root users
      const allowedKeys = new Set(['status', 'description'])
      const filteredUpdates: Record<string, any> = {}
      for (const [k, v] of Object.entries(updates || {})) {
        if (allowedKeys.has(k)) filteredUpdates[k] = v
      }

      // Validate and normalize status if provided
      if (filteredUpdates.status !== undefined) {
        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
        if (!validStatuses.includes(String(filteredUpdates.status))) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        // If completed, set completedBy to current user; otherwise clear it
        if (filteredUpdates.status === 'completed') {
          filteredUpdates.completedBy = user.id
        } else {
          filteredUpdates.completedBy = null
        }
      }

      const updated = await db.updateWeeklyTask(taskId, filteredUpdates)

      // انتشار رویداد به‌روزرسانی
      broadcast('weeklyTask:updated', updated)
      return NextResponse.json({ task: updated })
    }

    // Other roles not allowed
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    console.error('Failed to update weekly task:', error)
    return NextResponse.json(
      { error: 'Failed to update weekly task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'root') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { id: taskId } = await ctx.params

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    await db.deleteWeeklyTask(taskId)

    // انتشار رویداد حذف
    broadcast('weeklyTask:deleted', { id: taskId })

    return NextResponse.json({
      message: 'Weekly task deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete weekly task:', error)
    return NextResponse.json(
      { error: 'Failed to delete weekly task' },
      { status: 500 }
    )
  }
}