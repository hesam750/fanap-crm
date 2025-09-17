import { User } from "./types"


export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const { user } = await response.json()
        this.currentUser = user
        // Store user in localStorage for UI state, but auth token is in cookie
        localStorage.setItem("currentUser", JSON.stringify(user))
        return user
      }

      return null
    } catch (error) {
      console.error("Login error:", error)
      return null
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.currentUser = null
      localStorage.removeItem("currentUser")
    }
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem("currentUser")
      if (stored) {
        this.currentUser = JSON.parse(stored)
      }
    }
    return this.currentUser
  }

  // Normalize permission ids across hyphen/underscore and known aliases
  private normalizePermission(perm: string): string {
    if (!perm) return perm
    const p = String(perm).trim().toLowerCase()
    const aliasMap: Record<string, string> = {
      "view-dashboard": "view_dashboard",
      "view-analytics": "view_analytics",
      "view-reports": "view_reports",
      "manage-users": "manage_users",
      "manage-tasks": "manage_tasks",
      "assign-tasks": "assign_tasks",
      "acknowledge-alerts": "acknowledge_alerts",
      "manage-system": "manage_system",
      "update-tank-levels": "update_levels",
      "update-generator-levels": "update_levels",
      "add-tanks": "add_tanks",
      "add-generators": "add_generators",
      "delete-data": "delete_data",
      "update": "update_levels",
      "complete-task": "complete_task",
    }
    if (aliasMap[p]) return aliasMap[p]
    return p.replace(/-/g, "_")
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser()
    if (!user || !user.isActive) return false

    if (!user.permissions || !Array.isArray(user.permissions)) {
      return false
    }

    // Root has all permissions
    if (user.role === "root" || user.permissions.includes("*")) {
      return true
    }

    // Normalize requested permission and user's permissions
    const requested = this.normalizePermission(permission)
    const normalizedUserPerms = new Set(
      user.permissions.map((p) => this.normalizePermission(p))
    )

    return normalizedUserPerms.has(requested)
  }

  canViewDashboard(): boolean {
    return this.hasPermission("view_dashboard") 
  }

  canViewAnalytics(): boolean {
    return this.hasPermission("view_analytics") 
  }

  canViewReports(): boolean {
    return this.hasPermission("view_reports")
  }

  canManageTasks(): boolean {
    return this.hasPermission("manage_tasks")
  }

  canAssignTasks(): boolean {
    return this.hasPermission("assign_tasks") 
  }

  canUpdateLevels(): boolean {
    return this.hasPermission("update_levels") 
  }

  canAcknowledgeAlerts(): boolean {
    return this.hasPermission("acknowledge_alerts")
  }

  canManageSystem(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "root"
  }

  canManageUsers(): boolean {
    return this.hasPermission("manage_users") || this.canManageSystem()
  }
  isSuperAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "root"
  }

  isRoot(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "root"
  }

  isManager(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "manager"
  }

  isOperator(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "operator"
  }

  isSupervisor(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "supervisor"
  }

  getRoleDisplayName(role?: string): string {
    const userRole = role || this.getCurrentUser()?.role
    switch (userRole) {
      case "root":
        return "مدیر کل سیستم"
      case "manager":
        return "مدیر"
      case "operator":
        return "اپراتور"
      case "supervisor":
        return "ناظر"
      default:
        return "نامشخص"
    }
  }

  getAvailableActions(): string[] {
    const user = this.getCurrentUser()
    if (!user) return []

    if (user.role === "root") {
      return [
        "view_dashboard",
        "view_analytics",
        "view_reports",
        "manage_tasks",
        "assign_tasks",
        "update_levels",
        "acknowledge_alerts",
        "manage_users",
        "manage_system",
        "add_tanks",
        "add_generators",
        "delete_data",
      ]
    }

    if (user.role === "operator") {
      return [
        "view_dashboard",
        "view_reports",
        "manage_tasks",
        "assign_tasks",
        "acknowledge_alerts",
        "update_levels",
        "add_tanks",  
        "add_generators", 
        "update"
      ]
    }


    return user.permissions
  }
}