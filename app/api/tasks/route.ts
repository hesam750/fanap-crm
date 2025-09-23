/* eslint-disable @typescript-eslint/no-unused-vars */


import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"


export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const taskData = await request.json()
    console.log("Received task data:", taskData)

    // Require only title and assignedTo; assignedBy will be enforced from auth user
    if (!taskData.title || !taskData.assignedTo) {
      return NextResponse.json({ 
        error: "Title and assignedTo are required" 
      }, { status: 400 })
    }

    const newTask = await db.createTask({
      ...taskData,
      // enforce creator based on authenticated user
      assignedBy: user.id,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null, 
      status: taskData.status || "pending",
      priority: taskData.priority || "medium",
    })

    // log activity for task creation
    try { 
      const assignedToDisplay = newTask?.assignedToUser?.name || newTask?.assignedTo
      await db.logActivity(
        "task_created",
        `Task "${newTask.title}" created and assigned to ${assignedToDisplay}`,
        user.id
      )
    } catch (e) {
      console.warn("Failed to log task_created activity", e)
    }

    return NextResponse.json({ task: newTask }, { status: 201 })
    
  } catch (error) {
    console.error("Create task error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error 
    }, { status: 500 })
  }
}


export async function GET(request: NextRequest) {
  // Optionally require auth for listing tasks; uncomment if needed
  // const user = await validateAuth(request)
  // if (!user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }
  try {
    // Support optional user-based filtering (?userId=<id>) for operator-specific views
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    const tasks = userId ? await db.getTasksByUser(userId) : await db.getTasks()
    return NextResponse.json({ tasks }, { status: 200 })
  } catch (error) {
    console.error("Get tasks error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
 