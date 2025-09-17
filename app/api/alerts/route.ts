import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    const alerts = await db.getAlerts()
    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("Get alerts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const alertData = await request.json()

    if (!alertData.type || !alertData.message || !alertData.severity) {
      return NextResponse.json({ error: "Type, message, and severity are required" }, { status: 400 })
    }

  
    const normalize = (v: string) => String(v).trim().toLowerCase().replace(/-/g, "_")
    const type = normalize(alertData.type)
    const severity = normalize(alertData.severity)

    const allowedTypes = new Set(["low_fuel", "low_water", "maintenance", "critical"])
    const allowedSeverities = new Set(["low", "medium", "high", "critical"])

    if (!allowedTypes.has(type)) {
      return NextResponse.json({ error: "Invalid alert type" }, { status: 400 })
    }
    if (!allowedSeverities.has(severity)) {
      return NextResponse.json({ error: "Invalid alert severity" }, { status: 400 })
    }

    const newAlert = await db.createAlert({
      ...alertData,
      type,
      severity,
      acknowledged: alertData.acknowledged || false,
    })

    return NextResponse.json({ alert: newAlert }, { status: 201 })
  } catch (error) {
    console.error("Create alert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
