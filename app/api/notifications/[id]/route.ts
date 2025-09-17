import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json()

    const updatedNotification = await db.updateNotification(updates.id, updates)

    if (!updatedNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ notification: updatedNotification })
  } catch (error) {
    console.error("Update notification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


export async function POST(req: NextRequest) {
  try {
    const {id} = await req.json()
    const deleted = await db.deleteNotification(id);

    if (!deleted) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Notification deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}