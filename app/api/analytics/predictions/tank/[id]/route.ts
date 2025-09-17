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
    const horizon = parseInt(searchParams.get("horizon") || "24")

    const prediction = await db.predictTankUsage(id)

    return NextResponse.json(prediction)
  } catch (error) {
    console.error("Get tank predictions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}