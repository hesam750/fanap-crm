
"use client";

import { useEffect } from "react";

export function Providers({children}: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
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
      // در محیط توسعه هم ثبت می‌کنیم تا قابلیت نصب تست شود
      if (document.readyState === "complete") register()
      else window.addEventListener("load", register)
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return (
    <>{children}</>
  )
}
