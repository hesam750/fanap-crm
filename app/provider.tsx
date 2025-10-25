
"use client";

import { useEffect } from "react";

export function Providers({children}: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const isProd = process.env.NODE_ENV === "production"

    const cleanupDevCaches = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
        console.log("[SW] Dev cleanup done: unregistered and caches cleared")
      } catch (err) {
        console.warn("[SW] Dev cleanup failed:", err)
      }
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[SW] Registered:", registration.scope)
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err)
        })
    }

    if (isProd) {
      if (document.readyState === "complete") register()
      else window.addEventListener("load", register)
      return () => window.removeEventListener("load", register)
    } else {
      // در حالت توسعه، سرویس‌ورکر را ثبت نمی‌کنیم و کش‌ها را پاک می‌کنیم تا از رفتارهای قدیمی جلوگیری شود
      cleanupDevCaches()
    }
  }, [])

  return (
    <>{children}</>
  )
}
