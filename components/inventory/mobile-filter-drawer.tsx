"use client"

import * as React from "react"
import { SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

type MobileFilterDrawerProps = {
  title?: string
  children: React.ReactNode
  badgeCount?: number
  buttonLabel?: string
  triggerClassName?: string
}

export function MobileFilterDrawer({
  title = "فیلترها",
  children,
  badgeCount = 0,
  buttonLabel = "فیلترها",
  triggerClassName,
}: MobileFilterDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("sm:hidden", triggerClassName)}>
          <SlidersHorizontal className="h-4 w-4 ml-1" />
          {buttonLabel}
          {badgeCount > 0 && (
            <Badge variant="secondary" className="mr-2">
              {badgeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="sm:max-w-full">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-3">{children}</div>
        <SheetFooter className="p-4">
          <SheetClose asChild>
            <Button className="w-full">بستن</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}