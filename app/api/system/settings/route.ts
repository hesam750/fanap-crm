// app/api/system/settings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    // اینجا می‌توانید تنظیمات را از دیتابیس بگیرید
    const settings = await db.getSystemSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Get system settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json()
    
    // اینجا می‌توانید تنظیمات را در دیتابیس ذخیره کنید
    await db.updateSystemSettings(settings)
    
    return NextResponse.json({ message: "Settings updated successfully" })
  } catch (error) {
    console.error("Update system settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}