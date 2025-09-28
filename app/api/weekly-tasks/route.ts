// app/api/weekly-tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { validateAuth } from '@/lib/auth-middleware'
import { broadcast } from '@/lib/event-bus'

export async function GET() {
  try {
    const tasks = await db.getWeeklyTasks()
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Failed to get weekly tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'root') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const taskData = await request.json()
    
    // اعتبارسنجی داده‌های ورودی
    if (!taskData.title || taskData.dayOfWeek === undefined || !taskData.timeSlot) {
      return NextResponse.json(
        { error: 'Title, dayOfWeek, and timeSlot are required' },
        { status: 400 }
      )
    }
    
    // اعتبارسنجی dayOfWeek
    if (taskData.dayOfWeek < 0 || taskData.dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'dayOfWeek must be between 0 and 6' },
        { status: 400 }
      )
    }
    
    const task = await db.createWeeklyTask(taskData)

    // انتشار رویداد real-time برای ایجاد وظیفه هفتگی
    broadcast('weeklyTask:created', task)
    
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Failed to create weekly task:', error)
    return NextResponse.json(
      { error: 'Failed to create weekly task' },
      { status: 500 }
    )
  }
}