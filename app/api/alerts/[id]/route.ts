import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await ctx.params
    const updates = await request.json()

    // اگر درخواست برای تأیید هشدار باشد، ثبت کننده و زمان تأیید را نیز ذخیره کن
    const data = updates?.acknowledged === true
      ? { ...updates, acknowledgedBy: user.id, acknowledgedAt: new Date() }
      : updates

    const [updatedAlert] = await db.updateAlert(id, data)

    return NextResponse.json({ alert: updatedAlert })

  } catch (error) {
    console.error("Update alert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await ctx.params
    await db.deleteAlert(id)

    return NextResponse.json({ message: "Alert deleted successfully" })

  } catch (error) {
    console.error("Delete alert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}