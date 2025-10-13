"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bell, LogOut, Settings, Moon, Sun, User } from "lucide-react"
import type { User as UserType } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { useTheme } from "next-themes"
import { ProfileManagement } from "@/components/profile-management"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface DashboardHeaderProps {
  user: UserType
  alertCount: number
  onLogout: () => void
  notificationCount: number
  onRefresh: () => void
}

export function DashboardHeader({ user, alertCount, onLogout }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [currentUser, setCurrentUser] = useState(user)

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager":
        return "مدیر"
      case "operator":
        return "اپراتور"
      case "supervisor":
        return "ناظر"
      case "monitor":
        return "نمایشگر"
      default:
        return role
    }
  }

  const handleLogout = () => {
    const auth = AuthService.getInstance()
    auth.logout()
    onLogout()
  }

  const handleUserUpdate = (updatedUser: UserType) => {
    setCurrentUser(updatedUser)
    try {
      const stored = localStorage.getItem("currentUser")
      const exists = stored ? JSON.parse(stored) : {}
      const merged = { ...exists, ...updatedUser }
      if (!Array.isArray(merged.permissions)) {
        merged.permissions = merged.role === "root" ? ["*"] : []
      }
      localStorage.setItem("currentUser", JSON.stringify(merged))
    } catch (e) {
      // ignore storage errors
    }
  }

  return (
    <header dir="rtl" className="bg-blur border-b border-border px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left section with title and role */}
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-2xl font-bold">سیستم مدیریت مخازن</h1>
          <Badge variant="secondary">{getRoleLabel(currentUser.role)}</Badge>
        </div>

        {/* Right section with user name, notifications, settings, theme switch, and logout */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-sm text-muted-foreground hidden sm:block">خوش آمدید، {currentUser.name}</div>
          <Avatar className="size-8">
            <AvatarImage src={currentUser.avatarUrl || "/placeholder-user.jpg"} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name?.slice(0,1) || "U"}</AvatarFallback>
          </Avatar>

          {/* Notification Icon */}
          {/* <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                {alertCount}
              </Badge>
            )}
          </Button> */}

          {/* Theme Toggle Button */}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Profile Management Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-auto h-[100dvh] sm:h-auto rounded-none sm:rounded-lg p-4 sm:p-6 overflow-y-auto top-0 left-0 translate-x-0 translate-y-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" dir="rtl">
              <DialogHeader>
                <DialogTitle>پروفایل کاربری</DialogTitle>
              </DialogHeader>
              <ProfileManagement user={currentUser} onUserUpdate={handleUserUpdate} />
            </DialogContent>
          </Dialog>

          {/* Settings Icon */}
          {/* <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button> */}

          {/* Logout Icon */}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
