import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tanks = await db.getTanks()
    return NextResponse.json({ tanks })
  } catch (error) {
    console.error("Get tanks error:", error)
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


  const hasPermission = user.permissions?.includes("*") 
    || user.permissions?.includes("add-tanks") 
    || user.permissions?.includes("add_tanks")
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const tankData = await request.json();
    console.log("Creating tank with data:", tankData);

    const { name, type, capacity, location } = tankData;

    if (!name || !type || !capacity) {
      return NextResponse.json(
        { error: "Name, type and capacity are required" },
        { status: 400 }
      );
    }

   
    if (!["fuel", "water"].includes(String(type).toLowerCase())) {
      return NextResponse.json(
        { error: "Type must be either fuel or water" },
        { status: 400 }
      );
    }

    const newTank = await db.createTank({
      name,
      type: String(type).toLowerCase() as "fuel" | "water",
      capacity: Number(capacity),
      location: location || undefined,
      createdBy: user.id,
    });

    return NextResponse.json({ tank: newTank }, { status: 201 });
  } catch (error) {
    console.error("CREATE TANK ERROR:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, updates } = await request.json()
    

    if (updates.type && !["fuel", "water"].includes(updates.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Type must be either fuel or water" },
        { status: 400 }
      )
    }

  
    const updateData = { ...updates };
    if (updateData.type) {
      updateData.type = updateData.type.toLowerCase();
    }

    const updatedTank = await db.updateTank(id, updateData)

    return NextResponse.json({ tank: updatedTank })
  } catch (error) {
    console.error("Update tank error:", error)
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
    
    await db.deleteTank(id, deletedBy || user.id)
    
    return NextResponse.json({ message: "Tank deleted successfully" })
  } catch (error) {
    console.error("Delete tank error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}