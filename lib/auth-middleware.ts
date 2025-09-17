import jwt from "jsonwebtoken"
import { db } from "./database"
import type { User } from "./types"
import { NextRequest } from "next/server"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export async function validateAuth(request: NextRequest): Promise<User | null> {
  // Get token from cookie (same as middleware)
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return null
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    const user = await db.getUserById(decoded.userId)

    return user || null
  } catch (error) {
    console.error("Auth validation error:", error)
    return null
  }
}
