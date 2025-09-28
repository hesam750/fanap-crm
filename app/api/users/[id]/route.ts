import { db } from "@/lib/database";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; 
    const updates = await request.json(); 

    if (!id || !updates) {
      return NextResponse.json({ error: "ID and updates are required" }, { status: 400 });
    }

    console.log("Received update request:", { id, updates });

    const allowedUpdates = ['name', 'email', 'role', 'isActive', 'password', 'avatarUrl'] as const;
    type AllowedUpdateKey = typeof allowedUpdates[number]
    const filteredUpdates: Partial<Record<AllowedUpdateKey, string | boolean>> = {};
    
    for (const key in updates) {
      if (allowedUpdates.includes(key as AllowedUpdateKey)) {
        filteredUpdates[key as AllowedUpdateKey] = updates[key as AllowedUpdateKey] as string | boolean;
      }
    }

    // Handle password change with current password verification
    if (typeof filteredUpdates.password === 'string' && filteredUpdates.password.trim() !== '') {
      const currentPassword: string | undefined = typeof updates.currentPassword === 'string' ? updates.currentPassword : undefined
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }

      const safeUser = await db.getUserById(id)
      if (!safeUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const userRow = await db.getUserWithPassword(safeUser.email)
      if (!userRow) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const isValid = await bcrypt.compare(currentPassword, userRow.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
      }

      filteredUpdates.password = await bcrypt.hash(filteredUpdates.password, 10)
    } else {
      console.log("No password change requested");
      delete filteredUpdates.password;
    }

    console.log('Final updates to send to DB:', filteredUpdates);

    const updatedUser = await db.updateUser(id, filteredUpdates);
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log("Deleting user with ID:", id);

    await db.deleteUser(id);

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}