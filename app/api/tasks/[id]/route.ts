import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'
import { broadcast } from '@/lib/event-bus'

// Update a task by ID
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

    // Fetch current task for permission checks
    const existing = await db.getTaskById(taskId)
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Root/manager/supervisor can update broadly (with basic validation)
    if (user.role === 'root' || user.role === 'manager' || user.role === 'supervisor') {
      // Validate status if provided
      if (updates?.status !== undefined) {
        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
        if (!validStatuses.includes(String(updates.status))) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
      }

      const [updated] = await db.updateTask(taskId, updates)
      broadcast('task:updated', updated)
      return NextResponse.json({ task: updated })
    }

    // Operators: only limited updates if the task is assigned to them
    if (user.role === 'operator') {
      const isAssigned = String(existing.assignedTo) === String(user.id)
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Only allow status, description, checklist, operatorNote
      const allowedKeys = new Set(['status', 'description', 'checklist', 'operatorNote'])
      const filteredUpdates: Record<string, any> = {}
      for (const [k, v] of Object.entries(updates || {})) {
        if (allowedKeys.has(k)) filteredUpdates[k] = v
      }

      if (filteredUpdates.status !== undefined) {
        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
        if (!validStatuses.includes(String(filteredUpdates.status))) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
      }

      const [updated] = await db.updateTask(taskId, filteredUpdates)
      broadcast('task:updated', updated)
      return NextResponse.json({ task: updated })
    }

    // Other roles not allowed
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// Delete a task by ID
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only root/manager/supervisor can delete tasks
  if (!(user.role === 'root' || user.role === 'manager' || user.role === 'supervisor')) {
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

    await db.deleteTask(taskId)
    broadcast('task:deleted', { id: taskId })
    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
