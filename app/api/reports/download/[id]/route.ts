import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth-middleware"
import { getReport } from "@/lib/report-store"

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const report = getReport(id)
    if (!report) {
      return NextResponse.json({ error: "Report not found or expired" }, { status: 404 })
    }

    const body = typeof report.content === 'string' ? report.content : new Uint8Array(report.content)

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": report.contentType,
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error downloading report (GET):", error)
    return NextResponse.json(
      { error: "خطا در دانلود گزارش" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const {id} = await request.json()

    const report = getReport(id)
    if (!report) {
      return NextResponse.json({ error: "Report not found or expired" }, { status: 404 })
    }

    // Optional: حذف پس از دانلود یک‌باره
    // deleteReport(id)

    const body = typeof report.content === 'string' ? report.content : new Uint8Array(report.content)

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": report.contentType,
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error downloading report:", error)
    return NextResponse.json(
      { error: "خطا در دانلود گزارش" },
      { status: 500 }
    )
  }
}