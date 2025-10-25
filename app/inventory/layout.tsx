"use client"

import { Sidebar } from "@/components/inventory/sidebar"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { Header } from "@/components/inventory/header"
import { useEffect, useState } from "react"
import { AuthService } from "@/lib/auth"
import type { User } from "@/lib/types"
import { Drawer, DrawerContent } from "@/components/ui/drawer"

export default function InventoryManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    const auth = AuthService.getInstance()
    const current = auth.getCurrentUser()
    if (current) {
      setUser(current)
      auth.loadSystemSettings()
    }
  }, [])

  const handleLogout = () => {
    const auth = AuthService.getInstance()
    auth.logout()
    try { window.location.href = "/" } catch {}
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar variant="desktop" />
      </div>

      {/* Main column with header and content; Drawer provides mobile sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Drawer direction="right">
          {user ? (
            <DashboardHeader user={user} alertCount={0} onLogout={handleLogout} notificationCount={0} onRefresh={() => {}} alerts={[]} tasks={[]} selectedAlertIds={[]} showMobileMenuTrigger />
          ) : (
            <Header />
          )}
          <DrawerContent
            className="p-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-full"
            data-vaul-drawer-direction="right"
            showOverlay={false}
          >
            <Sidebar variant="mobile" />
          </DrawerContent>
        </Drawer>
        <main className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}