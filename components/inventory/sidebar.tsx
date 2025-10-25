"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes,
  MapPin,
  Users,
  FileText,
  GitBranch,
  X as CloseIcon,
} from "lucide-react"
import { DrawerClose } from "@/components/ui/drawer"

const navigation = [
  { name: "داشبورد", href: "/inventory", icon: LayoutDashboard },
  { name: "اقلام", href: "/inventory/items", icon: Package },
  { name: "انبارها", href: "/inventory/warehouses", icon: Warehouse },
  { name: "موجودی", href: "/inventory/stock", icon: Boxes },
  { name: "تراکنش‌ها", href: "/inventory/transactions", icon: ArrowLeftRight },
  { name: "گردش کار", href: "/inventory/workflows", icon: GitBranch },
  { name: "مکان‌ها", href: "/inventory/locations", icon: MapPin },
  { name: "گزارشات", href: "/inventory/reports", icon: BarChart3 },
  { name: "تأمین‌کنندگان", href: "/inventory/suppliers", icon: Users },
  { name: "اسناد", href: "/inventory/documents", icon: FileText },
  { name: "تنظیمات", href: "/inventory/settings", icon: Settings },
]

export function Sidebar({ variant = "desktop" }: { variant?: "mobile" | "desktop" }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isMobileVariant = variant === "mobile"

  return (
    <div
      className={cn(
        "relative flex flex-col border-l border-sidebar-border text-sidebar-foreground transition-all duration-300 h-screen overflow-y-auto md:h-auto",
        isMobileVariant ? "w-full" : collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Warehouse className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">قسمت انبارداری</span>
          </div>
        )}
        {/* Desktop: collapse toggle; Mobile: drawer close */}
        {isMobileVariant ? (
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="بستن منو">
              <CloseIcon className="h-4 w-4" />
            </Button>
          </DrawerClose>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8">
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                !isMobileVariant && collapsed && "justify-center",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {!collapsed && <div className="text-xs text-sidebar-foreground/50">FANAP</div>}
      </div>
    </div>
  )
}