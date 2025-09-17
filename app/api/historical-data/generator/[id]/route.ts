import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await ctx.params
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get("hours") || "24")
    
    const history = await db.getGeneratorHistory(id, hours)
    
    return NextResponse.json(history.map(record => ({
      level: record.level,
      timestamp: record.timestamp.toISOString(),
      recordedBy: record.recordedBy
    })))
    
  } catch (error) {
    console.error("Get generator history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}