import { User } from "./types"


export class AuthService {
  private static instance: AuthService
  private currentUser: User | null = null
  private tabAccessByRole: Record<string, string[]> | undefined

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
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("currentUser", JSON.stringify(user))
          }
        } catch {}
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
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("currentUser")
        }
      } catch {}
    }
  }

  getCurrentUser(): User | null {
    // SSR-safe: avoid accessing localStorage on server
    if (typeof window === "undefined") {
      return this.currentUser ?? null
    }

    if (!this.currentUser) {
      try {
        const stored = localStorage.getItem("currentUser")
        if (stored) {
          const parsed = JSON.parse(stored)
          // Ensure permissions is always an array to avoid runtime errors in UI
          if (!Array.isArray(parsed.permissions)) {
            parsed.permissions = parsed.role === "root" ? ["*"] : []
          }
          this.currentUser = parsed
        }
      } catch {}
    } else {
      // Normalize in-memory user as well
      if (!Array.isArray(this.currentUser.permissions)) {
        this.currentUser.permissions = this.currentUser.role === "root" ? ["*"] : []
      }
    }
    return this.currentUser
  }

  // Load and cache system settings tab access mapping
  async loadSystemSettings(): Promise<void> {
    try {
      const response = await fetch('/api/system/settings', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      const mapping = data?.settings?.tabAccessByRole
      if (mapping && typeof mapping === 'object') {
        this.tabAccessByRole = mapping
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('tabAccessByRole', JSON.stringify(mapping))
          }
        } catch {}
      }
    } catch (e) {
      // Swallow network errors; fallback will be used
    }
  }

  private getTabAccessByRole(): Record<string, string[]> {
    if (this.tabAccessByRole) return this.tabAccessByRole

    // Avoid localStorage on server; provide fallback mapping
    if (typeof window === 'undefined') {
      this.tabAccessByRole = {
        root: ['*'],
        manager: ['dashboard','analytics','reports','planning','alerts','inventory','admin:tasks'],
        supervisor: ['dashboard','analytics','reports','planning','alerts','inventory'],
        operator: ['dashboard','planning','alerts','inventory'],
        monitor: ['dashboard','reports','analytics','alerts'],
      }
      return this.tabAccessByRole
    }

    try {
      const raw = localStorage.getItem('tabAccessByRole')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          const mapping = parsed as Record<string, string[]>
          this.tabAccessByRole = mapping
          return mapping
        }
      }
    } catch {}
    // Default mapping if nothing is loaded yet
    this.tabAccessByRole = {
      root: ['*'],
      manager: ['dashboard','analytics','reports','planning','alerts','inventory','admin:tasks'],
      supervisor: ['dashboard','analytics','reports','planning','alerts','inventory'],
      operator: ['dashboard','planning','alerts','inventory'],
      monitor: ['dashboard','reports','analytics','alerts'],
    }
    return this.tabAccessByRole
  }

  // Tab-based RBAC check
  canAccessTab(tabId: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false
    // Root باید همیشه دسترسی کامل داشته باشد
    if (user.role === 'root') return true
    // برای سایر نقش‌ها وضعیت فعال بودن را بررسی کن
    if (!user.isActive) return false
    const mapping = this.getTabAccessByRole()
    const tabs = mapping[user.role] || []
    if (tabs.includes('*')) return true
    // اگر تب سطح بالا "admin" است و هر زیرتب admin:* مجاز بود، قابل دسترسی است
    if (tabId === 'admin') {
      return tabs.some(t => t.startsWith('admin:'))
    }
    return tabs.includes(tabId)
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
    if (user.role === "root" || user.permissions?.includes("*")) {
      return true
    }

    // Normalize requested permission and user's permissions
    const requested = this.normalizePermission(permission)
    const normalizedUserPerms = new Set(
      user.permissions = (user.permissions ?? []).map((p) => this.normalizePermission(p))
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

  isMonitor(): boolean {
    const user = this.getCurrentUser()
    return user?.role === "monitor"
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
      case "monitor":
        return "نمایشگر"
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

    // نمایشگر: فقط مشاهده‌گر، بدون اکشن عملیاتی
    if (user.role === "monitor") {
      return [
        "view_dashboard",
        "view_reports",
        "view_analytics",
      ]
    }


    return user.permissions
  }
}