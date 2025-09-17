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
    console.log("Updating tank with data:", { id, updates })

    if (!id) {
      return NextResponse.json({ error: "Tank ID is required" }, { status: 400 })
    }

    
    if (updates.type && !["fuel", "water"].includes(String(updates.type).toLowerCase())) {
      return NextResponse.json(
        { error: "Type must be either fuel or water" },
        { status: 400 }
      )
    }

    
    const updateData = { ...updates } as Record<string, unknown> & { type?: string }
    if (updateData.type) {
      updateData.type = updateData.type.toLowerCase()
    }

    
    const updateDataForPrisma = {
      ...updateData,
      updatedBy: user.id,
    } as Record<string, unknown>

    
    delete (updateDataForPrisma as { recordedBy?: unknown }).recordedBy

    const updatedTank = await db.updateTank(id, updateDataForPrisma)

    return NextResponse.json({ tank: updatedTank })
  } catch (error) {
    console.error("Update tank error:", error)
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
    console.log("Deleting tank:", id)

    if (!id) {
      return NextResponse.json({ error: "Tank ID is required" }, { status: 400 })
    }

    await db.deleteTank(id, user.id)
    
    return NextResponse.json({ message: "Tank deleted successfully" })
  } catch (error) {
    console.error("Delete tank error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}