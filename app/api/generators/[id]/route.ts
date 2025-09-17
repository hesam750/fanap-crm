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
    console.log("Updating generator with data:", { id, updates })

    if (!id) {
      return NextResponse.json({ error: "Generator ID is required" }, { status: 400 })
    }

    // اعتبارسنجی status
    if (updates.status && !["running", "stopped", "maintenance"].includes(updates.status.toLowerCase())) {
      return NextResponse.json(
        { error: "Status must be either running, stopped, or maintenance" },
        { status: 400 }
      )
    }

    // تبدیل status به lowercase
    const updateData = { ...updates };
    if (updateData.status) {
      updateData.status = updateData.status.toLowerCase();
    }

    // اضافه کردن updatedBy و حذف recordedBy که وجود ندارد
    const updateDataForPrisma = {
      ...updateData,
      updatedBy: user.id,
    };

    // حذف recordedBy اگر وجود دارد چون در مدل نیست
    delete (updateDataForPrisma as any).recordedBy;

    const updatedGenerator = await db.updateGenerator(id, updateDataForPrisma)

    return NextResponse.json({ generator: updatedGenerator })
  } catch (error) {
    console.error("Update generator error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
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
    console.log("Deleting generator:", id)

    if (!id) {
      return NextResponse.json({ error: "Generator ID is required" }, { status: 400 })
    }

    await db.deleteGenerator(id, user.id)
    
    return NextResponse.json({ message: "Generator deleted successfully" })
  } catch (error) {
    console.error("Delete generator error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}