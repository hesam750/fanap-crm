// Service Worker for push notifications

// Offline caching config
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener("install", (event) => {
  console.log("[SW] Service worker installing...")
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll([
        OFFLINE_URL,
        '/manifest.webmanifest',
        '/placeholder-logo.png',
        '/favicon.ico',
      ])
    })()
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Service worker activating...")
  event.waitUntil(
    (async () => {
      // Enable navigation preload for faster navigations
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable() } catch {}
      }
      // Clean old caches
      const keys = await caches.keys()
      await Promise.all(
        keys.map((key) => (key.startsWith('static-') && key !== STATIC_CACHE) ? caches.delete(key) : Promise.resolve())
      )
      await self.clients.claim()
    })()
  )
})

// Runtime caching
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // Navigation requests: network-first, fallback to cache or offline page
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse
        if (preload) return preload
        const networkResponse = await fetch(request)
        const cache = await caches.open(STATIC_CACHE)
        cache.put(request, networkResponse.clone())
        return networkResponse
      } catch (err) {
        const cached = await caches.match(request)
        if (cached) return cached
        const offline = await caches.match(OFFLINE_URL)
        return offline || new Response('<h1>آفلاین هستید</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    })())
    return
  }

  // Static assets: cache-first
  if (sameOrigin && ['style','script','image','font'].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const networkResponse = await fetch(request)
        const cache = await caches.open(STATIC_CACHE)
        cache.put(request, networkResponse.clone())
        return networkResponse
      } catch (err) {
        return cached || Response.error()
      }
    })())
    return
  }

  // API GET requests: network-first, fallback to cache
  if (sameOrigin && url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request)
        const cache = await caches.open(STATIC_CACHE)
        if (networkResponse.ok) cache.put(request, networkResponse.clone())
        return networkResponse
      } catch (err) {
        const cached = await caches.match(request)
        if (cached) return cached
        return new Response(JSON.stringify({ offline: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
    })())
    return
  }
})

self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event)

  if (!event.data) {
    return
  }

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: data.icon || "/placeholder-logo.png",
    badge: "/placeholder-logo.png",
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
