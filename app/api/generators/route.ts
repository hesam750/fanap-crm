import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const generators = await db.getGenerators()
    return NextResponse.json({ generators })
  } catch (error) {
    console.error("Get generators error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // بررسی دسترسی کاربر با نرمال‌سازی مجوزها
  const normalize = (p: string) => (p || "").toLowerCase().replace(/-/g, "_")
  const userPerms = new Set((user.permissions || []).map(normalize))
  const hasPermission = userPerms.has("*") || userPerms.has("add_generators")
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const generatorData = await request.json()

    // Validate required fields
    if (!generatorData.name || !generatorData.capacity) {
      return NextResponse.json({ error: "Name and capacity are required" }, { status: 400 })
    }

    // اعتبارسنجی status
    if (generatorData.status && !["running", "stopped", "maintenance"].includes(generatorData.status.toLowerCase())) {
      return NextResponse.json(
        { error: "Status must be either running, stopped, or maintenance" },
        { status: 400 }
      )
    }

    const newGenerator = await db.createGenerator({
      ...generatorData,
      currentLevel: generatorData.currentLevel || 0,
      status: generatorData.status ? generatorData.status.toLowerCase() : "stopped",
      createdBy: user.id,
    })

    return NextResponse.json({ generator: newGenerator }, { status: 201 })
  } catch (error) {
    console.error("Create generator error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, updates } = await request.json()
    
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

    // اضافه کردن updatedBy و حذف recordedBy
    const updateDataForPrisma = {
      ...updateData,
      updatedBy: user.id,
    };

    delete updateDataForPrisma.recordedBy;

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

export async function DELETE(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, deletedBy } = await request.json()
    
    await db.deleteGenerator(id, deletedBy || user.id)
    
    return NextResponse.json({ message: "Generator deleted successfully" })
  } catch (error) {
    console.error("Delete generator error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}