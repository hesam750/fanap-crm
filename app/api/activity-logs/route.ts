import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const type = searchParams.get("type") || undefined
    const userId = searchParams.get("userId") || undefined
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const search = searchParams.get("search") || undefined
    const sort = (searchParams.get("sort") as "asc" | "desc") || "desc"

    const result = await db.getActivityLogs({
      page,
      limit,
      type,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      sort,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/activity-logs]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}