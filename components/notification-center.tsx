"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, BellOff, Check, X, Smartphone } from "lucide-react"
import { NotificationService } from "@/lib/notification-service"
import { useToast } from "@/components/ui/use-toast"
import type { Notification, User } from "@/lib/types"

interface NotificationCenterProps {
  currentUser: User
  notifications: Notification[]
  onMarkAsRead?: (notificationId: string) => void
  onMarkAllAsRead?: () => void
  onDeleteNotification?: (notificationId: string) => void
}

export function NotificationCenter({
  currentUser,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
}: NotificationCenterProps) {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const { toast } = useToast()

  const notificationService = NotificationService.getInstance()

  useEffect(() => {
    // Check current notification permission
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }

    // Initialize notification service
    notificationService.initialize()
  }, [])

  const handleEnablePush = async () => {
    try {
      const permission = await notificationService.requestPermission()
      setPermission(permission)

      if (permission === "granted") {
        const subscription = await notificationService.subscribeToPush(currentUser.id)
        if (subscription) {
          setPushEnabled(true)
          toast({
            title: "اطلاع‌رسانی فعال شد",
            description: "شما اکنون اطلاع‌رسانی‌های موبایل دریافت خواهید کرد",
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "خطا",
          description: "دسترسی به اطلاع‌رسانی رد شد",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Push notification setup failed:", error)
      toast({
        title: "خطا",
        description: "خطا در راه‌اندازی اطلاع‌رسانی",
        variant: "destructive",
      })
    }
  }

  const handleTestNotification = async () => {
    await notificationService.sendLocalNotification("تست اطلاع‌رسانی", {
      body: "این یک پیام تست است",
      icon: "/icon-192x192.png",
     
    })
  }

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task-assigned":
        return "📋"
      case "alert":
        return "⚠️"
      case "reminder":
        return "⏰"
      case "system":
        return "⚙️"
      default:
        return "📢"
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case "task-assigned":
        return "تخصیص وظیفه"
      case "alert":
        return "هشدار"
      case "reminder":
        return "یادآوری"
      case "system":
        return "سیستم"
      default:
        return "اطلاع‌رسانی"
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            مرکز اطلاع‌رسانی
            {unreadNotifications.length > 0 && <Badge variant="destructive">{unreadNotifications.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Push Notification Settings */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <h3 className="font-medium">تنظیمات اطلاع‌رسانی موبایل</h3>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>اطلاع‌رسانی Push</Label>
                <p className="text-sm text-muted-foreground">دریافت اطلاع‌رسانی در موبایل و دسکتاپ</p>
              </div>
              <Switch
                checked={pushEnabled && permission === "granted"}
                onCheckedChange={handleEnablePush}
                disabled={permission === "denied"}
              />
            </div>

            {permission === "denied" && (
              <div className="text-sm text-destructive">
                دسترسی به اطلاع‌رسانی رد شده است. لطفاً از تنظیمات مرورگر آن را فعال کنید.
              </div>
            )}

            {permission === "granted" && (
              <Button variant="outline" size="sm" onClick={handleTestNotification}>
                تست اطلاع‌رسانی
              </Button>
            )}
          </div>

          {/* Notification Actions */}
          <div className="flex gap-2">
            {unreadNotifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                <Check className="h-4 w-4 ml-2" />
                علامت‌گذاری همه به عنوان خوانده شده
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unread Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>اطلاع‌رسانی‌های جدید</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 border border-blue-200 rounded-lg bg-blue-50/50"
              >
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getTypeText(notification.type)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {notification.createdAt.toLocaleString("fa-IR")}
                    </span>
                  </div>

                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => onMarkAsRead?.(notification.id)}>
                      <Check className="h-3 w-3 ml-1" />
                      خوانده شد
                    </Button>

                    {notification.actionUrl && (
                      <Button size="sm" variant="default">
                        مشاهده
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" onClick={() => onDeleteNotification?.(notification.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Read Notifications */}
      {readNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>اطلاع‌رسانی‌های خوانده شده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readNotifications.slice(0, 10).map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg opacity-60">
                <div className="text-lg opacity-50">{getNotificationIcon(notification.type)}</div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getTypeText(notification.type)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {notification.createdAt.toLocaleString("fa-IR")}
                    </span>
                  </div>

                  <h4 className="font-medium text-muted-foreground">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>

                <Button size="sm" variant="ghost" onClick={() => onDeleteNotification?.(notification.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {notifications.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">هیچ اطلاع‌رسانی‌ای وجود ندارد</h3>
            <p className="text-sm text-muted-foreground">
              زمانی که وظایف جدید تخصیص یابد یا هشدارهای مهم ایجاد شود، اینجا نمایش داده خواهند شد.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
