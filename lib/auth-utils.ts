// import bcrypt from "bcryptjs"
// import jwt from "jsonwebtoken"

// import type { User } from "./types"

// const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// export async function hashPassword(password: string): Promise<string> {
//   return bcrypt.hash(password, 10)
// }

// export async function verifyPassword(password: string, hash: string): Promise<boolean> {
//   return bcrypt.compare(password, hash)
// }

// export function generateToken(user: User): string {
//   return jwt.sign(
//     {
//       id: user.id,
//       email: user.email,
//       role: user.role,
//     },
//     JWT_SECRET,
//     { expiresIn: "24h" },
//   )
// }

// export function verifyToken(token: string): any {
//   try {
//     return jwt.verify(token, JWT_SECRET)
//   } catch (error) {
//     return null
//   }
// }

// export async function getUserFromToken(token: string): Promise<User | null> {
//   const decoded = verifyToken(token)
//   if (!decoded) return null

//   try {
//     const result = await query(
//       "SELECT id, email, name, role, is_active, created_at FROM users WHERE id = $1 AND is_active = true",
//       [decoded.id],
//     )
//     return result.rows[0] || null
//   } catch (error) {
//     console.error("[v0] Error fetching user from token:", error)
//     return null
//   }
// }

// export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
//   const roleHierarchy = {
//     root: 4,
//     manager: 3,
//     supervisor: 2,
//     operator: 1,
//   }

//   const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
//   return requiredRoles.some((role) => userLevel >= (roleHierarchy[role as keyof typeof roleHierarchy] || 0))
// }
