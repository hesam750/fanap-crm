import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    let notifications
    if (userId) {
      notifications = await db.getNotificationsByUser(userId)
    } else {
      notifications = await db.getNotifications()
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const notificationData = await request.json()

    // Validate required fields
    if (!notificationData.userId || !notificationData.title || !notificationData.message) {
      return NextResponse.json({ error: "UserId, title, and message are required" }, { status: 400 })
    }

    const newNotification = await db.createNotification({
      ...notificationData,
      type: notificationData.type || "system",
      read: notificationData.read || false,
    })

    return NextResponse.json({ notification: newNotification }, { status: 201 })
  } catch (error) {
    console.error("Create notification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
