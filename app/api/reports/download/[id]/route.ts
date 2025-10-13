 import { NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth-middleware"
import { getReport } from "@/lib/report-store"

export const runtime = "nodejs"

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
    if (!id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 })
    }

    const report = getReport(id)
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const headers = new Headers()
    headers.set("Content-Type", report.contentType)
    headers.set("Content-Disposition", `attachment; filename="${report.filename}"`)
    headers.set("Cache-Control", "no-store")
    headers.set("Content-Length", String(report.content.byteLength))

    // Ensure BodyInit compatibility: use Node Buffer (Uint8Array with ArrayBuffer)
    const body = Buffer.from(report.content)
    return new NextResponse(body, { status: 200, headers })
  } catch (error) {
    console.error("Download report error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}