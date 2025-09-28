/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database" 
import bcrypt from "bcryptjs"


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (email) {
      const user = await db.getUserByEmail(email)
      // user already excludes password in db mapping
      return NextResponse.json({ user })
    }

    const users = await db.getUsers()
    return NextResponse.json({ users }) 
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


type Role = "root" | "manager" | "supervisor" | "operator";  


export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    const { name, email, password, role, isActive } = userData;

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "Name, email, role, and password are required" }, { status: 400 });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.createUser({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: isActive ?? true,
    });

    const userObject = Array.isArray(newUser) ? newUser[0] : newUser;

   
    const { password: _, ...userWithoutPassword } = userObject;

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // This route is not used by the frontend for DELETE. Keep for backward compatibility if someone calls it mistakenly.
    // We will support body-based deletion: { id: string }
    const { id } = await request.json().catch(() => ({ id: undefined }))
    if (!id) {
      return NextResponse.json({ error: "User ID is required (use /api/users/:id or provide {id} in body)" }, { status: 400 })
    }

    await db.deleteUser(id)

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user (collection) error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json() as { id: string; updates: Partial<{ name: string; email: string; role: Role; isActive: boolean; password: string }> };

    if (!id || !updates) {
      return NextResponse.json({ error: "ID and updates are required" }, { status: 400 });
    }

    console.log("Received update request:", { id, updates });

    
    const allowedUpdates = ['name', 'email', 'role', 'isActive', 'password'] as const;
    type AllowedUpdateKey = typeof allowedUpdates[number]
    const filteredUpdates: Partial<Record<AllowedUpdateKey, string | boolean>> = {};
    
    for (const key in updates) {
      if (allowedUpdates.includes(key as AllowedUpdateKey)) {
        filteredUpdates[key as AllowedUpdateKey] = updates[key as AllowedUpdateKey] as string | boolean;
      }
    }

    
    if (typeof filteredUpdates.password === 'string' && filteredUpdates.password.trim() !== '') {
      console.log("Hashing new password:", filteredUpdates.password);
      filteredUpdates.password = await bcrypt.hash(filteredUpdates.password, 10);
      console.log("Hashed password:", filteredUpdates.password);
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