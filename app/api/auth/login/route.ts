import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    return null
  }
  return secret || 'dev-secret'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

   
    const userRow = await db.getUserWithPassword(email)

    if (!userRow) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    
    const isValidPassword = await bcrypt.compare(password, userRow.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

 
    if (!userRow.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 401 })
    }

    const secret = getJwtSecret()
    if (!secret) {
      return NextResponse.json({ error: "Server misconfigured: missing JWT secret" }, { status: 500 })
    }
    const token = jwt.sign(
      { userId: userRow.id, role: userRow.role },
      secret,
      { expiresIn: "24h" }
    )

    
    const user = await db.getUserById(userRow.id)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }
    

    const response = NextResponse.json({ 
      user: user,
      token 
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
