
"use client"

import { useState, useEffect } from "react"
import { AuthService } from "@/lib/auth"
import type { User } from "@/lib/types"

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const authService = AuthService.getInstance()
    const user = authService.getCurrentUser()
    setCurrentUser(user)
    setLoading(false)
  }, [])

  const authService = AuthService.getInstance()

  return {
    currentUser,
    loading,
    hasPermission: authService.hasPermission.bind(authService),
    canManageUsers: authService.canManageUsers.bind(authService),
    isRoot: authService.isRoot.bind(authService),
    getRoleDisplayName: authService.getRoleDisplayName.bind(authService),
  }
}