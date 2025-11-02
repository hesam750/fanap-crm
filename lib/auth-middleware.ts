import jwt from "jsonwebtoken"
import { db } from "./database"
import type { User } from "./types"
import { NextRequest } from "next/server"

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    return null
  }
  return secret || 'dev-secret'
}

export async function validateAuth(request: NextRequest): Promise<User | null> {
  // Get token from cookie (same as middleware)
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return null
  }

  try {
    const secret = getJwtSecret()
    if (!secret) {
      return null
    }
    const decoded = jwt.verify(token, secret) as { userId: string }

    const user = await db.getUserById(decoded.userId)

    return user || null
  } catch (error) {
    console.error("Auth validation error:", error)
    return null
  }
}
