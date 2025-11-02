// app/api/system/settings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await db.getSystemSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Get system settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await validateAuth(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "root") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await request.json()
    await db.updateSystemSettings(settings)
    
    return NextResponse.json({ message: "Settings updated successfully" })
  } catch (error) {
    console.error("Update system settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}