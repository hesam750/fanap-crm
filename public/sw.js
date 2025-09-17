// Service Worker for push notifications
self.addEventListener("install", (event) => {
  console.log("[SW] Service worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Service worker activating...")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event)

  if (!event.data) {
    return
  }

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: data.icon || "/icon-192x192.png",
    badge: "/badge-72x72.png",
    dir: "rtl",
    lang: "fa",
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event)

  event.notification.close()

  if (event.action === "view" || !event.action) {
    const url = event.notification.data.url || "/"
    event.waitUntil(self.clients.openWindow(url))
  } else if (event.action === "acknowledge") {
    // Handle acknowledge action
    event.waitUntil(
      fetch("/api/notifications/acknowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: event.notification.data.id,
        }),
      }),
    )
  }
})

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event)
})
