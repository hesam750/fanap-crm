// تعریف interface برای NotificationOptionsWithActions
interface NotificationOptionsWithActions extends NotificationOptions {
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// Mobile and web push notification service
export class NotificationService {
  private static instance: NotificationService
  private registration: ServiceWorkerRegistration | null = null

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Initialize push notifications
  async initialize(): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn(" Push notifications not supported")
      return false
    }

    try {
      // در حالت توسعه از ثبت سرویس0ورکر صرف0نظر می0کنیم تا کش0های قدیمی ایجاد نشوند
      if (process.env.NODE_ENV !== "production") {
        console.warn(" Skip service worker registration in development")
        this.registration = null
        return true
      }
      // Register service worker
      this.registration = await navigator.serviceWorker.register("/sw.js")
      console.log(" Service worker registered:", this.registration)
      return true
    } catch (error) {
      console.error(" Service worker registration failed:", error)
      return false
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      console.warn(" Notifications not supported")
      return "denied"
    }

    const permission = await Notification.requestPermission()
    console.log(" Notification permission:", permission)
    return permission
  }

  // Subscribe to push notifications
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error(" Service worker not registered")
      return null
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription, userId)
      console.log(" Push subscription created:", subscription)
      return subscription
    } catch (error) {
      console.error(" Push subscription failed:", error)
      return null
    }
  }

  // Send local notification with actions
  async sendLocalNotification(title: string, options: NotificationOptionsWithActions = {}) {
    if (Notification.permission !== "granted") {
      console.warn(" Notification permission not granted")
      return
    }

    const notification = new Notification(title, {
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      dir: "rtl",
      lang: "fa",
      ...options,
    })

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    return notification
  }

  // Send task assignment notification
  async notifyTaskAssigned(taskTitle: string, assignedTo: string, dueDate?: Date) {
    const options: NotificationOptionsWithActions = {
      body: `وظیفه جدید: ${taskTitle}${dueDate ? `\nسررسید: ${dueDate.toLocaleDateString("fa-IR")}` : ""}`,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "task-assigned",
      requireInteraction: true,
      actions: [
        {
          action: "view",
          title: "مشاهده وظیفه",
        },
        {
          action: "dismiss",
          title: "بستن",
        },
      ],
      data: {
        type: "task-assigned",
        assignedTo,
        url: "/tasks",
      },
    }

    return this.sendLocalNotification("وظیفه جدید تخصیص یافت", options)
  }

  // Send alert notification
  async notifyAlert(alertMessage: string, severity: "low" | "medium" | "high" | "critical") {
    const severityText = {
      low: "پایین",
      medium: "متوسط",
      high: "بالا",
      critical: "بحرانی",
    }

    const options: NotificationOptionsWithActions = {
      body: alertMessage,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: `alert-${severity}`,
      requireInteraction: severity === "critical",
      actions: [
        {
          action: "acknowledge",
          title: "تأیید",
        },
        {
          action: "view",
          title: "مشاهده جزئیات",
        },
      ],
      data: {
        type: "alert",
        severity,
        url: "/alerts",
      },
    }

    return this.sendLocalNotification(`هشدار ${severityText[severity]}`, options)
  }

  // Send reminder notification
  async notifyReminder(title: string, message: string) {
    const options: NotificationOptionsWithActions = {
      body: message,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "reminder",
      actions: [
        {
          action: "snooze",
          title: "یادآوری مجدد",
        },
        {
          action: "dismiss",
          title: "بستن",
        },
      ],
      data: {
        type: "reminder",
      },
    }

    return this.sendLocalNotification(title, options)
  }

  // Utility functions
  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

    const rawData = window.atob(base64)
    const buffer = new ArrayBuffer(rawData.length)
    const view = new Uint8Array(buffer)

    for (let i = 0; i < rawData.length; ++i) {
      view[i] = rawData.charCodeAt(i)
    }
    return buffer
  }

  private async sendSubscriptionToServer(subscription: PushSubscription, userId: string) {
    try {
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send subscription to server")
      }
    } catch (error) {
      console.error("[v0] Failed to send subscription to server:", error)
    }
  }
}
