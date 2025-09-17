// import jwt from "jsonwebtoken"
// import bcrypt from "bcryptjs"
// import { db } from './database'
// import type { User } from "./types"

// const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// export class DatabaseAuthService {
//   private static instance: DatabaseAuthService
//   private currentUser: User | null = null

//   static getInstance(): DatabaseAuthService {
//     if (!DatabaseAuthService.instance) {
//       DatabaseAuthService.instance = new DatabaseAuthService()
//     }
//     return DatabaseAuthService.instance
//   }

//   // متد ورود به سیستم
//   async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
//     try {
//       const userRow = await db.getUserWithPassword(email)
      
//       if (!userRow || !userRow.isActive) {
//         return null
//       }

//       // مقایسه رمز عبور
//       const isValidPassword = await bcrypt.compare(password, userRow.password)
//       if (!isValidPassword) {
//         return null
//       }

//       const user: User = {
//         id: userRow.id,
//         name: userRow.name,
//         email: userRow.email,
//         role: userRow.role.toLowerCase() as User["role"],
//         permissions: this.getRolePermissions(userRow.role),
//         createdAt: userRow.createdAt,
//         lastLogin: new Date(),
//         isActive: userRow.isActive,
//       }

//       const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" })

//       this.currentUser = user
//       return { user, token }
//     } catch (error) {
//       console.error('Login error:', error)
//       return null
//     }
//   }

//   // بررسی توکن
//   async verifyToken(token: string): Promise<User | null> {
//     try {
//       const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }

//       const userRow = await db.getUserById(decoded.userId)

//       if (!userRow || !userRow.isActive) {
//         return null
//       }

//       const user: User = {
//         id: userRow.id,
//         name: userRow.name,
//         email: userRow.email,
//         role: userRow.role,
//         permissions: userRow.permissions,
//         createdAt: userRow.createdAt,
//         lastLogin: userRow.lastLogin,
//         isActive: userRow.isActive,
//       }

//       this.currentUser = user
//       return user
//     } catch (error) {
//       return null
//     }
//   }

//   getCurrentUser(): User | null {
//     return this.currentUser
//   }

//   logout(): void {
//     this.currentUser = null
//   }

//   // دسترسی‌های هر نقش
//   private getRolePermissions(role: string): string[] {
//     const permissions: Record<string, string[]> = {
//       ROOT: ["*"], // تمام دسترسی‌ها
//       MANAGER: [
//         "view_dashboard",
//         "view_analytics",
//         "view_reports",
//         "manage_users",
//         "manage_tasks",
//         "manage_devices",
//         "acknowledge_alerts",
//         "update_levels",
//       ],
//       SUPERVISOR: [
//         "view_dashboard",
//         "view_analytics",
//         "view_reports",
//         "manage_tasks",
//         "acknowledge_alerts",
//         "update_levels",
//       ],
//       OPERATOR: ["view_dashboard", "view_assigned_tasks", "update_levels", "acknowledge_alerts"],
//     }

//     return permissions[role] || []
//   }

//   // متدهای بررسی دسترسی
//   canViewDashboard(): boolean {
//     return this.hasPermission("view_dashboard")
//   }

//   canViewAnalytics(): boolean {
//     return this.hasPermission("view_analytics")
//   }

//   canViewReports(): boolean {
//     return this.hasPermission("view_reports")
//   }

//   canManageUsers(): boolean {
//     return this.hasPermission("manage_users")
//   }

//   canManageTasks(): boolean {
//     return this.hasPermission("manage_tasks")
//   }

//   canManageDevices(): boolean {
//     return this.hasPermission("manage_devices")
//   }

//   canUpdateLevels(): boolean {
//     return this.hasPermission("update_levels")
//   }

//   canAcknowledgeAlerts(): boolean {
//     return this.hasPermission("acknowledge_alerts")
//   }

//   isSuperAdmin(): boolean {
//     return this.currentUser?.role === "root"
//   }

//   isManager(): boolean {
//     return this.currentUser?.role === "manager" || this.isSuperAdmin()
//   }

//   private hasPermission(permission: string): boolean {
//     if (!this.currentUser) return false
//     return this.currentUser.permissions.includes("*") || this.currentUser.permissions.includes(permission)
//   }
// }
